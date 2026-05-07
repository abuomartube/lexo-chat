import { Router, type IRouter } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  enrollmentsTable,
  englishEnrollmentsTable,
  accessCodesTable,
  TIER_VALUES,
  ENGLISH_TIER_VALUES,
  ENROLLMENT_STATUS_VALUES,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { notifyEnrollmentApproved } from "../lib/email-triggers";

const router: IRouter = Router();

const TierSchema = z.enum(TIER_VALUES);
const EnglishTierSchema = z.enum(ENGLISH_TIER_VALUES);
const EnrollmentStatusSchema = z.enum(ENROLLMENT_STATUS_VALUES);
const RoleSchema = z.enum(["student", "admin"]);
const CourseSchema = z.enum(["intro", "english"]);

function generateCode(): string {
  // 12-char human-friendly code: ABCD-EFGH-JKLM (no I/O/0/1 confusion)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[buf[i]! % alphabet.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

router.get("/admin/students", requireAdmin, async (_req, res, next) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    const enrollments = await db.select().from(enrollmentsTable);
    const byUser = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const arr = byUser.get(e.userId) ?? [];
      arr.push(e);
      byUser.set(e.userId, arr);
    }

    const englishEnrollments = await db
      .select()
      .from(englishEnrollmentsTable);
    const englishByUser = new Map<string, typeof englishEnrollments>();
    for (const e of englishEnrollments) {
      const arr = englishByUser.get(e.userId) ?? [];
      arr.push(e);
      englishByUser.set(e.userId, arr);
    }

    const students = users.map((u) => ({
      ...u,
      enrollments: byUser.get(u.id) ?? [],
      englishEnrollments: englishByUser.get(u.id) ?? [],
    }));
    res.set("Cache-Control", "no-store");
    res.json({ students });
  } catch (err) {
    next(err);
  }
});

const GrantBody = z.object({
  tier: TierSchema,
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

router.post(
  "/admin/students/:id/grant",
  requireAdmin,
  async (req, res, next) => {
    try {
      const userId = String(req.params.id);
      const parsed = GrantBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid grant payload" });
        return;
      }
      const { tier, expiresAt, note } = parsed.data;

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!user) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      // Reactivate existing enrollment if present, else create new
      const [existing] = await db
        .select()
        .from(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.userId, userId),
            eq(enrollmentsTable.tier, tier),
          ),
        )
        .limit(1);

      let enrollment;
      const wasAlreadyActive = existing?.status === "active";
      if (existing) {
        const [updated] = await db
          .update(enrollmentsTable)
          .set({
            status: "active",
            source: "admin",
            grantedBy: req.session.userId!,
            grantedAt: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            note: note ?? existing.note,
          })
          .where(eq(enrollmentsTable.id, existing.id))
          .returning();
        enrollment = updated;
      } else {
        const [created] = await db
          .insert(enrollmentsTable)
          .values({
            userId,
            tier,
            status: "active",
            source: "admin",
            grantedBy: req.session.userId!,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            note,
          })
          .returning();
        enrollment = created;
      }

      if (enrollment && !wasAlreadyActive) {
        notifyEnrollmentApproved({
          log: req.log,
          userId: enrollment.userId,
          course: "intro",
          tier: enrollment.tier,
          enrollmentId: enrollment.id,
        }).catch(() => undefined);
      }

      res.status(201).json({ enrollment });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /admin/students/:id — edit name and/or role.
// Email is intentionally NOT editable (it's the auth identity).
// Password changes flow through the password-reset endpoint.
const PatchStudentBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: RoleSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.role !== undefined, {
    message: "Provide at least one of: name, role",
  });

router.patch("/admin/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const userId = String(req.params.id);
    const parsed = PatchStudentBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
      return;
    }
    // Self-demotion guard: an admin cannot demote themselves to student.
    // (Demotion-by-other-admins is allowed; this only prevents lockout.)
    if (parsed.data.role === "student" && req.session.userId === userId) {
      res
        .status(400)
        .json({ error: "You cannot demote yourself from admin to student." });
      return;
    }
    const [updated] = await db
      .update(usersTable)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        emailVerified: usersTable.emailVerified,
        createdAt: usersTable.createdAt,
      });
    if (!updated) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ student: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/students/:id — hard delete. FK cascade removes enrollments,
