import { useQuery } from "@tanstack/react-query";
import { Award, Download, Loader2 } from "lucide-react";
import {
  fetchMyCertificates,
  getCertificatePdfUrl,
  type MyCertificate,
  type CertificateCourse,
} from "@/lib/platform-api";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

const COURSE_KEY: Record<CertificateCourse, TranslationKey> = {
  intro: "admin.certs.course.intro",
  english: "admin.certs.course.english",
};

function formatDate(iso: string, lang: "en" | "ar"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function MyCertificates() {
  const t = useT();
  const { lang } = useLanguage();
  const query = useQuery({
    queryKey: ["my-certificates"],
    queryFn: fetchMyCertificates,
  });

  return (
    <section
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
      data-testid="my-certificates"
    >
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            {t("certs.section.title")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("certs.section.subtitle")}
          </p>
        </div>
        {query.isLoading && (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        )}
      </header>

      {query.isError && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm">
          {(query.error as Error).message}
        </div>
      )}

      {!query.isLoading &&
        !query.isError &&
        (query.data?.length ?? 0) === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-gray-700 px-4 py-8 text-center">
            <Award className="mx-auto text-slate-400" size={28} />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
              {t("certs.empty.title")}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("certs.empty.body")}
            </p>
          </div>
        )}

      {(query.data?.length ?? 0) > 0 && (
        <ul className="space-y-3">
          {query.data!.map((c) => (
            <CertificateCard key={c.id} cert={c} lang={lang} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CertificateCard({
  cert,
  lang,
  t,
}: {
  cert: MyCertificate;
  lang: "en" | "ar";
  t: (k: TranslationKey) => string;
}) {
  const courseLabel = t(COURSE_KEY[cert.course] ?? "admin.certs.course.intro");
  const pdfUrl = getCertificatePdfUrl(cert.id);
  return (
    <li
      className="rounded-xl border border-slate-200 dark:border-gray-800 bg-gradient-to-br from-white to-indigo-50/40 dark:from-gray-900 dark:to-indigo-950/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      data-testid={`certificate-${cert.certificateId}`}
    >
      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow shrink-0">
        <Award size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
          {courseLabel} <span className="text-slate-400">·</span>{" "}
          <span className="capitalize">{cert.tier}</span>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          <span dir="ltr" className="font-mono">
            {cert.certificateId}
          </span>
          <span className="mx-1.5">·</span>
          {t("certs.col.completion")}: {formatDate(cert.completionDate, lang)}
        </p>
      </div>
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold shadow shrink-0"
        data-testid={`certificate-download-${cert.certificateId}`}
      >
        <Download size={15} />
        {t("certs.download")}
      </a>
    </li>
  );
}
