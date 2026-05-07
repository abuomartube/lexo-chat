import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Mic,
  Send,
  Image as ImageIcon,
  Lightbulb,
  Sparkles,
  ShieldAlert,
  Headphones,
  RefreshCw,
  MoreVertical,
  Paperclip,
  Hand,
  Trophy,
  MessageCircle,
  Bookmark,
  BookOpen,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Avatar as LovableAvatar } from "@/components/chat-lovable/Avatar";
import { MyFeedbackModal } from "@/components/chat-lovable/MyFeedbackModal";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useAiFeedbackToggle } from "@/hooks/use-ai-feedback-toggle";
import { cn } from "@/lib/utils";
import {
  fetchRoom,
  fetchMessages,
  sendTextMessage,
  sendAttachmentMessage,
  deleteMessage,
  heartbeat,
  fetchIceBreaker,
  uploadFileAndGetPath,
  containsArabic,
  type ChatMessage,
} from "@/lib/chat-api";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import MessageBubble from "@/components/chat-lovable/LovableMessageBubble";
import TopicGenerator from "@/components/chat/TopicGenerator";

function VoiceOnlyComingSoon({ slug }: { slug: string }) {
  const { lang } = useLanguage();
  void slug;
  return (
    <div
      className="min-h-screen text-white relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <Header />
      <main className="relative max-w-md mx-auto px-4 py-10 text-center">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-purple-300 text-sm mb-8"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
          {lang === "ar" ? "رجوع" : "Back"}
        </Link>
        <div className="rounded-[28px] bg-gradient-to-br from-slate-800/55 to-slate-900/65 backdrop-blur-2xl ring-1 ring-white/10 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),0_8px_24px_-8px_rgba(124,58,237,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="mx-auto w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-700 flex items-center justify-center mb-6 shadow-[0_0_60px_rgba(124,58,237,0.55)] ring-8 ring-purple-500/20">
            <Headphones size={56} />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">
            🎧 {lang === "ar" ? "غرفة الصوت فقط" : "Voice Only Room"}
          </h1>
          <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
            {lang === "ar"
              ? "قريباً — المرحلة الثانية"
              : "Coming Soon — Phase 2"}
          </span>
          <p className="text-purple-100 leading-relaxed text-sm mb-6">
            {lang === "ar"
              ? "محادثة صوتية مباشرة على غرار كلب هاوس. يستمع الجميع لمن يتحدث في الوقت الفعلي مع نظام رفع اليد ومُشرفين."
              : "Live audio practice — Clubhouse-style. Everyone hears the speaker in real time, with raise-hand and moderator controls."}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-purple-200">
            <Feature label={lang === "ar" ? "WebRTC مباشر" : "Live WebRTC"} />
            <Feature label={lang === "ar" ? "رفع اليد" : "Raise hand"} />
            <Feature label={lang === "ar" ? "حد للمتحدث" : "Speaker limit"} />
            <Feature label={lang === "ar" ? "كتم تلقائي" : "Auto-mute"} />
          </div>
        </div>
      </main>
    </div>
  );
}
function Feature({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-white/[0.05] backdrop-blur-xl ring-1 ring-white/10 px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      {label}
    </div>
  );
}

