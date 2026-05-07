// ============================================================================
// English AI Intervention Engine — read-only adaptive intelligence over the
// curriculum + engagement data. No table writes, no schema changes, no XP
// math changes, no IELTS / Flashcards / Mentor coupling.
//
// Privacy: only educational behavior signals (streak, accuracy, completion,
// pacing). No demographics, no medical/psychological labels, no profiling.
//
// Architecture:
//   - One per-user SQL gather (`gatherSignals`) collects every numeric
//     signal we need from existing tables.
//   - JS derives interventions / recommendations / dashboard signal /
//     coaching message from those numbers — deterministic and testable.
//   - "Coaching" is template-based, parameterized by the user's actual
//     numbers (specific lesson, exercise type, streak length). This is
//     "behavior-aware" because the inputs are behavior-aware, not because
//     we delegate to an LLM. Cheap, fast, no external dependency.
//   - Activity day = UNION(english_xp_events.created_at::date,
//     english_daily_activity.date_utc) — same definition as analytics layer.
// ============================================================================

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Severity = 1 | 2 | 3 | 4 | 5; // 1=info..5=critical
export type Category =
  | "engagement"
  | "mastery"
  | "pacing"
  | "momentum"
  | "wellbeing";

export interface Intervention {
  id: string; // pattern id
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  severity: Severity;
  confidence: number; // 0..1
  category: Category;
  generatedAt: string;
  expiresAt: string;
  evidence: Record<string, number | string | null>;
}

export type RecommendationAction =
  | "review_previous_lesson"
  | "retry_exercise_type"
  | "focus_grammar"
  | "focus_reading"
  | "focus_vocabulary"
  | "easier_lesson_first"
  | "take_quiz_now"
  | "continue_streak_today"
  | "reduce_workload_temporarily"
  | "resume_lesson";

export interface Recommendation {
  action: RecommendationAction;
  title: { en: string; ar: string };
  reason: { en: string; ar: string };
  target?: { lessonId?: number; quizId?: number; exerciseType?: string };
  priority: number; // 1 (top) .. 5
}

export type DashboardSignalKind =
  | "needs_review"
  | "ready_for_quiz"
  | "high_momentum"
  | "at_risk"
  | "strong_progress"
  | "focus_recommended"
  | "getting_started";

export interface DashboardSignal {
  kind: DashboardSignalKind;
  label: { en: string; ar: string };
  tone: "positive" | "neutral" | "warning" | "critical";
}

export interface CoachingMessage {
  en: string;
  ar: string;
  tone: "encouraging" | "supportive" | "celebratory" | "actionable";
}

export interface StudentSignals {
  userId: string;
  generatedAt: string;
  raw: {
    daysInactive: number | null;
    currentStreak: number;
    xpToday: number;
    activityDays30: number;
    lessonsCompletedTotal: number;
    lessonsCompleted7d: number;
    lessonsStartedTotal: number;
    sectionsCompletedTotal: number;
    exerciseAttempts30d: number;
    exerciseAccuracyPct30d: number | null;
    fastGuessRatePct30d: number | null;
    perTypeAccuracy: Array<{
      type: string;
      attempts: number;
      accuracyPct: number;
    }>;
    repeatedFailureExercises: Array<{
      exerciseId: number;
      type: string;
      lessonId: number | null;
      fails: number;
    }>;
    abandonedLessons: Array<{
      lessonId: number;
      lessonNumber: number | null;
      bookId: number | null;
      title: string;
      sectionsDone: number;
      daysSinceLastTouch: number;
    }>;
    readyForQuiz: Array<{
      quizId: number;
      bookId: number;
      placedAfterLesson: number;
    }>;
    recentQuizzes: {
      attempts: number;
      passes: number;
      avgScorePct: number | null;
      avgDurationSec: number | null;
      fastFailCount: number;
    };
    burnoutBusyDays7d: number; // days in last 7 with >50 events
  };
  interventions: Intervention[];
  recommendations: Recommendation[];
  dashboard: DashboardSignal;
  coaching: CoachingMessage;
}

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------

function toInt(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "string" ? Number(v) : (v as number);
}
function toMaybeInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}
function pct(n: number, d: number, dp = 1): number | null {
  if (d <= 0) return null;
  const f = Math.pow(10, dp);
  return Math.round((n / d) * 100 * f) / f;
}

// ---------------------------------------------------------------------------
// Per-user gather. ONE function — one network round-trip is acceptable; the
// CTE chain is small and indexed. We avoid N+1 across user lists by paging.
// ---------------------------------------------------------------------------

