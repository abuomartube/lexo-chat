import { useMemo, useState } from "react";
import { Link, Redirect } from "wouter";
import { CURRICULUM_ENABLED } from "@/lib/feature-flags";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Layers,
  PlayCircle,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import {
  useGetEnglishAchievements,
  useGetEnglishProgression,
  useGetEnglishTodayPlan,
  useGetEnglishVocabStats,
  type EnglishTodayPlan,
  type EnglishVocabStatsResponse,
} from "@workspace/api-client-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { PlanHero } from "@/components/english-study/PlanHero";
import { VocabBucketCard } from "@/components/english-study/VocabBucketCard";
import { StudySession } from "@/components/english-study/StudySession";
import { AchievementsStrip } from "@/components/english-study/AchievementsStrip";

// Phase E4 — student-facing study screen, the only consumer of the
// adaptive planner from Phase E3.
//
// Two seamless states on a single route (no navigation):
//   1. plan view  — hero + "Continue lesson" + 5 vocabulary buckets +
//                   one big primary CTA "Start today's session"
//   2. session view — card-based study, then a celebration recap
//
// Strict rules respected:
//   * IELTS / Mentor / old-flashcards code paths are not imported.
//   * Vocabulary source = Lexo 5000 words (via planner endpoint).
//   * All data via orval-generated hooks; no bespoke fetch helpers.
//   * Tier→level gating stays server-side (the planner already filtered).

function bucketHint(
  bucket: "weak" | "review" | "new" | "mastery" | "challenge",
  isAr: boolean,
): string {
  switch (bucket) {
    case "weak":
      return isAr
        ? "كلمات تعثّرت فيها مؤخرًا"
        : "Tripped you up recently";
    case "review":
      return isAr ? "موعد مراجعتها اليوم" : "Due for review today";
    case "new":
      return isAr ? "كلمات جديدة في مستواك" : "Fresh additions at your level";
    case "mastery":
      return isAr
        ? "قاب قوسين من الإتقان"
        : "Almost mastered — finish them off";
    case "challenge":
      return isAr ? "تحدٍ من مستوى أعلى" : "A stretch beyond your level";
  }
}

function formatLessonResume(seconds: number, durationSeconds: number, isAr: boolean): string {
  const left = Math.max(0, durationSeconds - seconds);
  const m = Math.max(0, Math.round(left / 60));
  if (durationSeconds === 0) {
    return isAr ? "ابدأ الدرس" : "Start lesson";
  }
  if (seconds === 0) {
    return isAr ? "لم تبدأ بعد" : "Not started";
  }
  return isAr ? `يتبقّى ~${m} دقيقة` : `~${m} min left`;
}

export default function EnglishStudy() {
  // Strategic Simplification (May 2026): adaptive study session is part
  // of the curriculum stack. Send users to the simplified English hub
  // until the curriculum module is re-enabled.
  if (!CURRICULUM_ENABLED) {
    return <Redirect to="/dashboard/english" replace />;
  }
  return <EnglishStudyImpl />;
}

