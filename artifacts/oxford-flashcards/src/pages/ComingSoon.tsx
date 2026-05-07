import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

type Props = {
  titleKey: TranslationKey;
  descKey?: TranslationKey;
};

export default function ComingSoon({ titleKey, descKey }: Props) {
  const t = useT();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} /> {t("comingSoon.eyebrow")}
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
            {t(titleKey)}
          </span>
        </h1>
        {descKey && (
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            {t(descKey)}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md"
          >
            {t("common.backToHome")}
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold ring-1 ring-slate-300 dark:ring-gray-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            {t("common.createAccount")}
          </Link>
        </div>
      </main>
    </div>
  );
}
