// ============================================================================
// English Engagement & Gamification service — Phase E5.
//
// Pure read/derive service over the Phase E1/E5 tables. No persistence here
// other than two strictly idempotent writes:
//   * `recordDailyActivity` — UPSERTs the (user, dateUtc) rollup row.
//   * `evaluateAchievements` — INSERTs new grants into `english_achievements`,
//     deduped by the unique (user, code) index.
//
// Reads:
//   * `xpToLevel` / `levelThreshold` — pure functions, no DB.
//   * `getProgressionSummary` — totals, level, mastery%, vocab coverage,
//     review pressure, streak. Single user, single trip.
//   * `listAchievements` — every defined code annotated with grant state.
//   * `getMotivationalMessage` — pure copy chooser from signals.
//
// Scope rules (locked by Phase E5 brief):
//   * English-only. No IELTS / legacy Mentor-tool / old-flashcards reads or
//     writes. The only legacy-named import is `englishLessonsTable` from
//     the canonical lesson catalog.
//   * Server-side gating preserved: progression + coverage are scoped to
//     the student's active tier→levels via `getAllowedEnglishLevels`.
//   * Modular: this service is the single source of truth for engagement;
//     `english-vocab-service.ts` and the lesson-complete route both call
//     into it, never the other way around.
// ============================================================================

import { and, eq, sql, inArray } from "drizzle-orm";
import {
  db,
  englishAchievementsTable,
  englishDailyActivityTable,
  englishWordProgressTable,
  englishXpEventsTable,
  englishLessonsTable,
  englishLessonCompletionsTable,
  wordsTable,
  getAllowedEnglishLevels,
  ENGLISH_ACHIEVEMENT_CODES,
  type EnglishAchievementCode,
} from "@workspace/db";
import { getStudentActiveEnglishTiers } from "./english-vocab-service";
import { computeEnglishStreakDays, riyadhDateString } from "./english-day";

// ---------------------------------------------------------------------------
// XP → Level curve.
//
// Smooth, satisfying, non-linear. Level n requires `100 * n^2` cumulative XP:
//
//     L1 →     0 XP       (0..99 are still L1)
//     L2 →   100 XP
//     L3 →   400 XP
//     L4 →   900 XP
//     L5 → 1,600 XP
//     L10→ 8,100 XP
//     L20→32,400 XP
//
// This produces a "feels fast early, earned later" curve characteristic of
// premium learning apps. The maximum level is intentionally uncapped — at
// `100 * n^2`, even very dedicated students will plateau naturally.
// ---------------------------------------------------------------------------
export function levelThreshold(level: number): number {
  if (level <= 1) return 0;
  return 100 * (level - 1) * (level - 1);
}

export function xpToLevel(xp: number): number {
  if (xp <= 0) return 1;
  // Inverse of `100 * (n-1)^2 ≤ xp` ⇒ n = floor(sqrt(xp/100)) + 1
  const n = Math.floor(Math.sqrt(xp / 100)) + 1;
  return Math.max(1, n);
}

export interface ProgressionSummary {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  nextLevelAt: number;
  masteryPercent: number;
  vocabCoverage: Array<{
    level: string;
    total: number;
    seen: number;
    mastered: number;
  }>;
  reviewPressure: number; // 0..1 — share of due/overdue reviews that are overdue
  overdueCount: number;
  dueCount: number;
  streakDays: number;
  allowedLevels: string[];
}

// ---------------------------------------------------------------------------
// Streak (Asia/Riyadh civil days, ending today, anchored to
// `english_xp_events`). Delegated to the shared helper so progression,
// vocab stats, planner and motivation copy never disagree.
// B-4 + B-16 (Phase E5 stabilization).
// ---------------------------------------------------------------------------
const computeStreakDays = computeEnglishStreakDays;

