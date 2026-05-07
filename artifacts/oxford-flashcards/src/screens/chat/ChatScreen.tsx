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
  ImageContent,
  FileContent,
  ActionButton,
  InputBar,
  PhoneFrame,
  PageBackdrop,
  ChatScrollBg,
  HomeIndicator,
  Waves,
} from "@/components/chat-ui";
import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  MOCK_ROOMS,
  pickRandom,
  ICE_BREAKERS,
  TOPICS,
  type User,
} from "@/data/chat";
import {
  getRoom,
  getMessages,
  sendMessage,
  sendVoiceMessage,
  postSystemMessage,
  subscribeToRoom,
  type Room,
  type Message,
} from "@/data/chatApi";

function MessageItem({ m }: { m: Message }) {
  if (m.kind === "incoming" && m.name && m.letter && m.tone) {
    return (
      <IncomingBubble
        name={m.name}
        tone={m.tone}
        letter={m.letter}
        time={m.time}
        reactions={m.reactions}
        host={m.host}
      >
        {m.text}
      </IncomingBubble>
    );
  }
  if (m.kind === "outgoing") {
    return <OutgoingBubble time={m.time}>{m.text}</OutgoingBubble>;
  }
  if (m.kind === "voice-out") {
    return (
      <OutgoingBubble time={m.time}>
        <VoiceMessage duration={m.duration ?? "0:10"} played={0.5} bars={22} />
      </OutgoingBubble>
    );
  }
  if (m.kind === "voice-in" && m.name && m.letter && m.tone) {
    return (
      <IncomingBubble
        name={m.name}
        tone={m.tone}
        letter={m.letter}
        time={m.time}
        reactions={m.reactions}
      >
        <VoiceMessage duration={m.duration ?? "0:10"} played={0.3} bars={20} />
      </IncomingBubble>
    );
  }
  if (m.kind === "image-in" && m.name && m.letter && m.tone && m.imageUrl) {
    return (
      <IncomingBubble
        name={m.name}
        tone={m.tone}
        letter={m.letter}
        time={m.time}
        reactions={m.reactions}
        bare
      >
        <ImageContent url={m.imageUrl} caption={m.imageCaption} />
      </IncomingBubble>
    );
  }
  if (
    m.kind === "file-in" &&
    m.name &&
    m.letter &&
    m.tone &&
    m.fileName &&
    m.fileSize
  ) {
    return (
      <IncomingBubble
        name={m.name}
        tone={m.tone}
        letter={m.letter}
        time={m.time}
        reactions={m.reactions}
        bare
      >
        <FileContent
          fileName={m.fileName}
          fileSize={m.fileSize}
          pages={m.filePages}
          caption={m.text}
        />
      </IncomingBubble>
    );
  }
  if (m.kind === "system") {
    return <SystemBubble>{m.text}</SystemBubble>;
  }
  return null;
}

type OnboardingStage =
  | "off"
  | "intro"
  | "prompt"
  | "hint"
  | "success"
  | "fading"
  | "done";

const ONBOARDING_DEMOS: Message[] = [
  {
    id: "demo-1",
    kind: "incoming",
    name: "Omar",
    letter: "O",
    tone: "blue",
    time: "now",
    text: "Hi everyone! How was your weekend?",
  },
  {
    id: "demo-2",
    kind: "incoming",
    name: "Sara",
    letter: "S",
    tone: "pink",
    time: "now",
    text: "It was great! I went hiking 😊",
  },
];

