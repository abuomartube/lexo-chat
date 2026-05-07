import { GraduationCap as Course, MessageSquare, User } from "lucide-react";
import type { ReactNode } from "react";
import { chatUI } from "../tokens";
import { HomeIndicator } from "./HomeIndicator";

export type BottomNavTab = "courses" | "chat" | "profile";

function NavTab({
  icon,
  label,
  active = false,
  badge,
  dot,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  dot?: boolean;
}) {
  return (
    <button className="flex-1 flex flex-col items-center gap-0.5 py-1.5">
      <div className={`relative ${active ? "" : "opacity-60"}`}>
        {active && (
          <div className="absolute inset-0 -m-1.5 rounded-full bg-purple-500/40 blur-md" />
        )}
        <div
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${
            active
              ? "ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              : ""
          }`}
          style={
            active ? { background: chatUI.gradient.purpleSimple } : undefined
          }
        >
          {icon}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 ring-2 ring-slate-950 text-[8.5px] font-extrabold text-white flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          {dot && badge === undefined && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950" />
          )}
        </div>
      </div>
      <span
        className={`text-[10px] font-semibold ${
          active ? "text-white" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export function BottomNav({ active = "chat" }: { active?: BottomNavTab }) {
  const courseColor = active === "courses" ? "text-white" : "text-slate-300";
  const chatColor = active === "chat" ? "text-white" : "text-slate-300";
  const profileColor = active === "profile" ? "text-white" : "text-slate-300";
  return (
    <div className="relative z-10 px-3 pt-1 pb-1 border-t border-white/5 bg-slate-950/40 backdrop-blur">
      <div dir="ltr" className="flex items-stretch">
        <NavTab
          icon={<Course size={16} className={courseColor} />}
          label="الدورات"
          active={active === "courses"}
          dot
        />
        <NavTab
          icon={<MessageSquare size={16} className={chatColor} />}
          label="الشات"
          active={active === "chat"}
          badge={62}
        />
        <NavTab
          icon={<User size={16} className={profileColor} />}
          label="الملف الشخصي"
          active={active === "profile"}
          badge={8}
        />
      </div>
      <HomeIndicator />
    </div>
  );
}
