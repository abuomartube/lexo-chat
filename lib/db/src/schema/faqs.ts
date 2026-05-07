import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformFaqsTable = pgTable(
  "platform_faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseSlug: varchar("course_slug", { length: 32 }),
    questionEn: text("question_en").notNull(),
    questionAr: text("question_ar").notNull(),
    answerEn: text("answer_en").notNull(),
    answerAr: text("answer_ar").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("platform_faqs_course_order_idx").on(t.courseSlug, t.displayOrder),
  ],
);

export const insertFaqSchema = createInsertSchema(platformFaqsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof platformFaqsTable.$inferSelect;
