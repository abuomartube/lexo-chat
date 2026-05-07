import { useState, useEffect, useRef, useCallback } from "react";
import { useDictionary } from "@/hooks/useDictionary";
import { useTranslation } from "@/hooks/useTranslation";
import { AudioButton } from "@/components/AudioButton";
import { LevelBadge } from "@/components/LevelBadge";
import type { OxfordWord } from "@/data/oxford-words";
import { levelColors } from "@/data/oxford-words";
import { Loader2, RefreshCw, Volume2 } from "lucide-react";
import {
  getTtsUrl,
  setActiveTtsAudio,
  getActiveTtsAudio,
  stopActiveTtsAudio,
  getCachedBlobUrl,
  prefetchTts,
} from "@/lib/tts";

interface FlashcardProps {
  wordData: OxfordWord;
  onNext: () => void;
  onPrev: () => void;
  cardIndex: number;
  total: number;
}

function ExampleSpeakButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (text) prefetchTts(text);
  }, [text]);

  const stop = useCallback(() => {
    tokenRef.current++;
    const current = audioRef.current;
    if (current) {
      current.onplaying = null;
      current.onended = null;
      current.onerror = null;
      current.pause();
      current.src = "";
      audioRef.current = null;
    }
    if (getActiveTtsAudio() === current) setActiveTtsAudio(null);
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [text, stop]);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (state !== "idle") {
      stop();
      return;
    }

    const myToken = ++tokenRef.current;
    const cached = getCachedBlobUrl(text);
    setState(cached ? "playing" : "loading");

    try {
      let src = cached;
      if (!src) {
        const result = await prefetchTts(text);
        if (tokenRef.current !== myToken) return;
        src = result ?? getTtsUrl(text);
      }

      const audio = new Audio(src);
      audio.preload = "auto";

      if (tokenRef.current !== myToken) {
        return;
      }
      audioRef.current = audio;
      setActiveTtsAudio(audio, () => {
        if (tokenRef.current === myToken) {
          setState("idle");
          audioRef.current = null;
        }
      });

      audio.onplaying = () => {
        if (tokenRef.current === myToken) setState("playing");
      };
      audio.onended = () => {
        if (tokenRef.current !== myToken) return;
        setState("idle");
        if (getActiveTtsAudio() === audio) setActiveTtsAudio(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        if (tokenRef.current !== myToken) return;
        setState("idle");
        if (getActiveTtsAudio() === audio) setActiveTtsAudio(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      if (tokenRef.current === myToken) {
        setState("idle");
        if (audioRef.current && getActiveTtsAudio() === audioRef.current) {
          setActiveTtsAudio(null);
        }
        audioRef.current = null;
      }
    }
  };

  const speaking = state !== "idle";

  return (
    <button
      onClick={handleSpeak}
      aria-label="Hear example sentence"
      className={`
        inline-flex items-center justify-center w-8 h-8 rounded-full
        transition-all duration-200 flex-shrink-0 mt-0.5
        ${
          speaking
            ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white scale-110 shadow-md"
            : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60 hover:scale-110 active:scale-95"
        }
      `}
    >
      {state === "loading" ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Volume2 size={14} />
      )}
    </button>
  );
}

export function Flashcard({
  wordData,
  onNext,
  onPrev,
  cardIndex,
  total,
}: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const { word, level } = wordData;
  const colors = levelColors[level];

  const { lookup, phonetic, primaryExample, partOfSpeech, loading, error } =
    useDictionary();
  const {
    translate,
    getTranslation,
    isLoading: translating,
  } = useTranslation();

  const prevWordRef = useRef<string>("");

  useEffect(() => {
    if (prevWordRef.current === word) return;
    prevWordRef.current = word;
    setFlipped(false);
    setAnimating(false);
    lookup(word);
  }, [word, lookup]);

  useEffect(() => {
    if (flipped) {
      translate(word);
      if (primaryExample) translate(primaryExample);
    }
  }, [flipped, word, primaryExample, translate]);

  useEffect(() => {
    if (primaryExample) prefetchTts(primaryExample);
  }, [primaryExample]);

  const handleFlip = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setFlipped((f) => !f);
    setTimeout(() => setAnimating(false), 600);
  }, [animating]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopActiveTtsAudio();
    setFlipped(false);
    setTimeout(onNext, 50);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopActiveTtsAudio();
    setFlipped(false);
    setTimeout(onPrev, 50);
  };

  const wordTranslation = getTranslation(word);
  const exampleTranslation = primaryExample
    ? getTranslation(primaryExample)
    : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-2xl mx-auto select-none">
      {/* Top row: counter only — CEFR badge is now anchored inside
          each card face (top-corner) per the redesign brief. */}
      <div className="flex items-center justify-end w-full px-1">
        <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums">
          {cardIndex + 1} / {total}
        </span>
      </div>

      <div
        className="w-full cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={handleFlip}
        role="button"
        aria-label={flipped ? "Click to see word" : "Click to reveal answer"}
      >
        <div
          className="relative w-full"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
            // Mobile-first responsive height — clamp keeps the card
            // generous on phones without exploding on desktop.
            height: "clamp(360px, 62vh, 460px)",
          }}
        >
          {/* ─────────────── FRONT ─────────────── */}
          <div
            className="absolute inset-0 rounded-3xl shadow-2xl"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
              zIndex: flipped ? 0 : 1,
            }}
          >
            <div
              className={`relative w-full h-full rounded-3xl bg-gradient-to-br ${colors.bg} overflow-hidden`}
            >
              {/* Ambient glow — softened (less visual noise) */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
                <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              </div>

              {/* CEFR badge — top corner only */}
              <div className="absolute top-4 left-4 z-20">
                <LevelBadge level={level} size="sm" />
              </div>

              {/* Centered hero content. Word is the dominant element;
                  part-of-speech sits small + uppercase above; phonetic +
                  audio sit subtly below. */}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6 py-12">
                {loading ? (
                  <Loader2 size={36} className="text-white/80 animate-spin" />
                ) : (
                  <>
                    {partOfSpeech && (
                      <p className="text-white/75 text-[11px] sm:text-xs uppercase tracking-[0.28em] font-semibold mb-3">
                        {partOfSpeech}
                      </p>
                    )}
                    <p
                      lang="en"
                      dir="ltr"
                      className="font-bold text-white tracking-tight drop-shadow-md leading-[1.05] break-words max-w-full"
                      style={{
                        // Responsive clamp — large on mobile, larger on
                        // desktop, but never overflows the card.
                        fontSize: "clamp(2.75rem, 11vw, 5rem)",
                      }}
                    >
                      {word}
                    </p>
                    {phonetic && (
                      <p className="mt-3 text-white/85 text-base sm:text-lg font-light italic">
                        {phonetic}
                      </p>
                    )}
                    <div className="mt-5 flex items-center justify-center gap-2.5">
                      <AudioButton
                        text={word}
                        size="sm"
                        label={`Hear ${word}`}
                        className="!bg-white/20 hover:!bg-white/35 !text-white !border-none !shadow-none"
                      />
                      <span className="text-white/75 text-[11px] font-medium bg-white/15 px-2 py-0.5 rounded-full">
                        British
                      </span>
                    </div>
                    {error && (
                      <p className="mt-3 text-white/60 text-xs">
                        Audio not available
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="absolute bottom-3 right-4 opacity-25 pointer-events-none">
                <RefreshCw size={18} className="text-white" />
              </div>
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/45 text-[11px] tracking-wide">
                Tap to flip
              </p>
            </div>
          </div>

          {/* ─────────────── BACK ─────────────── */}
          <div
            className="absolute inset-0 rounded-3xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              zIndex: flipped ? 1 : 0,
            }}
          >
            <div className="relative w-full h-full flex flex-col rounded-3xl overflow-hidden">
              {/* CEFR badge — top corner only (mirror of front) */}
              <div className="absolute top-4 right-4 z-10">
                <LevelBadge level={level} size="sm" />
              </div>

              {/* Scrollable content area; flex-1 so footer stays pinned */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 pb-4 flex flex-col gap-5">
                {/* Compact word header (LTR) — leaves room for badge */}
                <div className="pr-16" dir="ltr">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3
                      lang="en"
                      className={`text-2xl sm:text-3xl font-bold ${colors.text} dark:text-white leading-tight`}
                    >
                      {word}
                    </h3>
                    <AudioButton
                      text={word}
                      size="sm"
                      label={`Hear ${word}`}
                    />
                    {partOfSpeech && (
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-semibold">
                        {partOfSpeech}
                      </span>
                    )}
                  </div>
                  {phonetic && (
                    <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm italic">
                      {phonetic}
                    </p>
                  )}
                </div>

                {/* Arabic meaning — centered, dominant, RTL */}
                <div className="text-center px-2">
                  {wordTranslation ? (
                    <p
                      dir="rtl"
                      lang="ar"
                      className="font-bold text-gray-900 dark:text-gray-50"
                      style={{
                        fontSize: "clamp(1.5rem, 6vw, 2.125rem)",
                        lineHeight: 1.7,
                        fontFamily:
                          "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif",
                      }}
                    >
                      {wordTranslation}
                    </p>
                  ) : translating(word) ? (
                    <div className="inline-flex items-center gap-2 text-gray-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">Translating…</span>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">
                      Translation unavailable
                    </p>
                  )}
                </div>

                {/* Example block — English then Arabic, with consistent
                    spacing and proper directional containers. */}
                {primaryExample && (
                  <div className="space-y-2.5 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-gray-400 dark:text-gray-500">
                      Example
                    </p>
                    <div
                      dir="ltr"
                      className="bg-gray-50 dark:bg-gray-800/70 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <p
                          lang="en"
                          className="flex-1 text-gray-800 dark:text-gray-100 text-[15px] sm:text-base leading-relaxed italic text-left"
                        >
                          &quot;{primaryExample}&quot;
                        </p>
                        <ExampleSpeakButton text={primaryExample} />
                      </div>
                    </div>

                    {exampleTranslation ? (
                      <p
                        dir="rtl"
                        lang="ar"
                        className="text-[15px] sm:text-base text-gray-800 dark:text-gray-100 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-3"
                        style={{
                          lineHeight: 2,
                          fontFamily:
                            "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif",
                        }}
                      >
                        {exampleTranslation}
                      </p>
                    ) : translating(primaryExample) ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-sm">Translating…</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Pinned footer — never floats over content */}
              <p className="shrink-0 py-2.5 text-center text-gray-400 dark:text-gray-600 text-[11px] border-t border-gray-100 dark:border-gray-800">
                Tap to flip back
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls — unchanged behavior, lightly tightened spacing for
          mobile (smaller gaps + tap-friendly padding). */}
      <div className="flex items-center gap-2.5 sm:gap-5 mt-1 w-full justify-center">
        <button
          onClick={handlePrev}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
        >
          ← Previous
        </button>

        <button
          onClick={handleFlip}
          className={`px-5 sm:px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r ${colors.bg} hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg`}
        >
          {flipped ? "Show Word" : "Reveal Answer"}
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
