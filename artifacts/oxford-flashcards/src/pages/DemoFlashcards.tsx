import { useState, useCallback, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Moon, Sun, Sparkles, Lock } from "lucide-react";
import { Flashcard } from "@/components/Flashcard";
import { FilterBar } from "@/components/FilterBar";
import { useTheme } from "@/hooks/useTheme";
import {
  demoWords,
  demoWordsByLevel,
  DEMO_WORDS_PER_LEVEL,
} from "@/data/demo-words";
import type { CEFRLevel, OxfordWord } from "@/data/oxford-words";
import { prefetchTts, warmTtsBatch } from "@/lib/tts";
import lexoLogo from "@/assets/lexo-icon.png";

const arabicFont =
  '"Cairo", "Tajawal", "Segoe UI Arabic", system-ui, sans-serif';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function DemoFlashcards() {
  const { theme, toggle } = useTheme();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const [cardIndex, setCardIndex] = useState(0);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);

  const filteredWords = useMemo<OxfordWord[]>(() => {
    if (selectedLevel === "all") return demoWords;
    return demoWordsByLevel[selectedLevel].map((word) => ({
      word,
      level: selectedLevel,
    }));
  }, [selectedLevel]);

  const displayWords = useMemo<OxfordWord[]>(() => {
    if (isShuffled && shuffledIndices.length === filteredWords.length) {
      return shuffledIndices.map((i) => filteredWords[i]);
    }
    return filteredWords;
  }, [filteredWords, isShuffled, shuffledIndices]);

  const safeIndex = Math.min(cardIndex, Math.max(0, displayWords.length - 1));
  const currentWord = displayWords[safeIndex];

  // Reset card index when level changes
  useEffect(() => {
    setCardIndex(0);
    setIsShuffled(false);
    setShuffledIndices([]);
  }, [selectedLevel]);

  // Prefetch TTS for nearby words + warm batch for full deck
  useEffect(() => {
    if (!displayWords.length) return;
    const len = displayWords.length;
    const nextIdx = (safeIndex + 1) % len;
    const prevIdx = (safeIndex - 1 + len) % len;
    prefetchTts(displayWords[safeIndex]?.word);
    prefetchTts(displayWords[nextIdx]?.word);
    prefetchTts(displayWords[prevIdx]?.word);
    warmTtsBatch(displayWords.map((w) => w.word));
  }, [displayWords, safeIndex]);

  const handleNext = useCallback(() => {
    setCardIndex((i) => (i + 1) % displayWords.length);
  }, [displayWords.length]);

  const handlePrev = useCallback(() => {
    setCardIndex((i) => (i - 1 + displayWords.length) % displayWords.length);
  }, [displayWords.length]);

  const handleShuffle = useCallback(() => {
    const indices = filteredWords.map((_, i) => i);
    setShuffledIndices(shuffle(indices));
    setIsShuffled(true);
    setCardIndex(0);
  }, [filteredWords]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-violet-950/40 dark:to-gray-950 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 py-6 min-h-screen flex flex-col">
        <header className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-3 group"
            aria-label="Back to landing page"
          >
            <img
              src={lexoLogo}
              alt="Lexo for English logo"
              className="w-12 h-12 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <h1 className="text-xl font-extrabold tracking-tight">
                <span className="text-gray-900 dark:text-white">LEXO </span>
                <span className="text-gray-500 dark:text-gray-400 font-semibold">
                  for{" "}
                </span>
                <span className="bg-gradient-to-r from-violet-600 to-purple-700 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                  English
                </span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-orange-500 dark:text-amber-400 mt-0.5">
                Learn · Practice · Excel
              </p>
            </div>
          </Link>

          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {/* Demo banner */}
        <div className="mb-5 rounded-2xl border border-violet-200 dark:border-violet-700/50 bg-gradient-to-r from-violet-50 via-white to-orange-50/60 dark:from-violet-900/30 dark:via-gray-900/40 dark:to-amber-900/20 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Demo mode — {DEMO_WORDS_PER_LEVEL} sample words per level
              </p>
              <p
                dir="rtl"
                lang="ar"
                style={{ fontFamily: arabicFont }}
                className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              >
                وضع التجربة — {DEMO_WORDS_PER_LEVEL} كلمات لكل مستوى
              </p>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                You're previewing a tiny sample of LEXO. Register with an access
                code to unlock all{" "}
                <span className="font-bold text-violet-700 dark:text-violet-300">
                  2,988 Oxford words
                </span>
                , 75 word families, and the full learning platform.
              </p>
            </div>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition shrink-0"
            >
              <Lock size={12} />
              Get Access
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <FilterBar
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            onShuffle={handleShuffle}
            total={displayWords.length}
          />
        </div>

        <div className="flex-1 flex items-stretch mt-2">
          {currentWord ? (
            <Flashcard
              wordData={currentWord}
              onNext={handleNext}
              onPrev={handlePrev}
              cardIndex={safeIndex}
              total={displayWords.length}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              No words available
            </div>
          )}
        </div>

        {/* Mobile-only Get Access CTA */}
        <Link
          href="/"
          className="sm:hidden mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold shadow-md"
        >
          <Lock size={14} />
          Unlock Full Library
        </Link>
      </div>
    </div>
  );
}
