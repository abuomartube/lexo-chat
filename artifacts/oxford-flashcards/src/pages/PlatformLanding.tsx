import { Link } from "wouter";
import {
  Sparkles,
  ArrowRight,
  Brain,
  Globe2,
  Volume2,
  GraduationCap,
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Trophy,
  Mic,
  PenLine,
  Headphones,
  Star,
} from "lucide-react";
import edulexoLogo from "@/assets/edulexo-logo.png";
import edulexoMaster from "@/assets/edulexo-master-transparent.png";
import Header from "@/components/Header";
import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

type Feature = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  color: string;
};

const platformFeatures: Feature[] = [
  {
    icon: Brain,
    titleKey: "platform.feat1.title",
    descKey: "platform.feat1.desc",
    color: "from-indigo-500 to-purple-600",
  },
  {
    icon: Volume2,
    titleKey: "platform.feat2.title",
    descKey: "platform.feat2.desc",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Globe2,
    titleKey: "platform.feat3.title",
    descKey: "platform.feat3.desc",
    color: "from-purple-500 to-pink-600",
  },
  {
    icon: GraduationCap,
    titleKey: "platform.feat4.title",
    descKey: "platform.feat4.desc",
    color: "from-violet-500 to-indigo-600",
  },
  {
    icon: TrendingUp,
    titleKey: "platform.feat5.title",
    descKey: "platform.feat5.desc",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: ClipboardCheck,
    titleKey: "platform.feat6.title",
    descKey: "platform.feat6.desc",
    color: "from-amber-500 to-orange-600",
  },
];

type Highlight = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  textKey: TranslationKey;
};

const englishHighlights: Highlight[] = [
  { icon: BookOpen, textKey: "platform.eng.h1" },
  { icon: Volume2, textKey: "platform.eng.h2" },
  { icon: Mic, textKey: "platform.eng.h3" },
  { icon: Trophy, textKey: "platform.eng.h4" },
];

const ieltsHighlights: Highlight[] = [
  { icon: Brain, textKey: "platform.ielts.h1" },
  { icon: PenLine, textKey: "platform.ielts.h2" },
  { icon: Headphones, textKey: "platform.ielts.h3" },
  { icon: ClipboardCheck, textKey: "platform.ielts.h4" },
];

