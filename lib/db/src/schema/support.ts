import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const SUPPORT_TICKET_STATUS_VALUES = [
  "awaiting_admin", // student wrote last; admin needs to reply
  "awaiting_user", // admin wrote last; waiting on student
  "resolved", // admin marked resolved; student can re-open by replying
  "closed", // archived; new replies create a new ticket
] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUS_VALUES)[number];

export const SUPPORT_TICKET_CATEGORY_VALUES = [
  "general",
  "billing",
  "technical",
  "course_content",
  "account",
] as const;
export type SupportTicketCategory =
  (typeof SUPPORT_TICKET_CATEGORY_VALUES)[number];

export const SUPPORT_AUTHOR_ROLE_VALUES = ["student", "admin"] as const;
export type SupportAuthorRole = (typeof SUPPORT_AUTHOR_ROLE_VALUES)[number];

export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    subject: varchar("subject", { length: 200 }).notNull(),
    category: varchar("category", { length: 32 }).notNull().default("general"),
    status: varchar("status", { length: 24 })
      .notNull()
      .default("awaiting_admin"),
    // Stamped on every new message — drives "newest first" sort and SLA
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("support_tickets_user_idx").on(t.userId),
    index("support_tickets_status_idx").on(t.status),
    index("support_tickets_last_activity_idx").on(t.lastActivityAt),
  ],
);

export const supportMessagesTable = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTicketsTable.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    authorRole: varchar("author_role", { length: 16 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("support_messages_ticket_idx").on(t.ticketId)],
);

export const supportAttachmentsTable = pgTable(
  "support_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => supportMessagesTable.id, { onDelete: "cascade" }),
    objectPath: text("object_path").notNull(),
    filename: varchar("filename", { length: 256 }).notNull(),
    contentType: varchar("content_type", { length: 128 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("support_attachments_message_idx").on(t.messageId)],
);

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type InsertSupportTicket = typeof supportTicketsTable.$inferInsert;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;
export type InsertSupportMessage = typeof supportMessagesTable.$inferInsert;
export type SupportAttachment = typeof supportAttachmentsTable.$inferSelect;
export type InsertSupportAttachment =
  typeof supportAttachmentsTable.$inferInsert;
