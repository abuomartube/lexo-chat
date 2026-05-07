// ============================================================================
// Phase E5 — English Engagement & Gamification schema (English-only).
//
// Three new tables, all parallel to the Phase E1 architecture and untouched
// by IELTS / legacy Mentor / old-flashcards systems:
//
//   * english_achievements              — append-only grant log, one row per
//                                         (user, achievement code).
//   * english_daily_activity            — analytics rollup, one row per
//                                         (user, dateUtc).
//   * english_notification_preferences  — foundation only (no sender), one
//                                         row per user.
//
// Scope rules:
//   * NEW tables only, no edits to existing tables.
//   * Achievement *codes* are a TS enum (`ENGLISH_ACHIEVEMENT_CODES`); the DB
//     column is `varchar(48)` with no CHECK so adding a code is a TS-only
//     change.
//   * No DB triggers / no stored functions — all evaluation lives in the
//     `english-engagement-service.ts` API layer.
//   * No reuse of any IELTS / Mentor-tool / old-flashcards table.
// ============================================================================

import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  serial,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ---------------------------------------------------------------------------
// Achievement codes (English-only).
//
// Kept intentionally small and "premium" — not a noisy badge wall. Each code
// is awarded at most once per user; duplicate inserts are blocked by the
// uniqueIndex below.
// ---------------------------------------------------------------------------
export const ENGLISH_ACHIEVEMENT_CODES = [
  // Lessons
  "first_lesson",
  // Vocabulary mastery
  "first_mastered",
  "hundred_mastered",
  "five_hundred_mastered",
  // Sessions
  "perfect_session",
  // XP milestones
  "xp_1000",
  "xp_5000",
  "xp_25000",
  // Consistency / streaks
  "streak_7",
  "streak_30",
  "streak_100",
] as const;
export type EnglishAchievementCode =
  (typeof ENGLISH_ACHIEVEMENT_CODES)[number];

// ---------------------------------------------------------------------------
// english_achievements
// ---------------------------------------------------------------------------
// Append-only grant log. The presence of a row for (userId, code) means the
// achievement is permanently unlocked. `context` is a small JSON snapshot of
// signals at award time (e.g. { totalXp: 1003, streakDays: 8 }) used for
// future analytics — never read back into the UI.
// ---------------------------------------------------------------------------
export const englishAchievementsTable = pgTable(
  "english_achievements",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 48 }).notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    context: jsonb("context").notNull().default({}),
  },
  (t) => [
    uniqueIndex("english_achievements_user_code_uniq").on(t.userId, t.code),
    index("english_achievements_user_awarded_idx").on(t.userId, t.awardedAt),
  ],
);

export const insertEnglishAchievementSchema = createInsertSchema(
  englishAchievementsTable,
).omit({
  id: true,
  awardedAt: true,
});
export type InsertEnglishAchievement = z.infer<
  typeof insertEnglishAchievementSchema
>;
export type EnglishAchievement = typeof englishAchievementsTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_daily_activity
// ---------------------------------------------------------------------------
// Per-day rollup, one row per (userId, dateUtc). Written via UPSERT on every
// XP-bearing event (vocab attempt, lesson complete) so the totals stay live
// without a nightly job. Foundation for retention / consistency analytics.
//
// `dateUtc` is stored as DATE (not timestamptz) — the "day" is always
// computed from the event's UTC timestamp, never the server-local clock, so
// streaks are consistent across deployments and timezones.
// ---------------------------------------------------------------------------
export const englishDailyActivityTable = pgTable(
  "english_daily_activity",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    dateUtc: date("date_utc").notNull(),
    xpGained: integer("xp_gained").notNull().default(0),
    wordsStudied: integer("words_studied").notNull().default(0),
    wordsCorrect: integer("words_correct").notNull().default(0),
    wordsMastered: integer("words_mastered").notNull().default(0),
    lessonsCompleted: integer("lessons_completed").notNull().default(0),
    sessionsCompleted: integer("sessions_completed").notNull().default(0),
    secondsActive: integer("seconds_active").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("english_daily_activity_user_date_uniq").on(t.userId, t.dateUtc),
    index("english_daily_activity_user_date_idx").on(t.userId, t.dateUtc),
  ],
);

