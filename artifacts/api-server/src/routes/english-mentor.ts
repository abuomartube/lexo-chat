import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  englishLessonsTable,
  englishLessonCompletionsTable,
  englishLessonProgressTable,
  englishStudyEventsTable,
  englishEnrollmentsTable,
  englishXpEventsTable,
  ENGLISH_TIER_VALUES,
  ENGLISH_CEFR_LEVELS,
  canAccessEnglishLevel,
  getAllowedEnglishLevels,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";
import { LESSON_XP_PER_FIRST_COMPLETION } from "../lib/english-srs";
import {
  deriveEnglishLevelUp,
  evaluateEngagementAchievements,
  readTotalEnglishXp,
  recordEngagementDailyActivity,
} from "../lib/english-vocab-service";

const router: IRouter = Router();

async function getStudentActiveTiers(userId: string): Promise<string[]> {
  const rows = await db
    .select({ tier: englishEnrollmentsTable.tier, expiresAt: englishEnrollmentsTable.expiresAt })
    .from(englishEnrollmentsTable)
    .where(
      and(
        eq(englishEnrollmentsTable.userId, userId),
        eq(englishEnrollmentsTable.status, "active"),
      ),
    );

  const now = new Date();
  const active = rows.filter((r) => !r.expiresAt || r.expiresAt > now);
  return [...new Set(active.map((r) => r.tier))];
}

async function getStudentBestTier(userId: string): Promise<string | null> {
  const tiers = await getStudentActiveTiers(userId);
  if (tiers.length === 0) return null;
  if (tiers.includes("advanced")) return "advanced";
  if (tiers.includes("intermediate")) return "intermediate";
  return "beginner";
}

// Phase E0: tier→level constants and helpers were consolidated into
// @workspace/db (`canAccessEnglishLevel`, `getAllowedEnglishLevels`).
// Local duplicates were removed.

async function resolveAndAuthorizeLesson(userId: string, lessonId: number) {
  const [lesson] = await db
    .select()
    .from(englishLessonsTable)
    .where(eq(englishLessonsTable.id, lessonId))
    .limit(1);
  if (!lesson) return { error: "not_found" as const, lesson: null, bestTier: null };
  const activeTiers = await getStudentActiveTiers(userId);
  const bestTier = await getStudentBestTier(userId);
  if (activeTiers.length === 0 || !canAccessEnglishLevel(activeTiers, lesson.level)) {
    return { error: "forbidden" as const, lesson, bestTier };
  }
  return { error: null, lesson, bestTier };
}

router.get("/english/mentor/lessons", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    const bestTier = await getStudentBestTier(userId);

    const allowedLevels = getAllowedEnglishLevels(activeTiers);

    const allLessons = await db
      .select()
      .from(englishLessonsTable)
      .orderBy(asc(englishLessonsTable.sortOrder), asc(englishLessonsTable.createdAt));

    const completions = await db
      .select({ lessonId: englishLessonCompletionsTable.lessonId })
      .from(englishLessonCompletionsTable)
      .where(eq(englishLessonCompletionsTable.userId, userId));

    const progressRows = await db
      .select()
      .from(englishLessonProgressTable)
      .where(eq(englishLessonProgressTable.userId, userId));

    const completedSet = new Set(completions.map((c) => c.lessonId));
    const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

    const lessons = allLessons.map((l) => {
      const locked = activeTiers.length === 0 || !canAccessEnglishLevel(activeTiers, l.level);
      return {
        id: l.id,
        title: l.title,
        titleAr: l.titleAr,
        vimeoUrl: locked ? "" : l.vimeoUrl,
        tier: l.tier,
        level: l.level,
        sortOrder: l.sortOrder,
        locked,
        completed: completedSet.has(l.id),
        progress: locked ? null : (progressMap.get(l.id) ?? null),
      };
    });

    res.json({ lessons, bestTier, allowedLevels });
  } catch (err) {
    next(err);
  }
});

