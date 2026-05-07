import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Inbox, MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { fetchDmThreads } from "@/lib/chat-api";

export default function ChatMessagesPage() {
  const { lang } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dm-threads"],
    queryFn: fetchDmThreads,
    refetchInterval: 15000,
  });

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
      <main className="relative max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-purple-300 text-sm mb-4 font-semibold"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />{" "}
          {lang === "ar" ? "رجوع للغرف" : "Back to rooms"}
        </Link>
        <h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2.5 text-white">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_8px_22px_-6px_rgba(124,58,237,0.7)]">
            <MessageCircle size={18} className="text-white" />
          </span>
          {lang === "ar" ? "الرسائل" : "Messages"}
        </h1>
        {isLoading && (
          <div className="rounded-[20px] bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 p-10 flex justify-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
            <Loader2 className="animate-spin text-purple-300" size={26} />
          </div>
        )}
        {error && (
          <div className="rounded-[20px] bg-red-500/10 backdrop-blur-xl ring-1 ring-red-400/30 p-4 text-sm text-red-300">
            {(error as Error).message}
          </div>
        )}
        {data && data.threads.length === 0 && (
          <div className="rounded-[20px] bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 p-10 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
            <Inbox size={36} className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm text-slate-300">
              {lang === "ar"
                ? "لا توجد محادثات خاصة بعد. افتح ملف مستخدم وابدأ محادثة."
                : "No direct messages yet. Open a user's profile to start one."}
            </p>
          </div>
        )}
        <ul className="space-y-3">
          {(data?.threads ?? []).map((t) => (
            <li key={t.id}>
              <Link
                href={`/chat/dm/${t.id}`}
                className="block rounded-[20px] bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 hover:ring-purple-400/40 hover:bg-white/[0.08] p-4 transition shadow-[0_14px_36px_-16px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-[0_8px_22px_-6px_rgba(124,58,237,0.6)] ring-2 ring-white/10">
                    {t.otherUserName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-white">
                      {t.otherUserName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {t.preview?.kind === "voice"
                        ? lang === "ar" ? "🎙️ رسالة صوتية" : "🎙️ Voice note"
                        : t.preview?.kind === "image"
                          ? lang === "ar" ? "🖼️ صورة" : "🖼️ Image"
                          : (t.preview?.body ??
                            (lang === "ar" ? "بدء محادثة" : "Start chatting"))}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(t.lastActivityAt).toLocaleDateString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
