import {
  Mic,
  Hand,
  MessageSquare,
  PhoneOff,
  Users,
  Headphones,
} from "lucide-react";
import {
  Header,
  Avatar,
  IconButton,
  chatUI,
  HomeIndicator,
} from "@/components/chat-ui";
import { VOICE_SPEAKERS, VOICE_LISTENERS } from "@/data/chat";

export function VoiceOnlyTile() {
  return (
    <>
      <Header
        title="Voice Only Room"
        onBack={() => {}}
        subtitle={
          <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live · 11 participants
          </span>
        }
      />
      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-4">
        <div className="relative my-3">
          <span
            className="absolute inset-0 -m-12 rounded-full animate-ping"
            style={{ background: "rgba(168,85,247,0.10)" }}
          />
          <span
            className="absolute inset-0 -m-7 rounded-full animate-pulse"
            style={{ background: "rgba(124,58,237,0.18)" }}
          />
          <span
            className="absolute inset-0 -m-4 rounded-full blur-2xl"
            style={{ background: "rgba(168,85,247,0.55)" }}
          />
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center ring-2 ring-white/25"
            style={{
              background:
                "linear-gradient(135deg, #60a5fa 0%, #818cf8 30%, #a855f7 65%, #7c3aed 100%)",
              boxShadow:
                "0 24px 60px -10px rgba(124,58,237,0.85), 0 0 80px -10px rgba(99,102,241,0.7), inset 0 3px 0 rgba(255,255,255,0.4)",
            }}
          >
            <Mic size={52} className="text-white drop-shadow-lg" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300 text-[10.5px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            You're connected
          </span>
        </div>

        <div className="w-full mt-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Mic size={11} className="text-emerald-400" />
              المتحدثون
            </h3>
            <span className="text-[10px] text-slate-400">
              {VOICE_SPEAKERS.length}
            </span>
          </div>
          <div
            className={`${chatUI.radius.card} ${chatUI.surface.card} ${chatUI.spacing.cardPad}`}
          >
            <div dir="ltr" className="flex items-start justify-around">
              {VOICE_SPEAKERS.map((s) => (
                <div
                  key={s.letter}
                  className="flex flex-col items-center gap-1.5 w-[72px]"
                >
                  <div className="relative">
                    {s.speaking && (
                      <span className="absolute inset-0 -m-1 rounded-full ring-2 ring-emerald-400 animate-pulse" />
                    )}
                    <Avatar letter={s.letter} tone={s.tone} size={48} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-900 ring-2 ring-slate-950 flex items-center justify-center">
                      <Mic size={10} className="text-emerald-400" />
                    </span>
                  </div>
                  <span className="text-[10.5px] font-semibold text-slate-200">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full mt-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Headphones size={11} className="text-slate-300" />
              المستمعون
            </h3>
            <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
              <Users size={10} /> 8
            </span>
          </div>
          <div
            className={`${chatUI.radius.card} ${chatUI.surface.card} ${chatUI.spacing.cardPad}`}
          >
            <div
              dir="ltr"
              className="grid grid-cols-5 gap-y-2 justify-items-center"
            >
              {VOICE_LISTENERS.slice(0, 5).map((l) => (
                <div
                  key={l.letter}
                  className="flex flex-col items-center gap-1 w-[64px]"
                >
                  <Avatar letter={l.letter} tone={l.tone} size={36} />
                  <span className="text-[9.5px] text-slate-400">{l.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 pt-3 pb-2 border-t border-white/5 bg-slate-950/60 backdrop-blur">
        <div dir="ltr" className="flex items-end justify-around">
          <IconButton
            icon={<Hand size={20} />}
            label="Raise Hand"
            tone="warning"
            badge="3"
          />
          <IconButton
            icon={<MessageSquare size={20} />}
            label="Message"
            tone="accent"
          />
          <IconButton
            icon={<PhoneOff size={20} />}
            label="Leave"
            tone="danger"
          />
        </div>
        <div className="pt-1">
          <HomeIndicator />
        </div>
      </div>
    </>
  );
}
