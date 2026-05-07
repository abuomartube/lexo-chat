import { Award, Lock } from "lucide-react";
import type { EnglishAchievement } from "@workspace/api-client-react";

// Phase E5 — minimal premium achievements strip.
// Renders ALL defined achievements (small set — 11) as tiny chips, with
// unlocked ones in full color and locked ones muted. Clicking does nothing
// (the strip is informational); a future phase can wire a details popover.

type Lang = "en" | "ar";

interface Props {
  achievements: EnglishAchievement[];
  lang: Lang;
}

const GROUP_TONE: Record<EnglishAchievement["group"], string> = {
  lessons: "from-sky-500 to-indigo-500",
  mastery: "from-amber-500 to-orange-500",
  session: "from-emerald-500 to-teal-500",
  xp: "from-violet-500 to-fuchsia-500",
  streak: "from-rose-500 to-pink-500",
};

export function AchievementsStrip({ achievements, lang }: Props) {
  const isAr = lang === "ar";
  if (achievements.length === 0) return null;

  // Sort: unlocked first (most-recent first), then locked in definition order.
  const sorted = [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked && b.unlocked) {
      const ta = a.awardedAt ? Date.parse(a.awardedAt) : 0;
      const tb = b.awardedAt ? Date.parse(b.awardedAt) : 0;
      return tb - ta;
    }
    return 0;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <section
      className="rounded-3xl bg-card ring-1 ring-border/60 p-5 sm:p-6 shadow-sm"
      data-testid="achievements-strip"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award size={16} className="text-amber-500" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground/80">
            {isAr ? "الإنجازات" : "Achievements"}
          </h2>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {isAr
            ? `${unlockedCount} / ${achievements.length} مفتوحة`
            : `${unlockedCount} / ${achievements.length} unlocked`}
        </span>
      </header>

      <div className="flex flex-wrap gap-2">
        {sorted.map((a) => (
          <AchievementChip key={a.code} achievement={a} lang={lang} />
        ))}
      </div>
    </section>
  );
}

function AchievementChip({
  achievement,
  lang,
}: {
  achievement: EnglishAchievement;
  lang: Lang;
}) {
  const isAr = lang === "ar";
  const title = isAr ? achievement.titleAr : achievement.titleEn;
  const desc = isAr ? achievement.descAr : achievement.descEn;
  const tone = GROUP_TONE[achievement.group];

  if (achievement.unlocked) {
    return (
      <div
        className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-br ${tone} text-white pl-2 pr-3 py-1.5 ring-1 ring-white/20 shadow-sm`}
        title={desc}
        data-testid={`achievement-${achievement.code}`}
        data-unlocked="true"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25">
          <Award size={12} />
        </span>
        <span className="text-[12px] font-bold tracking-tight">{title}</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-muted/50 text-muted-foreground pl-2 pr-3 py-1.5 ring-1 ring-border/70"
      title={desc}
      data-testid={`achievement-${achievement.code}`}
      data-unlocked="false"
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground/5">
        <Lock size={11} />
      </span>
      <span className="text-[12px] font-semibold tracking-tight">{title}</span>
    </div>
  );
}