// password-reset tokens, and email-verification tokens. Self-delete is
// blocked to prevent admin lockout.
router.delete("/admin/students/:id", requireAdmin, async (req, res, next) => {
  try {
    const userId = String(req.params.id);
    if (req.session.userId === userId) {
      res.status(400).json({ error: "You cannot delete your own account." });
      return;
    }
    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ message: "Student deleted." });
  } catch (err) {
    next(err);
  }
});

// GET /admin/enrollments — list all enrollments across intro AND english.
// Optional ?status=, ?course=intro|english, ?tier= filters.
// Each row includes a `course` field so the UI can disambiguate.
router.get("/admin/enrollments", requireAdmin, async (req, res, next) => {
  try {
    const statusFilter = EnrollmentStatusSchema.safeParse(req.query.status);
    const courseFilter = CourseSchema.safeParse(req.query.course);
    const tierFilterRaw =
      typeof req.query.tier === "string" ? req.query.tier : undefined;

    const introRows =
      courseFilter.success && courseFilter.data !== "intro"
        ? []
        : await (async () => {
            const conds = [];
            if (statusFilter.success)
              conds.push(eq(enrollmentsTable.status, statusFilter.data));
            if (tierFilterRaw && TierSchema.safeParse(tierFilterRaw).success) {
              conds.push(eq(enrollmentsTable.tier, tierFilterRaw));
            }
            const q = db
              .select({
                id: enrollmentsTable.id,
                userId: enrollmentsTable.userId,
                studentName: usersTable.name,
                studentEmail: usersTable.email,
                tier: enrollmentsTable.tier,
                status: enrollmentsTable.status,
                source: enrollmentsTable.source,
                grantedAt: enrollmentsTable.grantedAt,
                expiresAt: enrollmentsTable.expiresAt,
                note: enrollmentsTable.note,
              })
              .from(enrollmentsTable)
              .leftJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id));
            const rows = conds.length ? await q.where(and(...conds)) : await q;
            return rows.map((r) => ({ ...r, course: "intro" as const }));
          })();

    const englishRows =
      courseFilter.success && courseFilter.data !== "english"
        ? []
        : await (async () => {
            const conds = [];
            if (statusFilter.success)
              conds.push(eq(englishEnrollmentsTable.status, statusFilter.data));
            if (
              tierFilterRaw &&
              EnglishTierSchema.safeParse(tierFilterRaw).success
            ) {
              conds.push(eq(englishEnrollmentsTable.tier, tierFilterRaw));
            }
            const q = db
              .select({
                id: englishEnrollmentsTable.id,
                userId: englishEnrollmentsTable.userId,
                studentName: usersTable.name,
                studentEmail: usersTable.email,
                tier: englishEnrollmentsTable.tier,
                status: englishEnrollmentsTable.status,
                source: englishEnrollmentsTable.source,
                grantedAt: englishEnrollmentsTable.grantedAt,
                expiresAt: englishEnrollmentsTable.expiresAt,
                note: englishEnrollmentsTable.note,
              })
              .from(englishEnrollmentsTable)
              .leftJoin(
                usersTable,
                eq(englishEnrollmentsTable.userId, usersTable.id),
              );
            const rows = conds.length ? await q.where(and(...conds)) : await q;
            return rows.map((r) => ({ ...r, course: "english" as const }));
          })();

    const all = [...introRows, ...englishRows].sort(
      (a, b) =>
        new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
    );
    res.json({ enrollments: all });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/enrollments/:id — change status, expiry, note.
// When promoting an enrollment back to 'active', verify no other active
// enrollment exists for the same (userId, tier) — otherwise the partial
// unique index would reject the update with 23505.
const PatchEnrollmentBody = z
  .object({
    status: EnrollmentStatusSchema.optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.expiresAt !== undefined ||
      d.note !== undefined,
    { message: "Provide at least one of: status, expiresAt, note" },
  );

router.patch("/admin/enrollments/:id", requireAdmin, async (req, res, next) => {
  try {
    const enrollmentId = String(req.params.id);
    const courseQ = CourseSchema.safeParse(req.query.course);
    if (!courseQ.success) {
      res.status(400).json({
        error: "Query param 'course' must be 'intro' or 'english'.",
      });
      return;
    }
    const course = courseQ.data;
    const table =
      course === "english" ? englishEnrollmentsTable : enrollmentsTable;
    const parsed = PatchEnrollmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      });
      return;
    }

    const [existing] = await db
      .select()
      .from(table)
      .where(eq(table.id, enrollmentId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Enrollment not found" });
      return;
    }

    // Pre-flight uniqueness check when activating.
    if (parsed.data.status === "active" && existing.status !== "active") {
      const [conflict] = await db
        .select({ id: table.id })
        .from(table)
        .where(
          and(
            eq(table.userId, existing.userId),
            eq(table.tier, existing.tier),
            eq(table.status, "active"),
            ne(table.id, enrollmentId),
          ),
        )
        .limit(1);
      if (conflict) {
        res.status(409).json({
          error:
            "Another active enrollment already exists for this user and tier. Revoke or expire it first.",
        });
        return;
      }
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.expiresAt !== undefined)
      updates.expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null;
    if (parsed.data.note !== undefined) updates.note = parsed.data.note;

    const [updated] = await db
      .update(table)
      .set(updates)
      .where(eq(table.id, enrollmentId))
      .returning();

    // Trigger confirmation email when an enrollment newly becomes active.
    if (
      updated &&
      parsed.data.status === "active" &&
      existing.status !== "active"
    ) {
      notifyEnrollmentApproved({
        log: req.log,
        userId: updated.userId,
        course,
        tier: updated.tier,
        enrollmentId: updated.id,
      }).catch(() => undefined);
    }

    res.json({ enrollment: { ...updated, course } });
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/admin/enrollments/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const enrollmentId = String(req.params.id);
      const courseQ = CourseSchema.safeParse(req.query.course);
      if (!courseQ.success) {
        res.status(400).json({
          error: "Query param 'course' must be 'intro' or 'english'.",
        });
        return;
      }
      const course = courseQ.data;
      const table =
        course === "english" ? englishEnrollmentsTable : enrollmentsTable;
      const result = await db
        .delete(table)
        .where(eq(table.id, enrollmentId))
        .returning({ id: table.id });
      if (result.length === 0) {
        res.status(404).json({ error: "Enrollment not found" });
        return;
      }
      res.json({ message: "Enrollment deleted." });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/admin/codes", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        code: accessCodesTable,
        redeemerName: usersTable.name,
        redeemerEmail: usersTable.email,
      })
      .from(accessCodesTable)
      .leftJoin(
        usersTable,
        eq(accessCodesTable.redeemedByUserId, usersTable.id),
      )
      .orderBy(desc(accessCodesTable.createdAt));

    const codes = rows.map((r) => ({
      ...r.code,
      redeemerName: r.redeemerName,
      redeemerEmail: r.redeemerEmail,
    }));
    res.json({ codes });
  } catch (err) {
    next(err);
  }
});

const CreateCodesBody = z.object({
  tier: TierSchema,
  count: z.number().int().min(1).max(100).default(1),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

router.post("/admin/codes", requireAdmin, async (req, res, next) => {
  try {
    const parsed = CreateCodesBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid payload", details: parsed.error.issues });
      return;
    }
    const { tier, count, maxUses, expiresAt, note } = parsed.data;
    const created = [];
    for (let i = 0; i < count; i++) {
      // Retry up to 3 times on collision
      let inserted;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const [row] = await db
            .insert(accessCodesTable)
            .values({
              code: generateCode(),
              tier,
              maxUses,
              createdBy: req.session.userId!,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              note,
            })
            .returning();
          inserted = row;
          break;
        } catch (err: unknown) {
          if (attempt === 2) throw err;
        }
      }
      if (inserted) created.push(inserted);
    }
    res.status(201).json({ codes: created });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/codes/:id", requireAdmin, async (req, res, next) => {
  try {
    const [updated] = await db
      .update(accessCodesTable)
      .set({ status: "revoked" })
      .where(eq(accessCodesTable.id, String(req.params.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Code not found" });
      return;
    }
    res.json({ code: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
