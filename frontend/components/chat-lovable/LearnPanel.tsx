import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  X,
  Languages,
  SpellCheck2,
  Lightbulb,
  Volume2,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bookmark,
  Check,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  correctMessage,
  translateMessage,
  explainMessage,
  saveAiNote,
  type CorrectionResult,
  type TranslationResult,
  type ExplanationResult,
  type SaveNotePayload,
} from "@/lib/chat-api";

export type LearnActionKind = "translate" | "correct" | "explain" | "pronounce";

interface LearnPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: LearnActionKind | null;
  messageText: string;
  lang: "en" | "ar";
}

const COPY = {
  en: {
    titles: {
      translate: "Translate",
      correct: "Correct",
      explain: "Explain",
      pronounce: "Pronounce",
    },
    subtitles: {
      translate: "Get an instant, natural translation of this message.",
      correct: "See a corrected version with grammar and word-choice fixes.",
      explain: "Understand the meaning, tone, and key vocabulary used here.",
      pronounce: "Listen to a native-style pronunciation of this message.",
    },
    sourceLabel: "Original message",
    previewLabel: "Preview",
    comingSoonTitle: "Coming soon",
    comingSoonBody:
      "We're polishing this learning helper. It will be available in the next update.",
    saveNote: "Save to My Notes",
    saving: "Saving...",
    saved: "Saved",
    saveFailed: "Couldn't save. Try again.",
    dailyLimitTitle: "Daily limit reached",
    dailyLimitBody: "You reached your daily AI limit. Please try again tomorrow.",
    closeAria: "Close panel",
    close: "Close",
    correct: {
      loading: "Checking your sentence...",
      errorTitle: "Couldn't check this sentence",
      errorBody: "Please try again in a moment.",
      timeoutBody: "The request took too long. Please try again.",
      retry: "Try again",
      alreadyCorrectTitle: "Already correct",
      correctedLabel: "Corrected version",
      changesLabel: "Changes",
      explanationLabel: "Why",
      naturalLabel: "More natural",
      rateLimited: "Too many requests. Please wait a minute and try again.",
    },
    translate: {
      loading: "Translating...",
      errorTitle: "Couldn't translate this message",
      errorBody: "Please try again in a moment.",
      timeoutBody: "The request took too long. Please try again.",
      rateLimited: "Too many requests. Please wait a minute and try again.",
      retry: "Try again",
      translatedLabel: "Translation",
      detectedLabel: "Detected language",
      noteLabel: "Learner tip",
      langs: { en: "English", ar: "Arabic", other: "Other" },
    },
    explain: {
      loading: "Explaining...",
      errorTitle: "Couldn't explain this message",
      errorBody: "Please try again in a moment.",
      timeoutBody: "The request took too long. Please try again.",
      rateLimited: "Too many requests. Please wait a minute and try again.",
      retry: "Try again",
      meaningLabel: "Simple meaning",
      vocabLabel: "Key vocabulary",
      noteLabel: "Learner tip",
    },
  },
  ar: {
    titles: {
      translate: "ترجمة",
      correct: "تصحيح",
      explain: "شرح",
      pronounce: "نطق",
    },
    subtitles: {
      translate: "احصل على ترجمة فورية وطبيعية لهذه الرسالة.",
      correct: "اطّلع على نسخة مصحَّحة بقواعد ومفردات أفضل.",
      explain: "افهم المعنى والنبرة والمفردات الأساسية المستخدمة هنا.",
      pronounce: "استمع إلى نطق احترافي بأسلوب المتحدثين الأصليين.",
    },
    sourceLabel: "الرسالة الأصلية",
    previewLabel: "معاينة",
    comingSoonTitle: "قريباً",
    comingSoonBody:
      "نعمل على تحسين هذه الميزة التعليمية. ستكون متاحة في التحديث القادم.",
    saveNote: "حفظ في ملاحظاتي",
    saving: "جاري الحفظ...",
    saved: "تم الحفظ",
    saveFailed: "تعذّر الحفظ. حاول مجدداً.",
    dailyLimitTitle: "انتهى الحد اليومي",
    dailyLimitBody: "وصلت إلى الحد اليومي لاستخدام الذكاء الاصطناعي. حاول مرة أخرى غدًا.",
    closeAria: "إغلاق اللوحة",
    close: "إغلاق",
    correct: {
      loading: "جاري فحص جملتك...",
      errorTitle: "تعذّر فحص الجملة",
      errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
      timeoutBody: "استغرق الطلب وقتاً طويلاً. يرجى المحاولة مرة أخرى.",
      retry: "أعد المحاولة",
      alreadyCorrectTitle: "صحيحة بالفعل",
      correctedLabel: "النسخة المصحَّحة",
      changesLabel: "التغييرات",
      explanationLabel: "لماذا",
      naturalLabel: "صياغة أكثر طبيعية",
      rateLimited: "عدد كبير من الطلبات. انتظر دقيقة ثم حاول مجدداً.",
    },
    translate: {
      loading: "جاري الترجمة...",
      errorTitle: "تعذّرت ترجمة هذه الرسالة",
      errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
      timeoutBody: "استغرق الطلب وقتاً طويلاً. يرجى المحاولة مرة أخرى.",
      rateLimited: "عدد كبير من الطلبات. انتظر دقيقة ثم حاول مجدداً.",
      retry: "أعد المحاولة",
      translatedLabel: "الترجمة",
      detectedLabel: "اللغة المكتشفة",
      noteLabel: "ملاحظة للمتعلم",
      langs: { en: "الإنجليزية", ar: "العربية", other: "أخرى" },
    },
    explain: {
      loading: "جاري الشرح...",
      errorTitle: "تعذّر شرح هذه الرسالة",
      errorBody: "يرجى المحاولة مرة أخرى بعد قليل.",
      timeoutBody: "استغرق الطلب وقتاً طويلاً. يرجى المحاولة مرة أخرى.",
      rateLimited: "عدد كبير من الطلبات. انتظر دقيقة ثم حاول مجدداً.",
      retry: "أعد المحاولة",
      meaningLabel: "المعنى المبسّط",
      vocabLabel: "مفردات أساسية",
      noteLabel: "ملاحظة للمتعلم",
    },
  },
} as const;

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveNoteButton({
  payload,
  lang,
}: {
  payload: SaveNotePayload;
  lang: "en" | "ar";
}) {
  const [state, setState] = useState<SaveState>("idle");
  const t = COPY[lang];

  const [noteXp, setNoteXp] = useState(0);

  async function handleSave() {
    if (state === "saving" || state === "saved") return;
    setState("saving");
    try {
      const r = await saveAiNote(payload);
      if (r.saved) {
        setState("saved");
        if (r.xpAwarded && r.xpAwarded > 0) setNoteXp(r.xpAwarded);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  const label =
    state === "saving"
      ? t.saving
      : state === "saved"
        ? t.saved
        : state === "error"
          ? t.saveFailed
          : t.saveNote;

  const icon =
    state === "saved" ? (
      <Check className="h-3.5 w-3.5" />
    ) : state === "saving" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : (
      <Bookmark className="h-3.5 w-3.5" />
    );

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={state === "saving" || state === "saved"}
        aria-live="polite"
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all",
          state === "saved"
            ? "bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-200 cursor-default"
            : state === "error"
              ? "bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200 hover:bg-rose-500/25"
              : "bg-white/[0.06] ring-1 ring-white/10 text-slate-100 hover:bg-white/[0.12] hover:text-white",
          (state === "saving" || state === "saved") && "pointer-events-none",
        )}
      >
        {icon}
        {label}
        {state === "saved" && noteXp > 0 && (
          <XpBadge xp={noteXp} lang={lang} />
        )}
      </button>
      {state === "saved" && (
        <a
          href={`${import.meta.env.BASE_URL}chat/notes`}
          className="inline-flex w-full items-center justify-center gap-1.5 text-[12px] font-semibold text-purple-300 hover:text-purple-200 transition py-1"
        >
          {lang === "ar" ? "عرض ملاحظاتي ←" : "View My Notes →"}
        </a>
      )}
    </div>
  );
}

