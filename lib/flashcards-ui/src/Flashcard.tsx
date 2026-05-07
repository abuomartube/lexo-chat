import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetCard, getGetCardQueryKey, getCard } from "@workspace/api-client-react";
import { AudioButton } from "./AudioButton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "./lib/utils";
import { Lightbulb, Eye, Brain } from "lucide-react";
import type { Difficulty } from "./lib/studyStats";
import { sounds } from "./lib/sounds";

interface FlashcardProps {
  id: number;
  word: string;
  pos: string;
  level: string;
  isFlipped: boolean;
  onFlip: () => void;
  nextCardId?: number;
  mode?: "learning" | "challenge";
  onReveal?: () => void;
  onChallenge?: () => void;
  difficulty?: Difficulty;
}

const LEVEL_ACCENT: Record<
  string,
  { border: string; badge: string; arabic: string; chip: string; highlight: string }
> = {
  A1: {
    border: "hover:border-emerald-400/40",
    badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
    arabic: "text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-300",
    highlight: "text-emerald-300 bg-emerald-500/10",
  },
  A2: {
    border: "hover:border-sky-400/40",
    badge: "bg-sky-500/15 text-sky-300 border border-sky-400/20",
    arabic: "text-sky-300",
    chip: "bg-sky-500/15 text-sky-300",
    highlight: "text-sky-300 bg-sky-500/10",
  },
  B1: {
    border: "hover:border-amber-400/40",
    badge: "bg-amber-500/15 text-amber-300 border border-amber-400/20",
    arabic: "text-amber-300",
    chip: "bg-amber-500/15 text-amber-300",
    highlight: "text-amber-300 bg-amber-500/10",
  },
  B2: {
    border: "hover:border-rose-400/40",
    badge: "bg-rose-500/15 text-rose-300 border border-rose-400/20",
    arabic: "text-rose-300",
    chip: "bg-rose-500/15 text-rose-300",
    highlight: "text-rose-300 bg-rose-500/10",
  },
  C1: {
    border: "hover:border-violet-400/40",
    badge: "bg-violet-500/15 text-violet-200 border border-violet-400/30",
    arabic: "text-violet-200",
    chip: "bg-gradient-to-r from-violet-500/30 to-amber-500/30 text-violet-100 border border-violet-300/30",
    highlight: "text-amber-200 bg-violet-500/15",
  },
};

const POS_LABEL: Record<string, string> = {
  "n.": "noun",
  "v.": "verb",
  "adj.": "adjective",
  "adv.": "adverb",
  "prep.": "preposition",
  "pron.": "pronoun",
  "conj.": "conjunction",
  "det.": "determiner",
  "exclam.": "exclamation",
  "modal v.": "modal verb",
  "number": "number",
  "ordinal number": "ordinal number",
};

function highlightWord(sentence: string, word: string, className: string) {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(${escaped}(?:s|es|ed|ing|ly)?)\\b`, "gi");
  const parts: Array<string | { match: string; key: number }> = [];
  let lastIndex = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    if (m.index > lastIndex) parts.push(sentence.slice(lastIndex, m.index));
    parts.push({ match: m[0], key: i++ });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < sentence.length) parts.push(sentence.slice(lastIndex));
  return parts.map((p, idx) =>
    typeof p === "string" ? (
      <React.Fragment key={`t-${idx}`}>{p}</React.Fragment>
    ) : (
      <span
        key={`m-${p.key}-${idx}`}
        className={cn("px-1.5 py-0.5 rounded-md font-semibold", className)}
      >
        {p.match}
      </span>
    ),
  );
}

/** Replace the target word inside a sentence with a blank pattern of the same length. */
function blankWordInSentence(sentence: string, word: string) {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(${escaped}(?:s|es|ed|ing|ly)?)\\b`, "gi");
  return sentence.replace(re, (m) =>
    m
      .split("")
      .map((c) => (/[a-zA-Z]/.test(c) ? "_" : c))
      .join(""),
  );
}

