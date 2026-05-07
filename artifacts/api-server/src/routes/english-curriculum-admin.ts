// ============================================================================
// Admin endpoints for the Lexo For English curriculum.
//
// Foundation only (May 2026): create/list/inspect books, ingest a typed
// BookDraft JSON, publish a book once it passes the section-completeness
// gate, and minimal CRUD for quizzes.
//
// Out of scope here (separate phases):
//   * PDF → BookDraft parser  (step 1 of the ingest pipeline)
//   * Auto-generated exercises (separate writeup once Book 1 is staged)
//   * Student-facing read endpoints under `/english/curriculum/...`
//   * Admin review UI
//
// All endpoints are gated by `requireAdmin`. None of them write to
// `english_word_progress` or to any IELTS table.
// ============================================================================

import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  englishBooksTable,
  englishLessonsTable,
  englishLessonSectionsTable,
  englishQuizzesTable,
  englishQuizQuestionsTable,
  ENGLISH_TIER_VALUES,
  ENGLISH_LESSON_SECTION_KINDS,
  ENGLISH_QUIZ_QUESTION_KINDS,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  bookDraftSchema,
  stageBookDraft,
  checkBookPublishable,
} from "../lib/curriculum-ingest";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Books — list / create / detail / patch / delete
// ---------------------------------------------------------------------------

const createBookSchema = z.object({
  tier: z.enum(ENGLISH_TIER_VALUES as readonly [string, ...string[]]),
  bookNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1).max(255),
  titleAr: z.string().min(1).max(255).optional(),
  subtitle: z.string().min(1).max(255).optional(),
  subtitleAr: z.string().min(1).max(255).optional(),
  coverImage: z.string().min(1).max(512).optional(),
  sortOrder: z.number().int().min(0).max(99).optional(),
});

router.get("/admin/english/curriculum/books", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(englishBooksTable)
      .orderBy(asc(englishBooksTable.tier), asc(englishBooksTable.bookNumber));

    // Lightweight per-book lesson count (kept as a separate query for
    // clarity; books are at most 9 rows so the N+1 is bounded).
    const out = await Promise.all(
      rows.map(async (b) => {
        const lessonRows = await db
          .select({ id: englishLessonsTable.id })
          .from(englishLessonsTable)
          .where(eq(englishLessonsTable.bookId, b.id));
        return { ...b, lessonCount: lessonRows.length };
      }),
    );

    res.json({ books: out });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/admin/english/curriculum/books",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = createBookSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: "Invalid body", details: parsed.error.message });
        return;
      }

      const existing = await db
        .select({ id: englishBooksTable.id })
        .from(englishBooksTable)
        .where(
          and(
            eq(englishBooksTable.tier, parsed.data.tier),
            eq(englishBooksTable.bookNumber, parsed.data.bookNumber),
          ),
        )
        .limit(1);
      if (existing[0]) {
        res
          .status(409)
          .json({ error: "Book already exists for this tier+number" });
        return;
      }

      const [row] = await db
        .insert(englishBooksTable)
        .values({
          tier: parsed.data.tier,
          bookNumber: parsed.data.bookNumber,
          title: parsed.data.title,
          titleAr: parsed.data.titleAr ?? null,
          subtitle: parsed.data.subtitle ?? null,
          subtitleAr: parsed.data.subtitleAr ?? null,
          coverImage: parsed.data.coverImage ?? null,
          sortOrder: parsed.data.sortOrder ?? parsed.data.bookNumber,
          status: "draft",
        })
        .returning();

      res.status(201).json({ book: row });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/admin/english/curriculum/books/:bookId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!Number.isInteger(bookId) || bookId <= 0) {
        res.status(400).json({ error: "Invalid bookId" });
        return;
      }
      const [book] = await db
        .select()
        .from(englishBooksTable)
        .where(eq(englishBooksTable.id, bookId))
        .limit(1);
      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }

      const lessons = await db
        .select({
          id: englishLessonsTable.id,
          lessonNumber: englishLessonsTable.lessonNumber,
          level: englishLessonsTable.level,
          title: englishLessonsTable.title,
          titleAr: englishLessonsTable.titleAr,
          theme: englishLessonsTable.theme,
          summary: englishLessonsTable.summary,
        })
        .from(englishLessonsTable)
        .where(eq(englishLessonsTable.bookId, bookId))
        .orderBy(asc(englishLessonsTable.lessonNumber));

      // Count sections per lesson so the admin sees "6/6 sections" at a glance.
      const lessonsWithSectionCount = await Promise.all(
        lessons.map(async (l) => {
          const sects = await db
            .select({ kind: englishLessonSectionsTable.kind })
            .from(englishLessonSectionsTable)
            .where(eq(englishLessonSectionsTable.lessonId, l.id));
          return { ...l, sectionCount: sects.length };
        }),
      );

      const quizzes = await db
        .select()
        .from(englishQuizzesTable)
        .where(eq(englishQuizzesTable.bookId, bookId))
        .orderBy(asc(englishQuizzesTable.quizNumber));

      res.json({ book, lessons: lessonsWithSectionCount, quizzes });
    } catch (err) {
      next(err);
    }
  },
);

