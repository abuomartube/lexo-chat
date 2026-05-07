import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import {
  db,
  chatRoomsTable,
  chatMessagesTable,
  chatPresenceTable,
  chatRoomMembershipTable,
  chatXpTable,
  chatDmThreadsTable,
  chatDmMessagesTable,
  uploadGrantsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin, getUserById } from "../lib/auth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { ALLOWED_UPLOAD_CONTENT_TYPES } from "./storage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const MAX_BODY_LEN = 2000;
const PRESENCE_WINDOW_SECONDS = 60;
const MESSAGE_PAGE_LIMIT = 100;

// ─────────────────────────── Helpers ───────────────────────────

async function loadRoomBySlug(slug: string) {
  const [room] = await db
    .select()
    .from(chatRoomsTable)
    .where(eq(chatRoomsTable.slug, slug));
  return room;
}

async function getOnlineCount(roomId: string): Promise<number> {
  const cutoff = new Date(Date.now() - PRESENCE_WINDOW_SECONDS * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatPresenceTable)
    .where(
      and(
        eq(chatPresenceTable.roomId, roomId),
        gt(chatPresenceTable.lastSeenAt, cutoff),
      ),
    );
  return count ?? 0;
}

async function isUserBannedOrMuted(
  roomId: string,
  userId: string,
): Promise<{ banned: boolean; mutedUntil: Date | null }> {
  const [row] = await db
    .select()
    .from(chatRoomMembershipTable)
    .where(
      and(
        eq(chatRoomMembershipTable.roomId, roomId),
        eq(chatRoomMembershipTable.userId, userId),
      ),
    );
  if (!row) return { banned: false, mutedUntil: null };
  return { banned: row.banned, mutedUntil: row.mutedUntil };
}

const XP_BY_KIND: Record<string, number> = {
  text: 1,
  voice: 3,
  image: 2,
};

async function awardXp(userId: string, kind: string): Promise<void> {
  const xp = XP_BY_KIND[kind] ?? 0;
  if (xp === 0) return;
  await db
    .insert(chatXpTable)
    .values({
      userId,
      totalXp: xp,
      messagesSent: kind === "text" ? 1 : 0,
      voiceNotesSent: kind === "voice" ? 1 : 0,
      imagesSent: kind === "image" ? 1 : 0,
      lastActivityAt: new Date(),
    })
    .onConflictDoUpdate({
      target: chatXpTable.userId,
      set: {
        totalXp: sql`${chatXpTable.totalXp} + ${xp}`,
        messagesSent: sql`${chatXpTable.messagesSent} + ${kind === "text" ? 1 : 0}`,
        voiceNotesSent: sql`${chatXpTable.voiceNotesSent} + ${kind === "voice" ? 1 : 0}`,
        imagesSent: sql`${chatXpTable.imagesSent} + ${kind === "image" ? 1 : 0}`,
        lastActivityAt: new Date(),
      },
    });
}

async function verifyOwnedUpload(
  userId: string,
  objectPath: string,
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(uploadGrantsTable)
    .where(
      and(
        eq(uploadGrantsTable.userId, userId),
        eq(uploadGrantsTable.objectPath, objectPath),
      ),
    );
  return !!row;
}

type AuthorInfo = { id: string; name: string; role: string };
async function loadAuthorsByIds(
  ids: string[],
): Promise<Map<string, AuthorInfo>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(inArray(usersTable.id, ids));
  return new Map(rows.map((r) => [r.id, r as AuthorInfo]));
}

function shapeMessage(
  m: typeof chatMessagesTable.$inferSelect,
  authors: Map<string, AuthorInfo>,
) {
  const author = authors.get(m.userId);
  return {
    id: m.id,
    roomId: m.roomId,
    userId: m.userId,
    authorName: author?.name ?? "User",
    authorRole: author?.role ?? "student",
    kind: m.kind,
    body: m.deletedAt ? null : m.body,
    deleted: !!m.deletedAt,
    attachmentMime: m.attachmentMime,
    attachmentSizeBytes: m.attachmentSizeBytes,
    audioDurationSec: m.audioDurationSec,
    // Frontend uses /api/chat/messages/:id/attachment to fetch the file.
    attachmentUrl:
      m.attachmentObjectPath && !m.deletedAt
        ? `/api/chat/messages/${m.id}/attachment`
        : null,
    createdAt: m.createdAt,
  };
}

