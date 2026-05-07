// ============================================================================
// English Learning Analytics — admin-only read-only aggregations.
//
// Strict scope rules (locked):
//   * READ ONLY. No table writes, no schema changes, no XP math changes.
//   * No IELTS / Mentor-tool / Flashcards-only writes are touched.
//   * All endpoints gated by `requireAdmin`.
//   * Aggregation lives in SQL (curriculum dataset is small but indexed); we
//     never duplicate data into rollup tables.
//   * Curriculum activity does NOT populate `english_daily_activity`, so any
//     "active day" / DAU / streak metric derives from a UNION of:
//        - english_xp_events.created_at  (every curriculum XP-bearing event)
//        - english_daily_activity.date_utc  (vocab/session activity)
//     This keeps the metric accurate for curriculum-only learners AND the
//     legacy English Dashboard learners.
//   * "Curriculum exercise" = `english_exercises.lesson_id IS NOT NULL`. The
//     legacy dashboard exercises (lesson_id NULL) are excluded from
//     curriculum-scoped accuracy/skill metrics.
// ============================================================================

import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Shared input parsers
// ---------------------------------------------------------------------------
const PaginationQ = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const RiskQ = z.object({
  inactiveDays: z.coerce.number().int().min(2).max(365).default(14),
  dropoutWindowDays: z.coerce.number().int().min(2).max(180).default(30),
  dropoutSilenceDays: z.coerce.number().int().min(1).max(60).default(7),
  strugglingMinAttempts: z.coerce.number().int().min(1).max(500).default(10),
  strugglingAccuracyPct: z.coerce.number().int().min(1).max(99).default(50),
  stuckLessonDays: z.coerce.number().int().min(1).max(60).default(7),
  repeatedFailuresMin: z.coerce.number().int().min(2).max(20).default(2),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pure SQL fragment for "date the user was active" derived from XP ledger
 * + daily activity rollup. UTC day buckets.
 */
const ACTIVITY_DAYS_CTE = sql`
  activity_days AS (
    SELECT user_id, (created_at AT TIME ZONE 'UTC')::date AS d
      FROM english_xp_events
    UNION
    SELECT user_id, date_utc AS d
      FROM english_daily_activity
  )
`;

function asInt(v: unknown): number {
  return typeof v === "string" ? Number(v) : (v as number) ?? 0;
}
function asNum(v: unknown): number {
  return typeof v === "string" ? Number(v) : (v as number) ?? 0;
}
function asMaybeInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

// ===========================================================================
// 1. /admin/english/analytics/overview — engagement KPIs
// ===========================================================================
router.get(
  "/admin/english/analytics/overview",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const rows = await db.execute(sql`
        WITH ${ACTIVITY_DAYS_CTE},
        scope AS (
          SELECT DISTINCT user_id FROM activity_days
        ),
        windowed AS (
          SELECT
            COUNT(DISTINCT user_id) FILTER (WHERE d = (now() AT TIME ZONE 'UTC')::date) AS dau,
            COUNT(DISTINCT user_id) FILTER (WHERE d >= (now() AT TIME ZONE 'UTC')::date - INTERVAL '6 day') AS wau,
            COUNT(DISTINCT user_id) FILTER (WHERE d >= (now() AT TIME ZONE 'UTC')::date - INTERVAL '29 day') AS mau
          FROM activity_days
        )
        SELECT
          (SELECT COUNT(*)::text FROM english_enrollments WHERE status = 'active') AS active_enrollments,
          (SELECT COUNT(DISTINCT user_id)::text FROM english_enrollments WHERE status = 'active') AS active_enrolled_students,
          (SELECT COUNT(*)::text FROM scope) AS active_learners_alltime,
          (SELECT dau::text FROM windowed) AS dau,
          (SELECT wau::text FROM windowed) AS wau,
          (SELECT mau::text FROM windowed) AS mau,
          (SELECT COUNT(*)::text FROM english_lesson_completions) AS lessons_completed_total,
          (SELECT COUNT(*)::text FROM english_lesson_section_progress) AS sections_completed_total,
          (SELECT COUNT(*)::text FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
             WHERE e.lesson_id IS NOT NULL) AS exercise_attempts_total,
          (SELECT COUNT(*)::text FROM english_quiz_attempts WHERE submitted_at IS NOT NULL) AS quiz_attempts_total,
          (SELECT COUNT(*)::text FROM english_quiz_attempts WHERE submitted_at IS NOT NULL AND passed = true) AS quiz_passes_total,
          (SELECT COALESCE(SUM(amount), 0)::text FROM english_xp_events) AS xp_awarded_total
      `);
      const r = rows.rows[0] as Record<string, string>;

      // Daily active users for the last 30 UTC days, zero-filled.
      const dailyRows = await db.execute(sql`
        WITH ${ACTIVITY_DAYS_CTE},
        days AS (
          SELECT generate_series(
            (now() AT TIME ZONE 'UTC')::date - INTERVAL '29 day',
            (now() AT TIME ZONE 'UTC')::date,
            INTERVAL '1 day'
          )::date AS d
        )
        SELECT to_char(days.d, 'YYYY-MM-DD') AS date,
               COUNT(DISTINCT a.user_id)::text AS active_users
          FROM days
          LEFT JOIN activity_days a ON a.d = days.d
          GROUP BY days.d
          ORDER BY days.d ASC
      `);
      const daily = dailyRows.rows.map((row) => ({
        date: (row as { date: string }).date,
        activeUsers: asInt((row as { active_users: string }).active_users),
      }));

      // XP distribution (per user totals, bucketed) — gives the admin a
      // sense of how the audience is distributed across milestones.
      const xpRows = await db.execute(sql`
        WITH per_user AS (
          SELECT user_id, COALESCE(SUM(amount), 0)::int AS total
            FROM english_xp_events GROUP BY user_id
        )
        SELECT
          COUNT(*) FILTER (WHERE total < 100)                        AS b_lt_100,
          COUNT(*) FILTER (WHERE total >= 100  AND total < 500)      AS b_100_500,
          COUNT(*) FILTER (WHERE total >= 500  AND total < 1000)     AS b_500_1k,
          COUNT(*) FILTER (WHERE total >= 1000 AND total < 5000)     AS b_1k_5k,
          COUNT(*) FILTER (WHERE total >= 5000)                       AS b_gte_5k
        FROM per_user
      `);
      const xpBucket = xpRows.rows[0] as Record<string, string | number>;

      // Lessons-completed distribution per user.
      const compRows = await db.execute(sql`
        WITH per_user AS (
          SELECT user_id, COUNT(*)::int AS total
            FROM english_lesson_completions GROUP BY user_id
        )
        SELECT
          COUNT(*) FILTER (WHERE total = 0)                            AS b_0,
          COUNT(*) FILTER (WHERE total >= 1  AND total <= 5)           AS b_1_5,
          COUNT(*) FILTER (WHERE total >= 6  AND total <= 15)          AS b_6_15,
          COUNT(*) FILTER (WHERE total >= 16 AND total <= 30)          AS b_16_30,
          COUNT(*) FILTER (WHERE total >  30)                          AS b_gt_30
        FROM per_user
      `);
      const compBucket = compRows.rows[0] as Record<string, string | number>;

      // Streak distribution: compute current streak per user (consecutive
      // days ending today with activity).
      const streakRows = await db.execute(sql`
        WITH ${ACTIVITY_DAYS_CTE},
        with_today AS (
          SELECT user_id, d FROM activity_days
        ),
        ranked AS (
          SELECT user_id, d,
            d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::int AS grp
          FROM with_today
        ),
        runs AS (
          SELECT user_id, MAX(d) AS run_end, COUNT(*)::int AS len
          FROM ranked GROUP BY user_id, grp
        ),
        current AS (
          SELECT user_id, len
          FROM runs
          WHERE run_end = (now() AT TIME ZONE 'UTC')::date
        )
        SELECT
          COUNT(*) FILTER (WHERE len = 0)                      AS b_0,
          COUNT(*) FILTER (WHERE len BETWEEN 1 AND 2)          AS b_1_2,
          COUNT(*) FILTER (WHERE len BETWEEN 3 AND 6)          AS b_3_6,
          COUNT(*) FILTER (WHERE len BETWEEN 7 AND 13)         AS b_7_13,
          COUNT(*) FILTER (WHERE len BETWEEN 14 AND 29)        AS b_14_29,
          COUNT(*) FILTER (WHERE len >= 30)                    AS b_gte_30
        FROM current
      `);
      const streakBucket = streakRows.rows[0] as Record<string, string | number>;

      // D1 / D7 retention: cohort = users whose first activity day was
      // exactly N days ago; retained = they had activity on day cohort+1
      // and within 7 days respectively.
      const retentionRows = await db.execute(sql`
        WITH ${ACTIVITY_DAYS_CTE},
        firsts AS (
          SELECT user_id, MIN(d) AS first_day FROM activity_days GROUP BY user_id
        )
        SELECT
          (SELECT COUNT(*) FROM firsts
            WHERE first_day = (now() AT TIME ZONE 'UTC')::date - INTERVAL '1 day')::int  AS d1_cohort,
          (SELECT COUNT(*) FROM firsts f
            WHERE f.first_day = (now() AT TIME ZONE 'UTC')::date - INTERVAL '1 day'
              AND EXISTS (SELECT 1 FROM activity_days a
                            WHERE a.user_id = f.user_id
                              AND a.d = f.first_day + 1))::int  AS d1_retained,
          (SELECT COUNT(*) FROM firsts
            WHERE first_day BETWEEN (now() AT TIME ZONE 'UTC')::date - INTERVAL '14 day'
                                AND (now() AT TIME ZONE 'UTC')::date - INTERVAL '7 day')::int  AS d7_cohort,
          (SELECT COUNT(*) FROM firsts f
            WHERE f.first_day BETWEEN (now() AT TIME ZONE 'UTC')::date - INTERVAL '14 day'
                                  AND (now() AT TIME ZONE 'UTC')::date - INTERVAL '7 day'
              AND EXISTS (SELECT 1 FROM activity_days a
                            WHERE a.user_id = f.user_id
                              AND a.d BETWEEN f.first_day + 1 AND f.first_day + 7))::int  AS d7_retained
      `);
      const ret = retentionRows.rows[0] as Record<string, number>;

      res.json({
        totals: {
          activeEnrollments: asInt(r.active_enrollments),
          activeEnrolledStudents: asInt(r.active_enrolled_students),
          activeLearnersAllTime: asInt(r.active_learners_alltime),
          lessonsCompleted: asInt(r.lessons_completed_total),
          sectionsCompleted: asInt(r.sections_completed_total),
          exerciseAttempts: asInt(r.exercise_attempts_total),
          quizAttempts: asInt(r.quiz_attempts_total),
          quizPasses: asInt(r.quiz_passes_total),
          xpAwarded: asInt(r.xp_awarded_total),
        },
        active: {
          dau: asInt(r.dau),
          wau: asInt(r.wau),
          mau: asInt(r.mau),
        },
        dailyActiveUsers30: daily,
        retention: {
          d1: {
            cohort: asInt(ret.d1_cohort),
            retained: asInt(ret.d1_retained),
            rate:
              asInt(ret.d1_cohort) > 0
                ? asInt(ret.d1_retained) / asInt(ret.d1_cohort)
                : 0,
          },
          d7: {
            cohort: asInt(ret.d7_cohort),
            retained: asInt(ret.d7_retained),
            rate:
              asInt(ret.d7_cohort) > 0
                ? asInt(ret.d7_retained) / asInt(ret.d7_cohort)
                : 0,
          },
        },
        xpDistribution: {
          lt100: asInt(xpBucket.b_lt_100),
          x100to500: asInt(xpBucket.b_100_500),
          x500to1k: asInt(xpBucket.b_500_1k),
          x1kTo5k: asInt(xpBucket.b_1k_5k),
          gte5k: asInt(xpBucket.b_gte_5k),
        },
        completionDistribution: {
          zero: asInt(compBucket.b_0),
          c1to5: asInt(compBucket.b_1_5),
          c6to15: asInt(compBucket.b_6_15),
          c16to30: asInt(compBucket.b_16_30),
          gt30: asInt(compBucket.b_gt_30),
        },
        streakDistribution: {
          zero: asInt(streakBucket.b_0),
          s1to2: asInt(streakBucket.b_1_2),
          s3to6: asInt(streakBucket.b_3_6),
          s7to13: asInt(streakBucket.b_7_13),
          s14to29: asInt(streakBucket.b_14_29),
          gte30: asInt(streakBucket.b_gte_30),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// 2. /admin/english/analytics/students — paginated student list
// ===========================================================================
router.get(
  "/admin/english/analytics/students",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = PaginationQ.parse(req.query);

      const totalRows = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id)::text AS c FROM (
          SELECT user_id FROM english_lesson_section_progress
          UNION SELECT user_id FROM english_exercise_attempts
          UNION SELECT user_id FROM english_quiz_attempts
          UNION SELECT user_id FROM english_xp_events
        ) u
      `);
      const total = asInt((totalRows.rows[0] as { c: string }).c);

      const rows = await db.execute(sql`
        WITH scope AS (
          SELECT DISTINCT user_id FROM (
            SELECT user_id FROM english_lesson_section_progress
            UNION SELECT user_id FROM english_exercise_attempts
            UNION SELECT user_id FROM english_quiz_attempts
            UNION SELECT user_id FROM english_xp_events
          ) u
        ),
        per_user AS (
          SELECT
            s.user_id,
            (SELECT COUNT(DISTINCT lesson_id)::int FROM english_lesson_section_progress p
              WHERE p.user_id = s.user_id) AS lessons_started,
            (SELECT COUNT(*)::int FROM english_lesson_completions c
              WHERE c.user_id = s.user_id) AS lessons_completed,
            (SELECT COUNT(*)::int FROM english_exercise_attempts a
               JOIN english_exercises e ON e.id = a.exercise_id
              WHERE a.user_id = s.user_id AND e.lesson_id IS NOT NULL) AS ex_attempts,
            (SELECT COUNT(*)::int FROM english_exercise_attempts a
               JOIN english_exercises e ON e.id = a.exercise_id
              WHERE a.user_id = s.user_id AND e.lesson_id IS NOT NULL AND a.is_correct) AS ex_correct,
            (SELECT COUNT(*)::int FROM english_quiz_attempts q
              WHERE q.user_id = s.user_id AND q.submitted_at IS NOT NULL) AS quiz_attempts,
            (SELECT COUNT(*)::int FROM english_quiz_attempts q
              WHERE q.user_id = s.user_id AND q.submitted_at IS NOT NULL AND q.passed) AS quiz_passes,
            (SELECT COALESCE(SUM(amount), 0)::int FROM english_xp_events x
              WHERE x.user_id = s.user_id) AS xp_total,
            (SELECT MAX((created_at AT TIME ZONE 'UTC')::date) FROM english_xp_events x
              WHERE x.user_id = s.user_id) AS last_active
          FROM scope s
        )
        SELECT
          u.id, u.email, u.name, u.role,
          pu.lessons_started, pu.lessons_completed,
          pu.ex_attempts, pu.ex_correct,
          pu.quiz_attempts, pu.quiz_passes,
          pu.xp_total, pu.last_active,
          (SELECT string_agg(tier, ',' ORDER BY tier)
             FROM english_enrollments e
            WHERE e.user_id = u.id AND e.status = 'active') AS active_tiers
        FROM per_user pu
        JOIN users u ON u.id = pu.user_id
        ORDER BY pu.xp_total DESC, pu.lessons_completed DESC, u.id ASC
        LIMIT ${q.limit} OFFSET ${q.offset}
      `);

      const students = rows.rows.map((row) => {
        const r = row as Record<string, unknown>;
        const exA = asInt(r.ex_attempts);
        const exC = asInt(r.ex_correct);
        const qA = asInt(r.quiz_attempts);
        const qP = asInt(r.quiz_passes);
        return {
          userId: String(r.id),
          email: r.email as string,
          name: (r.name as string) ?? null,
          role: r.role as string,
          activeTiers: r.active_tiers
            ? String(r.active_tiers).split(",")
            : [],
          lessonsStarted: asInt(r.lessons_started),
          lessonsCompleted: asInt(r.lessons_completed),
          exerciseAttempts: exA,
          exerciseAccuracyPct: exA > 0 ? Math.round((exC / exA) * 1000) / 10 : null,
          quizAttempts: qA,
          quizPassRatePct: qA > 0 ? Math.round((qP / qA) * 1000) / 10 : null,
          xpTotal: asInt(r.xp_total),
          lastActiveDate: r.last_active ? String(r.last_active).slice(0, 10) : null,
        };
      });

      res.json({ total, limit: q.limit, offset: q.offset, students });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// 3. /admin/english/analytics/students/:userId — per-student detail
// ===========================================================================
router.get(
  "/admin/english/analytics/students/:userId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const userId = z.string().uuid().parse(req.params.userId);

      const headRows = await db.execute(sql`
        SELECT u.id, u.email, u.name, u.role, u.created_at,
          (SELECT string_agg(tier, ',' ORDER BY tier)
             FROM english_enrollments e
            WHERE e.user_id = u.id AND e.status = 'active') AS active_tiers
        FROM users u WHERE u.id = ${userId}
      `);
      if (headRows.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const head = headRows.rows[0] as Record<string, unknown>;

      const totalsRows = await db.execute(sql`
        SELECT
          (SELECT COUNT(DISTINCT lesson_id)::int FROM english_lesson_section_progress
            WHERE user_id = ${userId}) AS lessons_started,
          (SELECT COUNT(*)::int FROM english_lesson_completions
            WHERE user_id = ${userId}) AS lessons_completed,
          (SELECT COUNT(*)::int FROM english_lesson_section_progress
            WHERE user_id = ${userId}) AS sections_completed,
          (SELECT COUNT(*)::int FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
            WHERE a.user_id = ${userId} AND e.lesson_id IS NOT NULL) AS ex_attempts,
          (SELECT COUNT(*)::int FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
            WHERE a.user_id = ${userId} AND e.lesson_id IS NOT NULL AND a.is_correct) AS ex_correct,
          (SELECT COALESCE(AVG(NULLIF(a.duration_ms, 0)), 0)::int FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
            WHERE a.user_id = ${userId} AND e.lesson_id IS NOT NULL) AS avg_ex_ms,
          (SELECT COUNT(*)::int FROM english_quiz_attempts
            WHERE user_id = ${userId} AND submitted_at IS NOT NULL) AS quiz_attempts,
          (SELECT COUNT(*)::int FROM english_quiz_attempts
            WHERE user_id = ${userId} AND submitted_at IS NOT NULL AND passed) AS quiz_passes,
          (SELECT COALESCE(SUM(amount), 0)::int FROM english_xp_events
            WHERE user_id = ${userId}) AS xp_total,
          (
            COALESCE((SELECT SUM(delta_seconds)::int FROM english_study_events
              WHERE user_id = ${userId}), 0)
            + COALESCE((SELECT SUM(seconds_active)::int FROM english_daily_activity
              WHERE user_id = ${userId}), 0)
            + COALESCE((SELECT SUM(GREATEST(duration_ms,0) / 1000)::int FROM english_exercise_attempts a
                JOIN english_exercises e ON e.id = a.exercise_id
                WHERE a.user_id = ${userId} AND e.lesson_id IS NOT NULL), 0)
            + COALESCE((SELECT SUM(GREATEST(EXTRACT(EPOCH FROM (submitted_at - started_at)), 0))::int
                FROM english_quiz_attempts
                WHERE user_id = ${userId} AND submitted_at IS NOT NULL), 0)
          ) AS study_seconds
      `);
      const t = totalsRows.rows[0] as Record<string, unknown>;
      const exA = asInt(t.ex_attempts);
      const exC = asInt(t.ex_correct);
      const qA = asInt(t.quiz_attempts);
      const qP = asInt(t.quiz_passes);
      const lsStarted = asInt(t.lessons_started);

      // Per exercise-type accuracy → strongest / weakest skill + most failed.
      const typeRows = await db.execute(sql`
        SELECT e.type AS type,
               COUNT(*)::int AS attempts,
               SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
          FROM english_exercise_attempts a
          JOIN english_exercises e ON e.id = a.exercise_id
         WHERE a.user_id = ${userId} AND e.lesson_id IS NOT NULL
         GROUP BY e.type
         ORDER BY e.type
      `);
      const skills = typeRows.rows.map((row) => {
        const r = row as Record<string, unknown>;
        const att = asInt(r.attempts);
        const cor = asInt(r.correct);
        return {
          type: r.type as string,
          attempts: att,
          correct: cor,
          accuracyPct: att > 0 ? Math.round((cor / att) * 1000) / 10 : 0,
        };
      });
      const eligibleSkills = skills.filter((s) => s.attempts >= 3);
      const strongest = eligibleSkills.length
        ? [...eligibleSkills].sort((a, b) => b.accuracyPct - a.accuracyPct)[0]
        : null;
      const weakest = eligibleSkills.length
        ? [...eligibleSkills].sort((a, b) => a.accuracyPct - b.accuracyPct)[0]
        : null;
      const mostFailed = skills.length
        ? [...skills].sort(
            (a, b) =>
              b.attempts - b.correct - (a.attempts - a.correct) ||
              a.accuracyPct - b.accuracyPct,
          )[0]
        : null;

      // Current streak ending today.
      const streakRows = await db.execute(sql`
        WITH ${ACTIVITY_DAYS_CTE},
        u AS (SELECT d FROM activity_days WHERE user_id = ${userId}),
        ranked AS (
          SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp FROM u
        ),
        runs AS (
          SELECT MAX(d) AS run_end, COUNT(*)::int AS len FROM ranked GROUP BY grp
        )
        SELECT
          (SELECT len FROM runs WHERE run_end = (now() AT TIME ZONE 'UTC')::date) AS current_streak,
          (SELECT MAX(len) FROM runs) AS best_streak,
          (SELECT COUNT(*)::int FROM u) AS active_days_total
      `);
      const sr = streakRows.rows[0] as Record<string, unknown>;

      // Per-book progress.
      const bookRows = await db.execute(sql`
        SELECT b.id AS book_id, b.tier, b.book_number, b.title,
               COUNT(DISTINCT l.id)::int AS lessons_total,
               COUNT(DISTINCT c.lesson_id)::int AS lessons_completed,
               (SELECT COUNT(*)::int FROM english_quiz_attempts q
                  JOIN english_quizzes qz ON qz.id = q.quiz_id
                 WHERE qz.book_id = b.id AND q.user_id = ${userId} AND q.submitted_at IS NOT NULL) AS quiz_attempts,
               (SELECT COUNT(*)::int FROM english_quiz_attempts q
                  JOIN english_quizzes qz ON qz.id = q.quiz_id
                 WHERE qz.book_id = b.id AND q.user_id = ${userId} AND q.passed) AS quiz_passes
          FROM english_books b
          JOIN english_lessons l ON l.book_id = b.id
          LEFT JOIN english_lesson_completions c
                 ON c.lesson_id = l.id AND c.user_id = ${userId}
         GROUP BY b.id, b.tier, b.book_number, b.title
         ORDER BY b.tier, b.book_number
      `);

      // Average completion speed (median lesson seconds — approximated by
      // sum of section deltas + exercise time per completed lesson).
      const speedRows = await db.execute(sql`
        WITH per_lesson AS (
          SELECT c.lesson_id,
            COALESCE((SELECT SUM(delta_seconds) FROM english_study_events s
              WHERE s.user_id = ${userId} AND s.lesson_id = c.lesson_id), 0)
            + COALESCE((SELECT SUM(GREATEST(a.duration_ms,0)) / 1000 FROM english_exercise_attempts a
              JOIN english_exercises e ON e.id = a.exercise_id
              WHERE a.user_id = ${userId} AND e.lesson_id = c.lesson_id), 0) AS secs
          FROM english_lesson_completions c
          WHERE c.user_id = ${userId}
        )
        SELECT COALESCE(AVG(secs), 0)::int AS avg_secs,
               COUNT(*)::int AS lessons
        FROM per_lesson WHERE secs > 0
      `);
      const sp = speedRows.rows[0] as Record<string, unknown>;

      res.json({
        user: {
          id: head.id,
          email: head.email,
          name: head.name ?? null,
          role: head.role,
          createdAt: head.created_at,
          activeTiers: head.active_tiers
            ? String(head.active_tiers).split(",")
            : [],
        },
        totals: {
          lessonsStarted: lsStarted,
          lessonsCompleted: asInt(t.lessons_completed),
          sectionsCompleted: asInt(t.sections_completed),
          sectionCompletionRatePct:
            lsStarted > 0
              ? Math.min(
                  100,
                  Math.round(
                    (asInt(t.sections_completed) / (lsStarted * 6)) * 1000,
                  ) / 10,
                )
              : null,
          exerciseAttempts: exA,
          exerciseAccuracyPct:
            exA > 0 ? Math.round((exC / exA) * 1000) / 10 : null,
          quizAttempts: qA,
          quizPassRatePct: qA > 0 ? Math.round((qP / qA) * 1000) / 10 : null,
          xpTotal: asInt(t.xp_total),
          studySeconds: asInt(t.study_seconds),
          avgExerciseDurationMs: asInt(t.avg_ex_ms),
          avgLessonCompletionSeconds: asInt(sp.avg_secs),
        },
        streak: {
          currentDays: asMaybeInt(sr.current_streak) ?? 0,
          bestDays: asMaybeInt(sr.best_streak) ?? 0,
          activeDaysTotal: asInt(sr.active_days_total),
        },
        skills: {
          perType: skills,
          strongest: strongest
            ? { type: strongest.type, accuracyPct: strongest.accuracyPct }
            : null,
          weakest: weakest
            ? { type: weakest.type, accuracyPct: weakest.accuracyPct }
            : null,
          mostFailedType: mostFailed
            ? {
                type: mostFailed.type,
                failCount: mostFailed.attempts - mostFailed.correct,
                accuracyPct: mostFailed.accuracyPct,
              }
            : null,
        },
        books: bookRows.rows.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            bookId: asInt(r.book_id),
            tier: r.tier as string,
            bookNumber: asInt(r.book_number),
            title: r.title as string,
            lessonsTotal: asInt(r.lessons_total),
            lessonsCompleted: asInt(r.lessons_completed),
            quizAttempts: asInt(r.quiz_attempts),
            quizPasses: asInt(r.quiz_passes),
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// 4. /admin/english/analytics/lessons — list per-lesson aggregates
// ===========================================================================
router.get(
  "/admin/english/analytics/lessons",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = PaginationQ.extend({
        bookId: z.coerce.number().int().positive().optional(),
      }).parse(req.query);

      const totalRows = await db.execute(sql`
        SELECT COUNT(*)::text AS c FROM english_lessons
        WHERE book_id IS NOT NULL
        ${q.bookId ? sql`AND book_id = ${q.bookId}` : sql``}
      `);
      const total = asInt((totalRows.rows[0] as { c: string }).c);

      const rows = await db.execute(sql`
        SELECT
          l.id, l.book_id, l.lesson_number, l.title, l.level,
          (SELECT COUNT(DISTINCT user_id)::int FROM english_lesson_section_progress
             WHERE lesson_id = l.id) AS opened_users,
          (SELECT COUNT(*)::int FROM english_lesson_completions
             WHERE lesson_id = l.id) AS completed_users,
          (SELECT COUNT(*)::int FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
            WHERE e.lesson_id = l.id) AS ex_attempts,
          (SELECT COUNT(*)::int FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
            WHERE e.lesson_id = l.id AND a.is_correct) AS ex_correct
        FROM english_lessons l
        WHERE l.book_id IS NOT NULL
        ${q.bookId ? sql`AND l.book_id = ${q.bookId}` : sql``}
        ORDER BY l.book_id, l.lesson_number
        LIMIT ${q.limit} OFFSET ${q.offset}
      `);

      const lessons = rows.rows.map((row) => {
        const r = row as Record<string, unknown>;
        const opened = asInt(r.opened_users);
        const completed = asInt(r.completed_users);
        const exA = asInt(r.ex_attempts);
        const exC = asInt(r.ex_correct);
        return {
          lessonId: asInt(r.id),
          bookId: asMaybeInt(r.book_id),
          lessonNumber: asMaybeInt(r.lesson_number),
          title: r.title as string,
          level: r.level as string,
          openedUsers: opened,
          completedUsers: completed,
          dropOffPct:
            opened > 0
              ? Math.round((1 - completed / opened) * 1000) / 10
              : null,
          exerciseAttempts: exA,
          exerciseAccuracyPct:
            exA > 0 ? Math.round((exC / exA) * 1000) / 10 : null,
        };
      });

      res.json({ total, limit: q.limit, offset: q.offset, lessons });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// 5. /admin/english/analytics/lessons/:lessonId — drill-down
// ===========================================================================
router.get(
  "/admin/english/analytics/lessons/:lessonId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const lessonId = z.coerce
        .number()
        .int()
        .positive()
        .parse(req.params.lessonId);

      // Curriculum-only: legacy Mentor lessons (book_id IS NULL) are excluded
      // from analytics scope and return 404.
      const headRows = await db.execute(sql`
        SELECT id, book_id, lesson_number, title, level
        FROM english_lessons
        WHERE id = ${lessonId} AND book_id IS NOT NULL
      `);
      if (headRows.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const head = headRows.rows[0] as Record<string, unknown>;

      const aggRows = await db.execute(sql`
        SELECT
          (SELECT COUNT(DISTINCT user_id)::int FROM english_lesson_section_progress
             WHERE lesson_id = ${lessonId}) AS opened_users,
          (SELECT COUNT(*)::int FROM english_lesson_completions
             WHERE lesson_id = ${lessonId}) AS completed_users,
          (SELECT COUNT(*)::int FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
            WHERE e.lesson_id = ${lessonId}) AS ex_attempts,
          (SELECT COUNT(*)::int FROM english_exercise_attempts a
             JOIN english_exercises e ON e.id = a.exercise_id
            WHERE e.lesson_id = ${lessonId} AND a.is_correct) AS ex_correct,
          (SELECT COALESCE(AVG(per_user_secs), 0)::int FROM (
              SELECT user_id,
                COALESCE(SUM(delta_seconds), 0) AS per_user_secs
                FROM english_study_events
               WHERE lesson_id = ${lessonId}
               GROUP BY user_id
           ) s) AS avg_study_seconds
      `);
      const a = aggRows.rows[0] as Record<string, unknown>;
      const opened = asInt(a.opened_users);
      const completed = asInt(a.completed_users);

      // Per-section completion (drop-off shape inside the lesson).
      const sectionRows = await db.execute(sql`
        SELECT s.kind AS kind,
               (SELECT COUNT(DISTINCT p.user_id)::int FROM english_lesson_section_progress p
                  WHERE p.lesson_id = ${lessonId} AND p.kind = s.kind) AS completed_users
          FROM english_lesson_sections s
         WHERE s.lesson_id = ${lessonId}
         ORDER BY s.position
      `);

      // Per-exercise accuracy → hardest / easiest.
      const exRows = await db.execute(sql`
        SELECT e.id, e.type, e.prompt,
               COUNT(a.id)::int AS attempts,
               SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
          FROM english_exercises e
          LEFT JOIN english_exercise_attempts a ON a.exercise_id = e.id
         WHERE e.lesson_id = ${lessonId}
         GROUP BY e.id, e.type, e.prompt
         ORDER BY e.id
      `);
      const exercises = exRows.rows.map((row) => {
        const r = row as Record<string, unknown>;
        const at = asInt(r.attempts);
        const co = asInt(r.correct);
        return {
          exerciseId: asInt(r.id),
          type: r.type as string,
          prompt: (r.prompt as string).slice(0, 120),
          attempts: at,
          correct: co,
          accuracyPct: at > 0 ? Math.round((co / at) * 1000) / 10 : null,
        };
      });
      const eligible = exercises.filter(
        (e) => e.attempts >= 3 && e.accuracyPct !== null,
      );
      const hardest = eligible.length
        ? [...eligible].sort((a, b) => (a.accuracyPct! - b.accuracyPct!))[0]
        : null;
      const easiest = eligible.length
        ? [...eligible].sort((a, b) => (b.accuracyPct! - a.accuracyPct!))[0]
        : null;

      // Quiz correlation: for each quiz placed at-or-after this lesson_number
      // in this book, % of users who completed THIS lesson AND passed the
      // quiz on first attempt.
      const quizCorrRows = await db.execute(sql`
        WITH lesson_completers AS (
          SELECT DISTINCT user_id FROM english_lesson_completions
            WHERE lesson_id = ${lessonId}
        )
        SELECT q.id AS quiz_id, q.quiz_number, q.placed_after_lesson,
               COUNT(DISTINCT lc.user_id)::int AS completers,
               COUNT(DISTINCT qa.user_id) FILTER (WHERE qa.passed)::int AS passers_among_completers
          FROM english_quizzes q
          JOIN english_lessons ll ON ll.book_id = q.book_id
                                  AND ll.id = ${lessonId}
                                  AND ll.lesson_number IS NOT NULL
                                  AND ll.lesson_number <= q.placed_after_lesson
          LEFT JOIN lesson_completers lc ON true
          LEFT JOIN english_quiz_attempts qa
                 ON qa.quiz_id = q.id AND qa.user_id = lc.user_id
                 AND qa.submitted_at IS NOT NULL
          GROUP BY q.id, q.quiz_number, q.placed_after_lesson
          ORDER BY q.quiz_number
      `);

      res.json({
        lesson: {
          id: asInt(head.id),
          bookId: asMaybeInt(head.book_id),
          lessonNumber: asMaybeInt(head.lesson_number),
          title: head.title as string,
          level: head.level as string,
        },
        totals: {
          openedUsers: opened,
          completedUsers: completed,
          dropOffPct:
            opened > 0
              ? Math.round((1 - completed / opened) * 1000) / 10
              : null,
          avgStudySeconds: asInt(a.avg_study_seconds),
          exerciseAttempts: asInt(a.ex_attempts),
          exerciseAccuracyPct:
            asInt(a.ex_attempts) > 0
              ? Math.round(
                  (asInt(a.ex_correct) / asInt(a.ex_attempts)) * 1000,
                ) / 10
              : null,
        },
        sectionFunnel: sectionRows.rows.map((row) => {
          const r = row as Record<string, unknown>;
          const cu = asInt(r.completed_users);
          return {
            kind: r.kind as string,
            completedUsers: cu,
            completionRatePct:
              opened > 0 ? Math.round((cu / opened) * 1000) / 10 : null,
          };
        }),
        exercises,
        hardestExercise: hardest,
        easiestExercise: easiest,
        quizCorrelation: quizCorrRows.rows.map((row) => {
          const r = row as Record<string, unknown>;
          const co = asInt(r.completers);
          const pa = asInt(r.passers_among_completers);
          return {
            quizId: asInt(r.quiz_id),
            quizNumber: asInt(r.quiz_number),
            placedAfterLesson: asInt(r.placed_after_lesson),
            completers: co,
            passersAmongCompleters: pa,
            passRateAmongCompletersPct:
              co > 0 ? Math.round((pa / co) * 1000) / 10 : null,
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// 6. /admin/english/analytics/quizzes — quiz aggregates
// ===========================================================================
router.get(
  "/admin/english/analytics/quizzes",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const rows = await db.execute(sql`
        SELECT
          q.id, q.book_id, q.quiz_number, q.placed_after_lesson, q.title, q.pass_threshold_pct,
          (SELECT COUNT(*)::int FROM english_quiz_attempts a
             WHERE a.quiz_id = q.id AND a.submitted_at IS NOT NULL) AS attempts,
          (SELECT COUNT(*)::int FROM english_quiz_attempts a
             WHERE a.quiz_id = q.id AND a.submitted_at IS NOT NULL AND a.passed) AS passes,
          (SELECT COALESCE(AVG(score_pct), 0)::numeric(6,2) FROM english_quiz_attempts a
             WHERE a.quiz_id = q.id AND a.submitted_at IS NOT NULL) AS avg_score,
          (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (submitted_at - started_at))), 0)::int
             FROM english_quiz_attempts a
             WHERE a.quiz_id = q.id AND a.submitted_at IS NOT NULL) AS avg_secs,
          (SELECT COUNT(DISTINCT user_id)::int FROM english_quiz_attempts a
             WHERE a.quiz_id = q.id AND a.submitted_at IS NOT NULL) AS unique_users
        FROM english_quizzes q
        ORDER BY q.book_id, q.quiz_number
      `);
      const quizzes = rows.rows.map((row) => {
        const r = row as Record<string, unknown>;
        const att = asInt(r.attempts);
        const pa = asInt(r.passes);
        return {
          quizId: asInt(r.id),
          bookId: asInt(r.book_id),
          quizNumber: asInt(r.quiz_number),
          placedAfterLesson: asInt(r.placed_after_lesson),
          title: r.title as string,
          passThresholdPct: asInt(r.pass_threshold_pct),
          attempts: att,
          uniqueUsers: asInt(r.unique_users),
          passes: pa,
          fails: Math.max(0, att - pa),
          passRatePct: att > 0 ? Math.round((pa / att) * 1000) / 10 : null,
          failRatePct:
            att > 0 ? Math.round(((att - pa) / att) * 1000) / 10 : null,
          avgScorePct: asNum(r.avg_score),
          avgCompletionSeconds: asInt(r.avg_secs),
        };
      });
      res.json({ quizzes });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// 7. /admin/english/analytics/quizzes/:quizId — drill-down + most-failed Q
// ===========================================================================
router.get(
  "/admin/english/analytics/quizzes/:quizId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const quizId = z.coerce
        .number()
        .int()
        .positive()
        .parse(req.params.quizId);

      const headRows = await db.execute(sql`
        SELECT id, book_id, quiz_number, placed_after_lesson, title, title_ar,
               pass_threshold_pct, time_limit_seconds, status
        FROM english_quizzes WHERE id = ${quizId}
      `);
      if (headRows.rows.length === 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const head = headRows.rows[0] as Record<string, unknown>;

      const aggRows = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM english_quiz_attempts
             WHERE quiz_id = ${quizId} AND submitted_at IS NOT NULL) AS attempts,
          (SELECT COUNT(*)::int FROM english_quiz_attempts
             WHERE quiz_id = ${quizId} AND submitted_at IS NOT NULL AND passed) AS passes,
          (SELECT COUNT(DISTINCT user_id)::int FROM english_quiz_attempts
             WHERE quiz_id = ${quizId} AND submitted_at IS NOT NULL) AS unique_users,
          (SELECT COALESCE(AVG(score_pct), 0)::numeric(6,2) FROM english_quiz_attempts
             WHERE quiz_id = ${quizId} AND submitted_at IS NOT NULL) AS avg_score,
          (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (submitted_at - started_at))), 0)::int
             FROM english_quiz_attempts
             WHERE quiz_id = ${quizId} AND submitted_at IS NOT NULL) AS avg_secs
      `);
      const a = aggRows.rows[0] as Record<string, unknown>;
      const att = asInt(a.attempts);
      const pa = asInt(a.passes);

      // Per-question accuracy + most-failed.
      const qRows = await db.execute(sql`
        SELECT q.id, q.position, q.kind, q.prompt_en,
               COUNT(ans.id)::int AS attempts,
               SUM(CASE WHEN ans.is_correct THEN 1 ELSE 0 END)::int AS correct
          FROM english_quiz_questions q
          LEFT JOIN english_quiz_answers ans ON ans.question_id = q.id
         WHERE q.quiz_id = ${quizId}
         GROUP BY q.id, q.position, q.kind, q.prompt_en
         ORDER BY q.position
      `);
      const questions = qRows.rows.map((row) => {
        const r = row as Record<string, unknown>;
        const at = asInt(r.attempts);
        const co = asInt(r.correct);
        return {
          questionId: asInt(r.id),
          position: asInt(r.position),
          kind: r.kind as string,
          prompt: (r.prompt_en as string).slice(0, 200),
          attempts: at,
          correct: co,
          accuracyPct: at > 0 ? Math.round((co / at) * 1000) / 10 : null,
        };
      });
      const eligibleQ = questions.filter(
        (q) => q.attempts > 0 && q.accuracyPct !== null,
      );
      const mostFailed = eligibleQ.length
        ? [...eligibleQ].sort(
            (a, b) =>
              b.attempts - b.correct - (a.attempts - a.correct) ||
              a.accuracyPct! - b.accuracyPct!,
          )[0]
        : null;

      // Score distribution (10-pt buckets).
      const distRows = await db.execute(sql`
        SELECT width_bucket(score_pct, 0, 100, 10) AS bucket,
               COUNT(*)::int AS c
          FROM english_quiz_attempts
         WHERE quiz_id = ${quizId} AND submitted_at IS NOT NULL
         GROUP BY bucket ORDER BY bucket
      `);

      res.json({
        quiz: {
          id: asInt(head.id),
          bookId: asInt(head.book_id),
          quizNumber: asInt(head.quiz_number),
          placedAfterLesson: asInt(head.placed_after_lesson),
          title: head.title as string,
          passThresholdPct: asInt(head.pass_threshold_pct),
          status: head.status as string,
        },
        totals: {
          attempts: att,
          uniqueUsers: asInt(a.unique_users),
          passes: pa,
          fails: Math.max(0, att - pa),
          passRatePct: att > 0 ? Math.round((pa / att) * 1000) / 10 : null,
          failRatePct:
            att > 0 ? Math.round(((att - pa) / att) * 1000) / 10 : null,
          avgScorePct: asNum(a.avg_score),
          avgCompletionSeconds: asInt(a.avg_secs),
        },
        questions,
        mostFailedQuestion: mostFailed,
        scoreDistribution: distRows.rows.map((row) => ({
          bucket: asInt((row as { bucket: number }).bucket),
          count: asInt((row as { c: number }).c),
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// 8. /admin/english/analytics/risk — categorized at-risk students
// ===========================================================================
router.get(
  "/admin/english/analytics/risk",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = RiskQ.parse(req.query);
      // NOTE on `study_seconds` (in /students/:userId): the metric sums
      // english_study_events.delta_seconds + english_daily_activity.seconds_active
      // + exercise/quiz wall-clock durations. These sources are NOT guaranteed
      // disjoint by schema, so the value is an UPPER BOUND on study time, not
      // an exact figure. Treat as a coarse engagement signal.
      // All values below are Zod-validated positive integers; safe to inline
      // via sql.raw to sidestep drizzle's text-binding of integer parameters
      // (which breaks `date - $1` and `int || text` in raw SQL fragments).
      const N = (n: number) => sql.raw(String(n));

      // Inactive — had activity historically, but none in last `inactiveDays`.
      const inactive = await db.execute(sql`
        WITH ${ACTIVITY_DAYS_CTE},
        agg AS (
          SELECT user_id, MAX(d) AS last_active, MIN(d) AS first_active
            FROM activity_days GROUP BY user_id
        )
        SELECT u.id, u.email, u.name,
               agg.last_active, agg.first_active,
               ((now() AT TIME ZONE 'UTC')::date - agg.last_active)::int AS days_inactive
          FROM agg
          JOIN users u ON u.id = agg.user_id
         WHERE agg.last_active <= (now() AT TIME ZONE 'UTC')::date - ${N(q.inactiveDays)}
         ORDER BY agg.last_active ASC
         LIMIT 200
      `);

      // Likely-to-drop — had activity in last `dropoutWindowDays` but none
      // in last `dropoutSilenceDays`, and book progress < 100% on at least
      // one started book.
      const likelyDrop = await db.execute(sql`
        WITH ${ACTIVITY_DAYS_CTE},
        agg AS (
          SELECT user_id, MAX(d) AS last_active FROM activity_days GROUP BY user_id
        ),
        candidates AS (
          SELECT a.user_id, a.last_active,
                 ((now() AT TIME ZONE 'UTC')::date - a.last_active)::int AS days_silent
            FROM agg a
           WHERE a.last_active <= (now() AT TIME ZONE 'UTC')::date - ${N(q.dropoutSilenceDays)}
             AND a.last_active >= (now() AT TIME ZONE 'UTC')::date - ${N(q.dropoutWindowDays)}
        ),
        progress AS (
          SELECT c.user_id,
            (SELECT COUNT(DISTINCT lesson_id)::int FROM english_lesson_section_progress
              WHERE user_id = c.user_id) AS started_lessons,
            (SELECT COUNT(*)::int FROM english_lesson_completions
              WHERE user_id = c.user_id) AS completed_lessons
          FROM candidates c
        )
        SELECT u.id, u.email, u.name, c.last_active, c.days_silent,
               p.started_lessons, p.completed_lessons
          FROM candidates c
          JOIN users u ON u.id = c.user_id
          JOIN progress p ON p.user_id = c.user_id
         WHERE p.started_lessons > p.completed_lessons OR p.started_lessons = 0
         ORDER BY c.days_silent DESC
         LIMIT 200
      `);

      // Struggling — accuracy < threshold with at least N attempts in last
      // 30 days on curriculum exercises.
      const struggling = await db.execute(sql`
        WITH per_user AS (
          SELECT a.user_id,
                 COUNT(*)::int AS attempts,
                 SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
            FROM english_exercise_attempts a
            JOIN english_exercises e ON e.id = a.exercise_id
           WHERE e.lesson_id IS NOT NULL
             AND a.created_at >= now() - INTERVAL '30 day'
           GROUP BY a.user_id
        )
        SELECT u.id, u.email, u.name,
               pu.attempts, pu.correct,
               (pu.correct::numeric / pu.attempts * 100)::numeric(6,2) AS accuracy_pct
          FROM per_user pu
          JOIN users u ON u.id = pu.user_id
         WHERE pu.attempts >= ${N(q.strugglingMinAttempts)}
           AND (pu.correct::numeric / pu.attempts) < ${N(q.strugglingAccuracyPct)} / 100.0
         ORDER BY accuracy_pct ASC
         LIMIT 200
      `);

      // Stuck — has section progress on a lesson started ≥N days ago, has
      // not completed all 6 sections, and no new section progress in last
      // N days.
      const stuck = await db.execute(sql`
        WITH lesson_state AS (
          SELECT p.user_id, p.lesson_id,
                 MIN(p.completed_at) AS first_section_at,
                 MAX(p.completed_at) AS last_section_at,
                 COUNT(*)::int AS sections_done
            FROM english_lesson_section_progress p
           GROUP BY p.user_id, p.lesson_id
        )
        SELECT u.id AS user_id, u.email, u.name,
               ls.lesson_id, l.title, l.book_id, l.lesson_number,
               ls.sections_done, ls.last_section_at, ls.first_section_at
          FROM lesson_state ls
          JOIN english_lessons l ON l.id = ls.lesson_id
          JOIN users u ON u.id = ls.user_id
         WHERE ls.sections_done < 6
           AND ls.first_section_at <= now() - make_interval(days => ${N(q.stuckLessonDays)})
           AND ls.last_section_at  <= now() - make_interval(days => ${N(q.stuckLessonDays)})
           AND NOT EXISTS (
             SELECT 1 FROM english_lesson_completions c
              WHERE c.user_id = ls.user_id AND c.lesson_id = ls.lesson_id
           )
         ORDER BY ls.last_section_at ASC
         LIMIT 200
      `);

      // Repeated quiz failures — N+ failed attempts on the same quiz with
      // no successful pass.
      const repeatedFails = await db.execute(sql`
        WITH per AS (
          SELECT user_id, quiz_id,
                 COUNT(*) FILTER (WHERE submitted_at IS NOT NULL AND passed = false)::int AS fails,
                 COUNT(*) FILTER (WHERE submitted_at IS NOT NULL AND passed = true)::int  AS passes
            FROM english_quiz_attempts GROUP BY user_id, quiz_id
        )
        SELECT u.id AS user_id, u.email, u.name,
               q.id AS quiz_id, q.book_id, q.quiz_number, q.title,
               per.fails, per.passes
          FROM per
          JOIN users u ON u.id = per.user_id
          JOIN english_quizzes q ON q.id = per.quiz_id
         WHERE per.fails >= ${N(q.repeatedFailuresMin)} AND per.passes = 0
         ORDER BY per.fails DESC
         LIMIT 200
      `);

      const mapUser = (row: Record<string, unknown>) => ({
        userId: String(row.id ?? row.user_id),
        email: row.email as string,
        name: (row.name as string) ?? null,
      });

      res.json({
        thresholds: q,
        inactive: inactive.rows.map((row) => ({
          ...mapUser(row as Record<string, unknown>),
          lastActiveDate: String((row as { last_active: unknown }).last_active).slice(0, 10),
          daysInactive: asInt((row as { days_inactive: unknown }).days_inactive),
        })),
        likelyToDrop: likelyDrop.rows.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            ...mapUser(r),
            lastActiveDate: String(r.last_active).slice(0, 10),
            daysSilent: asInt(r.days_silent),
            startedLessons: asInt(r.started_lessons),
            completedLessons: asInt(r.completed_lessons),
          };
        }),
        struggling: struggling.rows.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            ...mapUser(r),
            attempts: asInt(r.attempts),
            correct: asInt(r.correct),
            accuracyPct: asNum(r.accuracy_pct),
          };
        }),
        stuck: stuck.rows.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            ...mapUser(r),
            lessonId: asInt(r.lesson_id),
            bookId: asMaybeInt(r.book_id),
            lessonNumber: asMaybeInt(r.lesson_number),
            lessonTitle: r.title as string,
            sectionsDone: asInt(r.sections_done),
            firstSectionAt: r.first_section_at,
            lastSectionAt: r.last_section_at,
          };
        }),
        repeatedFailures: repeatedFails.rows.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            ...mapUser(r),
            quizId: asInt(r.quiz_id),
            bookId: asInt(r.book_id),
            quizNumber: asInt(r.quiz_number),
            quizTitle: r.title as string,
            fails: asInt(r.fails),
            passes: asInt(r.passes),
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