function DailyLimitCard({ lang }: { lang: "en" | "ar" }) {
  const t = COPY[lang];
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-6 text-center"
    >
      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-400/30 text-amber-200">
        <Zap className="h-5 w-5" />
      </div>
      <div className="text-[14px] font-semibold text-white">
        {t.dailyLimitTitle}
      </div>
      <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-400">
        {t.dailyLimitBody}
      </p>
    </div>
  );
}

function XpBadge({ xp, lang }: { xp: number; lang: "en" | "ar" }) {
  if (xp <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
        "bg-amber-500/15 ring-1 ring-amber-400/30 text-amber-200",
        "text-[11.5px] font-bold tracking-wide",
        "animate-in fade-in-0 zoom-in-90 duration-300",
      )}
    >
      <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
      +{xp} XP
    </span>
  );
}

const ICONS: Record<LearnActionKind, React.ReactNode> = {
  translate: <Languages className="h-5 w-5" />,
  correct: <SpellCheck2 className="h-5 w-5" />,
  explain: <Lightbulb className="h-5 w-5" />,
  pronounce: <Volume2 className="h-5 w-5" />,
};

type DiffSegment =
  | { kind: "equal"; text: string }
  | { kind: "removed"; text: string }
  | { kind: "added"; text: string };

function diffWords(original: string, corrected: string): DiffSegment[] {
  const a = original.split(/(\s+)/);
  const b = corrected.split(/(\s+)/);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const raw: DiffSegment[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.push({ kind: "equal", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ kind: "added", text: b[j - 1] });
      j--;
    } else {
      raw.push({ kind: "removed", text: a[i - 1] });
      i--;
    }
  }
  raw.reverse();

  const merged: DiffSegment[] = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.kind === seg.kind) {
      last.text += seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

function InlineDiff({
  original,
  corrected,
}: {
  original: string;
  corrected: string;
}) {
  const segments = useMemo(
    () => diffWords(original, corrected),
    [original, corrected],
  );
  const hasChanges = segments.some((s) => s.kind !== "equal");
  if (!hasChanges) return null;

  return (
    <span className="inline leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.kind === "equal") {
          return (
            <span key={i} className="text-slate-300">
              {seg.text}
            </span>
          );
        }
        if (seg.kind === "removed") {
          return (
            <span
              key={i}
              className="rounded-sm bg-rose-500/20 px-0.5 text-rose-300 line-through decoration-rose-400/60"
            >
              {seg.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="rounded-sm bg-emerald-500/20 px-0.5 text-emerald-300 font-medium"
          >
            {seg.text}
          </span>
        );
      })}
    </span>
  );
}

