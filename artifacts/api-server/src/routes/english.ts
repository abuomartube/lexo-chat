import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "node:crypto";
import {
  db,
  usersTable,
  englishEnrollmentsTable,
  englishAccessCodesTable,
  englishLessonsTable,
  englishLessonProgressTable,
  englishLessonCompletionsTable,
  ENGLISH_TIER_VALUES,
  getAllowedEnglishLevels,
  type EnglishTier,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";
import { subscriptionExpiryFromNow } from "../lib/subscription-policy";
import {
  notifyStudentSelfEnrolled,
  notifyEnrollmentApproved,
} from "../lib/email-triggers";
import { ENGLISH_TZ, riyadhDateString } from "../lib/english-day";

const router: IRouter = Router();

const TierSchema = z.enum(ENGLISH_TIER_VALUES);

// PG SQLSTATE 23505 = unique_violation. drizzle-orm wraps query failures in
// DrizzleQueryError where the original pg error sits on `.cause`.
// Sentinel error: throw inside the redeem transaction so the surrounding
// `tx.update(...)` that consumed a code-use is rolled back. Caught outside.
class AlreadyEnrolledError extends Error {
  constructor(public tier: EnglishTier) {
    super("already_enrolled");
    this.name = "AlreadyEnrolledError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const direct = (err as { code?: unknown }).code;
  if (direct === "23505") return true;
  const cause = (err as { cause?: unknown }).cause;
  if (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: unknown }).code === "23505"
  ) {
    return true;
  }
  return false;
}

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = crypto.randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[buf[i]! % alphabet.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

// ----- Student endpoints -----

const StudyTimeQuery = z.object({
  range: z.enum(["week", "month"]).optional().default("week"),
});

// GET /english/me/study-time?range=week|month
//
// B-14 + B-16 (Phase E5 stabilization) — exact per-event aggregation.
// Reads positive `delta_seconds` rows from `english_study_events` (one row
// per progress write, see english-mentor.ts), grouped by Asia/Riyadh civil
// date. No more attributing a lesson's full cumulative time to its last
// update; each watch increment is bucketed on the day it actually happened.
//
// Days in the response are Riyadh calendar dates (YYYY-MM-DD). The window
// is the last `days` Riyadh civil days, inclusive of today.
router.get("/english/me/study-time", requireAuth, async (req, res, next) => {
  try {
    const parsed = StudyTimeQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid range" });
      return;
    }
    const userId = req.session.userId!;
    const days = parsed.data.range === "month" ? 30 : 7;

    // Compute the start-of-window date in Riyadh, then convert to a UTC
    // timestamp so the SQL filter is bound-friendly (timestamptz column).
    const todayRiyadh = riyadhDateString();
    const [ty, tm, td] = todayRiyadh.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    // Anchor at noon UTC and step back; the day-arithmetic is DST-safe
    // (Riyadh is fixed UTC+3, no DST, but we keep the noon anchor for
    // future-proofing).
    const windowStartUtc = new Date(
      Date.UTC(ty, tm - 1, td, 12, 0, 0) - (days - 1) * 86_400_000 - 86_400_000,
    );

    const rows = await db.execute<{ day: string; seconds: string }>(sql`
      SELECT to_char(occurred_at AT TIME ZONE ${ENGLISH_TZ}, 'YYYY-MM-DD') AS day,
             COALESCE(SUM(delta_seconds), 0)::text AS seconds
      FROM english_study_events
      WHERE user_id = ${userId}
        AND delta_seconds > 0
        AND occurred_at >= ${windowStartUtc}
      GROUP BY day
    `);

    const byDay = new Map<string, number>();
    for (const r of rows.rows) {
      byDay.set(r.day, Number(r.seconds) || 0);
    }

    // Build the inclusive [today - (days-1), today] Riyadh-date list.
    const dailyBreakdown: { date: string; minutes: number }[] = [];
    let totalSeconds = 0;
    for (let i = days - 1; i >= 0; i--) {
      const t =
        Date.UTC(ty, tm - 1, td, 12, 0, 0) - i * 86_400_000;
      const key = riyadhDateString(new Date(t));
      const seconds = byDay.get(key) ?? 0;
      totalSeconds += seconds;
      dailyBreakdown.push({ date: key, minutes: Math.round(seconds / 60) });
    }

    // Total minutes from raw seconds (one rounding step) to avoid drift.
    const totalMinutes = Math.round(totalSeconds / 60);

    res.set("Cache-Control", "no-store");
    res.json({ totalMinutes, dailyBreakdown });
  } catch (err) {
    next(err);
  }
});