const patchBookSchema = createBookSchema.partial().omit({ tier: true, bookNumber: true });

router.patch(
  "/admin/english/curriculum/books/:bookId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!Number.isInteger(bookId) || bookId <= 0) {
        res.status(400).json({ error: "Invalid bookId" });
        return;
      }
      const parsed = patchBookSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed.data)) {
        if (v !== undefined) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) {
        res.json({ ok: true, updated: 0 });
        return;
      }
      await db
        .update(englishBooksTable)
        .set(updates)
        .where(eq(englishBooksTable.id, bookId));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/admin/english/curriculum/books/:bookId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!Number.isInteger(bookId) || bookId <= 0) {
        res.status(400).json({ error: "Invalid bookId" });
        return;
      }
      // Note: english_lessons.book_id is ON DELETE CASCADE, so deleting a
      // book also deletes its lessons, which in turn cascade-delete their
      // sections, vocab links, and per-user section-progress rows. Quizzes
      // cascade directly off english_books. Legacy Mentor lessons (book_id
      // IS NULL) are unaffected.
      await db.delete(englishBooksTable).where(eq(englishBooksTable.id, bookId));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Ingest a BookDraft JSON.
//
// Body shape: see `bookDraftSchema` in lib/curriculum-ingest.ts.
// On success: returns staged counts + unmatchedWords[] (may be empty).
// `ok: false` means at least one word didn't resolve in the Lexo 5000;
// the book row is still created/updated, but lessons with unmatched words
// were skipped. Admin must edit the draft (or add the word to the Lexo
// 5000 via a separate action — NOT done here) and re-ingest.
// ---------------------------------------------------------------------------
router.post(
  "/admin/english/curriculum/books/:bookId/ingest",
  requireAdmin,
  async (req, res, next) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!Number.isInteger(bookId) || bookId <= 0) {
        res.status(400).json({ error: "Invalid bookId" });
        return;
      }

      // Soft-validate the draft up-front and ensure (tier, bookNumber)
      // matches the URL `bookId`. This prevents an admin from accidentally
      // overwriting Book 2 by POSTing a Book 1 draft to /books/2/ingest.
      const draftCheck = bookDraftSchema.safeParse(req.body);
      if (!draftCheck.success) {
        res.status(400).json({
          error: "Invalid book draft",
          details: draftCheck.error.message,
        });
        return;
      }

      const [book] = await db
        .select()
        .from(englishBooksTable)
        .where(eq(englishBooksTable.id, bookId))
        .limit(1);
      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }
      if (
        book.tier !== draftCheck.data.tier ||
        book.bookNumber !== draftCheck.data.bookNumber
      ) {
        res.status(409).json({
          error: "Draft tier/bookNumber does not match URL bookId",
          urlBook: { tier: book.tier, bookNumber: book.bookNumber },
          draftBook: {
            tier: draftCheck.data.tier,
            bookNumber: draftCheck.data.bookNumber,
          },
        });
        return;
      }

      const result = await stageBookDraft(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Pre-publish check + publish.
// Publish refuses unless every lesson has all 6 sections and the book has at
// least one lesson. (Quiz publication is independent — see below.)
// ---------------------------------------------------------------------------

router.get(
  "/admin/english/curriculum/books/:bookId/publish-check",
  requireAdmin,
  async (req, res, next) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!Number.isInteger(bookId) || bookId <= 0) {
        res.status(400).json({ error: "Invalid bookId" });
        return;
      }
      const result = await checkBookPublishable(bookId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/english/curriculum/books/:bookId/publish",
  requireAdmin,
  async (req, res, next) => {
    try {
      const bookId = Number(req.params.bookId);
      if (!Number.isInteger(bookId) || bookId <= 0) {
        res.status(400).json({ error: "Invalid bookId" });
        return;
      }
      const check = await checkBookPublishable(bookId);
      if (!check.ok) {
        res.status(409).json({ error: "Book not ready to publish", check });
        return;
      }
      await db
        .update(englishBooksTable)
        .set({ status: "published" })
        .where(eq(englishBooksTable.id, bookId));
      res.json({ ok: true, check });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Quiz CRUD (foundation: shell + questions).
// Quizzes can be created independently of ingest; ingest will replace them
// idempotently when a draft contains a quizzes[] array.
// ---------------------------------------------------------------------------

const createQuizSchema = z.object({
  bookId: z.number().int().positive(),
  quizNumber: z.union([z.literal(1), z.literal(2)]),
  placedAfterLesson: z.number().int().min(1).max(60),
  title: z.string().min(1).max(255),
  titleAr: z.string().min(1).max(255).optional(),
  passThresholdPct: z.number().int().min(1).max(100).optional(),
  timeLimitSeconds: z.number().int().min(30).max(60 * 60 * 4).optional(),
});

router.post(
  "/admin/english/curriculum/quizzes",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = createQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }
      const [book] = await db
        .select({ id: englishBooksTable.id })
        .from(englishBooksTable)
        .where(eq(englishBooksTable.id, parsed.data.bookId))
        .limit(1);
      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }
      const existing = await db
        .select({ id: englishQuizzesTable.id })
        .from(englishQuizzesTable)
        .where(
          and(
            eq(englishQuizzesTable.bookId, parsed.data.bookId),
            eq(englishQuizzesTable.quizNumber, parsed.data.quizNumber),
          ),
        )
        .limit(1);
      if (existing[0]) {
        res.status(409).json({ error: "Quiz number already exists for book" });
        return;
      }
      const [row] = await db
        .insert(englishQuizzesTable)
        .values({
          bookId: parsed.data.bookId,
          quizNumber: parsed.data.quizNumber,
          placedAfterLesson: parsed.data.placedAfterLesson,
          title: parsed.data.title,
          titleAr: parsed.data.titleAr ?? null,
          passThresholdPct: parsed.data.passThresholdPct ?? 70,
          timeLimitSeconds: parsed.data.timeLimitSeconds ?? null,
          status: "draft",
        })
        .returning();
      res.status(201).json({ quiz: row });
    } catch (err) {
      next(err);
    }
  },
);

