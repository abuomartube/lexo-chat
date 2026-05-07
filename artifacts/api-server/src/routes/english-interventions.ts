// ============================================================================
// English AI Intervention Layer — student + admin endpoints over the
// intervention engine. Read-only. No XP writes, no schema changes.
//
// Student endpoints (requireAuth, scoped to req.session.userId):
//   GET /english/me/interventions        — active interventions
//   GET /english/me/recommendations      — adaptive recommendations
//   GET /english/me/dashboard-signal     — single label for the home tile
//   GET /english/me/coaching             — short behavior-aware message
//   GET /english/me/intervention-bundle  — all of the above in one call
//
// Admin endpoints (requireAdmin, list views):
//   GET /admin/english/interventions/at-risk
//   GET /admin/english/interventions/strongest
//   GET /admin/english/interventions/disengaged
//   GET /admin/english/interventions/likely-to-quit
//   GET /admin/english/interventions/users/:userId  — full bundle for one user
//
// NOT in openapi.yaml (matches english-analytics.ts pattern). Frontend can
// consume via plain fetch.
// ============================================================================

import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";
import { computeStudentSignals } from "../lib/intervention-engine";

const router: IRouter = Router();

const PaginationQ = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

// ===========================================================================
// Student endpoints
// ===========================================================================

