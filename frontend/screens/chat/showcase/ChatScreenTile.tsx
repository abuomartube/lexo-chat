import {
  Mic,
  Hand,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import {
  Avatar,
  Header,
  IncomingBubble,
  OutgoingBubble,
  SystemBubble,
  VoiceMessage,
  ActionButton,
  InputBar,
  ChatScrollBg,
  HomeIndicator,
  Waves,
} from "@/components/chat-ui";
import { seedMessages } from "@/data/chat";

export function ChatScreenTile() {
  const room = { title: "Speaking Room - Intermediate", online: 24 };
  const messages = seedMessages("2").slice(0, 5);

  return (
    <>
      <Header
        title={room.title}
        onBack={() => {}}
        subtitle={
          <>
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              {room.online} online
            </span>
            <div className="flex -space-x-1.5">
              <Avatar letter="O" tone="blue" size={18} ring />
              <Avatar letter="S" tone="pink" size={18} ring />
              <Avatar letter="J" tone="emerald" size={18} ring />
            </div>
          </>
        }
        controls={
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              EN English Only
            </span>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-300 text-[11px] font-bold">
              <Hand size={12} />
              رفع اليد
            </button>
          </>
        }
      />

      <ChatScrollBg className="px-4 pt-3 pb-2 space-y-2.5">
        {messages.map((m) => {
          if (m.kind === "incoming" && m.name && m.letter && m.tone) {
            return (
              <IncomingBubble
                key={m.id}
                name={m.name}
                tone={m.tone}
                letter={m.letter}
                time={m.time}
                reactions={m.reactions}
              >
                {m.text}
              </IncomingBubble>
            );
          }
          if (m.kind === "voice-out") {
            return (
              <OutgoingBubble key={m.id} time={m.time}>
                <VoiceMessage
                  duration={m.duration ?? "0:18"}
                  played={0.5}
                  bars={22}
                />
              </OutgoingBubble>
            );
          }
          if (m.kind === "system") {
            return <SystemBubble key={m.id}>{m.text}</SystemBubble>;
          }
          return null;
        })}
        {/* typing indicator */}
        <div className="flex items-end gap-2">
          <Avatar letter="K" tone="indigo" size={26} />
          <div className="rounded-2xl rounded-bl-md bg-white/[0.06] ring-1 ring-white/10 px-3 py-2.5 flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-slate-300/80 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-slate-300/80 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-slate-300/80 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-[9.5px] text-slate-500 font-medium">
            Kenza is typing…
          </span>
        </div>
      </ChatScrollBg>

      <div className="relative z-10 px-4 pt-2 pb-1 border-t border-white/5 bg-slate-950/40 backdrop-blur">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ActionButton
            icon={<Sparkles size={14} />}
            label="Topic"
            tone="purple"
          />
          <ActionButton
            icon={<Lightbulb size={14} />}
            label="Ice Breaker"
            tone="blue"
          />
          <ActionButton
            icon={<RefreshCw size={14} />}
            label="Rotate"
            tone="green"
          />
          <ActionButton
            icon={<ImageIcon size={14} />}
            label="Image Talk"
            tone="orange"
          />
        </div>
        <InputBar value="" onChange={() => {}} onSend={() => {}} />
        <div className="flex items-center justify-center gap-2 mt-1.5 mb-0.5">
          <Waves />
          <div className="relative">
            <div className="absolute inset-0 -m-1.5 rounded-full bg-purple-500/40 blur-lg" />
            <button
              className="relative w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white/20"
              style={{
                background:
                  "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
                boxShadow:
                  "0 6px 18px -3px rgba(99,102,241,0.7), 0 0 28px -6px rgba(168,85,247,0.65), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              <Mic size={15} className="text-white drop-shadow" />
            </button>
          </div>
          <Waves />
        </div>
        <HomeIndicator />
      </div>
    </>
  );
}
