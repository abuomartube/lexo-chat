import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  UserRound,
  Award,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  fetchPublicProfile,
  avatarViewUrl,
  type PublicProfileCert,
} from "@/lib/platform-api";
import type { TranslationKey } from "@/lib/translations";

const COURSE_LABEL: Record<PublicProfileCert["course"], TranslationKey> = {
  intro: "admin.certs.course.intro",
  english: "admin.certs.course.english",
};

function fmtDate(iso: string, lang: "en" | "ar"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtMonth(iso: string, lang: "en" | "ar"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
  });
}

export default function PublicProfile() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId ?? "";
  const t = useT();
  const { lang } = useLanguage();
  const { user: me } = useAuth();
  const isMe = !!me && me.id === userId;

  const query = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => fetchPublicProfile(userId),
    enabled: !!userId,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
        >
          <ArrowLeft size={15} className="rtl:rotate-180" />
          {t("settings.backToDashboard")}
        </Link>

        {query.isLoading && (
          <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-12 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow flex items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        )}

        {query.isError && (
          <div className="bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-200 dark:ring-rose-900/40 rounded-2xl p-6 text-rose-700 dark:text-rose-300 inline-flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{t("publicProfile.errTitle")}</p>
              <p className="text-sm mt-0.5">{t("publicProfile.errBody")}</p>
            </div>
          </div>
        )}

        {query.data && (
          <>
            {/* Identity card */}
            <section
              data-testid="public-profile-card"
              className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-3xl p-7 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow flex flex-col sm:flex-row sm:items-center gap-6"
            >
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto sm:mx-0 shrink-0">
                {avatarViewUrl(query.data.avatarUrl) ? (
                  <img
                    src={avatarViewUrl(query.data.avatarUrl)!}
                    alt={query.data.name}
                    className="w-full h-full object-cover"
                    data-testid="public-avatar"
                  />
                ) : (
                  <UserRound size={56} className="text-white/90" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-start">
                <h1
                  data-testid="public-name"
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight break-words"
                >
                  {query.data.name}
                </h1>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Calendar size={13} />
                  {t("publicProfile.memberSince")}{" "}
                  {fmtMonth(query.data.memberSince, lang)}
                </p>
                {query.data.bio ? (
                  <p
                    data-testid="public-bio"
                    className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line break-words"
                  >
                    {query.data.bio}
                  </p>
                ) : (
                  <p
                    data-testid="public-bio-empty"
                    className="mt-3 text-sm italic text-slate-400 dark:text-slate-500"
                  >
                    {isMe
                      ? t("publicProfile.bioEmptySelf")
                      : t("publicProfile.bioEmptyOther")}
                  </p>
                )}
                {isMe && (
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
                    data-testid="link-edit-on-dashboard"
                  >
                    {t("publicProfile.editOnDashboard")}
                  </Link>
                )}
              </div>
            </section>

            {/* Certificates */}
            <section
              data-testid="public-certificates"
              className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
            >
              <header className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-amber-500" />
                <h2 className="text-lg font-bold">
                  {t("publicProfile.certsTitle")}
                </h2>
                <span className="ml-auto rtl:ml-0 rtl:mr-auto inline-flex items-center justify-center min-w-7 h-6 px-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
                  {query.data.certificates.length}
                </span>
              </header>
              {query.data.certificates.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  {t("publicProfile.certsEmpty")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {query.data.certificates.map((c) => (
                    <li
                      key={c.id}
                      data-testid="public-cert-row"
                      className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 ring-1 ring-amber-200/60 dark:ring-amber-900/30"
                    >
                      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow">
                        <Award size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">
                          {t(COURSE_LABEL[c.course])} ·{" "}
                          <span className="capitalize">{c.tier}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t("publicProfile.completedOn")}{" "}
                          {fmtDate(c.completionDate, lang)}
                        </p>
                        <p
                          className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 break-all"
                          dir="ltr"
                        >
                          {c.certificateId}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