router.get(
  "/english/me/intervention-bundle",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const signals = await computeStudentSignals(userId);
      res.json(signals);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/me/interventions",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const s = await computeStudentSignals(userId);
      res.json({
        userId,
        generatedAt: s.generatedAt,
        interventions: s.interventions,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/me/recommendations",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const s = await computeStudentSignals(userId);
      res.json({
        userId,
        generatedAt: s.generatedAt,
        recommendations: s.recommendations,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/me/dashboard-signal",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const s = await computeStudentSignals(userId);
      res.json({
        userId,
        generatedAt: s.generatedAt,
        signal: s.dashboard,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/me/coaching",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const s = await computeStudentSignals(userId);
      res.json({
        userId,
        generatedAt: s.generatedAt,
        coaching: s.coaching,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// Admin endpoints — list views.
//
// To stay read-heavy and avoid N+1, list endpoints use ONE aggregation SQL
// per category to identify candidates and return summary rows. They do NOT
// run the per-user engine for every row. Admins fetch the full per-user
// bundle on demand via /admin/english/interventions/users/:userId.
// ===========================================================================

// Activity days are computed on Asia/Riyadh civil-day boundaries to match the
// engagement baseline (english_daily_activity.date_utc is already a Riyadh
// civil day under the legacy column name; xp events are bucketed here using
// the same TZ).
const ACTIVITY_CTE = sql`
  activity_days AS (
    SELECT user_id,
           (to_char(created_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD'))::date AS d
      FROM english_xp_events
    UNION
    SELECT user_id, date_utc AS d
      FROM english_daily_activity
  )
`;

// Helper: shape user row consistently
type UserRow = Record<string, unknown>;
function shapeUserRow(r: UserRow, extra: Record<string, unknown>) {
  return {
    userId: String(r.id),
    email: String(r.email ?? ""),
    name: r.name ? String(r.name) : null,
    ...extra,
  };
}

// At-risk: long inactivity OR struggling accuracy OR repeated failures.
// Returns a single union with a `reasons` array per user.
router.get(
  "/admin/english/interventions/at-risk",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = PaginationQ.parse(req.query);

      const rows = await db.execute(sql`
        WITH ${ACTIVITY_CTE},
        last_activity AS (
          SELECT user_id, MAX(d) AS last_active
            FROM activity_days GROUP BY user_id
        ),
        accuracy AS (
          SELECT a.user_id,
                 COUNT(*)::int AS attempts,
                 SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
            FROM english_exercise_attempts a
            JOIN english_exercises e ON e.id = a.exercise_id
           WHERE e.lesson_id IS NOT NULL
             AND a.created_at >= now() - interval '30 day'
           GROUP BY a.user_id
        ),
        repeated AS (
          SELECT user_id, COUNT(*)::int AS stuck_exercises FROM (
            SELECT a.user_id, a.exercise_id,
                   SUM(CASE WHEN NOT a.is_correct THEN 1 ELSE 0 END) AS fails,
                   MAX(CASE WHEN a.is_correct THEN a.created_at END) AS lc,
                   MAX(CASE WHEN NOT a.is_correct THEN a.created_at END) AS lf
              FROM english_exercise_attempts a
              JOIN english_exercises e ON e.id = a.exercise_id
             WHERE e.lesson_id IS NOT NULL
               AND a.created_at >= now() - interval '60 day'
             GROUP BY a.user_id, a.exercise_id
            HAVING SUM(CASE WHEN NOT a.is_correct THEN 1 ELSE 0 END) >= 3
               AND (MAX(CASE WHEN a.is_correct THEN a.created_at END) IS NULL
                    OR MAX(CASE WHEN a.is_correct THEN a.created_at END)
                       < MAX(CASE WHEN NOT a.is_correct THEN a.created_at END))
          ) z GROUP BY user_id
        ),
        merged AS (
          SELECT
            u.id, u.email, u.name,
            la.last_active,
            ((now() AT TIME ZONE 'UTC')::date - la.last_active)::int AS days_inactive,
            COALESCE(acc.attempts, 0) AS attempts,
            COALESCE(acc.correct, 0)  AS correct,
            COALESCE(rep.stuck_exercises, 0) AS stuck
          FROM users u
          LEFT JOIN last_activity la ON la.user_id = u.id
          LEFT JOIN accuracy acc      ON acc.user_id = u.id
          LEFT JOIN repeated rep      ON rep.user_id = u.id
          WHERE la.last_active IS NOT NULL
        )
        SELECT * FROM merged
         WHERE days_inactive >= 7
            OR (attempts >= 10 AND (correct::numeric / attempts) < 0.5)
            OR stuck >= 1
         ORDER BY (
           (CASE WHEN days_inactive >= 14 THEN 4
                 WHEN days_inactive >= 7  THEN 2 ELSE 0 END) +
           (CASE WHEN attempts >= 10
                       AND (correct::numeric / attempts) < 0.5 THEN 2 ELSE 0 END) +
           (CASE WHEN stuck >= 1 THEN 1 ELSE 0 END)
         ) DESC, days_inactive DESC NULLS LAST
         LIMIT ${q.limit} OFFSET ${q.offset}
      `);

      const students = rows.rows.map((r) => {
        const row = r as UserRow;
        const days = row.days_inactive == null ? null : Number(row.days_inactive);
        const at = Number(row.attempts ?? 0);
        const co = Number(row.correct ?? 0);
        const stuck = Number(row.stuck ?? 0);
        const reasons: string[] = [];
        if (days !== null && days >= 14) reasons.push("critical_inactivity");
        else if (days !== null && days >= 7) reasons.push("long_inactivity");
        if (at >= 10 && co / at < 0.5) reasons.push("low_accuracy");
        if (stuck >= 1) reasons.push("repeated_exercise_failure");
        return shapeUserRow(row, {
          daysInactive: days,
          attempts30d: at,
          accuracyPct30d:
            at > 0 ? Math.round((co / at) * 1000) / 10 : null,
          stuckExercises: stuck,
          reasons,
        });
      });

      res.json({ limit: q.limit, offset: q.offset, students });
    } catch (err) {
      next(err);
    }
  },
);

// Strongest: high streak AND recent completions AND solid accuracy
router.get(
  "/admin/english/interventions/strongest",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = PaginationQ.parse(req.query);

      const rows = await db.execute(sql`
        WITH ${ACTIVITY_CTE},
        per_user AS (
          SELECT u.id AS user_id, u.email, u.name,
            (SELECT COUNT(*)::int FROM english_lesson_completions c
              WHERE c.user_id = u.id) AS lessons_total,
            (SELECT COUNT(*)::int FROM english_lesson_completions c
              WHERE c.user_id = u.id
                AND c.completed_at >= now() - interval '7 day') AS lessons_7d,
            (SELECT COALESCE(SUM(amount), 0)::int FROM english_xp_events x
              WHERE x.user_id = u.id) AS xp_total,
            (SELECT COUNT(DISTINCT d)::int FROM activity_days a
              WHERE a.user_id = u.id
                AND d > (now() AT TIME ZONE 'UTC')::date - 30) AS active_days_30
          FROM users u
        ),
        accuracy AS (
          SELECT a.user_id,
                 COUNT(*)::int AS attempts,
                 SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
            FROM english_exercise_attempts a
            JOIN english_exercises e ON e.id = a.exercise_id
           WHERE e.lesson_id IS NOT NULL
             AND a.created_at >= now() - interval '30 day'
           GROUP BY a.user_id
        )
        SELECT pu.user_id AS id, pu.email, pu.name,
               pu.lessons_total, pu.lessons_7d, pu.xp_total,
               pu.active_days_30,
               COALESCE(acc.attempts, 0) AS attempts,
               COALESCE(acc.correct, 0)  AS correct
          FROM per_user pu
          LEFT JOIN accuracy acc ON acc.user_id = pu.user_id
         WHERE pu.lessons_total >= 5
           AND pu.active_days_30 >= 7
           AND COALESCE(acc.attempts, 0) >= 10
           AND COALESCE(acc.correct, 0)::numeric
                 / NULLIF(COALESCE(acc.attempts, 0), 0) >= 0.7
         ORDER BY pu.xp_total DESC, pu.lessons_7d DESC
         LIMIT ${q.limit} OFFSET ${q.offset}
      `);

      const students = rows.rows.map((r) => {
        const row = r as UserRow;
        const at = Number(row.attempts ?? 0);
        const co = Number(row.correct ?? 0);
        return shapeUserRow(row, {
          lessonsCompletedTotal: Number(row.lessons_total ?? 0),
          lessonsCompleted7d: Number(row.lessons_7d ?? 0),
          xpTotal: Number(row.xp_total ?? 0),
          activeDays30: Number(row.active_days_30 ?? 0),
          accuracyPct30d:
            at > 0 ? Math.round((co / at) * 1000) / 10 : null,
        });
      });

      res.json({ limit: q.limit, offset: q.offset, students });
    } catch (err) {
      next(err);
    }
  },
);

// Disengaged: had activity historically, none in last 7 days
router.get(
  "/admin/english/interventions/disengaged",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = PaginationQ.parse(req.query);

      const rows = await db.execute(sql`
        WITH ${ACTIVITY_CTE},
        agg AS (
          SELECT user_id, MAX(d) AS last_active, MIN(d) AS first_active,
                 COUNT(DISTINCT d)::int AS active_days_total
            FROM activity_days GROUP BY user_id
        )
        SELECT u.id, u.email, u.name,
               agg.last_active, agg.first_active,
               agg.active_days_total,
               ((now() AT TIME ZONE 'UTC')::date - agg.last_active)::int
                 AS days_inactive
          FROM agg
          JOIN users u ON u.id = agg.user_id
         WHERE agg.last_active <= (now() AT TIME ZONE 'UTC')::date - 7
           AND agg.active_days_total >= 2
         ORDER BY agg.last_active ASC
         LIMIT ${q.limit} OFFSET ${q.offset}
      `);

      const students = rows.rows.map((r) => {
        const row = r as UserRow;
        return shapeUserRow(row, {
          lastActiveDate: row.last_active
            ? String(row.last_active).slice(0, 10)
            : null,
          firstActiveDate: row.first_active
            ? String(row.first_active).slice(0, 10)
            : null,
          activeDaysTotal: Number(row.active_days_total ?? 0),
          daysInactive:
            row.days_inactive == null ? null : Number(row.days_inactive),
        });
      });

      res.json({ limit: q.limit, offset: q.offset, students });
    } catch (err) {
      next(err);
    }
  },
);

// Likely to quit: previously consistent (≥5 active days), silent ≥14d, has
// at least one started lesson but < 50% completion of any started book.
router.get(
  "/admin/english/interventions/likely-to-quit",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = PaginationQ.parse(req.query);

      const rows = await db.execute(sql`
        WITH ${ACTIVITY_CTE},
        agg AS (
          SELECT user_id, MAX(d) AS last_active,
                 COUNT(DISTINCT d)::int AS active_days_total
            FROM activity_days GROUP BY user_id
        ),
        candidates AS (
          SELECT a.user_id, a.last_active, a.active_days_total,
                 ((now() AT TIME ZONE 'UTC')::date - a.last_active)::int AS days_silent
            FROM agg a
           WHERE a.last_active <= (now() AT TIME ZONE 'UTC')::date - 14
             AND a.active_days_total >= 5
        ),
        -- Per-(user,book) progress for any book the user has started a lesson in.
        book_totals AS (
          SELECT book_id, COUNT(*)::int AS lessons_in_book
            FROM english_lessons
           WHERE book_id IS NOT NULL
           GROUP BY book_id
        ),
        per_book AS (
          SELECT c.user_id, l.book_id,
                 COUNT(DISTINCT sp.lesson_id)::int                       AS lessons_started_in_book,
                 COUNT(DISTINCT lc.lesson_id) FILTER (WHERE lc.lesson_id IS NOT NULL)::int
                                                                          AS lessons_done_in_book,
                 bt.lessons_in_book
            FROM candidates c
            JOIN english_lesson_section_progress sp ON sp.user_id = c.user_id
            JOIN english_lessons l                  ON l.id = sp.lesson_id AND l.book_id IS NOT NULL
            JOIN book_totals bt                     ON bt.book_id = l.book_id
            LEFT JOIN english_lesson_completions lc
                   ON lc.user_id = c.user_id AND lc.lesson_id = l.id
           GROUP BY c.user_id, l.book_id, bt.lessons_in_book
        ),
        -- Per-user roll-up + worst-book completion ratio across started books.
        progress AS (
          SELECT pb.user_id,
                 COUNT(DISTINCT pb.book_id)::int                        AS books_started,
                 SUM(pb.lessons_done_in_book)::int                      AS lessons_done,
                 SUM(pb.lessons_started_in_book)::int                   AS lessons_started,
                 MIN(pb.lessons_done_in_book::numeric
                       / NULLIF(pb.lessons_in_book, 0))                 AS worst_book_ratio
            FROM per_book pb
           GROUP BY pb.user_id
        )
        SELECT u.id, u.email, u.name,
               c.last_active, c.days_silent, c.active_days_total,
               p.lessons_done, p.lessons_started, p.books_started,
               (p.worst_book_ratio * 100)::numeric(5,1) AS worst_book_pct
          FROM candidates c
          JOIN users u    ON u.id = c.user_id
          JOIN progress p ON p.user_id = c.user_id
         WHERE p.books_started >= 1
           AND p.worst_book_ratio < 0.5
         ORDER BY c.days_silent DESC
         LIMIT ${q.limit} OFFSET ${q.offset}
      `);

      const students = rows.rows.map((r) => {
        const row = r as UserRow;
        const started = Number(row.lessons_started ?? 0);
        const done = Number(row.lessons_done ?? 0);
        return shapeUserRow(row, {
          lastActiveDate: row.last_active
            ? String(row.last_active).slice(0, 10)
            : null,
          daysSilent: Number(row.days_silent ?? 0),
          activeDaysTotal: Number(row.active_days_total ?? 0),
          lessonsStarted: started,
          lessonsCompleted: done,
          booksStarted: Number(row.books_started ?? 0),
          worstBookCompletionPct:
            row.worst_book_pct != null ? Number(row.worst_book_pct) : null,
          completionRatePct:
            started > 0 ? Math.round((done / started) * 1000) / 10 : null,
        });
      });

      res.json({ limit: q.limit, offset: q.offset, students });
    } catch (err) {
      next(err);
    }
  },
);

// Per-user full bundle for admin drill-down
router.get(
  "/admin/english/interventions/users/:userId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const userId = z.string().uuid().parse(req.params.userId);
      const exists = await db.execute(sql`
        SELECT id, email, name FROM users WHERE id = ${userId}
      `);
      if (exists.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const u = exists.rows[0] as UserRow;
      const signals = await computeStudentSignals(userId);
      res.json({
        user: {
          userId: String(u.id),
          email: String(u.email ?? ""),
          name: u.name ? String(u.name) : null,
        },
        ...signals,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
