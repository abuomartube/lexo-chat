import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Bookmark,
  SpellCheck2,
  Languages,
  Lightbulb,
  Trash2,
  Sparkles,
  FileText,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { fetchAiNotes, deleteAiNote, type AiNote } from "@/lib/chat-api";
import { cn } from "@/lib/utils";

const COPY = {
  en: {
    title: "My Learning Notes",
    subtitle: "Your saved AI corrections, translations, and explanations.",
    back: "Back",
    tabs: { all: "All", correct: "Corrections", translate: "Translations", explain: "Explanations" },
    badge: { correct: "Correct", translate: "Translate", explain: "Explain" },
    originalLabel: "Original",
    resultLabels: {
      correct: { corrected: "Corrected", explanation: "Why", natural: "More natural" },
      translate: { translated: "Translation", detected: "Detected", tip: "Learner tip" },
      explain: { meaning: "Simple meaning", vocab: "Key vocabulary", tip: "Learner tip" },
    },
    emptyTitle: "No notes yet",
    emptyBody: "When you use Correct, Translate, or Explain in chat, tap \"Save to My Notes\" to keep them here.",
    deleteConfirm: "Delete this note?",
    deleting: "Deleting...",
    errorTitle: "Couldn't load notes",
    errorBody: "Please try again in a moment.",
    loadingText: "Loading notes...",
  },
  ar: {
    title: "ملاحظاتي التعليمية",
    subtitle: "التصحيحات والترجمات والشروحات المحفوظة.",
    back: "رجوع",
    tabs: { all: "الكل", correct: "التصحيحات", translate: "الترجمات", explain: "الشروحات" },
    badge: { correct: "تصحيح", translate: "ترجمة", explain: "شرح" },
    originalLabel: "الأصل",
    resultLabels: {
      correct: { corrected: "المصحّح", explanation: "لماذا", natural: "أكثر طبيعية" },
      translate: { translated: "الترجمة", detected: "اللغة", tip: "ملاحظة للمتعلم" },
      explain: { meaning: "المعنى المبسّط", vocab: "مفردات أساسية", tip: "ملاحظة للمتعلم" },
    },
    emptyTitle: "لا توجد ملاحظات بعد",
    emptyBody: "عند استخدام التصحيح أو الترجمة أو الشرح في الدردشة، اضغط \"حفظ في ملاحظاتي\" للاحتفاظ بها هنا.",
    deleteConfirm: "حذف هذه الملاحظة؟",
    deleting: "جاري الحذف...",
    errorTitle: "تعذّر تحميل الملاحظات",
    errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
    loadingText: "جاري تحميل الملاحظات...",
  },
} as const;

type TabKey = "all" | "correct" | "translate" | "explain";

const TAB_KEYS: TabKey[] = ["all", "correct", "translate", "explain"];

const ACTION_ICON: Record<string, React.ReactNode> = {
  correct: <SpellCheck2 className="h-3.5 w-3.5" />,
  translate: <Languages className="h-3.5 w-3.5" />,
  explain: <Lightbulb className="h-3.5 w-3.5" />,
};

const ACTION_COLOR: Record<string, string> = {
  correct: "text-emerald-300 bg-emerald-500/15 ring-emerald-400/30",
  translate: "text-purple-300 bg-purple-500/15 ring-purple-400/30",
  explain: "text-amber-300 bg-amber-500/15 ring-amber-400/30",
};

function formatDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ParsedCorrect {
  corrected: string;
  explanation?: string;
  naturalVersion?: string;
  isAlreadyCorrect?: boolean;
}

interface ParsedTranslate {
  translatedText: string;
  detectedLanguage?: string;
  learnerNote?: string;
}

interface ParsedExplain {
  simpleMeaning: string;
  keyVocabulary?: { word: string; meaning: string }[];
  learnerNote?: string;
}

