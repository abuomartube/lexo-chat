import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  supportTicketsTable,
  supportMessagesTable,
  supportAttachmentsTable,
  uploadGrantsTable,
  usersTable,
  SUPPORT_TICKET_STATUS_VALUES,
  SUPPORT_TICKET_CATEGORY_VALUES,
} from "@workspace/db";
import { requireAuth, requireAdmin, getUserById } from "../lib/auth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { ALLOWED_UPLOAD_CONTENT_TYPES } from "./storage";
import { sendEmail, getAdminEmails, normalizeLocale } from "../lib/email";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// Per-message attachment cap. Anything bigger gets rejected up-front so an
// admin opening a ticket doesn't hit a wall of 50 huge files.
const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_BODY_LEN = 10_000;

// ─────────────────────────── Helpers ───────────────────────────

async function loadTicket(id: string) {
  const [row] = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, id));
  return row;
}

async function loadMessagesWithAttachments(ticketId: string) {
  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, ticketId))
    .orderBy(asc(supportMessagesTable.createdAt));
  if (messages.length === 0) return [];
  const ids = messages.map((m) => m.id);
  const atts = await db
    .select()
    .from(supportAttachmentsTable)
    .where(inArray(supportAttachmentsTable.messageId, ids));
  const byMsg = new Map<string, typeof atts>();
  for (const a of atts) {
    const arr = byMsg.get(a.messageId) ?? [];
    arr.push(a);
    byMsg.set(a.messageId, arr);
  }
  return messages.map((m) => ({
    ...m,
    attachments: byMsg.get(m.id) ?? [],
  }));
}

/**
 * Validate that the calling user owns the upload-grants for the given
 * objectPaths AND that the path is well-formed. Returns the matching grant
 * rows so we can pull metadata from the original request.
 */
async function verifyOwnedUploads(
  userId: string,
  objectPaths: string[],
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (objectPaths.length === 0) return { ok: true };
  const rows = await db
    .select()
    .from(uploadGrantsTable)
    .where(
      and(
        eq(uploadGrantsTable.userId, userId),
        inArray(uploadGrantsTable.objectPath, objectPaths),
      ),
    );
  if (rows.length !== objectPaths.length) {
    return { ok: false, reason: "unowned_attachment" };
  }
  return { ok: true };
}

// ─────────────────────────── Student endpoints ───────────────────────────

router.get("/support/tickets", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const rows = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, userId))
      .orderBy(desc(supportTicketsTable.lastActivityAt));
    res.json({ tickets: rows });
  } catch (err) {
    next(err);
  }
});

const NewAttachment = z.object({
  objectPath: z.string().min(1),
  filename: z.string().trim().min(1).max(256),
  contentType: z.string().min(1).max(128),
  sizeBytes: z
    .number()
    .int()
    .nonnegative()
    .max(20 * 1024 * 1024),
});

const CreateTicketBody = z.object({
  subject: z.string().trim().min(2).max(200),
  category: z.enum(SUPPORT_TICKET_CATEGORY_VALUES).optional(),
  body: z.string().trim().min(1).max(MAX_BODY_LEN),
  attachments: z
    .array(NewAttachment)
    .max(MAX_ATTACHMENTS_PER_MESSAGE)
    .optional(),
});

router.post("/support/tickets", requireAuth, async (req, res, next) => {
  try {
    const parsed = CreateTicketBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    const body = parsed.data;
    const userId = req.session.userId!;
    const attachments = body.attachments ?? [];

    for (const a of attachments) {
      const ct = a.contentType.toLowerCase().split(";")[0].trim();
      if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(ct)) {
        res.status(400).json({ error: "unsupported_content_type" });
        return;
      }
    }
    const ownership = await verifyOwnedUploads(
      userId,
      attachments.map((a) => a.objectPath),
    );
    if (!ownership.ok) {
      res.status(403).json({ error: ownership.reason });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [ticket] = await tx
        .insert(supportTicketsTable)
        .values({
          userId,
          subject: body.subject,
          category: body.category ?? "general",
          status: "awaiting_admin",
          lastActivityAt: new Date(),
        })
        .returning();
      const [message] = await tx
        .insert(supportMessagesTable)
        .values({
          ticketId: ticket.id,
          authorId: userId,
          authorRole: "student",
          body: body.body,
        })
        .returning();
      if (attachments.length > 0) {
        await tx.insert(supportAttachmentsTable).values(
          attachments.map((a) => ({
            messageId: message.id,
            objectPath: a.objectPath,
            filename: a.filename,
            contentType: a.contentType,
            sizeBytes: a.sizeBytes,
          })),
        );
      }
      return { ticket, message };
    });

    // Notify admins (fire-and-forget — never block the response).
    void notifyAdminsOfNewMessage({
      ticketId: result.ticket.id,
      subject: result.ticket.subject,
      bodyPreview: body.body,
      authorName: (await getUserById(userId))?.name ?? "Student",
      isNewTicket: true,
    });

    res.status(201).json({ ticket: result.ticket });
  } catch (err) {
    next(err);
  }
});