// ─────────────────────────── Rooms ───────────────────────────

router.get("/chat/rooms", requireAuth, async (req, res, next) => {
  try {
    const rooms = await db
      .select()
      .from(chatRoomsTable)
      .where(eq(chatRoomsTable.active, true))
      .orderBy(asc(chatRoomsTable.sortOrder));

    const cutoff = new Date(Date.now() - PRESENCE_WINDOW_SECONDS * 1000);
    const presenceRows =
      rooms.length > 0
        ? await db
            .select({
              roomId: chatPresenceTable.roomId,
              count: sql<number>`count(*)::int`,
            })
            .from(chatPresenceTable)
            .where(
              and(
                inArray(
                  chatPresenceTable.roomId,
                  rooms.map((r) => r.id),
                ),
                gt(chatPresenceTable.lastSeenAt, cutoff),
              ),
            )
            .groupBy(chatPresenceTable.roomId)
        : [];
    const onlineByRoom = new Map(presenceRows.map((p) => [p.roomId, p.count]));

    const result = rooms.map((r) => ({
      id: r.id,
      slug: r.slug,
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      kind: r.kind,
      level: r.level,
      category: r.category,
      descriptionEn: r.descriptionEn,
      descriptionAr: r.descriptionAr,
      emoji: r.emoji,
      onlineCount: onlineByRoom.get(r.id) ?? 0,
    }));

    // Mark the most-active room as "hot" so the UI can show "🔥 Active Now".
    let hotRoomId: string | null = null;
    let topCount = 0;
    for (const r of result) {
      if (r.kind === "text" && r.onlineCount > topCount) {
        hotRoomId = r.id;
        topCount = r.onlineCount;
      }
    }

    res.json({ rooms: result, hotRoomId });
  } catch (err) {
    next(err);
  }
});