async function gatherSignals(userId: string): Promise<StudentSignals["raw"]> {
  // 1. Activity / streak / momentum
  // Riyadh-civil-day boundaries (matches english-day.ts and engagement baseline).
  // Fetch distinct activity dates (UNION xp events + daily activity), derive
  // streak/inactivity/momentum in JS — avoids brittle PG date-arith CTEs.
  const daysRes = await db.execute(sql`
    SELECT DISTINCT d FROM (
      SELECT to_char(created_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD') AS d
        FROM english_xp_events WHERE user_id = ${userId}
      UNION
      SELECT to_char(date_utc, 'YYYY-MM-DD') AS d
        FROM english_daily_activity WHERE user_id = ${userId}
    ) s
    WHERE d IS NOT NULL
    ORDER BY d DESC
  `);
  const dayStrs: string[] = daysRes.rows
    .map((r) => {
      const v = (r as Record<string, unknown>).d;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return typeof v === "string" ? v.slice(0, 10) : null;
    })
    .filter((s): s is string => !!s);
  // Use Riyadh civil day for "today".
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const lastActive = dayStrs[0] ?? null;
  const msPerDay = 86_400_000;
  const dayToUtcMs = (s: string) =>
    Date.UTC(
      Number(s.slice(0, 4)),
      Number(s.slice(5, 7)) - 1,
      Number(s.slice(8, 10)),
    );
  const todayMs = dayToUtcMs(todayStr);
  const daysInactive = lastActive
    ? Math.floor((todayMs - dayToUtcMs(lastActive)) / msPerDay)
    : null;
  // Current streak: consecutive Riyadh civil days back from today (or yesterday
  // if today empty).
  let currentStreak = 0;
  if (dayStrs.length > 0) {
    const set = new Set(dayStrs);
    let cursorMs = todayMs;
    const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    if (!set.has(fmt(cursorMs))) cursorMs -= msPerDay;
    while (set.has(fmt(cursorMs))) {
      currentStreak++;
      cursorMs -= msPerDay;
    }
  }
  const cutoff30 = new Date(todayMs - 30 * msPerDay).toISOString().slice(0, 10);
  const activityDays30 = dayStrs.filter((d) => d > cutoff30).length;
  const xpTodayRes = await db.execute(sql`
    SELECT COALESCE(SUM(amount),0)::int AS xp_today
      FROM english_xp_events
     WHERE user_id = ${userId}
       AND to_char(created_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD')
           = to_char(now() AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD')
  `);
  const a: Record<string, unknown> = {
    last_active: lastActive,
    days_inactive: daysInactive,
    current_streak: currentStreak,
    activity_days_30: activityDays30,
    xp_today: (xpTodayRes.rows[0] as Record<string, unknown>)?.xp_today ?? 0,
  };

  // 2. Lessons / sections
  const lessonsRow = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM english_lesson_completions WHERE user_id = ${userId}) AS lc_total,
      (SELECT COUNT(*)::int FROM english_lesson_completions
        WHERE user_id = ${userId}
          AND completed_at >= now() - interval '7 day')                                AS lc_7d,
      (SELECT COUNT(DISTINCT lesson_id)::int FROM english_lesson_section_progress
        WHERE user_id = ${userId})                                                     AS lessons_started,
      (SELECT COUNT(*)::int FROM english_lesson_section_progress
        WHERE user_id = ${userId})                                                     AS sections_total
  `);
  const l = lessonsRow.rows[0] as Record<string, unknown>;

  // 3. Exercise attempts in last 30d (curriculum exercises only)
  const exRow = await db.execute(sql`
    WITH a AS (
      SELECT a.id, a.is_correct, a.duration_ms, e.type, e.lesson_id
        FROM english_exercise_attempts a
        JOIN english_exercises e ON e.id = a.exercise_id
       WHERE a.user_id = ${userId}
         AND e.lesson_id IS NOT NULL
         AND a.created_at >= now() - interval '30 day'
    )
    SELECT
      COUNT(*)::int                                                 AS attempts,
      SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int              AS correct,
      SUM(CASE WHEN duration_ms IS NOT NULL AND duration_ms < 3000
               AND NOT is_correct THEN 1 ELSE 0 END)::int           AS fast_wrong
      FROM a
  `);
  const ex = exRow.rows[0] as Record<string, unknown>;

  // 3b. Per-type accuracy in last 30d
  const perTypeRows = await db.execute(sql`
    SELECT e.type,
           COUNT(*)::int                                       AS attempts,
           SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int  AS correct
      FROM english_exercise_attempts a
      JOIN english_exercises e ON e.id = a.exercise_id
     WHERE a.user_id = ${userId}
       AND e.lesson_id IS NOT NULL
       AND a.created_at >= now() - interval '30 day'
     GROUP BY e.type
     ORDER BY e.type
  `);

  // 4. Repeated-failure exercises (≥3 wrong, no subsequent correct, last 60d)
  const rfRows = await db.execute(sql`
    WITH attempts AS (
      SELECT a.exercise_id, a.is_correct, a.created_at, e.type, e.lesson_id
        FROM english_exercise_attempts a
        JOIN english_exercises e ON e.id = a.exercise_id
       WHERE a.user_id = ${userId}
         AND e.lesson_id IS NOT NULL
         AND a.created_at >= now() - interval '60 day'
    ),
    per AS (
      SELECT exercise_id,
             SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END)::int AS fails,
             MAX(CASE WHEN is_correct THEN created_at END)        AS last_correct,
             MAX(CASE WHEN NOT is_correct THEN created_at END)    AS last_fail
        FROM attempts GROUP BY exercise_id
    )
    SELECT p.exercise_id, p.fails, e.type, e.lesson_id
      FROM per p
      JOIN english_exercises e ON e.id = p.exercise_id
     WHERE p.fails >= 3
       AND (p.last_correct IS NULL OR p.last_correct < p.last_fail)
     ORDER BY p.fails DESC
     LIMIT 10
  `);

  // 5. Abandoned lessons (started, sections < 6, last touch ≥ 7d, no completion)
  const abRows = await db.execute(sql`
    WITH per_lesson AS (
      SELECT p.lesson_id,
             COUNT(*)::int             AS sections_done,
             MAX(p.completed_at)       AS last_touch
        FROM english_lesson_section_progress p
       WHERE p.user_id = ${userId}
       GROUP BY p.lesson_id
    )
    SELECT pl.lesson_id, pl.sections_done,
           (EXTRACT(EPOCH FROM (now() - pl.last_touch)) / 86400)::int AS days_since,
           l.lesson_number, l.book_id, l.title
      FROM per_lesson pl
      JOIN english_lessons l ON l.id = pl.lesson_id
     WHERE pl.sections_done < 6
       AND pl.last_touch <= now() - interval '7 day'
       AND NOT EXISTS (
         SELECT 1 FROM english_lesson_completions c
          WHERE c.user_id = ${userId} AND c.lesson_id = pl.lesson_id
       )
     ORDER BY pl.last_touch DESC
     LIMIT 5
  `);

  // 6. Ready-for-quiz: completed lessons that satisfy a quiz anchor and the
  //    user has NOT yet passed that quiz.
  const rqRows = await db.execute(sql`
    SELECT q.id AS quiz_id, q.book_id, q.placed_after_lesson
      FROM english_quizzes q
      JOIN english_lessons l
        ON l.book_id = q.book_id AND l.lesson_number = q.placed_after_lesson
      JOIN english_lesson_completions c
        ON c.user_id = ${userId} AND c.lesson_id = l.id
     WHERE NOT EXISTS (
       SELECT 1 FROM english_quiz_attempts qa
        WHERE qa.user_id = ${userId} AND qa.quiz_id = q.id
          AND qa.submitted_at IS NOT NULL AND qa.passed
     )
     ORDER BY q.book_id, q.placed_after_lesson
     LIMIT 5
  `);

  // 7. Recent quizzes (last 30d) for anxiety / fast-fail signal
  const qRow = await db.execute(sql`
    SELECT
      COUNT(*)::int                                              AS attempts,
      SUM(CASE WHEN passed THEN 1 ELSE 0 END)::int               AS passes,
      AVG(score_pct)::numeric(6,2)                               AS avg_score,
      AVG(EXTRACT(EPOCH FROM (submitted_at - started_at)))::numeric(10,2) AS avg_dur_sec,
      SUM(CASE WHEN NOT passed
                AND EXTRACT(EPOCH FROM (submitted_at - started_at)) < 60
                THEN 1 ELSE 0 END)::int                          AS fast_fail
      FROM english_quiz_attempts
     WHERE user_id = ${userId}
       AND submitted_at IS NOT NULL
       AND submitted_at >= now() - interval '30 day'
  `);
  const q = qRow.rows[0] as Record<string, unknown>;

  // 8. Burnout: days in last 7 with > 50 XP-bearing events
  const bRow = await db.execute(sql`
    SELECT COUNT(*)::int AS busy_days FROM (
      SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS c
        FROM english_xp_events
       WHERE user_id = ${userId}
         AND created_at >= now() - interval '7 day'
       GROUP BY 1
      HAVING COUNT(*) > 50
    ) x
  `);
  const b = bRow.rows[0] as Record<string, unknown>;

  // assemble
  const exA = toInt(ex.attempts);
  const exC = toInt(ex.correct);

  return {
    daysInactive: toMaybeInt(a.days_inactive),
    currentStreak: toInt(a.current_streak),
    xpToday: toInt(a.xp_today),
    activityDays30: toInt(a.activity_days_30),
    lessonsCompletedTotal: toInt(l.lc_total),
    lessonsCompleted7d: toInt(l.lc_7d),
    lessonsStartedTotal: toInt(l.lessons_started),
    sectionsCompletedTotal: toInt(l.sections_total),
    exerciseAttempts30d: exA,
    exerciseAccuracyPct30d: pct(exC, exA),
    fastGuessRatePct30d: pct(toInt(ex.fast_wrong), exA),
    perTypeAccuracy: perTypeRows.rows.map((r) => {
      const row = r as Record<string, unknown>;
      const at = toInt(row.attempts);
      const co = toInt(row.correct);
      return {
        type: String(row.type),
        attempts: at,
        accuracyPct: pct(co, at) ?? 0,
      };
    }),
    repeatedFailureExercises: rfRows.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        exerciseId: toInt(row.exercise_id),
        type: String(row.type),
        lessonId: toMaybeInt(row.lesson_id),
        fails: toInt(row.fails),
      };
    }),
    abandonedLessons: abRows.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        lessonId: toInt(row.lesson_id),
        lessonNumber: toMaybeInt(row.lesson_number),
        bookId: toMaybeInt(row.book_id),
        title: String(row.title ?? ""),
        sectionsDone: toInt(row.sections_done),
        daysSinceLastTouch: toInt(row.days_since),
      };
    }),
    readyForQuiz: rqRows.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        quizId: toInt(row.quiz_id),
        bookId: toInt(row.book_id),
        placedAfterLesson: toInt(row.placed_after_lesson),
      };
    }),
    recentQuizzes: {
      attempts: toInt(q.attempts),
      passes: toInt(q.passes),
      avgScorePct: toMaybeInt(q.avg_score),
      avgDurationSec: toMaybeInt(q.avg_dur_sec),
      fastFailCount: toInt(q.fast_fail),
    },
    burnoutBusyDays7d: toInt(b.busy_days),
  };
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function expiresFor(severity: Severity, now: number): string {
  // Higher severity = check more often.
  const ms = severity >= 4 ? 12 * HOUR : severity === 3 ? 1 * DAY : 3 * DAY;
  return new Date(now + ms).toISOString();
}

function deriveInterventions(
  raw: StudentSignals["raw"],
  now: number,
): Intervention[] {
  const out: Intervention[] = [];
  const ts = new Date(now).toISOString();

  // long inactivity
  if (raw.daysInactive !== null && raw.daysInactive >= 7) {
    const sev: Severity = raw.daysInactive >= 14 ? 5 : 4;
    out.push({
      id: "long_inactivity",
      title: { en: "You've been away", ar: "انقطعت لفترة" },
      description: {
        en: `It's been ${raw.daysInactive} days since your last study session. A short comeback lesson is a great way to restart.`,
        ar: `مر ${raw.daysInactive} يوماً منذ آخر جلسة دراسة. درس قصير للعودة هو طريقة رائعة للبدء من جديد.`,
      },
      severity: sev,
      confidence: 0.95,
      category: "engagement",
      generatedAt: ts,
      expiresAt: expiresFor(sev, now),
      evidence: { daysInactive: raw.daysInactive },
    });
  }

  // low streak (active recently but streak broken)
  if (
    raw.currentStreak === 0 &&
    raw.daysInactive !== null &&
    raw.daysInactive >= 1 &&
    raw.daysInactive <= 6 &&
    raw.activityDays30 >= 3
  ) {
    out.push({
      id: "low_streak_consistency",
      title: { en: "Keep your streak alive", ar: "حافظ على سلسلتك" },
      description: {
        en: "A 5-minute session today brings your streak back. Consistency beats intensity.",
        ar: "جلسة من 5 دقائق اليوم تعيد سلسلتك. الاستمرار أهم من الكثافة.",
      },
      severity: 2,
      confidence: 0.7,
      category: "momentum",
      generatedAt: ts,
      expiresAt: expiresFor(2, now),
      evidence: {
        daysInactive: raw.daysInactive,
        activityDays30: raw.activityDays30,
      },
    });
  }

  // repeated exercise failure
  if (raw.repeatedFailureExercises.length >= 1) {
    const top = raw.repeatedFailureExercises[0]!;
    out.push({
      id: "repeated_exercise_failure",
      title: { en: "A few questions are stuck", ar: "بعض الأسئلة عالقة" },
      description: {
        en: `You've tried this exercise ${top.fails} times without success. Reviewing the lesson section may unlock it.`,
        ar: `حاولت هذا التمرين ${top.fails} مرات دون نجاح. مراجعة قسم الدرس قد تساعدك.`,
      },
      severity: 3,
      confidence: 0.85,
      category: "mastery",
      generatedAt: ts,
      expiresAt: expiresFor(3, now),
      evidence: {
        exerciseId: top.exerciseId,
        type: top.type,
        fails: top.fails,
        lessonId: top.lessonId,
      },
    });
  }

  // weak grammar (fill_blank + sentence_build proxies)
  const grammarTypes = new Set(["fill_blank", "sentence_build"]);
  const grammar = raw.perTypeAccuracy.filter((p) => grammarTypes.has(p.type));
  const grammarA = grammar.reduce((s, p) => s + p.attempts, 0);
  const grammarC = grammar.reduce(
    (s, p) => s + Math.round((p.accuracyPct / 100) * p.attempts),
    0,
  );
  const grammarPct = pct(grammarC, grammarA);
  if (grammarA >= 5 && grammarPct !== null && grammarPct < 60) {
    out.push({
      id: "weak_grammar",
      title: { en: "Grammar needs attention", ar: "القواعد تحتاج تركيزاً" },
      description: {
        en: `Your grammar accuracy is ${grammarPct}% over ${grammarA} recent attempts. Slow down on fill-in-the-blanks and sentence-building.`,
        ar: `دقتك في القواعد ${grammarPct}% خلال ${grammarA} محاولة. خذ وقتك في تمارين الفراغات وبناء الجمل.`,
      },
      severity: 3,
      confidence: 0.8,
      category: "mastery",
      generatedAt: ts,
      expiresAt: expiresFor(3, now),
      evidence: { accuracyPct: grammarPct, attempts: grammarA },
    });
  }

  // weak vocabulary retention
  const vocab = raw.perTypeAccuracy.find((p) => p.type === "vocabulary_recall");
  if (vocab && vocab.attempts >= 5 && vocab.accuracyPct < 60) {
    out.push({
      id: "weak_vocabulary_retention",
      title: { en: "Vocabulary fading", ar: "ضعف في تذكر المفردات" },
      description: {
        en: `Vocabulary recall is ${vocab.accuracyPct}% over ${vocab.attempts} attempts. A short vocab review will help.`,
        ar: `تذكر المفردات ${vocab.accuracyPct}% في ${vocab.attempts} محاولة. مراجعة قصيرة للمفردات ستساعدك.`,
      },
      severity: 3,
      confidence: 0.8,
      category: "mastery",
      generatedAt: ts,
      expiresAt: expiresFor(3, now),
      evidence: {
        accuracyPct: vocab.accuracyPct,
        attempts: vocab.attempts,
      },
    });
  }

  // weak reading
  const reading = raw.perTypeAccuracy.find((p) => p.type === "reading_check");
  if (reading && reading.attempts >= 5 && reading.accuracyPct < 60) {
    out.push({
      id: "weak_reading",
      title: { en: "Reading needs practice", ar: "القراءة تحتاج تدريباً" },
      description: {
        en: `Reading check accuracy is ${reading.accuracyPct}% — re-read the short story before answering.`,
        ar: `دقة القراءة ${reading.accuracyPct}% — أعد قراءة القصة قبل الإجابة.`,
      },
      severity: 2,
      confidence: 0.75,
      category: "mastery",
      generatedAt: ts,
      expiresAt: expiresFor(2, now),
      evidence: {
        accuracyPct: reading.accuracyPct,
        attempts: reading.attempts,
      },
    });
  }

  // fast guessing
  if (
    raw.exerciseAttempts30d >= 10 &&
    raw.fastGuessRatePct30d !== null &&
    raw.fastGuessRatePct30d >= 25
  ) {
    out.push({
      id: "fast_guessing",
      title: { en: "Slow down a little", ar: "خذ وقتك" },
      description: {
        en: `${raw.fastGuessRatePct30d}% of your wrong answers came in under 3 seconds — read the question once more before tapping.`,
        ar: `${raw.fastGuessRatePct30d}% من إجاباتك الخاطئة جاءت في أقل من 3 ثوانٍ — اقرأ السؤال مرة أخرى قبل الضغط.`,
      },
      severity: 2,
      confidence: 0.7,
      category: "pacing",
      generatedAt: ts,
      expiresAt: expiresFor(2, now),
      evidence: { fastGuessRatePct: raw.fastGuessRatePct30d },
    });
  }

  // lesson abandonment
  if (raw.abandonedLessons.length >= 1) {
    const top = raw.abandonedLessons[0]!;
    out.push({
      id: "lesson_abandonment",
      title: { en: "Pick up where you left off", ar: "أكمل من حيث توقفت" },
      description: {
        en: `Lesson "${top.title}" is ${top.sectionsDone}/6 done and last touched ${top.daysSinceLastTouch} days ago.`,
        ar: `الدرس "${top.title}" أكملت منه ${top.sectionsDone}/6 آخر مرة منذ ${top.daysSinceLastTouch} يوم.`,
      },
      severity: 3,
      confidence: 0.9,
      category: "pacing",
      generatedAt: ts,
      expiresAt: expiresFor(3, now),
      evidence: {
        lessonId: top.lessonId,
        sectionsDone: top.sectionsDone,
        daysSinceLastTouch: top.daysSinceLastTouch,
      },
    });
  }

  // quiz anxiety: ≥2 attempts where answered fast and failed
  if (
    raw.recentQuizzes.attempts >= 2 &&
    raw.recentQuizzes.fastFailCount >= 2
  ) {
    out.push({
      id: "quiz_anxiety",
      title: { en: "Take your time on quizzes", ar: "خذ وقتك في الاختبارات" },
      description: {
        en: `You've submitted ${raw.recentQuizzes.fastFailCount} quizzes in under a minute and not passed. There's no time pressure — read every question.`,
        ar: `قدمت ${raw.recentQuizzes.fastFailCount} اختبار في أقل من دقيقة دون نجاح. لا يوجد ضغط زمني — اقرأ كل سؤال.`,
      },
      severity: 3,
      confidence: 0.7,
      category: "wellbeing",
      generatedAt: ts,
      expiresAt: expiresFor(3, now),
      evidence: {
        fastFailCount: raw.recentQuizzes.fastFailCount,
        attempts: raw.recentQuizzes.attempts,
      },
    });
  }

  // burnout risk: 3+ days in last week with > 50 events
  if (raw.burnoutBusyDays7d >= 3) {
    out.push({
      id: "burnout_risk",
      title: { en: "Pace yourself", ar: "وزّع جهدك" },
      description: {
        en: `You've had ${raw.burnoutBusyDays7d} very intense study days this week. Short, regular sessions retain more than long marathons.`,
        ar: `كان لديك ${raw.burnoutBusyDays7d} أيام دراسة مكثفة هذا الأسبوع. الجلسات القصيرة المنتظمة تثبت المعلومات أكثر من الجلسات الطويلة.`,
      },
      severity: 2,
      confidence: 0.6,
      category: "wellbeing",
      generatedAt: ts,
      expiresAt: expiresFor(2, now),
      evidence: { busyDays: raw.burnoutBusyDays7d },
    });
  }

  // Sort by severity desc then confidence desc
  out.sort(
    (a, b) => b.severity - a.severity || b.confidence - a.confidence,
  );
  return out;
}

