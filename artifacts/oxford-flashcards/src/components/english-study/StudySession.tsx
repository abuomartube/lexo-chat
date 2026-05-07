import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, PartyPopper, Sparkles, TrendingUp } from "lucide-react";
import {
  EnglishVocabAttemptRequestResult,
  useCompleteEnglishStudySession,
  useGetEnglishAchievements,
  useGetEnglishMotivation,
  useRecordEnglishVocabAttempt,
  type EnglishAchievement,
  type EnglishAchievementCode,
  type EnglishPlanVocabItem,
  type EnglishTodayPlan,
} from "@workspace/api-client-react";
import { StudyCard } from "./StudyCard";

// Phase E5 — guided card-based study session, now wired into the
// engagement layer:
//   * captures `levelUp` + `newlyGranted` from each attempt response
//   * on session end, POSTs /english/me/sessions/complete to record the
//     session and check perfect-session achievement
//   * the recap shows level-up + freshly-unlocked achievements + a
//     short motivational message

type Lang = "en" | "ar";

interface StudySessionProps {
  plan: EnglishTodayPlan;
  lang: Lang;
  onExit: () => void;
}

const SESSION_CAP = 40;

function buildDeck(plan: EnglishTodayPlan): EnglishPlanVocabItem[] {
  const deck: EnglishPlanVocabItem[] = [
    ...plan.weakWords,
    ...plan.reviewVocabulary,
    ...plan.masteryTargets,
    ...plan.newWords,
    ...plan.challengeWords,
  ];
  const reps = Math.min(2, Math.max(1, plan.recommendedRepetition || 1));
  const repeated: EnglishPlanVocabItem[] = [];
  for (let r = 0; r < reps; r += 1) repeated.push(...deck);
  return repeated.slice(0, SESSION_CAP);
}

interface SessionStats {
  correct: number;
  incorrect: number;
  xp: number;
  mastered: number;
  // Phase E5 — engagement payloads accumulated across the session.
  // We only keep the highest level-up (from→to of the whole session) so
  // the recap doesn't show a chain of overlapping level-up chips.
  levelUp: { from: number; to: number } | null;
  newlyGranted: EnglishAchievementCode[];
  startedAt: number; // epoch ms — for durationSeconds in the complete call
}