function CorrectCard({ data, lang }: { data: ParsedCorrect; lang: "en" | "ar" }) {
  const labels = COPY[lang].resultLabels.correct;
  if (data.isAlreadyCorrect) {
    return <p className="text-[13px] text-emerald-200 italic">{lang === "ar" ? "صحيحة بالفعل ✓" : "Already correct ✓"}</p>;
  }
  return (
    <div className="space-y-2">
      <div>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{labels.corrected}</span>
        <p dir="auto" className="mt-0.5 text-[13.5px] leading-relaxed text-emerald-100 whitespace-pre-wrap break-words">{data.corrected}</p>
      </div>
      {data.explanation && (
        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{labels.explanation}</span>
          <p dir="auto" className="mt-0.5 text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">{data.explanation}</p>
        </div>
      )}
      {data.naturalVersion && (
        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-purple-400">{labels.natural}</span>
          <p dir="auto" className="mt-0.5 text-[13px] leading-relaxed text-purple-200 whitespace-pre-wrap break-words">{data.naturalVersion}</p>
        </div>
      )}
    </div>
  );
}

function TranslateCard({ data, lang }: { data: ParsedTranslate; lang: "en" | "ar" }) {
  const labels = COPY[lang].resultLabels.translate;
  return (
    <div className="space-y-2">
      <div>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{labels.translated}</span>
        <p dir="auto" className="mt-0.5 text-[13.5px] leading-relaxed text-purple-100 whitespace-pre-wrap break-words">{data.translatedText}</p>
      </div>
      {data.detectedLanguage && (
        <p className="text-[11px] text-slate-500">{labels.detected}: {data.detectedLanguage}</p>
      )}
      {data.learnerNote && (
        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-purple-400">{labels.tip}</span>
          <p dir="auto" className="mt-0.5 text-[12.5px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">{data.learnerNote}</p>
        </div>
      )}
    </div>
  );
}