function deriveRecommendations(
  raw: StudentSignals["raw"],
  interventions: Intervention[],
): Recommendation[] {
  const out: Recommendation[] = [];
  const has = (id: string) => interventions.some((i) => i.id === id);

  // Highest priority first
  if (raw.readyForQuiz.length > 0) {
    const q = raw.readyForQuiz[0]!;
    out.push({
      action: "take_quiz_now",
      title: { en: "Take Quiz", ar: "خذ الاختبار" },
      reason: {
        en: `You've completed lesson ${q.placedAfterLesson} — the book quiz is ready.`,
        ar: `أكملت الدرس ${q.placedAfterLesson} — اختبار الكتاب جاهز.`,
      },
      target: { quizId: q.quizId },
      priority: 1,
    });
  }

  if (has("repeated_exercise_failure")) {
    const top = raw.repeatedFailureExercises[0]!;
    out.push({
      action: "review_previous_lesson",
      title: { en: "Review the lesson", ar: "راجع الدرس" },
      reason: {
        en: `Re-reading the section before retrying often unlocks stuck exercises.`,
        ar: `إعادة قراءة قسم الدرس غالباً تفتح التمارين العالقة.`,
      },
      target: top.lessonId ? { lessonId: top.lessonId } : undefined,
      priority: 2,
    });
    out.push({
      action: "retry_exercise_type",
      title: { en: "Retry exercise", ar: "أعد المحاولة" },
      reason: {
        en: `Try ${top.type.replace("_", " ")} again after a short break.`,
        ar: `جرب ${top.type.replace("_", " ")} مرة أخرى بعد استراحة قصيرة.`,
      },
      target: { exerciseType: top.type },
      priority: 3,
    });
  }

  if (raw.abandonedLessons.length > 0) {
    const top = raw.abandonedLessons[0]!;
    out.push({
      action: "resume_lesson",
      title: { en: "Resume lesson", ar: "أكمل الدرس" },
      reason: {
        en: `${top.sectionsDone}/6 sections complete on "${top.title}".`,
        ar: `${top.sectionsDone}/6 أقسام مكتملة في "${top.title}".`,
      },
      target: { lessonId: top.lessonId },
      priority: 2,
    });
  }

  if (has("weak_grammar")) {
    out.push({
      action: "focus_grammar",
      title: { en: "Focus on grammar", ar: "ركز على القواعد" },
      reason: {
        en: "Grammar accuracy is the lowest right now.",
        ar: "دقة القواعد هي الأقل حالياً.",
      },
      priority: 3,
    });
  }
  if (has("weak_vocabulary_retention")) {
    out.push({
      action: "focus_vocabulary",
      title: { en: "Focus on vocabulary", ar: "ركز على المفردات" },
      reason: {
        en: "Vocabulary recall needs more practice.",
        ar: "تذكر المفردات يحتاج المزيد من التدريب.",
      },
      priority: 3,
    });
  }
  if (has("weak_reading")) {
    out.push({
      action: "focus_reading",
      title: { en: "Practice reading", ar: "تدرب على القراءة" },
      reason: {
        en: "Re-read the story before each reading-check question.",
        ar: "أعد قراءة القصة قبل كل سؤال قراءة.",
      },
      priority: 4,
    });
  }

  if (
    has("long_inactivity") ||
    (raw.daysInactive !== null && raw.daysInactive >= 7)
  ) {
    out.push({
      action: "easier_lesson_first",
      title: { en: "Start with an easier lesson", ar: "ابدأ بدرس أسهل" },
      reason: {
        en: "Re-entry is smoother on a familiar lesson.",
        ar: "العودة أسهل على درس مألوف.",
      },
      priority: 2,
    });
  }

  if (has("low_streak_consistency")) {
    out.push({
      action: "continue_streak_today",
      title: { en: "5-minute session today", ar: "جلسة 5 دقائق اليوم" },
      reason: {
        en: "Short and steady restores momentum.",
        ar: "القصير المنتظم يستعيد الزخم.",
      },
      priority: 2,
    });
  }

  if (has("burnout_risk")) {
    out.push({
      action: "reduce_workload_temporarily",
      title: { en: "Take it lighter today", ar: "خفف اليوم" },
      reason: {
        en: "Recovery time is part of learning.",
        ar: "وقت الراحة جزء من التعلم.",
      },
      priority: 4,
    });
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

function deriveDashboardSignal(
  raw: StudentSignals["raw"],
  interventions: Intervention[],
): DashboardSignal {
  const top = interventions[0];

  // No data yet
  if (
    raw.lessonsStartedTotal === 0 &&
    raw.exerciseAttempts30d === 0 &&
    raw.activityDays30 === 0
  ) {
    return {
      kind: "getting_started",
      label: { en: "Getting Started", ar: "البداية" },
      tone: "neutral",
    };
  }

  if (top && top.severity >= 4) {
    return {
      kind: "at_risk",
      label: { en: "At Risk", ar: "في خطر" },
      tone: "critical",
    };
  }

  if (raw.readyForQuiz.length > 0) {
    return {
      kind: "ready_for_quiz",
      label: { en: "Ready for Quiz", ar: "جاهز للاختبار" },
      tone: "positive",
    };
  }

  if (raw.currentStreak >= 7 && raw.lessonsCompleted7d >= 3) {
    return {
      kind: "high_momentum",
      label: { en: "High Momentum", ar: "زخم عالٍ" },
      tone: "positive",
    };
  }

  if (
    interventions.some(
      (i) =>
        i.id === "weak_grammar" ||
        i.id === "weak_vocabulary_retention" ||
        i.id === "weak_reading" ||
        i.id === "repeated_exercise_failure",
    )
  ) {
    return {
      kind: "needs_review",
      label: { en: "Needs Review", ar: "يحتاج مراجعة" },
      tone: "warning",
    };
  }

  if (top && top.severity === 3) {
    return {
      kind: "focus_recommended",
      label: { en: "Focus Recommended", ar: "التركيز موصى به" },
      tone: "warning",
    };
  }

  return {
    kind: "strong_progress",
    label: { en: "Strong Progress", ar: "تقدم قوي" },
    tone: "positive",
  };
}

function deriveCoaching(
  raw: StudentSignals["raw"],
  interventions: Intervention[],
  dashboard: DashboardSignal,
): CoachingMessage {
  const top = interventions[0];
  const acc = raw.exerciseAccuracyPct30d;
  const streak = raw.currentStreak;

  // Celebratory: high momentum
  if (dashboard.kind === "high_momentum") {
    return {
      en: `${streak}-day streak and ${raw.lessonsCompleted7d} lessons this week — you're in the zone. Keep the same pace tomorrow.`,
      ar: `سلسلة ${streak} أيام و${raw.lessonsCompleted7d} درس هذا الأسبوع — أنت في القمة. حافظ على نفس الإيقاع غداً.`,
      tone: "celebratory",
    };
  }

  // Strong progress, no issues
  if (dashboard.kind === "strong_progress") {
    const accStr = acc !== null ? `${acc}%` : "solid";
    return {
      en: `Accuracy is ${accStr} and ${raw.lessonsCompletedTotal} lessons done. Steady wins this race — one more lesson today?`,
      ar: `الدقة ${accStr} وأكملت ${raw.lessonsCompletedTotal} درس. الاستمرار هو المفتاح — درس آخر اليوم؟`,
      tone: "encouraging",
    };
  }

  // Ready for quiz
  if (dashboard.kind === "ready_for_quiz") {
    return {
      en: `You've earned a quiz attempt. Don't rush — read each question twice and you'll do well.`,
      ar: `استحققت محاولة اختبار. لا تستعجل — اقرأ كل سؤال مرتين وستنجح.`,
      tone: "actionable",
    };
  }

  // At risk / inactivity
  if (
    top &&
    (top.id === "long_inactivity" || dashboard.kind === "at_risk")
  ) {
    const days = raw.daysInactive ?? 0;
    return {
      en: `It's been ${days} days. A 5-minute lesson today is enough to come back — no pressure to catch up.`,
      ar: `مرت ${days} أيام. درس من 5 دقائق اليوم كافٍ للعودة — لا داعي للقلق من اللحاق.`,
      tone: "supportive",
    };
  }

  // Repeated failure / mastery issue
  if (
    top &&
    (top.id === "repeated_exercise_failure" ||
      top.id === "weak_grammar" ||
      top.id === "weak_vocabulary_retention" ||
      top.id === "weak_reading")
  ) {
    return {
      en: `Mistakes are data, not setbacks. Re-read the section, then try again — most stuck exercises clear on the next attempt.`,
      ar: `الأخطاء معلومات، ليست تراجعاً. أعد قراءة القسم ثم حاول — معظم التمارين العالقة تُحَل في المحاولة التالية.`,
      tone: "supportive",
    };
  }

  // Burnout
  if (top && top.id === "burnout_risk") {
    return {
      en: `Heavy week. Tomorrow, do half — your brain consolidates during rest. You'll come back sharper.`,
      ar: `أسبوع مكثف. غداً، اعمل النصف فقط — دماغك يثبّت المعلومات وقت الراحة. ستعود أقوى.`,
      tone: "supportive",
    };
  }

  // Default: getting started or focus
  return {
    en: `Open one lesson today and finish at least one section. Small steps compound — that's how fluency happens.`,
    ar: `افتح درساً واحداً اليوم وأنهِ قسماً واحداً على الأقل. الخطوات الصغيرة تتراكم — هكذا تأتي الطلاقة.`,
    tone: "encouraging",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function computeStudentSignals(
  userId: string,
): Promise<StudentSignals> {
  const now = Date.now();
  const raw = await gatherSignals(userId);
  const interventions = deriveInterventions(raw, now);
  const recommendations = deriveRecommendations(raw, interventions);
  const dashboard = deriveDashboardSignal(raw, interventions);
  const coaching = deriveCoaching(raw, interventions, dashboard);
  return {
    userId,
    generatedAt: new Date(now).toISOString(),
    raw,
    interventions,
    recommendations,
    dashboard,
    coaching,
  };
}
