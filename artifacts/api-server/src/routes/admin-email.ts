import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  enrollmentsTable,
  englishEnrollmentsTable,
  emailsSentTable,
  EMAIL_TYPE_VALUES,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  sendEmail,
  buildExpiryReminderEmail,
  normalizeLocale,
} from "../lib/email";
import { broadcastEmailLimiter } from "../lib/rate-limit";
import { getAppOrigin } from "../lib/auth";

const router: IRouter = Router();

const BroadcastBody = z.object({
  audience: z.enum(["all", "course"]),
  courseSlug: z.enum(["intro", "english", "ielts"]).optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
});

// GET /admin/email/recipients?audience=all|course&courseSlug=...
// Returns the count of distinct recipients that would receive the broadcast,
// so the UI can show a confirmation dialog with the real number before send.
router.get("/admin/email/recipients", requireAdmin, async (req, res, next) => {
  try {
    const audience = req.query.audience;
    const courseSlug = req.query.courseSlug;
    if (audience === "all") {
      const [{ c }] = (
        await db.execute(
          sql`SELECT COUNT(*)::text AS c FROM users WHERE email_verified = TRUE`,
        )
      ).rows as { c: string }[];
      res.json({ count: Number(c ?? 0) });
      return;
    }
    if (audience === "course") {
      if (courseSlug === "intro") {
        const [{ c }] = (
          await db.execute(sql`
          SELECT COUNT(DISTINCT u.id)::text AS c
          FROM users u
          JOIN enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)
        ).rows as { c: string }[];
        res.json({ count: Number(c ?? 0) });
        return;
      }
      if (courseSlug === "english") {
        const [{ c }] = (
          await db.execute(sql`
          SELECT COUNT(DISTINCT u.id)::text AS c
          FROM users u
          JOIN english_enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)
        ).rows as { c: string }[];
        res.json({ count: Number(c ?? 0) });
        return;
      }
      if (courseSlug === "ielts") {
        // No ielts_enrollments table yet. Always 0.
        res.json({ count: 0 });
        return;
      }
    }
    res.status(400).json({ error: "Invalid audience or courseSlug" });
  } catch (err) {
    next(err);
  }
});

