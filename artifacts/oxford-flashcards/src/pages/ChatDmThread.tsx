import { useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Loader2, Send, Mic } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  fetchDmMessages,
  sendDmText,
  sendDmAttachment,
  uploadFileAndGetPath,
  type DmMessage,
} from "@/lib/chat-api";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import VoicePlayer from "@/components/chat/VoicePlayer";

export default function ChatDmThreadPage() {
  const params = useParams() as { id: string };
  const threadId = params.id;
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [other, setOther] = useState<{ id: string; name: string } | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastTimeRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await fetchDmMessages(threadId);
        if (stop) return;
        setMessages(r.messages);
        setOther(r.otherUser);
        if (r.messages.length > 0) {
          lastTimeRef.current = r.messages[r.messages.length - 1].createdAt;
        }
        setLoading(false);
        requestAnimationFrame(() => {
          if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        });
      } catch (e) {
        toast({ title: (e as Error).message, variant: "destructive" });
        setLoading(false);
      }
    })();
    const id = window.setInterval(async () => {
      try {
        const r = await fetchDmMessages(
          threadId,
          lastTimeRef.current ?? undefined,
        );
        if (stop || r.messages.length === 0) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of r.messages) if (!seen.has(m.id)) merged.push(m);
          return merged;
        });
        lastTimeRef.current = r.messages[r.messages.length - 1].createdAt;
        requestAnimationFrame(() => {
          if (scrollRef.current)
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        });
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function handleSendText(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const r = await sendDmText(threadId, text);
      setMessages((m) => [...m, r.message]);
      lastTimeRef.current = r.message.createdAt;
      setInput("");
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
    const ext = clip.mime === "audio/mp4" ? "m4a" : "webm";
    const filename = `voice-${Date.now()}.${ext}`;
    const objectPath = await uploadFileAndGetPath(
      clip.blob,
      filename,
      clip.mime,
    );
    const r = await sendDmAttachment(threadId, "voice", {
      objectPath,
      mime: clip.mime,
      sizeBytes: clip.blob.size,
      audioDurationSec: clip.durationSec,
    });
    setMessages((m) => [...m, r.message]);
    lastTimeRef.current = r.message.createdAt;
    setRecording(false);
  }

  return (
    <div
      className="dark min-h-screen flex flex-col text-slate-100"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 60%, #02040e 100%)",
      }}
    >
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-slate-950/60 border-b border-white/10 px-3 sm:px-5 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/chat/messages")}
            className="p-2 rounded-full hover:bg-white/10 text-slate-200 transition"
            type="button"
            aria-label={lang === "ar" ? "رجوع" : "Back"}
          >
            <ArrowLeft size={18} className="rtl:rotate-180" />
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold ring-2 ring-white/10 shadow-[0_8px_18px_-6px_rgba(124,58,237,0.6)]">
            {(other?.name ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-white">
              {other?.name ?? "User"}
            </p>
            <p className="text-[11px] text-slate-400">
              {lang === "ar" ? "محادثة خاصة" : "Direct message"}
            </p>
          </div>
        </div>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 max-w-2xl w-full mx-auto"
      >
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-purple-300" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
            {lang === "ar"
              ? "ابدأ المحادثة بقول مرحباً 👋"
              : "Say hi to start the conversation 👋"}
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.senderId === user?.id;
          return (
            <div
              key={m.id}
              className={`flex my-2 ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] px-3.5 py-2 rounded-[20px] ${
                  isMine
                    ? "text-white rounded-br-md shadow-[0_10px_28px_-10px_rgba(124,58,237,0.65),inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "bg-white/[0.06] backdrop-blur-xl text-slate-100 ring-1 ring-white/10 rounded-bl-md shadow-[0_8px_22px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]"
                }`}
                style={
                  isMine
                    ? {
                        background:
                          "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
                      }
                    : undefined
                }
              >
                {m.deleted ? (
                  <span className="italic opacity-70 text-sm">
                    {lang === "ar" ? "تم حذف الرسالة" : "message deleted"}
                  </span>
                ) : m.kind === "text" ? (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.body}
                  </p>
                ) : m.kind === "voice" && m.attachmentUrl ? (
                  <VoicePlayer
                    src={m.attachmentUrl}
                    durationSec={m.audioDurationSec}
                    tone={isMine ? "self" : "other"}
                  />
                ) : m.kind === "image" && m.attachmentUrl ? (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                    <img
                      src={m.attachmentUrl}
                      alt=""
                      className="rounded-xl max-h-[260px]"
                    />
                  </a>
                ) : null}
                <div
                  className={`mt-1 text-[10px] ${
                    isMine ? "text-white/75 text-end" : "text-slate-400"
                  }`}
                >
                  {new Date(m.createdAt).toLocaleTimeString(
                    lang === "ar" ? "ar-EG" : "en-US",
                    { hour: "numeric", minute: "2-digit" },
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <footer className="sticky bottom-0 backdrop-blur-2xl bg-slate-950/70 border-t border-white/10 px-3 sm:px-5 py-2.5 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.7)]">
        <div className="max-w-2xl mx-auto">
          {recording ? (
            <VoiceRecorder
              onSend={handleSendVoice}
              onCancel={() => setRecording(false)}
            />
          ) : (
            <form onSubmit={handleSendText} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  lang === "ar" ? "اكتب رسالة..." : "Type a message…"
                }
                className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.05] backdrop-blur-xl ring-1 ring-white/10 focus:ring-2 focus:ring-purple-400/60 focus:outline-none text-sm text-slate-100 placeholder:text-slate-500"
                maxLength={2000}
              />
              {input.trim() ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-11 h-11 rounded-full text-white flex items-center justify-center disabled:opacity-50 transition hover:brightness-110 active:scale-95 shadow-[0_10px_24px_-6px_rgba(124,58,237,0.7)]"
                  style={{
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
                  }}
                  aria-label={lang === "ar" ? "إرسال" : "Send"}
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  className="w-11 h-11 rounded-full text-white flex items-center justify-center transition hover:brightness-110 active:scale-95 shadow-[0_10px_24px_-6px_rgba(124,58,237,0.7)]"
                  style={{
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
                  }}
                  aria-label={lang === "ar" ? "تسجيل ملاحظة صوتية" : "Record voice note"}
                >
                  <Mic size={18} />
                </button>
              )}
            </form>
          )}
        </div>
      </footer>
    </div>
  );
}