export function StudySession({ plan, lang, onExit }: StudySessionProps) {
  const isAr = lang === "ar";
  const queryClient = useQueryClient();
  const recordAttempt = useRecordEnglishVocabAttempt();
  const completeSession = useCompleteEnglishStudySession();

  const deck = useMemo(() => buildDeck(plan), [plan]);

  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | "mastered" | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats>(() => ({
    correct: 0,
    incorrect: 0,
    xp: 0,
    mastered: 0,
    levelUp: null,
    newlyGranted: [],
    startedAt: Date.now(),
  }));
  // Best-effort POST /sessions/complete fires once when the deck ends.
  const sessionCompletedRef = useRef(false);
  // Single-flight latch for grading.
  const inFlightRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const total = deck.length;
  const finished = index >= total;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Invalidate the planner/stats/queue + engagement queries when the
  // session unmounts so the hub & hero refresh.
  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ["/api/english/me/today-plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/english/vocab/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/english/vocab/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/english/me/progression"] });
      queryClient.invalidateQueries({ queryKey: ["/api/english/me/achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/english/me/motivation"] });
    };
  }, [queryClient]);

  // Fire session-complete once when the deck ends.
  useEffect(() => {
    if (!finished || sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;
    const attempts = stats.correct + stats.incorrect;
    const durationSeconds = Math.max(0, Math.round((Date.now() - stats.startedAt) / 1000));
    completeSession
      .mutateAsync({
        data: {
          attempts,
          correct: stats.correct,
          wordsMastered: stats.mastered,
          durationSeconds,
        },
      })
      .then((resp) => {
        if (resp.newlyGranted.length > 0) {
          setStats((s) => {
            // Merge unique codes, preserving order (existing first).
            const seen = new Set(s.newlyGranted);
            const merged = [...s.newlyGranted];
            for (const c of resp.newlyGranted) {
              if (!seen.has(c)) {
                merged.push(c);
                seen.add(c);
              }
            }
            return { ...s, newlyGranted: merged };
          });
        }
      })
      .catch(() => {
        // engagement is best-effort; silent on failure
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const current = !finished ? deck[index] : null;

  async function handleGrade(result: "correct" | "incorrect") {
    if (!current || inFlightRef.current) return;
    inFlightRef.current = true;
    setErrorMsg(null);
    try {
      const resp = await recordAttempt.mutateAsync({
        data: {
          wordId: current.word.id,
          result:
            result === "correct"
              ? EnglishVocabAttemptRequestResult.correct
              : EnglishVocabAttemptRequestResult.incorrect,
        },
      });
      setStats((s) => {
        // Preserve the EARLIEST `from` and the LATEST `to` so a multi-up
        // session shows the full jump cleanly.
        const nextLevelUp =
          resp.levelUp == null
            ? s.levelUp
            : s.levelUp == null
              ? resp.levelUp
              : { from: s.levelUp.from, to: resp.levelUp.to };
        const seen = new Set(s.newlyGranted);
        const mergedAch = [...s.newlyGranted];
        for (const c of resp.newlyGranted) {
          if (!seen.has(c)) {
            mergedAch.push(c);
            seen.add(c);
          }
        }
        return {
          ...s,
          correct: s.correct + (result === "correct" ? 1 : 0),
          incorrect: s.incorrect + (result === "incorrect" ? 1 : 0),
          xp: s.xp + resp.xpAwarded,
          mastered: s.mastered + (resp.becameMastered ? 1 : 0),
          levelUp: nextLevelUp,
          newlyGranted: mergedAch,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["/api/english/me/today-plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/english/vocab/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/english/vocab/queue"] });
      setFeedback(resp.becameMastered ? "mastered" : result);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setFeedback(null);
        setIndex((i) => i + 1);
        inFlightRef.current = false;
      }, 700);
    } catch {
      inFlightRef.current = false;
      setErrorMsg(
        lang === "ar"
          ? "تعذّر حفظ المحاولة. حاول مرة أخرى."
          : "Couldn't save that attempt. Try again.",
      );
    }
  }

  if (total === 0) {
    return <SessionEmpty lang={lang} onExit={onExit} />;
  }

  if (finished) {
    return <SessionDone lang={lang} stats={stats} onExit={onExit} />;
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onExit}
        data-testid="button-exit-session"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft size={14} className={isAr ? "rotate-180" : ""} />
        {isAr ? "إنهاء الجلسة" : "End session"}
      </button>

      {current && (
        <StudyCard
          word={current.word}
          index={index}
          total={total}
          lang={lang}
          onGrade={handleGrade}
          feedback={feedback}
          disabled={recordAttempt.isPending || feedback !== null}
        />
      )}

      {errorMsg && (
        <p
          className="text-center text-xs font-semibold text-rose-600 dark:text-rose-300"
          data-testid="text-grade-error"
          role="status"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function SessionEmpty({ lang, onExit }: { lang: Lang; onExit: () => void }) {
  const isAr = lang === "ar";
  return (
    <div className="rounded-3xl bg-card ring-1 ring-border/60 p-10 text-center shadow-sm">
      <Sparkles className="mx-auto text-indigo-500" size={28} />
      <h2 className="mt-3 text-xl font-extrabold text-foreground">
        {isAr ? "لا توجد كلمات في خطّة اليوم" : "Nothing to study right now"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        {isAr
          ? "ارجع لاحقًا — سنُنشئ خطّتك التالية تلقائيًا."
          : "Come back later — your next plan will be ready automatically."}
      </p>
      <button
        type="button"
        onClick={onExit}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold"
      >
        {isAr ? "العودة" : "Back to plan"}
      </button>
    </div>
  );
}

function SessionDone({
  lang,
  stats,
  onExit,
}: {
  lang: Lang;
  stats: SessionStats;
  onExit: () => void;
}) {
  const isAr = lang === "ar";
  const total = stats.correct + stats.incorrect;
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

  // Live motivation (refetched after the session completes thanks to
  // the unmount-time invalidation; on the recap screen we re-fetch
  // explicitly so the message reflects the just-finished session).
  const motivationQuery = useGetEnglishMotivation();
  const achievementsQuery = useGetEnglishAchievements();
  const newlyGrantedDetails = useMemo<EnglishAchievement[]>(() => {
    const all = achievementsQuery.data?.achievements ?? [];
    if (stats.newlyGranted.length === 0) return [];
    const codes = new Set(stats.newlyGranted);
    return all.filter((a) => codes.has(a.code));
  }, [achievementsQuery.data, stats.newlyGranted]);

  const message = motivationQuery.data?.message;
  const motivationText = message ? (isAr ? message.ar : message.en) : null;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 text-white p-8 sm:p-10 text-center shadow-xl">
      <PartyPopper className="mx-auto" size={32} />
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
        {isAr ? "أحسنت! اكتملت الجلسة" : "Session complete"}
      </h2>

      <div className="mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto">
        <SummaryStat label={isAr ? "صحيحة" : "Correct"} value={`${stats.correct}`} />
        <SummaryStat label={isAr ? "الدقّة" : "Accuracy"} value={`${accuracy}%`} />
        <SummaryStat label={isAr ? "نقاط" : "XP"} value={`+${stats.xp}`} />
      </div>

      {stats.mastered > 0 && (
        <p
          className="mt-5 text-sm text-amber-200 font-bold"
          data-testid="text-newly-mastered"
        >
          {isAr
            ? `أتقنت ${stats.mastered} ${stats.mastered === 1 ? "كلمة" : "كلمات"} اليوم`
            : `${stats.mastered} new ${stats.mastered === 1 ? "word" : "words"} mastered`}
        </p>
      )}

      {/* Phase E5 — level-up chip */}
      {stats.levelUp && (
        <div
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white text-indigo-700 px-4 py-2 shadow-md"
          data-testid="chip-level-up"
        >
          <TrendingUp size={16} />
          <span className="text-sm font-extrabold">
            {isAr
              ? `ترقّيت إلى المستوى ${stats.levelUp.to}`
              : `Leveled up to Level ${stats.levelUp.to}`}
          </span>
        </div>
      )}

      {/* Phase E5 — newly granted achievements */}
      {newlyGrantedDetails.length > 0 && (
        <div
          className="mt-5 flex flex-wrap justify-center gap-2"
          data-testid="newly-granted-strip"
        >
          {newlyGrantedDetails.map((a) => (
            <div
              key={a.code}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/95 text-indigo-900 px-3 py-1.5 text-[12px] font-extrabold shadow"
              data-testid={`chip-newly-granted-${a.code}`}
            >
              <Award size={14} />
              {isAr ? a.titleAr : a.titleEn}
            </div>
          ))}
        </div>
      )}

      {/* Motivation message (premium, calm, never childish) */}
      {motivationText && (
        <p
          className="mt-6 text-[13.5px] text-indigo-50/95 max-w-md mx-auto leading-relaxed"
          data-testid="text-motivation"
        >
          {motivationText}
        </p>
      )}

      <button
        type="button"
        onClick={onExit}
        data-testid="button-session-done"
        className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-extrabold shadow hover:shadow-md transition"
      >
        {isAr ? "العودة إلى الخطّة" : "Back to plan"}
      </button>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur px-3 py-3">
      <p className="text-[10px] uppercase tracking-wider text-indigo-100/85">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
