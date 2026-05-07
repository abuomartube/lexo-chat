import { useMemo } from "react";
import type { CEFRLevel } from "@/data/oxford-words";
import { levelColors } from "@/data/oxford-words";

interface FilterBarProps {
  selectedLevel: CEFRLevel | "all";
  onLevelChange: (level: CEFRLevel | "all") => void;
  onShuffle: () => void;
  total: number;
  allowedLevels?: CEFRLevel[];
}

const ALL_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2"];

export function FilterBar({
  selectedLevel,
  onLevelChange,
  onShuffle,
  total,
  allowedLevels,
}: FilterBarProps) {
  const visibleLevels = useMemo<(CEFRLevel | "all")[]>(() => {
    const allowed = allowedLevels
      ? ALL_LEVELS.filter((l) => allowedLevels.includes(l))
      : ALL_LEVELS;
    return ["all", ...allowed];
  }, [allowedLevels]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-2xl mx-auto px-1">
      <div className="flex items-center gap-2 flex-wrap">
        {visibleLevels.map((level) => {
          const isActive = selectedLevel === level;
          const color = level !== "all" ? levelColors[level] : null;

          return (
            <button
              key={level}
              onClick={() => onLevelChange(level)}
              className={`
                px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200
                hover:scale-105 active:scale-95
                ${
                  isActive
                    ? level === "all"
                      ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md"
                      : `bg-gradient-to-r ${color!.bg} text-white shadow-md`
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
            >
              {level === "all" ? "All" : level}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums">
          {total} words
        </span>
        <button
          onClick={onShuffle}
          className="px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Shuffle
        </button>
      </div>
    </div>
  );
}