function EnglishStudyImpl() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const planQuery = useGetEnglishTodayPlan();
  const statsQuery = useGetEnglishVocabStats();
  // Phase E5 — engagement layer.
  const progressionQuery = useGetEnglishProgression();
  const achievementsQuery = useGetEnglishAchievements();

  const [mode, setMode] = useState<"plan" | "session">("plan");

  const plan = planQuery.data ?? null;
  const stats = statsQuery.data ?? null;
  const progression = progressionQuery.data ?? null;
  const achievements = achievementsQuery.data?.achievements ?? [];

  const totalStudyableNow = useMemo(() => {
    if (!plan) return 0;
    return (
      plan.weakWords.length +
      plan.reviewVocabulary.length +
      plan.newWords.length +
      plan.masteryTargets.length +
      plan.challengeWords.length
    );
  }, [plan]);

  // Loading state — single skeleton, no flicker.
  if (planQuery.isLoading || (planQuery.isFetching && !plan)) {
    return <StudyShell><PlanSkeleton /></StudyShell>;
  }

  // Error fallback. Keep it calm; planner returns 200 even for unenrolled
  // users so the only realistic 4xx here is auth.
  if (planQuery.isError || !plan) {
    return (
      <StudyShell>
        <div className="rounded-2xl bg-card ring-1 ring-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "تعذّر تحميل خطّة اليوم. حاول التحديث."
              : "We couldn't load today's plan. Please refresh."}
          </p>
        </div>
      </StudyShell>
    );
  }

  // Session view (entered when student presses Start / a bucket card).
  if (mode === "session") {
    return (
      <StudyShell>
        <StudySession plan={plan} lang={lang} onExit={() => setMode("plan")} />
      </StudyShell>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? null;

  return (
    <StudyShell>
      <PlanHero
        firstName={firstName}
        lang={lang}
        difficulty={plan.difficulty}
        signals={plan.signals}
        stats={stats}
        progression={progression}
        estimatedMinutes={plan.estimatedMinutes}
        notes={plan.notes}
        allowedLevels={plan.allowedLevels}
      />

      {/* Empty / unenrolled state — the planner already returns a soft
          200 with notes; we surface the first note and a CTA. */}
      {!plan.signals.hasEnrollment && (
        <UnenrolledNotice lang={lang} note={plan.notes[0]} />
      )}

      {plan.signals.hasEnrollment && (
        <>
          {/* Primary CTA — the "one-click continue" the brief calls for. */}
          <PrimaryCta
            lang={lang}
            disabled={totalStudyableNow === 0}
            count={totalStudyableNow}
            estimatedMinutes={plan.estimatedMinutes}
            onClick={() => setMode("session")}
          />

          {/* Continue where you stopped */}
          {plan.nextLesson && <NextLessonCard lesson={plan.nextLesson} lang={lang} />}

          {/* Vocabulary buckets */}
          <section>
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground/70">
                {isAr ? "مفرداتك اليوم" : "Today's vocabulary"}
              </h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {isAr
                  ? `${totalStudyableNow} كلمة`
                  : `${totalStudyableNow} words`}
              </span>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <VocabBucketCard
                icon={<Zap size={18} />}
                toneClass="from-rose-500 to-pink-600"
                label={isAr ? "كلمات ضعيفة" : "Weak words"}
                hint={bucketHint("weak", isAr)}
                count={plan.weakWords.length}
                total={plan.workload.weakTarget}
                lang={lang}
                onClick={
                  plan.weakWords.length > 0
                    ? () => setMode("session")
                    : undefined
                }
                testId="bucket-weak"
              />
              <VocabBucketCard
                icon={<Layers size={18} />}
                toneClass="from-indigo-500 to-blue-600"
                label={isAr ? "مراجعات اليوم" : "Today's reviews"}
                hint={bucketHint("review", isAr)}
                count={plan.reviewVocabulary.length}
                total={plan.workload.reviewTarget}
                lang={lang}
                onClick={
                  plan.reviewVocabulary.length > 0
                    ? () => setMode("session")
                    : undefined
                }
                testId="bucket-review"
              />
              <VocabBucketCard
                icon={<Sparkles size={18} />}
                toneClass="from-violet-500 to-fuchsia-600"
                label={isAr ? "كلمات جديدة" : "New words"}
                hint={bucketHint("new", isAr)}
                count={plan.newWords.length}
                total={plan.workload.newTarget}
                lang={lang}
                onClick={
                  plan.newWords.length > 0
                    ? () => setMode("session")
                    : undefined
                }
                testId="bucket-new"
              />
              <VocabBucketCard
                icon={<Target size={18} />}
                toneClass="from-amber-500 to-orange-600"
                label={isAr ? "أهداف الإتقان" : "Mastery targets"}
                hint={bucketHint("mastery", isAr)}
                count={plan.masteryTargets.length}
                total={plan.workload.masteryTarget}
                lang={lang}
                onClick={
                  plan.masteryTargets.length > 0
                    ? () => setMode("session")
                    : undefined
                }
                testId="bucket-mastery"
              />
              <VocabBucketCard
                icon={<Brain size={18} />}
                toneClass="from-emerald-500 to-teal-600"
                label={isAr ? "كلمات تحدٍ" : "Challenge words"}
                hint={bucketHint("challenge", isAr)}
                count={plan.challengeWords.length}
                total={plan.workload.challengeTarget}
                lang={lang}
                onClick={
                  plan.challengeWords.length > 0
                    ? () => setMode("session")
                    : undefined
                }
                testId="bucket-challenge"
              />
            </div>
          </section>

          {/* Phase E5 — Achievements strip (compact, premium chips). */}
          {achievements.length > 0 && (
            <AchievementsStrip achievements={achievements} lang={lang} />
          )}

          {/* XP by level breakdown — single subtle progress strip. */}
          {stats && stats.xpByLevel.length > 0 && (
            <XpByLevelStrip stats={stats} lang={lang} />
          )}
        </>
      )}
    </StudyShell>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents kept inline for proximity / readability — they're not used
// elsewhere and inlining avoids a 4th file in the english-study folder.
// ---------------------------------------------------------------------------

function StudyShell({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <Link
          href="/dashboard/english"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
          data-testid="link-back-hub"
        >
          <ArrowLeft size={16} className={isAr ? "rotate-180" : ""} />
          {isAr ? "العودة إلى لوحة الإنجليزي" : "Back to English dashboard"}
        </Link>
        {children}
      </main>
    </div>
  );
}

function PrimaryCta({
  lang,
  disabled,
  count,
  estimatedMinutes,
  onClick,
}: {
  lang: "en" | "ar";
  disabled: boolean;
  count: number;
  estimatedMinutes: number;
  onClick: () => void;
}) {
  const isAr = lang === "ar";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="button-start-session"
      className={`group w-full rounded-3xl px-6 sm:px-8 py-5 text-left ring-1 transition-all shadow-md ${
        disabled
          ? "bg-card text-muted-foreground ring-border cursor-not-allowed"
          : "bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white ring-white/15 hover:shadow-xl hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
            {isAr ? "الجلسة المقترحة" : "Suggested session"}
          </p>
          <p className="mt-0.5 text-xl sm:text-2xl font-extrabold tracking-tight">
            {disabled
              ? isAr
                ? "لا شيء للمراجعة الآن"
                : "Nothing to study right now"
              : isAr
                ? "ابدأ جلسة اليوم"
                : "Start today's session"}
          </p>
          {!disabled && (
            <p className="mt-1 text-[12.5px] opacity-90">
              {isAr
                ? `${count} كلمة · ${estimatedMinutes} دقيقة`
                : `${count} words · ${estimatedMinutes} min`}
            </p>
          )}
        </div>
        {!disabled && (
          <div className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 ring-1 ring-white/25 group-hover:scale-105 transition">
            <PlayCircle size={26} />
          </div>
        )}
      </div>
    </button>
  );
}

function NextLessonCard({
  lesson,
  lang,
}: {
  lesson: NonNullable<EnglishTodayPlan["nextLesson"]>;
  lang: "en" | "ar";
}) {
  const isAr = lang === "ar";
  const title =
    isAr && lesson.titleAr && lesson.titleAr.trim() ? lesson.titleAr : lesson.title;
  return (
    <Link
      href="/dashboard/english"
      className="block rounded-2xl bg-card ring-1 ring-border/60 p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
      data-testid="card-next-lesson"
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
          <BookOpen size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            {lesson.lastPositionSeconds > 0
              ? isAr
                ? "تابع من حيث توقفت"
                : "Continue where you stopped"
              : isAr
                ? "الدرس التالي"
                : "Next lesson"}
          </p>
          <p className="mt-0.5 text-base sm:text-lg font-extrabold text-foreground truncate">
            {title}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            <span className="font-semibold">{lesson.level}</span>
            {" · "}
            {formatLessonResume(
              lesson.lastPositionSeconds,
              lesson.durationSeconds,
              isAr,
            )}
          </p>
        </div>
        <ArrowRight
          size={18}
          className={`shrink-0 text-muted-foreground ${isAr ? "rotate-180" : ""}`}
        />
      </div>
    </Link>
  );
}

function UnenrolledNotice({
  lang,
  note,
}: {
  lang: "en" | "ar";
  note: string | undefined;
}) {
  const isAr = lang === "ar";
  return (
    <section className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-200 dark:ring-amber-900 p-5 sm:p-6">
      <p className="text-sm text-amber-900 dark:text-amber-100">
        {note ??
          (isAr
            ? "لا يبدو أن لديك اشتراك نشط في كورس الإنجليزي."
            : "You don't seem to have an active English subscription yet.")}
      </p>
      <Link
        href="/english"
        data-testid="link-browse-plans"
        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-100 underline"
      >
        {isAr ? "تصفّح الباقات" : "Browse plans"}
        <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
      </Link>
    </section>
  );
}

function XpByLevelStrip({
  stats,
  lang,
}: {
  stats: EnglishVocabStatsResponse;
  lang: "en" | "ar";
}) {
  const isAr = lang === "ar";
  const max = stats.xpByLevel.reduce((m, l) => Math.max(m, l.xp), 0) || 1;
  // CEFR display order so bars read A1 → C1 left to right.
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const sorted = [...stats.xpByLevel].sort(
    (a, b) => order.indexOf(a.level) - order.indexOf(b.level),
  );
  return (
    <section className="rounded-2xl bg-card ring-1 ring-border/60 p-4 sm:p-5 shadow-sm">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground/70">
          {isAr ? "تقدّم النقاط" : "XP by level"}
        </h2>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {isAr
            ? `${stats.totalXp.toLocaleString("ar")} نقطة`
            : `${stats.totalXp.toLocaleString("en")} XP total`}
        </p>
      </header>
      <ul className="space-y-2">
        {sorted.map((row) => {
          const pct = Math.round((row.xp / max) * 100);
          return (
            <li
              key={row.level}
              className="flex items-center gap-3"
              data-testid={`xp-row-${row.level}`}
            >
              <span className="w-7 text-[11px] font-bold text-muted-foreground tabular-nums">
                {row.level}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right text-[11.5px] tabular-nums font-semibold text-foreground">
                {row.xp}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-44 rounded-3xl bg-gradient-to-br from-indigo-200/60 to-violet-200/60 dark:from-indigo-950/60 dark:to-violet-950/60" />
      <div className="h-20 rounded-3xl bg-card ring-1 ring-border/60" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-card ring-1 ring-border/60"
          />
        ))}
      </div>
    </div>
  );
}