type CorrectState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: CorrectionResult; xpAwarded: number }
  | { status: "error"; message: string }
  | { status: "daily_limit" };

function CorrectPanel({
  text,
  lang,
}: {
  text: string;
  lang: "en" | "ar";
}) {
  const [state, setState] = useState<CorrectState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const t = COPY[lang].correct;

  function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: "loading" });
    correctMessage(text, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "success", data: r.result, xpAwarded: r.xpAwarded ?? 0 });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        const raw = err instanceof Error ? err.message : "error";
        if (raw === "daily_limit_reached") {
          setState({ status: "daily_limit" });
          return;
        }
        const message =
          raw === "rate_limited"
            ? t.rateLimited
            : raw === "ai_timeout"
              ? t.timeoutBody
              : t.errorBody;
        setState({ status: "error", message });
      });
  }

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col items-center justify-center py-8 text-center"
      >
        <Loader2 className="h-7 w-7 animate-spin text-purple-300" />
        <div className="mt-3 text-[13px] text-slate-300">{t.loading}</div>
      </div>
    );
  }

  if (state.status === "daily_limit") {
    return <DailyLimitCard lang={lang} />;
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center justify-center py-6 text-center"
      >
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-[14px] font-semibold text-white">
          {t.errorTitle}
        </div>
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
    );
  }

  if (state.status === "success") {
    const { isAlreadyCorrect, corrected, explanation, naturalVersion } =
      state.data;
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        {state.xpAwarded > 0 && (
          <div className="flex justify-end">
            <XpBadge xp={state.xpAwarded} lang={lang} />
          </div>
        )}
        {isAlreadyCorrect && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-400/30 text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-[12.5px] font-semibold">
              {t.alreadyCorrectTitle}
            </span>
          </div>
        )}
        {!isAlreadyCorrect && (
          <>
            <div>
              <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t.changesLabel}
              </div>
              <div
                dir="auto"
                className={cn(
                  "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3",
                  "text-[14px] leading-relaxed",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                  "whitespace-pre-wrap break-words",
                )}
              >
                <InlineDiff original={text} corrected={corrected} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {t.correctedLabel}
              </div>
              <div
                dir="auto"
                className={cn(
                  "rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3",
                  "text-[14.5px] leading-relaxed text-emerald-50",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                  "whitespace-pre-wrap break-words",
                )}
              >
                {corrected}
              </div>
            </div>
          </>
        )}
        <div>
          <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t.explanationLabel}
          </div>
          <div
            dir="auto"
            className={cn(
              "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3",
              "text-[13.5px] leading-relaxed text-slate-200",
              "whitespace-pre-wrap break-words",
            )}
          >
            {explanation}
          </div>
        </div>
        {naturalVersion && naturalVersion.trim().length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-purple-300">
              <Sparkles className="h-3 w-3" />
              {t.naturalLabel}
            </div>
            <div
              dir="auto"
              className={cn(
                "rounded-2xl border border-purple-400/25 bg-purple-500/[0.07] px-4 py-3",
                "text-[14px] leading-relaxed text-purple-50",
                "whitespace-pre-wrap break-words",
              )}
            >
              {naturalVersion}
            </div>
          </div>
        )}
        <SaveNoteButton
          payload={{
            action: "correct",
            originalText: text,
            resultJson: JSON.stringify(state.data),
          }}
          lang={lang}
        />
      </div>
    );
  }

  return null;
}

type TranslateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: TranslationResult; xpAwarded: number }
  | { status: "error"; message: string }
  | { status: "daily_limit" };

function TranslatePanel({
  text,
  lang,
}: {
  text: string;
  lang: "en" | "ar";
}) {
  const [state, setState] = useState<TranslateState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const t = COPY[lang].translate;

  function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: "loading" });
    translateMessage(text, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "success", data: r.result, xpAwarded: r.xpAwarded ?? 0 });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        const raw = err instanceof Error ? err.message : "error";
        if (raw === "daily_limit_reached") {
          setState({ status: "daily_limit" });
          return;
        }
        const message =
          raw === "rate_limited"
            ? t.rateLimited
            : raw === "ai_timeout"
              ? t.timeoutBody
              : t.errorBody;
        setState({ status: "error", message });
      });
  }

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col items-center justify-center py-8 text-center"
      >
        <Loader2 className="h-7 w-7 animate-spin text-purple-300" />
        <div className="mt-3 text-[13px] text-slate-300">{t.loading}</div>
      </div>
    );
  }

  if (state.status === "daily_limit") {
    return <DailyLimitCard lang={lang} />;
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center justify-center py-6 text-center"
      >
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-[14px] font-semibold text-white">
          {t.errorTitle}
        </div>
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
    );
  }

  if (state.status === "success") {
    const { translatedText, detectedLanguage, learnerNote } = state.data;
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        {state.xpAwarded > 0 && (
          <div className="flex justify-end">
            <XpBadge xp={state.xpAwarded} lang={lang} />
          </div>
        )}
        <div>
          <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t.translatedLabel}
          </div>
          <div
            dir="auto"
            className={cn(
              "rounded-2xl border border-purple-400/25 bg-purple-500/[0.07] px-4 py-3",
              "text-[14.5px] leading-relaxed text-purple-50",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
              "whitespace-pre-wrap break-words",
            )}
          >
            {translatedText}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-slate-400">
          <span className="font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t.detectedLabel}:
          </span>
          <span className="rounded-full bg-white/[0.05] ring-1 ring-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
            {t.langs[detectedLanguage]}
          </span>
        </div>
        {learnerNote && learnerNote.trim().length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-purple-300">
              <Sparkles className="h-3 w-3" />
              {t.noteLabel}
            </div>
            <div
              dir="auto"
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3",
                "text-[13.5px] leading-relaxed text-slate-200",
                "whitespace-pre-wrap break-words",
              )}
            >
              {learnerNote}
            </div>
          </div>
        )}
        <SaveNoteButton
          payload={{
            action: "translate",
            originalText: text,
            resultJson: JSON.stringify(state.data),
          }}
          lang={lang}
        />
      </div>
    );
  }

  return null;
}