function buildBlanks(word: string) {
  return word
    .split("")
    .map((c) => (/[a-zA-Z]/.test(c) ? "_" : c))
    .join(" ");
}

const DIFFICULTY_META: Record<Difficulty, { label: string; chip: string }> = {
  easy: { label: "Easy", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
  medium: { label: "Medium", chip: "bg-sky-500/15 text-sky-300 border-sky-400/30" },
  hard: { label: "Hard", chip: "bg-rose-500/15 text-rose-300 border-rose-400/30" },
};

export function Flashcard({
  id,
  word,
  pos,
  level,
  isFlipped,
  onFlip,
  nextCardId,
  mode = "learning",
  onReveal,
  onChallenge,
  difficulty = "medium",
}: FlashcardProps) {
  const accent = LEVEL_ACCENT[level] ?? LEVEL_ACCENT.A1;
  const queryClient = useQueryClient();
  const [hintLevel, setHintLevel] = React.useState(0);

  React.useEffect(() => {
    setHintLevel(0);
  }, [id, mode]);

  const { data: card, isLoading, isError } = useGetCard(id, {
    query: { enabled: true, queryKey: getGetCardQueryKey(id) },
  });

  React.useEffect(() => {
    if (!nextCardId) return;
    void queryClient
      .prefetchQuery({
        queryKey: getGetCardQueryKey(nextCardId),
        queryFn: () => getCard(nextCardId),
      })
      .then(() => {
        const next = queryClient.getQueryData(
          getGetCardQueryKey(nextCardId),
        ) as { audioWordUrl?: string; audioSentenceUrl?: string } | undefined;
        // Warm the browser cache for the next card's audio so flipping is instant.
        if (next?.audioWordUrl) {
          void fetch(next.audioWordUrl, { cache: "force-cache" }).catch(() => {});
        }
        if (next?.audioSentenceUrl) {
          void fetch(next.audioSentenceUrl, { cache: "force-cache" }).catch(() => {});
        }
      });
  }, [nextCardId, queryClient]);

  const synonyms: string[] | undefined = (card as any)?.synonyms;
  const antonyms: string[] | undefined = (card as any)?.antonyms;

  const posLabel = POS_LABEL[pos.toLowerCase()] ?? pos;
  const blanks = buildBlanks(word);
  const diffMeta = DIFFICULTY_META[difficulty];

  // For short words (≤4 letters), letter count is too revealing —
  // skip straight to a meaning clue per spec.
  const isShortWord = word.length <= 4;

  // 3-level hint content
  const hintContent = React.useMemo(() => {
    if (hintLevel === 0) return null;
    if (hintLevel === 1) {
      if (isShortWord) {
        // Short words: Hint 1 = part of speech only (no length reveal)
        return (
          <span className="text-white/85">
            <span className="text-[10px] uppercase tracking-widest text-violet-300/80 mr-2">
              Type
            </span>
            {posLabel}
          </span>
        );
      }
      return (
        <span>
          <span className="text-white/85 font-mono tracking-widest">{blanks}</span>
          <span className="ml-2 text-[10px] text-muted-foreground/80">
            {word.length} letters · {posLabel}
          </span>
        </span>
      );
    }
    if (hintLevel === 2) {
      return (
        <span className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-violet-300/80">
            Meaning
          </span>
          <span
            className={cn("font-arabic text-base", accent.arabic)}
            dir="rtl"
          >
            {card?.arabic ?? "—"}
          </span>
        </span>
      );
    }
    // hintLevel === 3
    return (
      <span className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-violet-300/80">
          Used in a sentence
        </span>
        <span className="text-xs sm:text-sm text-white/85 italic">
          {card?.sentenceEn ? blankWordInSentence(card.sentenceEn, word) : "—"}
        </span>
      </span>
    );
  }, [hintLevel, word, blanks, posLabel, isShortWord, accent.arabic, card?.arabic, card?.sentenceEn]);

  return (
    <motion.div
      className="relative w-full max-w-2xl aspect-[4/3] sm:aspect-[16/9] perspective-1000 cursor-pointer"
      onClick={onFlip}
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
    >
      <motion.div
        className="w-full h-full relative preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
      >
        {/* Front */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden glass-card-premium card-aurora overflow-hidden rounded-2xl flex flex-col items-center justify-center p-6 sm:p-8 text-center group transition-all duration-300",
            accent.border,
          )}
        >
          <span
            className={cn(
              "absolute top-4 sm:top-6 right-4 sm:right-6 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm",
              accent.chip,
            )}
          >
            {level}
          </span>

          {mode === "challenge" ? (
            <span className="absolute top-4 sm:top-6 left-4 sm:left-6 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-200 border border-violet-400/30">
              Challenge
            </span>
          ) : null}

          <span className="mb-3 sm:mb-4 inline-flex items-center text-[10px] sm:text-xs uppercase tracking-[0.18em] font-semibold text-white/85 px-2.5 py-1 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/10 shadow-[0_0_18px_-4px_rgba(139,92,246,0.45)]">
            {pos}
          </span>

          <AnimatePresence mode="wait">
            <motion.h2
              key={`${word}-${mode}`}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={cn(
                "font-bold tracking-tight mb-4 sm:mb-5 text-foreground text-cinematic break-words max-w-[90%] leading-tight",
                mode === "learning" && "word-glow-pulse",
                mode === "challenge"
                  ? "font-mono tracking-[0.35em] text-4xl sm:text-6xl text-white/85"
                  : word.length > 14
                    ? "text-3xl sm:text-5xl"
                    : word.length > 9
                      ? "text-4xl sm:text-6xl"
                      : "text-5xl sm:text-7xl",
              )}
            >
              {mode === "challenge" ? blanks : word}
            </motion.h2>
          </AnimatePresence>

          {mode === "learning" ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium select-none">
                  EN
                </span>
                {card?.audioWordUrl ? (
                  <AudioButton url={card.audioWordUrl} size="default" />
                ) : (
                  <AudioButton url="" size="default" />
                )}
              </div>
              {onChallenge ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sounds.click();
                    onChallenge();
                  }}
                  className={cn(
                    "mb-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold",
                    "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white",
                    "shadow-[0_0_18px_-4px_rgba(217,70,239,0.6)]",
                    "hover:shadow-[0_0_28px_-4px_rgba(217,70,239,0.85)] hover:-translate-y-0.5",
                    "active:translate-y-0 transition-all",
                  )}
                  aria-label="Hide the word and switch to Challenge Mode"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Challenge Me
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sounds.click();
                onReveal?.();
              }}
              className={cn(
                "mb-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold",
                "bg-gradient-to-r from-violet-500 to-blue-500 text-white",
                "shadow-[0_0_18px_-4px_rgba(124,58,237,0.6)]",
                "hover:shadow-[0_0_28px_-4px_rgba(124,58,237,0.8)] hover:-translate-y-0.5",
                "active:translate-y-0 transition-all",
              )}
              aria-label="Show the word and switch to Learning Mode"
            >
              <Eye className="w-3.5 h-3.5" />
              Show Word
            </button>
          )}

          {/* Hint — only available in Challenge mode (Learning shows full word) */}
          <div
            className={cn(
              "flex flex-col items-center gap-1.5 max-w-[92%]",
              mode !== "challenge" && "hidden",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sounds.click();
                setHintLevel((h) => (h >= 3 ? 0 : h + 1));
              }}
              className={cn(
                "group/hint inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium",
                "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-violet-400/40",
                "text-muted-foreground hover:text-white transition-all",
              )}
              aria-pressed={hintLevel > 0}
              aria-label={
                hintLevel === 0
                  ? "Show hint"
                  : hintLevel === 3
                    ? "Hide hint"
                    : `Hint level ${hintLevel}. Show next hint.`
              }
            >
              <Lightbulb className="w-3 h-3 transition-transform group-hover/hint:scale-110 text-amber-300/80" />
              {hintLevel === 0
                ? "Hint"
                : hintLevel < 3
                  ? `Hint ${hintLevel}/3`
                  : "Hide"}
            </button>

            <AnimatePresence mode="wait">
              {hintLevel > 0 ? (
                <motion.div
                  key={`hint-${hintLevel}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground text-center"
                >
                  {hintContent}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="text-muted-foreground text-[10px] sm:text-xs opacity-50 group-hover:opacity-90 transition-opacity absolute bottom-3 sm:bottom-4 tracking-wide">
            Press Space or Tap to flip
          </div>
        </div>

        {/* Back */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden glass-card-premium overflow-hidden rounded-2xl flex flex-col p-5 sm:p-8 transition-all duration-300",
            accent.border,
          )}
          style={{ transform: "rotateY(180deg)" }}
        >
          {/* Difficulty chip top-left */}
          <span
            className={cn(
              "absolute top-4 sm:top-5 left-4 sm:left-5 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md border backdrop-blur-sm",
              diffMeta.chip,
            )}
            title={`Difficulty: ${diffMeta.label}`}
          >
            {diffMeta.label}
          </span>

          {isLoading && !card ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
              <Skeleton className="h-12 w-48 bg-white/5" />
              <Skeleton className="h-6 w-24 bg-white/5" />
              <div className="w-full space-y-3 mt-8">
                <Skeleton className="h-4 w-full bg-white/5" />
                <Skeleton className="h-4 w-5/6 bg-white/5" />
              </div>
            </div>
          ) : isError ? (
            <div className="w-full h-full flex items-center justify-center text-destructive">
              Failed to load card details.
            </div>
          ) : card ? (
            <div className="flex flex-col h-full justify-between pt-4 sm:pt-2">
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl sm:text-4xl font-bold text-foreground text-cinematic">
                      {card.english}
                    </h2>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium select-none">
                      EN
                    </span>
                    {card.audioWordUrl && <AudioButton url={card.audioWordUrl} />}
                  </div>
                  <Badge variant="secondary" className="w-fit text-xs bg-white/5">
                    {card.pos}
                  </Badge>
                </div>
                <div className="text-right">
                  <h3
                    className={cn("text-2xl sm:text-4xl font-arabic font-bold", accent.arabic)}
                    dir="rtl"
                  >
                    {card.arabic}
                  </h3>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/10 flex-grow flex flex-col justify-center space-y-4"
              >
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                  Example
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  {card.audioSentenceUrl && (
                    <AudioButton
                      url={card.audioSentenceUrl}
                      className="mt-1 flex-shrink-0"
                    />
                  )}
                  <p className="text-base sm:text-xl text-foreground/90 leading-relaxed">
                    {highlightWord(card.sentenceEn, card.english, accent.highlight)}
                  </p>
                </div>
                <div className="flex items-start gap-4 justify-end">
                  <p
                    className="text-lg sm:text-2xl font-arabic text-muted-foreground leading-relaxed text-right"
                    dir="rtl"
                  >
                    {card.sentenceAr}
                  </p>
                </div>

                {(synonyms?.length || antonyms?.length) ? (
                  <div className="mt-2 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    {synonyms?.length ? (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-emerald-300/80 mb-1.5">
                          Synonyms
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {synonyms.map((s) => (
                            <span
                              key={`syn-${s}`}
                              className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-200 border border-emerald-400/20"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {antonyms?.length ? (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-rose-300/80 mb-1.5">
                          Antonyms
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {antonyms.map((a) => (
                            <span
                              key={`ant-${a}`}
                              className="text-xs px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-200 border border-rose-400/20"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </motion.div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