// GET /english/me/streak
//
// B-16 (Phase E5 stabilization) — daily-activity streak in Asia/Riyadh
// civil days. Derived from english_lesson_progress.updatedAt and
// english_lesson_completions.completedAt, plus english_xp_events for full
// alignment with the planner/vocab streak.
//
// Returns:
//   - currentStreak:  consecutive Riyadh days ending today (or yesterday
//                     if the student hasn't done anything yet today).
//   - longestStreak:  longest run of consecutive active days in the
//                     400-day window.
//   - todayActive:    true iff there's activity on today's Riyadh date.
//   - lastActiveDate: most recent active Riyadh date as YYYY-MM-DD, or null.
router.get("/english/me/streak", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;

    const rows = await db.execute<{ day: string }>(sql`
      SELECT DISTINCT day FROM (
        SELECT (${englishLessonProgressTable.updatedAt} AT TIME ZONE ${ENGLISH_TZ})::date AS day
        FROM ${englishLessonProgressTable}
        WHERE ${englishLessonProgressTable.userId} = ${userId}
          AND ${englishLessonProgressTable.updatedAt} >= now() - interval '400 days'
        UNION
        SELECT (${englishLessonCompletionsTable.completedAt} AT TIME ZONE ${ENGLISH_TZ})::date AS day
        FROM ${englishLessonCompletionsTable}
        WHERE ${englishLessonCompletionsTable.userId} = ${userId}
          AND ${englishLessonCompletionsTable.completedAt} >= now() - interval '400 days'
        UNION
        SELECT (created_at AT TIME ZONE ${ENGLISH_TZ})::date AS day
        FROM english_xp_events
        WHERE user_id = ${userId}
          AND created_at >= now() - interval '400 days'
      ) d
      ORDER BY day DESC
    `);

    const days: string[] = [];
    for (const r of rows.rows ?? []) {
      const v = (r as { day: unknown }).day;
      const s =
        v instanceof Date
          ? riyadhDateString(v)
          : typeof v === "string"
            ? v.slice(0, 10)
            : null;
      if (s) days.push(s);
    }

    const todayRiyadh = riyadhDateString();
    const yesterdayRiyadh = riyadhDateString(
      new Date(Date.now() - 86_400_000),
    );

    const lastActiveDate = days[0] ?? null;
    const todayActive = lastActiveDate === todayRiyadh;

    // Current streak: walk consecutive Riyadh days backward from today (or
    // yesterday — grace). Stop at the first gap.
    let currentStreak = 0;
    if (lastActiveDate === todayRiyadh || lastActiveDate === yesterdayRiyadh) {
      const set = new Set(days);
      let cursorKey = lastActiveDate;
      while (cursorKey && set.has(cursorKey)) {
        currentStreak += 1;
        const [yy, mm, dd] = cursorKey.split("-").map(Number) as [
          number,
          number,
          number,
        ];
        cursorKey = riyadhDateString(
          new Date(Date.UTC(yy, mm - 1, dd, 12, 0, 0) - 86_400_000),
        );
      }
    }

    // Longest streak across the window.
    let longestStreak = 0;
    if (days.length > 0) {
      const asc = [...days].reverse();
      let run = 1;
      longestStreak = 1;
      for (let i = 1; i < asc.length; i++) {
        const [py, pm, pd] = asc[i - 1]!.split("-").map(Number) as [
          number,
          number,
          number,
        ];
        const expectedNext = riyadhDateString(
          new Date(Date.UTC(py, pm - 1, pd, 12, 0, 0) + 86_400_000),
        );
        if (asc[i] === expectedNext) {
          run += 1;
          if (run > longestStreak) longestStreak = run;
        } else {
          run = 1;
        }
      }
    }

    res.set("Cache-Control", "no-store");
    res.json({ currentStreak, longestStreak, todayActive, lastActiveDate });
  } catch (err) {
    next(err);
  }
});