router.get("/chat/rooms/:slug", requireAuth, async (req, res, next) => {
  try {
    const room = await loadRoomBySlug(String(req.params.slug));
    if (!room) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const onlineCount = await getOnlineCount(room.id);

    // Sample of recently-active users (avatars/names for the preview)
    const cutoff = new Date(Date.now() - PRESENCE_WINDOW_SECONDS * 1000);
    const presenceRows = await db
      .select({
        userId: chatPresenceTable.userId,
        name: usersTable.name,
        lastSeenAt: chatPresenceTable.lastSeenAt,
      })
      .from(chatPresenceTable)
      .innerJoin(usersTable, eq(usersTable.id, chatPresenceTable.userId))
      .where(
        and(
          eq(chatPresenceTable.roomId, room.id),
          gt(chatPresenceTable.lastSeenAt, cutoff),
        ),
      )
      .orderBy(desc(chatPresenceTable.lastSeenAt))
      .limit(20);

    res.json({
      room: {
        id: room.id,
        slug: room.slug,
        nameEn: room.nameEn,
        nameAr: room.nameAr,
        kind: room.kind,
        level: room.level,
        category: room.category,
        descriptionEn: room.descriptionEn,
        descriptionAr: room.descriptionAr,
        rulesEn: room.rulesEn,
        rulesAr: room.rulesAr,
        emoji: room.emoji,
        onlineCount,
      },
      activeUsers: presenceRows.map((p) => ({
        id: p.userId,
        name: p.name,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────── Messages ───────────────────────────

router.get(
  "/chat/rooms/:slug/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const room = await loadRoomBySlug(String(req.params.slug));
      if (!room) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const sinceRaw = req.query["since"];
      const since =
        typeof sinceRaw === "string" && sinceRaw.length > 0 ? sinceRaw : null;

      let rows: (typeof chatMessagesTable.$inferSelect)[];
      if (since) {
        // Poll: messages newer than the given created_at timestamp.
        const sinceDate = new Date(since);
        if (Number.isNaN(sinceDate.getTime())) {
          res.status(400).json({ error: "invalid_since" });
          return;
        }
        rows = await db
          .select()
          .from(chatMessagesTable)
          .where(
            and(
              eq(chatMessagesTable.roomId, room.id),
              gt(chatMessagesTable.createdAt, sinceDate),
            ),
          )
          .orderBy(asc(chatMessagesTable.createdAt))
          .limit(MESSAGE_PAGE_LIMIT);
      } else {
        // Initial load: most recent N messages, returned chronologically.
        const recent = await db
          .select()
          .from(chatMessagesTable)
          .where(eq(chatMessagesTable.roomId, room.id))
          .orderBy(desc(chatMessagesTable.createdAt))
          .limit(MESSAGE_PAGE_LIMIT);
        rows = recent.reverse();
      }

      const authors = await loadAuthorsByIds(
        Array.from(new Set(rows.map((r) => r.userId))),
      );
      res.json({ messages: rows.map((m) => shapeMessage(m, authors)) });
    } catch (err) {
      next(err);
    }
  },
);

const SendMessageBody = z.object({
  kind: z.enum(["text", "voice", "image"]),
  body: z.string().trim().max(MAX_BODY_LEN).optional(),
  attachment: z
    .object({
      objectPath: z.string().min(1),
      mime: z.string().min(1).max(128),
      sizeBytes: z
        .number()
        .int()
        .nonnegative()
        .max(20 * 1024 * 1024),
      audioDurationSec: z.number().int().min(1).max(300).optional(),
    })
    .optional(),
});

router.post(
  "/chat/rooms/:slug/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = SendMessageBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const room = await loadRoomBySlug(String(req.params.slug));
      if (!room) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (room.kind === "voice") {
        res.status(409).json({ error: "voice_only_phase_2" });
        return;
      }
      const userId = req.session.userId!;
      const { banned, mutedUntil } = await isUserBannedOrMuted(room.id, userId);
      if (banned) {
        res.status(403).json({ error: "banned" });
        return;
      }
      if (mutedUntil && mutedUntil.getTime() > Date.now()) {
        res
          .status(403)
          .json({ error: "muted", mutedUntil: mutedUntil.toISOString() });
        return;
      }

      const { kind, body, attachment } = parsed.data;

      if (kind === "text") {
        if (!body || body.length === 0) {
          res.status(400).json({ error: "empty_text" });
          return;
        }
      } else {
        if (!attachment) {
          res.status(400).json({ error: "missing_attachment" });
          return;
        }
        const ct = attachment.mime.toLowerCase().split(";")[0].trim();
        if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(ct)) {
          res.status(400).json({ error: "unsupported_content_type" });
          return;
        }
        if (kind === "voice" && !ct.startsWith("audio/")) {
          res.status(400).json({ error: "wrong_kind_for_mime" });
          return;
        }
        if (kind === "image" && !ct.startsWith("image/")) {
          res.status(400).json({ error: "wrong_kind_for_mime" });
          return;
        }
        const owns = await verifyOwnedUpload(userId, attachment.objectPath);
        if (!owns) {
          res.status(403).json({ error: "unowned_attachment" });
          return;
        }
      }

      const [inserted] = await db
        .insert(chatMessagesTable)
        .values({
          roomId: room.id,
          userId,
          kind,
          body: kind === "text" ? body : null,
          attachmentObjectPath: attachment?.objectPath ?? null,
          attachmentMime: attachment?.mime ?? null,
          attachmentSizeBytes: attachment?.sizeBytes ?? null,
          audioDurationSec: attachment?.audioDurationSec ?? null,
        })
        .returning();

      void awardXp(userId, kind);

      const authors = await loadAuthorsByIds([userId]);
      res.status(201).json({ message: shapeMessage(inserted, authors) });
    } catch (err) {
      next(err);
    }
  },
);

router.delete("/chat/messages/:id", requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [msg] = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, id));
    if (!msg) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const user = await getUserById(req.session.userId!);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (user.role !== "admin" && msg.userId !== user.id) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    await db
      .update(chatMessagesTable)
      .set({ deletedAt: new Date() })
      .where(eq(chatMessagesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────── Presence ───────────────────────────

router.post(
  "/chat/rooms/:slug/heartbeat",
  requireAuth,
  async (req, res, next) => {
    try {
      const room = await loadRoomBySlug(String(req.params.slug));
      if (!room) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const userId = req.session.userId!;
      await db
        .insert(chatPresenceTable)
        .values({ roomId: room.id, userId, lastSeenAt: new Date() })
        .onConflictDoUpdate({
          target: [chatPresenceTable.roomId, chatPresenceTable.userId],
          set: { lastSeenAt: new Date() },
        });
      const onlineCount = await getOnlineCount(room.id);
      res.json({ onlineCount });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────── Attachment streaming ───────────────────────────

// Any signed-in user in the room can fetch attachments. We don't gate per
// room — once a message is sent, anyone with a chat session sees it.
router.get(
  "/chat/messages/:id/attachment",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const [msg] = await db
        .select()
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.id, String(req.params.id)));
      if (!msg || !msg.attachmentObjectPath || msg.deletedAt) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const objectFile = await objectStorageService.getObjectEntityFile(
        msg.attachmentObjectPath,
      );
      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (msg.attachmentMime) {
        res.setHeader("Content-Type", msg.attachmentMime);
      }
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      res.setHeader("Cache-Control", "private, max-age=3600");
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
      req.log.error({ err }, "chat attachment serve failed");
      res.status(500).json({ error: "serve_failed" });
    }
  },
);

// Same endpoint for DM message attachments.
router.get(
  "/chat/dm/messages/:id/attachment",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const [msg] = await db
        .select()
        .from(chatDmMessagesTable)
        .where(eq(chatDmMessagesTable.id, String(req.params.id)));
      if (!msg || !msg.attachmentObjectPath || msg.deletedAt) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const [thread] = await db
        .select()
        .from(chatDmThreadsTable)
        .where(eq(chatDmThreadsTable.id, msg.threadId));
      if (!thread) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const userId = req.session.userId!;
      const user = await getUserById(userId);
      const isAdmin = user?.role === "admin";
      if (!isAdmin && thread.userLo !== userId && thread.userHi !== userId) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const objectFile = await objectStorageService.getObjectEntityFile(
        msg.attachmentObjectPath,
      );
      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (msg.attachmentMime) {
        res.setHeader("Content-Type", msg.attachmentMime);
      }
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
      req.log.error({ err }, "dm attachment serve failed");
      res.status(500).json({ error: "serve_failed" });
    }
  },
);

// ─────────────────────────── Topics & Ice Breakers ───────────────────────────

const TOPICS: Record<string, { en: string; ar: string }[]> = {
  travel: [
    {
      en: "Describe a place you visited recently.",
      ar: "صف مكاناً زرته مؤخراً.",
    },
    {
      en: "What's your dream travel destination?",
      ar: "ما هي وجهة سفر أحلامك؟",
    },
    { en: "Tell us about a memorable trip.", ar: "أخبرنا عن رحلة لا تُنسى." },
    {
      en: "Beach vacation or mountain adventure?",
      ar: "إجازة شاطئ أم مغامرة جبلية؟",
    },
    { en: "What do you usually pack for a trip?", ar: "ماذا تحزم عادة للسفر؟" },
  ],
  work: [
    { en: "Describe your dream job.", ar: "صف وظيفة أحلامك." },
    {
      en: "Do you prefer working in a team or alone?",
      ar: "هل تفضل العمل في فريق أم منفرداً؟",
    },
    {
      en: "What skill would you like to learn next?",
      ar: "ما المهارة التي تود تعلمها لاحقاً؟",
    },
    {
      en: "Talk about a challenge you overcame at work.",
      ar: "تحدث عن تحدٍ تغلبت عليه في العمل.",
    },
    {
      en: "Office or remote work — which is better?",
      ar: "المكتب أم العمل عن بُعد — أيهما أفضل؟",
    },
  ],
  daily: [
    {
      en: "Describe your perfect morning routine.",
      ar: "صف روتين صباحك المثالي.",
    },
    {
      en: "What's your favorite meal of the day?",
      ar: "ما وجبتك المفضلة في اليوم؟",
    },
    {
      en: "How do you usually spend your weekend?",
      ar: "كيف تقضي عطلة نهاية الأسبوع عادة؟",
    },
    { en: "Talk about your favorite hobby.", ar: "تحدث عن هوايتك المفضلة." },
    { en: "Describe your hometown.", ar: "صف مدينتك." },
  ],
  ielts: [
    {
      en: "Describe a person who has influenced you.",
      ar: "صف شخصاً أثّر فيك.",
    },
    {
      en: "Talk about a book that changed your perspective.",
      ar: "تحدث عن كتاب غيّر منظورك.",
    },
    {
      en: "Describe a piece of technology you can't live without.",
      ar: "صف قطعة تقنية لا تستطيع العيش بدونها.",
    },
    {
      en: "Talk about an important decision you made.",
      ar: "تحدث عن قرار مهم اتخذته.",
    },
    {
      en: "Describe a goal you want to achieve in 5 years.",
      ar: "صف هدفاً تريد تحقيقه خلال 5 سنوات.",
    },
  ],
  study: [
    {
      en: "What's the best way to learn English?",
      ar: "ما أفضل طريقة لتعلم الإنجليزية؟",
    },
    { en: "Describe your favorite teacher.", ar: "صف معلمك المفضل." },
    {
      en: "Online learning vs. classroom — your view?",
      ar: "التعلم الإلكتروني مقابل الصف — رأيك؟",
    },
    {
      en: "What subject would you like to teach?",
      ar: "ما المادة التي تود تدريسها؟",
    },
    {
      en: "Tips for memorizing new vocabulary.",
      ar: "نصائح لحفظ مفردات جديدة.",
    },
  ],
};

const ICE_BREAKERS: { en: string; ar: string }[] = [
  {
    en: "If you could have dinner with anyone, who would it be?",
    ar: "إذا كان بإمكانك تناول العشاء مع أي شخص، فمن سيكون؟",
  },
  {
    en: "What's the last movie that made you laugh?",
    ar: "ما آخر فيلم أضحكك؟",
  },
  {
    en: "What's your favorite English word and why?",
    ar: "ما كلمتك الإنجليزية المفضلة ولماذا؟",
  },
  { en: "Tea or coffee?", ar: "شاي أم قهوة؟" },
  {
    en: "What's one thing on your bucket list?",
    ar: "ما الشيء الموجود في قائمة أمنياتك؟",
  },
  { en: "Cats or dogs?", ar: "قطط أم كلاب؟" },
  {
    en: "What song are you listening to lately?",
    ar: "ما الأغنية التي تسمعها مؤخراً؟",
  },
  { en: "What's your superpower?", ar: "ما قوتك الخارقة؟" },
  { en: "Best meal you've ever had?", ar: "أفضل وجبة تناولتها؟" },
  { en: "Beach or mountains?", ar: "بحر أم جبل؟" },
];

router.get("/chat/topics", requireAuth, (req, res) => {
  const cat = String(req.query["category"] ?? "all").toLowerCase();
  let pool: { en: string; ar: string }[];
  if (cat === "all" || !TOPICS[cat]) {
    pool = Object.values(TOPICS).flat();
  } else {
    pool = TOPICS[cat];
  }
  const item = pool[Math.floor(Math.random() * pool.length)];
  res.json({
    topic: item,
    categories: Object.keys(TOPICS),
  });
});

router.get("/chat/icebreakers", requireAuth, (req, res) => {
  const item = ICE_BREAKERS[Math.floor(Math.random() * ICE_BREAKERS.length)];
  res.json({ icebreaker: item });
});

// ─────────────────────────── Leaderboard ───────────────────────────

router.get("/chat/leaderboard", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        userId: chatXpTable.userId,
        totalXp: chatXpTable.totalXp,
        messagesSent: chatXpTable.messagesSent,
        voiceNotesSent: chatXpTable.voiceNotesSent,
        imagesSent: chatXpTable.imagesSent,
        name: usersTable.name,
      })
      .from(chatXpTable)
      .innerJoin(usersTable, eq(usersTable.id, chatXpTable.userId))
      .orderBy(desc(chatXpTable.totalXp))
      .limit(50);
    const leaderboard = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.name,
      totalXp: r.totalXp,
      level: Math.floor(r.totalXp / 100) + 1,
      messagesSent: r.messagesSent,
      voiceNotesSent: r.voiceNotesSent,
      imagesSent: r.imagesSent,
    }));

    // Caller's own row (might be off the top-50)
    const myUserId = req.session.userId!;
    const [myRow] = await db
      .select()
      .from(chatXpTable)
      .where(eq(chatXpTable.userId, myUserId));
    const me = myRow
      ? {
          totalXp: myRow.totalXp,
          level: Math.floor(myRow.totalXp / 100) + 1,
          messagesSent: myRow.messagesSent,
          voiceNotesSent: myRow.voiceNotesSent,
          imagesSent: myRow.imagesSent,
        }
      : {
          totalXp: 0,
          level: 1,
          messagesSent: 0,
          voiceNotesSent: 0,
          imagesSent: 0,
        };

    res.json({ leaderboard, me });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────── DMs ───────────────────────────

