import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  liveSessionsTable,
  enrollmentsTable,
  englishEnrollmentsTable,
  LIVE_SESSION_AUDIENCE_VALUES,
  LIVE_SESSION_COURSE_VALUES,
  TIER_VALUES,
  ENGLISH_TIER_VALUES,
  type LiveSession,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  createZoomMeeting,
  deleteZoomMeeting,
  updateZoomMeeting,
} from "../lib/zoom";

const router: IRouter = Router();

// ─────────────────────────── Helpers ───────────────────────────

/**
 * Strip `zoomStartUrl` (host link) from sessions that go to students. Only
 * admins ever need the start URL.
 */
function toStudentView(s: LiveSession) {
  // Don't include zoomStartUrl — that's the host-only link.
  const { zoomStartUrl: _omit, ...rest } = s;
  return rest;
}

/**
 * Resolve which sessions a given user is allowed to see:
 *   - all "public" sessions
 *   - any "course" session where the user has an active enrollment in
 *     (course, tier). A null tier on the session means "any tier of that course".
 */
async function listSessionsForUser(userId: string) {
  const now = new Date();
  // Pull all non-cancelled, future-or-current sessions (cheap — small table).
  const all = await db
    .select()
    .from(liveSessionsTable)
    .where(
      and(
        isNull(liveSessionsTable.cancelledAt),
        gte(
          liveSessionsTable.startsAt,
          new Date(now.getTime() - 60 * 60 * 1000), // include sessions started up to 1h ago
        ),
      ),
    )
    .orderBy(asc(liveSessionsTable.startsAt));

  if (all.length === 0) return [];

  // Pull both enrollment sets once.
  const [introRows, englishRows] = await Promise.all([
    db
      .select({
        tier: enrollmentsTable.tier,
        expiresAt: enrollmentsTable.expiresAt,
      })
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, userId),
          eq(enrollmentsTable.status, "active"),
        ),
      ),
    db
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
      ),
  ]);

  const activeIntroTiers = new Set(
    introRows
      .filter((r) => !r.expiresAt || r.expiresAt > now)
      .map((r) => r.tier),
  );
  const activeEnglishTiers = new Set(
    englishRows
      .filter((r) => !r.expiresAt || r.expiresAt > now)
      .map((r) => r.tier),
  );

  return all.filter((s) => {
    if (s.audience === "public") return true;
    if (s.audience !== "course" || !s.course) return false;
    const set = s.course === "intro" ? activeIntroTiers : activeEnglishTiers;
    if (set.size === 0) return false;
    // null tier = any tier in this course
    if (!s.tier) return true;
    return set.has(s.tier);
  });
}

// ─────────────────────────── Student ───────────────────────────

/**
 * GET /live-sessions
 * Returns sessions the current user is eligible to attend.
 */
router.get("/live-sessions", requireAuth, async (req, res, next) => {
  try {
    const sessions = await listSessionsForUser(req.session.userId!);
    res.json({ sessions: sessions.map(toStudentView) });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────── Admin ───────────────────────────

const CreateSessionBody = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    audience: z.enum(LIVE_SESSION_AUDIENCE_VALUES),
    course: z.enum(LIVE_SESSION_COURSE_VALUES).nullable().optional(),
    tier: z.string().trim().max(16).nullable().optional(),
    startsAt: z.string().datetime(),
    durationMin: z.number().int().min(5).max(600),
  })
  .superRefine((val, ctx) => {
    if (val.audience === "course") {
      if (!val.course) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["course"],
          message: "course is required when audience=course",
        });
        return;
      }
      // Validate tier matches the course's valid tier set when provided.
      if (val.tier) {
        const valid =
          val.course === "intro"
            ? (TIER_VALUES as readonly string[])
            : (ENGLISH_TIER_VALUES as readonly string[]);
        if (!valid.includes(val.tier)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["tier"],
            message: `invalid tier for ${val.course}`,
          });
        }
      }
    }
  });

router.get("/admin/live-sessions", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(liveSessionsTable)
      .orderBy(desc(liveSessionsTable.startsAt));
    res.json({ sessions: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/live-sessions", requireAdmin, async (req, res, next) => {
  try {
    const parsed = CreateSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      res.status(400).json({ error: "invalid_startsAt" });
      return;
    }

    // Create on Zoom first; only persist locally on success so we never
    // store a "session without a real meeting".
    let meeting;
    try {
      meeting = await createZoomMeeting({
        topic: body.title,
        agenda: body.description,
        startTime: startsAt,
        durationMin: body.durationMin,
      });
    } catch (err) {
      req.log.error({ err }, "zoom meeting create failed");
      res.status(502).json({ error: "zoom_create_failed" });
      return;
    }

    const [row] = await db
      .insert(liveSessionsTable)
      .values({
        title: body.title,
        description: body.description ?? null,
        audience: body.audience,
        course: body.audience === "course" ? body.course! : null,
        tier: body.audience === "course" ? (body.tier ?? null) : null,
        startsAt,
        durationMin: body.durationMin,
        zoomMeetingId: String(meeting.id),
        zoomJoinUrl: meeting.join_url,
        zoomStartUrl: meeting.start_url,
        zoomPasscode: meeting.password ?? null,
        hostId: req.session.userId!,
      })
      .returning();
    res.status(201).json({ session: row });
  } catch (err) {
    next(err);
  }
});

const PatchSessionBody = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(5).max(600).optional(),
});

router.patch(
  "/admin/live-sessions/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const parsed = PatchSessionBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const body = parsed.data;
      const [existing] = await db
        .select()
        .from(liveSessionsTable)
        .where(eq(liveSessionsTable.id, id));
      if (!existing) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const zoomPatch: Parameters<typeof updateZoomMeeting>[1] = {};
      if (body.title !== undefined) zoomPatch.topic = body.title;
      if (body.description !== undefined)
        zoomPatch.agenda = body.description ?? "";
      if (body.startsAt !== undefined) zoomPatch.start_time = body.startsAt;
      if (body.durationMin !== undefined) zoomPatch.duration = body.durationMin;
      if (Object.keys(zoomPatch).length > 0) {
        try {
          await updateZoomMeeting(existing.zoomMeetingId, zoomPatch);
        } catch (err) {
          req.log.warn({ err }, "zoom update failed (continuing local update)");
        }
      }

      const [updated] = await db
        .update(liveSessionsTable)
        .set({
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.startsAt !== undefined
            ? { startsAt: new Date(body.startsAt) }
            : {}),
          ...(body.durationMin !== undefined
            ? { durationMin: body.durationMin }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(liveSessionsTable.id, id))
        .returning();
      res.json({ session: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/admin/live-sessions/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const [existing] = await db
        .select()
        .from(liveSessionsTable)
        .where(eq(liveSessionsTable.id, id));
      if (!existing) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      // Best-effort: cancel on Zoom. If Zoom is down we still mark cancelled
      // locally so it disappears from the student view immediately.
      try {
        await deleteZoomMeeting(existing.zoomMeetingId);
      } catch (err) {
        req.log.warn({ err }, "zoom delete failed (continuing local cancel)");
      }
      await db
        .update(liveSessionsTable)
        .set({ cancelledAt: new Date() })
        .where(eq(liveSessionsTable.id, id));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// Suppress unused-import warning when audience filter doesn't need them.
void or;
void sql;

export default router;
