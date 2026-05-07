import type { CEFRLevel } from "@/data/oxford-words";
import { levelColors } from "@/data/oxford-words";

interface LevelBadgeProps {
  level: CEFRLevel;
  size?: "sm" | "md";
}

export function LevelBadge({ level, size = "md" }: LevelBadgeProps) {
  const colors = levelColors[level];

  return (
    <span
      className={`
        inline-flex items-center font-bold rounded-full tracking-wider uppercase
        ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}
        ${colors.badge}
      `}
    >
      {level}
    </span>
  );
}
