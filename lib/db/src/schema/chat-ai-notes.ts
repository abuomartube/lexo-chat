import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const CHAT_AI_NOTE_ACTION_VALUES = [
  "correct",
  "translate",
  "explain",
] as const;
export type ChatAiNoteAction = (typeof CHAT_AI_NOTE_ACTION_VALUES)[number];

export const chatAiNotesTable = pgTable(
  "chat_ai_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 16 }).notNull(),
    originalText: text("original_text").notNull(),
    resultJson: text("result_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chat_ai_notes_user_created_idx").on(t.userId, t.createdAt),
    uniqueIndex("chat_ai_notes_user_action_text_idx").on(
      t.userId,
      t.action,
      t.originalText,
    ),
  ],
);

export type ChatAiNote = typeof chatAiNotesTable.$inferSelect;
