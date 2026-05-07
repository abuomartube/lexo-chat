// ============================================================================
// Lexo For English — Curriculum schema (Beginner → Intermediate)
//
// Adds the BOOK / LESSON-SECTION / QUIZ hierarchy on top of the existing
// `english_lessons` catalog. Strict separation rules:
//
//   * Curriculum and the Lexo Flashcards system are independent. The ONLY
//     bridge into vocabulary is `english_lesson_vocab.word_id → words.id`.
//     Curriculum write paths must NEVER touch `english_word_progress`.
//   * IELTS lives in its own server (`artifacts/ielts-api`) and DB
//     package (`lib/ielts-db`). No FKs from this file cross that boundary.
//   * `english_lessons` is reused (not forked). The two new columns
//     `book_id` and `lesson_number` are NULLABLE so legacy Mentor rows keep
//     working untouched.
//   * Six fixed lesson sections (vocabulary / sentences / conversation /
//     short_story / grammar / writing_prompt) live in
//     `english_lesson_sections.kind` and are validated by Zod at the API
//     boundary, not by a DB CHECK (so adding a future kind is a TS-only
//     change).
// ============================================================================

import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  smallint,
  serial,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { wordsTable } from "./words";
import { englishLessonsTable } from "./english-mentor";

// ---------------------------------------------------------------------------
// Constants — kept in TS so reordering is a code change, not a migration.
// ---------------------------------------------------------------------------

export const ENGLISH_LESSON_SECTION_KINDS = [
  "vocabulary",
  "sentences",
  "conversation",
  "short_story",
  "grammar",
  "writing_prompt",
] as const;
export type EnglishLessonSectionKind =
  (typeof ENGLISH_LESSON_SECTION_KINDS)[number];

// Fixed display position inside a lesson, 1-indexed, matches the PDF layout.
export const ENGLISH_LESSON_SECTION_POSITION: Record<
  EnglishLessonSectionKind,
  number
> = {
  vocabulary: 1,
  sentences: 2,
  conversation: 3,
  short_story: 4,
  grammar: 5,
  writing_prompt: 6,
};

export const ENGLISH_QUIZ_QUESTION_KINDS = [
  "mcq",
  "fill_blank",
  "matching",
  "sentence_build",
  "listening",
  "reading_check",
] as const;
export type EnglishQuizQuestionKind =
  (typeof ENGLISH_QUIZ_QUESTION_KINDS)[number];

export const ENGLISH_BOOK_STATUSES = ["draft", "published", "archived"] as const;
export type EnglishBookStatus = (typeof ENGLISH_BOOK_STATUSES)[number];

export const ENGLISH_QUIZ_STATUSES = ["draft", "published"] as const;
export type EnglishQuizStatus = (typeof ENGLISH_QUIZ_STATUSES)[number];

// XP policy (per approved decision, May 2026):
//   * 5 XP per first-time section completion
//   * 50 XP bonus when the full lesson is first completed
//   * Quiz-passed XP TBD (separate constant added when quizzes ship)
export const CURRICULUM_XP_PER_SECTION = 5;
export const CURRICULUM_XP_LESSON_COMPLETE_BONUS = 50;

// ---------------------------------------------------------------------------
// english_books — 3 ordered books per tier.
// ---------------------------------------------------------------------------
// A book spans one or more CEFR levels (e.g. Beginner Book 1 may cover late
// A1 + early A2). The per-lesson level is the source of truth for gating;
// books carry NO `level` column on purpose.
// ---------------------------------------------------------------------------
export const englishBooksTable = pgTable(
  "english_books",
  {
    id: serial("id").primaryKey(),
    tier: varchar("tier", { length: 16 }).notNull(),
    bookNumber: smallint("book_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    titleAr: varchar("title_ar", { length: 255 }),
    subtitle: varchar("subtitle", { length: 255 }),
    subtitleAr: varchar("subtitle_ar", { length: 255 }),
    coverImage: varchar("cover_image", { length: 512 }),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("english_books_tier_number_uniq").on(t.tier, t.bookNumber),
    index("english_books_tier_status_sort_idx").on(t.tier, t.status, t.sortOrder),
  ],
);

export type EnglishBook = typeof englishBooksTable.$inferSelect;
export type InsertEnglishBook = typeof englishBooksTable.$inferInsert;

// ---------------------------------------------------------------------------
// english_lesson_sections — six fixed parts per lesson.
// `body` is jsonb; payload shape per `kind` is locked by Zod schemas in
// `lib/curriculum-ingest`. Translations live in `body_ar`, never inside `body`.
// ---------------------------------------------------------------------------
export const englishLessonSectionsTable = pgTable(
  "english_lesson_sections",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => englishLessonsTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 24 }).notNull(),
    position: smallint("position").notNull(),
    body: jsonb("body").notNull(),
    bodyAr: jsonb("body_ar"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("english_lesson_sections_lesson_kind_uniq").on(
      t.lessonId,
      t.kind,
    ),
    index("english_lesson_sections_lesson_pos_idx").on(t.lessonId, t.position),
  ],
);

