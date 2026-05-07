import type { ReactNode } from "react";
import { chatUI } from "./tokens";

export type IconButtonTone = "neutral" | "accent" | "warning" | "danger";

const TONE: Record<
  IconButtonTone,
  { btn: string; label: string; style?: React.CSSProperties }
> = {
  neutral: {
    btn: "ring-white/15 text-slate-100",
    label: "text-slate-300",
    style: {
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.2), 0 6px 18px -6px rgba(0,0,0,0.5)",
    },
  },
  accent: {
    btn: "ring-white/25 text-white",
    label: "text-purple-200",
    style: {
      background: chatUI.gradient.purpleSimple,
      boxShadow: chatUI.shadow.purpleBtn,
    },
  },
  warning: {
    btn: "ring-amber-400/40 text-amber-100",
    label: "text-amber-200",
    style: {
      background:
        "linear-gradient(180deg, rgba(251,191,36,0.30) 0%, rgba(245,158,11,0.18) 100%)",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 22px -8px rgba(245,158,11,0.55)",
    },
  },
  danger: {
    btn: "ring-rose-400/45 text-rose-100",
    label: "text-rose-200",
    style: {
      background:
        "linear-gradient(180deg, rgba(244,63,94,0.32) 0%, rgba(225,29,72,0.18) 100%)",
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 22px -8px rgba(244,63,94,0.55)",
    },
  },
};

export function IconButton({
  icon,
  label,
  tone = "neutral",
  size = 52,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label?: string;
  tone?: IconButtonTone;
  size?: number;
  badge?: ReactNode;
  onClick?: () => void;
}) {
  const t = TONE[tone];
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div className="relative">
        {badge && (
          <span className="absolute -top-1 -right-1 z-10 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-900 text-[9px] font-extrabold flex items-center justify-center ring-2 ring-slate-950 shadow-[0_4px_10px_-2px_rgba(251,191,36,0.6)]">
            {badge}
          </span>
        )}
        <div
          className={`relative rounded-full ring-1 backdrop-blur-xl flex items-center justify-center group-hover:brightness-110 group-active:brightness-95 group-active:scale-[0.92] transition-[transform,filter] duration-150 overflow-hidden ${t.btn}`}
          style={{ width: size, height: size, ...t.style }}
        >
          {/* glossy top sheen */}
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)",
            }}
          />
          <span className="relative">{icon}</span>
        </div>
      </div>
      {label && (
        <span
          className={`text-[10.5px] font-semibold tracking-tight ${t.label}`}
        >
          {label}
        </span>
      )}
    </button>
  );
}
