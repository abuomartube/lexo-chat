import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  Globe,
  GraduationCap,
  Video,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
import { fetchMyLiveSessions, type LiveSession } from "@/lib/platform-api";

export default function LiveSessionsPage() {
  const t = useT();
  const { lang } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-live-sessions"],
    queryFn: fetchMyLiveSessions,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-gray-950 dark:via-indigo-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
            {t("liveSessions.title")}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
            {t("liveSessions.subtitle")}
          </p>
        </header>

        {isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 flex justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300 flex gap-2">
            <AlertCircle size={18} /> {(error as Error).message}
          </div>
        )}
        {data && data.length === 0 && !isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 text-center">
            <CalendarDays size={36} className="mx-auto text-slate-400" />
            <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
              {t("liveSessions.empty")}
            </p>
          </div>
        )}
        {data && data.length > 0 && (
          <ul className="space-y-3">
            {data.map((s) => (
              <SessionCard key={s.id} session={s} lang={lang} t={t} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function SessionCard({
  session,
  lang,
  t,
}: {
  session: LiveSession;
  lang: "en" | "ar";
  t: (k: import("@/lib/translations").TranslationKey) => string;
}) {
  const startsAt = new Date(session.startsAt);
  const endsAt = new Date(startsAt.getTime() + session.durationMin * 60_000);
  const now = Date.now();
  const isLive =
    now >= startsAt.getTime() - 10 * 60_000 && now <= endsAt.getTime();
  const isPast = now > endsAt.getTime();
  const dateStr = startsAt.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <li
      className={`rounded-2xl bg-white dark:bg-gray-900 border p-5 transition ${
        isLive
          ? "border-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-emerald-950/40"
          : "border-slate-200 dark:border-gray-800"
      }`}
      data-testid={`live-session-${session.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {session.audience === "public" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                <Globe size={12} /> {t("liveSessions.badge.public")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold">
                <GraduationCap size={12} />{" "}
                {session.course === "english"
                  ? t("liveSessions.badge.english")
                  : t("liveSessions.badge.ielts")}
                {session.tier ? ` · ${session.tier}` : ""}
              </span>
            )}
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {t("liveSessions.badge.live")}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-bold">{session.title}</h2>
          {session.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {session.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} /> {dateStr}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {session.durationMin}{" "}
              {t("liveSessions.minutes")}
            </span>
          </div>
        </div>
        {!isPast && (
          <a
            href={session.zoomJoinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm shadow-sm ${
              isLive
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
            data-testid={`join-${session.id}`}
          >
            <Video size={16} /> {t("liveSessions.join")}
          </a>
        )}
      </div>
    </li>
  );
}
