import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchMyFeedback, type FeedbackReport } from "@/lib/chat-api";

interface MyFeedbackModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomSlug: string;
  lang: "en" | "ar";
}

const COPY = {
  en: {
    title: "My Feedback",
    subtitle: "Private feedback based on your messages in this room.",
    loading: "Generating your feedback...",
    errorTitle: "Couldn't generate feedback",
    errorBody: "Please try again in a moment.",
    timeoutBody: "The request took too long. Please try again.",
    retry: "Try again",
    close: "Close",
    closeAria: "Close feedback panel",
    summaryLabel: "Summary",
    mistakesLabel: "Common Mistakes",
    vocabLabel: "Vocabulary Suggestions",
    fluencyLabel: "Fluency & Naturalness",
    tipsLabel: "Practical Tips",
    voiceLabel: "Voice Messages",
  },
  ar: {
    title: "تقييمي",
    subtitle: "تقييم خاص بناءً على رسائلك في هذه الغرفة.",
    loading: "جاري إعداد تقييمك...",
    errorTitle: "تعذّر إنشاء التقييم",
    errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
    timeoutBody: "استغرق الطلب وقتاً طويلاً. يرجى المحاولة مرة أخرى.",
    retry: "أعد المحاولة",
    close: "إغلاق",
    closeAria: "إغلاق لوحة التقييم",
    summaryLabel: "الملخص",
    mistakesLabel: "الأخطاء الشائعة",
    vocabLabel: "اقتراحات المفردات",
    fluencyLabel: "الطلاقة والطبيعية",
    tipsLabel: "نصائح عملية",
    voiceLabel: "الرسائل الصوتية",
  },
} as const;

type FeedbackState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: FeedbackReport }
  | { status: "error"; message: string };

function Section({
  icon,
  label,
  items,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  tone: "purple" | "emerald" | "amber" | "cyan" | "rose";
}) {
  if (items.length === 0) return null;
  const toneMap = {
    purple: "text-purple-300 bg-purple-500/10 ring-purple-400/25",
    emerald: "text-emerald-300 bg-emerald-500/10 ring-emerald-400/25",
    amber: "text-amber-300 bg-amber-500/10 ring-amber-400/25",
    cyan: "text-cyan-300 bg-cyan-500/10 ring-cyan-400/25",
    rose: "text-rose-300 bg-rose-500/10 ring-rose-400/25",
  };
  const dotColor = {
    purple: "bg-purple-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    cyan: "bg-cyan-400",
    rose: "bg-rose-400",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg ring-1",
            toneMap[tone],
          )}
        >
          {icon}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
      </div>
      <ul className="space-y-1.5 ps-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-slate-200 leading-relaxed">
            <span className={cn("mt-2 h-1.5 w-1.5 rounded-full shrink-0", dotColor[tone])} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MyFeedbackModal({
  open,
  onOpenChange,
  roomSlug,
  lang,
}: MyFeedbackModalProps) {
  const [state, setState] = useState<FeedbackState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const t = COPY[lang];

  function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: "loading" });
    fetchMyFeedback(roomSlug, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "success", data: r.report });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        const raw = err instanceof Error ? err.message : "error";
        const message = raw.includes("timeout") ? t.timeoutBody : t.errorBody;
        setState({ status: "error", message });
      });
  }

  useEffect(() => {
    if (open) {
      run();
    } else {
      abortRef.current?.abort();
      setState({ status: "idle" });
    }
    return () => abortRef.current?.abort();
  }, [open, roomSlug]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col",
            "inset-x-0 bottom-0 max-h-[85vh] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[80vh] sm:w-full sm:max-w-lg",
            "rounded-t-3xl sm:rounded-3xl",
            "bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 backdrop-blur-2xl",
            "ring-1 ring-white/15",
            "shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9),0_10px_30px_-10px_rgba(124,58,237,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=closed]:zoom-out-95",
          )}
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 ring-1 ring-purple-400/30 text-purple-300">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-[15px] font-bold text-white leading-tight">
                  {t.title}
                </DialogPrimitive.Title>
                <p className="text-[11px] text-slate-400 mt-0.5">{t.subtitle}</p>
              </div>
            </div>
            <DialogPrimitive.Close
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition"
              aria-label={t.closeAria}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {state.status === "loading" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
                <div className="mt-3 text-[13px] text-slate-300">{t.loading}</div>
              </div>
            )}

            {state.status === "error" && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="text-[14px] font-semibold text-white">{t.errorTitle}</div>
                <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-400">
                  {state.message}
                </p>
                <button
                  type="button"
                  onClick={run}
                  className={cn(
                    "mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold",
                    "bg-white/[0.06] ring-1 ring-white/10 text-slate-100 transition-colors",
                    "hover:bg-white/[0.12] hover:text-white",
                  )}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t.retry}
                </button>
              </div>
            )}

            {state.status === "success" && (
              <div className="space-y-5">
                <div
                  className={cn(
                    "rounded-2xl border border-purple-400/20 bg-purple-500/[0.06] px-4 py-3",
                    "text-[13.5px] leading-relaxed text-purple-50",
                  )}
                  dir="auto"
                >
                  {state.data.summary}
                </div>

                <Section
                  icon={<AlertTriangle className="h-3 w-3" />}
                  label={t.mistakesLabel}
                  items={state.data.commonMistakes}
                  tone="rose"
                />
                <Section
                  icon={<Sparkles className="h-3 w-3" />}
                  label={t.vocabLabel}
                  items={state.data.vocabularySuggestions}
                  tone="emerald"
                />
                <Section
                  icon={<MessageSquareText className="h-3 w-3" />}
                  label={t.fluencyLabel}
                  items={state.data.fluencySuggestions}
                  tone="cyan"
                />
                <Section
                  icon={<Lightbulb className="h-3 w-3" />}
                  label={t.tipsLabel}
                  items={state.data.practicalTips}
                  tone="amber"
                />

                {state.data.voiceNote && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 ring-1 ring-white/10 px-3 py-2.5">
                    <Mic className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-[12px] text-slate-300">{state.data.voiceNote}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold",
                    "bg-white/[0.06] ring-1 ring-white/10 text-slate-100 transition-colors",
                    "hover:bg-white/[0.12] hover:text-white",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t.close}
                </button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
