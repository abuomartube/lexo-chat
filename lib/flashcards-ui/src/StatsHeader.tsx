import { Flame, Sparkles, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "./lib/utils";
import { levelForXp, type StudyStats } from "./lib/studyStats";

interface Props {
  stats: StudyStats;
  muted: boolean;
  onToggleMute: () => void;
}

export function StatsHeader({ stats, muted, onToggleMute }: Props) {
  const { level, intoLevel, nextAt } = levelForXp(stats.xp);
  const pct = Math.min(100, Math.round((intoLevel / nextAt) * 100));

  return (
    <div className="flex items-center gap-2">
      {/* Streak */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          "bg-white/[0.04] border border-white/10",
          stats.streakDays > 0 && "text-amber-200 border-amber-400/30 shadow-[0_0_14px_-4px_rgba(245,158,11,0.6)]",
        )}
        title={`Daily streak: ${stats.streakDays}`}
      >
        <Flame className={cn("w-3.5 h-3.5", stats.streakDays > 0 ? "text-amber-300" : "text-muted-foreground")} />
        <span className="tabular-nums">{stats.streakDays}</span>
      </div>

      {/* Level + XP */}
      <div
        className="hidden sm:flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-full bg-white/[0.04] border border-white/10"
        title={`Level ${level} · ${intoLevel}/${nextAt} XP`}
      >
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-200">
          <Sparkles className="w-3.5 h-3.5 text-violet-300" />
          Lv {level}
        </span>
        <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {intoLevel}/{nextAt}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition-colors"
        aria-label={muted ? "Unmute sounds" : "Mute sounds"}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