// GET /english/me/last-lesson
//
// Returns the single most-recently-touched English lesson the student can
// still resume. Powers the dashboard's "Continue Learning" card. Read-only;
// no schema or migration changes.
//
// "Resumable" means:
//   - lastPositionSeconds >= 5  (matches RESUME_MIN_SECONDS in english/Lessons.tsx,
//     so we never advertise resume on a video the player would restart from 0)
//   - durationSeconds = 0 OR lastPositionSeconds < durationSeconds - 5
//     (skip videos already at/near the end)
//   - lesson is NOT already in english_lesson_completions
//   - lesson's level is reachable by the student's CURRENT active tiers
//     (so a tier downgrade silently skips the now-locked lesson)
//
// Sort: english_lesson_progress.updated_at DESC, LIMIT 1.
//
// Tier→level mapping is sourced from @workspace/db (`getAllowedEnglishLevels`)
// — the single source of truth shared with english-mentor.ts. Keep using the
// helper; do not re-inline the mapping here.

router.get("/english/me/last-lesson", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;

    // Resolve which CEFR levels this student can currently access.
    const enrollmentRows = await db
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
    const activeTiers = new Set(
      enrollmentRows
        .filter((r) => !r.expiresAt || r.expiresAt > now)
        .map((r) => r.tier),
    );

    const allowedLevels = getAllowedEnglishLevels([...activeTiers]);

    // Student has no active access → nothing to resume.
    if (allowedLevels.length === 0) {
      res.set("Cache-Control", "no-store");
      res.json({ lesson: null });
      return;
    }

    // Single query: progress JOIN lessons LEFT JOIN completions, filter,
    // order by updatedAt desc, limit 1.
    const rows = await db
      .select({
        id: englishLessonsTable.id,
        title: englishLessonsTable.title,
        titleAr: englishLessonsTable.titleAr,
        level: englishLessonsTable.level,
        tier: englishLessonsTable.tier,
        lastPositionSeconds: englishLessonProgressTable.lastPositionSeconds,
        watchedSeconds: englishLessonProgressTable.watchedSeconds,
        durationSeconds: englishLessonProgressTable.durationSeconds,
        updatedAt: englishLessonProgressTable.updatedAt,
        completionId: englishLessonCompletionsTable.id,
      })
      .from(englishLessonProgressTable)
      .innerJoin(
        englishLessonsTable,
        eq(englishLessonsTable.id, englishLessonProgressTable.lessonId),
      )
      .leftJoin(
        englishLessonCompletionsTable,
        and(
          eq(
            englishLessonCompletionsTable.userId,
            englishLessonProgressTable.userId,
          ),
          eq(
            englishLessonCompletionsTable.lessonId,
            englishLessonProgressTable.lessonId,
          ),
        ),
      )
      .where(
        and(
          eq(englishLessonProgressTable.userId, userId),
          sql`${englishLessonProgressTable.lastPositionSeconds} >= 5`,
          sql`(${englishLessonProgressTable.durationSeconds} = 0 OR ${englishLessonProgressTable.lastPositionSeconds} < ${englishLessonProgressTable.durationSeconds} - 5)`,
          sql`${englishLessonCompletionsTable.id} IS NULL`,
          sql`${englishLessonsTable.level} = ANY(${allowedLevels}::text[])`,
        ),
      )
      .orderBy(desc(englishLessonProgressTable.updatedAt))
      .limit(1);

    res.set("Cache-Control", "no-store");
    if (rows.length === 0) {
      res.json({ lesson: null });
      return;
    }

    const r = rows[0];
    res.json({
      lesson: {
        id: r.id,
        title: r.title,
        titleAr: r.titleAr,
        level: r.level,
        tier: r.tier,
        lastPositionSeconds: r.lastPositionSeconds,
        watchedSeconds: r.watchedSeconds,
        durationSeconds: r.durationSeconds,
        updatedAt: r.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/english/me", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(englishEnrollmentsTable)
      .where(eq(englishEnrollmentsTable.userId, req.session.userId!));

    const now = new Date();
    const enriched = rows.map((r) => ({
      ...r,
      isActive: r.status === "active" && (!r.expiresAt || r.expiresAt > now),
    }));
    res.set("Cache-Control", "no-store");
    res.json({ enrollments: enriched });
  } catch (err) {
    next(err);
  }
});

const RedeemBody = z.object({
  code: z.string().trim().min(3).max(64),
});

router.post("/english/redeem", requireAuth, async (req, res, next) => {
  try {
    const parsed = RedeemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    const codeValue = parsed.data.code.toUpperCase();
    const userId = req.session.userId!;

    const result = await db
      .transaction(async (tx) => {
        const [code] = await tx
          .select()
          .from(englishAccessCodesTable)
          .where(eq(englishAccessCodesTable.code, codeValue))
          .limit(1);

        if (!code) return { error: "code_not_found" as const };
        if (code.status !== "active")
          return { error: "code_not_active" as const };
        if (code.expiresAt && code.expiresAt < new Date())
          return { error: "code_expired" as const };
        if (code.usedCount >= code.maxUses)
          return { error: "code_exhausted" as const };

        const tier = code.tier as EnglishTier;
        if (!ENGLISH_TIER_VALUES.includes(tier))
          return { error: "code_invalid_tier" as const };

        // Atomically claim a use.
        const claimed = await tx
          .update(englishAccessCodesTable)
          .set({
            usedCount: sql`${englishAccessCodesTable.usedCount} + 1`,
            status: sql`CASE WHEN ${englishAccessCodesTable.usedCount} + 1 >= ${englishAccessCodesTable.maxUses} THEN 'used' ELSE 'active' END`,
            redeemedByUserId: userId,
            redeemedAt: new Date(),
          })
          .where(
            and(
              eq(englishAccessCodesTable.id, code.id),
              eq(englishAccessCodesTable.status, "active"),
              sql`${englishAccessCodesTable.usedCount} < ${englishAccessCodesTable.maxUses}`,
            ),
          )
          .returning({ id: englishAccessCodesTable.id });

        if (claimed.length === 0) {
          return { error: "code_exhausted" as const };
        }

        try {
          const [enrollment] = await tx
            .insert(englishEnrollmentsTable)
            .values({
              userId,
              tier,
              status: "active",
              source: "code",
              note: `Redeemed code ${code.code}`,
              expiresAt: subscriptionExpiryFromNow(),
            })
            .returning();
          return { enrollment };
        } catch (err) {
          // Roll back the code-use claim above by throwing — caught outside the
          // transaction so the unique-violation does not burn the access code.
          if (isUniqueViolation(err)) {
            throw new AlreadyEnrolledError(tier);
          }
          throw err;
        }
      })
      .catch((err) => {
        if (err instanceof AlreadyEnrolledError) {
          return { error: "already_enrolled" as const, tier: err.tier };
        }
        throw err;
      });

    if ("error" in result && result.error) {
      const map: Record<string, { status: number; message: string }> = {
        code_not_found: { status: 404, message: "Code not found" },
        code_not_active: { status: 400, message: "Code is not active" },
        code_expired: { status: 400, message: "Code has expired" },
        code_exhausted: { status: 400, message: "Code has been fully used" },
        code_invalid_tier: { status: 400, message: "Code has invalid tier" },
        already_enrolled: {
          status: 409,
          message: "You already have access to this tier",
        },
      };
      const e = map[result.error] ?? {
        status: 400,
        message: "Code redemption failed",
      };
      res.status(e.status).json({ error: e.message });
      return;
    }

    const enrollment = result.enrollment!;
    notifyStudentSelfEnrolled({
      log: req.log,
      userId: enrollment.userId,
      course: "english",
      tier: enrollment.tier,
      enrollmentId: enrollment.id,
    }).catch(() => undefined);

    res.status(201).json({ enrollment });
  } catch (err) {
    next(err);
  }
});

// ----- Admin endpoints -----

const GrantBody = z.object({
  tier: TierSchema,
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

router.post(
  "/admin/english/students/:id/grant",
  requireAdmin,
  async (req, res, next) => {
    try {
      const userId = String(req.params.id);
      const parsed = GrantBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid grant payload" });
        return;
      }
      const { tier, expiresAt, note } = parsed.data;

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!user) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      const [existing] = await db
        .select()
        .from(englishEnrollmentsTable)
        .where(
          and(
            eq(englishEnrollmentsTable.userId, userId),
            eq(englishEnrollmentsTable.tier, tier),
          ),
        )
        .limit(1);

      let enrollment;
      const wasAlreadyActive = existing?.status === "active";
      if (existing) {
        const [updated] = await db
          .update(englishEnrollmentsTable)
          .set({
            status: "active",
            source: "admin",
            grantedBy: req.session.userId!,
            grantedAt: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            note: note ?? existing.note,
          })
          .where(eq(englishEnrollmentsTable.id, existing.id))
          .returning();
        enrollment = updated;
      } else {
        const [created] = await db
          .insert(englishEnrollmentsTable)
          .values({
            userId,
            tier,
            status: "active",
            source: "admin",
            grantedBy: req.session.userId!,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            note,
          })
          .returning();
        enrollment = created;
      }

      // Send confirmation only when the enrollment newly became active
      // (skip if it was already active and the admin just refreshed it).
      if (enrollment && !wasAlreadyActive) {
        notifyEnrollmentApproved({
          log: req.log,
          userId: enrollment.userId,
          course: "english",
          tier: enrollment.tier,
          enrollmentId: enrollment.id,
        }).catch(() => undefined);
      }

      res.status(201).json({ enrollment });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/admin/english/enrollments/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [updated] = await db
        .update(englishEnrollmentsTable)
        .set({ status: "revoked" })
        .where(eq(englishEnrollmentsTable.id, String(req.params.id)))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Enrollment not found" });
        return;
      }
      res.json({ enrollment: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/admin/english/codes", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        code: englishAccessCodesTable,
        redeemerName: usersTable.name,
        redeemerEmail: usersTable.email,
      })
      .from(englishAccessCodesTable)
      .leftJoin(
        usersTable,
        eq(englishAccessCodesTable.redeemedByUserId, usersTable.id),
      )
      .orderBy(desc(englishAccessCodesTable.createdAt));

    const codes = rows.map((r) => ({
      ...r.code,
      redeemerName: r.redeemerName,
      redeemerEmail: r.redeemerEmail,
    }));
    res.json({ codes });
  } catch (err) {
    next(err);
  }
});

const CreateCodesBody = z.object({
  tier: TierSchema,
  count: z.number().int().min(1).max(100).default(1),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

router.post("/admin/english/codes", requireAdmin, async (req, res, next) => {
  try {
    const parsed = CreateCodesBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid payload", details: parsed.error.issues });
      return;
    }
    const { tier, count, maxUses, expiresAt, note } = parsed.data;
    const created = [];
    for (let i = 0; i < count; i++) {
      let inserted;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const [row] = await db
            .insert(englishAccessCodesTable)
            .values({
              code: generateCode(),
              tier,
              maxUses,
              createdBy: req.session.userId!,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              note,
            })
            .returning();
          inserted = row;
          break;
        } catch (err: unknown) {
          if (attempt === 2) throw err;
        }
      }
      if (inserted) created.push(inserted);
    }
    res.status(201).json({ codes: created });
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/admin/english/codes/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const [updated] = await db
        .update(englishAccessCodesTable)
        .set({ status: "revoked" })
        .where(eq(englishAccessCodesTable.id, String(req.params.id)))
        .returning();
      if (!updated) {
        res.status(404).json({ error: "Code not found" });
        return;
      }
      res.json({ code: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