router.post("/english/mentor/lessons/:id/progress", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const lessonId = parseInt(String(req.params.id), 10);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: "Invalid lesson ID" });
      return;
    }

    const auth = await resolveAndAuthorizeLesson(userId, lessonId);
    if (auth.error === "not_found") {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    if (auth.error === "forbidden") {
      res.status(403).json({ error: "Tier not sufficient for this lesson" });
      return;
    }

    const schema = z.object({
      watchedSeconds: z.number().int().min(0),
      durationSeconds: z.number().int().min(0),
      lastPositionSeconds: z.number().int().min(0),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const { watchedSeconds, durationSeconds, lastPositionSeconds } = parsed.data;

    // B-14 (Phase E5 stabilization) — record the per-write delta atomically
    // so /english/me/study-time aggregates exact seconds-per-day. The
    // pre-read + upsert + insert-event sequence is wrapped in a single
    // transaction and the existing progress row is locked with FOR UPDATE
    // so two concurrent progress writes on the same (user, lesson) cannot
    // both observe the same `priorWatched` and double-count the delta.
    let deltaSeconds = 0;
    await db.transaction(async (tx) => {
      const [prior] = await tx.execute<{ watched_seconds: number }>(sql`
        SELECT watched_seconds
        FROM english_lesson_progress
        WHERE user_id = ${userId} AND lesson_id = ${lessonId}
        FOR UPDATE
      `).then((r) => r.rows);
      const priorWatched = Number(prior?.watched_seconds ?? 0);
      deltaSeconds = Math.max(0, watchedSeconds - priorWatched);

      await tx
        .insert(englishLessonProgressTable)
        .values({ userId, lessonId, watchedSeconds, durationSeconds, lastPositionSeconds })
        .onConflictDoUpdate({
          target: [englishLessonProgressTable.userId, englishLessonProgressTable.lessonId],
          set: {
            watchedSeconds: sql`GREATEST(${englishLessonProgressTable.watchedSeconds}, ${watchedSeconds})`,
            durationSeconds: sql`GREATEST(${englishLessonProgressTable.durationSeconds}, ${durationSeconds})`,
            lastPositionSeconds: sql`${lastPositionSeconds}`,
            updatedAt: sql`now()`,
          },
        });

      if (deltaSeconds > 0) {
        // Cap an absurdly large single delta (e.g. a player sending the full
        // lesson length on first ping) to a reasonable upper bound so a
        // misbehaving client can't poison the daily aggregate.
        const safeDelta = Math.min(deltaSeconds, 60 * 60); // 1h hard cap per write
        await tx.insert(englishStudyEventsTable).values({
          userId,
          lessonId,
          deltaSeconds: safeDelta,
        });
      }
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/english/mentor/lessons/:id/complete", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const lessonId = parseInt(String(req.params.id), 10);
    if (isNaN(lessonId)) {
      res.status(400).json({ error: "Invalid lesson ID" });
      return;
    }

    const auth = await resolveAndAuthorizeLesson(userId, lessonId);
    if (auth.error === "not_found") {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    if (auth.error === "forbidden") {
      res.status(403).json({ error: "Tier not sufficient for this lesson" });
      return;
    }

    // Phase E2 — lesson completion is one of the four English XP sources
    // (vocab study, mastered word, lesson completion, daily streak).
    // `onConflictDoNothing().returning()` returns the inserted row ONLY on a
    // genuine insert; on conflict (already completed) it returns []. We use
    // that to make the XP award naturally idempotent — re-completing the
    // same lesson never double-awards.
    const insertedCompletions = await db
      .insert(englishLessonCompletionsTable)
      .values({ userId, lessonId })
      .onConflictDoNothing()
      .returning({ id: englishLessonCompletionsTable.id });

    let xpAwarded = 0;
    let levelUp: { from: number; to: number } | null = null;
    let newlyGranted: string[] = [];
    if (insertedCompletions.length > 0) {
      // Snapshot total XP BEFORE the ledger write so level-up is detected
      // against a clean baseline.
      const totalXpBefore = await readTotalEnglishXp(userId);
      xpAwarded = LESSON_XP_PER_FIRST_COMPLETION;
      await db.insert(englishXpEventsTable).values({
        userId,
        source: "lesson_completed",
        amount: xpAwarded,
        level: auth.lesson!.level,
        refTable: "english_lesson_completions",
        refId: insertedCompletions[0]!.id,
      });
      ({ levelUp } = deriveEnglishLevelUp(totalXpBefore, xpAwarded));
      // Phase E5 — engagement (best-effort, non-blocking).
      await recordEngagementDailyActivity(userId, {
        xp: xpAwarded,
        lessonsCompleted: 1,
      });
      newlyGranted = await evaluateEngagementAchievements(userId);
    }

    res.json({ ok: true, xpAwarded, levelUp, newlyGranted });
  } catch (err) {
    next(err);
  }
});

router.get("/english/mentor/tier-info", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const bestTier = await getStudentBestTier(userId);
    res.json({ bestTier, tiers: ENGLISH_TIER_VALUES });
  } catch (err) {
    next(err);
  }
});

const AdminLessonCreateBody = z.object({
  title: z.string().trim().min(1).max(255),
  titleAr: z.string().max(255).optional().nullable(),
  vimeoUrl: z.string().max(512).optional().default(""),
  tier: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner"),
  level: z.enum(ENGLISH_CEFR_LEVELS).optional().default("A1"),
  sortOrder: z.number().int().optional().default(0),
});

const AdminLessonUpdateBody = z.object({
  title: z.string().trim().min(1).max(255),
  titleAr: z.string().max(255).optional().nullable(),
  vimeoUrl: z.string().max(512).optional(),
  tier: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  level: z.enum(ENGLISH_CEFR_LEVELS).optional(),
  sortOrder: z.number().int().optional(),
});

router.get("/admin/english/mentor/lessons", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(englishLessonsTable)
      .orderBy(asc(englishLessonsTable.sortOrder), asc(englishLessonsTable.createdAt));
    res.json({ lessons: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/english/mentor/lessons", requireAdmin, async (req, res, next) => {
  try {
    const parsed = AdminLessonCreateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
      return;
    }
    const [row] = await db
      .insert(englishLessonsTable)
      .values(parsed.data)
      .returning();
    res.status(201).json({ lesson: row });
  } catch (err) {
    next(err);
  }
});

router.put("/admin/english/mentor/lessons/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const parsed = AdminLessonUpdateBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.titleAr !== undefined) updates.titleAr = parsed.data.titleAr;
    if (parsed.data.vimeoUrl !== undefined) updates.vimeoUrl = parsed.data.vimeoUrl;
    if (parsed.data.tier !== undefined) updates.tier = parsed.data.tier;
    if (parsed.data.level !== undefined) updates.level = parsed.data.level;
    if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;
    const [row] = await db
      .update(englishLessonsTable)
      .set(updates)
      .where(eq(englishLessonsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    res.json({ lesson: row });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/english/mentor/lessons/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(englishLessonsTable).where(eq(englishLessonsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
