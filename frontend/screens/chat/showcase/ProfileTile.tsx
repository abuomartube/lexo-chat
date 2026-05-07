import {
  Trophy,
  Flame,
  Mic,
  MessageCircle,
  Settings,
  Bell,
} from "lucide-react";
import {
  Header,
  Avatar,
  Card,
  BottomNav,
  ChatScrollBg,
  chatUI,
} from "@/components/chat-ui";

const STATS = [
  {
    label: "XP Earned",
    value: "2,480",
    icon: <Trophy size={13} className="text-amber-300" />,
  },
  {
    label: "Streak",
    value: "12 days",
    icon: <Flame size={13} className="text-orange-400" />,
  },
  {
    label: "Voice Notes",
    value: "147",
    icon: <Mic size={13} className="text-emerald-300" />,
  },
  {
    label: "Messages",
    value: "612",
    icon: <MessageCircle size={13} className="text-blue-300" />,
  },
];

const BADGES = [
  { label: "🎯 First Room", tone: "from-blue-500 to-indigo-600" },
  { label: "🔥 7-day Streak", tone: "from-orange-500 to-rose-600" },
  { label: "🎙️ Voice Hero", tone: "from-emerald-500 to-teal-600" },
  { label: "🏆 Top 10", tone: "from-amber-400 to-orange-600" },
];

export function ProfileTile() {
  return (
    <>
      <Header
        title="الملف الشخصي"
        subtitle={
          <span className="text-[10px] text-slate-400">
            إدارة بياناتك وتقدّمك
          </span>
        }
        controls={
          <>
            <button className="relative w-9 h-9 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-slate-300">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 ring-2 ring-slate-950 text-[8.5px] font-extrabold text-white flex items-center justify-center">
                8
              </span>
            </button>
            <button className="w-9 h-9 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-slate-300">
              <Settings size={14} />
            </button>
          </>
        }
      />
      <ChatScrollBg className="px-4 pt-3 pb-3 space-y-3">
        <div
          className="relative overflow-hidden rounded-3xl ring-1 ring-white/15 p-4 flex items-center gap-3"
          style={{
            background:
              "linear-gradient(135deg, #2563eb 0%, #6d28d9 60%, #be185d 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            <Avatar letter="O" tone="blue" size={64} ring />
          </div>
          <div className="relative flex-1 min-w-0">
            <div className="text-[15px] font-extrabold text-white">Omar A.</div>
            <div className="text-[11px] text-white/85">
              Intermediate · 🇸🇦 Saudi Arabia · joined Apr 2026
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur ring-1 ring-white/25 text-white text-[10px] font-bold">
                <Trophy size={10} /> Rank #14
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/30 backdrop-blur ring-1 ring-orange-300/40 text-white text-[10px] font-bold">
                <Flame size={10} /> 12d
              </span>
            </div>
          </div>
        </div>

        <div className="px-1">
          <div className="flex items-center justify-between text-[10.5px] mb-1">
            <span className="text-slate-400 font-semibold">Level 7</span>
            <span className="text-slate-300 font-bold">2,480 / 3,200 XP</span>
            <span className="text-slate-400 font-semibold">Level 8</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden ring-1 ring-white/5">
            <div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                width: "77.5%",
                background:
                  "linear-gradient(90deg, #a855f7 0%, #ec4899 60%, #f97316 100%)",
                boxShadow: "0 0 12px rgba(168,85,247,0.6)",
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {STATS.map((s) => (
            <div
              key={s.label}
              className={`${chatUI.radius.card} ${chatUI.surface.card} px-3 py-2.5`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                {s.icon}
                {s.label}
              </div>
              <div className="text-[16px] font-extrabold text-white mt-0.5">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <Card title="الشارات">
          <div className="flex flex-wrap gap-1.5">
            {BADGES.map((b) => (
              <span
                key={b.label}
                className={`text-[10.5px] font-bold text-white px-2.5 py-1 rounded-full ring-1 ring-white/15 bg-gradient-to-br ${b.tone} shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </Card>
      </ChatScrollBg>
      <BottomNav active="profile" />
    </>
  );
}