export async function getProgressionSummary(
  userId: string,
): Promise<ProgressionSummary> {
  const tiers = await getStudentActiveEnglishTiers(userId);
  const allowedLevels = [...getAllowedEnglishLevels(tiers)];

  // Total XP (English-only ledger).
  const xpRow = await db.execute<{ total: string | null }>(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS total
    FROM english_xp_events
    WHERE user_id = ${userId}
  `);
  const totalXp = Number(xpRow.rows[0]?.total ?? 0);
  const level = xpToLevel(totalXp);
  const thisLevelAt = levelThreshold(level);
  const nextLevelAt = levelThreshold(level + 1);
  const xpIntoLevel = totalXp - thisLevelAt;
  const xpForNextLevel = Math.max(1, nextLevelAt - thisLevelAt);

  // Vocabulary coverage by level — total words in the catalog at each
  // allowed level vs. (seen, mastered) for this student.
  let vocabCoverage: ProgressionSummary["vocabCoverage"] = [];
  if (allowedLevels.length > 0) {
    const totalRows = await db.execute<{ level: string; total: string }>(sql`
      SELECT level, COUNT(*)::text AS total
      FROM words
      WHERE level = ANY(${allowedLevels})
      GROUP BY level
    `);
    const seenRows = await db.execute<{
      level: string;
      seen: string;
      mastered: string;
    }>(sql`
      SELECT level,
             COUNT(*)::text AS seen,
             SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END)::text AS mastered
      FROM english_word_progress
      WHERE user_id = ${userId}
        AND level = ANY(${allowedLevels})
      GROUP BY level
    `);
    const seenByLevel = new Map(
      seenRows.rows.map((r) => [
        r.level,
        { seen: Number(r.seen), mastered: Number(r.mastered ?? 0) },
      ]),
    );
    vocabCoverage = totalRows.rows.map((r) => {
      const s = seenByLevel.get(r.level);
      return {
        level: r.level,
        total: Number(r.total),
        seen: s?.seen ?? 0,
        mastered: s?.mastered ?? 0,
      };
    });
  }

  const totalAllowed = vocabCoverage.reduce((acc, r) => acc + r.total, 0);
  const masteredAllowed = vocabCoverage.reduce((acc, r) => acc + r.mastered, 0);
  const masteryPercent =
    totalAllowed === 0
      ? 0
      : Math.round((masteredAllowed / totalAllowed) * 1000) / 10; // 1dp

  // Review pressure: of words that ARE due (next_review_at IS NULL OR <= now),
  // what fraction is *overdue* (next_review_at < now). NULL = not overdue.
  const dueRow = await db.execute<{
    due: string;
    overdue: string;
  }>(sql`
    SELECT
      SUM(CASE WHEN status != 'mastered' AND (next_review_at IS NULL OR next_review_at <= now()) THEN 1 ELSE 0 END)::text AS due,
      SUM(CASE WHEN status != 'mastered' AND next_review_at IS NOT NULL AND next_review_at < now() THEN 1 ELSE 0 END)::text AS overdue
    FROM english_word_progress
    WHERE user_id = ${userId}
  `);
  const dueCount = Number(dueRow.rows[0]?.due ?? 0);
  const overdueCount = Number(dueRow.rows[0]?.overdue ?? 0);
  const reviewPressure =
    dueCount === 0 ? 0 : Math.round((overdueCount / dueCount) * 100) / 100;

  const streakDays = await computeStreakDays(userId);

  return {
    totalXp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    nextLevelAt,
    masteryPercent,
    vocabCoverage,
    reviewPressure,
    overdueCount,
    dueCount,
    streakDays,
    allowedLevels,
  };
}

// ---------------------------------------------------------------------------
// Achievement catalog.
//
// Bilingual labels live on the server so frontends remain dumb consumers.
// The list order is the *display* order on the wall.
// ---------------------------------------------------------------------------
export interface AchievementDef {
  code: EnglishAchievementCode;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  group: "lessons" | "mastery" | "session" | "xp" | "streak";
}

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  {
    code: "first_lesson",
    titleEn: "First Lesson",
    titleAr: "الدرس الأول",
    descEn: "Complete your first English lesson.",
    descAr: "أكمل أول درس لك في اللغة الإنجليزية.",
    group: "lessons",
  },
  {
    code: "first_mastered",
    titleEn: "First Mastered Word",
    titleAr: "أول كلمة متقنة",
    descEn: "Master your first vocabulary word.",
    descAr: "أتقن أول كلمة من المفردات.",
    group: "mastery",
  },
  {
    code: "hundred_mastered",
    titleEn: "Centurion",
    titleAr: "المئوي",
    descEn: "Master 100 vocabulary words.",
    descAr: "أتقن 100 كلمة.",
    group: "mastery",
  },
  {
    code: "five_hundred_mastered",
    titleEn: "Vocabulary Veteran",
    titleAr: "سيد المفردات",
    descEn: "Master 500 vocabulary words.",
    descAr: "أتقن 500 كلمة.",
    group: "mastery",
  },
  {
    code: "perfect_session",
    titleEn: "Perfect Session",
    titleAr: "جلسة مثالية",
    descEn: "Complete a review session with no mistakes.",
    descAr: "أكمل جلسة مراجعة بدون أي خطأ.",
    group: "session",
  },
  {
    code: "xp_1000",
    titleEn: "1,000 XP",
    titleAr: "1٬000 نقطة خبرة",
    descEn: "Earn your first 1,000 XP.",
    descAr: "اكسب أول 1٬000 نقطة خبرة.",
    group: "xp",
  },
  {
    code: "xp_5000",
    titleEn: "5,000 XP",
    titleAr: "5٬000 نقطة خبرة",
    descEn: "Reach 5,000 lifetime XP.",
    descAr: "اكسب 5٬000 نقطة خبرة تراكمية.",
    group: "xp",
  },
  {
    code: "xp_25000",
    titleEn: "25,000 XP",
    titleAr: "25٬000 نقطة خبرة",
    descEn: "Reach 25,000 lifetime XP — fluency-tier dedication.",
    descAr: "اكسب 25٬000 نقطة خبرة — تفانٍ بمستوى الطلاقة.",
    group: "xp",
  },
  {
    code: "streak_7",
    titleEn: "7-Day Streak",
    titleAr: "سلسلة 7 أيام",
    descEn: "Study 7 days in a row.",
    descAr: "ذاكر 7 أيام متتالية.",
    group: "streak",
  },
  {
    code: "streak_30",
    titleEn: "30-Day Streak",
    titleAr: "سلسلة 30 يوم",
    descEn: "Study 30 days in a row.",
    descAr: "ذاكر 30 يوماً متتالياً.",
    group: "streak",
  },
  {
    code: "streak_100",
    titleEn: "100-Day Streak",
    titleAr: "سلسلة 100 يوم",
    descEn: "Study 100 days in a row.",
    descAr: "ذاكر 100 يوم متتالٍ.",
    group: "streak",
  },
];

export interface AchievementWithGrant extends AchievementDef {
  unlocked: boolean;
  awardedAt: string | null;
}

export async function listAchievements(
  userId: string,
): Promise<AchievementWithGrant[]> {
  const rows = await db
    .select({
      code: englishAchievementsTable.code,
      awardedAt: englishAchievementsTable.awardedAt,
    })
    .from(englishAchievementsTable)
    .where(eq(englishAchievementsTable.userId, userId));
  const grants = new Map(rows.map((r) => [r.code, r.awardedAt]));
  return ACHIEVEMENT_DEFS.map((def) => {
    const ts = grants.get(def.code) ?? null;
    return {
      ...def,
      unlocked: ts !== null,
      awardedAt: ts ? ts.toISOString() : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Daily activity rollup (UPSERT).
//
// Called from every XP-bearing event. Increments are atomic via SQL `+`,
// so concurrent attempts never lose updates.
// ---------------------------------------------------------------------------
export interface DailyActivityDelta {
  xp?: number;
  wordsStudied?: number;
  wordsCorrect?: number;
  wordsMastered?: number;
  lessonsCompleted?: number;
  sessionsCompleted?: number;
  secondsActive?: number;
}

export async function recordDailyActivity(
  userId: string,
  delta: DailyActivityDelta,
): Promise<void> {
  // B-16: bucket the day in Asia/Riyadh, not UTC. The DB column is still
  // named `date_utc` for backward compatibility — the value is now the
  // Riyadh civil date string.
  const date = riyadhDateString();
  const xp = delta.xp ?? 0;
  const ws = delta.wordsStudied ?? 0;
  const wc = delta.wordsCorrect ?? 0;
  const wm = delta.wordsMastered ?? 0;
  const lc = delta.lessonsCompleted ?? 0;
  const sc = delta.sessionsCompleted ?? 0;
  const sa = delta.secondsActive ?? 0;
  await db.execute(sql`
    INSERT INTO english_daily_activity
      (user_id, date_utc, xp_gained, words_studied, words_correct,
       words_mastered, lessons_completed, sessions_completed, seconds_active)
    VALUES
      (${userId}, ${date}, ${xp}, ${ws}, ${wc}, ${wm}, ${lc}, ${sc}, ${sa})
    ON CONFLICT (user_id, date_utc) DO UPDATE SET
      xp_gained         = english_daily_activity.xp_gained         + EXCLUDED.xp_gained,
      words_studied     = english_daily_activity.words_studied     + EXCLUDED.words_studied,
      words_correct     = english_daily_activity.words_correct     + EXCLUDED.words_correct,
      words_mastered    = english_daily_activity.words_mastered    + EXCLUDED.words_mastered,
      lessons_completed = english_daily_activity.lessons_completed + EXCLUDED.lessons_completed,
      sessions_completed= english_daily_activity.sessions_completed+ EXCLUDED.sessions_completed,
      seconds_active    = english_daily_activity.seconds_active    + EXCLUDED.seconds_active,
      updated_at        = now()
  `);
}

// ---------------------------------------------------------------------------
// Achievement evaluation.
//
// Called after any XP-bearing event. We re-derive the relevant signals
// (cheap aggregates) and INSERT any newly-eligible codes; the unique
// (user, code) index guarantees idempotency. Returns the codes newly
// granted on THIS call so the caller can surface them in the response.
// ---------------------------------------------------------------------------
export interface EvaluateContext {
  // Optional hint for `perfect_session`: if the caller knows the just-
  // finished session was perfect (>= 8 attempts, 100% correct), pass true.
  // Without this hint we cannot infer "perfect session" from ledger reads
  // alone (no session table exists yet).
  perfectSessionCompleted?: boolean;
}

export async function evaluateAchievements(
  userId: string,
  ctx: EvaluateContext = {},
): Promise<EnglishAchievementCode[]> {
  // Read existing grants once.
  const existing = await db
    .select({ code: englishAchievementsTable.code })
    .from(englishAchievementsTable)
    .where(eq(englishAchievementsTable.userId, userId));
  const have = new Set(existing.map((r) => r.code));
  const remaining = ACHIEVEMENT_DEFS.filter((d) => !have.has(d.code));
  if (remaining.length === 0) return [];

  // Single signals fetch — cheap aggregates.
  const totalsRow = await db.execute<{
    total_xp: string;
    mastered: string;
    lessons: string;
  }>(sql`
    SELECT
      (SELECT COALESCE(SUM(amount), 0)::text FROM english_xp_events WHERE user_id = ${userId}) AS total_xp,
      (SELECT COUNT(*)::text FROM english_word_progress WHERE user_id = ${userId} AND status = 'mastered') AS mastered,
      (SELECT COUNT(*)::text FROM english_lesson_completions WHERE user_id = ${userId}) AS lessons
  `);
  const totalXp = Number(totalsRow.rows[0]?.total_xp ?? 0);
  const masteredCount = Number(totalsRow.rows[0]?.mastered ?? 0);
  const lessonsCompleted = Number(totalsRow.rows[0]?.lessons ?? 0);
  const streakDays = await computeStreakDays(userId);

  const triggered: EnglishAchievementCode[] = [];
  const ctxJson: Record<string, number | boolean> = {
    totalXp,
    masteredCount,
    lessonsCompleted,
    streakDays,
  };

  for (const def of remaining) {
    let eligible = false;
    switch (def.code) {
      case "first_lesson":
        eligible = lessonsCompleted >= 1;
        break;
      case "first_mastered":
        eligible = masteredCount >= 1;
        break;
      case "hundred_mastered":
        eligible = masteredCount >= 100;
        break;
      case "five_hundred_mastered":
        eligible = masteredCount >= 500;
        break;
      case "perfect_session":
        eligible = !!ctx.perfectSessionCompleted;
        break;
      case "xp_1000":
        eligible = totalXp >= 1000;
        break;
      case "xp_5000":
        eligible = totalXp >= 5000;
        break;
      case "xp_25000":
        eligible = totalXp >= 25000;
        break;
      case "streak_7":
        eligible = streakDays >= 7;
        break;
      case "streak_30":
        eligible = streakDays >= 30;
        break;
      case "streak_100":
        eligible = streakDays >= 100;
        break;
    }
    if (eligible) triggered.push(def.code);
  }
  if (triggered.length === 0) return [];

  // Idempotent grant — unique index swallows races.
  const inserted = await db
    .insert(englishAchievementsTable)
    .values(
      triggered.map((code) => ({
        userId,
        code,
        context: ctxJson,
      })),
    )
    .onConflictDoNothing()
    .returning({ code: englishAchievementsTable.code });
  return inserted.map((r) => r.code as EnglishAchievementCode);
}

// ---------------------------------------------------------------------------
// Smart motivation message.
//
// Pure function over the planner's signals. Premium, brief, never cheesy.
// Returns both EN + AR; the client picks based on its current locale.
// ---------------------------------------------------------------------------
export interface MotivationSignals {
  streakDays: number;
  accuracy: number; // 0..1
  weakRatio: number; // 0..1
  recentFailures: number;
  masteredCount: number;
  totalWords: number;
  level: number;
}

export interface MotivationMessage {
  en: string;
  ar: string;
  tone: "celebrate" | "steady" | "rebuild" | "welcome";
}

export function getMotivationalMessage(
  s: MotivationSignals,
): MotivationMessage {
  // First-day welcome — never patronizing.
  if (s.totalWords < 5) {
    return {
      en: "A clean start. The first 50 words shape the next 5,000.",
      ar: "بداية صافية. أول 50 كلمة تشكّل الـ 5٬000 التالية.",
      tone: "welcome",
    };
  }
  // Heavy-failure stretch — acknowledge, don't sugarcoat.
  if (s.weakRatio > 0.4 || s.recentFailures > 8) {
    return {
      en: "Weak words are getting attention — that's where fluency lives.",
      ar: "الكلمات الضعيفة تأخذ اهتمامك — وهنا تُبنى الطلاقة.",
      tone: "rebuild",
    };
  }
  // Long streak — compound effort.
  if (s.streakDays >= 30) {
    return {
      en: "30+ days. Consistency is becoming fluency.",
      ar: "أكثر من 30 يومًا. الانتظام يتحوّل إلى طلاقة.",
      tone: "celebrate",
    };
  }
  if (s.streakDays >= 7) {
    return {
      en: "A week steady. Your retention is compounding.",
      ar: "أسبوع متواصل. ذاكرتك تتراكم.",
      tone: "celebrate",
    };
  }
  // Strong accuracy — quietly affirming.
  if (s.accuracy >= 0.85 && s.masteredCount >= 20) {
    return {
      en: "Accuracy is high. Time to stretch the difficulty.",
      ar: "دقتك عالية. حان وقت رفع الصعوبة.",
      tone: "celebrate",
    };
  }
  if (s.accuracy >= 0.7) {
    return {
      en: "You're improving steadily.",
      ar: "تقدّمك ثابت ومستقر.",
      tone: "steady",
    };
  }
  // Default — calm, factual.
  return {
    en: "Small reps, real gains. Keep going.",
    ar: "تكرارات صغيرة، مكاسب حقيقية. استمر.",
    tone: "steady",
  };
}

// ---------------------------------------------------------------------------
// Notification preferences (foundation only — no sender/scheduler in E5).
// ---------------------------------------------------------------------------
export async function getNotificationPreferences(userId: string) {
  // B-10: removed dead `englishAchievementsTable` LIMIT 0 read.
  // Defaults are returned when no row exists yet, so the caller never has
  // to handle "uninitialized".
  const prefRows = await db.execute<{
    review_reminders: boolean;
    streak_warnings: boolean;
    weak_word_reminders: boolean;
    lesson_reminders: boolean;
    channel: string;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
  }>(sql`
    SELECT review_reminders, streak_warnings, weak_word_reminders,
           lesson_reminders, channel, quiet_hours_start, quiet_hours_end
    FROM english_notification_preferences
    WHERE user_id = ${userId}
  `);
  const r = prefRows.rows[0];
  return {
    reviewReminders: r?.review_reminders ?? true,
    streakWarnings: r?.streak_warnings ?? true,
    weakWordReminders: r?.weak_word_reminders ?? true,
    lessonReminders: r?.lesson_reminders ?? true,
    channel: r?.channel ?? "in_app",
    quietHoursStart: r?.quiet_hours_start ?? null,
    quietHoursEnd: r?.quiet_hours_end ?? null,
  };
}

// Suppress unused-import warnings (kept for future joins/inArray uses).
void englishLessonsTable;
void englishLessonCompletionsTable;
void englishWordProgressTable;
void englishXpEventsTable;
void wordsTable;
void inArray;
void and;
void ENGLISH_ACHIEVEMENT_CODES;