router.get("/support/tickets/:id", requireAuth, async (req, res, next) => {
  try {
    const ticket = await loadTicket(String(req.params.id));
    if (!ticket) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const user = await getUserById(req.session.userId!);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (user.role !== "admin" && ticket.userId !== user.id) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const messages = await loadMessagesWithAttachments(ticket.id);
    res.json({ ticket, messages });
  } catch (err) {
    next(err);
  }
});

const ReplyBody = z.object({
  body: z.string().trim().min(1).max(MAX_BODY_LEN),
  attachments: z
    .array(NewAttachment)
    .max(MAX_ATTACHMENTS_PER_MESSAGE)
    .optional(),
});

router.post(
  "/support/tickets/:id/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = ReplyBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const ticket = await loadTicket(String(req.params.id));
      if (!ticket) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const user = await getUserById(req.session.userId!);
      if (!user) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const isAdmin = user.role === "admin";
      const isOwner = ticket.userId === user.id;
      if (!isAdmin && !isOwner) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      if (ticket.status === "closed" && !isAdmin) {
        res.status(409).json({ error: "ticket_closed" });
        return;
      }
      const attachments = parsed.data.attachments ?? [];
      for (const a of attachments) {
        const ct = a.contentType.toLowerCase().split(";")[0].trim();
        if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(ct)) {
          res.status(400).json({ error: "unsupported_content_type" });
          return;
        }
      }
      const ownership = await verifyOwnedUploads(
        user.id,
        attachments.map((a) => a.objectPath),
      );
      if (!ownership.ok) {
        res.status(403).json({ error: ownership.reason });
        return;
      }

      const newStatus = isAdmin ? "awaiting_user" : "awaiting_admin";
      const result = await db.transaction(async (tx) => {
        const [message] = await tx
          .insert(supportMessagesTable)
          .values({
            ticketId: ticket.id,
            authorId: user.id,
            authorRole: isAdmin ? "admin" : "student",
            body: parsed.data.body,
          })
          .returning();
        if (attachments.length > 0) {
          await tx.insert(supportAttachmentsTable).values(
            attachments.map((a) => ({
              messageId: message.id,
              objectPath: a.objectPath,
              filename: a.filename,
              contentType: a.contentType,
              sizeBytes: a.sizeBytes,
            })),
          );
        }
        const [updatedTicket] = await tx
          .update(supportTicketsTable)
          .set({
            status: newStatus,
            lastActivityAt: new Date(),
            closedAt: null,
          })
          .where(eq(supportTicketsTable.id, ticket.id))
          .returning();
        return { message, ticket: updatedTicket };
      });

      // Email notification to the OTHER party.
      if (isAdmin) {
        void notifyStudentOfReply({
          toUserId: ticket.userId,
          ticketId: ticket.id,
          subject: ticket.subject,
          bodyPreview: parsed.data.body,
        });
      } else {
        void notifyAdminsOfNewMessage({
          ticketId: ticket.id,
          subject: ticket.subject,
          bodyPreview: parsed.data.body,
          authorName: user.name,
          isNewTicket: false,
        });
      }

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────── Attachments download ───────────────────────────

