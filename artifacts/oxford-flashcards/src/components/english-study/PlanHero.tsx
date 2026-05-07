import { Flame, Gauge, Sparkles, Timer, Trophy } from "lucide-react";
import type {
  EnglishPlanDifficulty,
  EnglishPerformanceSignals,
  EnglishProgressionSummary,
  EnglishVocabStatsResponse,
} from "@workspace/api-client-react";

// Phase E5 hero — adds the XP Level System (level number + per-level
// progress bar) and a review-pressure micro stat. The Total-XP card is
// gone (it kept growing forever and stopped being motivating); the level
// + progress fills that role in a more "Linear-Notion premium" way.

type Lang = "en" | "ar";

const DIFFICULTY_TONE: Record<EnglishPlanDifficulty, string> = {
  easy: "from-emerald-500 to-teal-500",
  medium: "from-amber-500 to-orange-500",
  hard: "from-rose-500 to-fuchsia-600",
};

const DIFFICULTY_LABEL: Record<EnglishPlanDifficulty, { en: string; ar: string }> = {
  easy: { en: "Easy", ar: "سهل" },
  medium: { en: "Medium", ar: "متوسط" },
  hard: { en: "Hard", ar: "متقدم" },
};

interface PlanHeroProps {
  firstName: string | null;
  lang: Lang;
  difficulty: EnglishPlanDifficulty;
  signals: EnglishPerformanceSignals;
  stats: EnglishVocabStatsResponse | null;
  progression: EnglishProgressionSummary | null;
  estimatedMinutes: number;
  notes: string[];
  allowedLevels: string[];
}

export function PlanHero({
  firstName,
  lang,
  difficulty,
  signals,
  stats,
  progression,
  estimatedMinutes,
  notes,
  allowedLevels,
}: PlanHeroProps) {
  const isAr = lang === "ar";

  // Surface the most recent adaptive note (planner already worded it tightly).
  const adaptiveNote = notes.find(
    (n) =>
      n.startsWith("Higher difficulty") ||
      n.startsWith("Difficulty eased") ||
      n.startsWith("Heavy failure"),
  );

  // Level + per-level progress bar values. We tolerate `progression` being
  // null while it loads — the bar falls back to a calm 0% state.
  const level = progression?.level ?? 1;
  const xpInto = progression?.xpIntoLevel ?? 0;
  const xpForNext = Math.max(1, progression?.xpForNextLevel ?? 100);
  const levelPct = Math.min(100, Math.round((xpInto / xpForNext) * 100));

  // Review pressure ∈ [0,1] from progression. We render it as a 1-decimal
  // count + a soft tone so the student knows when to clear backlog.
  const reviewPressure = progression?.reviewPressure ?? 0;
  const overdue = progression?.overdueCount ?? 0;
  const due = progression?.dueCount ?? 0;
  const pressureLabel = (() => {
    if (reviewPressure >= 0.66) return isAr ? "مرتفع" : "High";
    if (reviewPressure >= 0.33) return isAr ? "متوسط" : "Medium";
    return isAr ? "منخفض" : "Low";
  })();

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-sky-600 text-white p-6 sm:p-8 shadow-xl"
      data-testid="english-study-hero"
    >
      {/* Soft glow accent */}
      <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100/90">
            {isAr ? "خطّة اليوم" : "Today's plan"}
          </p>
          <h1
            className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight"
            data-testid="text-study-greeting"
          >
            {isAr ? "هيا نذاكر" : "Let's study"}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {allowedLevels.length > 0 && (
            <p className="mt-1.5 text-[12px] text-indigo-100/85">
              {isAr ? "مستوياتك: " : "Your levels: "}
              <span className="font-semibold tracking-wide">
                {allowedLevels.join(" · ")}
              </span>
            </p>
          )}
        </div>

        <div
          className={`rounded-2xl bg-gradient-to-br ${DIFFICULTY_TONE[difficulty]} ring-1 ring-white/30 px-4 py-2.5 shadow-md`}
          data-testid="badge-difficulty"
        >
          <p className="text-[10px] uppercase tracking-wider text-white/80">
            {isAr ? "الصعوبة" : "Difficulty"}
          </p>
          <p className="text-base font-extrabold leading-tight">
            {DIFFICULTY_LABEL[difficulty][lang]}
          </p>
        </div>
      </div>

      {/* Level + progress bar — premium primary signal */}
      <div
        className="relative mt-6 rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur px-4 py-3.5"
        data-testid="hero-level-block"
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wider text-indigo-100/85">
              {isAr ? "المستوى" : "Level"}
            </p>
            <p
              className="mt-0.5 text-2xl font-extrabold tabular-nums"
              data-testid="text-level"
            >
              {isAr ? `المستوى ${level}` : `Level ${level}`}
            </p>
          </div>
          <p className="shrink-0 text-[11.5px] text-indigo-100/90 tabular-nums">
            <span className="font-bold text-white">
              {xpInto.toLocaleString(isAr ? "ar" : "en")}
            </span>
            <span className="opacity-80">
              {" / "}
              {xpForNext.toLocaleString(isAr ? "ar" : "en")} XP
            </span>
          </p>
        </div>
        <div className="mt-2.5 h-2 w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-white transition-[width] duration-500"
            style={{ width: `${levelPct}%` }}
            data-testid="bar-level-progress"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HeroStat
          icon={
            <Flame
              size={18}
              className={signals.streakDays >= 3 ? "animate-pulse" : ""}
            />
          }
          label={isAr ? "السلسلة" : "Streak"}
          value={`${signals.streakDays} ${
            isAr
              ? signals.streakDays === 1
                ? "يوم"
                : "أيام"
              : signals.streakDays === 1
                ? "day"
                : "days"
          }`}
          testId="stat-streak"
        />
        <HeroStat
          icon={<Trophy size={18} />}
          label={isAr ? "كلمات مُتقَنة" : "Mastered"}
          value={`${signals.masteredCount}`}
          testId="stat-mastered"
        />
        <HeroStat
          icon={<Gauge size={18} />}
          label={isAr ? "ضغط المراجعة" : "Review load"}
          value={pressureLabel}
          sub={
            overdue + due > 0
              ? isAr
                ? `${overdue + due} مستحقة`
                : `${overdue + due} due`
              : null
          }
          testId="stat-review-pressure"
        />
        <HeroStat
          icon={<Timer size={18} />}
          label={isAr ? "الوقت المقترح" : "Suggested"}
          value={`${estimatedMinutes} ${isAr ? "دقيقة" : "min"}`}
          testId="stat-time"
        />
      </div>

      {adaptiveNote && (
        <div
          className="relative mt-5 inline-flex items-start gap-2 rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white/95"
          data-testid="text-adaptive-note"
        >
          <Sparkles size={14} className="mt-0.5 shrink-0 text-amber-200" />
          <span>{adaptiveNote}</span>
        </div>
      )}

      {/* Stats prop is intentionally accepted but not displayed in the hero
          itself — it's used by the XP-by-level strip lower on the page. */}
      {stats && null}
    </section>
  );
}

function HeroStat({
  icon,
  label,
  value,
  sub,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | null;
  testId: string;
}) {
  return (
    <div
      className="rounded-2xl bg-white/12 ring-1 ring-white/15 backdrop-blur px-3.5 py-3"
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-indigo-100/85">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg sm:text-xl font-extrabold leading-tight tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10.5px] text-indigo-100/80 tabular-nums">{sub}</p>
      )}
    </div>
  );
}
