// ============================================================================
// English vocabulary service — Phase E2.
//
// Thin DB layer between the route handlers and the new English-only tables
// (`english_word_progress`, `english_xp_events`, `words`, `english_enrollments`).
// Pure SRS math lives in `./english-srs.ts`; this file is the IO + XP wiring.
//
// Design rules (locked by Phase E2 brief):
//   * No reuse of legacy Mentor / IELTS / old-flashcards XP. Every XP write
//     here goes to `english_xp_events` with one of the English-only sources.
//   * Tier→level access uses the Phase E0 helper `getAllowedEnglishLevels`.
//   * The queue is package-aware: filters progress rows by snapshot `level`
//     (which was copied from `words.level` at first contact), and falls back
//     to never-seen words at allowed levels to give brand-new students a
//     non-empty starter queue.
// ============================================================================

import { and, eq, sql } from "drizzle-orm";
import {
  db,
  englishEnrollmentsTable,
  englishWordProgressTable,
  englishXpEventsTable,
  englishVocabAttemptLogTable,
  wordsTable,
  getAllowedEnglishLevels,
  type EnglishWordProgress,
  type EnglishXpSource,
  type Word,
} from "@workspace/db";
import {
  applyAttempt,
  applyManualMastered,
  applyManualNeedsReview,
  defaultProgress,
  VOCAB_XP_PER_CORRECT,
  VOCAB_XP_PER_FIRST_MASTERY,
  type SrsUpdate,
  type VocabAttemptResult,
} from "./english-srs";
import {
  evaluateAchievements,
  getProgressionSummary,
  recordDailyActivity,
  xpToLevel,
} from "./english-engagement-service";
import { computeEnglishStreakDays } from "./english-day";
import type { EnglishAchievementCode } from "@workspace/db";

