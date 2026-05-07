// ============================================================================
// English Student Adaptive Profile Engine.
//
// READ-ONLY over existing analytics tables; the only write performed is an
// UPSERT on `english_adaptive_profile` (the cache row owned by this layer).
//
// Privacy: only educational interaction patterns. NO mental-state labels,
// NO personality typing, NO health claims. Field names are about study
// behavior, never about the student as a person.
//
// Architecture:
//   * `gather(userId)` runs a small batch of indexed SQLs (xp events,
//     exercise attempts, vocab attempts, study events, daily activity,
//     lesson completions, word progress, quiz attempts).
//   * Pure JS derivation builds the trait/style/difficulty/signal/trend
//     payload with confidence + evidenceCount + lastUpdated per item.
//   * Single UPSERT into `english_adaptive_profile` keyed by userId.
//   * Cache TTL: `getOrCompute(userId, { maxAgeMs })` re-uses the row if
//     fresh, else recomputes.
// ============================================================================

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  englishAdaptiveProfileTable,
  type AdaptiveTraits,
  type LearningStyle,
  type DifficultyMemory,
  type TrendsBundle,
  PERSONALIZATION_SIGNAL_KEYS,
  type PersonalizationSignalKey,
} from "@workspace/db";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AdaptiveProfileResult {
  userId: string;
  lastComputedAt: string;
  evidenceCount: number;
  traits: AdaptiveTraits;
  learningStyle: LearningStyle;
  difficulty: DifficultyMemory;
  signals: Record<
    PersonalizationSignalKey,
    { value: boolean; confidence: number; evidenceCount: number; lastUpdated: string }
  >;
  trends: TrendsBundle;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour cache TTL

const nowIso = () => new Date().toISOString();

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function pct(n: number, d: number, dp = 1): number | null {
  if (d <= 0) return null;
  const f = Math.pow(10, dp);
  return Math.round((n / d) * 100 * f) / f;
}

// Confidence model: more evidence -> higher confidence, capped at 0.95.
// 30+ events ~ 0.90, 10 events ~ 0.55, 0 events = 0.
function confidenceFromEvidence(n: number): number {
  if (n <= 0) return 0;
  // 1 - exp(-n/12) — smooth concave curve, n=12 -> ~0.63, n=30 -> ~0.92.
  const c = 1 - Math.exp(-n / 12);
  return Math.round(Math.min(c, 0.95) * 100) / 100;
}

function buildNumberTrait(
  value: number | null,
  evidenceCount: number,
  lastUpdated: string,
) {
  return {
    value,
    confidence: value == null ? 0 : confidenceFromEvidence(evidenceCount),
    evidenceCount,
    lastUpdated,
  };
}

function buildCategoricalTrait(
  value: string | null,
  evidenceCount: number,
  lastUpdated: string,
) {
  return {
    value,
    confidence: value == null ? 0 : confidenceFromEvidence(evidenceCount),
    evidenceCount,
    lastUpdated,
  };
}

function buildBooleanTrait(
  value: boolean,
  evidenceCount: number,
  lastUpdated: string,
) {
  return {
    value,
    confidence: confidenceFromEvidence(evidenceCount),
    evidenceCount,
    lastUpdated,
  };
}

// ---------------------------------------------------------------------------
// Gather
// ---------------------------------------------------------------------------

interface WindowAccuracy {
  exerciseAttempts: number;
  exerciseCorrect: number;
  vocabAttempts: number;
  vocabCorrect: number;
  grammarAttempts: number;
  grammarCorrect: number;
  readingAttempts: number;
  readingCorrect: number;
  quizAttempts: number;
  quizPasses: number;
  avgSessionSec: number | null;
}

interface RawSignals {
  perTypeAttempts: Array<{
    type: string;
    attempts: number;
    correct: number;
    avgDurationMs: number;
  }>;
  vocabAttempts: { total: number; correct: number; mastered: number };
  grammarAccuracy: { attempts: number; correct: number } | null;
  readingAccuracy: { attempts: number; correct: number } | null;
  quizAttempts: { total: number; passes: number; avgScorePct: number | null };
  lessonsCompleted: { total: number; d7: number; d30: number };
  studyEvents: {
    sessions7d: number;
    sessions30d: number;
    avgSessionSec7d: number | null;
    avgSessionSec30d: number | null;
    longestSessionSec: number | null;
    nightShareSec: number; // 19:00-03:00 Riyadh share of seconds in 30d
    totalSec30d: number;
  };
  activityDays: { d7: number; d30: number; lifetime: number };
  retryBehavior: { failures: number; retried: number };
  recentXp: { d7: number; d30: number; lifetime: number };
  weeklyAccuracyDelta: number | null; // pct points: this-week vs prev-week
  comfortSignal: {
    overload7d: number; // count of days w/ ≥3 fast-fails
    momentum: number; // -1..+1
  };
  windows: { d7: WindowAccuracy; d30: WindowAccuracy };
}

async function gather(userId: string): Promise<RawSignals> {
  // 1. Per-type exercise attempts (lifetime, with avg duration for speed sig)
  const perTypeRes = await db.execute(sql`
    SELECT e.type,
           COUNT(*)::int                                  AS attempts,
           SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct,
           COALESCE(AVG(NULLIF(a.duration_ms, 0)), 0)::int AS avg_duration_ms
      FROM english_exercise_attempts a
      JOIN english_exercises e ON e.id = a.exercise_id
     WHERE a.user_id = ${userId}
     GROUP BY e.type
  `);
  const perTypeAttempts = perTypeRes.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      type: String(row.type),
      attempts: Number(row.attempts ?? 0),
      correct: Number(row.correct ?? 0),
      avgDurationMs: Number(row.avg_duration_ms ?? 0),
    };
  });

  // 2. Vocab attempts (lifetime) + mastered count.
  const vocabRes = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM english_vocab_attempt_log WHERE user_id = ${userId})                 AS total,
      (SELECT COUNT(*)::int FROM english_vocab_attempt_log WHERE user_id = ${userId} AND was_correct) AS correct,
      (SELECT COUNT(*)::int FROM english_word_progress
        WHERE user_id = ${userId} AND status = 'mastered')                                            AS mastered
  `);
  const vocabRow = vocabRes.rows[0] as Record<string, unknown>;
  const vocabAttempts = {
    total: Number(vocabRow.total ?? 0),
    correct: Number(vocabRow.correct ?? 0),
    mastered: Number(vocabRow.mastered ?? 0),
  };

  // 3. Grammar / reading accuracy from per-type attempts.
  const grammarTypes = new Set([
    "fill_blank",
    "sentence_build",
    "vocabulary_recall",
  ]);
  const readingTypes = new Set(["reading_check", "reading"]);
  let gAtt = 0,
    gCor = 0,
    rAtt = 0,
    rCor = 0;
  for (const t of perTypeAttempts) {
    if (grammarTypes.has(t.type)) {
      gAtt += t.attempts;
      gCor += t.correct;
    } else if (readingTypes.has(t.type)) {
      rAtt += t.attempts;
      rCor += t.correct;
    }
  }
  const grammarAccuracy = gAtt > 0 ? { attempts: gAtt, correct: gCor } : null;
  const readingAccuracy = rAtt > 0 ? { attempts: rAtt, correct: rCor } : null;

  // 4. Quiz attempts.
  const quizRes = await db.execute(sql`
    SELECT
      COUNT(*)::int                              AS total,
      SUM(CASE WHEN passed THEN 1 ELSE 0 END)::int AS passes,
      AVG(score_pct)::numeric(5,2)               AS avg_score_pct
      FROM english_quiz_attempts
     WHERE user_id = ${userId}
       AND submitted_at IS NOT NULL
  `);
  const quizRow = quizRes.rows[0] as Record<string, unknown>;
  const quizAttempts = {
    total: Number(quizRow.total ?? 0),
    passes: Number(quizRow.passes ?? 0),
    avgScorePct: num(quizRow.avg_score_pct),
  };

  // 5. Lesson completions.
  const lessonsRes = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM english_lesson_completions WHERE user_id = ${userId}) AS total,
      (SELECT COUNT(*)::int FROM english_lesson_completions
        WHERE user_id = ${userId} AND completed_at >= now() - interval '7 day')        AS d7,
      (SELECT COUNT(*)::int FROM english_lesson_completions
        WHERE user_id = ${userId} AND completed_at >= now() - interval '30 day')       AS d30
  `);
  const lessonsRow = lessonsRes.rows[0] as Record<string, unknown>;

  // 6. Study events — sessions, durations, time-of-day distribution.
  // A "session" is grouped by gaps >= 30 min between consecutive events.
  const studyRes = await db.execute(sql`
    WITH e AS (
      SELECT occurred_at,
             delta_seconds,
             EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Asia/Riyadh')::int AS hr
        FROM english_study_events
       WHERE user_id = ${userId}
         AND occurred_at >= now() - interval '30 day'
    ),
    e2 AS (
      SELECT occurred_at, delta_seconds, hr,
             EXTRACT(EPOCH FROM (occurred_at - LAG(occurred_at) OVER (ORDER BY occurred_at))) AS gap_sec
        FROM e
    ),
    e3 AS (
      SELECT occurred_at, delta_seconds, hr,
             SUM(CASE WHEN gap_sec IS NULL OR gap_sec >= 1800 THEN 1 ELSE 0 END)
                OVER (ORDER BY occurred_at) AS session_id
        FROM e2
    ),
    sessions7 AS (
      SELECT session_id, SUM(delta_seconds)::int AS sec
        FROM e3
       WHERE occurred_at >= now() - interval '7 day'
       GROUP BY session_id
    ),
    sessions30 AS (
      SELECT session_id, SUM(delta_seconds)::int AS sec
        FROM e3
       GROUP BY session_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM sessions7)                                              AS sessions_7d,
      (SELECT COUNT(*)::int FROM sessions30)                                             AS sessions_30d,
      (SELECT AVG(sec)::int FROM sessions7  WHERE sec > 0)                               AS avg_session_sec_7d,
      (SELECT AVG(sec)::int FROM sessions30 WHERE sec > 0)                               AS avg_session_sec_30d,
      (SELECT MAX(sec)::int FROM sessions30)                                             AS longest_session_sec,
      (SELECT COALESCE(SUM(delta_seconds),0)::int FROM e
        WHERE hr >= 19 OR hr < 3)                                                        AS night_seconds,
      (SELECT COALESCE(SUM(delta_seconds),0)::int FROM e)                                AS total_seconds_30d
  `);
  const studyRow = studyRes.rows[0] as Record<string, unknown>;

  // 7. Activity days (Riyadh civil) from xp events + daily activity.
  const actRes = await db.execute(sql`
    WITH d AS (
      SELECT to_char(created_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD') AS day
        FROM english_xp_events WHERE user_id = ${userId}
      UNION
      SELECT to_char(date_utc, 'YYYY-MM-DD') AS day
        FROM english_daily_activity WHERE user_id = ${userId}
    )
    SELECT
      COUNT(*) FILTER (WHERE day > to_char(now() AT TIME ZONE 'Asia/Riyadh' - interval '7 day','YYYY-MM-DD'))::int  AS d7,
      COUNT(*) FILTER (WHERE day > to_char(now() AT TIME ZONE 'Asia/Riyadh' - interval '30 day','YYYY-MM-DD'))::int AS d30,
      COUNT(*)::int                                                                                                  AS lifetime
      FROM d WHERE day IS NOT NULL
  `);
  const actRow = actRes.rows[0] as Record<string, unknown>;

  // 8. Retry behavior — % of distinct (user,exercise) pairs that failed
  //    at least once and were retried.
  const retryRes = await db.execute(sql`
    WITH per_ex AS (
      SELECT exercise_id,
             SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) AS fails,
             COUNT(*)                                         AS total
        FROM english_exercise_attempts
       WHERE user_id = ${userId}
       GROUP BY exercise_id
    )
    SELECT
      COUNT(*) FILTER (WHERE fails > 0)::int                       AS failures,
      COUNT(*) FILTER (WHERE fails > 0 AND total > fails)::int     AS retried
      FROM per_ex
  `);
  const retryRow = retryRes.rows[0] as Record<string, unknown>;

  // 9. XP (windowed).
  const xpRes = await db.execute(sql`
    SELECT
      (SELECT COALESCE(SUM(amount),0)::int FROM english_xp_events
        WHERE user_id = ${userId} AND created_at >= now() - interval '7 day')   AS d7,
      (SELECT COALESCE(SUM(amount),0)::int FROM english_xp_events
        WHERE user_id = ${userId} AND created_at >= now() - interval '30 day')  AS d30,
      (SELECT COALESCE(SUM(amount),0)::int FROM english_xp_events
        WHERE user_id = ${userId})                                              AS lifetime
  `);
  const xpRow = xpRes.rows[0] as Record<string, unknown>;

  // 10. Improvement velocity — exercise-attempt accuracy this week vs prev week.
  const accDeltaRes = await db.execute(sql`
    WITH cur AS (
      SELECT AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) * 100 AS p, COUNT(*) AS n
        FROM english_exercise_attempts
       WHERE user_id = ${userId}
         AND created_at >= now() - interval '7 day'
    ),
    prev AS (
      SELECT AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) * 100 AS p, COUNT(*) AS n
        FROM english_exercise_attempts
       WHERE user_id = ${userId}
         AND created_at >= now() - interval '14 day'
         AND created_at <  now() - interval '7 day'
    )
    SELECT
      (cur.p - prev.p)::numeric(6,2) AS delta_pct,
      cur.n::int                     AS cur_n,
      prev.n::int                    AS prev_n
      FROM cur, prev
  `);
  const accDeltaRow = accDeltaRes.rows[0] as Record<string, unknown>;
  const curN = Number(accDeltaRow?.cur_n ?? 0);
  const prevN = Number(accDeltaRow?.prev_n ?? 0);
  const weeklyAccuracyDelta = curN >= 3 && prevN >= 3 ? num(accDeltaRow?.delta_pct) : null;

  // 10b. Window-scoped accuracy buckets (d7, d30) for true trend tracking.
  // One SQL per window keeps the parameterization simple and indexes happy.
  async function windowAccuracy(intervalDays: number): Promise<WindowAccuracy> {
    const interval = sql.raw(`'${intervalDays} day'`);
    const exRes = await db.execute(sql`
      SELECT e.type,
             COUNT(*)::int                                          AS attempts,
             SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int     AS correct
        FROM english_exercise_attempts a
        JOIN english_exercises e ON e.id = a.exercise_id
       WHERE a.user_id = ${userId}
         AND a.created_at >= now() - interval ${interval}
       GROUP BY e.type
    `);
    let exA = 0, exC = 0, gA = 0, gC = 0, rA = 0, rC = 0;
    for (const r of exRes.rows) {
      const row = r as Record<string, unknown>;
      const t = String(row.type);
      const a = Number(row.attempts ?? 0);
      const c = Number(row.correct ?? 0);
      exA += a;
      exC += c;
      if (grammarTypes.has(t)) {
        gA += a;
        gC += c;
      } else if (readingTypes.has(t)) {
        rA += a;
        rC += c;
      }
    }
    const vRes = await db.execute(sql`
      SELECT COUNT(*)::int                                        AS total,
             SUM(CASE WHEN was_correct THEN 1 ELSE 0 END)::int    AS correct
        FROM english_vocab_attempt_log
       WHERE user_id = ${userId}
         AND created_at >= now() - interval ${interval}
    `);
    const vRow = vRes.rows[0] as Record<string, unknown>;
    const qRes = await db.execute(sql`
      SELECT COUNT(*)::int                                          AS total,
             SUM(CASE WHEN passed THEN 1 ELSE 0 END)::int           AS passes
        FROM english_quiz_attempts
       WHERE user_id = ${userId}
         AND submitted_at IS NOT NULL
         AND submitted_at >= now() - interval ${interval}
    `);
    const qRow = qRes.rows[0] as Record<string, unknown>;
    return {
      exerciseAttempts: exA,
      exerciseCorrect: exC,
      vocabAttempts: Number(vRow.total ?? 0),
      vocabCorrect: Number(vRow.correct ?? 0),
      grammarAttempts: gA,
      grammarCorrect: gC,
      readingAttempts: rA,
      readingCorrect: rC,
      quizAttempts: Number(qRow.total ?? 0),
      quizPasses: Number(qRow.passes ?? 0),
      avgSessionSec: null, // assigned below using window-aligned session sec
    };
  }
  const win7 = await windowAccuracy(7);
  const win30 = await windowAccuracy(30);

  // 11. Comfort / overload signals.
  // Overload day = a day with ≥3 fast-fail attempts (duration < 5s, !correct).
  const overloadRes = await db.execute(sql`
    WITH d AS (
      SELECT to_char(created_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD') AS day,
             COUNT(*) FILTER (WHERE NOT is_correct AND duration_ms BETWEEN 1 AND 5000) AS fast_fails
        FROM english_exercise_attempts
       WHERE user_id = ${userId}
         AND created_at >= now() - interval '7 day'
       GROUP BY day
    )
    SELECT COUNT(*) FILTER (WHERE fast_fails >= 3)::int AS overload_days FROM d
  `);
  const overloadRow = overloadRes.rows[0] as Record<string, unknown>;

  return {
    perTypeAttempts,
    vocabAttempts,
    grammarAccuracy,
    readingAccuracy,
    quizAttempts,
    lessonsCompleted: {
      total: Number(lessonsRow.total ?? 0),
      d7: Number(lessonsRow.d7 ?? 0),
      d30: Number(lessonsRow.d30 ?? 0),
    },
    studyEvents: {
      sessions7d: Number(studyRow.sessions_7d ?? 0),
      sessions30d: Number(studyRow.sessions_30d ?? 0),
      avgSessionSec7d: num(studyRow.avg_session_sec_7d),
      avgSessionSec30d: num(studyRow.avg_session_sec_30d),
      longestSessionSec: num(studyRow.longest_session_sec),
      nightShareSec: Number(studyRow.night_seconds ?? 0),
      totalSec30d: Number(studyRow.total_seconds_30d ?? 0),
    },
    activityDays: {
      d7: Number(actRow.d7 ?? 0),
      d30: Number(actRow.d30 ?? 0),
      lifetime: Number(actRow.lifetime ?? 0),
    },
    retryBehavior: {
      failures: Number(retryRow.failures ?? 0),
      retried: Number(retryRow.retried ?? 0),
    },
    recentXp: {
      d7: Number(xpRow.d7 ?? 0),
      d30: Number(xpRow.d30 ?? 0),
      lifetime: Number(xpRow.lifetime ?? 0),
    },
    weeklyAccuracyDelta,
    comfortSignal: {
      overload7d: Number(overloadRow.overload_days ?? 0),
      // Momentum heuristic: combine 7d activity ratio + accuracy delta.
      momentum: clamp01Signed(
        (Number(actRow.d7 ?? 0) / 7 - 0.3) +
          (weeklyAccuracyDelta ? weeklyAccuracyDelta / 50 : 0),
      ),
    },
    windows: {
      d7: { ...win7, avgSessionSec: num(studyRow.avg_session_sec_7d) },
      d30: { ...win30, avgSessionSec: num(studyRow.avg_session_sec_30d) },
    },
  };
}

