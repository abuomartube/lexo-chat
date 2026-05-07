import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const CHAT_ROOM_KIND_VALUES = ["text", "voice"] as const;
export type ChatRoomKind = (typeof CHAT_ROOM_KIND_VALUES)[number];

export const CHAT_MESSAGE_KIND_VALUES = [
  "text",
  "voice",
  "image",
  "system",
] as const;
export type ChatMessageKind = (typeof CHAT_MESSAGE_KIND_VALUES)[number];

export const chatRoomsTable = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 120 }).notNull(),
  nameAr: varchar("name_ar", { length: 120 }).notNull(),
  // "text" rooms have full chat; "voice" rooms are the live-audio Phase-2
  // placeholder shown with a "Coming Soon" badge.
  kind: varchar("kind", { length: 16 }).notNull().default("text"),
  // Free-form CEFR / level label e.g. "A2 → B1" or "B1+ → C1"
  level: varchar("level", { length: 32 }),
  category: varchar("category", { length: 32 }).notNull().default("speaking"),
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
  // JSON-encoded string array of rules
  rulesEn: text("rules_en"),
  rulesAr: text("rules_ar"),
  emoji: varchar("emoji", { length: 8 }),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChatRoom = typeof chatRoomsTable.$inferSelect;

export const chatMessagesTable = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatRoomsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().default("text"),
    body: text("body"),
    attachmentObjectPath: text("attachment_object_path"),
    attachmentMime: varchar("attachment_mime", { length: 128 }),
    attachmentSizeBytes: integer("attachment_size_bytes"),
    audioDurationSec: integer("audio_duration_sec"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chat_messages_room_created_idx").on(t.roomId, t.createdAt),
    index("chat_messages_user_idx").on(t.userId),
  ],
);

export type ChatMessage = typeof chatMessagesTable.$inferSelect;

export const chatPresenceTable = pgTable(
  "chat_presence",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatRoomsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roomId, t.userId] }),
    index("chat_presence_last_seen_idx").on(t.lastSeenAt),
  ],
);

export const chatRoomMembershipTable = pgTable(
  "chat_room_membership",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatRoomsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
    banned: boolean("banned").notNull().default(false),
    bannedReason: text("banned_reason"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })],
);

export const chatXpTable = pgTable("chat_xp", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  totalXp: integer("total_xp").notNull().default(0),
  messagesSent: integer("messages_sent").notNull().default(0),
  voiceNotesSent: integer("voice_notes_sent").notNull().default(0),
  imagesSent: integer("images_sent").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatDmThreadsTable = pgTable(
  "chat_dm_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Always store the lexicographically smaller user id in `userLo` so a
    // (a,b) pair is unique regardless of who initiated.
    userLo: uuid("user_lo")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userHi: uuid("user_hi")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("chat_dm_threads_pair_idx").on(t.userLo, t.userHi),
    index("chat_dm_threads_user_lo_idx").on(t.userLo),
    index("chat_dm_threads_user_hi_idx").on(t.userHi),
  ],
);

export const chatDmMessagesTable = pgTable(
  "chat_dm_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatDmThreadsTable.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().default("text"),
    body: text("body"),
    attachmentObjectPath: text("attachment_object_path"),
    attachmentMime: varchar("attachment_mime", { length: 128 }),
    audioDurationSec: integer("audio_duration_sec"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chat_dm_messages_thread_created_idx").on(t.threadId, t.createdAt),
  ],
);