function DemoPill({
  tone,
  label,
  children,
}: {
  tone: "purple" | "amber" | "emerald";
  label: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === "amber"
      ? {
          ring: "ring-amber-400/40",
          bg: "linear-gradient(135deg, rgba(251,191,36,0.20), rgba(245,158,11,0.10))",
          chip: "text-amber-200",
          body: "text-amber-50",
        }
      : tone === "emerald"
        ? {
            ring: "ring-emerald-400/40",
            bg: "linear-gradient(135deg, rgba(52,211,153,0.22), rgba(16,185,129,0.10))",
            chip: "text-emerald-200",
            body: "text-emerald-50",
          }
        : {
            ring: "ring-purple-400/30",
            bg: "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(124,58,237,0.10))",
            chip: "text-purple-200",
            body: "text-purple-50",
          };
  return (
    <div className="flex justify-center animate-fade-in-up">
      <div
        className={`rounded-full px-3.5 py-1.5 ring-1 ${styles.ring} shadow-md inline-flex items-center gap-2 max-w-[90%]`}
        style={{ background: styles.bg }}
      >
        <span
          className={`text-[9px] font-bold uppercase tracking-wide ${styles.chip}`}
        >
          {label}
        </span>
        <span className={`text-[11px] leading-snug ${styles.body}`}>
          {children}
        </span>
      </div>
    </div>
  );
}

export default function ChatScreen() {
  const [, params] = useRoute("/chat-screen/:id");
  const [, setLocation] = useLocation();
  const roomId = params?.id ?? MOCK_ROOMS[1].id;

  const [room, setRoom] = useState<Room>(MOCK_ROOMS[1]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [onlineCount, setOnlineCount] = useState<number>(MOCK_ROOMS[1].online);
  const [typingUser, setTypingUser] = useState<User | null>(null);
  const [onboardStage, setOnboardStage] = useState<OnboardingStage>("off");
  const scrollRef = useRef<HTMLDivElement>(null);

  function dismissOnboarding() {
    setOnboardStage((s) => (s === "off" || s === "done" ? s : "done"));
    try {
      localStorage.setItem(`lexo-chat-onboarded-${roomId}`, "1");
    } catch {
      // ignore (e.g. SSR / sandboxed)
    }
  }

  useEffect(() => {
    let cancelled = false;
    setOnboardStage("off");
    Promise.all([getRoom(roomId), getMessages(roomId)]).then(([r, msgs]) => {
      if (cancelled) return;
      if (r) {
        setRoom(r);
        setOnlineCount(r.online);
      }
      const force =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("onboard") === "1";
      let seen = false;
      try {
        seen = localStorage.getItem(`lexo-chat-onboarded-${roomId}`) === "1";
      } catch {
        seen = false;
      }
      if (force) {
        setMessages([]);
        setOnboardStage("intro");
      } else {
        setMessages(msgs);
        if (msgs.length === 0 && !seen) {
          setOnboardStage("intro");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (onboardStage === "intro") {
      const t = setTimeout(() => setOnboardStage("prompt"), 3500);
      return () => clearTimeout(t);
    }
    if (onboardStage === "prompt") {
      const t = setTimeout(() => setOnboardStage("hint"), 5000);
      return () => clearTimeout(t);
    }
    if (onboardStage === "success") {
      const t1 = setTimeout(() => setOnboardStage("fading"), 2000);
      const t2 = setTimeout(() => {
        setOnboardStage("done");
        try {
          localStorage.setItem(`lexo-chat-onboarded-${roomId}`, "1");
        } catch {
          // ignore
        }
      }, 3500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    return undefined;
  }, [onboardStage, roomId]);

  useEffect(() => {
    const unsub = subscribeToRoom(roomId, (e) => {
      if (e.type === "typing") setTypingUser(e.user);
      else if (e.type === "typing-stop") setTypingUser(null);
      else if (e.type === "message")
        setMessages((prev) => [...prev, e.message]);
      else if (e.type === "presence") setOnlineCount(e.online);
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typingUser]);

  const micHighlight = onboardStage === "prompt" || onboardStage === "hint";

  async function sendText() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    dismissOnboarding();
    const res = await sendMessage(roomId, text);
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  async function sendVoice() {
    const wasOnboarding =
      onboardStage !== "off" &&
      onboardStage !== "done" &&
      onboardStage !== "fading";
    if (wasOnboarding) {
      setOnboardStage("success");
    }
    const res = await sendVoiceMessage(roomId);
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  async function addTopic() {
    const res = await postSystemMessage(
      roomId,
      `Topic suggestion: ${pickRandom(TOPICS)} 💡`,
    );
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  async function addIceBreaker() {
    const res = await postSystemMessage(roomId, pickRandom(ICE_BREAKERS));
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  }

  return (
    <PageBackdrop>
      <PhoneFrame dir="ltr">
        <Header
          title={room.title}
          onBack={() => setLocation(`/room-details/${room.id}`)}
          subtitle={
            <>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                {onlineCount} online
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
              <div className="relative">
                <div className="absolute inset-0 -m-1 rounded-full bg-blue-500/40 blur-md" />
                <button className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_6px_20px_-2px_rgba(59,130,246,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] ring-2 ring-white/15">
                  <Mic size={16} className="text-white" />
                </button>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 text-amber-300 text-[11px] font-bold">
                <Hand size={12} />
                رفع اليد
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[9px] font-extrabold flex items-center justify-center">
                  3
                </span>
              </button>
            </>
          }
        />

        <ChatScrollBg
          scrollRef={scrollRef}
          className="px-4 pt-3 pb-2 space-y-2.5"
        >
          {onboardStage !== "off" && onboardStage !== "done" && (
            <div
              className={`space-y-2.5 transition-opacity duration-[1400ms] ${
                onboardStage === "fading" ? "opacity-0" : "opacity-100"
              }`}
            >
              <DemoPill tone="purple" label="Demo">
                Welcome 👋 Here's how conversations work:
              </DemoPill>
              {ONBOARDING_DEMOS.map((m, i) => (
                <div
                  key={m.id}
                  className="animate-fade-in-up relative opacity-90"
                  style={{ animationDelay: `${(i + 1) * 500}ms` }}
                >
                  <span className="absolute -top-1.5 left-9 z-10 px-1.5 py-[1px] rounded-full bg-purple-500/25 ring-1 ring-purple-400/40 text-purple-100 text-[8.5px] font-extrabold tracking-wide uppercase shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                    Example
                  </span>
                  <MessageItem m={m} />
                </div>
              ))}
              {(onboardStage === "prompt" ||
                onboardStage === "hint" ||
                onboardStage === "success" ||
                onboardStage === "fading") && (
                <DemoPill tone="purple" label="Your turn">
                  Now it's your turn 👇 Tap the mic and introduce yourself 🎙️
                </DemoPill>
              )}
              {(onboardStage === "hint" ||
                onboardStage === "success" ||
                onboardStage === "fading") && (
                <DemoPill tone="amber" label="Try this">
                  My name is ___. I'm learning English because ___.
                </DemoPill>
              )}
              {(onboardStage === "success" || onboardStage === "fading") && (
                <DemoPill tone="emerald" label="Nice">
                  Great job 👏 Keep going!
                </DemoPill>
              )}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="animate-fade-in-up">
              <MessageItem m={m} />
            </div>
          ))}
          {typingUser && (
            <div className="animate-fade-in-up flex items-center gap-2 pl-1 pt-0.5">
              <Avatar
                letter={typingUser.letter}
                tone={typingUser.tone}
                size={20}
                ring
              />
              <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-white/[0.06] ring-1 ring-white/10 flex items-center gap-1">
                <span className="text-[10.5px] text-slate-400 mr-1">
                  {typingUser.name} is typing
                </span>
                <span className="flex items-end gap-0.5 h-3">
                  <span
                    className="w-1 h-1 rounded-full bg-slate-300/80 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-slate-300/80 animate-bounce"
                    style={{ animationDelay: "120ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-slate-300/80 animate-bounce"
                    style={{ animationDelay: "240ms" }}
                  />
                </span>
              </div>
            </div>
          )}
        </ChatScrollBg>

        <div className="relative z-10 px-4 pt-2 pb-1 border-t border-white/5 bg-slate-950/40 backdrop-blur">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ActionButton
              icon={<Sparkles size={14} />}
              label="Topic"
              tone="purple"
              onClick={addTopic}
            />
            <ActionButton
              icon={<Lightbulb size={14} />}
              label="Ice Breaker"
              tone="blue"
              onClick={addIceBreaker}
            />
            <ActionButton
              icon={<RefreshCw size={14} />}
              label="Rotate"
              tone="green"
              onClick={addTopic}
            />
            <ActionButton
              icon={<ImageIcon size={14} />}
              label="Image Talk"
              tone="orange"
              onClick={addTopic}
            />
          </div>

          <InputBar
            value={draft}
            onChange={(v) => {
              if (v.length > 0) dismissOnboarding();
              setDraft(v);
            }}
            onSend={sendText}
          />

          <div className="flex items-center justify-center gap-2 mt-1.5 mb-0.5">
            <Waves />
            <div className="relative">
              {micHighlight && (
                <>
                  <span className="pointer-events-none absolute inset-0 -m-3 rounded-full ring-2 ring-purple-300/70 animate-ping" />
                  <span className="pointer-events-none absolute inset-0 -m-5 rounded-full ring-1 ring-purple-300/40 animate-ping [animation-delay:300ms]" />
                </>
              )}
              <div
                className={`absolute inset-0 -m-1.5 rounded-full blur-lg animate-pulse ${
                  micHighlight ? "bg-purple-400/70" : "bg-purple-500/40"
                }`}
              />
              <button
                onClick={sendVoice}
                className="relative w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white/20 hover:brightness-110 active:brightness-95 active:scale-90 animate-mic-breathe transition-[transform,filter] duration-150"
                style={{
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
                  boxShadow: micHighlight
                    ? "0 8px 26px -2px rgba(168,85,247,0.95), 0 0 44px -4px rgba(192,132,252,0.85), inset 0 1px 0 rgba(255,255,255,0.45)"
                    : "0 6px 18px -3px rgba(99,102,241,0.7), 0 0 28px -6px rgba(168,85,247,0.65), inset 0 1px 0 rgba(255,255,255,0.4)",
                }}
              >
                <Mic size={15} className="text-white drop-shadow" />
              </button>
            </div>
            <Waves />
          </div>

          <HomeIndicator />
        </div>
      </PhoneFrame>
    </PageBackdrop>
  );
}