function clamp01Signed(x: number): number {
  return Math.max(-1, Math.min(1, Math.round(x * 100) / 100));
}

// ---------------------------------------------------------------------------
// Derive — pure JS, no IO.
// ---------------------------------------------------------------------------

function derive(raw: RawSignals): {
  traits: AdaptiveTraits;
  learningStyle: LearningStyle;
  difficulty: DifficultyMemory;
  signals: AdaptiveProfileResult["signals"];
  trends: TrendsBundle;
  evidenceCount: number;
} {
  const ts = nowIso();
  const totalExAttempts = raw.perTypeAttempts.reduce(
    (s, t) => s + t.attempts,
    0,
  );
  const totalExCorrect = raw.perTypeAttempts.reduce((s, t) => s + t.correct, 0);

  // ---- Traits ----
  const sortedByAccuracy = [...raw.perTypeAttempts]
    .filter((t) => t.attempts >= 3)
    .map((t) => ({ ...t, accuracy: pct(t.correct, t.attempts) ?? 0 }))
    .sort((a, b) => b.accuracy - a.accuracy);
  const preferredType = [...raw.perTypeAttempts].sort(
    (a, b) => b.attempts - a.attempts,
  )[0];

  const traits: AdaptiveTraits = {
    preferredExerciseTypes: buildCategoricalTrait(
      preferredType ? preferredType.type : null,
      preferredType?.attempts ?? 0,
      ts,
    ),
    strongestSkillAreas: buildCategoricalTrait(
      sortedByAccuracy[0]?.type ?? null,
      sortedByAccuracy[0]?.attempts ?? 0,
      ts,
    ),
    weakestSkillAreas: buildCategoricalTrait(
      sortedByAccuracy.length > 0
        ? sortedByAccuracy[sortedByAccuracy.length - 1].type
        : null,
      sortedByAccuracy.length > 0
        ? sortedByAccuracy[sortedByAccuracy.length - 1].attempts
        : 0,
      ts,
    ),
    vocabularyRetention: buildNumberTrait(
      pct(raw.vocabAttempts.correct, raw.vocabAttempts.total),
      raw.vocabAttempts.total,
      ts,
    ),
    grammarAccuracy: buildNumberTrait(
      raw.grammarAccuracy
        ? pct(raw.grammarAccuracy.correct, raw.grammarAccuracy.attempts)
        : null,
      raw.grammarAccuracy?.attempts ?? 0,
      ts,
    ),
    readingConfidence: buildNumberTrait(
      raw.readingAccuracy
        ? pct(raw.readingAccuracy.correct, raw.readingAccuracy.attempts)
        : null,
      raw.readingAccuracy?.attempts ?? 0,
      ts,
    ),
    quizConfidence: buildNumberTrait(
      raw.quizAttempts.total > 0 ? raw.quizAttempts.avgScorePct ?? null : null,
      raw.quizAttempts.total,
      ts,
    ),
    studyConsistency: buildNumberTrait(
      pct(raw.activityDays.d30, 30),
      raw.activityDays.d30,
      ts,
    ),
    sessionEndurance: buildNumberTrait(
      raw.studyEvents.longestSessionSec
        ? Math.min(
            100,
            Math.round((raw.studyEvents.longestSessionSec / (45 * 60)) * 100),
          )
        : null,
      raw.studyEvents.sessions30d,
      ts,
    ),
    averageFocusDurationSec: buildNumberTrait(
      raw.studyEvents.avgSessionSec30d,
      raw.studyEvents.sessions30d,
      ts,
    ),
    retryBehavior: buildNumberTrait(
      pct(raw.retryBehavior.retried, raw.retryBehavior.failures),
      raw.retryBehavior.failures,
      ts,
    ),
    improvementVelocity: buildNumberTrait(
      raw.weeklyAccuracyDelta,
      Math.min(totalExAttempts, 30),
      ts,
    ),
  };

  // ---- Learning style (categorical buckets) ----
  // visualPreference: more reading_check + matching attempts vs writing/sentence_build
  const visualScore =
    typeAttempts(raw, ["reading_check", "matching"]) -
    typeAttempts(raw, ["sentence_build", "writing", "speaking"]);
  const visualPreference = bucket(visualScore, [-3, 3], [
    "low",
    "medium",
    "high",
  ]);
  // repetitionPreference: high if retryBehavior > 60% AND mastered count grows
  const repetitionPct = pct(raw.retryBehavior.retried, raw.retryBehavior.failures) ?? 0;
  const repetitionPreference = bucket(repetitionPct, [30, 60], [
    "low",
    "medium",
    "high",
  ]);
  // challengeTolerance: completes lessons even after failed quizzes
  const challengeScore = (raw.quizAttempts.total - raw.quizAttempts.passes) +
    (raw.lessonsCompleted.d30 > 5 ? 2 : 0);
  const challengeTolerance = bucket(challengeScore, [1, 4], [
    "low",
    "medium",
    "high",
  ]);
  // speedVsAccuracy: avg duration short + low accuracy => speed_leaning;
  // long + high accuracy => accuracy_leaning.
  const accuracyOverall = pct(totalExCorrect, totalExAttempts) ?? 50;
  const avgDur =
    totalExAttempts > 0
      ? raw.perTypeAttempts.reduce(
          (s, t) => s + t.avgDurationMs * t.attempts,
          0,
        ) / totalExAttempts
      : 0;
  const speedVsAccuracy =
    avgDur > 0
      ? avgDur < 8000 && accuracyOverall < 70
        ? "speed_leaning"
        : avgDur > 20000 && accuracyOverall >= 70
          ? "accuracy_leaning"
          : "balanced"
      : "balanced";
  // structureVsExploration: studies in long-ordered runs (consistency) vs bursts
  const consistency = pct(raw.activityDays.d30, 30) ?? 0;
  const structureVsExploration = bucket(consistency, [25, 60], [
    "exploratory",
    "balanced",
    "structured",
  ]);

  const learningStyle: LearningStyle = {
    visualPreference: buildCategoricalTrait(visualPreference, totalExAttempts, ts),
    repetitionPreference: buildCategoricalTrait(
      repetitionPreference,
      raw.retryBehavior.failures,
      ts,
    ),
    challengeTolerance: buildCategoricalTrait(
      challengeTolerance,
      raw.quizAttempts.total + raw.lessonsCompleted.total,
      ts,
    ),
    speedVsAccuracy: buildCategoricalTrait(
      speedVsAccuracy,
      totalExAttempts,
      ts,
    ),
    structureVsExploration: buildCategoricalTrait(
      structureVsExploration,
      raw.activityDays.d30,
      ts,
    ),
  };

  // ---- Difficulty memory ----
  const comfortLabel: string =
    accuracyOverall >= 85
      ? "above_level"
      : accuracyOverall >= 60
        ? "on_level"
        : accuracyOverall >= 1
          ? "below_level"
          : "unknown";
  const recommendedIntensity =
    raw.comfortSignal.overload7d >= 2
      ? "lighter"
      : raw.comfortSignal.momentum >= 0.4
        ? "stretch"
        : "steady";
  const difficulty: DifficultyMemory = {
    currentComfortLevel: buildCategoricalTrait(
      comfortLabel,
      totalExAttempts,
      ts,
    ),
    recentOverloadSignals: buildNumberTrait(
      raw.comfortSignal.overload7d,
      raw.activityDays.d7,
      ts,
    ),
    recentMomentum: buildNumberTrait(
      raw.comfortSignal.momentum,
      raw.activityDays.d30,
      ts,
    ),
    recommendedIntensity: buildCategoricalTrait(
      recommendedIntensity,
      totalExAttempts,
      ts,
    ),
  };

  // ---- Personalization signals (booleans) ----
  const avgSessionMin = (raw.studyEvents.avgSessionSec30d ?? 0) / 60;
  const longestMin = (raw.studyEvents.longestSessionSec ?? 0) / 60;
  const consistencyD30 = pct(raw.activityDays.d30, 30) ?? 0;
  const nightShare = raw.studyEvents.totalSec30d > 0
    ? raw.studyEvents.nightShareSec / raw.studyEvents.totalSec30d
    : 0;
  const vocabRet = pct(raw.vocabAttempts.correct, raw.vocabAttempts.total) ?? 0;
  const readingPct = raw.readingAccuracy
    ? pct(raw.readingAccuracy.correct, raw.readingAccuracy.attempts) ?? 0
    : 0;
  const grammarPct = raw.grammarAccuracy
    ? pct(raw.grammarAccuracy.correct, raw.grammarAccuracy.attempts) ?? 0
    : 0;
  const quizPct = raw.quizAttempts.avgScorePct ?? 0;

  const flags: Record<PersonalizationSignalKey, boolean> = {
    prefers_short_sessions: avgSessionMin > 0 && avgSessionMin < 8,
    handles_long_sessions: longestMin >= 30,
    needs_review_cycles: repetitionPct >= 60,
    performs_better_at_night: nightShare >= 0.5,
    performs_better_with_repetition:
      repetitionPct >= 60 && accuracyOverall >= 70,
    quiz_confidence_low: raw.quizAttempts.total >= 1 && quizPct < 60,
    quiz_confidence_high: raw.quizAttempts.total >= 2 && quizPct >= 80,
    reading_strength_high:
      (raw.readingAccuracy?.attempts ?? 0) >= 3 && readingPct >= 80,
    grammar_weakness:
      (raw.grammarAccuracy?.attempts ?? 0) >= 3 && grammarPct < 60,
    vocabulary_strength_high: raw.vocabAttempts.total >= 10 && vocabRet >= 80,
    consistent_daily_studier: consistencyD30 >= 60,
    burst_studier: consistencyD30 < 25 && raw.activityDays.lifetime >= 5,
  };
  const signals = Object.fromEntries(
    PERSONALIZATION_SIGNAL_KEYS.map((k) => {
      // evidence count tailored per flag
      let evidence = 0;
      switch (k) {
        case "prefers_short_sessions":
        case "handles_long_sessions":
          evidence = raw.studyEvents.sessions30d;
          break;
        case "needs_review_cycles":
        case "performs_better_with_repetition":
          evidence = raw.retryBehavior.failures;
          break;
        case "performs_better_at_night":
          evidence = Math.min(raw.activityDays.d30, 30);
          break;
        case "quiz_confidence_low":
        case "quiz_confidence_high":
          evidence = raw.quizAttempts.total;
          break;
        case "reading_strength_high":
          evidence = raw.readingAccuracy?.attempts ?? 0;
          break;
        case "grammar_weakness":
          evidence = raw.grammarAccuracy?.attempts ?? 0;
          break;
        case "vocabulary_strength_high":
          evidence = raw.vocabAttempts.total;
          break;
        case "consistent_daily_studier":
        case "burst_studier":
          evidence = raw.activityDays.d30;
          break;
      }
      return [k, buildBooleanTrait(flags[k], evidence, ts)];
    }),
  ) as AdaptiveProfileResult["signals"];

  // ---- Trends ----
  // True per-window aggregates for d7/d30 (from raw.windows); lifetime uses
  // the lifetime totals computed up top. Each window has its own session
  // average aligned to that window.
  const overallAccPct = pct(totalExCorrect, totalExAttempts);
  const vocabRetPct = pct(raw.vocabAttempts.correct, raw.vocabAttempts.total);
  const grammarPctVal = raw.grammarAccuracy
    ? pct(raw.grammarAccuracy.correct, raw.grammarAccuracy.attempts)
    : null;
  const readingPctVal = raw.readingAccuracy
    ? pct(raw.readingAccuracy.correct, raw.readingAccuracy.attempts)
    : null;
  const quizPassRate = pct(raw.quizAttempts.passes, raw.quizAttempts.total);

  function trendFromWindow(
    w: WindowAccuracy,
    windowDays: number,
    activeDays: number,
    lessons: number,
    xp: number,
  ) {
    return {
      windowDays,
      exerciseAccuracyPct: pct(w.exerciseCorrect, w.exerciseAttempts),
      vocabRetentionPct: pct(w.vocabCorrect, w.vocabAttempts),
      grammarAccuracyPct: pct(w.grammarCorrect, w.grammarAttempts),
      readingAccuracyPct: pct(w.readingCorrect, w.readingAttempts),
      quizPassRatePct: pct(w.quizPasses, w.quizAttempts),
      activeDays,
      avgSessionSeconds: w.avgSessionSec,
      lessonsCompleted: lessons,
      xpTotal: xp,
    };
  }

  const trends: TrendsBundle = {
    d7: trendFromWindow(
      raw.windows.d7,
      7,
      raw.activityDays.d7,
      raw.lessonsCompleted.d7,
      raw.recentXp.d7,
    ),
    d30: trendFromWindow(
      raw.windows.d30,
      30,
      raw.activityDays.d30,
      raw.lessonsCompleted.d30,
      raw.recentXp.d30,
    ),
    lifetime: {
      windowDays: 0,
      exerciseAccuracyPct: overallAccPct,
      vocabRetentionPct: vocabRetPct,
      grammarAccuracyPct: grammarPctVal,
      readingAccuracyPct: readingPctVal,
      quizPassRatePct: quizPassRate,
      activeDays: raw.activityDays.lifetime,
      avgSessionSeconds: raw.studyEvents.avgSessionSec30d,
      lessonsCompleted: raw.lessonsCompleted.total,
      xpTotal: raw.recentXp.lifetime,
    },
  };

  const evidenceCount =
    totalExAttempts +
    raw.vocabAttempts.total +
    raw.quizAttempts.total +
    raw.lessonsCompleted.total +
    raw.activityDays.lifetime;

  return { traits, learningStyle, difficulty, signals, trends, evidenceCount };
}