const createQuizQuestionSchema = z.object({
  position: z.number().int().min(1),
  kind: z.enum(ENGLISH_QUIZ_QUESTION_KINDS as readonly [string, ...string[]]),
  promptEn: z.string().min(1),
  promptAr: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()),
  solution: z.record(z.string(), z.unknown()),
  points: z.number().int().min(1).max(20).optional(),
  lessonRef: z.number().int().positive().nullish(),
});

router.post(
  "/admin/english/curriculum/quizzes/:quizId/questions",
  requireAdmin,
  async (req, res, next) => {
    try {
      const quizId = Number(req.params.quizId);
      if (!Number.isInteger(quizId) || quizId <= 0) {
        res.status(400).json({ error: "Invalid quizId" });
        return;
      }
      const parsed = createQuizQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }
      const [quiz] = await db
        .select({ id: englishQuizzesTable.id })
        .from(englishQuizzesTable)
        .where(eq(englishQuizzesTable.id, quizId))
        .limit(1);
      if (!quiz) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }
      const [row] = await db
        .insert(englishQuizQuestionsTable)
        .values({
          quizId,
          position: parsed.data.position,
          kind: parsed.data.kind,
          promptEn: parsed.data.promptEn,
          promptAr: parsed.data.promptAr ?? null,
          payload: parsed.data.payload,
          solution: parsed.data.solution,
          points: parsed.data.points ?? 1,
          lessonRef: parsed.data.lessonRef ?? null,
        })
        .returning();
      res.status(201).json({ question: row });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/english/curriculum/quizzes/:quizId/publish",
  requireAdmin,
  async (req, res, next) => {
    try {
      const quizId = Number(req.params.quizId);
      if (!Number.isInteger(quizId) || quizId <= 0) {
        res.status(400).json({ error: "Invalid quizId" });
        return;
      }
      const qs = await db
        .select({ id: englishQuizQuestionsTable.id })
        .from(englishQuizQuestionsTable)
        .where(eq(englishQuizQuestionsTable.quizId, quizId));
      if (qs.length === 0) {
        res.status(409).json({ error: "Quiz has no questions" });
        return;
      }
      await db
        .update(englishQuizzesTable)
        .set({ status: "published" })
        .where(eq(englishQuizzesTable.id, quizId));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Tiny meta endpoint so admin UI can render dropdowns without hard-coding.
// ---------------------------------------------------------------------------
router.get(
  "/admin/english/curriculum/meta",
  requireAdmin,
  async (_req, res) => {
    res.json({
      tiers: ENGLISH_TIER_VALUES,
      sectionKinds: ENGLISH_LESSON_SECTION_KINDS,
      quizQuestionKinds: ENGLISH_QUIZ_QUESTION_KINDS,
    });
  },
);

export default router;
