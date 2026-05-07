import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  smallint,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// Phase E0: single source of truth for English CEFR levels and tier→level
// mapping. `B1+` is intentionally NOT a level in the new English Dashboard
// architecture; vocabulary (Lexo 5000) and lessons use only A1/A2/B1/B2/C1.
//
// Tier slugs are kept as `beginner`/`intermediate`/`advanced` for stability
// with existing english_enrollments rows. Their semantics in the new
// architecture are:
//   beginner     → A1, A2, B1                      ("Beginner Package")
//   intermediate → B2, C1                          ("Advanced Package")
//   advanced     → A1, A2, B1, B2, C1              ("Complete Package")
//
// NOTE: The legacy Mentor route files (english-{churchill,orwell,attenborough,
// hemingway,mentor-flashcards}.ts) keep their own local B1+ literals because
// they are scheduled for deletion in Phase E7 and are not part of the new
// English Dashboard. Do not import this constant from those files.
export const ENGLISH_CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type EnglishCefrLevel = (typeof ENGLISH_CEFR_LEVELS)[number];

export const ENGLISH_BEGINNER_LEVELS: readonly EnglishCefrLevel[] = [
  "A1",
  "A2",
  "B1",
];
export const ENGLISH_INTERMEDIATE_LEVELS: readonly EnglishCefrLevel[] = [
  "B2",
  "C1",
];
export const ENGLISH_ADVANCED_LEVELS: readonly EnglishCefrLevel[] =
  ENGLISH_CEFR_LEVELS;

/**
 * True iff a student with the given active tiers can reach a lesson/content
 * at the given CEFR level. Pass the raw tier strings from
 * `english_enrollments.tier`; unknown tiers are ignored.
 */
export function canAccessEnglishLevel(
  activeTiers: readonly string[],
  level: string,
): boolean {
  if (activeTiers.includes("advanced")) return true;
  if (
    activeTiers.includes("beginner") &&
    (ENGLISH_BEGINNER_LEVELS as readonly string[]).includes(level)
  ) {
    return true;
  }
  if (
    activeTiers.includes("intermediate") &&
    (ENGLISH_INTERMEDIATE_LEVELS as readonly string[]).includes(level)
  ) {
    return true;
  }
  return false;
}

/**
 * The set of CEFR levels reachable by a student with the given active tiers.
 * Returns a fresh array (callers may mutate). Order follows
 * `ENGLISH_CEFR_LEVELS` for `advanced`; otherwise beginner-first then
 * intermediate.
 */
export function getAllowedEnglishLevels(
  activeTiers: readonly string[],
): EnglishCefrLevel[] {
  if (activeTiers.includes("advanced")) return [...ENGLISH_ADVANCED_LEVELS];
  const allowed: EnglishCefrLevel[] = [];
  if (activeTiers.includes("beginner")) allowed.push(...ENGLISH_BEGINNER_LEVELS);
  if (activeTiers.includes("intermediate"))
    allowed.push(...ENGLISH_INTERMEDIATE_LEVELS);
  return allowed;
}

// `englishLessonsTable` is reused by the new curriculum hierarchy. The
// curriculum-specific columns below (`bookId`, `lessonNumber`, `theme*`,
// `summary*`) are NULLABLE so legacy Mentor video rows continue to work
// unchanged with `book_id IS NULL`. The book-level FK is defined as a raw
// integer here (resolved against `english_books.id` via SQL DDL with
// `ON DELETE CASCADE`) to avoid an import cycle with `english-curriculum.ts`,
// which imports this file. CASCADE is safe because legacy Mentor rows have
// `book_id IS NULL` and are therefore not affected by any book delete; only
// curriculum-attached lessons (and their sections/vocab/section-progress
// via their own cascades) are removed when a book is deleted.
export const englishLessonsTable = pgTable(
  "english_lessons",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    titleAr: varchar("title_ar", { length: 255 }),
    vimeoUrl: varchar("vimeo_url", { length: 512 }).notNull().default(""),
    tier: varchar("tier", { length: 16 }).notNull().default("beginner"),
    level: varchar("level", { length: 4 }).notNull().default("A1"),
    sortOrder: integer("sort_order").notNull().default(0),
    bookId: integer("book_id"),
    lessonNumber: smallint("lesson_number"),
    theme: varchar("theme", { length: 64 }),
    themeAr: varchar("theme_ar", { length: 128 }),
    summary: varchar("summary", { length: 255 }),
    summaryAr: varchar("summary_ar", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("english_lessons_book_lesson_number_idx").on(t.bookId, t.lessonNumber),
  ],
);

export const insertEnglishLessonSchema = createInsertSchema(englishLessonsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEnglishLesson = z.infer<typeof insertEnglishLessonSchema>;
export type EnglishLesson = typeof englishLessonsTable.$inferSelect;

export const englishLessonCompletionsTable = pgTable(
  "english_lesson_completions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => englishLessonsTable.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("english_lesson_completions_user_lesson_uniq").on(t.userId, t.lessonId),
  ],
);

export type EnglishLessonCompletion = typeof englishLessonCompletionsTable.$inferSelect;

export const englishLessonProgressTable = pgTable(
  "english_lesson_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => englishLessonsTable.id, { onDelete: "cascade" }),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    lastPositionSeconds: integer("last_position_seconds").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("english_lesson_progress_user_lesson_uniq").on(t.userId, t.lessonId),
  ],
);

export type EnglishLessonProgress = typeof englishLessonProgressTable.$inferSelect;
