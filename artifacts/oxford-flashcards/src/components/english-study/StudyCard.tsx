import { useEffect, useState } from "react";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import type { EnglishVocabWord } from "@workspace/api-client-react";
import { AudioButton } from "@/components/AudioButton";

// Phase E4 — single flashcard surface used inside StudySession.
// Two-step UX: (1) prompt with audio, student decides whether they know it,
// (2) reveal Arabic + sentence + grade as Don't know / Know.
//
// Why two steps: confidence is more reliable when students self-test
// before peeking. Same loop popularized by Anki / Duolingo gem-grading.

type Lang = "en" | "ar";

interface StudyCardProps {
  word: EnglishVocabWord;
  index: number;
  total: number;
  lang: Lang;
  onGrade: (result: "correct" | "incorrect") => void;
  // The most recent attempt's outcome — drives a 700ms "+2 XP" / "Mastered!"
  // celebration overlay before the parent advances to the next card.
  feedback: "correct" | "incorrect" | "mastered" | null;
  disabled?: boolean;
}

export function StudyCard({
  word,
  index,
  total,
  lang,
  onGrade,
  feedback,
  disabled,
}: StudyCardProps) {
  const isAr = lang === "ar";
  const [revealed, setRevealed] = useState(false);

  // Reset reveal state when we land on a new word.
  useEffect(() => {
    setRevealed(false);
  }, [word.id]);

  const progressPct = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  return (
    <div className="relative">
      {/* Progress + index */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3 tabular-nums">
        <span data-testid="text-card-counter">
          {isAr ? `${index + 1} / ${total}` : `${index + 1} / ${total}`}
        </span>
        <span>{progressPct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
          data-testid="progress-session"
        />
      </div>

      {/* Card */}
      <div className="relative mt-5 rounded-3xl bg-card ring-1 ring-border/60 shadow-md overflow-hidden">
        {/* Soft top accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" />

        <div className="px-6 sm:px-10 pt-10 pb-8 min-h-[320px] flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-bold text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80">
              {word.level}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80">
              {word.pos}
            </span>
          </span>

          <div className="mt-5 flex items-center gap-3">
            <h2
              className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground"
              data-testid="text-word-english"
              dir="ltr"
            >
              {word.english}
            </h2>
            <AudioButton text={word.english} size="md" label="Play word" />
          </div>

          {word.sentenceEn && (
            <div className="mt-5 max-w-xl flex items-start gap-2 justify-center">
              <p
                className="text-[15px] leading-relaxed text-muted-foreground italic"
                data-testid="text-sentence-en"
                dir="ltr"
              >
                "{word.sentenceEn}"
              </p>
              <AudioButton
                text={word.sentenceEn}
                size="sm"
                label="Play example sentence"
                className="mt-0.5 shrink-0"
              />
            </div>
          )}

          {/* Reveal layer */}
          {revealed ? (
            <div className="mt-6 w-full max-w-xl rounded-2xl bg-gradient-to-br from-indigo-50/80 via-violet-50/60 to-sky-50/80 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-sky-950/40 ring-1 ring-indigo-200/60 dark:ring-indigo-900/50 px-5 py-4">
              {word.arabic && (
                <p
                  className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 leading-snug"
                  data-testid="text-word-arabic"
                  dir="rtl"
                  style={{ fontFamily: "Cairo, sans-serif" }}
                >
                  {word.arabic}
                </p>
              )}
              {word.sentenceAr && (
                <p
                  className="mt-2 text-sm text-indigo-700/90 dark:text-indigo-200/80 leading-relaxed"
                  data-testid="text-sentence-ar"
                  dir="rtl"
                  style={{ fontFamily: "Cairo, sans-serif" }}
                >
                  {word.sentenceAr}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              data-testid="button-reveal"
              className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold shadow hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Eye size={16} />
              {isAr ? "اكشف الترجمة" : "Reveal translation"}
            </button>
          )}
        </div>

        {/* Action footer (only when revealed) */}
        {revealed && (
          <div className="border-t border-border/60 px-5 sm:px-6 py-4 grid grid-cols-2 gap-3 bg-muted/30">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onGrade("incorrect")}
              data-testid="button-grade-incorrect"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200 ring-1 ring-rose-200/70 dark:ring-rose-900/60 px-4 py-3 text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={16} />
              {isAr ? "لم أعرفها" : "Don't know"}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onGrade("correct")}
              data-testid="button-grade-correct"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white ring-1 ring-emerald-700/30 px-4 py-3 text-sm font-bold hover:bg-emerald-700 shadow hover:shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              {isAr ? "أعرفها" : "Know it"}
            </button>
          </div>
        )}

        {/* Celebration overlay */}
        {feedback && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-200"
            data-testid={`feedback-${feedback}`}
          >
            <div
              className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl backdrop-blur shadow-xl ring-1 ${
                feedback === "incorrect"
                  ? "bg-rose-500/90 text-white ring-rose-400/40"
                  : feedback === "mastered"
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-amber-300/40"
                    : "bg-emerald-500/90 text-white ring-emerald-400/40"
              }`}
            >
              {feedback === "incorrect" ? (
                <>
                  <X size={28} />
                  <span className="text-sm font-extrabold">
                    {isAr ? "سنراجعها قريبًا" : "We'll review it soon"}
                  </span>
                </>
              ) : feedback === "mastered" ? (
                <>
                  <Check size={28} />
                  <span className="text-sm font-extrabold">
                    {isAr ? "أُتقنت! +25 خبرة" : "Mastered! +25 XP"}
                  </span>
                </>
              ) : (
                <>
                  <Check size={28} />
                  <span className="text-sm font-extrabold">
                    {isAr ? "ممتاز! +2 خبرة" : "Nice! +2 XP"}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
