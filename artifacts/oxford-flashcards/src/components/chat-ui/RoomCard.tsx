import type { ReactNode } from "react";
import { chatUI, type AvatarTone } from "./tokens";

const TONE_GRAD: Record<AvatarTone, string> = {
  blue: "from-sky-400 via-blue-500 to-indigo-600",
  purple: "from-fuchsia-400 via-purple-500 to-indigo-600",
  emerald: "from-emerald-300 via-emerald-500 to-teal-600",
  pink: "from-pink-400 via-rose-500 to-rose-700",
  rose: "from-rose-400 via-red-500 to-orange-600",
  indigo: "from-sky-400 via-indigo-500 to-indigo-700",
  amber: "from-amber-300 via-orange-500 to-rose-500",
};

const TONE_GLOW: Record<AvatarTone, string> = {
  blue: "rgba(59,130,246,0.65)",
  purple: "rgba(168,85,247,0.65)",
  emerald: "rgba(16,185,129,0.6)",
  pink: "rgba(244,63,94,0.6)",
  rose: "rgba(249,115,22,0.6)",
  indigo: "rgba(99,102,241,0.6)",
  amber: "rgba(251,146,60,0.6)",
};

export function RoomCard({
  icon,
  tone,
  title,
  desc,
  online,
  joinLabel = "Join",
  onJoin,
  onClick,
  unread,
  lastActivity,
  peekAvatars,
}: {
  icon: ReactNode;
  tone: AvatarTone;
  title: string;
  desc: string;
  online: number;
  joinLabel?: string;
  onJoin?: () => void;
  onClick?: () => void;
  unread?: number;
  lastActivity?: string;
  peekAvatars?: ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={`${chatUI.radius.card} ${chatUI.surface.card} p-3 flex items-center gap-3 hover:border-white/[0.12] transition-[transform,border-color,background] duration-150 ${onClick ? "cursor-pointer active:scale-[0.985]" : ""}`}
    >
      <div className="relative shrink-0">
        <div
          className="absolute inset-0 -m-2 rounded-2xl blur-xl opacity-80"
          style={{ background: TONE_GLOW[tone] }}
        />
        <div
          className={`relative w-11 h-11 ${chatUI.radius.icon} bg-gradient-to-br ${TONE_GRAD[tone]} flex items-center justify-center ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_6px_16px_-4px_rgba(0,0,0,0.5)]`}
        >
          {icon}
        </div>
        {unread !== undefined && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 ring-2 ring-slate-950 text-[9px] font-extrabold text-white flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.6)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-[12.5px] font-bold text-white truncate leading-tight tracking-tight flex-1 min-w-0">
            {title}
          </div>
          {lastActivity && (
            <span className="text-[9.5px] text-slate-500 font-medium shrink-0">
              {lastActivity}
            </span>
          )}
        </div>
        <div className="text-[10.5px] text-slate-400 truncate mt-0.5 leading-tight">
          {desc}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            {online} online
          </span>
          {peekAvatars && (
            <div dir="ltr" className="flex -space-x-1.5">
              {peekAvatars}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onJoin?.();
        }}
        className="relative shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-bold text-white ring-1 ring-white/20 overflow-hidden hover:brightness-110 active:scale-[0.95] transition-[transform,filter] duration-150"
        style={{
          background: chatUI.gradient.purpleSimple,
          boxShadow: chatUI.shadow.purpleBtn,
        }}
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
          }}
        />
        <span className="relative">{joinLabel}</span>
      </button>
    </div>
  );
}
