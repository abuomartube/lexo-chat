import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, RefreshCw, X } from "lucide-react";
import { fetchTopic } from "@/lib/chat-api";

const CATEGORIES: { key: string; en: string; ar: string }[] = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "travel", en: "Travel", ar: "السفر" },
  { key: "work", en: "Work", ar: "العمل" },
  { key: "daily", en: "Daily Life", ar: "الحياة اليومية" },
  { key: "ielts", en: "IELTS", ar: "آيلتس" },
  { key: "study", en: "Study", ar: "الدراسة" },
];

export default function TopicGenerator({
  lang = "en",
  onClose,
  onUseAsMessage,
}: {
  lang?: "en" | "ar";
  onClose: () => void;
  onUseAsMessage: (text: string) => void;
}) {
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<{ en: string; ar: string } | null>(null);

  async function load(category: string) {
    setLoading(true);
    try {
      const r = await fetchTopic(category);
      setTopic(r.topic);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while open so the modal anchors to the viewport
  // and the chat behind it doesn't drift the user away from where they were.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isAr = lang === "ar";
  const topicText = topic ? `${topic.en}${topic.ar ? `\n\n${topic.ar}` : ""}` : "";

  // Render via portal to document.body so any ancestor with `transform`,
  // `filter`, or `backdrop-blur` (the chat layout uses these) cannot trap
  // our fixed positioning. This guarantees the modal always shows in the
  // viewport — never above the user's current scroll position.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white p-5 shadow-2xl border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            🎯 {isAr ? "اختر موضوعًا" : "Choose Topic"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setCat(c.key);
                void load(c.key);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                cat === c.key
                  ? "bg-purple-500 text-white shadow"
                  : "bg-white/10 text-purple-100 hover:bg-white/20"
              }`}
              type="button"
            >
              {c.en}
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-black/30 p-5 min-h-[110px] flex items-center justify-center text-center border border-purple-500/20">
          {loading ? (
            <Loader2 className="animate-spin text-purple-300" size={24} />
          ) : topic ? (
            <div className="space-y-2 w-full">
              <p dir="ltr" className="text-base leading-relaxed font-medium">
                {topic.en}
              </p>
              {topic.ar && (
                <p
                  dir="rtl"
                  className="text-sm leading-relaxed text-purple-200/85 border-t border-purple-500/20 pt-2"
                >
                  {topic.ar}
                </p>
              )}
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => void load(cat)}
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-semibold"
          >
            <RefreshCw size={14} /> {isAr ? "موضوع جديد" : "New Topic"}
          </button>
          <button
            onClick={() => {
              if (topic) {
                onUseAsMessage(topicText);
                onClose();
              }
            }}
            type="button"
            disabled={!topic}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-600 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            ✨ {isAr ? "استخدمه" : "Use it"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