function ExplainCard({ data, lang }: { data: ParsedExplain; lang: "en" | "ar" }) {
  const labels = COPY[lang].resultLabels.explain;
  return (
    <div className="space-y-2">
      <div>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{labels.meaning}</span>
        <p dir="auto" className="mt-0.5 text-[13.5px] leading-relaxed text-amber-100 whitespace-pre-wrap break-words">{data.simpleMeaning}</p>
      </div>
      {data.keyVocabulary && data.keyVocabulary.length > 0 && (
        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{labels.vocab}</span>
          <ul className="mt-1 space-y-0.5">
            {data.keyVocabulary.map((v, i) => (
              <li key={i} className="text-[12.5px] text-slate-300">
                <span className="font-semibold text-white">{v.word}</span>
                {" — "}
                {v.meaning}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.learnerNote && (
        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-400">{labels.tip}</span>
          <p dir="auto" className="mt-0.5 text-[12.5px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">{data.learnerNote}</p>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  lang,
  onDelete,
  isDeleting,
}: {
  note: AiNote;
  lang: "en" | "ar";
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const t = COPY[lang];
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(note.resultJson);
  } catch { /* render raw */ }

  return (
    <div
      className={cn(
        "group relative rounded-[22px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]",
        "transition-all hover:border-white/[0.14] hover:bg-white/[0.05]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 text-[10.5px] font-bold uppercase tracking-[0.12em]", ACTION_COLOR[note.action])}>
          {ACTION_ICON[note.action]}
          {t.badge[note.action as keyof typeof t.badge]}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 tabular-nums">{formatDate(note.createdAt, lang)}</span>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            disabled={isDeleting}
            aria-label={t.deleteConfirm}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-full transition",
              "text-slate-500 hover:text-rose-300 hover:bg-rose-500/15",
              "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60",
              isDeleting && "pointer-events-none opacity-50",
            )}
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{t.originalLabel}</span>
        <p dir="auto" className="mt-0.5 text-[13.5px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">{note.originalText}</p>
      </div>

      <div className="border-t border-white/[0.06] pt-3">
        {note.action === "correct" && parsed ? (
          <CorrectCard data={parsed as ParsedCorrect} lang={lang} />
        ) : note.action === "translate" && parsed ? (
          <TranslateCard data={parsed as ParsedTranslate} lang={lang} />
        ) : note.action === "explain" && parsed ? (
          <ExplainCard data={parsed as ParsedExplain} lang={lang} />
        ) : (
          <pre className="text-[12px] text-slate-400 whitespace-pre-wrap break-words overflow-hidden">{note.resultJson}</pre>
        )}
      </div>
    </div>
  );
}

export default function ChatNotesPage() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const [tab, setTab] = useState<TabKey>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["chat-ai-notes"],
    queryFn: () => fetchAiNotes(),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAiNote,
    onMutate: async (id) => {
      setDeletingId(id);
      await queryClient.cancelQueries({ queryKey: ["chat-ai-notes"] });
      const prev = queryClient.getQueryData<{ notes: AiNote[] }>(["chat-ai-notes"]);
      if (prev) {
        queryClient.setQueryData(["chat-ai-notes"], {
          notes: prev.notes.filter((n) => n.id !== id),
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["chat-ai-notes"], ctx.prev);
    },
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["chat-ai-notes"] });
    },
  });

  const notes = (data?.notes ?? []).filter(
    (n: AiNote) => tab === "all" || n.action === tab,
  );

  const counts = {
    all: data?.notes?.length ?? 0,
    correct: data?.notes?.filter((n: AiNote) => n.action === "correct").length ?? 0,
    translate: data?.notes?.filter((n: AiNote) => n.action === "translate").length ?? 0,
    explain: data?.notes?.filter((n: AiNote) => n.action === "explain").length ?? 0,
  };

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
          className="inline-flex items-center gap-1 text-purple-300 text-sm mb-4 font-semibold hover:text-purple-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 rounded px-1"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {t.back}
        </Link>

        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-purple-600/15 via-indigo-600/10 to-slate-900/40 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(124,58,237,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-purple-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative px-5 py-6 sm:px-7 sm:py-7">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur px-2.5 py-1 ring-1 ring-white/10 text-[10.5px] font-bold uppercase tracking-[0.14em] text-purple-200">
              <Bookmark size={11} className="text-purple-300" />
              {lang === "ar" ? "ملاحظاتي" : "My Notes"}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-200 via-purple-200 to-indigo-200 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(168,85,247,0.4)]">
              {t.title}
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-300/85 max-w-md">
              {t.subtitle}
            </p>
          </div>
        </section>

        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-semibold ring-1 transition-all",
                tab === key
                  ? "bg-purple-500/20 ring-purple-400/40 text-purple-100 shadow-[0_4px_14px_-4px_rgba(124,58,237,0.45)]"
                  : "bg-white/[0.04] ring-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200",
              )}
            >
              {key === "all" ? <Sparkles size={12} /> : ACTION_ICON[key]}
              {t.tabs[key]}
              <span className={cn(
                "ml-0.5 text-[10px] tabular-nums rounded-full px-1.5 py-0.5",
                tab === key ? "bg-purple-400/20 text-purple-200" : "bg-white/[0.06] text-slate-500",
              )}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400 mb-3" />
            <p className="text-[13px] text-slate-400">{t.loadingText}</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200">
              <FileText className="h-5 w-5" />
            </div>
            <div className="text-[14px] font-semibold text-white">{t.errorTitle}</div>
            <p className="mt-1 text-[12.5px] text-slate-400">{t.errorBody}</p>
          </div>
        )}

        {!isLoading && !error && notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-purple-500/10 ring-1 ring-purple-400/25">
              <Bookmark className="h-7 w-7 text-purple-300" />
            </div>
            <h3 className="text-[16px] font-bold text-white">{t.emptyTitle}</h3>
            <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-slate-400">
              {t.emptyBody}
            </p>
            <Link
              href="/chat"
              className={cn(
                "mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold",
                "bg-purple-500/20 ring-1 ring-purple-400/30 text-purple-100",
                "hover:bg-purple-500/30 transition",
              )}
            >
              <Sparkles size={14} />
              {lang === "ar" ? "ابدأ الدردشة" : "Start Chatting"}
            </Link>
          </div>
        )}

        {!isLoading && !error && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note: AiNote) => (
              <NoteCard
                key={note.id}
                note={note}
                lang={lang}
                onDelete={(id) => deleteMut.mutate(id)}
                isDeleting={deletingId === note.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
