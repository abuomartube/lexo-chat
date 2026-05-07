import { Router, type IRouter } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  platformCoursesTable,
  enrollmentsTable,
  englishEnrollmentsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// GET /courses — public; only published courses.
router.get("/courses", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(platformCoursesTable)
      .where(eq(platformCoursesTable.isPublished, true))
      .orderBy(asc(platformCoursesTable.displayOrder));
    res.json({ courses: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/courses — all courses including unpublished, with active
// enrollment counts grouped by tier.
router.get("/admin/courses", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(platformCoursesTable)
      .orderBy(asc(platformCoursesTable.displayOrder));

    const introByTier = await db
      .select({
        tier: enrollmentsTable.tier,
        count: sql<string>`count(*)::text`,
      })
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.status, "active"))
      .groupBy(enrollmentsTable.tier);
    const englishByTier = await db
      .select({
        tier: englishEnrollmentsTable.tier,
        count: sql<string>`count(*)::text`,
      })
      .from(englishEnrollmentsTable)
      .where(eq(englishEnrollmentsTable.status, "active"))
      .groupBy(englishEnrollmentsTable.tier);

    const counts: Record<string, { tier: string; count: number }[]> = {
      intro: introByTier.map((r) => ({
        tier: r.tier,
        count: Number(r.count),
      })),
      english: englishByTier.map((r) => ({
        tier: r.tier,
        count: Number(r.count),
      })),
      ielts: [],
    };

    const enriched = rows.map((c) => {
      const tiers = counts[c.slug] ?? [];
      const total = tiers.reduce((acc, t) => acc + t.count, 0);
      return { ...c, totalActiveEnrollments: total, tiers };
    });

    res.json({ courses: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /admin/courses/:slug — single course (parity with student/enrollment
// admin GET-by-id endpoints).
router.get("/admin/courses/:slug", requireAdmin, async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    const [row] = await db
      .select()
      .from(platformCoursesTable)
      .where(eq(platformCoursesTable.slug, slug))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    res.json({ course: row });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/courses/:slug — edit title/subtitle/published/order.
// Slug is the primary key and is NOT editable here — changing slugs would
// orphan tier mappings and FAQ filters; deletion is also intentionally not
// exposed (the three known courses are platform-foundational).
const PatchCourseBody = z
  .object({
    titleEn: z.string().trim().min(1).max(200).optional(),
    titleAr: z.string().trim().min(1).max(200).optional(),
    subtitleEn: z.string().trim().max(500).nullable().optional(),
    subtitleAr: z.string().trim().max(500).nullable().optional(),
    isPublished: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

router.patch("/admin/courses/:slug", requireAdmin, async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    const parsed = PatchCourseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid payload",
      });
      return;
    }
    const data = parsed.data;
    const updates: Partial<typeof platformCoursesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.titleEn !== undefined) updates.titleEn = data.titleEn;
    if (data.titleAr !== undefined) updates.titleAr = data.titleAr;
    if (data.subtitleEn !== undefined) updates.subtitleEn = data.subtitleEn;
    if (data.subtitleAr !== undefined) updates.subtitleAr = data.subtitleAr;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;
    if (data.displayOrder !== undefined)
      updates.displayOrder = data.displayOrder;

    const [updated] = await db
      .update(platformCoursesTable)
      .set(updates)
      .where(eq(platformCoursesTable.slug, slug))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    res.json({ course: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