function pairUsers(a: string, b: string): { lo: string; hi: string } {
  return a < b ? { lo: a, hi: b } : { lo: b, hi: a };
}

router.get("/chat/dm/threads", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const threads = await db
      .select()
      .from(chatDmThreadsTable)
      .where(
        or(
          eq(chatDmThreadsTable.userLo, userId),
          eq(chatDmThreadsTable.userHi, userId),
        ),
      )
      .orderBy(desc(chatDmThreadsTable.lastActivityAt))
      .limit(100);

    const otherIds = threads.map((t) =>
      t.userLo === userId ? t.userHi : t.userLo,
    );
    const others = await loadAuthorsByIds(otherIds);

    // Latest message preview per thread
    const previews: {
      threadId: string;
      body: string | null;
      kind: string;
      createdAt: Date;
    }[] = [];
    for (const t of threads) {
      const [last] = await db
        .select()
        .from(chatDmMessagesTable)
        .where(eq(chatDmMessagesTable.threadId, t.id))
        .orderBy(desc(chatDmMessagesTable.createdAt))
        .limit(1);
      if (last) {
        previews.push({
          threadId: t.id,
          body: last.deletedAt ? null : last.body,
          kind: last.kind,
          createdAt: last.createdAt,
        });
      }
    }
    const previewMap = new Map(previews.map((p) => [p.threadId, p]));

    res.json({
      threads: threads.map((t) => {
        const otherId = t.userLo === userId ? t.userHi : t.userLo;
        const preview = previewMap.get(t.id);
        return {
          id: t.id,
          otherUserId: otherId,
          otherUserName: others.get(otherId)?.name ?? "User",
          lastActivityAt: t.lastActivityAt,
          preview: preview
            ? {
                body: preview.body,
                kind: preview.kind,
                createdAt: preview.createdAt,
              }
            : null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

const OpenThreadBody = z.object({ otherUserId: z.string().uuid() });

router.post("/chat/dm/threads", requireAuth, async (req, res, next) => {
  try {
    const parsed = OpenThreadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    const userId = req.session.userId!;
    const otherUserId = parsed.data.otherUserId;
    if (otherUserId === userId) {
      res.status(400).json({ error: "cannot_dm_self" });
      return;
    }
    const other = await getUserById(otherUserId);
    if (!other) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    const { lo, hi } = pairUsers(userId, otherUserId);
    const [existing] = await db
      .select()
      .from(chatDmThreadsTable)
      .where(
        and(
          eq(chatDmThreadsTable.userLo, lo),
          eq(chatDmThreadsTable.userHi, hi),
        ),
      );
    if (existing) {
      res.json({
        thread: { id: existing.id, otherUserId, otherUserName: other.name },
      });
      return;
    }
    const [created] = await db
      .insert(chatDmThreadsTable)
      .values({ userLo: lo, userHi: hi })
      .returning();
    res.status(201).json({
      thread: { id: created.id, otherUserId, otherUserName: other.name },
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/chat/dm/threads/:id/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const [thread] = await db
        .select()
        .from(chatDmThreadsTable)
        .where(eq(chatDmThreadsTable.id, String(req.params.id)));
      if (!thread) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const userId = req.session.userId!;
      if (thread.userLo !== userId && thread.userHi !== userId) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const sinceRaw = req.query["since"];
      const since =
        typeof sinceRaw === "string" && sinceRaw.length > 0 ? sinceRaw : null;
      let rows: (typeof chatDmMessagesTable.$inferSelect)[];
      if (since) {
        const sinceDate = new Date(since);
        if (Number.isNaN(sinceDate.getTime())) {
          res.status(400).json({ error: "invalid_since" });
          return;
        }
        rows = await db
          .select()
          .from(chatDmMessagesTable)
          .where(
            and(
              eq(chatDmMessagesTable.threadId, thread.id),
              gt(chatDmMessagesTable.createdAt, sinceDate),
            ),
          )
          .orderBy(asc(chatDmMessagesTable.createdAt))
          .limit(MESSAGE_PAGE_LIMIT);
      } else {
        const recent = await db
          .select()
          .from(chatDmMessagesTable)
          .where(eq(chatDmMessagesTable.threadId, thread.id))
          .orderBy(desc(chatDmMessagesTable.createdAt))
          .limit(MESSAGE_PAGE_LIMIT);
        rows = recent.reverse();
      }
      const otherUserId =
        thread.userLo === userId ? thread.userHi : thread.userLo;
      const authors = await loadAuthorsByIds([userId, otherUserId]);
      const messages = rows.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        senderId: m.senderId,
        senderName: authors.get(m.senderId)?.name ?? "User",
        kind: m.kind,
        body: m.deletedAt ? null : m.body,
        deleted: !!m.deletedAt,
        attachmentMime: m.attachmentMime,
        audioDurationSec: m.audioDurationSec,
        attachmentUrl:
          m.attachmentObjectPath && !m.deletedAt
            ? `/api/chat/dm/messages/${m.id}/attachment`
            : null,
        createdAt: m.createdAt,
      }));
      res.json({
        messages,
        otherUser: {
          id: otherUserId,
          name: authors.get(otherUserId)?.name ?? "User",
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/chat/dm/threads/:id/messages",
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = SendMessageBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const [thread] = await db
        .select()
        .from(chatDmThreadsTable)
        .where(eq(chatDmThreadsTable.id, String(req.params.id)));
      if (!thread) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const userId = req.session.userId!;
      if (thread.userLo !== userId && thread.userHi !== userId) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const { kind, body, attachment } = parsed.data;
      if (kind === "text") {
        if (!body || body.length === 0) {
          res.status(400).json({ error: "empty_text" });
          return;
        }
      } else {
        if (!attachment) {
          res.status(400).json({ error: "missing_attachment" });
          return;
        }
        const ct = attachment.mime.toLowerCase().split(";")[0].trim();
        if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(ct)) {
          res.status(400).json({ error: "unsupported_content_type" });
          return;
        }
        const owns = await verifyOwnedUpload(userId, attachment.objectPath);
        if (!owns) {
          res.status(403).json({ error: "unowned_attachment" });
          return;
        }
      }
      const [inserted] = await db
        .insert(chatDmMessagesTable)
        .values({
          threadId: thread.id,
          senderId: userId,
          kind,
          body: kind === "text" ? body : null,
          attachmentObjectPath: attachment?.objectPath ?? null,
          attachmentMime: attachment?.mime ?? null,
          audioDurationSec: attachment?.audioDurationSec ?? null,
        })
        .returning();
      await db
        .update(chatDmThreadsTable)
        .set({ lastActivityAt: new Date() })
        .where(eq(chatDmThreadsTable.id, thread.id));
      const author = await getUserById(userId);
      res.status(201).json({
        message: {
          id: inserted.id,
          threadId: inserted.threadId,
          senderId: userId,
          senderName: author?.name ?? "You",
          kind: inserted.kind,
          body: inserted.body,
          deleted: false,
          attachmentMime: inserted.attachmentMime,
          audioDurationSec: inserted.audioDurationSec,
          attachmentUrl: inserted.attachmentObjectPath
            ? `/api/chat/dm/messages/${inserted.id}/attachment`
            : null,
          createdAt: inserted.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─────────────────────────── Admin moderation ───────────────────────────

const MuteBody = z.object({
  roomSlug: z.string().min(1),
  hours: z.number().int().min(1).max(720),
});
router.post(
  "/admin/chat/users/:userId/mute",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = MuteBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const room = await loadRoomBySlug(parsed.data.roomSlug);
      if (!room) {
        res.status(404).json({ error: "room_not_found" });
        return;
      }
      const targetId = String(req.params.userId);
      const mutedUntil = new Date(Date.now() + parsed.data.hours * 3600 * 1000);
      await db
        .insert(chatRoomMembershipTable)
        .values({
          roomId: room.id,
          userId: targetId,
          mutedUntil,
          banned: false,
        })
        .onConflictDoUpdate({
          target: [
            chatRoomMembershipTable.roomId,
            chatRoomMembershipTable.userId,
          ],
          set: { mutedUntil, updatedAt: new Date() },
        });
      res.json({ ok: true, mutedUntil: mutedUntil.toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

const BanBody = z.object({
  roomSlug: z.string().min(1),
  reason: z.string().max(500).optional(),
});
router.post(
  "/admin/chat/users/:userId/ban",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = BanBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const room = await loadRoomBySlug(parsed.data.roomSlug);
      if (!room) {
        res.status(404).json({ error: "room_not_found" });
        return;
      }
      const targetId = String(req.params.userId);
      await db
        .insert(chatRoomMembershipTable)
        .values({
          roomId: room.id,
          userId: targetId,
          banned: true,
          bannedReason: parsed.data.reason ?? null,
        })
        .onConflictDoUpdate({
          target: [
            chatRoomMembershipTable.roomId,
            chatRoomMembershipTable.userId,
          ],
          set: {
            banned: true,
            bannedReason: parsed.data.reason ?? null,
            updatedAt: new Date(),
          },
        });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/admin/chat/users/:userId/unban",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = z
        .object({ roomSlug: z.string().min(1) })
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_body" });
        return;
      }
      const room = await loadRoomBySlug(parsed.data.roomSlug);
      if (!room) {
        res.status(404).json({ error: "room_not_found" });
        return;
      }
      await db
        .update(chatRoomMembershipTable)
        .set({ banned: false, mutedUntil: null, updatedAt: new Date() })
        .where(
          and(
            eq(chatRoomMembershipTable.roomId, room.id),
            eq(chatRoomMembershipTable.userId, String(req.params.userId)),
          ),
        );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
