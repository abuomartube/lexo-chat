import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  smallint,
  boolean,
  serial,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { wordsTable } from "./words";
import { englishLessonsTable } from "./english-mentor";

// ============================================================================
// Phase E1 — New English Dashboard schema (English-only).
//
// Scope rules (locked by Phase E1):
//   * NEW tables only. No edits to existing tables.
//   * Levels are exactly A1, A2, B1, B2, C1 (see ENGLISH_CEFR_LEVELS in
//     `english-mentor.ts`). Stored as varchar(4) on every table here for
//     consistency with `english_lessons.level`.
//   * Vocabulary source of truth = `words` table (Lexo 5000 / Lexo Flashcards).
//     `english_word_progress.word_id` references it directly.
//   * No reuse of legacy Mentor *tool* tables (Churchill/Orwell/Attenborough/
//     Hemingway/mentor-flashcards have their own tables, untouched and slated
//     for E7 deletion). The `english_lessons` table IS reused as the optional
//     `lesson_id` parent, because it is the canonical lesson-video catalog —
//     not a Mentor-tool table — and survives the E7 cleanup.
//   * No reuse of any IELTS XP/attempts tables. This is a parallel,
//     English-only architecture.
//   * No DB triggers / no stored functions — all aggregation logic lives in
//     the API layer (added in Phase E4).
// ============================================================================

// ---------------------------------------------------------------------------
// english_exercises
// ---------------------------------------------------------------------------
// Authored (admin) or AI-generated practice items. Each exercise targets a
// single CEFR level and one of a small fixed set of activity kinds. Type-
// specific question/answer data lives in `payload` and `solution` JSONB.
//
// Optional links:
//   * `word_id` — exercise that drills a specific word from `words` (e.g.
//     "use 'meticulous' in a sentence"). Cascade delete: if the source word
//     is removed, the exercise is too.
//   * `lesson_id` — exercise grouped under a Mentor lesson (so the new
//     dashboard can surface "exercises for today's lesson"). Set null on
//     lesson delete so the exercise survives a lesson reorganization.
//
// Authoring metadata:
//   * `source` — "admin" or "ai" (string, not enum, to keep migrations
//     trivial; constrained at the API boundary by Zod).
//   * `created_by` — admin user who authored or generated. Nullable for
//     system-seeded exercises.
// ---------------------------------------------------------------------------
export const ENGLISH_EXERCISE_TYPES = [
  "mcq",
  "fill_blank",
  "matching",
  "listening",
  "reading",
  "writing",
  "speaking",
  // Curriculum-lesson exercise kinds (added for Lexo For English Book 1+).
  // The DB column is open varchar(32) with no CHECK, so this is a TS-only
  // additive change. Stored verbatim.
  "sentence_build",
  "reading_check",
  "vocabulary_recall",
] as const;
export type EnglishExerciseType = (typeof ENGLISH_EXERCISE_TYPES)[number];

export const ENGLISH_EXERCISE_SOURCES = ["admin", "ai"] as const;
export type EnglishExerciseSource = (typeof ENGLISH_EXERCISE_SOURCES)[number];

