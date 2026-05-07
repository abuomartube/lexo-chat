import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  enrollmentsTable,
  accessCodesTable,
  TIER_VALUES,
  type Tier,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { notifyStudentSelfEnrolled } from "../lib/email-triggers";
import { subscriptionExpiryFromNow } from "../lib/subscription-policy";

const router: IRouter = Router();

// Marker thrown from inside the redeem transaction so the outer .catch()
// handler can roll back the access-code use-claim and surface the correct
// 409 to the client. Using a custom Error subclass (rather than returning a
// status object from the txn callback) is what guarantees the rollback.
class AlreadyEnrolledError extends Error {
  constructor(public tier: Tier) {
    super("already_enrolled");
    this.name = "AlreadyEnrolledError";
  }
}

// PG SQLSTATE 23505 = unique_violation. drizzle-orm@0.45 wraps query failures
// in DrizzleQueryError where the original pg error sits on `.cause`.
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const direct = (err as { code?: unknown }).code;
  if (direct === "23505") return true;
  const cause = (err as { cause?: unknown }).cause;
  if (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === "23505"
  ) {
    return true;
  }
  return false;
}

router.get("/enrollments/me", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.userId, req.session.userId!));

    const now = new Date();
    const enriched = rows.map((r) => ({
      ...r,
      isActive: r.status === "active" && (!r.expiresAt || r.expiresAt > now),
    }));
    res.set("Cache-Control", "no-store");
    res.json({ enrollments: enriched });
  } catch (err) {
    next(err);
  }
});

const RedeemBody = z.object({
  code: z.string().trim().min(3).max(64),
});

router.post("/enrollments/redeem", requireAuth, async (req, res, next) => {
  try {
    const parsed = RedeemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    const codeValue = parsed.data.code.toUpperCase();
    const userId = req.session.userId!;

    const result = await db
      .transaction(async (tx) => {
        // 1) Read code first to surface specific error reasons.
        const [code] = await tx
          .select()
          .from(accessCodesTable)
          .where(eq(accessCodesTable.code, codeValue))
          .limit(1);

        if (!code) return { error: "code_not_found" as const };
        if (code.status !== "active")
          return { error: "code_not_active" as const };
        if (code.expiresAt && code.expiresAt < new Date())
          return { error: "code_expired" as const };
        if (code.usedCount >= code.maxUses)
          return { error: "code_exhausted" as const };

        const tier = code.tier as Tier;
        if (!TIER_VALUES.includes(tier))
          return { error: "code_invalid_tier" as const };

        // 2) Atomically claim a use on the code. The WHERE clause guarantees
        //    only one concurrent transaction can consume the last available use
        //    (others will UPDATE 0 rows and bail out as `code_exhausted`).
        const claimed = await tx
          .update(accessCodesTable)
          .set({
            usedCount: sql`${accessCodesTable.usedCount} + 1`,
            status: sql`CASE WHEN ${accessCodesTable.usedCount} + 1 >= ${accessCodesTable.maxUses} THEN 'used' ELSE 'active' END`,
            redeemedByUserId: userId,
            redeemedAt: new Date(),
          })
          .where(
            and(
              eq(accessCodesTable.id, code.id),
              eq(accessCodesTable.status, "active"),
              sql`${accessCodesTable.usedCount} < ${accessCodesTable.maxUses}`,
            ),
          )
          .returning({ id: accessCodesTable.id });

        if (claimed.length === 0) {
          return { error: "code_exhausted" as const };
        }

        // 3) Insert enrollment. A partial unique index on (user_id, tier) WHERE
        //    status='active' enforces no duplicate active enrollments. Catch the
        //    unique violation (PG SQLSTATE 23505) and surface a clean 409.
        //    drizzle-orm wraps DB errors in DrizzleQueryError, so the underlying
        //    pg error code lives on err.cause.code (with err.code as a fallback
        //    in case of unwrapped/native errors).
        // Access-code redeem grants the same subscription window as a paid
        // activation; expiry is enforced by /me's isActive computation and
        // the SSO launch guard.
        try {
          const [enrollment] = await tx
            .insert(enrollmentsTable)
            .values({
              userId,
              tier,
              status: "active",
              source: "code",
              note: `Redeemed code ${code.code}`,
              expiresAt: subscriptionExpiryFromNow(),
            })
            .returning();
          return { enrollment };
        } catch (err) {
          // Unique-violation means the user already has an active enrollment
          // for this tier. We MUST throw to roll back the transaction;
          // returning here would commit the access-code use-claim above and
          // burn a code without granting access. The outer .catch() converts
          // the marker error back into the structured response.
          if (isUniqueViolation(err)) {
            throw new AlreadyEnrolledError(tier);
          }
          throw err;
        }
      })
      .catch((err) => {
        if (err instanceof AlreadyEnrolledError) {
          return { error: "already_enrolled" as const, tier: err.tier };
        }
        throw err;
      });

    if ("error" in result && result.error) {
      const map: Record<string, { status: number; message: string }> = {
        code_not_found: { status: 404, message: "Code not found" },
        code_not_active: { status: 400, message: "Code is not active" },
        code_expired: { status: 400, message: "Code has expired" },
        code_exhausted: { status: 400, message: "Code has been fully used" },
        code_invalid_tier: { status: 400, message: "Code has invalid tier" },
        already_enrolled: {
          status: 409,
          message: "You already have access to this tier",
        },
      };
      const e = map[result.error] ?? {
        status: 400,
        message: "Code redemption failed",
      };
      res.status(e.status).json({ error: e.message });
      return;
    }

    const enrollment = result.enrollment!;
    // Fire-and-forget notification — never block the redeem response.
    notifyStudentSelfEnrolled({
      log: req.log,
      userId: enrollment.userId,
      course: "intro",
      tier: enrollment.tier,
      enrollmentId: enrollment.id,
    }).catch(() => undefined);

    res.status(201).json({ enrollment });
  } catch (err) {
    next(err);
  }
});

export default router;
