// ============================================================================
// English Student Adaptive Profile schema (English-only).
//
// One new table: `english_adaptive_profile`. Per-user, upserted on each
// recompute by the adaptive-profile-engine. Read-heavy by design — the planner
// and intervention layer (future phases) read this single row instead of
// re-running aggregates.
//
// Privacy: this stores ONLY educational interaction patterns derived from
// existing analytics tables. NO demographics, NO mental-state labels, NO
// personality typing, NO health claims. Field names and copy are about
// study behavior (e.g. "session endurance", "retry behavior", "challenge
// tolerance") — not about the student as a person.
//
// Scope rules (locked):
//   * NEW table only. No edits to existing tables.
//   * No reuse of any IELTS / Mentor-tool / Flashcards table.
//   * No DB triggers / no stored functions — all derivation lives in the
//     `adaptive-profile-engine.ts` API layer.
//   * The XP formula is NOT modified by this layer; we only read XP events.
// ============================================================================

import {
  pgTable,
  uuid,
  jsonb,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ---------------------------------------------------------------------------
// Per-trait wrapper.
//
// Every numeric / categorical trait is exposed with the same envelope so
// downstream consumers (planner, dashboards, AI) can always answer "how much
// should I trust this number?" without bespoke logic per trait.
// ---------------------------------------------------------------------------
export const traitNumberSchema = z.object({
  value: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().min(0),
  lastUpdated: z.string(),
});

export const traitCategoricalSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().min(0),
  lastUpdated: z.string(),
});

export const traitBooleanSchema = z.object({
  value: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().min(0),
  lastUpdated: z.string(),
});

export const trendSchema = z.object({
  windowDays: z.number().int(),
  exerciseAccuracyPct: z.number().nullable(),
  vocabRetentionPct: z.number().nullable(),
  grammarAccuracyPct: z.number().nullable(),
  readingAccuracyPct: z.number().nullable(),
  quizPassRatePct: z.number().nullable(),
  activeDays: z.number().int(),
  avgSessionSeconds: z.number().nullable(),
  lessonsCompleted: z.number().int(),
  xpTotal: z.number().int(),
});

// ---------------------------------------------------------------------------
// Twelve adaptive traits required by the brief.
// ---------------------------------------------------------------------------
export const adaptiveTraitsSchema = z.object({
  preferredExerciseTypes: traitCategoricalSchema, // value = top type label
  strongestSkillAreas: traitCategoricalSchema, // value = top area label
  weakestSkillAreas: traitCategoricalSchema,
  vocabularyRetention: traitNumberSchema, // 0-100
  grammarAccuracy: traitNumberSchema, // 0-100
  readingConfidence: traitNumberSchema, // 0-100
  quizConfidence: traitNumberSchema, // 0-100
  studyConsistency: traitNumberSchema, // 0-100
  sessionEndurance: traitNumberSchema, // 0-100 (longest typical session normalized)
  averageFocusDurationSec: traitNumberSchema, // seconds
  retryBehavior: traitNumberSchema, // % of failed exercises retried
  improvementVelocity: traitNumberSchema, // pct points / week (accuracy delta)
});

// ---------------------------------------------------------------------------
// Five lightweight LEARNING-STYLE signals (educational tendencies, NOT
// psychological labels). Categorical buckets — see engine for derivation.
// ---------------------------------------------------------------------------
export const learningStyleSchema = z.object({
  visualPreference: traitCategoricalSchema, // "high"|"medium"|"low"|"unknown"
  repetitionPreference: traitCategoricalSchema,
  challengeTolerance: traitCategoricalSchema, // "high"|"medium"|"low"
  speedVsAccuracy: traitCategoricalSchema, // "speed_leaning"|"balanced"|"accuracy_leaning"
  structureVsExploration: traitCategoricalSchema, // "structured"|"balanced"|"exploratory"
});

// ---------------------------------------------------------------------------
// Adaptive Difficulty Memory.
// ---------------------------------------------------------------------------
export const difficultyMemorySchema = z.object({
  currentComfortLevel: traitCategoricalSchema, // "below_level"|"on_level"|"above_level"|"unknown"
  recentOverloadSignals: traitNumberSchema, // count in last 7d
  recentMomentum: traitNumberSchema, // -1..+1
  recommendedIntensity: traitCategoricalSchema, // "lighter"|"steady"|"stretch"
});

// ---------------------------------------------------------------------------
// Personalization signals — boolean flags. Each flag is independently
// trustworthy (own confidence + evidence). Names are the canonical keys
// downstream consumers will look up.
// ---------------------------------------------------------------------------
export const PERSONALIZATION_SIGNAL_KEYS = [
  "prefers_short_sessions",
  "handles_long_sessions",
  "needs_review_cycles",
  "performs_better_at_night",
  "performs_better_with_repetition",
  "quiz_confidence_low",
  "quiz_confidence_high",
  "reading_strength_high",
  "grammar_weakness",
  "vocabulary_strength_high",
  "consistent_daily_studier",
  "burst_studier",
] as const;
export type PersonalizationSignalKey =
  (typeof PERSONALIZATION_SIGNAL_KEYS)[number];

// JSON shape: { [key]: traitBoolean }
export const personalizationSignalsSchema = z.record(
  z.enum(PERSONALIZATION_SIGNAL_KEYS),
  traitBooleanSchema,
);

// ---------------------------------------------------------------------------
// Trends bundle: 7d / 30d / lifetime.
// ---------------------------------------------------------------------------
export const trendsBundleSchema = z.object({
  d7: trendSchema,
  d30: trendSchema,
  lifetime: trendSchema,
});

// ---------------------------------------------------------------------------
// english_adaptive_profile
// ---------------------------------------------------------------------------
// One row per user (userId is PK). Upserted by the engine on demand and on
// recompute. Designed for read-heavy access by future planner / intervention
// integrations.
//
// All composite fields are JSONB (no internal joins, no per-trait writes,
// upsert is atomic).
// ---------------------------------------------------------------------------
export const englishAdaptiveProfileTable = pgTable(
  "english_adaptive_profile",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    traits: jsonb("traits").notNull().default({}),
    learningStyle: jsonb("learning_style").notNull().default({}),
    difficulty: jsonb("difficulty").notNull().default({}),
    signals: jsonb("signals").notNull().default({}),
    trends: jsonb("trends").notNull().default({}),
    evidenceCount: integer("evidence_count").notNull().default(0),
    lastComputedAt: timestamp("last_computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("english_adaptive_profile_last_computed_idx").on(t.lastComputedAt),
  ],
);

export type EnglishAdaptiveProfile =
  typeof englishAdaptiveProfileTable.$inferSelect;
export type InsertEnglishAdaptiveProfile =
  typeof englishAdaptiveProfileTable.$inferInsert;

export type AdaptiveTraits = z.infer<typeof adaptiveTraitsSchema>;
export type LearningStyle = z.infer<typeof learningStyleSchema>;
export type DifficultyMemory = z.infer<typeof difficultyMemorySchema>;
export type TrendsBundle = z.infer<typeof trendsBundleSchema>;
