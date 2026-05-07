import { Link } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  Lock,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { CURRICULUM_ENABLED } from "@/lib/feature-flags";
import {
  ENGLISH_TIER_LABELS,
  fetchEnglishCurriculumBooks,
  fetchEnglishLastLesson,
  fetchEnglishLessons,
  fetchEnglishStreak,
  fetchEnglishStudyTime,
  fetchMyEnglishEnrollments,
  hasActiveEnglishAccess,
  type EnglishCurriculumBook,
  type EnglishLessonSummary,
  type EnglishTier,
} from "@/lib/platform-api";

// Format a resume position for the Continue Learning subtitle.
// "1:23" or "1:02:34" (drops leading zero on hours; pads m/s).
function formatResumeAt(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Format aggregate study minutes for the Study Time stat card.
// <60  → "27 min"  / "27 دقيقة"
// ≥60  → "4h 30m" / "4س 30د"  (omit "0m" → "4h" / "4س")
function formatStudyMinutes(totalMinutes: number, isAr: boolean): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return isAr ? `${m} دقيقة` : `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (isAr) return rem === 0 ? `${h}س` : `${h}س ${rem}د`;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

// Phase-2 L6 / Task #26 — real Lexo English Dashboard. Replaces the bilingual
// "being prepared" placeholder with progress, today's tasks, and upcoming
// lessons sourced from the existing English API. Intentionally does NOT
// re-introduce the old Mentor 6-tool grid (Speaking / Writing / Listening /
// Reading / Lessons / Flashcards). Only the explicit lessons + flashcards
// surfaces called for in the task are linked here. Per-tool iframe pages at
// /dashboard/english/:tool are still reachable, but no UI surface routes to
// the hidden tools. To restore the old grid: see commit 9c25ef45.

function lessonTitle(l: EnglishLessonSummary, isAr: boolean): string {
  if (isAr && l.titleAr && l.titleAr.trim()) return l.titleAr;
  return l.title;
}

export default function LexoHub() {
  // Strategic Simplification (May 2026): when curriculum is disabled,
  // render the lightweight English hub instead of the full lessons /
  // books / today's-tasks / roadmap experience. The full LexoHub
  // implementation below is preserved verbatim and re-activates as soon
  // as `CURRICULUM_ENABLED` flips back to `true`.
  if (!CURRICULUM_ENABLED) {
    return <SimplifiedEnglishHub />;
  }
  return <FullLexoHub />;
}

function SimplifiedEnglishHub() {
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const isAr = lang === "ar";
  const FwdIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome */}
        <section className="bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white rounded-3xl p-7 sm:p-10 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100/90">
            {isAr ? "إنجليزي ليكسو" : "LEXO English"}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isAr ? `أهلًا ${firstName} 👋` : `Welcome ${firstName} 👋`}
          </h1>
          <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-2xl">
            {isAr
              ? "نُبسّط التجربة لتركّز على ما يبني لغتك فعلًا: البطاقات التعليمية وباقاتك الحالية. الدروس والاختبارات ستعود قريبًا كوحدة مستقلة."
              : "We're keeping the experience focused on what actually builds your language: flashcards and your active packages. Lessons and quizzes will return soon as a standalone module."}
          </p>
        </section>

        {/* Primary actions */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/app"
            data-testid="cta-simplified-flashcards"
            className="group block rounded-2xl border border-violet-100 dark:border-violet-800/60 bg-white dark:bg-gray-900/60 p-6 shadow-sm hover:shadow-lg transition"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow">
                <Layers size={20} />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">
                  {isAr ? "البطاقات التعليمية" : "Flashcards"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isAr ? "Oxford 3000 / Lexo 5000" : "Oxford 3000 / Lexo 5000"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {isAr
                ? "راجع المفردات الأساسية بنظام التكرار المتباعد المخصّص لباقتك."
                : "Practice the core vocabulary with the spaced-repetition deck unlocked by your package."}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-300 group-hover:gap-3 transition-all">
              {isAr ? "ابدأ المراجعة" : "Start practicing"}
              <FwdIcon size={16} />
            </span>
          </Link>

          <Link
            href="/english"
            data-testid="cta-simplified-packages"
            className="group block rounded-2xl border border-blue-100 dark:border-blue-800/60 bg-white dark:bg-gray-900/60 p-6 shadow-sm hover:shadow-lg transition"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow">
                <BookOpen size={20} />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">
                  {isAr ? "باقات الإنجليزي" : "English Packages"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isAr ? "ابتدائي / متوسط / كامل" : "Beginner / Intermediate / Complete"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {isAr
                ? "تعرّف على الباقات وافتح المستويات المناسبة لمسارك."
                : "Browse packages and unlock the CEFR levels that match your goal."}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300 group-hover:gap-3 transition-all">
              {isAr ? "تصفّح الباقات" : "Browse packages"}
              <FwdIcon size={16} />
            </span>
          </Link>
        </section>

        {/* Lessons coming back soon notice */}
        <section className="mt-6 rounded-2xl border border-dashed border-amber-300/70 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-900/20 p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 shrink-0">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-100">
                {isAr
                  ? "الدروس والاختبارات ستعود قريبًا"
                  : "Lessons & quizzes — coming back soon"}
              </h3>
              <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                {isAr
                  ? "نعيد بناء وحدة الدروس كنظام مستقل أكثر استقرارًا. تقدّمك ومفرداتك محفوظة بالكامل."
                  : "We're rebuilding the lessons module as a standalone, more stable system. Your progress and vocabulary are fully preserved."}
              </p>
            </div>
          </div>
        </section>

        {/* Other entry points */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-4 py-3 text-sm font-semibold flex items-center justify-between hover:border-indigo-300 transition"
          >
            <span className="inline-flex items-center gap-2">
              <GraduationCap size={16} />
              {isAr ? "لوحة التحكم" : "Dashboard"}
            </span>
            <FwdIcon size={14} />
          </Link>
          <Link
            href="/ielts"
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-4 py-3 text-sm font-semibold flex items-center justify-between hover:border-indigo-300 transition"
          >
            <span className="inline-flex items-center gap-2">
              <PlayCircle size={16} />
              {isAr ? "آيلتس" : "IELTS"}
            </span>
            <FwdIcon size={14} />
          </Link>
        </section>
      </main>
    </div>
  );
}

function FullLexoHub() {
  const { user, isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const enrollmentsQuery = useQuery({
    queryKey: ["my-english-enrollments"],
    queryFn: fetchMyEnglishEnrollments,
  });

  // B-18 (Phase E5 stabilization) — `refetchOnMount: "always"` ensures the
  // hub re-fetches every time the user navigates back from a study/lesson
  // screen, so progress, streak and study-time reflect the writes that
  // just happened (no more "stale until manual refresh").
  const lessonsQuery = useQuery({
    queryKey: ["english-mentor-lessons"],
    queryFn: fetchEnglishLessons,
    refetchOnMount: "always",
  });

  // Study Time (last 7 days). On error we fall back to 0 so the card
  // still renders with a sane value instead of disappearing.
  const studyTimeQuery = useQuery({
    queryKey: ["english-study-time", "week"],
    queryFn: () => fetchEnglishStudyTime("week"),
    retry: 1,
    refetchOnMount: "always",
  });
  const studyMinutes = studyTimeQuery.data?.totalMinutes ?? 0;

  // Daily Streak. On error/missing data we fall back to zeros so the card
  // always renders (matches the Study Time fallback contract).
  const streakQuery = useQuery({
    queryKey: ["english-streak"],
    queryFn: fetchEnglishStreak,
    retry: 1,
    refetchOnMount: "always",
  });
  const currentStreak = streakQuery.data?.currentStreak ?? 0;
  const longestStreak = streakQuery.data?.longestStreak ?? 0;
  const todayActive = streakQuery.data?.todayActive ?? false;

  // Last watched lesson — server-side picks the single most-recent
  // resumable lesson the student can still access. On error we fall
  // back to null and the existing "next lesson" branch is used.
  const lastLessonQuery = useQuery({
    queryKey: ["english-last-lesson"],
    queryFn: fetchEnglishLastLesson,
    retry: 1,
    refetchOnMount: "always",
  });
  const lastLesson = lastLessonQuery.data?.lesson ?? null;

  const enrollments = enrollmentsQuery.data ?? [];
  const hasAccess = isAdmin || hasActiveEnglishAccess(enrollments);

  // Books roadmap source. Pure read of /english/curriculum/books — same
  // endpoint backing the curriculum browse page. Drives the hero "current
  // book" line and the dominant Books Roadmap section below the hero.
  const booksQuery = useQuery({
    queryKey: ["english-curriculum-books"],
    queryFn: fetchEnglishCurriculumBooks,
    retry: 1,
    refetchOnMount: "always",
  });
  const allBooks: EnglishCurriculumBook[] = booksQuery.data?.books ?? [];

  const lessonsData = lessonsQuery.data;
  const allLessons = lessonsData?.lessons ?? [];
  const accessibleLessons = allLessons.filter((l) => !l.locked);
  const completedCount = accessibleLessons.filter((l) => l.completed).length;
  const totalAccessible = accessibleLessons.length;
  const progressPct =
    totalAccessible === 0
      ? 0
      : Math.round((completedCount / totalAccessible) * 100);

  // Next lesson to study: first unlocked + uncompleted lesson in sort order.
  const nextLesson = accessibleLessons.find((l) => !l.completed) ?? null;
  // Lesson currently in progress (has watch progress but not yet completed).
  const inProgressLesson =
    accessibleLessons.find(
      (l) =>
        !l.completed &&
        l.progress &&
        l.progress.watchedSeconds > 0 &&
        l.progress.durationSeconds > 0,
    ) ?? null;
  const bestTier = lessonsData?.bestTier ?? null;
  const allowedLevels = lessonsData?.allowedLevels ?? [];

  const lessonsLoading = lessonsQuery.isLoading;
  const lessonsError = lessonsQuery.isError;

  // Hero derivations — used by the single merged learning hero.
  // currentBook = first non-locked in-progress book; else first non-locked
  // unstarted book. Locked books are NEVER selected so the hero CTA can't
  // route into a paywalled book route. When no unlocked book exists,
  // currentBook is null and the hero CTA falls back to the curriculum
  // browse page (which itself surfaces the upgrade path).
  const currentBook = useMemo(() => {
    const inProgress = allBooks.find(
      (b) =>
        !b.locked &&
        b.completedLessons > 0 &&
        b.completedLessons < b.totalLessons,
    );
    if (inProgress) return inProgress;
    const unstarted = allBooks.find(
      (b) => !b.locked && b.totalLessons > 0 && b.completedLessons === 0,
    );
    return unstarted ?? null;
  }, [allBooks]);

  // Resume target for the hero CTA. Server-picked last lesson wins; falls
  // back to the locally derived in-progress / next lesson; finally to the
  // current book's lessons listing.
  const heroResumeId =
    lastLesson?.id ?? inProgressLesson?.id ?? nextLesson?.id ?? null;
  const heroResumeTitle = lastLesson
    ? lang === "ar"
      ? (lastLesson.titleAr ?? lastLesson.title)
      : lastLesson.title
    : inProgressLesson
      ? lessonTitle(inProgressLesson, isAr)
      : nextLesson
        ? lessonTitle(nextLesson, isAr)
        : null;
  const heroBookTitle = currentBook
    ? lang === "ar" && currentBook.titleAr
      ? currentBook.titleAr
      : currentBook.title
    : null;
  const heroHref = heroResumeId
    ? `/dashboard/english/lessons?lesson=${heroResumeId}`
    : currentBook
      ? `/dashboard/english/curriculum/books/${currentBook.id}`
      : "/dashboard/english/curriculum";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 mb-6"
          data-testid="link-back-dashboard"
        >
          <ArrowLeft size={16} className={isAr ? "rotate-180" : ""} />
          {isAr ? "العودة إلى لوحة التحكم" : "Back to dashboard"}
        </Link>

        {/* ── Single primary learning hero ───────────────────────────
            Replaces the previous welcome banner + standalone Continue CTA.
            Carries: name, active tier, current book, current lesson,
            overall progress, and ONE primary CTA (Continue Learning /
            Start Book 1). All other purple/gradient blocks below are
            intentionally subdued so this is the only focal point. */}
        <section
          className="bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white rounded-3xl p-5 sm:p-9 shadow-xl"
          data-testid="hero-english-learning"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100/90">
                EduLexo · Lexo for English
              </p>
              <h1
                className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight break-words"
                data-testid="text-english-dashboard-title"
              >
                {isAr ? "أهلاً" : "Welcome"}
                {user ? `, ${user.name.split(" ")[0]}` : ""} 👋
              </h1>
            </div>

            {bestTier && (
              <div
                className="rounded-2xl bg-white/15 ring-1 ring-white/25 px-3.5 py-2 backdrop-blur shrink-0"
                data-testid="badge-english-tier"
              >
                <p className="text-[10px] uppercase tracking-wider text-indigo-100/80">
                  {isAr ? "مستواك" : "Your level"}
                </p>
                <p className="mt-0.5 text-sm font-extrabold leading-tight">
                  {ENGLISH_TIER_LABELS[bestTier as EnglishTier]?.[lang] ??
                    bestTier}
                </p>
                {allowedLevels.length > 0 && (
                  <p className="mt-0.5 text-[10.5px] text-indigo-100/85 tabular-nums">
                    {allowedLevels.join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Current book / lesson + slim progress (replaces the deleted
              standalone Course Progress card — single source of truth). */}
          <div className="mt-4 sm:mt-5 rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-100/80">
              {heroBookTitle
                ? isAr
                  ? "كتابك الحالي"
                  : "Your current book"
                : isAr
                  ? "ابدأ رحلتك"
                  : "Start your journey"}
            </p>
            <p
              className="mt-1 text-base sm:text-lg font-extrabold leading-tight break-words"
              data-testid="text-hero-current-book"
            >
              {heroBookTitle ??
                (isAr ? "كتاب 1 — اللبنة الأولى" : "Book 1 — your first step")}
            </p>
            {heroResumeTitle && (
              <p
                className="mt-1.5 text-[12.5px] text-indigo-100/90 break-words"
                data-testid="text-hero-current-lesson"
              >
                {isAr ? "الدرس الحالي: " : "Current lesson: "}
                <span className="font-semibold text-white">
                  {heroResumeTitle}
                </span>
              </p>
            )}
            {totalAccessible > 0 && (
              <>
                <div
                  className="mt-3 h-2 w-full rounded-full bg-white/15 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPct}
                >
                  <div
                    className="h-full bg-gradient-to-r from-white via-indigo-100 to-white/90 transition-all"
                    style={{ width: `${progressPct}%` }}
                    data-testid="bar-hero-progress"
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] text-indigo-100/85 tabular-nums">
                  {isAr
                    ? `${progressPct}٪ · أنهيت ${completedCount} من ${totalAccessible} درساً`
                    : `${progressPct}% · ${completedCount} of ${totalAccessible} lessons done`}
                </p>
              </>
            )}
          </div>

          {/* Single primary CTA (the only one on the hub). */}
          {hasAccess && (
            <Link
              href={heroHref}
              data-testid="cta-hero-primary"
              className="group mt-4 sm:mt-5 inline-flex w-full sm:w-auto items-center justify-between gap-4 rounded-2xl px-5 py-3.5 bg-white text-indigo-700 font-extrabold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all min-h-[48px]"
            >
              <span className="inline-flex items-center gap-2.5 min-w-0">
                <PlayCircle size={20} className="shrink-0" />
                <span className="truncate">
                  {heroResumeTitle
                    ? isAr
                      ? "تابع التعلّم"
                      : "Continue Learning"
                    : isAr
                      ? "ابدأ كتاب 1"
                      : "Start Book 1"}
                </span>
              </span>
              <ArrowRight
                size={18}
                className={`shrink-0 ${isAr ? "rotate-180" : ""}`}
              />
            </Link>
          )}
        </section>

        {/* ── Access guard fallback (defensive — EnglishOnlyRoute gates) */}
        {!hasAccess && !enrollmentsQuery.isLoading && (
          <section
            className="mt-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-6 text-amber-900 dark:text-amber-100"
            data-testid="section-no-english-access"
          >
            <p className="text-sm">
              {isAr
                ? "لا يبدو أن لديك اشتراك نشط في كورس الإنجليزي."
                : "It looks like you don't have an active English subscription."}
            </p>
            <Link
              href="/english"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline"
            >
              {isAr ? "تصفّح الباقات" : "Browse plans"}
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </Link>
          </section>
        )}

        {/* ── Today's Tasks — promoted right after the hero ──────
            Per the restored hierarchy: Hero → Today's Tasks → Roadmap
            → Stats → Secondary. Three momentum rows so the dashboard
            always offers an actionable next step:
              1) Continue / Start the active lesson (resumes mid-flight)
              2) Daily Review (vocab drill — keeps the streak alive)
              3) Open Books (browse the full curriculum)
            The legacy "Upcoming lessons" sidebar that produced large
            empty cards on fresh accounts is gone — its data is folded
            into row 1's subtitle. */}
        {hasAccess && (
          <section
            className="mt-6 bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-5 sm:p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
            data-testid="card-today-tasks"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight">
                  {isAr ? "مهام اليوم" : "Today's tasks"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr
                    ? "ثلاث خطوات تُبقي تقدّمك مستمراً."
                    : "Three quick actions to keep your momentum going."}
                </p>
              </div>
            </div>

            {lessonsError ? (
              <p className="mt-5 text-sm text-rose-600 dark:text-rose-400">
                {isAr
                  ? "تعذّر تحميل الدروس. حاول لاحقاً."
                  : "Couldn't load your lessons. Please try again later."}
              </p>
            ) : lessonsLoading ? (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                {isAr ? "جاري التحميل…" : "Loading…"}
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {(() => {
                  // Server-picked last-watched lesson wins; falls back
                  // to locally derived inProgressLesson, then to the
                  // next unstarted lesson. Mirrors hero CTA logic.
                  const resumeId =
                    lastLesson?.id ?? inProgressLesson?.id ?? null;
                  const resumeTitle = lastLesson
                    ? lang === "ar"
                      ? (lastLesson.titleAr ?? lastLesson.title)
                      : lastLesson.title
                    : inProgressLesson
                      ? lessonTitle(inProgressLesson, isAr)
                      : null;
                  const dur = lastLesson?.durationSeconds ?? 0;
                  const watched = lastLesson?.watchedSeconds ?? 0;
                  const pct =
                    dur > 0
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round((watched / dur) * 100),
                          ),
                        )
                      : 0;
                  const pos = lastLesson?.lastPositionSeconds ?? 0;
                  const meta =
                    lastLesson && dur > 0
                      ? isAr
                        ? ` · ${pct}٪ · المتابعة من ${formatResumeAt(pos)}`
                        : ` · ${pct}% · Resume at ${formatResumeAt(pos)}`
                      : "";
                  const href =
                    resumeId !== null
                      ? `/dashboard/english/lessons?lesson=${resumeId}`
                      : "/dashboard/english/lessons";
                  return (
                    <TaskRow
                      testId="task-continue-lesson"
                      icon={<PlayCircle size={18} />}
                      iconTone="from-indigo-600 to-purple-600"
                      title={
                        resumeTitle
                          ? isAr
                            ? "تابع الدرس الذي بدأته"
                            : "Continue your lesson"
                          : nextLesson
                            ? isAr
                              ? "ابدأ الدرس التالي"
                              : "Start your next lesson"
                            : isAr
                              ? "أنهيت كل الدروس المتاحة"
                              : "All available lessons completed"
                      }
                      subtitle={
                        resumeTitle
                          ? `${resumeTitle}${meta}`
                          : nextLesson
                            ? lessonTitle(nextLesson, isAr)
                            : isAr
                              ? "ترقّب المزيد من المحتوى قريباً"
                              : "More lessons are on the way"
                      }
                      href={href}
                      ctaLabel={
                        resumeTitle
                          ? isAr
                            ? "تابع"
                            : "Resume"
                          : nextLesson
                            ? isAr
                              ? "ابدأ"
                              : "Start"
                            : isAr
                              ? "تصفّح الدروس"
                              : "Browse lessons"
                      }
                      isAr={isAr}
                      disabled={!resumeTitle && !nextLesson}
                    />
                  );
                })()}
                {/* Legacy Oxford-3000 "Daily review" TaskRow that
                    deep-linked into /dashboard/english/flashcards is
                    intentionally hidden from the visible English
                    dashboard. The flashcards feature, route, SRS, and
                    XP are unchanged and still reachable directly via
                    /dashboard/english/flashcards. */}
                <TaskRow
                  testId="task-open-curriculum"
                  icon={<BookOpen size={18} />}
                  iconTone="from-emerald-600 to-teal-600"
                  title={
                    isAr
                      ? "كتب ليكسو للإنجليزية"
                      : "Lexo for English — Books"
                  }
                  subtitle={
                    isAr
                      ? "تصفّح كل الكتب والدروس والاختبارات."
                      : "Browse all books, lessons, and quizzes."
                  }
                  href="/dashboard/english/curriculum"
                  ctaLabel={isAr ? "افتح الكتب" : "Open books"}
                  isAr={isAr}
                />
              </ul>
            )}
          </section>
        )}

        {/* ── Books Roadmap — dominant section near the top ────────
            Mobile (<md): horizontal snap-scroll so all 6 books are
            reachable without a vertical wall. md+: 2-col, lg+: 3-col
            grid. Each tile is a deep link into the existing curriculum
            book route — no curriculum logic re-implemented here. */}
        {hasAccess && (
          <section className="mt-6" data-testid="section-books-roadmap">
            <div className="flex items-baseline justify-between gap-3 mb-3 px-1">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                {isAr ? "رحلة الكتب" : "Your books journey"}
              </h2>
              <Link
                href="/dashboard/english/curriculum"
                data-testid="link-all-books"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
              >
                {isAr ? "كل الكتب" : "All books"}
                <ArrowRight
                  size={12}
                  className={isAr ? "rotate-180" : ""}
                />
              </Link>
            </div>

            {booksQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-2xl bg-slate-200/60 dark:bg-gray-800/60 animate-pulse"
                    data-testid={`book-roadmap-skeleton-${i}`}
                  />
                ))}
              </div>
            ) : booksQuery.isError || allBooks.length === 0 ? (
              <p
                className="text-sm text-slate-500 dark:text-slate-400 px-1"
                data-testid="text-no-books"
              >
                {isAr
                  ? "لا توجد كتب متاحة بعد."
                  : "No books available yet."}
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible snap-x snap-mandatory pb-2 -mx-1 px-1">
                {allBooks.map((b) => {
                  const isCurrent = currentBook?.id === b.id;
                  const isComplete =
                    !b.locked &&
                    b.totalLessons > 0 &&
                    b.completedLessons >= b.totalLessons;
                  const pct =
                    b.totalLessons === 0
                      ? 0
                      : Math.round(
                          (b.completedLessons / b.totalLessons) * 100,
                        );
                  const title =
                    lang === "ar" && b.titleAr ? b.titleAr : b.title;
                  return (
                    <BookTile
                      key={b.id}
                      href={
                        b.locked
                          ? "/english"
                          : `/dashboard/english/curriculum/books/${b.id}`
                      }
                      bookNumber={b.bookNumber}
                      title={title}
                      pct={pct}
                      completed={b.completedLessons}
                      total={b.totalLessons}
                      kind={
                        b.locked
                          ? "locked"
                          : isComplete
                            ? "done"
                            : isCurrent
                              ? "current"
                              : "available"
                      }
                      isAr={isAr}
                      testId={`book-roadmap-tile-${b.id}`}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Stats — reduced from 5 → 3 ─────────────────────────
            Streak · Study Time · Lessons Completed. Renewal and
            unlocked-levels were removed; tier + allowed levels live in
            the hero badge, renewal is surfaced contextually elsewhere. */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Flame size={20} />}
            tone="from-orange-500 to-red-600"
            label={isAr ? "السلسلة اليومية" : "Daily streak"}
            loading={streakQuery.isLoading}
            value={
              isAr
                ? `${currentStreak} يوم`
                : `${currentStreak} ${currentStreak === 1 ? "day" : "days"}`
            }
            note={
              isAr
                ? `الأطول: ${longestStreak} · ${todayActive ? "نشِط اليوم" : "تابع اليوم"}`
                : `Best: ${longestStreak} · ${todayActive ? "Active today" : "Resume today"}`
            }
            testId="stat-streak"
          />
          <StatCard
            icon={<Clock size={20} />}
            tone="from-fuchsia-500 to-purple-600"
            label={isAr ? "وقت الدراسة" : "Study time"}
            loading={studyTimeQuery.isLoading}
            value={formatStudyMinutes(studyMinutes, isAr)}
            note={isAr ? "آخر 7 أيام" : "Last 7 days"}
            testId="stat-study-time"
          />
          <StatCard
            icon={<CheckCircle2 size={20} />}
            tone="from-emerald-500 to-teal-600"
            label={isAr ? "الدروس المكتملة" : "Lessons completed"}
            loading={lessonsLoading}
            value={`${completedCount} / ${totalAccessible}`}
            note={
              totalAccessible === 0
                ? isAr
                  ? "لا توجد دروس متاحة بعد"
                  : "No lessons available yet"
                : isAr
                  ? `${progressPct}٪ من المنهج`
                  : `${progressPct}% of your course`
            }
            testId="stat-lessons-completed"
          />
        </section>


        {/* Legacy "Practice tools" compact strip (single Vocabulary
            Flashcards link → /dashboard/english/flashcards) is
            intentionally removed from the visible English dashboard.
            The flashcards route/feature/SRS/XP are unchanged. */}

        {/* ── Locked levels hint ────────────────────────────────── */}
        {!lessonsLoading && allLessons.some((l) => l.locked) && (
          <section
            className="mt-6 bg-slate-50 dark:bg-gray-900/60 rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 flex items-start gap-3"
            data-testid="section-locked-hint"
          >
            <Lock
              size={16}
              className="mt-0.5 text-slate-400 dark:text-slate-500 shrink-0"
            />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? "بعض الدروس مقفلة لأنها خارج باقتك الحالية. رقّ خطّتك للوصول إلى كل المستويات."
                : "Some lessons are locked because they're outside your current plan. Upgrade to unlock all levels."}{" "}
              <Link
                href="/english"
                className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
              >
                {isAr ? "عرض الباقات" : "See plans"}
              </Link>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

// ─────────────────── Sub-components ───────────────────

function StatCard({
  icon,
  tone,
  label,
  value,
  note,
  testId,
  loading,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  note?: string;
  testId: string;
  loading?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow flex items-start gap-4"
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-md shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {/* B-24: skeleton placeholders during load instead of a bare "…"
            ellipsis. Same vertical footprint so the card doesn't reflow
            once the real value arrives. */}
        {loading ? (
          <>
            <div
              aria-hidden
              className="mt-2 h-6 w-20 rounded-md bg-slate-200/80 dark:bg-gray-700/70 animate-pulse"
              data-testid={`${testId}-skeleton-value`}
            />
            <div
              aria-hidden
              className="mt-2 h-3 w-28 rounded bg-slate-200/60 dark:bg-gray-700/50 animate-pulse"
              data-testid={`${testId}-skeleton-note`}
            />
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 break-words">
              {value}
            </p>
            {note && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {note}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  testId,
  icon,
  iconTone,
  title,
  subtitle,
  href,
  ctaLabel,
  isAr,
  disabled,
}: {
  testId: string;
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  isAr: boolean;
  disabled?: boolean;
}) {
  const Inner = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconTone} text-white flex items-center justify-center shadow shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight truncate">{title}</p>
        {/* B-22: allow up to 2 lines of subtitle (long Arabic resume meta
            otherwise gets truncated to "…" and hides the resume position). */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {subtitle}
        </p>
      </div>
    </div>
  );

  return (
    <li data-testid={testId}>
      {disabled ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 ring-1 ring-slate-200/70 dark:ring-gray-700/70 opacity-70">
          {Inner}
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            {isAr ? "—" : "—"}
          </span>
        </div>
      ) : (
        <Link
          href={href}
          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-gray-800/60 ring-1 ring-slate-200/70 dark:ring-gray-700/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:ring-indigo-200 dark:hover:ring-indigo-800 transition"
        >
          {Inner}
          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
            {ctaLabel}
            <ArrowRight size={13} className={isAr ? "rotate-180" : ""} />
          </span>
        </Link>
      )}
    </li>
  );
}

// Books Roadmap tile. Snap-aligned on mobile h-scroll, full-width tile in
// the md+ grid. Visual-only — clicking it deep-links into the existing
// curriculum book route, no curriculum logic is duplicated here.
function BookTile({
  href,
  bookNumber,
  title,
  pct,
  completed,
  total,
  kind,
  isAr,
  testId,
}: {
  href: string;
  bookNumber: number;
  title: string;
  pct: number;
  completed: number;
  total: number;
  kind: "locked" | "done" | "current" | "available";
  isAr: boolean;
  testId: string;
}) {
  const ringTone =
    kind === "current"
      ? "ring-2 ring-indigo-400/70 dark:ring-indigo-500/70"
      : kind === "done"
        ? "ring-1 ring-emerald-300/70 dark:ring-emerald-700/60"
        : "ring-1 ring-slate-200/70 dark:ring-gray-800";
  const numberTone =
    kind === "current"
      ? "from-indigo-600 to-purple-600 text-white"
      : kind === "done"
        ? "from-emerald-500 to-teal-600 text-white"
        : kind === "locked"
          ? "from-slate-300 to-slate-400 text-white dark:from-gray-700 dark:to-gray-800"
          : "from-slate-100 to-slate-200 text-slate-700 dark:from-gray-800 dark:to-gray-700 dark:text-slate-200";
  const badge =
    kind === "locked"
      ? { text: isAr ? "مقفل" : "Locked", cls: "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-slate-400" }
      : kind === "done"
        ? { text: isAr ? "مكتمل" : "Completed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" }
        : kind === "current"
          ? { text: isAr ? "تتعلّم الآن" : "In progress", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" }
          : { text: isAr ? "متاح" : "Available", cls: "bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300" };
  const isLocked = kind === "locked";

  return (
    <Link
      href={href}
      data-testid={testId}
      className={`group snap-start shrink-0 w-[78%] sm:w-[60%] md:w-auto bg-white/85 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-4 shadow ${ringTone} hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-3 min-h-[8rem]`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${numberTone} flex items-center justify-center font-extrabold text-base shadow-sm`}
          aria-hidden
        >
          {isLocked ? <Lock size={18} /> : bookNumber}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isAr ? `كتاب ${bookNumber}` : `Book ${bookNumber}`}
          </p>
          <p className="mt-0.5 text-sm font-bold leading-tight line-clamp-2 text-slate-900 dark:text-slate-100">
            {title}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}
        >
          {badge.text}
        </span>
      </div>

      {!isLocked && total > 0 && (
        <div className="mt-auto">
          <div
            className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className={`h-full transition-all ${
                kind === "done"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {isAr
              ? `${completed} / ${total} درس · ${pct}٪`
              : `${completed} / ${total} lessons · ${pct}%`}
          </p>
        </div>
      )}
    </Link>
  );
}
