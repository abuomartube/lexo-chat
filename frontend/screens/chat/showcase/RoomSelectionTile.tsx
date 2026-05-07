import {
  Mic,
  Headphones,
  GraduationCap,
  MessageCircle,
  Bell,
} from "lucide-react";
import {
  Header,
  SearchBar,
  Tabs,
  RoomCard,
  BottomNav,
  ChatScrollBg,
  Avatar,
} from "@/components/chat-ui";
import { MOCK_ROOMS, ROOM_META, USERS, type RoomIconKey } from "@/data/chat";

function roomIcon(key: RoomIconKey) {
  const cls = "text-white";
  switch (key) {
    case "mic":
      return <Mic size={18} className={cls} />;
    case "headphones":
      return <Headphones size={18} className={cls} />;
    case "graduation":
      return <GraduationCap size={18} className={cls} />;
    case "message":
      return <MessageCircle size={18} className={cls} />;
    default:
      return <Mic size={18} className={cls} />;
  }
}

export function RoomSelectionTile() {
  const visible = MOCK_ROOMS.slice(0, 4);
  return (
    <>
      <Header
        title="اختيار الغرفة"
        subtitle={
          <span className="text-[10px] text-slate-400">
            5 غرف نشطة · 101 متصل الآن
          </span>
        }
        controls={
          <button className="relative w-9 h-9 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-slate-300">
            <Bell size={14} />
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 ring-2 ring-slate-950 text-[8.5px] font-extrabold text-white flex items-center justify-center">
              5
            </span>
          </button>
        }
      />
      <div className="relative z-10 px-4 pt-2.5 pb-2 space-y-2.5 border-b border-white/5">
        <SearchBar
          placeholder="ابحث عن غرفة..."
          value=""
          onChange={() => {}}
          dir="rtl"
        />
        <Tabs
          dir="rtl"
          value="all"
          onChange={() => {}}
          items={[
            { value: "all", label: "كل الغرف" },
            { value: "speaking", label: "المحادثة" },
            { value: "voice", label: "الصوت فقط" },
            { value: "ielts", label: "IELTS" },
          ]}
        />
      </div>
      <ChatScrollBg className="px-4 pt-2.5 pb-2 space-y-2">
        {visible.map((r) => {
          const meta = ROOM_META[r.id];
          const peek = meta?.peek.map((idx) => USERS[idx]) ?? [];
          return (
            <RoomCard
              key={r.id}
              icon={roomIcon(r.iconKey)}
              tone={r.tone}
              title={r.title}
              desc={r.desc}
              online={r.online}
              unread={meta?.unread}
              lastActivity={meta?.lastActivity}
              peekAvatars={peek.map((u) => (
                <Avatar
                  key={u.id}
                  letter={u.letter}
                  tone={u.tone}
                  size={16}
                  ring
                />
              ))}
              joinLabel="انضمام"
              onClick={() => {}}
              onJoin={() => {}}
            />
          );
        })}
      </ChatScrollBg>
      <BottomNav active="chat" />
    </>
  );
}