type ExplainState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ExplanationResult; xpAwarded: number }
  | { status: "error"; message: string }
  | { status: "daily_limit" };

function ExplainPanel({
  text,
  lang,
}: {
  text: string;
  lang: "en" | "ar";
}) {
  const [state, setState] = useState<ExplainState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const t = COPY[lang].explain;

  function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ status: "loading" });
    explainMessage(text, ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "success", data: r.result, xpAwarded: r.xpAwarded ?? 0 });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        const raw = err instanceof Error ? err.message : "error";
        if (raw === "daily_limit_reached") {
          setState({ status: "daily_limit" });
          return;
        }
        const message =
          raw === "rate_limited"
            ? t.rateLimited
            : raw === "ai_timeout"
              ? t.timeoutBody
              : t.errorBody;
        setState({ status: "error", message });
      });
  }

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col items-center justify-center py-8 text-center"
      >
        <Loader2 className="h-7 w-7 animate-spin text-purple-300" />
        <div className="mt-3 text-[13px] text-slate-300">{t.loading}</div>
      </div>
    );
  }

  if (state.status === "daily_limit") {
    return <DailyLimitCard lang={lang} />;
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center justify-center py-6 text-center"
      >
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-[14px] font-semibold text-white">
          {t.errorTitle}
        </div>
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
    );
  }

  if (state.status === "success") {
    const { simpleMeaning, keyVocabulary, learnerNote } = state.data;
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        {state.xpAwarded > 0 && (
          <div className="flex justify-end">
            <XpBadge xp={state.xpAwarded} lang={lang} />
          </div>
        )}
        <div>
          <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t.meaningLabel}
          </div>
          <div
            dir="auto"
            className={cn(
              "rounded-2xl border border-purple-400/25 bg-purple-500/[0.07] px-4 py-3",
              "text-[14.5px] leading-relaxed text-purple-50",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
              "whitespace-pre-wrap break-words",
            )}
          >
            {simpleMeaning}
          </div>
        </div>

        {keyVocabulary && keyVocabulary.length > 0 && (
          <div>
            <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {t.vocabLabel}
            </div>
            <ul className="space-y-1.5">
              {keyVocabulary.map((v, i) => (
                <li
                  key={`${v.word}-${i}`}
                  className={cn(
                    "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2",
                    "text-[13px] leading-relaxed text-slate-200",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                  )}
                >
                  <span
                    dir="auto"
                    className="font-semibold text-purple-200"
                  >
                    {v.word}
                  </span>
                  <span className="mx-1.5 text-slate-500">—</span>
                  <span dir="auto" className="text-slate-300">
                    {v.meaning}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {learnerNote && learnerNote.trim().length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-purple-300">
              <Sparkles className="h-3 w-3" />
              {t.noteLabel}
            </div>
            <div
              dir="auto"
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3",
                "text-[13.5px] leading-relaxed text-slate-200",
                "whitespace-pre-wrap break-words",
              )}
            >
              {learnerNote}
            </div>
          </div>
        )}
        <SaveNoteButton
          payload={{
            action: "explain",
            originalText: text,
            resultJson: JSON.stringify(state.data),
          }}
          lang={lang}
        />
      </div>
    );
  }

  return null;
}

