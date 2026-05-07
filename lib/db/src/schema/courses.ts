import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformCoursesTable = pgTable("platform_courses", {
  slug: varchar("slug", { length: 32 }).primaryKey(),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
  subtitleEn: text("subtitle_en"),
  subtitleAr: text("subtitle_ar"),
  isPublished: boolean("is_published").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCourseSchema = createInsertSchema(platformCoursesTable).omit(
  {
    createdAt: true,
    updatedAt: true,
  },
);
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof platformCoursesTable.$inferSelect;
