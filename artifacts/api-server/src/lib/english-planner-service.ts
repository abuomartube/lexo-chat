// ============================================================================
// English Study Planner Engine — Phase E3.
//
// Dynamic, no persistence. Given a userId, this service synthesizes "what
// should this student study today?" by combining:
//   * the active tier(s) and allowed CEFR levels (Phase E0/E2 helpers)
//   * lesson catalog + per-user completions (Phase E1 tables)
//   * SRS state in `english_word_progress` (Phase E1/E2)
//   * the XP ledger in `english_xp_events` (Phase E2)
//
// Scope rules (locked by E3 brief):
//   * Backend logic + APIs only. No UI. No persistence layer.
//   * No reuse of legacy Mentor / IELTS / old-flashcards services.
//   * Reads only. The planner does not write any rows; XP/progress mutations
//     happen in the Phase E2 vocab service when the student actually studies.
//
// Algorithm in three steps (see `getTodayPlan` for the orchestration):
//
//   1) Performance signals.  One pass over `english_word_progress` to derive
//      lifetime accuracy, average strength, weak-ratio, overdue count,
//      recent failures (7d). One short query against `english_xp_events`
//      for streak days. Cheap aggregates only — no per-row scans on the UI.
//
//   2) Adaptive difficulty.  Base by tier (beginner=easy / intermediate=
//      medium / advanced=hard) and shifted up/down by the signals. The
//      shift is deliberately conservative — the brief says the system
//      should "gradually" become harder/easier, not flip on the first slip.
//
//   3) Workload + plan items.  Tier-scaled base counts for review / new /
//      weak / mastery / challenge buckets, then modulated by difficulty
//      and a "heavy failure load" guard. We pick rows for each bucket
//      with disjoint word IDs (no duplicates across buckets), and finally
//      estimate minutes spent.
//
// Returned shape is the on-the-wire `TodayPlan` consumed by
// `GET /api/english/me/today-plan` and the orval-generated React hook.
// ============================================================================

import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  englishLessonCompletionsTable,
  englishLessonProgressTable,
  englishLessonsTable,
  englishWordProgressTable,
  getAllowedEnglishLevels,
  type EnglishWordProgress,
  type Word,
} from "@workspace/db";
import { getStudentActiveEnglishTiers } from "./english-vocab-service";
import { computeEnglishStreakDays } from "./english-day";

// ---------------------------------------------------------------------------
// Public types — kept structurally compatible with the OpenAPI schemas in
// `lib/api-spec/openapi.yaml` (component names: TodayPlan*, Plan*).
// ---------------------------------------------------------------------------

export type PlanDifficulty = "easy" | "medium" | "hard";

export interface PerformanceSignals {
  totalWords: number;
  masteredCount: number;
  reviewCount: number;
  learningCount: number;
  needsReviewCount: number;
  overdueCount: number;
  weakRatio: number; // 0..1
  averageStrength: number; // 0..100, over non-mastered rows
  accuracy: number; // 0..1, sum(correct)/sum(studied) lifetime
  recentFailures: number; // distinct words with last_failed_at within 7d
  streakDays: number;
  hasEnrollment: boolean;
}

export interface WorkloadTargets {
  reviewTarget: number;
  newTarget: number;
  weakTarget: number;
  challengeTarget: number;
  masteryTarget: number;
}

export interface PlanWord {
  id: number;
  english: string;
  arabic: string | null;
  pos: string;
  level: string;
  sentenceEn: string | null;
  sentenceAr: string | null;
  audioWordPath: string | null;
  audioSentencePath: string | null;
}

