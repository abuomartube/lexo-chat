import { Router, type IRouter } from "express";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  englishBooksTable,
  englishLessonsTable,
  englishLessonSectionsTable,
  englishLessonSectionProgressTable,
  englishLessonVocabTable,
  englishLessonCompletionsTable,
  englishQuizzesTable,
  englishQuizQuestionsTable,
  englishQuizAttemptsTable,
  englishQuizAnswersTable,
  englishExercisesTable,
  englishExerciseAttemptsTable,
  englishXpEventsTable,
  englishEnrollmentsTable,
  englishStudyEventsTable,
  usersTable,
  wordsTable,
  ENGLISH_LESSON_SECTION_KINDS,
  ENGLISH_LESSON_SECTION_POSITION,
  CURRICULUM_XP_PER_SECTION,
  CURRICULUM_XP_LESSON_COMPLETE_BONUS,
  canAccessEnglishLevel,
  type EnglishLessonSectionKind,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  recordDailyActivity,
  evaluateAchievements,
} from "../lib/english-engagement-service";

const router: IRouter = Router();

// XP awarded for first PASS of a curriculum quiz.
const CURRICULUM_XP_QUIZ_PASS = 100;

// Fixed time buckets (seconds) for actions where the client doesn't carry
// a reliable duration signal. Conservative values — better to under-count
// than to game leaderboards. Section completions are short reads/clicks;
// lesson "complete" is the wrap-up tap; a quiz attempt without timing
// metadata is treated as a single short session.
const CURRICULUM_SECONDS_PER_SECTION = 30;
const CURRICULUM_SECONDS_PER_LESSON_COMPLETE = 15;
const CURRICULUM_SECONDS_PER_QUIZ_ATTEMPT = 60;
// Hard cap on any single exercise study-event so a stale tab can't poison
// the daily roll-up with hours of "active" time.
const CURRICULUM_MAX_EXERCISE_SECONDS = 600;

// Helper: emit a `english_study_events` row (drives /english/me/study-time)
// and update the daily roll-up (drives DAU/WAU/MAU + analytics). Both are
// best-effort and never block or fail the parent request.
async function recordCurriculumActivity(
  userId: string,
  lessonId: number | null,
  deltaSeconds: number,
  daily: Parameters<typeof recordDailyActivity>[1] = {},
): Promise<void> {
  const secs = Math.max(0, Math.floor(deltaSeconds));
  if (secs > 0 && lessonId != null) {
    try {
      await db.insert(englishStudyEventsTable).values({
        userId,
        lessonId,
        deltaSeconds: secs,
      });
    } catch {
      /* engagement is non-blocking */
    }
  }
  try {
    await recordDailyActivity(userId, {
      ...daily,
      secondsActive: (daily.secondsActive ?? 0) + secs,
    });
  } catch {
    /* engagement is non-blocking */
  }
}

// ---------------------------------------------------------------------------
// Tier helpers (mirror english-mentor.ts; intentionally local — small and
// focused so curriculum routes don't depend on mentor-specific code paths).
// ---------------------------------------------------------------------------
async function getStudentActiveTiers(userId: string): Promise<string[]> {
  const rows = await db
    .select({
      tier: englishEnrollmentsTable.tier,
      expiresAt: englishEnrollmentsTable.expiresAt,
    })
    .from(englishEnrollmentsTable)
    .where(
      and(
        eq(englishEnrollmentsTable.userId, userId),
        eq(englishEnrollmentsTable.status, "active"),
      ),
    );
  const now = new Date();
  return [
    ...new Set(
      rows.filter((r) => !r.expiresAt || r.expiresAt > now).map((r) => r.tier),
    ),
  ];
}

async function getStudentBestTier(userId: string): Promise<string | null> {
  const tiers = await getStudentActiveTiers(userId);
  if (tiers.length === 0) return null;
  if (tiers.includes("advanced")) return "advanced";
  if (tiers.includes("intermediate")) return "intermediate";
  return "beginner";
}

// Tier visibility for books: a book is visible if the student has a tier that
// matches OR is higher than the book's tier.
const TIER_RANK: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};
function canAccessBookTier(activeTiers: string[], bookTier: string): boolean {
  const max = activeTiers.reduce(
    (m, t) => Math.max(m, TIER_RANK[t] ?? -1),
    -1,
  );
  return max >= (TIER_RANK[bookTier] ?? Infinity);
}

// ---------------------------------------------------------------------------
// Draft-vs-published gate (mirrors the tier-gate pattern: returns 403 with a
// stable error string). Admin users bypass entirely so they can preview /
// QA draft content end-to-end. Curriculum lessons live under a `book_id`
// (status comes from `english_books.status`); legacy mentor lessons have
// `book_id = null` and are NOT subject to this gate (tier-only).
// ---------------------------------------------------------------------------
async function isAdminUser(userId: string): Promise<boolean> {
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return u?.role === "admin";
}

type CurriculumGateResult = true | { error: string; httpStatus: number };

// Resolve the book's publish status for a given lesson and apply the
// student-side published-only gate. Admins bypass. Lessons with no book
// (legacy mentor) bypass. Missing book → 404. Draft/archived for non-admin
// → 403.
async function ensureLessonBookPublishedForStudent(
  userId: string,
  bookId: number | null | undefined,
): Promise<CurriculumGateResult> {
  if (bookId == null) return true;
  const [book] = await db
    .select({ status: englishBooksTable.status })
    .from(englishBooksTable)
    .where(eq(englishBooksTable.id, bookId))
    .limit(1);
  if (!book) {
    return { error: "Book not found", httpStatus: 404 };
  }
  if (book.status === "published") return true;
  if (await isAdminUser(userId)) return true;
  return { error: "Book not yet available", httpStatus: 403 };
}

// Same gate but for callers that already have the book row in hand (quiz
// routes, books-listing). Avoids the second DB round-trip.
async function ensureBookPublishedForStudent(
  userId: string,
  bookStatus: string,
): Promise<CurriculumGateResult> {
  if (bookStatus === "published") return true;
  if (await isAdminUser(userId)) return true;
  return { error: "Book not yet available", httpStatus: 403 };
}

