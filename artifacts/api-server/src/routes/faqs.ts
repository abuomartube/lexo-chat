import { Router, type IRouter } from "express";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, platformFaqsTable, platformCoursesTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// Up to 64 chars to comfortably hold the longest known course slug; the
// actual DB column is varchar(32).
const CourseSlugSchema = z.string().trim().min(1).max(32);

const FaqBodySchema = z.object({
  courseSlug: CourseSlugSchema.nullable().optional(),
  questionEn: z.string().trim().min(1).max(500),
  questionAr: z.string().trim().min(1).max(500),
  answerEn: z.string().trim().min(1).max(5000),
  answerAr: z.string().trim().min(1).max(5000),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
  isPublished: z.boolean().optional(),
});

const PatchFaqBodySchema = FaqBodySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "Provide at least one field to update" },
);

// Validate that a courseSlug, when provided, refers to a real course.
// Returns true if the slug is null/undefined (global FAQ) or refers to an
// existing course. Returns false if the slug is unknown — callers should
// reply with a 400 in that case.
async function isValidCourseSlug(
  slug: string | null | undefined,
): Promise<boolean> {
  if (slug === null || slug === undefined) return true;
  const [c] = await db
    .select({ slug: platformCoursesTable.slug })
    .from(platformCoursesTable)
    .where(eq(platformCoursesTable.slug, slug))
    .limit(1);
  return Boolean(c);
}