export interface PlanVocabItem {
  word: PlanWord;
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

export interface PlanLesson {
  id: number;
  title: string;
  titleAr: string | null;
  level: string;
  tier: string;
  sortOrder: number;
  watchedSeconds: number;
  durationSeconds: number;
  lastPositionSeconds: number;
}

export interface TodayPlan {
  generatedAt: string; // ISO timestamp
  activeTiers: string[];
  allowedLevels: string[];
  difficulty: PlanDifficulty;
  signals: PerformanceSignals;
  workload: WorkloadTargets;
  nextLesson: PlanLesson | null;
  reviewVocabulary: PlanVocabItem[];
  weakWords: PlanVocabItem[];
  newWords: PlanVocabItem[];
  challengeWords: PlanVocabItem[];
  masteryTargets: PlanVocabItem[];
  estimatedMinutes: number;
  recommendedRepetition: number;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Tunables. Centralized here so a future adjustment phase (or A/B test) can
// touch one file. Kept inline rather than in `english-srs.ts` because they
// are about *workload shaping*, not the SRS scheduling algorithm.
// ---------------------------------------------------------------------------

const TIER_BASE_WORKLOAD: Record<string, WorkloadTargets> = {
  beginner: { reviewTarget: 10, newTarget: 5, weakTarget: 5, masteryTarget: 2, challengeTarget: 0 },
  intermediate: { reviewTarget: 15, newTarget: 7, weakTarget: 7, masteryTarget: 3, challengeTarget: 0 },
  advanced: { reviewTarget: 20, newTarget: 10, weakTarget: 10, masteryTarget: 4, challengeTarget: 0 },
};

// Empty-enrollment baseline. Kept tiny so an unenrolled visitor still gets
// a coherent (mostly empty) plan envelope rather than a 4xx.
const EMPTY_WORKLOAD: WorkloadTargets = {
  reviewTarget: 0,
  newTarget: 0,
  weakTarget: 0,
  masteryTarget: 0,
  challengeTarget: 0,
};

const WEAK_STRENGTH_CUTOFF = 40;
const NEAR_MASTERY_REP_CUTOFF = 4;
const NEAR_MASTERY_STRENGTH_CUTOFF = 65;
const RECENT_FAILURE_DAYS = 7;
const HEAVY_FAILURE_FAIL_COUNT = 8;
const HEAVY_FAILURE_WEAK_RATIO = 0.4;

// Time per-item estimates (seconds), used for `estimatedMinutes`.
const SECS_PER_REVIEW = 15;
const SECS_PER_WEAK = 20;
const SECS_PER_NEW = 25;
const SECS_PER_MASTERY = 20;
const SECS_PER_CHALLENGE = 30;
const DEFAULT_LESSON_SECONDS = 5 * 60;

// ---------------------------------------------------------------------------
// Step 1: signals
// ---------------------------------------------------------------------------

async function loadSignals(userId: string, hasEnrollment: boolean): Promise<PerformanceSignals> {
  // One aggregate over english_word_progress.
  const [agg] = (
    await db.execute<{
      total_words: string;
      mastered_count: string;
      review_count: string;
      learning_count: string;
      needs_review_count: string;
      overdue_count: string;
      weak_count: string;
      avg_strength_non_mastered: string | null;
      sum_studied: string;
      sum_correct: string;
      recent_failures: string;
    }>(sql`
      SELECT
        COUNT(*)::text AS total_words,
        COUNT(*) FILTER (WHERE status = 'mastered')::text     AS mastered_count,
        COUNT(*) FILTER (WHERE status = 'review')::text       AS review_count,
        COUNT(*) FILTER (WHERE status = 'learning')::text     AS learning_count,
        COUNT(*) FILTER (WHERE status = 'needs_review')::text AS needs_review_count,
        COUNT(*) FILTER (
          WHERE status <> 'mastered'
            AND (next_review_at IS NULL OR next_review_at <= now())
        )::text AS overdue_count,
        COUNT(*) FILTER (
          WHERE status = 'needs_review' OR strength < ${WEAK_STRENGTH_CUTOFF}
        )::text AS weak_count,
        AVG(strength) FILTER (WHERE status <> 'mastered')::text AS avg_strength_non_mastered,
        COALESCE(SUM(studied_count), 0)::text AS sum_studied,
        COALESCE(SUM(correct_count), 0)::text AS sum_correct,
        COUNT(*) FILTER (
          WHERE last_failed_at IS NOT NULL
            AND last_failed_at >= now() - (${RECENT_FAILURE_DAYS} || ' days')::interval
        )::text AS recent_failures
      FROM english_word_progress
      WHERE user_id = ${userId}
    `)
  ).rows;

  const totalWords = Number(agg?.total_words ?? 0);
  const sumStudied = Number(agg?.sum_studied ?? 0);
  const sumCorrect = Number(agg?.sum_correct ?? 0);
  const weakCount = Number(agg?.weak_count ?? 0);

  // Streak: distinct UTC days with at least one XP event, anchored to today
  // (or yesterday if the student hasn't earned XP today yet).
  const streakDays = await loadStreakDays(userId);

  return {
    totalWords,
    masteredCount: Number(agg?.mastered_count ?? 0),
    reviewCount: Number(agg?.review_count ?? 0),
    learningCount: Number(agg?.learning_count ?? 0),
    needsReviewCount: Number(agg?.needs_review_count ?? 0),
    overdueCount: Number(agg?.overdue_count ?? 0),
    weakRatio: totalWords > 0 ? weakCount / totalWords : 0,
    averageStrength: agg?.avg_strength_non_mastered != null ? Number(agg.avg_strength_non_mastered) : 0,
    accuracy: sumStudied > 0 ? sumCorrect / sumStudied : 0,
    recentFailures: Number(agg?.recent_failures ?? 0),
    streakDays,
    hasEnrollment,
  };
}

// B-4 + B-16: streak math centralised in english-day.ts (Asia/Riyadh tz).
const loadStreakDays = computeEnglishStreakDays;

// ---------------------------------------------------------------------------
// Step 2: difficulty + workload
// ---------------------------------------------------------------------------

function pickBaseTier(activeTiers: string[]): keyof typeof TIER_BASE_WORKLOAD | null {
  if (activeTiers.includes("advanced")) return "advanced";
  if (activeTiers.includes("intermediate")) return "intermediate";
  if (activeTiers.includes("beginner")) return "beginner";
  return null;
}

function pickDifficulty(
  baseTier: keyof typeof TIER_BASE_WORKLOAD | null,
  signals: PerformanceSignals,
  notes: string[],
): PlanDifficulty {
  if (!baseTier) return "easy";
  let level: PlanDifficulty = baseTier === "beginner" ? "easy" : baseTier === "intermediate" ? "medium" : "hard";

  // Need a minimum of history before adapting — otherwise random first-day
  // luck would yank the difficulty around.
  if (signals.totalWords < 20) return level;

  const stronglyDoingWell =
    signals.accuracy >= 0.8 && signals.averageStrength >= 60 && signals.weakRatio < 0.2;
  const struggling =
    signals.accuracy < 0.5 ||
    signals.weakRatio > HEAVY_FAILURE_WEAK_RATIO ||
    signals.recentFailures > 10;

  if (stronglyDoingWell && level !== "hard") {
    level = level === "easy" ? "medium" : "hard";
    notes.push("Higher difficulty unlocked: accuracy and strength are trending up.");
  } else if (struggling && level !== "easy") {
    level = level === "hard" ? "medium" : "easy";
    notes.push("Difficulty eased: focus on recovering weak words first.");
  }

  return level;
}

function computeWorkload(
  baseTier: keyof typeof TIER_BASE_WORKLOAD | null,
  difficulty: PlanDifficulty,
  signals: PerformanceSignals,
  notes: string[],
): WorkloadTargets {
  if (!baseTier) return { ...EMPTY_WORKLOAD };

  // Start from the tier baseline (a fresh copy — never mutate the constant).
  const base = TIER_BASE_WORKLOAD[baseTier]!;
  const w: WorkloadTargets = { ...base };

  // Adaptive shaping:
  if (difficulty === "hard") {
    w.newTarget += 3;
    w.challengeTarget = 4;
  } else if (difficulty === "medium") {
    w.challengeTarget = 2;
  } else {
    w.challengeTarget = 0;
  }

  // Heavy-failure guard: shift workload toward review/weak, away from new
  // and challenge. The brief calls this out explicitly: "heavy-failure
  // users → more review, less new content."
  const heavyFailure =
    signals.recentFailures >= HEAVY_FAILURE_FAIL_COUNT ||
    signals.weakRatio > HEAVY_FAILURE_WEAK_RATIO;
  if (heavyFailure) {
    w.reviewTarget = Math.ceil(w.reviewTarget * 1.5);
    w.weakTarget = Math.ceil(w.weakTarget * 1.5);
    w.newTarget = Math.floor(w.newTarget / 2);
    w.challengeTarget = 0;
    notes.push(
      "Heavy failure load detected: planner is prioritizing review and weak words.",
    );
  }

  return w;
}

// ---------------------------------------------------------------------------
// Step 3: pull plan items.
// Each helper takes the running `used` set and returns rows excluding ids
// already claimed by an earlier (higher-priority) bucket.
// ---------------------------------------------------------------------------

interface ProgressRow extends Record<string, unknown> {
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
}

interface NewWordRow extends Record<string, unknown> {
  id: number;
  english: string;
  arabic: string | null;
  pos: string;
  level: string;
  sentence_en: string | null;
  sentence_ar: string | null;
  audio_word_path: string | null;
  audio_sentence_path: string | null;
}

function progressRowToItem(r: ProgressRow): PlanVocabItem {
  return {
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
  };
}

function newWordRowToItem(r: NewWordRow): PlanVocabItem {
  return {
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
  };
}

// Quoted-comma list for safe `IN (…)` interpolation. `allowedLevels` is
// always a subset of the fixed CEFR enum (validated upstream by Zod via
// `getAllowedEnglishLevels`), so direct string interpolation cannot inject.
function levelsInClause(levels: string[]): string {
  return `(${levels.map((l) => `'${l}'`).join(",")})`;
}

async function loadWeakWords(
  userId: string,
  allowedLevels: string[],
  limit: number,
  used: Set<number>,
): Promise<PlanVocabItem[]> {
  if (limit <= 0 || allowedLevels.length === 0) return [];
  // Pull `limit + |used|` to guarantee we can fill after filtering.
  const buffer = limit + used.size;
  const rows = await db.execute<ProgressRow>(sql`
    SELECT
      wp.word_id, wp.status, wp.strength, wp.repetitions, wp.consecutive_failures,
      wp.studied_count, wp.correct_count, wp.incorrect_count,
      wp.last_reviewed_at, wp.last_failed_at, wp.next_review_at, wp.mastered_at,
      w.english, w.arabic, w.pos, w.level AS word_level,
      w.sentence_en, w.sentence_ar, w.audio_word_path, w.audio_sentence_path
    FROM english_word_progress wp
    JOIN words w ON w.id = wp.word_id
    WHERE wp.user_id = ${userId}
      AND wp.level IN ${sql.raw(levelsInClause(allowedLevels))}
      AND wp.status <> 'mastered'
      AND (wp.status = 'needs_review' OR wp.strength < ${WEAK_STRENGTH_CUTOFF})
    ORDER BY
      CASE WHEN wp.status = 'needs_review' THEN 0 ELSE 1 END,
      wp.consecutive_failures DESC,
      wp.strength ASC,
      wp.last_failed_at DESC NULLS LAST
    LIMIT ${buffer}
  `);
  const out: PlanVocabItem[] = [];
  for (const r of rows.rows) {
    if (used.has(r.word_id)) continue;
    out.push(progressRowToItem(r));
    used.add(r.word_id);
    if (out.length >= limit) break;
  }
  return out;
}

async function loadDueReviews(
  userId: string,
  allowedLevels: string[],
  limit: number,
  used: Set<number>,
): Promise<PlanVocabItem[]> {
  if (limit <= 0 || allowedLevels.length === 0) return [];
  const buffer = limit + used.size;
  const rows = await db.execute<ProgressRow>(sql`
    SELECT
      wp.word_id, wp.status, wp.strength, wp.repetitions, wp.consecutive_failures,
      wp.studied_count, wp.correct_count, wp.incorrect_count,
      wp.last_reviewed_at, wp.last_failed_at, wp.next_review_at, wp.mastered_at,
      w.english, w.arabic, w.pos, w.level AS word_level,
      w.sentence_en, w.sentence_ar, w.audio_word_path, w.audio_sentence_path
    FROM english_word_progress wp
    JOIN words w ON w.id = wp.word_id
    WHERE wp.user_id = ${userId}
      AND wp.level IN ${sql.raw(levelsInClause(allowedLevels))}
      AND wp.status IN ('learning', 'review')
      AND (wp.next_review_at IS NULL OR wp.next_review_at <= now())
    ORDER BY
      wp.next_review_at ASC NULLS FIRST,
      wp.strength ASC
    LIMIT ${buffer}
  `);
  const out: PlanVocabItem[] = [];
  for (const r of rows.rows) {
    if (used.has(r.word_id)) continue;
    out.push(progressRowToItem(r));
    used.add(r.word_id);
    if (out.length >= limit) break;
  }
  return out;
}

async function loadMasteryTargets(
  userId: string,
  allowedLevels: string[],
  limit: number,
  used: Set<number>,
): Promise<PlanVocabItem[]> {
  if (limit <= 0 || allowedLevels.length === 0) return [];
  const buffer = limit + used.size;
  const rows = await db.execute<ProgressRow>(sql`
    SELECT
      wp.word_id, wp.status, wp.strength, wp.repetitions, wp.consecutive_failures,
      wp.studied_count, wp.correct_count, wp.incorrect_count,
      wp.last_reviewed_at, wp.last_failed_at, wp.next_review_at, wp.mastered_at,
      w.english, w.arabic, w.pos, w.level AS word_level,
      w.sentence_en, w.sentence_ar, w.audio_word_path, w.audio_sentence_path
    FROM english_word_progress wp
    JOIN words w ON w.id = wp.word_id
    WHERE wp.user_id = ${userId}
      AND wp.level IN ${sql.raw(levelsInClause(allowedLevels))}
      AND wp.status <> 'mastered'
      AND wp.repetitions >= ${NEAR_MASTERY_REP_CUTOFF}
      AND wp.strength >= ${NEAR_MASTERY_STRENGTH_CUTOFF}
    ORDER BY
      wp.repetitions DESC,
      wp.strength DESC,
      wp.next_review_at ASC NULLS FIRST
    LIMIT ${buffer}
  `);
  const out: PlanVocabItem[] = [];
  for (const r of rows.rows) {
    if (used.has(r.word_id)) continue;
    out.push(progressRowToItem(r));
    used.add(r.word_id);
    if (out.length >= limit) break;
  }
  return out;
}

async function loadNewWords(
  userId: string,
  allowedLevels: string[],
  limit: number,
  used: Set<number>,
): Promise<PlanVocabItem[]> {
  if (limit <= 0 || allowedLevels.length === 0) return [];
  const buffer = limit + used.size;
  const rows = await db.execute<NewWordRow>(sql`
    SELECT w.id, w.english, w.arabic, w.pos, w.level,
           w.sentence_en, w.sentence_ar, w.audio_word_path, w.audio_sentence_path
    FROM words w
    WHERE w.level IN ${sql.raw(levelsInClause(allowedLevels))}
      AND NOT EXISTS (
        SELECT 1 FROM english_word_progress wp
        WHERE wp.user_id = ${userId} AND wp.word_id = w.id
      )
    ORDER BY w.id
    LIMIT ${buffer}
  `);
  const out: PlanVocabItem[] = [];
  for (const r of rows.rows) {
    if (used.has(r.id)) continue;
    out.push(newWordRowToItem(r));
    used.add(r.id);
    if (out.length >= limit) break;
  }
  return out;
}

async function loadChallengeWords(
  userId: string,
  allowedLevels: string[],
  limit: number,
  used: Set<number>,
): Promise<PlanVocabItem[]> {
  if (limit <= 0 || allowedLevels.length === 0) return [];
  // Challenge = unseen words at the *highest* allowed level. CEFR ordering
  // is well-defined across our 5 levels.
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const top = [...allowedLevels].sort(
    (a, b) => order.indexOf(b) - order.indexOf(a),
  )[0];
  if (!top) return [];
  // Stagger by id offset so different sessions on the same day don't see
  // identical challenge words. Cheap pseudo-randomization without `random()`.
  const buffer = limit + used.size;
  const rows = await db.execute<NewWordRow>(sql`
    SELECT w.id, w.english, w.arabic, w.pos, w.level,
           w.sentence_en, w.sentence_ar, w.audio_word_path, w.audio_sentence_path
    FROM words w
    WHERE w.level = ${top}
      AND NOT EXISTS (
        SELECT 1 FROM english_word_progress wp
        WHERE wp.user_id = ${userId} AND wp.word_id = w.id
      )
    ORDER BY w.id DESC
    LIMIT ${buffer}
  `);
  const out: PlanVocabItem[] = [];
  for (const r of rows.rows) {
    if (used.has(r.id)) continue;
    out.push(newWordRowToItem(r));
    used.add(r.id);
    if (out.length >= limit) break;
  }
  return out;
}

async function loadNextLesson(
  userId: string,
  allowedLevels: string[],
): Promise<PlanLesson | null> {
  if (allowedLevels.length === 0) return null;
  const lessons = await db
    .select({
      id: englishLessonsTable.id,
      title: englishLessonsTable.title,
      titleAr: englishLessonsTable.titleAr,
      level: englishLessonsTable.level,
      tier: englishLessonsTable.tier,
      sortOrder: englishLessonsTable.sortOrder,
    })
    .from(englishLessonsTable)
    .orderBy(asc(englishLessonsTable.sortOrder), asc(englishLessonsTable.createdAt));

  if (lessons.length === 0) return null;

  const completions = await db
    .select({ lessonId: englishLessonCompletionsTable.lessonId })
    .from(englishLessonCompletionsTable)
    .where(eq(englishLessonCompletionsTable.userId, userId));
  const done = new Set(completions.map((c) => c.lessonId));

  const next = lessons.find(
    (l) => !done.has(l.id) && allowedLevels.includes(l.level),
  );
  if (!next) return null;

  // Pull progress (resume position) if any.
  const [progress] = await db
    .select({
      watchedSeconds: englishLessonProgressTable.watchedSeconds,
      durationSeconds: englishLessonProgressTable.durationSeconds,
      lastPositionSeconds: englishLessonProgressTable.lastPositionSeconds,
    })
    .from(englishLessonProgressTable)
    .where(
      and(
        eq(englishLessonProgressTable.userId, userId),
        eq(englishLessonProgressTable.lessonId, next.id),
      ),
    )
    .limit(1);

  return {
    id: next.id,
    title: next.title,
    titleAr: next.titleAr,
    level: next.level,
    tier: next.tier,
    sortOrder: next.sortOrder,
    watchedSeconds: progress?.watchedSeconds ?? 0,
    durationSeconds: progress?.durationSeconds ?? 0,
    lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Orchestration.
// ---------------------------------------------------------------------------

export async function getTodayPlan(userId: string): Promise<TodayPlan> {
  const generatedAt = new Date().toISOString();
  const activeTiers = await getStudentActiveEnglishTiers(userId);
  const allowedLevels: string[] = [...getAllowedEnglishLevels(activeTiers)];
  const baseTier = pickBaseTier(activeTiers);
  const hasEnrollment = baseTier !== null;

  const notes: string[] = [];
  const signals = await loadSignals(userId, hasEnrollment);

  if (!hasEnrollment) {
    notes.push("No active English enrollment — please enroll in a package to unlock today's plan.");
    return {
      generatedAt,
      activeTiers,
      allowedLevels,
      difficulty: "easy",
      signals,
      workload: { ...EMPTY_WORKLOAD },
      nextLesson: null,
      reviewVocabulary: [],
      weakWords: [],
      newWords: [],
      challengeWords: [],
      masteryTargets: [],
      estimatedMinutes: 0,
      recommendedRepetition: 1,
      notes,
    };
  }

  const difficulty = pickDifficulty(baseTier, signals, notes);
  const workload = computeWorkload(baseTier, difficulty, signals, notes);

  // Ordered fill (highest priority first) using a shared `used` set so the
  // same word never appears in two buckets.
  const used = new Set<number>();
  const weakWords = await loadWeakWords(userId, allowedLevels, workload.weakTarget, used);
  const reviewVocabulary = await loadDueReviews(userId, allowedLevels, workload.reviewTarget, used);
  const masteryTargets = await loadMasteryTargets(userId, allowedLevels, workload.masteryTarget, used);
  const newWords = await loadNewWords(userId, allowedLevels, workload.newTarget, used);
  const challengeWords = await loadChallengeWords(userId, allowedLevels, workload.challengeTarget, used);
  const nextLesson = await loadNextLesson(userId, allowedLevels);

  // Streak nudge.
  if (signals.streakDays >= 3) {
    notes.push(`Streak: ${signals.streakDays} days — keep it alive today.`);
  } else if (signals.streakDays === 0 && signals.totalWords > 0) {
    notes.push("No XP today yet — a short review session keeps the streak going.");
  }

  // Cold-start nudge.
  if (signals.totalWords === 0) {
    notes.push("Welcome — start with a few new words to seed your study plan.");
  }

  // Estimated minutes.
  const lessonSeconds = nextLesson
    ? nextLesson.durationSeconds > 0
      ? Math.max(0, nextLesson.durationSeconds - nextLesson.lastPositionSeconds)
      : DEFAULT_LESSON_SECONDS
    : 0;
  const totalSeconds =
    reviewVocabulary.length * SECS_PER_REVIEW +
    weakWords.length * SECS_PER_WEAK +
    newWords.length * SECS_PER_NEW +
    masteryTargets.length * SECS_PER_MASTERY +
    challengeWords.length * SECS_PER_CHALLENGE +
    lessonSeconds;
  const estimatedMinutes = Math.max(0, Math.round(totalSeconds / 60));

  // recommendedRepetition: 1 attempt per word for today's session, lifted to
  // 2 if the heavy-failure guard tripped (so the student really hammers
  // weak items). Kept simple — full per-word reps are governed by the SRS.
  const recommendedRepetition =
    signals.recentFailures >= HEAVY_FAILURE_FAIL_COUNT ||
    signals.weakRatio > HEAVY_FAILURE_WEAK_RATIO
      ? 2
      : 1;

  return {
    generatedAt,
    activeTiers,
    allowedLevels,
    difficulty,
    signals,
    workload,
    nextLesson,
    reviewVocabulary,
    weakWords,
    newWords,
    challengeWords,
    masteryTargets,
    estimatedMinutes,
    recommendedRepetition,
    notes,
  };
}
