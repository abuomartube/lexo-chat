import {
  Mic,
  Users,
  Clock,
  Globe,
  Headphones,
  Info,
  ShieldCheck,
  Check,
  Activity,
  UserPlus,
  Mic2,
  MessageSquare,
  Sparkles,
  Heart,
} from "lucide-react";
import {
  Header,
  HeroCard,
  Card,
  Avatar,
  PrimaryButton,
  SecondaryButton,
  PhoneFrame,
  PageBackdrop,
  BottomNav,
  ChatScrollBg,
  HeroBadge,
} from "@/components/chat-ui";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  MOCK_ROOMS,
  PARTICIPANTS,
  ROOM_RULES,
  ROOM_ACTIVITY,
  userById,
} from "@/data/chat";
import { getRoom, joinRoom, type Room } from "@/data/chatApi";

export default function RoomDetails() {
  const [, params] = useRoute("/room-details/:id");
  const [, setLocation] = useLocation();
  const [room, setRoom] = useState<Room>(MOCK_ROOMS[1]);

  useEffect(() => {
    let cancelled = false;
    getRoom(params?.id).then((r) => {
      if (!cancelled && r) setRoom(r);
    });
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  async function goChat() {
    const res = await joinRoom(room.id);
    if (!res.ok) return;
    setLocation(`/chat-screen/${room.id}`);
  }

  return (
    <PageBackdrop>
      <PhoneFrame>
        <Header
          title="تفاصيل الغرفة"
          subtitle={
            <span className="text-[10px] text-slate-400">
              تعرف على الغرفة قبل الانضمام
            </span>
          }
          onBack={() => setLocation("/room-selection")}
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
            <div
              dir="ltr"
              className="flex items-center gap-3 mt-2 text-[10px] text-slate-400"
            >
              {PARTICIPANTS.slice(0, 4).map((p) => (
                <span key={p.letter}>{p.name}</span>
              ))}
              <span>...</span>
            </div>
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                النشاط الحي
                <span className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  LIVE
                </span>
              </span>
            }
            icon={<Activity size={13} />}
          >
            <ul dir="ltr" className="space-y-2">
              {(ROOM_ACTIVITY[room.id] ?? []).map((a) => {
                const u = userById(a.userId);
                if (!u) return null;
                const Icon =
                  a.kind === "joined"
                    ? UserPlus
                    : a.kind === "voice"
                      ? Mic2
                      : a.kind === "reply"
                        ? MessageSquare
                        : a.kind === "topic"
                          ? Sparkles
                          : Heart;
                const tint =
                  a.kind === "joined"
                    ? "text-emerald-400 bg-emerald-500/15 ring-emerald-500/25"
                    : a.kind === "voice"
                      ? "text-purple-300 bg-purple-500/15 ring-purple-500/25"
                      : a.kind === "reply"
                        ? "text-sky-300 bg-sky-500/15 ring-sky-500/25"
                        : a.kind === "topic"
                          ? "text-amber-300 bg-amber-500/15 ring-amber-500/25"
                          : "text-rose-300 bg-rose-500/15 ring-rose-500/25";
                return (
                  <li key={a.id} className="flex items-center gap-2">
                    <Avatar letter={u.letter} tone={u.tone} size={22} ring />
                    <div className="flex-1 min-w-0 text-[11px] text-slate-300 leading-tight">
                      <span className="font-semibold text-white">{u.name}</span>{" "}
                      <span className="text-slate-400">{a.text}</span>
                    </div>
                    <span
                      className={`shrink-0 w-5 h-5 rounded-full ring-1 flex items-center justify-center ${tint}`}
                    >
                      <Icon size={10} />
                    </span>
                    <span className="shrink-0 text-[9.5px] text-slate-500 font-medium w-7 text-right">
                      {a.ago}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="قواعد الغرفة" icon={<ShieldCheck size={13} />}>
            <ul className="space-y-1.5">
              {ROOM_RULES.map((r, i) => (
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
              onClick={goChat}
            >
              استمع أولاً
            </SecondaryButton>
            <PrimaryButton
              size="lg"
              icon={<Mic size={14} />}
              className="flex-1"
              onClick={goChat}
            >
              انضمام للغرفة
            </PrimaryButton>
          </div>
        </div>

        <BottomNav active="chat" />
      </PhoneFrame>
    </PageBackdrop>
  );
}