// GET /faqs — public; only published FAQs, ordered by (course, display_order).
// Optional ?course= filter (use 'global' to fetch only course-less FAQs).
router.get("/faqs", async (req, res, next) => {
  try {
    const courseParam =
      typeof req.query.course === "string" ? req.query.course : undefined;

    let rows;
    if (courseParam === "global") {
      rows = await db
        .select()
        .from(platformFaqsTable)
        .where(
          sql`${platformFaqsTable.isPublished} = true AND ${platformFaqsTable.courseSlug} IS NULL`,
        )
        .orderBy(asc(platformFaqsTable.displayOrder));
    } else if (courseParam) {
      rows = await db
        .select()
        .from(platformFaqsTable)
        .where(
          sql`${platformFaqsTable.isPublished} = true AND ${platformFaqsTable.courseSlug} = ${courseParam}`,
        )
        .orderBy(asc(platformFaqsTable.displayOrder));
    } else {
      rows = await db
        .select()
        .from(platformFaqsTable)
        .where(eq(platformFaqsTable.isPublished, true))
        .orderBy(
          asc(platformFaqsTable.courseSlug),
          asc(platformFaqsTable.displayOrder),
        );
    }
    res.json({ faqs: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/faqs — all FAQs including unpublished.
router.get("/admin/faqs", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(platformFaqsTable)
      .orderBy(
        asc(platformFaqsTable.courseSlug),
        asc(platformFaqsTable.displayOrder),
      );
    res.json({ faqs: rows });
  } catch (err) {
    next(err);
  }
});

// POST /admin/faqs — create a new FAQ. If displayOrder is omitted, append
// to the end of the (course-or-global) bucket.
router.post("/admin/faqs", requireAdmin, async (req, res, next) => {
  try {
    const parsed = FaqBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
      return;
    }
    const data = parsed.data;
    if (!(await isValidCourseSlug(data.courseSlug))) {
      res
        .status(400)
        .json({ error: `Unknown course slug: ${data.courseSlug}` });
      return;
    }

    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      // Compute next order = max+1 within the same bucket.
      const bucketWhere =
        data.courseSlug === null || data.courseSlug === undefined
          ? sql`${platformFaqsTable.courseSlug} IS NULL`
          : sql`${platformFaqsTable.courseSlug} = ${data.courseSlug}`;
      const [maxRow] = await db
        .select({
          max: sql<number>`COALESCE(MAX(${platformFaqsTable.displayOrder}), -1)`,
        })
        .from(platformFaqsTable)
        .where(bucketWhere);
      displayOrder = (maxRow?.max ?? -1) + 1;
    }

    const [created] = await db
      .insert(platformFaqsTable)
      .values({
        courseSlug: data.courseSlug ?? null,
        questionEn: data.questionEn,
        questionAr: data.questionAr,
        answerEn: data.answerEn,
        answerAr: data.answerAr,
        displayOrder,
        isPublished: data.isPublished ?? true,
      })
      .returning();
    res.status(201).json({ faq: created });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/faqs/:id — partial update.
router.patch("/admin/faqs/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const parsed = PatchFaqBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
      return;
    }
    const data = parsed.data;
    if (
      data.courseSlug !== undefined &&
      !(await isValidCourseSlug(data.courseSlug))
    ) {
      res
        .status(400)
        .json({ error: `Unknown course slug: ${data.courseSlug}` });
      return;
    }

    const updates: Partial<typeof platformFaqsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.courseSlug !== undefined)
      updates.courseSlug = data.courseSlug ?? null;
    if (data.questionEn !== undefined) updates.questionEn = data.questionEn;
    if (data.questionAr !== undefined) updates.questionAr = data.questionAr;
    if (data.answerEn !== undefined) updates.answerEn = data.answerEn;
    if (data.answerAr !== undefined) updates.answerAr = data.answerAr;
    if (data.displayOrder !== undefined)
      updates.displayOrder = data.displayOrder;
    if (data.isPublished !== undefined) updates.isPublished = data.isPublished;

    const [updated] = await db
      .update(platformFaqsTable)
      .set(updates)
      .where(eq(platformFaqsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "FAQ not found" });
      return;
    }
    res.json({ faq: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/faqs/:id
router.delete("/admin/faqs/:id", requireAdmin, async (req, res, next) => {
  try {
    const [deleted] = await db
      .delete(platformFaqsTable)
      .where(eq(platformFaqsTable.id, String(req.params.id)))
      .returning({ id: platformFaqsTable.id });
    if (!deleted) {
      res.status(404).json({ error: "FAQ not found" });
      return;
    }
    res.json({ message: "FAQ deleted." });
  } catch (err) {
    next(err);
  }
});

// POST /admin/faqs/reorder — accepts an ordered array of FAQ IDs and assigns
// display_order = index. To prevent lost updates and inconsistent ordering
// when admins reorder concurrently (or while a new FAQ is being created in the
// same bucket), the entire operation runs inside a single transaction guarded
// by:
//   1. A bucket-level pg_advisory_xact_lock keyed on the course_slug so two
//      reorder requests for the same bucket serialise.
//   2. SELECT ... FOR UPDATE on the affected rows.
//   3. A completeness check: the submitted IDs must be exactly the set of
//      FAQs in that bucket (same course_slug). This prevents partial payloads
//      from leaving gaps or duplicate display_order values, and makes the
//      contract explicit: "reorder = full bucket ordering".
const ReorderBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

router.post("/admin/faqs/reorder", requireAdmin, async (req, res, next) => {
  try {
    const parsed = ReorderBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
      return;
    }
    const { ids } = parsed.data;

    // Reject duplicate ids in the payload up-front — they would silently
    // collapse into the same display_order otherwise.
    if (new Set(ids).size !== ids.length) {
      res.status(400).json({ error: "Duplicate FAQ IDs in payload." });
      return;
    }

    await db.transaction(async (tx) => {
      // Resolve the bucket from the first ID, then verify every other ID
      // belongs to the same bucket and that the bucket has no other FAQs.
      const rows = await tx
        .select({
          id: platformFaqsTable.id,
          courseSlug: platformFaqsTable.courseSlug,
        })
        .from(platformFaqsTable)
        .where(inArray(platformFaqsTable.id, ids))
        .for("update");

      if (rows.length !== ids.length) {
        throw new ReorderError(400, "One or more FAQ IDs do not exist.");
      }

      // All submitted FAQs must share the same bucket (course_slug).
      const firstSlug = rows[0]!.courseSlug;
      if (!rows.every((r) => r.courseSlug === firstSlug)) {
        throw new ReorderError(
          400,
          "All FAQ IDs in a reorder request must share the same course scope.",
        );
      }

      // Acquire a bucket-level advisory lock so concurrent reorder/insert
      // attempts for the same bucket serialise. We hash the bucket key
      // (`global` for null) to fit into pg_advisory_xact_lock's bigint arg.
      const bucketKey = firstSlug === null ? "__global__" : firstSlug;
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${"faq_reorder_" + bucketKey}))`,
      );

      // Re-check bucket membership AFTER the lock, since it's the lock that
      // serialises. Make sure the submitted IDs are exactly the bucket.
      const bucketRows = await tx
        .select({ id: platformFaqsTable.id })
        .from(platformFaqsTable)
        .where(
          firstSlug === null
            ? sql`${platformFaqsTable.courseSlug} IS NULL`
            : eq(platformFaqsTable.courseSlug, firstSlug),
        );
      const bucketIds = new Set(bucketRows.map((r) => r.id));
      if (
        bucketIds.size !== ids.length ||
        !ids.every((id) => bucketIds.has(id))
      ) {
        throw new ReorderError(
          400,
          "Reorder must include every FAQ in the bucket exactly once.",
        );
      }

      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(platformFaqsTable)
          .set({ displayOrder: i, updatedAt: new Date() })
          .where(eq(platformFaqsTable.id, ids[i]!));
      }
    });
    res.json({ message: "Reordered.", count: ids.length });
  } catch (err) {
    if (err instanceof ReorderError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

class ReorderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export default router;
