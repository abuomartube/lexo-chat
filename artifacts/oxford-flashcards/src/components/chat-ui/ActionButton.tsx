import type { ReactNode } from "react";

export type ActionTone = "purple" | "blue" | "green" | "orange";

const TONES: Record<ActionTone, string> = {
  purple:
    "bg-gradient-to-br from-purple-500/25 to-purple-600/15 text-purple-200 ring-purple-500/30",
  blue: "bg-gradient-to-br from-blue-500/25 to-blue-600/15 text-blue-200 ring-blue-500/30",
  green:
    "bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 text-emerald-200 ring-emerald-500/30",
  orange:
    "bg-gradient-to-br from-orange-500/25 to-rose-500/15 text-orange-200 ring-orange-500/30",
};

export function ActionButton({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: ActionTone;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl ${TONES[tone]} ring-1 backdrop-blur flex flex-col items-center justify-center py-1.5 gap-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:brightness-110 active:scale-[0.95] transition-[transform,filter] duration-150`}
    >
      <div className="opacity-90">{icon}</div>
      <span className="text-[10px] font-semibold tracking-tight">{label}</span>
    </button>
  );
}
