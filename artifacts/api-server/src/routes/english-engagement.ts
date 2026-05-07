// ============================================================================
// English Engagement & Gamification routes — Phase E5.
//
// Endpoints (all under /api, all require auth, all English-only):
//   GET  /english/me/progression
//   GET  /english/me/achievements
//   GET  /english/me/motivation
//   POST /english/me/sessions/complete   body: { attempts, correct, durationSeconds }
//
// Service: `english-engagement-service.ts`. No new persistence other than
// the (idempotent) achievement + daily-activity writes already isolated in
// the service.
// ============================================================================

import { Router, type IRouter } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, englishSessionMarkersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  evaluateAchievements,
  getMotivationalMessage,
  getProgressionSummary,
  listAchievements,
  recordDailyActivity,
} from "../lib/english-engagement-service";
import { getTodayPlan } from "../lib/english-planner-service";

const router: IRouter = Router();

router.get("/english/me/progression", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const summary = await getProgressionSummary(userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get("/english/me/achievements", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const list = await listAchievements(userId);
    res.json({ achievements: list });
  } catch (err) {
    next(err);
  }
});

router.get("/english/me/motivation", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    // Re-derive signals via the planner (single source of truth) so the
    // motivation copy never drifts from what the hero shows.
    const plan = await getTodayPlan(userId);
    const summary = await getProgressionSummary(userId);
    const message = getMotivationalMessage({
      streakDays: plan.signals.streakDays,
      accuracy: plan.signals.accuracy,
      weakRatio: plan.signals.weakRatio,
      recentFailures: plan.signals.recentFailures,
      masteredCount: plan.signals.masteredCount,
      totalWords: plan.signals.totalWords,
      level: summary.level,
    });
    res.json({ message, level: summary.level, streakDays: plan.signals.streakDays });
  } catch (err) {
    next(err);
  }
});

// B-6 (Phase E5 stabilization) — body fields are accepted for backward
// compatibility but `attempts` and `correct` are IGNORED. Session integrity
// (attempt count, correctness count, perfect-session) is derived
// server-side from `english_vocab_attempt_log` rows in the session window.
const SessionCompleteBody = z.object({
  attempts: z.coerce.number().int().min(0).max(500).optional(),
  correct: z.coerce.number().int().min(0).max(500).optional(),
  wordsMastered: z.coerce.number().int().min(0).max(500).optional().default(0),
  durationSeconds: z.coerce.number().int().min(0).max(60 * 60 * 4).optional().default(0),
});

const PERFECT_SESSION_MIN_ATTEMPTS = 8;
// Grace window added to the client-reported duration when scanning for the
// session's attempt rows. Keeps us robust against clock skew / network jitter.
const SESSION_WINDOW_GRACE_SECONDS = 60;

router.post(
  "/english/me/sessions/complete",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const parsed = SessionCompleteBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }
      const { durationSeconds } = parsed.data;

      // Server-derived integrity. The lookup window is bounded ABOVE by
      // (durationSeconds + grace, capped at 4h) AND BELOW by the user's
      // last-session watermark from `english_session_markers`. The
      // watermark guarantees attempts from a previous session can never
      // be counted again, regardless of what `durationSeconds` the client
      // sends, so a bloated client value cannot fabricate a perfect session.
      const windowSeconds = Math.max(
        60, // floor: at least one minute of attempts always counts as the session
        Math.min(60 * 60 * 4, durationSeconds + SESSION_WINDOW_GRACE_SECONDS),
      );

      const aggRow = await db.execute<{ attempts: string; correct: string }>(sql`
        WITH boundary AS (
          SELECT GREATEST(
                   now() - (${windowSeconds} || ' seconds')::interval,
                   COALESCE(
                     (SELECT last_completed_at
                        FROM english_session_markers
                        WHERE user_id = ${userId}),
                     '-infinity'::timestamptz
                   )
                 ) AS lower_bound
        )
        SELECT COUNT(*)::text AS attempts,
               COUNT(*) FILTER (WHERE was_correct)::text AS correct
        FROM english_vocab_attempt_log, boundary
        WHERE user_id = ${userId}
          AND created_at > boundary.lower_bound
      `);
      const serverAttempts = Number(aggRow.rows[0]?.attempts ?? 0);
      const serverCorrect = Number(aggRow.rows[0]?.correct ?? 0);

      // "Perfect session" = real session (>= PERFECT_SESSION_MIN_ATTEMPTS
      // server-confirmed attempts) with 100% correct. Floor prevents a
      // trivially short "1/1" run from gaming the achievement.
      const perfect =
        serverAttempts >= PERFECT_SESSION_MIN_ATTEMPTS &&
        serverCorrect === serverAttempts;

      // Daily activity: count this session + add active seconds. Per-attempt
      // wordsStudied/wordsCorrect were already recorded on each attempt.
      try {
        await recordDailyActivity(userId, {
          sessionsCompleted: 1,
          secondsActive: durationSeconds,
        });
      } catch {
        /* engagement is non-blocking */
      }

      let newlyGranted: string[] = [];
      try {
        newlyGranted = await evaluateAchievements(userId, {
          perfectSessionCompleted: perfect,
        });
      } catch {
        newlyGranted = [];
      }

      // Advance the per-user session watermark so the next call cannot
      // re-count any of these attempts. Done last so a partial failure
      // above never silently consumes the window.
      try {
        await db
          .insert(englishSessionMarkersTable)
          .values({ userId, lastCompletedAt: new Date() })
          .onConflictDoUpdate({
            target: englishSessionMarkersTable.userId,
            set: { lastCompletedAt: sql`now()` },
          });
      } catch {
        /* watermark advance is best-effort; worst case the next session
           briefly overcounts old attempts within the window. */
      }

      res.json({
        perfect,
        attempts: serverAttempts,
        correct: serverCorrect,
        newlyGranted,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