// ---------------------------------------------------------------------------
// Tier resolution (English-only).
// Same shape as the local helper in routes/english-mentor.ts, intentionally
// duplicated to keep this phase's blast radius minimal. A future cleanup
// phase can dedupe both call sites into a single shared helper.
// ---------------------------------------------------------------------------
export async function getStudentActiveEnglishTiers(
  userId: string,
): Promise<string[]> {
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

// ---------------------------------------------------------------------------
// Daily review queue.
//
// Two-pass build:
//   1) DUE rows: existing progress where status != mastered AND
//      next_review_at IS NULL or <= now. Ranked by:
//        a) status priority — needs_review first, then learning, then review
//        b) consecutive_failures DESC — keep hitting failures hardest
//        c) strength ASC — weakest words bubble up
//        d) next_review_at ASC NULLS FIRST — most overdue first
//   2) COLD-START rows (only if pass 1 returned < limit): NEW words the
//      student has never seen, at allowed levels, oldest-id first (stable).
//
// Output is a unified shape with `progress` nullable for cold-start items,
// so the front-end can render "first time you see this word" differently.
// ---------------------------------------------------------------------------
export interface VocabQueueItem {
  word: Pick<
    Word,
    | "id"
    | "english"
    | "arabic"
    | "pos"
    | "level"
    | "sentenceEn"
    | "sentenceAr"
    | "audioWordPath"
    | "audioSentencePath"
  >;
  progress: Pick<
    EnglishWordProgress,
    | "status"
    | "strength"
    | "repetitions"
    | "consecutiveFailures"
    | "studiedCount"
    | "correctCount"
    | "incorrectCount"
    | "lastReviewedAt"
    | "lastFailedAt"
    | "nextReviewAt"
    | "masteredAt"
  > | null;
}

export interface VocabQueueResult {
  items: VocabQueueItem[];
  allowedLevels: string[];
  activeTiers: string[];
}

export async function buildVocabQueue(
  userId: string,
  limit: number,
  levelFilter: string | null,
): Promise<VocabQueueResult> {
  const activeTiers = await getStudentActiveEnglishTiers(userId);
  const allAllowed: string[] = [...getAllowedEnglishLevels(activeTiers)];
  const allowedLevels: string[] = levelFilter
    ? allAllowed.filter((l) => l === levelFilter)
    : allAllowed;

  if (allowedLevels.length === 0) {
    return { items: [], allowedLevels, activeTiers };
  }

  // Pass 1: due rows. We use raw SQL for the CASE ordering (cleanest in pg).
  const dueRows = await db.execute<{
    word_id: number;
    status: EnglishWordProgress["status"];
    strength: number;
    repetitions: number;
    consecutive_failures: number;
    studied_count: number;
    correct_count: number;
    incorrect_count: number;
    last_reviewed_at: Date | null;
    last_failed_at: Date | null;
    next_review_at: Date | null;
    mastered_at: Date | null;
    english: string;
    arabic: string | null;
    pos: string;
    word_level: string;
    sentence_en: string | null;
    sentence_ar: string | null;
    audio_word_path: string | null;
    audio_sentence_path: string | null;
  }>(sql`
    SELECT
      wp.word_id,
      wp.status,
      wp.strength,
      wp.repetitions,
      wp.consecutive_failures,
      wp.studied_count,
      wp.correct_count,
      wp.incorrect_count,
      wp.last_reviewed_at,
      wp.last_failed_at,
      wp.next_review_at,
      wp.mastered_at,
      w.english,
      w.arabic,
      w.pos,
      w.level AS word_level,
      w.sentence_en,
      w.sentence_ar,
      w.audio_word_path,
      w.audio_sentence_path
    FROM english_word_progress wp
    JOIN words w ON w.id = wp.word_id
    WHERE wp.user_id = ${userId}
      AND wp.level IN ${sql.raw(`(${allowedLevels.map((l) => `'${l}'`).join(",")})`)}
      AND wp.status <> 'mastered'
      AND (wp.next_review_at IS NULL OR wp.next_review_at <= now())
    ORDER BY
      CASE wp.status
        WHEN 'needs_review' THEN 0
        WHEN 'learning'     THEN 1
        WHEN 'review'       THEN 2
        ELSE 3
      END,
      wp.consecutive_failures DESC,
      wp.strength ASC,
      wp.next_review_at ASC NULLS FIRST
    LIMIT ${limit}
  `);

  const items: VocabQueueItem[] = dueRows.rows.map((r) => ({
    word: {
      id: r.word_id,
      english: r.english,
      arabic: r.arabic,
      pos: r.pos,
      level: r.word_level,
      sentenceEn: r.sentence_en,
      sentenceAr: r.sentence_ar,
      audioWordPath: r.audio_word_path,
      audioSentencePath: r.audio_sentence_path,
    },
    progress: {
      status: r.status,
      strength: r.strength,
      repetitions: r.repetitions,
      consecutiveFailures: r.consecutive_failures,
      studiedCount: r.studied_count,
      correctCount: r.correct_count,
      incorrectCount: r.incorrect_count,
      lastReviewedAt: r.last_reviewed_at,
      lastFailedAt: r.last_failed_at,
      nextReviewAt: r.next_review_at,
      masteredAt: r.mastered_at,
    },
  }));

  // Pass 2: cold-start NEW words to fill the queue.
  const remaining = limit - items.length;
  if (remaining > 0) {
    const newRows = await db.execute<{
      id: number;
      english: string;
      arabic: string | null;
      pos: string;
      level: string;
      sentence_en: string | null;
      sentence_ar: string | null;
      audio_word_path: string | null;
      audio_sentence_path: string | null;
    }>(sql`
      SELECT w.id, w.english, w.arabic, w.pos, w.level,
             w.sentence_en, w.sentence_ar,
             w.audio_word_path, w.audio_sentence_path
      FROM words w
      WHERE w.level IN ${sql.raw(`(${allowedLevels.map((l) => `'${l}'`).join(",")})`)}
        AND NOT EXISTS (
          SELECT 1 FROM english_word_progress wp
          WHERE wp.user_id = ${userId} AND wp.word_id = w.id
        )
      ORDER BY w.id
      LIMIT ${remaining}
    `);

    for (const r of newRows.rows) {
      items.push({
        word: {
          id: r.id,
          english: r.english,
          arabic: r.arabic,
          pos: r.pos,
          level: r.level,
          sentenceEn: r.sentence_en,
          sentenceAr: r.sentence_ar,
          audioWordPath: r.audio_word_path,
          audioSentencePath: r.audio_sentence_path,
        },
        progress: null,
      });
    }
  }

  return { items, allowedLevels, activeTiers };
}

// ---------------------------------------------------------------------------
// Internal: fetch progress (or null) for a (user, word) pair, plus the word
// row itself (to authorize by level + snapshot the level on first contact).
// ---------------------------------------------------------------------------
async function loadWordAndProgress(userId: string, wordId: number) {
  const [word] = await db
    .select()
    .from(wordsTable)
    .where(eq(wordsTable.id, wordId))
    .limit(1);
  if (!word) return { word: null as Word | null, progress: null };

  const [progress] = await db
    .select()
    .from(englishWordProgressTable)
    .where(
      and(
        eq(englishWordProgressTable.userId, userId),
        eq(englishWordProgressTable.wordId, wordId),
      ),
    )
    .limit(1);

  return { word, progress: progress ?? null };
}

async function writeXp(args: {
  userId: string;
  source: EnglishXpSource;
  amount: number;
  level: string | null;
  refTable: string | null;
  refId: number | null;
  note?: string | null;
}): Promise<void> {
  if (args.amount === 0) return;
  await db.insert(englishXpEventsTable).values({
    userId: args.userId,
    source: args.source,
    amount: args.amount,
    level: args.level,
    refTable: args.refTable,
    refId: args.refId,
    note: args.note ?? null,
  });
}

// Upsert progress row from an SrsUpdate. Returns the new row.
async function upsertProgress(
  userId: string,
  wordId: number,
  level: string,
  update: SrsUpdate,
): Promise<EnglishWordProgress> {
  const values = {
    userId,
    wordId,
    level,
    status: update.status,
    strength: update.strength,
    repetitions: update.repetitions,
    studiedCount: update.studiedCount,
    correctCount: update.correctCount,
    incorrectCount: update.incorrectCount,
    consecutiveFailures: update.consecutiveFailures,
    lastReviewedAt: update.lastReviewedAt,
    lastFailedAt: update.lastFailedAt,
    nextReviewAt: update.nextReviewAt,
    masteredAt: update.masteredAt,
  };

  const [row] = await db
    .insert(englishWordProgressTable)
    .values(values)
    .onConflictDoUpdate({
      target: [englishWordProgressTable.userId, englishWordProgressTable.wordId],
      set: {
        // NOTE: we deliberately do NOT overwrite `level` on update — the
        // initial snapshot is sticky (per Phase E1 design).
        status: values.status,
        strength: values.strength,
        repetitions: values.repetitions,
        studiedCount: values.studiedCount,
        correctCount: values.correctCount,
        incorrectCount: values.incorrectCount,
        consecutiveFailures: values.consecutiveFailures,
        lastReviewedAt: values.lastReviewedAt,
        lastFailedAt: values.lastFailedAt,
        nextReviewAt: values.nextReviewAt,
        masteredAt: values.masteredAt,
      },
    })
    .returning();
  return row!;
}

// ---------------------------------------------------------------------------
// Public service operations used by the route layer.
// All four return the new progress row + the XP awarded by THIS call (so the
// front-end can show "+2 XP" / "+25 XP" toasts).
// ---------------------------------------------------------------------------
export interface VocabOpResult {
  progress: EnglishWordProgress;
  xpAwarded: number;
  becameMastered: boolean;
  // Phase E5 — engagement payload, computed AFTER the XP write so the
  // values are always consistent with the just-recorded ledger row.
  newlyGranted: EnglishAchievementCode[];
  levelUp: { from: number; to: number } | null;
}

// Phase E5 helper — given the level *before* and the XP awarded by this
// op, compute (a) the level afterwards and (b) the level-up payload. Pure.
function deriveLevelUp(
  totalXpBefore: number,
  xpAwarded: number,
): { totalXpAfter: number; levelUp: { from: number; to: number } | null } {
  const totalXpAfter = totalXpBefore + xpAwarded;
  const from = xpToLevel(totalXpBefore);
  const to = xpToLevel(totalXpAfter);
  return {
    totalXpAfter,
    levelUp: to > from ? { from, to } : null,
  };
}

export type VocabOpError =
  | { kind: "word_not_found" }
  | { kind: "level_not_allowed"; allowedLevels: string[] };

async function resolveAndAuthorize(
  userId: string,
  wordId: number,
): Promise<
  | { ok: true; word: Word; progress: EnglishWordProgress | null; allowedLevels: string[] }
  | { ok: false; err: VocabOpError }
> {
  const { word, progress } = await loadWordAndProgress(userId, wordId);
  if (!word) return { ok: false, err: { kind: "word_not_found" } };
  const tiers = await getStudentActiveEnglishTiers(userId);
  const allowedLevels: string[] = [...getAllowedEnglishLevels(tiers)];
  if (!allowedLevels.includes(word.level)) {
    return { ok: false, err: { kind: "level_not_allowed", allowedLevels } };
  }
  return { ok: true, word, progress, allowedLevels };
}

export async function recordAttempt(
  userId: string,
  wordId: number,
  result: VocabAttemptResult,
): Promise<{ ok: true; data: VocabOpResult } | { ok: false; err: VocabOpError }> {
  const auth = await resolveAndAuthorize(userId, wordId);
  if (!auth.ok) return auth;

  const now = new Date();
  const current = auth.progress ?? defaultProgress();
  const update = applyAttempt({ current, now }, result);
  const newRow = await upsertProgress(userId, wordId, auth.word.level, update);

  // B-6 (Phase E5 stabilization) — log every attempt (correct or not) so
  // /english/me/sessions/complete can derive session integrity from
  // server-side data instead of trusting the client body.
  try {
    await db.insert(englishVocabAttemptLogTable).values({
      userId,
      wordId,
      wasCorrect: result === "correct",
    });
  } catch {
    // Non-blocking: a failure to log must never break a successful study
    // attempt. Worst case the next session-complete underestimates and
    // declines a "perfect" award.
  }

  // Snapshot total XP BEFORE writes so we can detect a level-up against
  // a clean baseline (the ledger inserts below would race a re-read).
  const totalXpBefore = await readTotalXp(userId);

  let xpAwarded = 0;
  if (result === "correct") {
    xpAwarded += VOCAB_XP_PER_CORRECT;
    await writeXp({
      userId,
      source: "vocab_attempt",
      amount: VOCAB_XP_PER_CORRECT,
      level: auth.word.level,
      refTable: "english_word_progress",
      refId: newRow.id,
    });
  }
  if (update.becameMastered) {
    xpAwarded += VOCAB_XP_PER_FIRST_MASTERY;
    await writeXp({
      userId,
      source: "word_mastered",
      amount: VOCAB_XP_PER_FIRST_MASTERY,
      level: auth.word.level,
      refTable: "english_word_progress",
      refId: newRow.id,
    });
  }

  const { levelUp } = deriveLevelUp(totalXpBefore, xpAwarded);

  // Phase E5 — daily activity rollup + achievement evaluation.
  // Both are best-effort and MUST NOT block the user-visible attempt result
  // if the engagement layer fails (it would otherwise convert a successful
  // study event into a 500). Errors are logged via the request-scoped
  // logger upstream; here we just swallow.
  await safeRecordDailyActivity(userId, {
    xp: xpAwarded,
    wordsStudied: 1,
    wordsCorrect: result === "correct" ? 1 : 0,
    wordsMastered: update.becameMastered ? 1 : 0,
  });
  const newlyGranted = await safeEvaluateAchievements(userId);

  return {
    ok: true,
    data: {
      progress: newRow,
      xpAwarded,
      becameMastered: update.becameMastered,
      newlyGranted,
      levelUp,
    },
  };
}

export async function markMastered(
  userId: string,
  wordId: number,
): Promise<{ ok: true; data: VocabOpResult } | { ok: false; err: VocabOpError }> {
  const auth = await resolveAndAuthorize(userId, wordId);
  if (!auth.ok) return auth;

  const now = new Date();
  const current = auth.progress ?? defaultProgress();
  const update = applyManualMastered(current, now);
  const newRow = await upsertProgress(userId, wordId, auth.word.level, update);

  const totalXpBefore = await readTotalXp(userId);

  let xpAwarded = 0;
  if (update.becameMastered) {
    xpAwarded = VOCAB_XP_PER_FIRST_MASTERY;
    await writeXp({
      userId,
      source: "word_mastered",
      amount: xpAwarded,
      level: auth.word.level,
      refTable: "english_word_progress",
      refId: newRow.id,
      note: "manual_mastered",
    });
  }

  const { levelUp } = deriveLevelUp(totalXpBefore, xpAwarded);
  await safeRecordDailyActivity(userId, {
    xp: xpAwarded,
    wordsMastered: update.becameMastered ? 1 : 0,
  });
  const newlyGranted = await safeEvaluateAchievements(userId);

  return {
    ok: true,
    data: {
      progress: newRow,
      xpAwarded,
      becameMastered: update.becameMastered,
      newlyGranted,
      levelUp,
    },
  };
}

export async function markNeedsReview(
  userId: string,
  wordId: number,
): Promise<{ ok: true; data: VocabOpResult } | { ok: false; err: VocabOpError }> {
  const auth = await resolveAndAuthorize(userId, wordId);
  if (!auth.ok) return auth;

  const now = new Date();
  const current = auth.progress ?? defaultProgress();
  const update = applyManualNeedsReview(current, now);
  const newRow = await upsertProgress(userId, wordId, auth.word.level, update);

  return {
    ok: true,
    data: {
      progress: newRow,
      xpAwarded: 0,
      becameMastered: false,
      newlyGranted: [],
      levelUp: null,
    },
  };
}

// ---------------------------------------------------------------------------
// Phase E5 — engagement helpers (best-effort, never throw upstream).
// ---------------------------------------------------------------------------
async function readTotalXp(userId: string): Promise<number> {
  const r = await db.execute<{ total: string | null }>(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS total
    FROM english_xp_events
    WHERE user_id = ${userId}
  `);
  return Number(r.rows[0]?.total ?? 0);
}

async function safeRecordDailyActivity(
  userId: string,
  delta: Parameters<typeof recordDailyActivity>[1],
): Promise<void> {
  try {
    await recordDailyActivity(userId, delta);
  } catch {
    // engagement layer is non-blocking by design
  }
}

async function safeEvaluateAchievements(
  userId: string,
  ctx?: Parameters<typeof evaluateAchievements>[1],
): Promise<EnglishAchievementCode[]> {
  try {
    return await evaluateAchievements(userId, ctx);
  } catch {
    return [];
  }
}

// Re-export so the lesson-complete route (and any future caller) can use the
// same idempotent, swallow-on-failure helpers without re-importing.
export {
  safeRecordDailyActivity as recordEngagementDailyActivity,
  safeEvaluateAchievements as evaluateEngagementAchievements,
  readTotalXp as readTotalEnglishXp,
  deriveLevelUp as deriveEnglishLevelUp,
};

// ---------------------------------------------------------------------------
// Progression passthrough — small wrapper so the routes layer never imports
// the engagement service directly (kept for forward-refactor flexibility).
// ---------------------------------------------------------------------------
export async function getProgressionForUser(userId: string) {
  return getProgressionSummary(userId);
}

// ---------------------------------------------------------------------------
// Stats endpoint backing.
// Returns counts by status, counts by level, total English XP (sum of all
// english_xp_events rows for the user), and the current daily streak in
// UTC days (consecutive days ending today with at least one XP event).
//
// Streak XP awards are NOT yet written here — that requires a daily cron
// (Phase E4). For now `streakDays` is a read-only derived value the dashboard
// can render directly.
// ---------------------------------------------------------------------------
export interface VocabStats {
  totalXp: number;
  xpByLevel: Array<{ level: string; xp: number }>;
  xpBySource: Array<{ source: string; xp: number }>;
  wordCounts: Array<{ status: EnglishWordProgress["status"]; count: number }>;
  wordCountsByLevel: Array<{
    level: string;
    status: EnglishWordProgress["status"];
    count: number;
  }>;
  streakDays: number;
}

export async function getVocabStats(userId: string): Promise<VocabStats> {
  const totalRows = await db.execute<{ total: string | null }>(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS total
    FROM english_xp_events
    WHERE user_id = ${userId}
  `);
  const totalXp = Number(totalRows.rows[0]?.total ?? 0);

  const byLevelRows = await db.execute<{ level: string | null; xp: string }>(sql`
    SELECT level, COALESCE(SUM(amount), 0)::text AS xp
    FROM english_xp_events
    WHERE user_id = ${userId}
    GROUP BY level
    ORDER BY level NULLS LAST
  `);
  const xpByLevel = byLevelRows.rows.map((r) => ({
    level: r.level ?? "unscoped",
    xp: Number(r.xp),
  }));

  const bySourceRows = await db.execute<{ source: string; xp: string }>(sql`
    SELECT source, COALESCE(SUM(amount), 0)::text AS xp
    FROM english_xp_events
    WHERE user_id = ${userId}
    GROUP BY source
    ORDER BY source
  `);
  const xpBySource = bySourceRows.rows.map((r) => ({
    source: r.source,
    xp: Number(r.xp),
  }));

  const statusRows = await db.execute<{
    status: EnglishWordProgress["status"];
    count: string;
  }>(sql`
    SELECT status, COUNT(*)::text AS count
    FROM english_word_progress
    WHERE user_id = ${userId}
    GROUP BY status
  `);
  const wordCounts = statusRows.rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }));

  const statusLevelRows = await db.execute<{
    level: string;
    status: EnglishWordProgress["status"];
    count: string;
  }>(sql`
    SELECT level, status, COUNT(*)::text AS count
    FROM english_word_progress
    WHERE user_id = ${userId}
    GROUP BY level, status
    ORDER BY level, status
  `);
  const wordCountsByLevel = statusLevelRows.rows.map((r) => ({
    level: r.level,
    status: r.status,
    count: Number(r.count),
  }));

  // B-4 + B-16: streak is the consecutive Asia/Riyadh civil days ending
  // today (or yesterday if no XP yet today) with at least one XP event,
  // computed by the shared helper.
  const streakDays = await computeEnglishStreakDays(userId);

  return {
    totalXp,
    xpByLevel,
    xpBySource,
    wordCounts,
    wordCountsByLevel,
    streakDays,
  };
}