// POST /admin/email/broadcast
router.post(
  "/admin/email/broadcast",
  broadcastEmailLimiter,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = BroadcastBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message ?? "Invalid payload",
        });
        return;
      }
      const { audience, courseSlug, subject, body } = parsed.data;

      let recipients: { id: string; name: string; email: string }[] = [];
      if (audience === "all") {
        recipients = await db
          .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
          })
          .from(usersTable)
          .where(eq(usersTable.emailVerified, true));
      } else {
        if (!courseSlug) {
          res
            .status(400)
            .json({ error: "courseSlug is required when audience=course" });
          return;
        }
        if (courseSlug === "intro") {
          const rows = (
            await db.execute(sql`
          SELECT DISTINCT u.id, u.name, u.email
          FROM users u
          JOIN enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)
          ).rows as { id: string; name: string; email: string }[];
          recipients = rows;
        } else if (courseSlug === "english") {
          const rows = (
            await db.execute(sql`
          SELECT DISTINCT u.id, u.name, u.email
          FROM users u
          JOIN english_enrollments e ON e.user_id = u.id
          WHERE u.email_verified = TRUE AND e.status = 'active'
        `)
          ).rows as { id: string; name: string; email: string }[];
          recipients = rows;
        } else {
          // ielts has no enrollments table yet
          recipients = [];
        }
      }

      let sentCount = 0;
      let failedCount = 0;
      for (const r of recipients) {
        try {
          await sendEmail(
            {
              to: r.email,
              subject,
              text: `Hi ${r.name},\n\n${body}\n\n— Abu Omar EduLexo`,
            },
            { emailType: "broadcast", userId: r.id },
          );
          sentCount += 1;
        } catch (err) {
          failedCount += 1;
          req.log.error(
            { err, recipient: r.email },
            "Failed to send broadcast email",
          );
        }
      }

      req.log.info(
        {
          audience,
          courseSlug: courseSlug ?? null,
          recipientCount: recipients.length,
          sentCount,
          failedCount,
        },
        "Broadcast email completed",
      );

      res.json({
        recipientCount: recipients.length,
        sentCount,
        failedCount,
        stubMode: true,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Email log
// ---------------------------------------------------------------------------

const EmailTypeSchema = z.enum(EMAIL_TYPE_VALUES);
const EmailStatusSchema = z.enum(["sent", "failed"]);

router.get("/admin/emails", requireAdmin, async (req, res, next) => {
  try {
    const limitRaw = Number(req.query.limit ?? 100);
    const limit = Math.min(
      Math.max(1, isFinite(limitRaw) ? limitRaw : 100),
      500,
    );
    const typeQ = EmailTypeSchema.safeParse(req.query.type);
    const statusQ = EmailStatusSchema.safeParse(req.query.status);

    const conds = [];
    if (typeQ.success) conds.push(eq(emailsSentTable.emailType, typeQ.data));
    if (statusQ.success) conds.push(eq(emailsSentTable.status, statusQ.data));

    const q = db
      .select({
        id: emailsSentTable.id,
        userId: emailsSentTable.userId,
        toEmail: emailsSentTable.toEmail,
        subject: emailsSentTable.subject,
        emailType: emailsSentTable.emailType,
        status: emailsSentTable.status,
        error: emailsSentTable.error,
        sentAt: emailsSentTable.sentAt,
      })
      .from(emailsSentTable)
      .orderBy(desc(emailsSentTable.sentAt))
      .limit(limit);
    const rows = conds.length ? await q.where(and(...conds)) : await q;
    res.json({ emails: rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Expiry reminders
// ---------------------------------------------------------------------------

const ExpiringQuery = z.object({
  days: z.coerce.number().int().min(1).max(60).default(7),
});

type ExpiringRow = {
  enrollmentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  preferredLanguage: string;
  course: "intro" | "english";
  tier: string;
  expiresAt: Date;
  alreadyReminded: boolean;
};

async function loadExpiringEnrollments(days: number): Promise<ExpiringRow[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const intro = await db
    .select({
      enrollmentId: enrollmentsTable.id,
      userId: enrollmentsTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      preferredLanguage: usersTable.preferredLanguage,
      tier: enrollmentsTable.tier,
      expiresAt: enrollmentsTable.expiresAt,
    })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
    .where(
      and(
        eq(enrollmentsTable.status, "active"),
        isNotNull(enrollmentsTable.expiresAt),
        gt(enrollmentsTable.expiresAt, now),
        lte(enrollmentsTable.expiresAt, horizon),
        eq(usersTable.notifyExpiry, true),
      ),
    );

  const english = await db
    .select({
      enrollmentId: englishEnrollmentsTable.id,
      userId: englishEnrollmentsTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      preferredLanguage: usersTable.preferredLanguage,
      tier: englishEnrollmentsTable.tier,
      expiresAt: englishEnrollmentsTable.expiresAt,
    })
    .from(englishEnrollmentsTable)
    .innerJoin(usersTable, eq(englishEnrollmentsTable.userId, usersTable.id))
    .where(
      and(
        eq(englishEnrollmentsTable.status, "active"),
        isNotNull(englishEnrollmentsTable.expiresAt),
        gt(englishEnrollmentsTable.expiresAt, now),
        lte(englishEnrollmentsTable.expiresAt, horizon),
        eq(usersTable.notifyExpiry, true),
      ),
    );

  // Find which enrollment IDs already received a recent expiry reminder.
  const allIds = [
    ...intro.map((r) => r.enrollmentId),
    ...english.map((r) => r.enrollmentId),
  ];
  let reminded = new Set<string>();
  if (allIds.length) {
    const lookbackStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sentRows = await db
      .select({ relatedId: emailsSentTable.relatedId })
      .from(emailsSentTable)
      .where(
        and(
          eq(emailsSentTable.emailType, "expiry_reminder"),
          eq(emailsSentTable.status, "sent"),
          gt(emailsSentTable.sentAt, lookbackStart),
        ),
      );
    reminded = new Set(
      sentRows
        .map((r) => r.relatedId)
        .filter((v): v is string => v !== null && v !== undefined),
    );
  }

  const intoRow =
    (course: "intro" | "english") =>
    (r: (typeof intro)[number] | (typeof english)[number]): ExpiringRow => ({
      enrollmentId: r.enrollmentId,
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      preferredLanguage: r.preferredLanguage,
      course,
      tier: r.tier,
      expiresAt: r.expiresAt!,
      alreadyReminded: reminded.has(r.enrollmentId),
    });

  return [
    ...intro.map(intoRow("intro")),
    ...english.map(intoRow("english")),
  ].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
}

router.get("/admin/email/expiring", requireAdmin, async (req, res, next) => {
  try {
    const parsed = ExpiringQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid days param" });
      return;
    }
    const rows = await loadExpiringEnrollments(parsed.data.days);
    res.json({
      days: parsed.data.days,
      enrollments: rows.map((r) => ({
        enrollmentId: r.enrollmentId,
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        course: r.course,
        tier: r.tier,
        expiresAt: r.expiresAt,
        alreadyReminded: r.alreadyReminded,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/admin/email/send-expiry-reminders",
  broadcastEmailLimiter,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = ExpiringQuery.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid days param" });
        return;
      }
      const rows = await loadExpiringEnrollments(parsed.data.days);
      const dashboardUrl = `${getAppOrigin()}/dashboard`;

      let sentCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const lookbackStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      for (const r of rows) {
        if (r.alreadyReminded) {
          skippedCount += 1;
          continue;
        }
        // Per-row recheck right before send to mitigate races against a
        // concurrent send-expiry-reminders request that may have inserted a
        // row since `loadExpiringEnrollments` was called. Not fully atomic
        // (a true unique constraint would be required for that), but the
        // window is now microseconds wide and combined with broadcastEmailLimiter
        // (5/hr per admin in prod) makes duplicate sends extremely unlikely.
        const [recent] = await db
          .select({ id: emailsSentTable.id })
          .from(emailsSentTable)
          .where(
            and(
              eq(emailsSentTable.emailType, "expiry_reminder"),
              eq(emailsSentTable.status, "sent"),
              eq(emailsSentTable.relatedId, r.enrollmentId),
              gt(emailsSentTable.sentAt, lookbackStart),
            ),
          )
          .limit(1);
        if (recent) {
          skippedCount += 1;
          continue;
        }
        try {
          await sendEmail(
            buildExpiryReminderEmail({
              to: r.userEmail,
              name: r.userName,
              course: r.course,
              tier: r.tier,
              expiresAt: r.expiresAt,
              dashboardUrl,
              locale: normalizeLocale(r.preferredLanguage),
            }),
            {
              emailType: "expiry_reminder",
              userId: r.userId,
              relatedId: r.enrollmentId,
            },
          );
          sentCount += 1;
        } catch (err) {
          failedCount += 1;
          req.log.error(
            { err, userId: r.userId, enrollmentId: r.enrollmentId },
            "Failed to send expiry reminder",
          );
        }
      }
      res.json({
        considered: rows.length,
        sentCount,
        skippedCount,
        failedCount,
        stubMode: true,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