// ---------------------------------------------------------------------------
// GET /english/curriculum/books
//   Returns books visible to the user (any status, gated by tier) with
//   per-book progress counts. NOTE: status filter is intentionally OPEN so
//   draft books appear during the soft-launch window.
// ---------------------------------------------------------------------------
router.get("/english/curriculum/books", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    const bestTier = await getStudentBestTier(userId);

    const books = await db
      .select()
      .from(englishBooksTable)
      .orderBy(
        asc(englishBooksTable.tier),
        asc(englishBooksTable.bookNumber),
        asc(englishBooksTable.sortOrder),
      );

    // Per-book lesson totals + completion totals for this user.
    const lessonAgg = await db
      .select({
        bookId: englishLessonsTable.bookId,
        total: sql<number>`count(*)::int`,
      })
      .from(englishLessonsTable)
      .where(sql`${englishLessonsTable.bookId} is not null`)
      .groupBy(englishLessonsTable.bookId);

    const completionAgg = await db
      .select({
        bookId: englishLessonsTable.bookId,
        completed: sql<number>`count(*)::int`,
      })
      .from(englishLessonCompletionsTable)
      .innerJoin(
        englishLessonsTable,
        eq(englishLessonCompletionsTable.lessonId, englishLessonsTable.id),
      )
      .where(
        and(
          eq(englishLessonCompletionsTable.userId, userId),
          sql`${englishLessonsTable.bookId} is not null`,
        ),
      )
      .groupBy(englishLessonsTable.bookId);

    const totalsByBook = new Map<number, number>();
    for (const r of lessonAgg) {
      if (r.bookId != null) totalsByBook.set(r.bookId, r.total);
    }
    const doneByBook = new Map<number, number>();
    for (const r of completionAgg) {
      if (r.bookId != null) doneByBook.set(r.bookId, r.completed);
    }

    // Draft books are surfaced to non-admin students as `locked=true` so the
    // UI can render a "Coming soon" tile without 404-ing the whole listing.
    // Admins see real counts and locked=false even for drafts.
    const isAdmin = await isAdminUser(userId);

    const out = books.map((b) => {
      const tierVisible = canAccessBookTier(activeTiers, b.tier);
      const statusVisible = isAdmin || b.status === "published";
      const fullyAccessible = tierVisible && statusVisible;
      return {
        id: b.id,
        tier: b.tier,
        bookNumber: b.bookNumber,
        title: b.title,
        titleAr: b.titleAr,
        subtitle: b.subtitle,
        subtitleAr: b.subtitleAr,
        coverImage: b.coverImage,
        status: b.status,
        locked: !fullyAccessible,
        totalLessons: totalsByBook.get(b.id) ?? 0,
        completedLessons: fullyAccessible ? (doneByBook.get(b.id) ?? 0) : 0,
      };
    });

    res.json({ bestTier, books: out });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /english/curriculum/books/:bookId
//   Book + ordered lessons (with per-lesson status) + quizzes (with locked
//   flag and last-attempt summary).
// ---------------------------------------------------------------------------
router.get(
  "/english/curriculum/books/:bookId",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const bookId = parseInt(String(req.params.bookId), 10);
      if (isNaN(bookId)) {
        res.status(400).json({ error: "Invalid book id" });
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

      const activeTiers = await getStudentActiveTiers(userId);
      if (!canAccessBookTier(activeTiers, book.tier)) {
        res.status(403).json({ error: "Tier not sufficient for this book" });
        return;
      }

      const statusGate = await ensureBookPublishedForStudent(userId, book.status);
      if (statusGate !== true) {
        res.status(statusGate.httpStatus).json({ error: statusGate.error });
        return;
      }

      const lessons = await db
        .select()
        .from(englishLessonsTable)
        .where(eq(englishLessonsTable.bookId, bookId))
        .orderBy(asc(englishLessonsTable.lessonNumber));

      const completions = await db
        .select({ lessonId: englishLessonCompletionsTable.lessonId })
        .from(englishLessonCompletionsTable)
        .where(
          and(
            eq(englishLessonCompletionsTable.userId, userId),
            inArray(
              englishLessonCompletionsTable.lessonId,
              lessons.map((l) => l.id).length ? lessons.map((l) => l.id) : [-1],
            ),
          ),
        );
      const completedSet = new Set(completions.map((c) => c.lessonId));

      const sectionProg = await db
        .select({
          lessonId: englishLessonSectionProgressTable.lessonId,
          kind: englishLessonSectionProgressTable.kind,
        })
        .from(englishLessonSectionProgressTable)
        .where(
          and(
            eq(englishLessonSectionProgressTable.userId, userId),
            inArray(
              englishLessonSectionProgressTable.lessonId,
              lessons.map((l) => l.id).length ? lessons.map((l) => l.id) : [-1],
            ),
          ),
        );
      const sectionsByLesson = new Map<number, number>();
      for (const r of sectionProg) {
        sectionsByLesson.set(r.lessonId, (sectionsByLesson.get(r.lessonId) ?? 0) + 1);
      }

      const lessonsOut = lessons.map((l) => {
        const completed = completedSet.has(l.id);
        const sectionsDone = sectionsByLesson.get(l.id) ?? 0;
        const status = completed
          ? "completed"
          : sectionsDone > 0
            ? "in_progress"
            : "not_started";
        return {
          id: l.id,
          lessonNumber: l.lessonNumber,
          title: l.title,
          titleAr: l.titleAr,
          level: l.level,
          status,
          sectionsCompleted: sectionsDone,
          sectionsTotal: ENGLISH_LESSON_SECTION_KINDS.length,
        };
      });

      const quizzes = await db
        .select()
        .from(englishQuizzesTable)
        .where(eq(englishQuizzesTable.bookId, bookId))
        .orderBy(asc(englishQuizzesTable.quizNumber));

      // For each quiz, check whether the placement lesson is completed AND
      // fetch the latest attempt to surface "passed" / score in the UI.
      const quizzesOut = await Promise.all(
        quizzes.map(async (q) => {
          // Lesson at placedAfterLesson (lesson_number) for this book.
          const placementLesson = lessons.find(
            (l) => l.lessonNumber === q.placedAfterLesson,
          );
          const unlocked = placementLesson
            ? completedSet.has(placementLesson.id)
            : false;
          const [latest] = await db
            .select({
              id: englishQuizAttemptsTable.id,
              scorePct: englishQuizAttemptsTable.scorePct,
              passed: englishQuizAttemptsTable.passed,
              submittedAt: englishQuizAttemptsTable.submittedAt,
            })
            .from(englishQuizAttemptsTable)
            .where(
              and(
                eq(englishQuizAttemptsTable.userId, userId),
                eq(englishQuizAttemptsTable.quizId, q.id),
                sql`${englishQuizAttemptsTable.submittedAt} is not null`,
              ),
            )
            .orderBy(sql`${englishQuizAttemptsTable.submittedAt} desc`)
            .limit(1);
          const [bestPass] = await db
            .select({ id: englishQuizAttemptsTable.id })
            .from(englishQuizAttemptsTable)
            .where(
              and(
                eq(englishQuizAttemptsTable.userId, userId),
                eq(englishQuizAttemptsTable.quizId, q.id),
                eq(englishQuizAttemptsTable.passed, true),
              ),
            )
            .limit(1);
          return {
            id: q.id,
            quizNumber: q.quizNumber,
            placedAfterLesson: q.placedAfterLesson,
            title: q.title,
            titleAr: q.titleAr,
            passThresholdPct: q.passThresholdPct,
            locked: !unlocked,
            lastScorePct: latest?.scorePct ?? null,
            lastPassed: latest?.passed ?? null,
            everPassed: !!bestPass,
          };
        }),
      );

      res.json({
        book: {
          id: book.id,
          tier: book.tier,
          bookNumber: book.bookNumber,
          title: book.title,
          titleAr: book.titleAr,
          subtitle: book.subtitle,
          subtitleAr: book.subtitleAr,
          coverImage: book.coverImage,
          status: book.status,
        },
        lessons: lessonsOut,
        quizzes: quizzesOut,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /english/curriculum/lessons/:lessonId
// ---------------------------------------------------------------------------
router.get(
  "/english/curriculum/lessons/:lessonId",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const lessonId = parseInt(String(req.params.lessonId), 10);
      if (isNaN(lessonId)) {
        res.status(400).json({ error: "Invalid lesson id" });
        return;
      }

      const [lesson] = await db
        .select()
        .from(englishLessonsTable)
        .where(eq(englishLessonsTable.id, lessonId))
        .limit(1);
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }

      const activeTiers = await getStudentActiveTiers(userId);
      if (
        activeTiers.length === 0 ||
        !canAccessEnglishLevel(activeTiers, lesson.level)
      ) {
        res.status(403).json({ error: "Tier not sufficient for this lesson" });
        return;
      }

      const statusGate = await ensureLessonBookPublishedForStudent(
        userId,
        lesson.bookId,
      );
      if (statusGate !== true) {
        res.status(statusGate.httpStatus).json({ error: statusGate.error });
        return;
      }

      const sections = await db
        .select()
        .from(englishLessonSectionsTable)
        .where(eq(englishLessonSectionsTable.lessonId, lessonId))
        .orderBy(asc(englishLessonSectionsTable.position));

      const vocabLinks = await db
        .select({
          wordId: englishLessonVocabTable.wordId,
          displayOrder: englishLessonVocabTable.displayOrder,
        })
        .from(englishLessonVocabTable)
        .where(eq(englishLessonVocabTable.lessonId, lessonId))
        .orderBy(asc(englishLessonVocabTable.displayOrder));

      const wordIds = vocabLinks.map((v) => v.wordId);
      const words = wordIds.length
        ? await db
            .select()
            .from(wordsTable)
            .where(inArray(wordsTable.id, wordIds))
        : [];
      const wordById = new Map(words.map((w) => [w.id, w]));
      const vocab = vocabLinks
        .map((v) => {
          const w = wordById.get(v.wordId);
          if (!w) return null;
          return {
            wordId: w.id,
            displayOrder: v.displayOrder,
            english: w.english,
            arabic: w.arabic,
            pos: w.pos,
            level: w.level,
            sentenceEn: w.sentenceEn,
            sentenceAr: w.sentenceAr,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const sectionProg = await db
        .select({ kind: englishLessonSectionProgressTable.kind })
        .from(englishLessonSectionProgressTable)
        .where(
          and(
            eq(englishLessonSectionProgressTable.userId, userId),
            eq(englishLessonSectionProgressTable.lessonId, lessonId),
          ),
        );
      const completedKinds = new Set(sectionProg.map((s) => s.kind));

      const exercises = await db
        .select()
        .from(englishExercisesTable)
        .where(
          and(
            eq(englishExercisesTable.lessonId, lessonId),
            eq(englishExercisesTable.isActive, true),
          ),
        )
        .orderBy(asc(englishExercisesTable.id));

      const exerciseIds = exercises.map((e) => e.id);
      const correctAttempts = exerciseIds.length
        ? await db
            .select({ exerciseId: englishExerciseAttemptsTable.exerciseId })
            .from(englishExerciseAttemptsTable)
            .where(
              and(
                eq(englishExerciseAttemptsTable.userId, userId),
                eq(englishExerciseAttemptsTable.isCorrect, true),
                inArray(
                  englishExerciseAttemptsTable.exerciseId,
                  exerciseIds,
                ),
              ),
            )
        : [];
      const correctSet = new Set(correctAttempts.map((a) => a.exerciseId));

      // Adjacent lessons in the same book (ordered by lesson_number).
      let prevLessonId: number | null = null;
      let nextLessonId: number | null = null;
      if (lesson.bookId != null && lesson.lessonNumber != null) {
        const siblings = await db
          .select({ id: englishLessonsTable.id, num: englishLessonsTable.lessonNumber })
          .from(englishLessonsTable)
          .where(eq(englishLessonsTable.bookId, lesson.bookId))
          .orderBy(asc(englishLessonsTable.lessonNumber));
        const idx = siblings.findIndex((s) => s.id === lessonId);
        if (idx > 0) prevLessonId = siblings[idx - 1]!.id;
        if (idx >= 0 && idx < siblings.length - 1)
          nextLessonId = siblings[idx + 1]!.id;
      }

      const [completionRow] = await db
        .select({ id: englishLessonCompletionsTable.id })
        .from(englishLessonCompletionsTable)
        .where(
          and(
            eq(englishLessonCompletionsTable.userId, userId),
            eq(englishLessonCompletionsTable.lessonId, lessonId),
          ),
        )
        .limit(1);

      res.json({
        lesson: {
          id: lesson.id,
          bookId: lesson.bookId,
          lessonNumber: lesson.lessonNumber,
          title: lesson.title,
          titleAr: lesson.titleAr,
          level: lesson.level,
          completed: !!completionRow,
        },
        sections: sections.map((s) => ({
          id: s.id,
          kind: s.kind,
          position: s.position,
          body: s.body,
          bodyAr: s.bodyAr,
          completed: completedKinds.has(s.kind),
        })),
        vocab,
        exercises: exercises.map((e) => ({
          id: e.id,
          type: e.type,
          prompt: e.prompt,
          promptAr: e.promptAr,
          payload: e.payload,
          xpReward: e.xpReward,
          // solution intentionally omitted client-side; scoring is server-side.
          completed: correctSet.has(e.id),
        })),
        prevLessonId,
        nextLessonId,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /english/curriculum/lessons/:lessonId/sections/:sectionId/complete
// ---------------------------------------------------------------------------
router.post(
  "/english/curriculum/lessons/:lessonId/sections/:sectionId/complete",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const lessonId = parseInt(String(req.params.lessonId), 10);
      const sectionId = parseInt(String(req.params.sectionId), 10);
      if (isNaN(lessonId) || isNaN(sectionId)) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      const [lesson] = await db
        .select()
        .from(englishLessonsTable)
        .where(eq(englishLessonsTable.id, lessonId))
        .limit(1);
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      const activeTiers = await getStudentActiveTiers(userId);
      if (
        activeTiers.length === 0 ||
        !canAccessEnglishLevel(activeTiers, lesson.level)
      ) {
        res.status(403).json({ error: "Tier not sufficient" });
        return;
      }

      const statusGate = await ensureLessonBookPublishedForStudent(
        userId,
        lesson.bookId,
      );
      if (statusGate !== true) {
        res.status(statusGate.httpStatus).json({ error: statusGate.error });
        return;
      }

      const [section] = await db
        .select()
        .from(englishLessonSectionsTable)
        .where(
          and(
            eq(englishLessonSectionsTable.id, sectionId),
            eq(englishLessonSectionsTable.lessonId, lessonId),
          ),
        )
        .limit(1);
      if (!section) {
        res.status(404).json({ error: "Section not found" });
        return;
      }

      const inserted = await db
        .insert(englishLessonSectionProgressTable)
        .values({
          userId,
          lessonId,
          kind: section.kind as EnglishLessonSectionKind,
        })
        .onConflictDoNothing()
        .returning({ id: englishLessonSectionProgressTable.id });

      let xpAwarded = 0;
      if (inserted.length > 0) {
        xpAwarded = CURRICULUM_XP_PER_SECTION;
        await db.insert(englishXpEventsTable).values({
          userId,
          source: "lesson_completed",
          amount: xpAwarded,
          level: lesson.level,
          refTable: "english_lesson_section_progress",
          refId: inserted[0]!.id,
          note: `section:${section.kind}`,
        });
      }

      // Compute new section progress count.
      const allKinds = await db
        .select({ kind: englishLessonSectionProgressTable.kind })
        .from(englishLessonSectionProgressTable)
        .where(
          and(
            eq(englishLessonSectionProgressTable.userId, userId),
            eq(englishLessonSectionProgressTable.lessonId, lessonId),
          ),
        );

      // F-1 / F-3: emit study event + bump daily-activity rollup so this
      // section appears in /english/me/study-time and DAU/WAU/MAU analytics.
      // Only on the first (newly-inserted) completion to avoid double counts.
      if (inserted.length > 0) {
        await recordCurriculumActivity(
          userId,
          lessonId,
          CURRICULUM_SECONDS_PER_SECTION,
          { xp: xpAwarded },
        );
      }

      res.json({
        ok: true,
        xpAwarded,
        sectionsCompleted: allKinds.length,
        sectionsTotal: ENGLISH_LESSON_SECTION_KINDS.length,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /english/curriculum/exercises/:exerciseId/attempt
//   Server-side scoring per exercise type. Awards XP only on the FIRST
//   correct attempt for that user+exercise.
// ---------------------------------------------------------------------------
const ExerciseAttemptBody = z.object({
  response: z.unknown(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
});

// Maps a UUID to a stable signed 32-bit integer suitable for the first key of
// pg_advisory_xact_lock(int, int). NOTE: Postgres ships two overloads only —
// pg_advisory_xact_lock(bigint) and pg_advisory_xact_lock(int, int). The
// (bigint, bigint) form does NOT exist. We use the (int, int) form so we can
// key by (user, ref) without packing.
function hashUuidToInt32(uuid: string): number {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  const buf = createHash("sha1").update(uuid).digest();
  // Read low 4 bytes as a signed Int32.
  return buf.readInt32BE(0);
}

function normalizeStr(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function scoreExercise(
  type: string,
  payload: unknown,
  solution: unknown,
  response: unknown,
): { isCorrect: boolean; score: number } {
  const sol = solution as Record<string, unknown> | null;
  const resp = response as Record<string, unknown> | null;
  if (!sol || typeof sol !== "object") {
    return { isCorrect: false, score: 0 };
  }
  switch (type) {
    case "mcq": {
      const correct = sol["correctIndex"] ?? sol["answerIndex"] ?? sol["index"];
      const got = (resp as { index?: unknown } | null)?.index;
      const ok = correct != null && Number(got) === Number(correct);
      return { isCorrect: ok, score: ok ? 100 : 0 };
    }
    case "fill_blank": {
      const correct = (sol["answer"] ?? sol["answers"]) as unknown;
      const acceptable = Array.isArray(correct)
        ? correct.map(normalizeStr)
        : [normalizeStr(correct)];
      const got = normalizeStr((resp as { answer?: unknown } | null)?.answer);
      const ok = got.length > 0 && acceptable.includes(got);
      return { isCorrect: ok, score: ok ? 100 : 0 };
    }
    case "matching": {
      // Require an exact bijection: the client must submit one entry per
      // required left key (no omissions, no duplicates), each pointing to
      // the correct right. This blocks attacks that repeat one correct pair
      // to inflate the count to `pairs.length`.
      const pairs = (sol["pairs"] as Array<{ left: string; right: string }>) ?? [];
      const got = (resp as { pairs?: Array<{ left: string; right: string }> } | null)?.pairs ?? [];
      if (!pairs.length) return { isCorrect: false, score: 0 };
      const expected = new Map(
        pairs.map((p) => [normalizeStr(p.left), normalizeStr(p.right)]),
      );
      const seenLeft = new Set<string>();
      let correct = 0;
      for (const g of got) {
        const lk = normalizeStr(g.left);
        if (!expected.has(lk)) continue;
        if (seenLeft.has(lk)) continue;
        seenLeft.add(lk);
        if (expected.get(lk) === normalizeStr(g.right)) correct++;
      }
      const pct = Math.round((correct / pairs.length) * 100);
      // Pass only when every required left key was answered correctly exactly
      // once (i.e. coverage matches and no duplicates short-circuited).
      return {
        isCorrect: correct === pairs.length && seenLeft.size === pairs.length,
        score: pct,
      };
    }
    case "sentence_build": {
      // Solution may carry either `sentence_en`/`sentence`/`answer` or an
      // ordered `tokens_ordered` list. Normalize whitespace+punctuation by
      // joining tokens with single spaces and lowercasing.
      const orderedTokens = sol["tokens_ordered"];
      let target = normalizeStr(
        sol["sentence_en"] ?? sol["sentence"] ?? sol["answer"],
      );
      if (!target && Array.isArray(orderedTokens)) {
        target = orderedTokens.map((t) => normalizeStr(t)).join(" ");
      }
      const respObj = resp as { tokens?: unknown; sentence?: unknown } | null;
      const got = Array.isArray(respObj?.tokens)
        ? (respObj!.tokens as unknown[]).map((t) => normalizeStr(t)).join(" ")
        : normalizeStr(respObj?.sentence);
      const ok = target.length > 0 && got === target;
      return { isCorrect: ok, score: ok ? 100 : 0 };
    }
    case "reading_check": {
      const correct = sol["correctIndex"] ?? sol["answerIndex"];
      const got = (resp as { index?: unknown } | null)?.index;
      const ok = correct != null && Number(got) === Number(correct);
      return { isCorrect: ok, score: ok ? 100 : 0 };
    }
    case "vocabulary_recall": {
      const correct = (sol["answer_en"] ??
        sol["answer"] ??
        sol["answers"]) as unknown;
      const acceptable = Array.isArray(correct)
        ? correct.map(normalizeStr)
        : [normalizeStr(correct)];
      const got = normalizeStr((resp as { answer?: unknown } | null)?.answer);
      const ok = got.length > 0 && acceptable.includes(got);
      return { isCorrect: ok, score: ok ? 100 : 0 };
    }
    default:
      return { isCorrect: false, score: 0 };
  }
}

router.post(
  "/english/curriculum/exercises/:exerciseId/attempt",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const exerciseId = parseInt(String(req.params.exerciseId), 10);
      if (isNaN(exerciseId)) {
        res.status(400).json({ error: "Invalid exercise id" });
        return;
      }
      const parsed = ExerciseAttemptBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }

      const [ex] = await db
        .select()
        .from(englishExercisesTable)
        .where(eq(englishExercisesTable.id, exerciseId))
        .limit(1);
      if (!ex || !ex.isActive) {
        res.status(404).json({ error: "Exercise not found" });
        return;
      }

      // Tier gate via parent lesson if present.
      if (ex.lessonId != null) {
        const [lesson] = await db
          .select({
            level: englishLessonsTable.level,
            bookId: englishLessonsTable.bookId,
          })
          .from(englishLessonsTable)
          .where(eq(englishLessonsTable.id, ex.lessonId))
          .limit(1);
        const activeTiers = await getStudentActiveTiers(userId);
        if (
          !lesson ||
          activeTiers.length === 0 ||
          !canAccessEnglishLevel(activeTiers, lesson.level)
        ) {
          res.status(403).json({ error: "Tier not sufficient" });
          return;
        }
        const statusGate = await ensureLessonBookPublishedForStudent(
          userId,
          lesson.bookId,
        );
        if (statusGate !== true) {
          res.status(statusGate.httpStatus).json({ error: statusGate.error });
          return;
        }
      }

      const { isCorrect, score } = scoreExercise(
        ex.type,
        ex.payload,
        ex.solution,
        parsed.data.response,
      );

      // Wrap the prior-correct check + attempt insert + XP ledger insert in a
      // single transaction guarded by a per-(user, exercise) advisory lock so
      // concurrent submissions cannot both observe `priorCorrect` as empty
      // and double-award the first-correct XP. Lock is released at txn end.
      const userLockKey = hashUuidToInt32(userId);
      const { xpAwarded, attemptId } = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(${userLockKey}::int, ${exerciseId}::int)`,
        );
        const [priorCorrect] = await tx
          .select({ id: englishExerciseAttemptsTable.id })
          .from(englishExerciseAttemptsTable)
          .where(
            and(
              eq(englishExerciseAttemptsTable.userId, userId),
              eq(englishExerciseAttemptsTable.exerciseId, exerciseId),
              eq(englishExerciseAttemptsTable.isCorrect, true),
            ),
          )
          .limit(1);
        const xp = isCorrect && !priorCorrect ? ex.xpReward : 0;
        const [inserted] = await tx
          .insert(englishExerciseAttemptsTable)
          .values({
            userId,
            exerciseId,
            level: ex.level,
            response: parsed.data.response as object,
            isCorrect,
            score,
            durationMs: parsed.data.durationMs ?? 0,
            xpAwarded: xp,
          })
          .returning({ id: englishExerciseAttemptsTable.id });
        if (xp > 0 && inserted) {
          await tx.insert(englishXpEventsTable).values({
            userId,
            source: "exercise_attempt",
            amount: xp,
            level: ex.level,
            refTable: "english_exercise_attempts",
            refId: inserted.id,
          });
        }
        return { xpAwarded: xp, attemptId: inserted?.id ?? null };
      });
      void attemptId;

      // F-1 / F-3: capture exercise wall-clock time. Gated on `xpAwarded > 0`
      // (== first correct attempt) so retries / replays cannot inflate study
      // time or DAU rollups — `english_study_events` has no uniqueness
      // constraint so an unguarded write would compound on every replay.
      // Cap defends against tab-left-open inflation on that single first
      // correct attempt. Lesson-id may be null for legacy free-floating
      // exercises; recordCurriculumActivity handles that.
      if (xpAwarded > 0) {
        const exerciseSeconds = Math.min(
          CURRICULUM_MAX_EXERCISE_SECONDS,
          Math.floor((parsed.data.durationMs ?? 0) / 1000),
        );
        await recordCurriculumActivity(
          userId,
          ex.lessonId,
          exerciseSeconds,
          { xp: xpAwarded },
        );
      }

      res.json({ ok: true, isCorrect, score, xpAwarded });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /english/curriculum/lessons/:lessonId/complete
//   Idempotent. Requires all 6 sections completed + all active exercises
//   answered correctly at least once. Awards lesson bonus XP only on first
//   completion (via onConflictDoNothing on lesson_completions).
// ---------------------------------------------------------------------------
router.post(
  "/english/curriculum/lessons/:lessonId/complete",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const lessonId = parseInt(String(req.params.lessonId), 10);
      if (isNaN(lessonId)) {
        res.status(400).json({ error: "Invalid lesson id" });
        return;
      }

      const [lesson] = await db
        .select()
        .from(englishLessonsTable)
        .where(eq(englishLessonsTable.id, lessonId))
        .limit(1);
      if (!lesson) {
        res.status(404).json({ error: "Lesson not found" });
        return;
      }
      const activeTiers = await getStudentActiveTiers(userId);
      if (
        activeTiers.length === 0 ||
        !canAccessEnglishLevel(activeTiers, lesson.level)
      ) {
        res.status(403).json({ error: "Tier not sufficient" });
        return;
      }

      const statusGate = await ensureLessonBookPublishedForStudent(
        userId,
        lesson.bookId,
      );
      if (statusGate !== true) {
        res.status(statusGate.httpStatus).json({ error: statusGate.error });
        return;
      }

      // Require all 6 section kinds completed.
      const sectionRows = await db
        .select({ kind: englishLessonSectionProgressTable.kind })
        .from(englishLessonSectionProgressTable)
        .where(
          and(
            eq(englishLessonSectionProgressTable.userId, userId),
            eq(englishLessonSectionProgressTable.lessonId, lessonId),
          ),
        );
      const haveKinds = new Set(sectionRows.map((s) => s.kind));
      const missingSections = ENGLISH_LESSON_SECTION_KINDS.filter(
        (k) => !haveKinds.has(k),
      );
      if (missingSections.length > 0) {
        res.status(409).json({
          error: "Sections incomplete",
          missingSections,
        });
        return;
      }

      const inserted = await db
        .insert(englishLessonCompletionsTable)
        .values({ userId, lessonId })
        .onConflictDoNothing()
        .returning({ id: englishLessonCompletionsTable.id });

      let xpAwarded = 0;
      if (inserted.length > 0) {
        xpAwarded = CURRICULUM_XP_LESSON_COMPLETE_BONUS;
        await db.insert(englishXpEventsTable).values({
          userId,
          source: "lesson_completed",
          amount: xpAwarded,
          level: lesson.level,
          refTable: "english_lesson_completions",
          refId: inserted[0]!.id,
          note: "curriculum_lesson_bonus",
        });
      }

      // F-1 / F-3: register lesson completion in study events + daily-activity.
      // F-2: re-evaluate achievements (`first_lesson`, `streak_*`, `xp_*`).
      // All best-effort — engagement must never fail the parent request.
      let newlyGranted: string[] = [];
      if (inserted.length > 0) {
        await recordCurriculumActivity(
          userId,
          lessonId,
          CURRICULUM_SECONDS_PER_LESSON_COMPLETE,
          { lessonsCompleted: 1, xp: xpAwarded },
        );
      }
      try {
        newlyGranted = await evaluateAchievements(userId);
      } catch {
        newlyGranted = [];
      }

      res.json({
        ok: true,
        xpAwarded,
        alreadyCompleted: inserted.length === 0,
        newlyGrantedAchievements: newlyGranted,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /english/curriculum/quizzes/:quizId
//   Locked unless the placement lesson has been completed.
// ---------------------------------------------------------------------------
router.get(
  "/english/curriculum/quizzes/:quizId",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const quizId = parseInt(String(req.params.quizId), 10);
      if (isNaN(quizId)) {
        res.status(400).json({ error: "Invalid quiz id" });
        return;
      }

      const [quiz] = await db
        .select()
        .from(englishQuizzesTable)
        .where(eq(englishQuizzesTable.id, quizId))
        .limit(1);
      if (!quiz) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }

      const [book] = await db
        .select()
        .from(englishBooksTable)
        .where(eq(englishBooksTable.id, quiz.bookId))
        .limit(1);
      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }
      const activeTiers = await getStudentActiveTiers(userId);
      if (!canAccessBookTier(activeTiers, book.tier)) {
        res.status(403).json({ error: "Tier not sufficient" });
        return;
      }

      const statusGate = await ensureBookPublishedForStudent(userId, book.status);
      if (statusGate !== true) {
        res.status(statusGate.httpStatus).json({ error: statusGate.error });
        return;
      }

      // Placement lesson must be completed.
      const [placement] = await db
        .select({ id: englishLessonsTable.id })
        .from(englishLessonsTable)
        .where(
          and(
            eq(englishLessonsTable.bookId, book.id),
            eq(englishLessonsTable.lessonNumber, quiz.placedAfterLesson),
          ),
        )
        .limit(1);
      let unlocked = false;
      if (placement) {
        const [done] = await db
          .select({ id: englishLessonCompletionsTable.id })
          .from(englishLessonCompletionsTable)
          .where(
            and(
              eq(englishLessonCompletionsTable.userId, userId),
              eq(englishLessonCompletionsTable.lessonId, placement.id),
            ),
          )
          .limit(1);
        unlocked = !!done;
      }
      if (!unlocked) {
        res.status(423).json({
          error: "Quiz locked",
          quiz: {
            id: quiz.id,
            bookId: quiz.bookId,
            quizNumber: quiz.quizNumber,
            placedAfterLesson: quiz.placedAfterLesson,
            title: quiz.title,
            titleAr: quiz.titleAr,
            passThresholdPct: quiz.passThresholdPct,
          },
          locked: true,
        });
        return;
      }

      const questions = await db
        .select()
        .from(englishQuizQuestionsTable)
        .where(eq(englishQuizQuestionsTable.quizId, quizId))
        .orderBy(asc(englishQuizQuestionsTable.position));

      const [bestPass] = await db
        .select({ id: englishQuizAttemptsTable.id })
        .from(englishQuizAttemptsTable)
        .where(
          and(
            eq(englishQuizAttemptsTable.userId, userId),
            eq(englishQuizAttemptsTable.quizId, quizId),
            eq(englishQuizAttemptsTable.passed, true),
          ),
        )
        .limit(1);

      res.json({
        quiz: {
          id: quiz.id,
          bookId: quiz.bookId,
          quizNumber: quiz.quizNumber,
          placedAfterLesson: quiz.placedAfterLesson,
          title: quiz.title,
          titleAr: quiz.titleAr,
          passThresholdPct: quiz.passThresholdPct,
          timeLimitSeconds: quiz.timeLimitSeconds,
          everPassed: !!bestPass,
        },
        questions: questions.map((q) => ({
          id: q.id,
          position: q.position,
          kind: q.kind,
          promptEn: q.promptEn,
          promptAr: q.promptAr,
          payload: q.payload,
          points: q.points,
          // solution intentionally omitted; scoring server-side.
        })),
        locked: false,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /english/curriculum/quizzes/:quizId/attempt
// ---------------------------------------------------------------------------
const QuizAttemptBody = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        response: z.unknown(),
      }),
    )
    .min(1),
});

function scoreQuizQuestion(
  kind: string,
  payload: unknown,
  solution: unknown,
  response: unknown,
): boolean {
  return scoreExercise(kind, payload, solution, response).isCorrect;
}

router.post(
  "/english/curriculum/quizzes/:quizId/attempt",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const quizId = parseInt(String(req.params.quizId), 10);
      if (isNaN(quizId)) {
        res.status(400).json({ error: "Invalid quiz id" });
        return;
      }
      const parsed = QuizAttemptBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }

      const [quiz] = await db
        .select()
        .from(englishQuizzesTable)
        .where(eq(englishQuizzesTable.id, quizId))
        .limit(1);
      if (!quiz) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }
      const [book] = await db
        .select()
        .from(englishBooksTable)
        .where(eq(englishBooksTable.id, quiz.bookId))
        .limit(1);
      if (!book) {
        res.status(404).json({ error: "Book not found" });
        return;
      }
      const activeTiers = await getStudentActiveTiers(userId);
      if (!canAccessBookTier(activeTiers, book.tier)) {
        res.status(403).json({ error: "Tier not sufficient" });
        return;
      }

      const statusGate = await ensureBookPublishedForStudent(userId, book.status);
      if (statusGate !== true) {
        res.status(statusGate.httpStatus).json({ error: statusGate.error });
        return;
      }

      // Placement gate.
      const [placement] = await db
        .select({ id: englishLessonsTable.id })
        .from(englishLessonsTable)
        .where(
          and(
            eq(englishLessonsTable.bookId, book.id),
            eq(englishLessonsTable.lessonNumber, quiz.placedAfterLesson),
          ),
        )
        .limit(1);
      if (!placement) {
        res.status(404).json({ error: "Placement lesson missing" });
        return;
      }
      const [done] = await db
        .select({ id: englishLessonCompletionsTable.id })
        .from(englishLessonCompletionsTable)
        .where(
          and(
            eq(englishLessonCompletionsTable.userId, userId),
            eq(englishLessonCompletionsTable.lessonId, placement.id),
          ),
        )
        .limit(1);
      if (!done) {
        res.status(423).json({ error: "Quiz locked" });
        return;
      }

      const questions = await db
        .select()
        .from(englishQuizQuestionsTable)
        .where(eq(englishQuizQuestionsTable.quizId, quizId))
        .orderBy(asc(englishQuizQuestionsTable.position));
      if (questions.length === 0) {
        res.status(404).json({ error: "Quiz has no questions" });
        return;
      }

      const responseMap = new Map(
        parsed.data.answers.map((a) => [a.questionId, a.response]),
      );

      // Wrap first-pass detection + attempt header + answers + XP ledger in a
      // single transaction guarded by a per-(user, quiz) advisory lock so two
      // concurrent passing submissions cannot both observe `bestPassBefore`
      // as empty and double-award the first-pass XP.
      const userLockKey = hashUuidToInt32(userId);
      const txResult = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(${userLockKey}::int, ${quizId}::int)`,
        );
        const [bestPassBefore] = await tx
          .select({ id: englishQuizAttemptsTable.id })
          .from(englishQuizAttemptsTable)
          .where(
            and(
              eq(englishQuizAttemptsTable.userId, userId),
              eq(englishQuizAttemptsTable.quizId, quizId),
              eq(englishQuizAttemptsTable.passed, true),
            ),
          )
          .limit(1);
        const wasFirstPassLocal = !bestPassBefore;

        const [attempt] = await tx
          .insert(englishQuizAttemptsTable)
          .values({
            userId,
            quizId,
            tierSnapshot: book.tier,
          })
          .returning({ id: englishQuizAttemptsTable.id });
        if (!attempt) throw new Error("attempt insert failed");

        let totalPoints = 0;
        let earnedPoints = 0;
        const answerRows: Array<{
          attemptId: number;
          questionId: number;
          response: object;
          isCorrect: boolean;
          pointsAwarded: number;
        }> = [];
        for (const q of questions) {
          totalPoints += q.points;
          const resp = responseMap.get(q.id) ?? {};
          const ok = scoreQuizQuestion(q.kind, q.payload, q.solution, resp);
          const pts = ok ? q.points : 0;
          earnedPoints += pts;
          answerRows.push({
            attemptId: attempt.id,
            questionId: q.id,
            response: (resp ?? {}) as object,
            isCorrect: ok,
            pointsAwarded: pts,
          });
        }
        if (answerRows.length > 0) {
          await tx.insert(englishQuizAnswersTable).values(answerRows);
        }

        const scorePctLocal = totalPoints > 0
          ? Math.round((earnedPoints / totalPoints) * 100)
          : 0;
        const passedLocal = scorePctLocal >= quiz.passThresholdPct;

        await tx
          .update(englishQuizAttemptsTable)
          .set({
            submittedAt: new Date(),
            scorePct: scorePctLocal,
            passed: passedLocal,
          })
          .where(eq(englishQuizAttemptsTable.id, attempt.id));

        let xpAwardedLocal = 0;
        if (passedLocal && wasFirstPassLocal) {
          xpAwardedLocal = CURRICULUM_XP_QUIZ_PASS;
          await tx.insert(englishXpEventsTable).values({
            userId,
            source: "lesson_completed",
            amount: xpAwardedLocal,
            level: null,
            refTable: "english_quiz_attempts",
            refId: attempt.id,
            note: "curriculum_quiz_pass",
          });
        }

        return {
          attemptId: attempt.id,
          scorePct: scorePctLocal,
          passed: passedLocal,
          xpAwarded: xpAwardedLocal,
          wasFirstPass: wasFirstPassLocal,
          answerRows,
        };
      });

      const { attemptId, scorePct, passed, xpAwarded, wasFirstPass, answerRows } =
        txResult;

      // F-1 / F-3: a quiz attempt is a real "session" — bump the daily
      // roll-up + study events. Gated on `wasFirstPass` (mirrors the XP
      // economic model: credit happens once, on first pass) so retries
      // and double-submits cannot inflate study time / DAU rollups —
      // `english_study_events` has no uniqueness constraint, so an
      // unguarded write would compound on every replay.
      // F-2: re-evaluate achievements, primarily for `xp_*` and
      // `streak_*` codes that move when a quiz is passed.
      if (wasFirstPass) {
        await recordCurriculumActivity(
          userId,
          placement.id,
          CURRICULUM_SECONDS_PER_QUIZ_ATTEMPT,
          { sessionsCompleted: 1, xp: xpAwarded },
        );
      }
      let newlyGranted: string[] = [];
      try {
        newlyGranted = await evaluateAchievements(userId);
      } catch {
        newlyGranted = [];
      }

      res.json({
        ok: true,
        attemptId,
        scorePct,
        passed,
        passThresholdPct: quiz.passThresholdPct,
        totalQuestions: questions.length,
        correctCount: answerRows.filter((a) => a.isCorrect).length,
        xpAwarded,
        firstPass: passed && wasFirstPass,
        newlyGrantedAchievements: newlyGranted,
        // Per-question correctness so the UI can show review.
        results: answerRows.map((a) => ({
          questionId: a.questionId,
          isCorrect: a.isCorrect,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /english/curriculum/me/resume
//   Returns the student's most recent in-progress lesson (if any), or the
//   first not-started lesson of their best tier's first book.
// ---------------------------------------------------------------------------
router.get(
  "/english/curriculum/me/resume",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      // Draft books must not appear in resume for non-admins (no XP leaks,
      // no surprise deep-links). Admins see everything for QA.
      const isAdmin = await isAdminUser(userId);
      const publishedFilter = isAdmin
        ? sql``
        : sql`AND b.status = 'published'`;

      // Latest section-progress restricted to curriculum lessons in
      // accessible books. Single SQL with the gate applied at the source.
      const lastRows = await db.execute<{
        lesson_id: number;
        book_id: number;
        lesson_number: number;
        completed: boolean;
      }>(sql`
        SELECT
          l.id          AS lesson_id,
          l.book_id     AS book_id,
          l.lesson_number AS lesson_number,
          EXISTS (
            SELECT 1 FROM english_lesson_completions c
            WHERE c.user_id = ${userId} AND c.lesson_id = l.id
          ) AS completed
        FROM english_lesson_section_progress p
        JOIN english_lessons l ON l.id = p.lesson_id
        JOIN english_books b   ON b.id = l.book_id
        WHERE p.user_id = ${userId}
          ${publishedFilter}
        ORDER BY p.completed_at DESC
        LIMIT 1
      `);
      const last = lastRows.rows[0];

      let resumeLessonId: number | null = null;
      let resumeBookId: number | null = null;
      let anchorBookId: number | null = null;
      let anchorLessonNumber: number | null = null;

      if (last) {
        anchorBookId = Number(last.book_id);
        anchorLessonNumber = Number(last.lesson_number);
        if (!last.completed) {
          resumeLessonId = Number(last.lesson_id);
          resumeBookId = anchorBookId;
        }
      }

      // F-4: if the latest section-progress lesson is itself completed (or
      // the student has no in-progress lesson at all but has completed at
      // least one), fall through to the next uncompleted lesson in the same
      // book — ordered by lesson_number — so the dashboard "Resume" card
      // doesn't disappear right after a lesson is finished. Same draft gate
      // applies so non-admins are never sent into a draft book.
      if (resumeLessonId == null && anchorBookId != null) {
        const nextRows = await db.execute<{
          id: number;
          book_id: number;
          lesson_number: number;
        }>(sql`
          SELECT l.id, l.book_id, l.lesson_number
          FROM english_lessons l
          JOIN english_books b ON b.id = l.book_id
          WHERE l.book_id = ${anchorBookId}
            ${publishedFilter}
            ${
              anchorLessonNumber != null
                ? sql`AND l.lesson_number > ${anchorLessonNumber}`
                : sql``
            }
            AND NOT EXISTS (
              SELECT 1 FROM english_lesson_completions c
              WHERE c.user_id = ${userId} AND c.lesson_id = l.id
            )
          ORDER BY l.lesson_number ASC
          LIMIT 1
        `);
        const next = nextRows.rows[0];
        if (next) {
          resumeLessonId = Number(next.id);
          resumeBookId = Number(next.book_id);
        }
      }
      res.json({ resumeLessonId, resumeBookId });
    } catch (err) {
      next(err);
    }
  },
);

// Kept exported for the routes index. Position constants exposed for the
// client without reaching into @workspace/db on the frontend.
export const ENGLISH_LESSON_SECTION_KIND_ORDER = ENGLISH_LESSON_SECTION_KINDS;
export const ENGLISH_LESSON_SECTION_POSITIONS = ENGLISH_LESSON_SECTION_POSITION;

export default router;
