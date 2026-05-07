// ============================================================================
// English vocabulary SRS (Spaced Repetition Scheduler) — Phase E2.
//
// PURE function. No DB access, no I/O, no clock-reading. Given the current
// progress row + the outcome of one attempt + a `now` timestamp, returns the
// new column values to write back. This makes the algorithm trivially unit-
// testable and lets us swap it (SM-2, Anki-style, FSRS, etc.) without
// touching the route layer.
//
// Design (v1, intentionally simple — the brief says "simple first version is
// enough"):
//
//   On a CORRECT attempt
//     repetitions++                    (consecutive correct streak)
//     consecutive_failures = 0
//     strength       = min(100, strength + 15)
//     studied_count++ , correct_count++
//     last_reviewed_at = now
//     next_review_at = now + INTERVAL_HOURS[min(repetitions, last)]
//     status:
//       repetitions >= 5 AND strength >= 80  -> "mastered" (set mastered_at
//                                               only if not already set —
//                                               first-mastery is a one-shot
//                                               event used for XP)
//       repetitions >= 2                     -> "review"
//       else                                 -> "learning"
//
//   On an INCORRECT attempt
//     consecutive_failures++           (failure streak)
//     repetitions = 0                  (resets the success streak)
//     strength    = max(0, strength - 25)
//     studied_count++ , incorrect_count++
//     last_reviewed_at = now , last_failed_at = now
//     status      = "needs_review"
//     next_review_at = now + max(10, 30 - 5 * consecutive_failures) MINUTES
//                      capped to 24h. (Failed words come back fast; the more
//                      they keep failing the sooner, until we floor at 10min.)
//
//   Manual MASTERED override (student taps "I know this")
//     status = "mastered" , strength = 100
//     repetitions = max(repetitions, 5)   (so it survives one slip without
//                                          immediately demoting back)
//     mastered_at = mastered_at ?? now
//     next_review_at = now + 30 days       (long-tail refresh)
//
//   Manual NEEDS-REVIEW override (student taps "I forgot this / harder")
//     status = "needs_review"
//     strength = max(0, strength - 30)
//     repetitions = 0
//     next_review_at = now + 1 hour
//     last_failed_at = now
//     (We do NOT increment studied/incorrect/consecutive_failures — this is
//      a self-report, not a graded attempt.)
//
// XP rules (computed alongside the schedule):
//   * correct attempt        -> +2  XP, source "vocab_attempt"
//   * first-time mastery     -> +25 XP, source "word_mastered"
//   * incorrect attempt      ->  0  XP
//   * manual override        ->  0  XP (no grind reward for self-marking)
//
// Constants are exported so the dashboard / docs / tests can reference them.
// ============================================================================

import type { EnglishWordProgress } from "@workspace/db";

// Spacing schedule for successful repetitions, in HOURS. Index = repetitions
// just-completed. Last value is sticky for higher reps.
export const VOCAB_SUCCESS_INTERVALS_HOURS = [
  6, // rep 1: see again later today
  24, // rep 2: tomorrow
  72, // rep 3: in 3 days
  168, // rep 4: in 1 week
  336, // rep 5: in 2 weeks
  720, // rep 6: in 1 month
  1440, // rep 7+: in 2 months
] as const;

export const VOCAB_XP_PER_CORRECT = 2;
export const VOCAB_XP_PER_FIRST_MASTERY = 25;
export const LESSON_XP_PER_FIRST_COMPLETION = 50;

export const MASTERY_REP_THRESHOLD = 5;
export const MASTERY_STRENGTH_THRESHOLD = 80;

export type VocabAttemptResult = "correct" | "incorrect";

export interface SrsInput {
  // Full current row, OR a freshly-defaulted row for a never-seen word.
  // Pass `defaultProgress(level)` for a brand-new word.
  current: Pick<
    EnglishWordProgress,
    | "status"
    | "strength"
    | "repetitions"
    | "studiedCount"
    | "correctCount"
    | "incorrectCount"
    | "consecutiveFailures"
    | "masteredAt"
  >;
  now: Date;
}

