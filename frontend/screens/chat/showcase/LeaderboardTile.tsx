import { Trophy, Crown, ChevronUp } from "lucide-react";
import {
  Header,
  Avatar,
  Card,
  BottomNav,
  ChatScrollBg,
  Tabs,
  chatUI,
} from "@/components/chat-ui";
import { USERS } from "@/data/chat";

const RANKED = [
  { user: USERS[2], xp: 4820, weekly: 1240, delta: "+3" }, // James
  { user: USERS[6], xp: 4310, weekly: 980, delta: "+1" }, // Kenza
  { user: USERS[1], xp: 3970, weekly: 720, delta: "−1" }, // Sara
  { user: USERS[8], xp: 3140, weekly: 640, delta: "+2" }, // Yusuf
  { user: USERS[3], xp: 2880, weekly: 410, delta: "—" }, // Lina
  { user: USERS[0], xp: 2480, weekly: 890, delta: "+5" }, // Omar (you)
];

const PODIUM_TONES = [
  "from-amber-300 via-amber-400 to-orange-500",
  "from-slate-200 via-slate-300 to-slate-500",
  "from-orange-400 via-orange-500 to-amber-700",
];

export function LeaderboardTile() {
  return (
    <>
      <Header
        title="المتصدّرون"
        subtitle={
          <span className="text-[10px] text-slate-400">
            XP من المحادثات والصوتيات
          </span>
        }
      />
      <div className="relative z-10 px-4 pt-2.5 pb-2 border-b border-white/5">
        <Tabs
          dir="rtl"
          value="week"
          onChange={() => {}}
          items={[
            { value: "day", label: "اليوم" },
            { value: "week", label: "الأسبوع" },
            { value: "month", label: "الشهر" },
            { value: "all", label: "الكل" },
          ]}
        />
      </div>
      <ChatScrollBg className="px-4 pt-3 pb-3 space-y-3">
        <div className="grid grid-cols-3 gap-2 items-end">
          {[1, 0, 2].map((idx) => {
            const r = RANKED[idx];
            const place = idx + 1;
            const isFirst = place === 1;
            return (
              <div
                key={r.user.id}
                className={`flex flex-col items-center ${
                  isFirst ? "pb-1" : ""
                }`}
              >
                {isFirst && (
                  <Crown
                    size={18}
                    className="text-amber-300 -mb-1 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                  />
                )}
                <div className="relative">
                  <span
                    className={`absolute inset-0 -m-1.5 rounded-full bg-gradient-to-br ${PODIUM_TONES[idx]} opacity-60 blur-md`}
                  />
                  <div className="relative">
                    <Avatar
                      letter={r.user.letter}
                      tone={r.user.tone}
                      size={isFirst ? 56 : 44}
                      ring
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-extrabold text-slate-900 flex items-center justify-center ring-2 ring-slate-950 bg-gradient-to-br ${PODIUM_TONES[idx]}`}
                    >
                      {place}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 text-[11.5px] font-bold text-white truncate max-w-full">
                  {r.user.name}
                </div>
                <div className="text-[10px] font-bold text-slate-200">
                  {r.xp.toLocaleString()} XP
                </div>
                <div className="text-[9px] text-emerald-400 font-bold">
                  +{r.weekly} this week
                </div>
              </div>
            );
          })}
        </div>

        <Card title="الترتيب الكامل" icon={<Trophy size={13} />}>
          <ul className="space-y-1.5">
            {RANKED.slice(3).map((r, i) => {
              const place = i + 4;
              const isYou = r.user.id === "u1";
              return (
                <li
                  key={r.user.id}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl ${
                    isYou ? "bg-purple-500/15 ring-1 ring-purple-500/30" : ""
                  }`}
                >
                  <span className="w-5 text-center text-[11px] font-extrabold text-slate-300">
                    {place}
                  </span>
                  <Avatar letter={r.user.letter} tone={r.user.tone} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-white truncate">
                      {r.user.name}{" "}
                      {isYou && (
                        <span className="text-[10px] text-purple-300">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {r.user.country} · {r.user.level}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-extrabold text-white">
                      {r.xp.toLocaleString()}
                    </div>
                    <div className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                      <ChevronUp size={10} />
                      {r.delta}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </ChatScrollBg>
      <BottomNav active="chat" />
    </>
  );
}
