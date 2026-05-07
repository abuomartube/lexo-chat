import { Router } from "express";
import { requireAuth, requireAdmin, getUserById } from "../lib/auth";
import {
  db,
  discountCodesTable,
  discountCodeUsagesTable,
  paymentsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateDiscountCode } from "../lib/discount-validation";

const router = Router();

router.post("/discount/validate", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const { code, items } = req.body as {
      code: string;
      items?: { course: string; tier: string }[];
    };

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "missing_code" });
      return;
    }

    const course = items?.[0]?.course ?? "";
    const tier = items?.[0]?.tier ?? "";

    const result = await validateDiscountCode(code, userId, course, tier, items);
    if (result.kind === "error") {
      res.status(400).json({ error: result.reason });
      return;
    }

    res.json({
      valid: true,
      code: result.discount.code,
      discountType: result.discount.discountType,
      discountValue: result.discount.discountValue,
      scope: result.discount.scope,
      specificCourse: result.discount.specificCourse,
      specificTier: result.discount.specificTier,
    });
  } catch (err) {
    next(err);
  }
});


router.get("/admin/discount-codes", requireAdmin, async (_req, res, next) => {
  try {
    const codes = await db
      .select({
        id: discountCodesTable.id,
        code: discountCodesTable.code,
        discountType: discountCodesTable.discountType,
        discountValue: discountCodesTable.discountValue,
        startDate: discountCodesTable.startDate,
        endDate: discountCodesTable.endDate,
        neverExpires: discountCodesTable.neverExpires,
        scope: discountCodesTable.scope,
        specificCourse: discountCodesTable.specificCourse,
        specificTier: discountCodesTable.specificTier,
        totalUsageLimit: discountCodesTable.totalUsageLimit,
        perUserLimit: discountCodesTable.perUserLimit,
        oneTimePerUser: discountCodesTable.oneTimePerUser,
        firstPurchaseOnly: discountCodesTable.firstPurchaseOnly,
        newUsersOnly: discountCodesTable.newUsersOnly,
        status: discountCodesTable.status,
        createdAt: discountCodesTable.createdAt,
        updatedAt: discountCodesTable.updatedAt,
        totalUsed: sql<number>`(SELECT count(*) FROM discount_code_usages WHERE discount_code_id = ${discountCodesTable.id})::int`,
      })
      .from(discountCodesTable)
      .orderBy(sql`${discountCodesTable.createdAt} DESC`);

    res.json(codes);
  } catch (err) {
    next(err);
  }
});

router.post("/admin/discount-codes", requireAdmin, async (req, res, next) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      startDate,
      endDate,
      neverExpires,
      scope,
      specificCourse,
      specificTier,
      totalUsageLimit,
      perUserLimit,
      oneTimePerUser,
      firstPurchaseOnly,
      newUsersOnly,
      status,
    } = req.body;

    if (!code || !discountType || discountValue == null || !startDate) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const upperCode = code.trim().toUpperCase();

    const existing = await db
      .select({ id: discountCodesTable.id })
      .from(discountCodesTable)
      .where(eq(discountCodesTable.code, upperCode))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "code_exists" });
      return;
    }

    const [created] = await db
      .insert(discountCodesTable)
      .values({
        code: upperCode,
        discountType,
        discountValue: Number(discountValue),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        neverExpires: !!neverExpires,
        scope: scope || "general",
        specificCourse: scope === "specific" ? specificCourse : null,
        specificTier: scope === "specific" ? specificTier : null,
        totalUsageLimit:
          totalUsageLimit != null ? Number(totalUsageLimit) : null,
        perUserLimit: perUserLimit != null ? Number(perUserLimit) : 1,
        oneTimePerUser: oneTimePerUser ?? true,
        firstPurchaseOnly: !!firstPurchaseOnly,
        newUsersOnly: !!newUsersOnly,
        status: status || "active",
      })
      .returning();

    res.json(created);
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/admin/discount-codes/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const updates: Record<string, unknown> = {};
      const body = req.body;

      if (body.code != null) updates.code = body.code.trim().toUpperCase();
      if (body.discountType != null) updates.discountType = body.discountType;
      if (body.discountValue != null)
        updates.discountValue = Number(body.discountValue);
      if (body.startDate != null) updates.startDate = new Date(body.startDate);
      if (body.endDate !== undefined)
        updates.endDate = body.endDate ? new Date(body.endDate) : null;
      if (body.neverExpires != null) updates.neverExpires = !!body.neverExpires;
      if (body.scope != null) updates.scope = body.scope;
      if (body.specificCourse !== undefined)
        updates.specificCourse = body.specificCourse;
      if (body.specificTier !== undefined)
        updates.specificTier = body.specificTier;
      if (body.totalUsageLimit !== undefined)
        updates.totalUsageLimit =
          body.totalUsageLimit != null ? Number(body.totalUsageLimit) : null;
      if (body.perUserLimit != null)
        updates.perUserLimit = Number(body.perUserLimit);
      if (body.oneTimePerUser != null)
        updates.oneTimePerUser = !!body.oneTimePerUser;
      if (body.firstPurchaseOnly != null)
        updates.firstPurchaseOnly = !!body.firstPurchaseOnly;
      if (body.newUsersOnly != null)
        updates.newUsersOnly = !!body.newUsersOnly;
      if (body.status != null) updates.status = body.status;

      const [updated] = await db
        .update(discountCodesTable)
        .set(updates)
        .where(eq(discountCodesTable.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/admin/discount-codes/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const [deleted] = await db
        .delete(discountCodesTable)
        .where(eq(discountCodesTable.id, id))
        .returning({ id: discountCodesTable.id });

      if (!deleted) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