// Subset of columns we write back from the SRS step. Caller layers in
// userId / wordId / level for the upsert.
export interface SrsUpdate {
  status: EnglishWordProgress["status"];
  strength: number;
  repetitions: number;
  studiedCount: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveFailures: number;
  lastReviewedAt: Date;
  lastFailedAt: Date | null;
  nextReviewAt: Date;
  masteredAt: Date | null;
  // Derived flag — true iff this transition is the FIRST time this row
  // reaches "mastered". Used by the service layer to award one-shot XP.
  becameMastered: boolean;
}

// Returns column values for a never-seen word. The caller stamps
// userId/wordId/level on top.
export function defaultProgress(): SrsInput["current"] {
  return {
    status: "new",
    strength: 0,
    repetitions: 0,
    studiedCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    consecutiveFailures: 0,
    masteredAt: null,
  };
}

function intervalHoursForReps(reps: number): number {
  const idx = Math.max(0, Math.min(reps - 1, VOCAB_SUCCESS_INTERVALS_HOURS.length - 1));
  return VOCAB_SUCCESS_INTERVALS_HOURS[idx]!;
}

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3600_000);
}

function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000);
}

export function applyAttempt(
  input: SrsInput,
  result: VocabAttemptResult,
): SrsUpdate {
  const { current, now } = input;

  if (result === "correct") {
    const repetitions = current.repetitions + 1;
    const strength = Math.min(100, current.strength + 15);
    const reachedMastery =
      repetitions >= MASTERY_REP_THRESHOLD && strength >= MASTERY_STRENGTH_THRESHOLD;
    const status: EnglishWordProgress["status"] = reachedMastery
      ? "mastered"
      : repetitions >= 2
        ? "review"
        : "learning";
    const becameMastered = reachedMastery && current.masteredAt === null;

    return {
      status,
      strength,
      repetitions,
      studiedCount: current.studiedCount + 1,
      correctCount: current.correctCount + 1,
      incorrectCount: current.incorrectCount,
      consecutiveFailures: 0,
      lastReviewedAt: now,
      lastFailedAt: null, // schema default — preserved by the upsert below
      nextReviewAt: addHours(now, intervalHoursForReps(repetitions)),
      masteredAt: becameMastered ? now : current.masteredAt,
      becameMastered,
    };
  }

  // incorrect
  const consecutiveFailures = current.consecutiveFailures + 1;
  const strength = Math.max(0, current.strength - 25);
  const minutes = Math.min(60 * 24, Math.max(10, 30 - 5 * consecutiveFailures));

  return {
    status: "needs_review",
    strength,
    repetitions: 0,
    studiedCount: current.studiedCount + 1,
    correctCount: current.correctCount,
    incorrectCount: current.incorrectCount + 1,
    consecutiveFailures,
    lastReviewedAt: now,
    lastFailedAt: now,
    nextReviewAt: addMinutes(now, minutes),
    masteredAt: current.masteredAt,
    becameMastered: false,
  };
}

export function applyManualMastered(
  current: SrsInput["current"],
  now: Date,
): SrsUpdate {
  const becameMastered = current.masteredAt === null;
  return {
    status: "mastered",
    strength: 100,
    repetitions: Math.max(current.repetitions, MASTERY_REP_THRESHOLD),
    studiedCount: current.studiedCount,
    correctCount: current.correctCount,
    incorrectCount: current.incorrectCount,
    consecutiveFailures: 0,
    lastReviewedAt: now,
    lastFailedAt: null,
    nextReviewAt: addHours(now, 24 * 30),
    masteredAt: becameMastered ? now : current.masteredAt,
    becameMastered,
  };
}

export function applyManualNeedsReview(
  current: SrsInput["current"],
  now: Date,
): SrsUpdate {
  return {
    status: "needs_review",
    strength: Math.max(0, current.strength - 30),
    repetitions: 0,
    studiedCount: current.studiedCount,
    correctCount: current.correctCount,
    incorrectCount: current.incorrectCount,
    consecutiveFailures: current.consecutiveFailures,
    lastReviewedAt: now,
    lastFailedAt: now,
    nextReviewAt: addHours(now, 1),
    masteredAt: current.masteredAt,
    becameMastered: false,
  };
}