export type EnglishLessonSection =
  typeof englishLessonSectionsTable.$inferSelect;
export type InsertEnglishLessonSection =
  typeof englishLessonSectionsTable.$inferInsert;

// ---------------------------------------------------------------------------
// english_lesson_vocab — the ONE link between curriculum and the Lexo 5000.
// Inserting a row here does NOT create or modify any `english_word_progress`
// row. The user has to choose the flashcards study mode for SRS to engage.
// ---------------------------------------------------------------------------
export const englishLessonVocabTable = pgTable(
  "english_lesson_vocab",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => englishLessonsTable.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    displayOrder: smallint("display_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("english_lesson_vocab_lesson_word_uniq").on(
      t.lessonId,
      t.wordId,
    ),
    index("english_lesson_vocab_word_idx").on(t.wordId),
  ],
);

export type EnglishLessonVocab = typeof englishLessonVocabTable.$inferSelect;
export type InsertEnglishLessonVocab =
  typeof englishLessonVocabTable.$inferInsert;

// ---------------------------------------------------------------------------
// english_lesson_section_progress — per-user per-section completion marker.
// One row per (user, lesson, kind). Append-on-first-touch, never updated.
// Used to (a) prevent double XP, (b) show per-section ticks in the UI.
// ---------------------------------------------------------------------------
export const englishLessonSectionProgressTable = pgTable(
  "english_lesson_section_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => englishLessonsTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 24 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("english_lesson_section_progress_uniq").on(
      t.userId,
      t.lessonId,
      t.kind,
    ),
    index("english_lesson_section_progress_user_lesson_idx").on(
      t.userId,
      t.lessonId,
    ),
  ],
);

export type EnglishLessonSectionProgress =
  typeof englishLessonSectionProgressTable.$inferSelect;
export type InsertEnglishLessonSectionProgress =
  typeof englishLessonSectionProgressTable.$inferInsert;

// ---------------------------------------------------------------------------
// english_quizzes — 2 per book, placed after lessons 15 and 30.
// `placed_after_lesson` is the lesson_number (1..30) the quiz follows.
// ---------------------------------------------------------------------------
export const englishQuizzesTable = pgTable(
  "english_quizzes",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => englishBooksTable.id, { onDelete: "cascade" }),
    quizNumber: smallint("quiz_number").notNull(),
    placedAfterLesson: smallint("placed_after_lesson").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    titleAr: varchar("title_ar", { length: 255 }),
    passThresholdPct: smallint("pass_threshold_pct").notNull().default(70),
    timeLimitSeconds: integer("time_limit_seconds"),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("english_quizzes_book_number_uniq").on(t.bookId, t.quizNumber),
    index("english_quizzes_book_idx").on(t.bookId),
  ],
);

export type EnglishQuiz = typeof englishQuizzesTable.$inferSelect;
export type InsertEnglishQuiz = typeof englishQuizzesTable.$inferInsert;

// ---------------------------------------------------------------------------
// english_quiz_questions — fixed-order graded items inside a quiz.
// Deliberately separate from `english_exercises`: quizzes have a pass
// threshold and ordered questions; exercises are SRS-style standalone items.
// ---------------------------------------------------------------------------
export const englishQuizQuestionsTable = pgTable(
  "english_quiz_questions",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => englishQuizzesTable.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    kind: varchar("kind", { length: 24 }).notNull(),
    promptEn: text("prompt_en").notNull(),
    promptAr: text("prompt_ar"),
    payload: jsonb("payload").notNull(),
    solution: jsonb("solution").notNull(),
    points: smallint("points").notNull().default(1),
    lessonRef: integer("lesson_ref").references(() => englishLessonsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("english_quiz_questions_quiz_pos_uniq").on(
      t.quizId,
      t.position,
    ),
  ],
);