export const englishExercisesTable = pgTable(
  "english_exercises",
  {
    id: serial("id").primaryKey(),
    level: varchar("level", { length: 4 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    prompt: text("prompt").notNull(),
    promptAr: text("prompt_ar"),
    // Type-specific question structure (e.g. mcq choices, fill-blank tokens).
    payload: jsonb("payload").notNull().default({}),
    // Canonical answer(s). Shape depends on `type`. Validated at the API
    // boundary; never trusted from the client.
    solution: jsonb("solution").notNull().default({}),
    // Default XP awarded for a fully-correct attempt. Per-attempt scoring
    // (e.g. partial credit) is computed in the API and recorded on the
    // attempt + xp_event rows.
    xpReward: integer("xp_reward").notNull().default(10),
    // SET NULL (not CASCADE) so that admin/AI-authored exercises survive a
    // word being curated away from `words`; the exercise simply detaches.
    wordId: integer("word_id").references(() => wordsTable.id, {
      onDelete: "set null",
    }),
    lessonId: integer("lesson_id").references(() => englishLessonsTable.id, {
      onDelete: "set null",
    }),
    source: varchar("source", { length: 16 }).notNull().default("admin"),
    createdBy: uuid("created_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("english_exercises_level_idx").on(t.level),
    index("english_exercises_type_idx").on(t.type),
    index("english_exercises_word_idx").on(t.wordId),
    index("english_exercises_lesson_idx").on(t.lessonId),
  ],
);

export const insertEnglishExerciseSchema = createInsertSchema(
  englishExercisesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEnglishExercise = z.infer<typeof insertEnglishExerciseSchema>;
export type EnglishExercise = typeof englishExercisesTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_exercise_attempts
// ---------------------------------------------------------------------------
// Append-only log of every student attempt at an exercise. The new dashboard
// reads this for "exercises completed today", per-exercise mastery, and to
// derive XP events. Multiple attempts per (user, exercise) are allowed and
// expected (retry / review).
//
// `response` shape mirrors `english_exercises.payload`'s answer slot. `score`
// is 0–100 (smallint) so partial credit (e.g. for writing) is representable.
// `is_correct` is the binary outcome used for streak/mastery counters.
// ---------------------------------------------------------------------------
export const englishExerciseAttemptsTable = pgTable(
  "english_exercise_attempts",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => englishExercisesTable.id, { onDelete: "cascade" }),
    // Snapshot of CEFR level at the moment of attempt — survives
    // re-categorization of the source exercise.
    level: varchar("level", { length: 4 }).notNull(),
    response: jsonb("response").notNull().default({}),
    isCorrect: boolean("is_correct").notNull().default(false),
    score: smallint("score").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("english_exercise_attempts_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
    index("english_exercise_attempts_user_exercise_idx").on(
      t.userId,
      t.exerciseId,
    ),
    index("english_exercise_attempts_user_level_idx").on(t.userId, t.level),
  ],
);

export const insertEnglishExerciseAttemptSchema = createInsertSchema(
  englishExerciseAttemptsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertEnglishExerciseAttempt = z.infer<
  typeof insertEnglishExerciseAttemptSchema
>;
export type EnglishExerciseAttempt =
  typeof englishExerciseAttemptsTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_xp_events
// ---------------------------------------------------------------------------
// Append-only XP ledger for the new English Dashboard. Every XP-bearing event
// (correct exercise, mastered word, completed lesson, daily streak bonus,
// etc.) writes one row here. Totals are derived by SUM at read time, never
// stored as a denormalized counter — this keeps recovery and audit trivial.
//
// `source` is a coarse string tag (constrained by Zod at the API boundary).
// `ref_table` + `ref_id` are an optional polymorphic pointer to the row that
// caused the event (e.g. attempt id, lesson id). Both are nullable so future
// event sources can be added without a migration.
//
// IMPORTANT: this table is independent of any IELTS XP table. They never
// share rows or sources.
// ---------------------------------------------------------------------------
export const ENGLISH_XP_SOURCES = [
  "exercise_attempt",
  // Phase E2: vocabulary review attempts (separate ledger source from generic
  // `exercise_attempt` so the dashboard can split "vocab study XP" from
  // "structured exercise XP"). The DB column is varchar(32) with no CHECK
  // constraint, so adding sources here is a TS-only change.
  "vocab_attempt",
  "word_mastered",
  "lesson_completed",
  "daily_streak",
  "manual_adjustment",
] as const;
export type EnglishXpSource = (typeof ENGLISH_XP_SOURCES)[number];

export const englishXpEventsTable = pgTable(
  "english_xp_events",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 32 }).notNull(),
    amount: integer("amount").notNull(),
    // Snapshot of the CEFR level relevant to the event (lets us split totals
    // by level on the dashboard without a join). Nullable for level-agnostic
    // events like daily_streak.
    level: varchar("level", { length: 4 }),
    refTable: varchar("ref_table", { length: 64 }),
    refId: integer("ref_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("english_xp_events_user_created_idx").on(t.userId, t.createdAt),
    index("english_xp_events_user_source_idx").on(t.userId, t.source),
    index("english_xp_events_user_level_idx").on(t.userId, t.level),
  ],
);

export const insertEnglishXpEventSchema = createInsertSchema(
  englishXpEventsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertEnglishXpEvent = z.infer<typeof insertEnglishXpEventSchema>;
export type EnglishXpEvent = typeof englishXpEventsTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_word_progress  (CORE TABLE — explicitly required by Phase E1 brief)
// ---------------------------------------------------------------------------
// One row per (user, word). Tracks a student's lifetime relationship with a
// vocabulary item from `words` (Lexo 5000 / Lexo Flashcards is the source of
// truth). The new English Dashboard's vocabulary widgets, daily review queue,
// and "mastered words" XP all read/write this table.
//
// SRS-style fields:
//   * status              — coarse lifecycle: new → learning → review →
//                           mastered (or → needs_review on a regression).
//   * strength            — confidence 0–100, used to bucket SM-2-style
//                           review intervals. The exact algorithm is decided
//                           in Phase E4; the column is intentionally generic.
//   * repetitions         — successful repetitions in a row (resets to 0 on
//                           an incorrect attempt).
//   * studied_count       — total times the word has been shown / drilled.
//   * correct_count /
//     incorrect_count     — lifetime tallies, used for analytics + UI badges.
//   * consecutive_failures — failures in a row; resets to 0 on a correct
//                            attempt. Symmetric counterpart of `repetitions`,
//                            and the explicit first-class "failed" signal
//                            required by the Phase E1 brief.
//   * last_reviewed_at    — when the student last attempted this word.
//   * last_failed_at      — when the student most recently got it wrong.
//                            Nullable. Drives "Words you got wrong recently"
//                            review queues.
//   * next_review_at      — when the SRS scheduler should re-surface it.
//   * mastered_at         — first time the word reached `mastered`. Nullable.
//
// Denormalization: `level` is copied from `words.level` so the dashboard can
// "give me all my B1 words I need to review" without a join, and so a future
// re-leveling of a word (rare) doesn't silently shuffle a student's history.
// ---------------------------------------------------------------------------
export const ENGLISH_WORD_PROGRESS_STATUSES = [
  "new",
  "learning",
  "review",
  "mastered",
  "needs_review",
] as const;
export type EnglishWordProgressStatus =
  (typeof ENGLISH_WORD_PROGRESS_STATUSES)[number];

export const englishWordProgressTable = pgTable(
  "english_word_progress",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    // Snapshot of word.level at first contact; see comment block above.
    level: varchar("level", { length: 4 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("new"),
    strength: smallint("strength").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    studiedCount: integer("studied_count").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    incorrectCount: integer("incorrect_count").notNull().default(0),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    masteredAt: timestamp("mastered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // One progress row per (student, word). Upserts target this index.
    uniqueIndex("english_word_progress_user_word_uniq").on(t.userId, t.wordId),
    // Daily review queue: "give me this user's words due now, by level".
    index("english_word_progress_user_level_next_idx").on(
      t.userId,
      t.level,
      t.nextReviewAt,
    ),
    // Mastered words count per level (cheap aggregate for dashboard cards).
    index("english_word_progress_user_status_level_idx").on(
      t.userId,
      t.status,
      t.level,
    ),
  ],
);

export const insertEnglishWordProgressSchema = createInsertSchema(
  englishWordProgressTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEnglishWordProgress = z.infer<
  typeof insertEnglishWordProgressSchema
>;
export type EnglishWordProgress = typeof englishWordProgressTable.$inferSelect;
