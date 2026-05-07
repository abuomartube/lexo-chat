// ============================================================================
// English Student Adaptive Profile — student + admin endpoints over the
// adaptive-profile-engine. Read-heavy: cached row is reused for up to 1h
// unless `?fresh=1` is passed or the explicit recompute endpoint is hit.
//
// Privacy: only educational interaction patterns are exposed. No demographics,
// no mental-state labels, no personality typing.
//
// Student endpoints (requireAuth, scoped to req.session.userId):
//   GET  /english/me/adaptive-profile               — full profile
//   GET  /english/me/adaptive-profile/learning-style
//   GET  /english/me/adaptive-profile/signals       — personalization booleans
//   GET  /english/me/adaptive-profile/trends        — 7d/30d/lifetime
//   POST /english/me/adaptive-profile/recompute     — force fresh
//
// Admin endpoints (requireAdmin):
//   GET  /admin/english/adaptive/users              — list w/ basic summary
//   GET  /admin/english/adaptive/users/:userId      — full per-user profile
//   GET  /admin/english/adaptive/patterns           — cohort signal counts
//
// NOT in openapi.yaml (matches english-analytics.ts / -interventions.ts).
// ============================================================================

import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  computeAdaptiveProfile,
  getOrComputeProfile,
} from "../lib/adaptive-profile-engine";

const router: IRouter = Router();

// Explicit truthy-string parsing — `z.coerce.boolean()` would treat the
// literal string "false" as `true`, accidentally bypassing the cache.
const FreshQ = z.object({
  fresh: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});
const PaginationQ = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

// ===========================================================================
// Student endpoints
// ===========================================================================

router.get(
  "/english/me/adaptive-profile",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const { fresh } = FreshQ.parse(req.query);
      const p = await getOrComputeProfile(userId, { forceRecompute: !!fresh });
      res.json(p);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/me/adaptive-profile/learning-style",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const p = await getOrComputeProfile(userId);
      res.json({
        userId,
        lastComputedAt: p.lastComputedAt,
        learningStyle: p.learningStyle,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/me/adaptive-profile/signals",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const p = await getOrComputeProfile(userId);
      res.json({
        userId,
        lastComputedAt: p.lastComputedAt,
        signals: p.signals,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/me/adaptive-profile/trends",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const p = await getOrComputeProfile(userId);
      res.json({
        userId,
        lastComputedAt: p.lastComputedAt,
        trends: p.trends,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/english/me/adaptive-profile/recompute",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const p = await computeAdaptiveProfile(userId);
      res.json(p);
    } catch (err) {
      next(err);
    }
  },
);

// ===========================================================================
// Admin endpoints
// ===========================================================================

// List students with a cached adaptive-profile row, ordered by most recent
// recompute. We deliberately do NOT lazily compute for missing users here —
// admins viewing the cohort should see who has been seen by the engine.
router.get(
  "/admin/english/adaptive/users",
  requireAdmin,
  async (req, res, next) => {
    try {
      const q = PaginationQ.parse(req.query);
      const rows = await db.execute(sql`
        SELECT u.id, u.email, u.name,
               p.evidence_count, p.last_computed_at,
               p.traits->'studyConsistency'->>'value'        AS study_consistency,
               p.traits->'quizConfidence'->>'value'          AS quiz_confidence,
               p.traits->'vocabularyRetention'->>'value'     AS vocab_retention,
               p.traits->'improvementVelocity'->>'value'     AS improvement_velocity,
               p.difficulty->'recommendedIntensity'->>'value' AS recommended_intensity,
               p.difficulty->'currentComfortLevel'->>'value'  AS comfort_level
          FROM english_adaptive_profile p
          JOIN users u ON u.id = p.user_id
         ORDER BY p.last_computed_at DESC
         LIMIT ${q.limit} OFFSET ${q.offset}
      `);
      const students = rows.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          userId: String(row.id),
          email: String(row.email ?? ""),
          name: row.name ? String(row.name) : null,
          evidenceCount: Number(row.evidence_count ?? 0),
          lastComputedAt: row.last_computed_at
            ? new Date(String(row.last_computed_at)).toISOString()
            : null,
          studyConsistencyPct: numOrNull(row.study_consistency),
          quizConfidencePct: numOrNull(row.quiz_confidence),
          vocabRetentionPct: numOrNull(row.vocab_retention),
          improvementVelocityPct: numOrNull(row.improvement_velocity),
          recommendedIntensity: row.recommended_intensity ?? null,
          comfortLevel: row.comfort_level ?? null,
        };
      });
      res.json({ limit: q.limit, offset: q.offset, students });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/admin/english/adaptive/users/:userId",
  requireAdmin,
  async (req, res, next) => {
    try {
      const userId = z.string().uuid().parse(req.params.userId);
      const userRow = await db.execute(sql`
        SELECT id, email, name FROM users WHERE id = ${userId} LIMIT 1
      `);
      if (userRow.rows.length === 0) {
        res.status(404).json({ error: "user_not_found" });
        return;
      }
      const u = userRow.rows[0] as Record<string, unknown>;
      const p = await getOrComputeProfile(userId);
      res.json({
        user: {
          userId: String(u.id),
          email: String(u.email ?? ""),
          name: u.name ? String(u.name) : null,
        },
        profile: p,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Cohort patterns: how many students each personalization flag is true for,
// plus the most common comfort level / recommended intensity. Single SQL.
router.get(
  "/admin/english/adaptive/patterns",
  requireAdmin,
  async (_req, res, next) => {
    try {
      const flagsRes = await db.execute(sql`
        SELECT kv.key                                                     AS flag,
               COUNT(*) FILTER (WHERE (kv.value->>'value')::boolean IS TRUE)::int  AS true_count,
               COUNT(*) FILTER (WHERE (kv.value->>'value')::boolean IS FALSE)::int AS false_count
          FROM english_adaptive_profile p
          CROSS JOIN LATERAL jsonb_each(p.signals) AS kv
         GROUP BY kv.key
         ORDER BY true_count DESC
      `);
      const distRes = await db.execute(sql`
        SELECT
          difficulty->'recommendedIntensity'->>'value' AS intensity,
          difficulty->'currentComfortLevel'->>'value'  AS comfort_level,
          COUNT(*)::int                                AS users
          FROM english_adaptive_profile
         GROUP BY 1, 2
      `);
      res.json({
        flagCounts: flagsRes.rows.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            flag: String(row.flag),
            trueCount: Number(row.true_count ?? 0),
            falseCount: Number(row.false_count ?? 0),
          };
        }),
        intensityComfortDistribution: distRes.rows.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            recommendedIntensity: row.intensity ?? null,
            comfortLevel: row.comfort_level ?? null,
            users: Number(row.users ?? 0),
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  },
);

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

export default router;