export type EnglishQuizQuestion =
  typeof englishQuizQuestionsTable.$inferSelect;
export type InsertEnglishQuizQuestion =
  typeof englishQuizQuestionsTable.$inferInsert;

// ---------------------------------------------------------------------------
// english_quiz_attempts / english_quiz_answers — header + lines.
// `tier_snapshot` records the user's tier at attempt time so historical
// attempts survive a tier change.
// ---------------------------------------------------------------------------
export const englishQuizAttemptsTable = pgTable(
  "english_quiz_attempts",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => englishQuizzesTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    scorePct: smallint("score_pct"),
    passed: boolean("passed"),
    tierSnapshot: varchar("tier_snapshot", { length: 16 }),
  },
  (t) => [
    index("english_quiz_attempts_user_quiz_idx").on(t.userId, t.quizId),
    index("english_quiz_attempts_user_started_idx").on(t.userId, t.startedAt),
  ],
);

export type EnglishQuizAttempt =
  typeof englishQuizAttemptsTable.$inferSelect;
export type InsertEnglishQuizAttempt =
  typeof englishQuizAttemptsTable.$inferInsert;

export const englishQuizAnswersTable = pgTable(
  "english_quiz_answers",
  {
    id: serial("id").primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => englishQuizAttemptsTable.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => englishQuizQuestionsTable.id, { onDelete: "cascade" }),
    response: jsonb("response").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    pointsAwarded: smallint("points_awarded").notNull().default(0),
  },
  (t) => [
    uniqueIndex("english_quiz_answers_attempt_question_uniq").on(
      t.attemptId,
      t.questionId,
    ),
  ],
);

export type EnglishQuizAnswer = typeof englishQuizAnswersTable.$inferSelect;
export type InsertEnglishQuizAnswer =
  typeof englishQuizAnswersTable.$inferInsert;

// ---------------------------------------------------------------------------
// Zod payload schemas — used by `lib/curriculum-ingest` AND by route handlers
// to validate `english_lesson_sections.body` and quiz `payload` / `solution`
// at the API boundary. DB column type is jsonb; correctness is enforced here.
// ---------------------------------------------------------------------------

const arOpt = z.string().min(1).optional();

export const lessonSectionBodySchemas = {
  vocabulary: z.object({
    items: z
      .array(
        z.object({
          // wordId is the canonical Lexo 5000 reference. The ingest pipeline
          // resolves raw English text → wordId; raw text never lives in body.
          wordId: z.number().int().positive(),
          displayOrder: z.number().int().nonnegative(),
          note: z.string().optional(),
        }),
      )
      .min(1),
  }),
  sentences: z.object({
    items: z
      .array(
        z.object({
          en: z.string().min(1),
          ar: arOpt,
          wordIds: z.array(z.number().int().positive()).optional(),
        }),
      )
      .min(1),
  }),
  conversation: z.object({
    turns: z
      .array(
        z.object({
          speaker: z.enum(["A", "B"]),
          en: z.string().min(1),
          ar: arOpt,
        }),
      )
      .min(2),
  }),
  short_story: z.object({
    paragraphs: z
      .array(
        z.object({
          en: z.string().min(1),
          ar: arOpt,
        }),
      )
      .min(1),
    wordIds: z.array(z.number().int().positive()).optional(),
  }),
  grammar: z.object({
    focus: z.string().min(1),
    focus_ar: arOpt,
    examples: z
      .array(z.object({ en: z.string().min(1), ar: arOpt }))
      .min(1),
    rule_en: z.string().min(1),
    rule_ar: arOpt,
  }),
  writing_prompt: z.object({
    prompt_en: z.string().min(1),
    prompt_ar: arOpt,
    expected_min_sentences: z.number().int().min(1).max(20),
    rubric: z.array(z.object({ criterion: z.string().min(1) })).optional(),
  }),
} as const satisfies Record<EnglishLessonSectionKind, z.ZodTypeAny>;

export type EnglishLessonSectionBody<K extends EnglishLessonSectionKind> =
  z.infer<(typeof lessonSectionBodySchemas)[K]>;