function typeAttempts(raw: RawSignals, types: string[]): number {
  return raw.perTypeAttempts
    .filter((t) => types.includes(t.type))
    .reduce((s, t) => s + t.attempts, 0);
}

function bucket(
  value: number,
  thresholds: [number, number],
  labels: [string, string, string],
): string {
  if (value < thresholds[0]) return labels[0];
  if (value < thresholds[1]) return labels[1];
  return labels[2];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function computeAdaptiveProfile(
  userId: string,
): Promise<AdaptiveProfileResult> {
  const raw = await gather(userId);
  const derived = derive(raw);
  const lastComputedAt = new Date();

  await db
    .insert(englishAdaptiveProfileTable)
    .values({
      userId,
      traits: derived.traits,
      learningStyle: derived.learningStyle,
      difficulty: derived.difficulty,
      signals: derived.signals,
      trends: derived.trends,
      evidenceCount: derived.evidenceCount,
      lastComputedAt,
    })
    .onConflictDoUpdate({
      target: englishAdaptiveProfileTable.userId,
      set: {
        traits: derived.traits,
        learningStyle: derived.learningStyle,
        difficulty: derived.difficulty,
        signals: derived.signals,
        trends: derived.trends,
        evidenceCount: derived.evidenceCount,
        lastComputedAt,
      },
    });

  return {
    userId,
    lastComputedAt: lastComputedAt.toISOString(),
    evidenceCount: derived.evidenceCount,
    traits: derived.traits,
    learningStyle: derived.learningStyle,
    difficulty: derived.difficulty,
    signals: derived.signals,
    trends: derived.trends,
  };
}

export interface GetOptions {
  maxAgeMs?: number;
  forceRecompute?: boolean;
}

export async function getOrComputeProfile(
  userId: string,
  opts: GetOptions = {},
): Promise<AdaptiveProfileResult> {
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  if (!opts.forceRecompute) {
    const rows = await db.execute(sql`
      SELECT user_id, traits, learning_style, difficulty, signals, trends,
             evidence_count, last_computed_at
        FROM english_adaptive_profile
       WHERE user_id = ${userId}
       LIMIT 1
    `);
    const row = rows.rows[0] as Record<string, unknown> | undefined;
    if (row && row.last_computed_at) {
      const ageMs = Date.now() - new Date(String(row.last_computed_at)).getTime();
      if (ageMs <= maxAgeMs) {
        return {
          userId,
          lastComputedAt: new Date(String(row.last_computed_at)).toISOString(),
          evidenceCount: Number(row.evidence_count ?? 0),
          traits: row.traits as AdaptiveTraits,
          learningStyle: row.learning_style as LearningStyle,
          difficulty: row.difficulty as DifficultyMemory,
          signals: row.signals as AdaptiveProfileResult["signals"],
          trends: row.trends as TrendsBundle,
        };
      }
    }
  }
  return computeAdaptiveProfile(userId);
}