export default function ChatRoomPage() {
  const params = useParams() as { slug: string };
  const slug = params.slug;
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [stage, setStage] = useState<"preview" | "chat">("preview");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [showTopic, setShowTopic] = useState(false);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [arabicWarn, setArabicWarn] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesReloadKey, setMessagesReloadKey] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { aiFeedbackEnabled, toggleAiFeedback } = useAiFeedbackToggle();
  const lastTimeRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const roomQ = useQuery({
    queryKey: ["chat-room", slug],
    queryFn: () => fetchRoom(slug),
  });
  const room = roomQ.data?.room;

  // Initial messages
  useEffect(() => {
    if (stage !== "chat" || !room) return;
    let cancelled = false;
    setMessagesLoading(true);
    setMessagesError(null);
    (async () => {
      try {
        const r = await fetchMessages(slug);
        if (cancelled) return;
        setMessages(r.messages);
        if (r.messages.length > 0) {
          lastTimeRef.current = r.messages[r.messages.length - 1].createdAt;
        }
        scrollToBottom();
      } catch (e) {
        if (cancelled) return;
        setMessagesError((e as Error).message);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, slug, room?.id, messagesReloadKey]);

  // Polling + heartbeat
  useEffect(() => {
    if (stage !== "chat" || !room) return;
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetchMessages(slug, lastTimeRef.current ?? undefined);
        if (stop) return;
        if (r.messages.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of r.messages) if (!seen.has(m.id)) merged.push(m);
            return merged;
          });
          lastTimeRef.current = r.messages[r.messages.length - 1].createdAt;
          requestAnimationFrame(scrollToBottom);
        }
      } catch {
        /* ignore transient */
      }
    };
    const beat = async () => {
      try {
        const h = await heartbeat(slug);
        if (!stop) setOnlineCount(h.onlineCount);
      } catch {
        /* ignore */
      }
    };
    void beat();
    const pollId = window.setInterval(poll, 3000);
    const beatId = window.setInterval(beat, 15000);
    return () => {
      stop = true;
      window.clearInterval(pollId);
      window.clearInterval(beatId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, slug, room?.id]);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function handleSendText(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    if (containsArabic(text)) {
      setArabicWarn(true);
      window.setTimeout(() => setArabicWarn(false), 3500);
    }
    setSending(true);
    try {
      const r = await sendTextMessage(slug, text);
      setMessages((m) => [...m, r.message]);
      lastTimeRef.current = r.message.createdAt;
      setInput("");
      requestAnimationFrame(scrollToBottom);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleSendVoice(clip: {
    blob: Blob;
    mime: string;
    durationSec: number;
  }) {
    const ext =
      clip.mime === "audio/mp4"
        ? "m4a"
        : clip.mime === "audio/ogg"
          ? "ogg"
          : "webm";
    const filename = `voice-${Date.now()}.${ext}`;
    const objectPath = await uploadFileAndGetPath(
      clip.blob,
      filename,
      clip.mime,
    );
    const r = await sendAttachmentMessage(slug, "voice", {
      objectPath,
      mime: clip.mime,
      sizeBytes: clip.blob.size,
      audioDurationSec: clip.durationSec,
    });
    setMessages((m) => [...m, r.message]);
    lastTimeRef.current = r.message.createdAt;
    setRecording(false);
    requestAnimationFrame(scrollToBottom);
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: lang === "ar" ? "الصور فقط" : "Only image files are allowed.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: lang === "ar" ? "أقصى حجم 10 ميجا" : "Max image size is 10 MB",
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    try {
      const objectPath = await uploadFileAndGetPath(file, file.name, file.type);
      const r = await sendAttachmentMessage(slug, "image", {
        objectPath,
        mime: file.type,
        sizeBytes: file.size,
      });
      setMessages((m) => [...m, r.message]);
      lastTimeRef.current = r.message.createdAt;
      requestAnimationFrame(scrollToBottom);
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleIceBreaker() {
    try {
      const r = await fetchIceBreaker();
      setInput(r.icebreaker.en);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMessage(id);
      setMessages((m) =>
        m.map((x) => (x.id === id ? { ...x, deleted: true, body: null } : x)),
      );
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  }

  const rules = useMemo<string[]>(() => {
    const raw = lang === "ar" ? room?.rulesAr : room?.rulesEn;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [room, lang]);

  if (roomQ.isLoading) {
    return <RoomLoadingState lang={lang} />;
  }
  if (!room) {
    return (
      <RoomErrorState
        lang={lang}
        onRetry={() => {
          void roomQ.refetch();
        }}
      />
    );
  }

  if (room.kind === "voice") {
    return <VoiceOnlyComingSoon slug={slug} />;
  }

  // ───────────── PREVIEW STAGE ─────────────
  if (stage === "preview") {
    return (
      <div
        className="dark min-h-screen text-slate-100 relative"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(124,58,237,0.18), transparent 60%)",
          }}
        />
        <Header />
        <main className="relative max-w-xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1 text-purple-300 text-sm mb-4 font-semibold"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
            {lang === "ar" ? "رجوع" : "Back"}
          </Link>

          <div className="rounded-[28px] bg-gradient-to-br from-slate-800/55 to-slate-900/65 backdrop-blur-2xl ring-1 ring-white/10 overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),0_8px_24px_-8px_rgba(124,58,237,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="bg-gradient-to-br from-purple-600/30 via-indigo-600/15 to-transparent p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center mb-3">
                  <SoundWaves side="left" />
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(124,58,237,0.55)] mx-3">
                    {room.emoji ?? "💬"}
                  </div>
                  <SoundWaves side="right" />
                </div>
                <h1 className="text-xl font-extrabold text-white">
                  {lang === "ar" ? room.nameAr : room.nameEn}
                </h1>
                <div className="mt-2 flex items-center justify-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    {room.onlineCount} {lang === "ar" ? "متصل" : "Online"}
                  </span>
                  {room.level && (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {room.level}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(lang === "ar" ? room.descriptionAr : room.descriptionEn) && (
              <div className="px-6 pb-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === "ar" ? "عن الغرفة" : "About"}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {lang === "ar" ? room.descriptionAr : room.descriptionEn}
                </p>
              </div>
            )}

            {rules.length > 0 && (
              <div className="px-6 pb-5 border-t border-white/10 pt-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert size={12} className="text-purple-400" />
                  {lang === "ar" ? "قواعد الغرفة" : "Room Rules"}
                </h3>
                <ul className="space-y-2">
                  {rules.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-200"
                    >
                      <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(roomQ.data?.activeUsers?.length ?? 0) > 0 && (
              <div className="px-6 pb-6 border-t border-white/10 pt-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {lang === "ar" ? "الموجودون الآن" : "People inside now"}
                </h3>
                <div className="flex -space-x-2 rtl:space-x-reverse items-center">
                  {(roomQ.data?.activeUsers ?? []).slice(0, 6).map((u) => (
                    <div
                      key={u.id}
                      title={u.name}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold border-2 border-slate-900"
                    >
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {(roomQ.data?.activeUsers?.length ?? 0) > 6 && (
                    <div className="ms-3 ps-3 text-xs text-slate-400 font-semibold">
                      +{(roomQ.data?.activeUsers?.length ?? 0) - 6}{" "}
                      {lang === "ar" ? "آخرون" : "more"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => setStage("chat")}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-white font-bold transition hover:brightness-110 active:scale-[0.99] shadow-[0_18px_44px_-10px_rgba(124,58,237,0.7),0_4px_14px_-2px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%)",
              }}
              type="button"
            >
              <Headphones size={18} />{" "}
              {lang === "ar" ? "الانضمام إلى الغرفة" : "Join the Room"}
            </button>
            <button
              onClick={() => setStage("chat")}
              className="w-full text-center text-sm text-slate-400 hover:text-purple-300 py-2"
              type="button"
            >
              {lang === "ar" ? "استمع أولاً" : "Listen first"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ───────────── CHAT STAGE ─────────────
  const insiders = roomQ.data?.activeUsers ?? [];
  return (
    <div
      className="dark min-h-screen flex flex-col text-slate-100"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 60%, #02040e 100%)",
      }}
    >
      {/* ───── Premium LEXO Chat sticky header ───── */}
      <header
        className="sticky top-0 z-30 backdrop-blur-2xl bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/60 border-b border-white/[0.08] shadow-[0_12px_32px_-16px_rgba(0,0,0,0.85)]"
      >
        {/* Soft purple sheen across the bottom edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent"
        />
        {/* Decorative purple glow tucked behind the emoji tile */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 start-12 h-28 w-28 rounded-full bg-purple-600/15 blur-3xl"
        />

        <div className="relative max-w-3xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back button — pill on sm+, icon-only on mobile */}
            <button
              onClick={() => navigate("/chat")}
              className="lx-press inline-flex items-center gap-1.5 h-10 px-2.5 sm:px-3 shrink-0 rounded-full bg-white/[0.05] ring-1 ring-white/10 text-slate-200 hover:bg-white/[0.12] hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              aria-label={lang === "ar" ? "رجوع للغرف" : "Back to rooms"}
              type="button"
            >
              <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden />
              <span className="hidden sm:inline text-[11px] font-bold">
                {lang === "ar" ? "الغرف" : "Rooms"}
              </span>
            </button>

            {/* Room identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
              {/* Emoji tile with halo */}
              <div className="relative shrink-0">
                <span
                  aria-hidden
                  className="absolute inset-0 -m-1 rounded-2xl bg-gradient-to-br from-purple-500/40 to-indigo-500/40 blur-md"
                />
                <div
                  className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-[22px] ring-1 ring-white/15 shadow-[0_10px_24px_-8px_rgba(124,58,237,0.65),inset_0_1px_0_rgba(255,255,255,0.22)]"
                  style={{
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #4f46e5 100%)",
                  }}
                  aria-hidden
                >
                  {room.emoji ?? "💬"}
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1
                    dir="auto"
                    className="font-bold text-[14px] sm:text-base text-white truncate leading-tight"
                  >
                    {lang === "ar" ? room.nameAr : room.nameEn}
                  </h1>
                  {room.level && (
                    <span className="hidden xs:inline-flex sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-500/15 ring-1 ring-purple-400/25 text-[9px] font-bold uppercase tracking-wide text-purple-200 shrink-0">
                      {room.level}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  {/* Online count pill (real data only) */}
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/12 ring-1 ring-emerald-400/25 text-[10px] font-bold text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    <span className="tabular-nums">
                      {onlineCount ?? room.onlineCount}
                    </span>
                    <span className="font-semibold text-emerald-200/80">
                      {lang === "ar" ? "متصل" : "online"}
                    </span>
                  </span>

                  {/* Insider avatars */}
                  {insiders.length > 0 && (
                    <div className="hidden sm:flex -space-x-2 rtl:space-x-reverse items-center min-w-0">
                      {insiders.slice(0, 3).map((u) => (
                        <LovableAvatar
                          key={u.id}
                          name={u.name}
                          size="xs"
                          online
                        />
                      ))}
                      {insiders.length > 3 && (
                        <span className="ms-1.5 text-[10px] text-slate-400 font-semibold">
                          +{insiders.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right-side action cluster */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Leaderboard */}
              <Link
                href="/chat/leaderboard"
                title={lang === "ar" ? "لوحة المتصدرين" : "Leaderboard"}
                aria-label={lang === "ar" ? "لوحة المتصدرين" : "Leaderboard"}
                className="lx-press inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-full bg-gradient-to-br from-amber-500/15 to-orange-500/15 ring-1 ring-amber-400/30 text-amber-200 text-[11px] font-bold backdrop-blur-xl shadow-[0_6px_18px_-8px_rgba(251,191,36,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] hover:from-amber-500/25 hover:to-orange-500/25 hover:text-amber-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <Trophy size={13} aria-hidden />
                <span className="hidden sm:inline">
                  {lang === "ar" ? "المتصدرون" : "Top"}
                </span>
              </Link>

              {/* My Feedback (hidden when AI toggle is off) */}
              {aiFeedbackEnabled && (
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  title={lang === "ar" ? "تقييمي" : "My Feedback"}
                  aria-label={lang === "ar" ? "تقييمي" : "My Feedback"}
                  className="lx-press inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-auto sm:px-3 sm:gap-1.5 rounded-full bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 ring-1 ring-emerald-400/30 text-emerald-200 text-[11px] font-bold backdrop-blur-xl shadow-[0_6px_18px_-8px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] hover:from-emerald-500/25 hover:to-cyan-500/25 hover:text-emerald-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <BookOpen size={13} aria-hidden />
                  <span className="hidden sm:inline">
                    {lang === "ar" ? "تقييمي" : "Feedback"}
                  </span>
                </button>
              )}

              {/* My Notes */}
              <Link
                href="/chat/notes"
                title={lang === "ar" ? "ملاحظاتي" : "My Notes"}
                aria-label={lang === "ar" ? "ملاحظاتي" : "My Notes"}
                className="lx-press inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-auto sm:px-3 sm:gap-1.5 rounded-full bg-white/[0.05] ring-1 ring-white/10 text-slate-200 text-[11px] font-bold backdrop-blur-xl shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.12] hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              >
                <Bookmark size={13} aria-hidden />
                <span className="hidden sm:inline">
                  {lang === "ar" ? "ملاحظاتي" : "Notes"}
                </span>
              </Link>

              {/* Raise hand */}
              <button
                type="button"
                title={lang === "ar" ? "رفع اليد" : "Raise hand"}
                aria-label={lang === "ar" ? "ارفع يدك" : "Raise hand"}
                className="lx-press inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-auto sm:px-3 sm:gap-1.5 rounded-full bg-purple-500/15 ring-1 ring-purple-400/30 text-purple-200 text-[11px] font-bold backdrop-blur-xl shadow-[0_6px_18px_-8px_rgba(168,85,247,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-purple-500/25 hover:text-purple-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              >
                <Hand size={13} aria-hidden />
                <span className="hidden sm:inline">
                  {lang === "ar" ? "ارفع" : "Raise"}
                </span>
              </button>

              {/* Menu */}
              <button
                type="button"
                className="lx-press flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-slate-300 hover:bg-white/[0.08] hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
                aria-label={lang === "ar" ? "القائمة" : "Menu"}
              >
                <MoreVertical size={16} aria-hidden />
              </button>
            </div>
          </div>

          {/* Bottom row: English Only + AI toggle + push-to-talk hint */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 ring-1 ring-emerald-400/25 text-emerald-300 text-[10px] font-bold backdrop-blur-xl shadow-[0_4px_14px_-6px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              {lang === "ar" ? "الإنجليزية فقط" : "English Only"}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAiFeedback}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition",
                  aiFeedbackEnabled
                    ? "text-purple-300 bg-purple-500/10 ring-1 ring-purple-400/25"
                    : "text-slate-500 bg-white/[0.03] ring-1 ring-white/10",
                )}
                aria-label={lang === "ar" ? "تبديل ملاحظات الذكاء الاصطناعي" : "Toggle AI Feedback"}
                title={lang === "ar" ? "ملاحظات AI" : "AI Feedback"}
              >
                {aiFeedbackEnabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                <span>AI</span>
              </button>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Mic size={11} aria-hidden />
                {lang === "ar" ? "اضغط للتسجيل" : "Tap mic to record"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ───── 3-column desktop layout (mobile = stacked, unchanged) ───── */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:gap-5 lg:p-5 lg:max-w-[1600px] lg:w-full lg:mx-auto">
        {/* ── LEFT rail: rooms-nav placeholder (desktop only) ── */}
        <aside className="hidden lg:flex flex-col gap-4 min-h-0 overflow-y-auto">
          <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                {lang === "ar" ? "الغرف" : "Rooms"}
              </h2>
              <span className="text-[10px] text-slate-500">
                {lang === "ar" ? "قريبًا" : "soon"}
              </span>
            </div>
            <div
              className="w-full text-start flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/[0.06] ring-1 ring-purple-400/30 shadow-[0_10px_30px_-12px_rgba(124,58,237,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
              aria-current="page"
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                style={{
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #6366f1 55%, #4f46e5 100%)",
                }}
                aria-hidden
              >
                {room.emoji ?? "💬"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {lang === "ar" ? room.nameAr : room.nameEn}
                </div>
                <div className="text-[10px] text-emerald-300 font-bold tabular-nums">
                  {onlineCount ?? room.onlineCount}{" "}
                  {lang === "ar" ? "متصل" : "online"}
                </div>
              </div>
            </div>
            <Link
              href="/chat"
              className="lx-press flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/[0.06] ring-1 ring-white/5 transition"
            >
              <ArrowLeft size={12} className="rtl:rotate-180" />
              {lang === "ar" ? "كل الغرف" : "All rooms"}
            </Link>
          </div>
          <div className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl ring-1 ring-white/10 p-4 text-[11px] text-slate-400 leading-relaxed">
            {lang === "ar"
              ? "متصفّح الغرف الجانبي قادم قريبًا — تنقّل سريع بين كل الغرف."
              : "Sidebar room switcher is coming soon — quick jump between all rooms."}
          </div>
        </aside>

        {/* ── CENTER column: messages + composer (existing chat, untouched logic) ── */}
        <main className="flex-1 min-h-0 flex flex-col lg:rounded-3xl lg:bg-white/[0.025] lg:backdrop-blur-xl lg:ring-1 lg:ring-white/10 lg:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] lg:overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 sm:px-5 lg:px-6 py-4 lg:py-6"
          >
            <div className="max-w-3xl w-full mx-auto">
              {messagesLoading && messages.length === 0 && (
                <MessagesLoadingState lang={lang} />
              )}
              {!messagesLoading && messagesError && messages.length === 0 && (
                <MessagesErrorState
                  lang={lang}
                  onRetry={() => setMessagesReloadKey((k) => k + 1)}
                />
              )}
              {!messagesLoading &&
                !messagesError &&
                messages.length === 0 && <EmptyRoomState lang={lang} />}
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMine={m.userId === user?.id}
                  canDelete={m.userId === user?.id || user?.role === "admin"}
                  onDelete={() => handleDelete(m.id)}
                  lang={lang}
                  aiFeedbackEnabled={aiFeedbackEnabled}
                />
              ))}
            </div>
          </div>

          {arabicWarn && (
            <div className="max-w-3xl mx-auto w-full px-3 sm:px-5 lg:px-6">
              <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 backdrop-blur-xl ring-1 ring-amber-400/30 text-amber-200 text-xs flex items-center gap-2 shadow-[0_8px_24px_-10px_rgba(251,191,36,0.4)]">
                <ShieldAlert size={14} />
                {lang === "ar"
                  ? "حاول استخدام الإنجليزية فقط للحصول على أفضل ممارسة 💪"
                  : "Please try to use English only for the best practice 💪"}
              </div>
            </div>
          )}

          <footer className="sticky bottom-0 lg:static backdrop-blur-2xl bg-slate-950/75 lg:bg-gradient-to-b lg:from-white/[0.015] lg:to-white/[0.04] border-t border-white/10 lg:border-white/[0.08] px-3 sm:px-5 lg:px-6 py-3 lg:py-4 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.7)] lg:shadow-none lg:rounded-b-3xl">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ToolPill
              onClick={() => setShowTopic(true)}
              icon={<Sparkles size={13} />}
              tone="purple"
            >
              Topic
            </ToolPill>
            <ToolPill
              onClick={handleIceBreaker}
              icon={<Lightbulb size={13} />}
              tone="amber"
            >
              Ice Breaker
            </ToolPill>
            <ToolPill
              onClick={handleIceBreaker}
              icon={<RefreshCw size={13} />}
              tone="cyan"
            >
              Rotate
            </ToolPill>
            <ToolPill
              onClick={() => fileInputRef.current?.click()}
              icon={<ImageIcon size={13} />}
              tone="rose"
            >
              Image Talk
            </ToolPill>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />
          {recording ? (
            <VoiceRecorder
              onSend={handleSendVoice}
              onCancel={() => setRecording(false)}
            />
          ) : (
            <form onSubmit={handleSendText} dir="ltr" className="relative">
              {/* Premium glass input row */}
              <div
                className={cn(
                  "group flex items-center gap-1.5 rounded-[28px] bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 ps-2 pe-2 py-2 transition-all duration-200",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_38px_-16px_rgba(0,0,0,0.75),0_6px_22px_-8px_rgba(124,58,237,0.28)]",
                  "hover:bg-white/[0.06] hover:ring-white/[0.14]",
                  "focus-within:bg-white/[0.07] focus-within:ring-purple-400/40 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_42px_-16px_rgba(0,0,0,0.78),0_10px_28px_-8px_rgba(124,58,237,0.42)]",
                )}
              >
                {/* Attachment button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={lang === "ar" ? "إرفاق صورة" : "Attach image"}
                  title={lang === "ar" ? "إرفاق صورة" : "Attach image"}
                  className="lx-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 transition-colors"
                >
                  <Paperclip size={16} />
                </button>

                <span
                  className="text-lg leading-none select-none opacity-80 px-0.5"
                  aria-hidden
                >
                  😊
                </span>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    lang === "ar" ? "اكتب رسالة…" : "Type a message…"
                  }
                  className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-[15px] leading-6 text-slate-50 placeholder:text-slate-400/80 placeholder:font-normal selection:bg-purple-500/35 py-1.5 px-1"
                  maxLength={2000}
                  autoComplete="off"
                  spellCheck
                />

                {input.trim() ? (
                  <button
                    type="submit"
                    disabled={sending}
                    aria-label={lang === "ar" ? "إرسال" : "Send"}
                    title={lang === "ar" ? "إرسال" : "Send"}
                    className="lx-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.04] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:brightness-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 shadow-[0_12px_30px_-8px_rgba(124,58,237,0.7),0_4px_14px_-2px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.12)]"
                    style={{
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 40%, #6366f1 75%, #4f46e5 100%)",
                    }}
                  >
                    {sending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} className="rtl:rotate-180 -translate-x-px" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRecording(true)}
                    aria-label={
                      lang === "ar" ? "تسجيل صوتي" : "Push to talk"
                    }
                    title={lang === "ar" ? "اضغط للتسجيل" : "Tap to record"}
                    className="lx-press relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 shadow-[0_12px_30px_-8px_rgba(124,58,237,0.7),0_4px_14px_-2px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.12)]"
                    style={{
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 40%, #6366f1 75%, #4f46e5 100%)",
                    }}
                  >
                    <Mic size={16} />
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-purple-300/40 animate-pulse"
                      aria-hidden
                    />
                  </button>
                )}
              </div>

              {/* Helper hint — desktop only, very subtle */}
              <div className="hidden lg:flex items-center justify-center mt-2 gap-3 text-[10px] text-slate-500/80">
                <span>
                  {lang === "ar"
                    ? "اضغط Enter للإرسال"
                    : "Press Enter to send"}
                </span>
                <span aria-hidden>•</span>
                <span className="tabular-nums">
                  {input.length}/2000
                </span>
              </div>
            </form>
          )}
        </div>
          </footer>
        </main>

        {/* ── RIGHT panel: room details + leaderboard preview (desktop only) ── */}
        <aside className="hidden lg:flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Room hero card */}
          <div
            className="rounded-3xl p-5 ring-1 ring-white/15 shadow-[0_22px_60px_-20px_rgba(124,58,237,0.55),inset_0_1px_0_rgba(255,255,255,0.18)] text-white relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6366f1 55%, #4f46e5 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.18), transparent 55%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <div className="text-3xl mb-2" aria-hidden>
                {room.emoji ?? "💬"}
              </div>
              <div className="text-base font-bold leading-tight">
                {lang === "ar" ? room.nameAr : room.nameEn}
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-[11px] font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300" />
                </span>
                <span className="tabular-nums">
                  {onlineCount ?? room.onlineCount}
                </span>
                <span className="text-white/85">
                  {lang === "ar" ? "متصل" : "online"}
                </span>
              </div>
            </div>
          </div>

          {/* Online users avatars */}
          <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                {lang === "ar" ? "الحاضرون" : "In the room"}
              </h3>
              <span className="text-[10px] font-bold text-emerald-300 tabular-nums">
                {insiders.length}
              </span>
            </div>
            {insiders.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {lang === "ar" ? "لا يوجد أعضاء بعد." : "No members yet."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {insiders.slice(0, 12).map((u) => (
                  <div key={u.id} title={u.name}>
                    <LovableAvatar name={u.name} size="sm" online />
                  </div>
                ))}
                {insiders.length > 12 && (
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center text-[10px] font-bold text-slate-300">
                    +{insiders.length - 12}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Leaderboard preview (links to existing real /chat/leaderboard) */}
          <Link
            href="/chat/leaderboard"
            className="lx-press group rounded-3xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.07] transition flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 flex items-center gap-1.5">
                <Trophy size={12} className="text-amber-300" />
                {lang === "ar" ? "المتصدّرون" : "Top speakers"}
              </h3>
              <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition">
                {lang === "ar" ? "عرض الكل ←" : "View all →"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === "ar"
                ? "اربح نقاط XP من خلال المحادثة والملاحظات الصوتية."
                : "Earn XP by chatting and sending voice notes."}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1 py-2.5 rounded-xl bg-gradient-to-br from-amber-400/10 to-amber-500/5 ring-1 ring-amber-400/20 text-amber-200 text-[11px] font-bold">
              <Trophy size={13} />
              {lang === "ar" ? "افتح اللوحة الكاملة" : "Open full leaderboard"}
            </div>
          </Link>
        </aside>
      </div>

      {showTopic && (
        <TopicGenerator
          lang={lang}
          onClose={() => setShowTopic(false)}
          onUseAsMessage={(t) => setInput(t)}
        />
      )}

      <MyFeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        roomSlug={slug}
        lang={lang}
      />
    </div>
  );
}

function SoundWaves({ side }: { side: "left" | "right" }) {
  const heights = side === "left" ? [10, 18, 26, 14] : [14, 26, 18, 10];
  return (
    <div className="flex items-end gap-1 h-12">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-purple-500 to-indigo-400 opacity-80"
          style={{ height: `${h * 2}px` }}
        />
      ))}
    </div>
  );
}


// ───────────── PREMIUM STATE COMPONENTS ─────────────

function StateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen text-slate-100 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#1e1b4b_0%,#0f0a2b_35%,#08061a_100%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-purple-600/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-indigo-600/25 blur-[120px]"
      />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

function RoomLoadingState({ lang }: { lang: "en" | "ar" }) {
  return (
    <StateShell>
      <div
        className="w-full max-w-md rounded-3xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="relative mx-auto h-16 w-16 mb-5">
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/40 to-indigo-500/40 blur-xl"
          />
          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-1 ring-white/15 shadow-[0_12px_30px_-10px_rgba(124,58,237,0.7)]">
            <Loader2
              size={26}
              className="animate-spin text-white"
              aria-hidden
            />
          </div>
        </div>
        <h1 className="text-base font-bold text-white">
          {lang === "ar" ? "جارٍ تجهيز الغرفة…" : "Preparing your room…"}
        </h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          {lang === "ar"
            ? "نحضّر المتحدثين والرسائل لك. لحظة واحدة."
            : "Loading speakers and recent messages. Just a moment."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </StateShell>
  );
}

function RoomErrorState({
  lang,
  onRetry,
}: {
  lang: "en" | "ar";
  onRetry: () => void;
}) {
  return (
    <StateShell>
      <div
        className="w-full max-w-md rounded-3xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] p-8 text-center"
        role="alert"
      >
        <div className="relative mx-auto h-16 w-16 mb-5">
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/40 to-rose-500/40 blur-xl"
          />
          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center ring-1 ring-white/15 shadow-[0_12px_30px_-10px_rgba(244,63,94,0.6)]">
            <ShieldAlert size={26} className="text-white" aria-hidden />
          </div>
        </div>
        <h1 className="text-base font-bold text-white">
          {lang === "ar" ? "تعذّر فتح الغرفة" : "We couldn't open this room"}
        </h1>
        <p
          className="mt-2 text-sm text-slate-400 leading-relaxed"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          {lang === "ar"
            ? "قد تكون الغرفة غير متاحة أو حدث خطأ بسيط في الاتصال. حاول مرة أخرى أو عُد لقائمة الغرف."
            : "The room may be unavailable, or there was a brief connection issue. Try again, or head back to the rooms list."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="lx-press inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-sm font-bold ring-1 ring-white/15 shadow-[0_12px_30px_-10px_rgba(124,58,237,0.7)] hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          >
            <RefreshCw size={14} aria-hidden />
            {lang === "ar" ? "حاول مجددًا" : "Try again"}
          </button>
          <Link
            href="/chat"
            className="lx-press inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.06] text-slate-200 text-sm font-bold ring-1 ring-white/10 hover:bg-white/[0.12] hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          >
            <ArrowLeft size={14} className="rtl:rotate-180" aria-hidden />
            {lang === "ar" ? "كل الغرف" : "All rooms"}
          </Link>
        </div>
      </div>
    </StateShell>
  );
}

function MessagesLoadingState({ lang }: { lang: "en" | "ar" }) {
  return (
    <div
      className="my-10 flex flex-col items-center text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-12 w-12 mb-4">
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/40 to-indigo-500/40 blur-lg"
        />
        <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-1 ring-white/15 shadow-[0_10px_24px_-10px_rgba(124,58,237,0.7)]">
          <Loader2 size={20} className="animate-spin text-white" aria-hidden />
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-200">
        {lang === "ar" ? "جارٍ تحميل المحادثة…" : "Loading conversation…"}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {lang === "ar"
          ? "نجلب آخر الرسائل في هذه الغرفة."
          : "Fetching the latest messages in this room."}
      </p>
      {/* Skeleton bubbles */}
      <div className="mt-6 w-full max-w-sm space-y-3">
        <div className="flex items-end gap-2">
          <span className="h-8 w-8 rounded-full bg-white/[0.06] ring-1 ring-white/10 animate-pulse" />
          <span className="h-9 flex-1 max-w-[70%] rounded-2xl bg-white/[0.05] ring-1 ring-white/10 animate-pulse" />
        </div>
        <div className="flex items-end gap-2 justify-end">
          <span className="h-9 w-2/3 rounded-2xl bg-purple-500/15 ring-1 ring-purple-400/20 animate-pulse" />
        </div>
        <div className="flex items-end gap-2">
          <span className="h-8 w-8 rounded-full bg-white/[0.06] ring-1 ring-white/10 animate-pulse" />
          <span className="h-9 flex-1 max-w-[55%] rounded-2xl bg-white/[0.05] ring-1 ring-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function MessagesErrorState({
  lang,
  onRetry,
}: {
  lang: "en" | "ar";
  onRetry: () => void;
}) {
  return (
    <div
      className="my-10 mx-auto max-w-md rounded-3xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] p-6 text-center"
      role="alert"
    >
      <div className="relative mx-auto h-12 w-12 mb-4">
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/40 to-rose-500/40 blur-lg"
        />
        <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center ring-1 ring-white/15 shadow-[0_10px_24px_-10px_rgba(244,63,94,0.6)]">
          <ShieldAlert size={20} className="text-white" aria-hidden />
        </div>
      </div>
      <h2 className="text-sm font-bold text-white">
        {lang === "ar"
          ? "تعذّر تحميل الرسائل"
          : "We couldn't load the messages"}
      </h2>
      <p
        className="mt-1.5 text-xs text-slate-400 leading-relaxed"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {lang === "ar"
          ? "تحقّق من اتصالك ثم حاول مرة أخرى."
          : "Check your connection and give it another try."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="lx-press mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold ring-1 ring-white/15 shadow-[0_8px_20px_-8px_rgba(124,58,237,0.7)] hover:brightness-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
      >
        <RefreshCw size={12} aria-hidden />
        {lang === "ar" ? "حاول مجددًا" : "Try again"}
      </button>
    </div>
  );
}

function EmptyRoomState({ lang }: { lang: "en" | "ar" }) {
  return (
    <div className="my-10 mx-auto max-w-md text-center">
      <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] p-7 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-purple-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl"
        />

        <div className="relative">
          <div className="relative mx-auto h-14 w-14 mb-4">
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/50 to-indigo-500/50 blur-xl"
            />
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-1 ring-white/15 shadow-[0_12px_30px_-10px_rgba(124,58,237,0.7)]">
              <MessageCircle
                size={22}
                className="text-white"
                aria-hidden
              />
            </div>
          </div>

          <h2 className="text-base font-bold text-white">
            {lang === "ar"
              ? "كن أول من يبدأ المحادثة"
              : "Be the first to break the ice"}
          </h2>
          <p
            className="mt-2 text-sm text-slate-400 leading-relaxed"
            dir={lang === "ar" ? "rtl" : "ltr"}
          >
            {lang === "ar"
              ? "ابدأ بتحية بسيطة، أو شارك سؤالًا، أو أرسل ملاحظة صوتية لتدفع المحادثة."
              : "Say hi, share a question, or send a voice note to get the conversation started."}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 ring-1 ring-purple-400/25 text-purple-200">
              <Sparkles size={11} aria-hidden />
              {lang === "ar" ? "حيِّ الجميع" : "Greet everyone"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 ring-1 ring-cyan-400/25 text-cyan-200">
              <Lightbulb size={11} aria-hidden />
              {lang === "ar" ? "اطرح سؤالًا" : "Ask a question"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/25 text-emerald-200">
              <Mic size={11} aria-hidden />
              {lang === "ar" ? "أرسل صوتية" : "Send a voice note"}
            </span>
          </div>

          <p className="mt-5 text-[11px] text-slate-500 leading-relaxed">
            {lang === "ar"
              ? "💡 تذكير: استخدم الإنجليزية فقط للحصول على أفضل ممارسة."
              : "💡 Reminder: keep it English-only for the best practice."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ToolPill({
  children,
  icon,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  tone: "purple" | "amber" | "cyan" | "rose";
}) {
  const toneClasses: Record<typeof tone, string> = {
    purple:
      "bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 ring-purple-400/25 shadow-[0_6px_16px_-8px_rgba(168,85,247,0.6)]",
    amber:
      "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 ring-amber-400/25 shadow-[0_6px_16px_-8px_rgba(251,191,36,0.5)]",
    cyan: "bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 ring-cyan-400/25 shadow-[0_6px_16px_-8px_rgba(34,211,238,0.5)]",
    rose: "bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 ring-rose-400/25 shadow-[0_6px_16px_-8px_rgba(244,63,94,0.5)]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ring-1 backdrop-blur-xl ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}