router.get(
  "/support/attachments/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const [att] = await db
        .select({
          attachment: supportAttachmentsTable,
          ticketUserId: supportTicketsTable.userId,
        })
        .from(supportAttachmentsTable)
        .innerJoin(
          supportMessagesTable,
          eq(supportMessagesTable.id, supportAttachmentsTable.messageId),
        )
        .innerJoin(
          supportTicketsTable,
          eq(supportTicketsTable.id, supportMessagesTable.ticketId),
        )
        .where(eq(supportAttachmentsTable.id, String(req.params.id)));
      if (!att) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const user = await getUserById(req.session.userId!);
      if (!user) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      if (user.role !== "admin" && att.ticketUserId !== user.id) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const objectFile = await objectStorageService.getObjectEntityFile(
        att.attachment.objectPath,
      );
      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${att.attachment.filename.replace(/"/g, "")}"`,
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      req.log.error({ err }, "support attachment serve failed");
      res.status(500).json({ error: "serve_failed" });
    }
  },
);

// ─────────────────────────── Admin endpoints ───────────────────────────

const AdminListQuery = z.object({
  status: z.enum(SUPPORT_TICKET_STATUS_VALUES).optional(),
});

router.get("/admin/support/tickets", requireAdmin, async (req, res, next) => {
  try {
    const parsed = AdminListQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }
    const where = parsed.data.status
      ? eq(supportTicketsTable.status, parsed.data.status)
      : undefined;
    const rows = await db
      .select({
        ticket: supportTicketsTable,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(supportTicketsTable)
      .innerJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .where(where as ReturnType<typeof eq> | undefined)
      .orderBy(desc(supportTicketsTable.lastActivityAt));
    // Counts per status (for tab badges)
    const counts = await db
      .select({
        status: supportTicketsTable.status,
        n: sql<number>`count(*)::int`,
      })
      .from(supportTicketsTable)
      .groupBy(supportTicketsTable.status);
    res.json({
      tickets: rows.map((r) => ({
        ...r.ticket,
        userName: r.userName,
        userEmail: r.userEmail,
      })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
    });
  } catch (err) {
    next(err);
  }
});

const StatusPatch = z.object({
  status: z.enum(SUPPORT_TICKET_STATUS_VALUES),
});

router.patch(
  "/admin/support/tickets/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = StatusPatch.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const ticket = await loadTicket(String(req.params.id));
      if (!ticket) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const [updated] = await db
        .update(supportTicketsTable)
        .set({
          status: parsed.data.status,
          closedAt: parsed.data.status === "closed" ? new Date() : null,
          lastActivityAt: new Date(),
        })
        .where(eq(supportTicketsTable.id, ticket.id))
        .returning();
      res.json({ ticket: updated });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────── Email helpers ───────────────────────────

function appOriginForEmail(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) return `https://${domains.split(",")[0].trim()}`;
  return "http://localhost:5000";
}

async function notifyAdminsOfNewMessage(params: {
  ticketId: string;
  subject: string;
  bodyPreview: string;
  authorName: string;
  isNewTicket: boolean;
}): Promise<void> {
  try {
    const admins = await getAdminEmails();
    const url = `${appOriginForEmail()}/oxford-flashcards/admin?tab=support&ticket=${params.ticketId}`;
    const preview = params.bodyPreview.slice(0, 500);
    for (const a of admins) {
      const subject = params.isNewTicket
        ? `[Support] New ticket: ${params.subject}`
        : `[Support] Reply on: ${params.subject}`;
      const text =
        a.locale === "ar"
          ? `لديك ${params.isNewTicket ? "تذكرة جديدة" : "ردّ جديد"} من ${params.authorName}.\n\n${preview}\n\nافتح التذكرة: ${url}`
          : `${params.isNewTicket ? "New support ticket" : "New reply"} from ${params.authorName}.\n\n${preview}\n\nOpen ticket: ${url}`;
      await sendEmail(
        { to: a.email, subject, text },
        { emailType: "broadcast", userId: a.id, relatedId: params.ticketId },
      );
    }
  } catch (err) {
    // Never throw from a fire-and-forget notifier
    // (best-effort by design)
    // eslint-disable-next-line no-console
    console.error("notifyAdminsOfNewMessage failed", err);
  }
}

async function notifyStudentOfReply(params: {
  toUserId: string;
  ticketId: string;
  subject: string;
  bodyPreview: string;
}): Promise<void> {
  try {
    const u = await getUserById(params.toUserId);
    if (!u) return;
    const locale = normalizeLocale(u.preferredLanguage);
    const url = `${appOriginForEmail()}/oxford-flashcards/support/${params.ticketId}`;
    const preview = params.bodyPreview.slice(0, 500);
    const subject =
      locale === "ar"
        ? `ردّ الدعم: ${params.subject}`
        : `Re: ${params.subject}`;
    const text =
      locale === "ar"
        ? `وصلك ردّ من فريق الدعم على تذكرتك "${params.subject}":\n\n${preview}\n\nاطّلع على المحادثة: ${url}`
        : `You have a new reply on your support ticket "${params.subject}":\n\n${preview}\n\nView the conversation: ${url}`;
    await sendEmail(
      { to: u.email, subject, text },
      { emailType: "broadcast", userId: u.id, relatedId: params.ticketId },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("notifyStudentOfReply failed", err);
  }
}

export default router;