function ComingSoon({ lang }: { lang: "en" | "ar" }) {
  const t = COPY[lang];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.08] via-indigo-500/[0.05] to-transparent",
        "px-5 py-6",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className={cn(
            "mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-purple-500/40 via-indigo-500/30 to-purple-600/30",
            "ring-1 ring-purple-300/30 text-purple-100",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_25px_-8px_rgba(124,58,237,0.55)]",
            "animate-pulse",
          )}
        >
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-[15px] font-bold tracking-tight text-white">
          {t.comingSoonTitle}
        </div>
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-slate-400">
          {t.comingSoonBody}
        </p>
      </div>
    </div>
  );
}

export function LearnPanel({
  open,
  onOpenChange,
  kind,
  messageText,
  lang,
}: LearnPanelProps) {
  const isMobile = useIsMobile();
  const t = COPY[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const safeKind: LearnActionKind = kind ?? "translate";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          dir={dir}
          aria-label={t.titles[safeKind]}
          className={cn(
            "fixed z-50 outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            isMobile
              ? cn(
                  "inset-x-0 bottom-0 max-h-[85vh] w-full",
                  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                  "duration-300",
                )
              : cn(
                  "left-1/2 top-1/2 w-[min(540px,92vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2",
                  "duration-200",
                ),
          )}
        >
          <div
            className={cn(
              "relative flex flex-col overflow-hidden",
              "border border-white/10 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-950/95",
              "shadow-[0_30px_80px_-20px_rgba(124,58,237,0.45),0_0_0_1px_rgba(255,255,255,0.04)]",
              "backdrop-blur-2xl",
              isMobile ? "rounded-t-3xl" : "rounded-3xl",
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-500/10 via-indigo-500/5 to-transparent" />
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/15 blur-3xl" />

            {isMobile && (
              <div className="relative z-10 flex justify-center pt-2.5">
                <div className="h-1.5 w-10 rounded-full bg-white/15" />
              </div>
            )}

            <div className="relative z-10 flex items-start gap-3 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  "bg-gradient-to-br from-purple-500/30 via-indigo-500/25 to-purple-600/20",
                  "ring-1 ring-purple-400/30 text-purple-100",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-6px_rgba(124,58,237,0.45)]",
                )}
              >
                {ICONS[safeKind]}
              </div>
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-[17px] font-bold leading-tight text-white">
                  {t.titles[safeKind]}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-0.5 text-[12.5px] leading-snug text-slate-400">
                  {t.subtitles[safeKind]}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label={t.closeAria}
                className={cn(
                  "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full",
                  "bg-white/[0.05] ring-1 ring-white/10 text-slate-300 transition-colors",
                  "hover:bg-white/10 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60",
                )}
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="mt-2">
                <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t.sourceLabel}
                </div>
                <div
                  dir="auto"
                  className={cn(
                    "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3",
                    "text-[14.5px] leading-relaxed text-slate-100",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                    "max-h-40 overflow-y-auto whitespace-pre-wrap break-words",
                  )}
                >
                  {messageText || "—"}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t.previewLabel}
                </div>
                {open && safeKind === "correct" && messageText.trim() ? (
                  <CorrectPanel text={messageText} lang={lang} />
                ) : open && safeKind === "translate" && messageText.trim() ? (
                  <TranslatePanel text={messageText} lang={lang} />
                ) : open && safeKind === "explain" && messageText.trim() ? (
                  <ExplainPanel text={messageText} lang={lang} />
                ) : (
                  <ComingSoon lang={lang} />
                )}
              </div>
            </div>

            <div
              className={cn(
                "relative z-10 flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3 sm:px-6",
                "bg-gradient-to-b from-transparent to-white/[0.02]",
              )}
            >
              <DialogPrimitive.Close
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold",
                  "bg-white/[0.05] ring-1 ring-white/10 text-slate-200 transition-all",
                  "hover:bg-white/[0.10] hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60",
                )}
              >
                {t.close}
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
