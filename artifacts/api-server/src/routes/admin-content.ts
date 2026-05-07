import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  landingPagesTable,
  courseCardsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/admin/landing-pages", requireAdmin, async (_req, res, next) => {
  try {
    const pages = await db
      .select()
      .from(landingPagesTable)
      .orderBy(asc(landingPagesTable.course));
    res.json({ pages });
  } catch (err) {
    next(err);
  }
});

const LandingPagePatchSchema = z.object({
  titleEn: z.string().optional(),
  titleAr: z.string().optional(),
  subtitleEn: z.string().optional(),
  subtitleAr: z.string().optional(),
  heroImage: z.string().optional(),
  heroVideo: z.string().optional(),
  introVideo: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  benefitsEn: z.string().optional(),
  benefitsAr: z.string().optional(),
  targetStudentEn: z.string().optional(),
  targetStudentAr: z.string().optional(),
  whatLearnEn: z.string().optional(),
  whatLearnAr: z.string().optional(),
  ctaTextEn: z.string().optional(),
  ctaTextAr: z.string().optional(),
  ctaLink: z.string().optional(),
  isPublished: z.boolean().optional(),
});

router.patch(
  "/admin/landing-pages/:course",
  requireAdmin,
  async (req, res, next) => {
    try {
      const course = req.params.course as string;
      const body = LandingPagePatchSchema.parse(req.body);

      const existing = await db
        .select()
        .from(landingPagesTable)
        .where(eq(landingPagesTable.course, course))
        .limit(1);

      if (existing.length === 0) {
        const [created] = await db
          .insert(landingPagesTable)
          .values({ course, ...body, updatedAt: new Date() })
          .returning();
        res.json({ page: created });
      } else {
        const [updated] = await db
          .update(landingPagesTable)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(landingPagesTable.course, course))
          .returning();
        res.json({ page: updated });
      }
    } catch (err) {
      next(err);
    }
  },
);

router.get("/admin/course-cards", requireAdmin, async (req, res, next) => {
  try {
    const courseType = (req.query.courseType as string) ?? "english";
    const cards = await db
      .select()
      .from(courseCardsTable)
      .where(eq(courseCardsTable.courseType, courseType))
      .orderBy(asc(courseCardsTable.displayOrder));
    res.json({ cards });
  } catch (err) {
    next(err);
  }
});

const CourseCardCreateSchema = z.object({
  courseType: z.string(),
  titleEn: z.string().optional(),
  titleAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  level: z.string().optional(),
  price: z.number().optional(),
  discount: z.number().optional(),
  badgeEn: z.string().optional(),
  badgeAr: z.string().optional(),
  buttonTextEn: z.string().optional(),
  buttonTextAr: z.string().optional(),
  buttonLink: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
  targetBand: z.string().optional(),
});

router.post("/admin/course-cards", requireAdmin, async (req, res, next) => {
  try {
    const body = CourseCardCreateSchema.parse(req.body);
    const [card] = await db
      .insert(courseCardsTable)
      .values(body)
      .returning();
    res.json({ card });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/admin/course-cards/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const body = CourseCardCreateSchema.partial().parse(req.body);
      const [updated] = await db
        .update(courseCardsTable)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(courseCardsTable.id, id))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ card: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/admin/course-cards/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await db
        .delete(courseCardsTable)
        .where(eq(courseCardsTable.id, id));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