export default function PlatformLanding() {
  const t = useT();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50 dark:opacity-30">
          <div className="absolute -top-32 -left-20 w-[520px] h-[520px] bg-indigo-300 dark:bg-indigo-700 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[520px] h-[520px] bg-blue-300 dark:bg-blue-700 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] bg-purple-200 dark:bg-purple-800 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-10 sm:pb-12 text-center">
          {/* Master brand showcase — dark gradient panel that matches the logo's native palette */}
          <div className="relative mx-auto max-w-4xl mb-8 sm:mb-10">
            <div className="absolute -inset-3 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-blue-500/30 dark:from-indigo-500/40 dark:via-purple-500/40 dark:to-blue-500/40 rounded-[2rem] blur-2xl" />
            <div className="relative rounded-3xl bg-gradient-to-br from-[#0d0e2a] via-[#161a3d] to-[#0d0e2a] border border-indigo-500/20 shadow-2xl shadow-indigo-900/30 px-6 sm:px-10 py-7 sm:py-9 overflow-hidden">
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute -top-16 -left-16 w-64 h-64 bg-purple-600 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-blue-600 rounded-full blur-3xl" />
              </div>
              <img
                src={edulexoMaster}
                alt={t("platform.hero.alt")}
                className="relative w-full max-w-2xl h-auto mx-auto select-none drop-shadow-[0_0_24px_rgba(139,92,246,0.35)]"
                draggable={false}
              />
            </div>
          </div>

          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} />
            {t("common.poweredByAi")}
          </span>

          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            <span className="text-slate-900 dark:text-white">
              {t("platform.hero.headline1")}
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
              {t("platform.hero.headline2")}
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t("platform.hero.subtitle")}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#products"
              className="glow-button inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-95 transition"
            >
              {t("common.exploreCourses")}
              <ArrowRight size={18} />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:scale-[1.03] active:scale-95 transition shadow-sm"
            >
              {t("common.seeFeatures")}
            </a>
          </div>
        </div>
      </section>

      {/* PRODUCTS — TWO COURSE CARDS */}
      <section
        id="products"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-20"
      >
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            {t("platform.products.eyebrow")}
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("platform.products.title")}
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t("platform.products.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEXO FOR ENGLISH CARD */}
          <div className="glow-card neon-border group relative rounded-3xl overflow-hidden border-2 border-violet-200/60 dark:border-violet-800/60 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/40 dark:via-slate-900 dark:to-purple-950/40 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-600 to-fuchsia-500" />
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                    {t("platform.products.courseOne")}
                  </p>
                  <h4 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {t("platform.products.englishName")}
                  </h4>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shrink-0">
                  <BookOpen size={28} />
                </div>
              </div>

              <p className="mt-5 text-slate-700 dark:text-slate-300 leading-relaxed">
                {t("platform.products.englishDesc")}
              </p>

              <ul className="mt-5 space-y-2.5">
                {englishHighlights.map((h) => (
                  <li
                    key={h.textKey}
                    className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                      <h.icon size={15} />
                    </span>
                    <span className="font-medium">{t(h.textKey)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/english"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-semibold shadow hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
                >
                  {t("common.viewDetails")}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/english"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  {t("common.enrollNow")}
                </Link>
              </div>
            </div>
          </div>

          {/* LEXO FOR IELTS CARD */}
          <div className="glow-card neon-border group relative rounded-3xl overflow-hidden border-2 border-emerald-200/60 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 shadow-md hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600" />
            <div className="absolute top-5 end-5 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                <Star size={10} />
                {t("platform.products.mostAdvanced")}
              </span>
            </div>
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    {t("platform.products.courseTwo")}
                  </p>
                  <h4 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {t("platform.products.ieltsName")}
                  </h4>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <Trophy size={28} />
                </div>
              </div>

              <p className="mt-5 text-slate-700 dark:text-slate-300 leading-relaxed">
                {t("platform.products.ieltsDesc")}
              </p>

              <ul className="mt-5 space-y-2.5">
                {ieltsHighlights.map((h) => (
                  <li
                    key={h.textKey}
                    className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <h.icon size={15} />
                    </span>
                    <span className="font-medium">{t(h.textKey)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/ielts"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold shadow hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
                >
                  {t("common.viewDetails")}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/ielts"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  {t("common.enrollNow")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section
        id="features"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-20"
      >
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
            {t("platform.features.eyebrow")}
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("platform.features.title")}
          </h3>
          <p className="mt-4 text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 max-w-3xl mx-auto">
            {t("platform.features.tagline")}
          </p>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {t("platform.features.subtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {platformFeatures.map((f) => (
            <div
              key={f.titleKey}
              className="glow-card group relative rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform mb-4`}
              >
                <f.icon size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {t(f.titleKey)}
              </h4>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(f.descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-700 p-8 sm:p-12 text-center shadow-2xl">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t("platform.cta.title")}
            </h3>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">
              {t("platform.cta.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/english"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-indigo-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
              >
                <BookOpen size={18} />
                {t("platform.products.englishName")}
              </Link>
              <Link
                href="/ielts"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-emerald-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
              >
                <Trophy size={18} />
                {t("platform.products.ieltsName")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-gray-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={edulexoLogo}
              alt="Abu Omar EduLexo"
              className="w-9 h-9 object-contain"
            />
            <div className="leading-tight">
              <p className="text-sm font-bold">
                <span className="text-slate-900 dark:text-white">
                  {t("common.brandPrefix")}
                </span>
                <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                  {t("common.brandSuffix")}
                </span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-blue-600 dark:text-blue-400">
                {t("common.tagline")}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
            © {new Date().getFullYear()} {t("common.copyright")}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <a
              href="#"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              {t("common.privacy")}
            </a>
            <span>·</span>
            <a
              href="#"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              {t("common.terms")}
            </a>
            <span>·</span>
            <a
              href="#"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              {t("common.contact")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
