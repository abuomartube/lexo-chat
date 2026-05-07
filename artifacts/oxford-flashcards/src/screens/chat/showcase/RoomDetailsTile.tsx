import {
  Mic,
  Users,
  Clock,
  Globe,
  Headphones,
  Info,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  Header,
  HeroCard,
  Card,
  Avatar,
  PrimaryButton,
  SecondaryButton,
  BottomNav,
  ChatScrollBg,
  HeroBadge,
} from "@/components/chat-ui";
import { MOCK_ROOMS, PARTICIPANTS, ROOM_RULES, USERS } from "@/data/chat";

const ACTIVITY = [
  { user: USERS[6], action: "shared a voice note", time: "2m" },
  { user: USERS[2], action: "joined the room", time: "5m" },
  { user: USERS[1], action: "replied to topic", time: "8m" },
];

export function RoomDetailsTile() {
  const room = MOCK_ROOMS[1];
  return (
    <>
      <Header
        title="تفاصيل الغرفة"
        subtitle={
          <span className="text-[10px] text-slate-400">
            تعرف على الغرفة قبل الانضمام
          </span>
        }
        onBack={() => {}}
      />
      <ChatScrollBg className="px-4 pt-3 pb-3 space-y-3">
        <HeroCard
          icon={<Mic size={26} className="text-white" />}
          title={room.title}
          subtitle={room.desc}
          badges={
            <>
              <HeroBadge icon={<Users size={11} />}>
                {room.online} online
              </HeroBadge>
              <HeroBadge icon={<Globe size={11} />}>English Only</HeroBadge>
              <HeroBadge icon={<Clock size={11} />}>متاحة الآن</HeroBadge>
            </>
          }
        />
        <Card title="عن الغرفة" icon={<Info size={13} />}>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            {room.about}
          </p>
        </Card>
        <Card
          title={
            <span className="flex items-center gap-2">
              المشاركون
              <span className="text-[10px] font-semibold text-emerald-400">
                {room.online} online
              </span>
            </span>
          }
          icon={<Users size={13} />}
        >
          <div dir="ltr" className="flex items-center -space-x-2">
            {PARTICIPANTS.slice(0, 6).map((p) => (
              <Avatar
                key={p.letter}
                letter={p.letter}
                tone={p.tone}
                size={32}
                ring
              />
            ))}
            <div className="w-8 h-8 rounded-full bg-slate-700 ring-2 ring-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-200">
              +{Math.max(0, room.online - 6)}
            </div>
          </div>
        </Card>
        <Card
          title={
            <span className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              النشاط الحي
            </span>
          }
          icon={<Clock size={13} />}
        >
          <ul className="space-y-1.5" dir="rtl">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px]">
                <Avatar letter={a.user.letter} tone={a.user.tone} size={20} />
                <span className="text-slate-300 flex-1 truncate">
                  <span className="font-bold text-white">{a.user.name}</span>{" "}
                  {a.action}
                </span>
                <span className="text-slate-500 text-[9.5px] font-medium">
                  {a.time}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="قواعد الغرفة" icon={<ShieldCheck size={13} />}>
          <ul className="space-y-1.5">
            {ROOM_RULES.slice(0, 3).map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11.5px] text-slate-300 leading-snug"
              >
                <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0">
                  <Check
                    size={9}
                    strokeWidth={3}
                    className="text-emerald-400"
                  />
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
      </ChatScrollBg>
      <div className="relative z-10 px-4 pt-2.5 pb-2 border-t border-white/5 bg-slate-950/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <SecondaryButton
            size="lg"
            icon={<Headphones size={14} />}
            className="flex-1"
          >
            استمع أولاً
          </SecondaryButton>
          <PrimaryButton size="lg" icon={<Mic size={14} />} className="flex-1">
            انضمام للغرفة
          </PrimaryButton>
        </div>
      </div>
      <BottomNav active="chat" />
    </>
  );
}