export const insertEnglishDailyActivitySchema = createInsertSchema(
  englishDailyActivityTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEnglishDailyActivity = z.infer<
  typeof insertEnglishDailyActivitySchema
>;
export type EnglishDailyActivity =
  typeof englishDailyActivityTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_notification_preferences  (FOUNDATION ONLY)
// ---------------------------------------------------------------------------
// Per-user preference flags for future engagement notifications. No sender,
// no scheduler, no UI in Phase E5 — just the durable shape so a later phase
// can flip a feature flag without a migration.
//
// `channel` is a coarse hint ("in_app" default; future: "email", "push").
// ---------------------------------------------------------------------------
export const englishNotificationPreferencesTable = pgTable(
  "english_notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    reviewReminders: boolean("review_reminders").notNull().default(true),
    streakWarnings: boolean("streak_warnings").notNull().default(true),
    weakWordReminders: boolean("weak_word_reminders").notNull().default(true),
    lessonReminders: boolean("lesson_reminders").notNull().default(true),
    channel: varchar("channel", { length: 16 }).notNull().default("in_app"),
    quietHoursStart: text("quiet_hours_start"),
    quietHoursEnd: text("quiet_hours_end"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
);

export const insertEnglishNotificationPreferencesSchema = createInsertSchema(
  englishNotificationPreferencesTable,
).omit({
  updatedAt: true,
});
export type InsertEnglishNotificationPreferences = z.infer<
  typeof insertEnglishNotificationPreferencesSchema
>;
export type EnglishNotificationPreferences =
  typeof englishNotificationPreferencesTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_study_events  (Phase E5 stabilization, B-14)
// ---------------------------------------------------------------------------
// Append-only per-write delta log. Each row = a positive increment in
// `english_lesson_progress.watchedSeconds` observed at the time of a
// `POST /english/mentor/lessons/:id/progress` call.
//
// Why: previously, /english/me/study-time aggregated cumulative
// `watchedSeconds` and attributed the FULL cumulative total to the date of
// the most recent progress write — heavily overcounting any time a student
// re-opened an old lesson. With per-event deltas we can sum exact seconds
// per day with no approximation.
//
// `occurredAt` is timestamptz (we always derive day buckets in
// Asia/Riyadh at read time — never trust the row's date column).
// ---------------------------------------------------------------------------
export const englishStudyEventsTable = pgTable(
  "english_study_events",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id").notNull(),
    deltaSeconds: integer("delta_seconds").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("english_study_events_user_occurred_idx").on(t.userId, t.occurredAt),
  ],
);

export type EnglishStudyEvent = typeof englishStudyEventsTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_vocab_attempt_log  (Phase E5 stabilization, B-6)
// ---------------------------------------------------------------------------
// Append-only per-attempt log used by `POST /english/me/sessions/complete`
// to derive session integrity (attempt count, correctness count, perfect
// session) from server-side data instead of trusting the client body.
// One row per call to `recordAttempt`.
// ---------------------------------------------------------------------------
export const englishVocabAttemptLogTable = pgTable(
  "english_vocab_attempt_log",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    wordId: integer("word_id").notNull(),
    wasCorrect: boolean("was_correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("english_vocab_attempt_log_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
  ],
);

export type EnglishVocabAttemptLog =
  typeof englishVocabAttemptLogTable.$inferSelect;

// ---------------------------------------------------------------------------
// english_session_markers  (Phase E5 stabilization, B-6)
// ---------------------------------------------------------------------------
// Per-user watermark of the most recent successful `POST /english/me/sessions/complete`.
// Used as the LOWER bound of the attempt-log scan window so that the next
// session's "perfect_session" decision can never count attempts from a
// previous session, regardless of what `durationSeconds` the client sends.
// One row per user, upserted on every session completion.
// ---------------------------------------------------------------------------
export const englishSessionMarkersTable = pgTable("english_session_markers", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EnglishSessionMarker =
  typeof englishSessionMarkersTable.$inferSelect;
