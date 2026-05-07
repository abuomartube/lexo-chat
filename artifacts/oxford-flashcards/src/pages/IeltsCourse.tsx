import { Link } from "wouter";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Mic,
  PenLine,
  Headphones,
  BookMarked,
  Trophy,
  Brain,
  ClipboardCheck,
  Flame,
  FileText,
  Repeat,
  Target,
  Globe2,
  Layers,
  Rocket,
  GraduationCap,
  Crown,
} from "lucide-react";
import edulexoLogo from "@/assets/edulexo-logo.png";
import lexoIeltsLogo from "@/assets/lexo-ielts.png";
import tierIntroLogo from "@assets/F404C41A-045C-42E8-B2EF-B75CBD59294E_1777643375926.PNG";
import tierAdvanceLogo from "@assets/29C649F8-7100-4DBE-95BE-491CAAA5B4E8_1777643368790.PNG";
import tierCompleteLogo from "@assets/890CB599-C509-44F9-A6D7-493614DAC2F9_1777643368791.PNG";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

type IeltsModule = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  gradient: string;
};

const ieltsModules: IeltsModule[] = [
  {
    icon: BookOpen,
    titleKey: "ielts.mod.vocab.title",
    descKey: "ielts.mod.vocab.desc",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Mic,
    titleKey: "ielts.mod.churchill.title",
    descKey: "ielts.mod.churchill.desc",
    gradient: "from-rose-500 to-red-600",
  },
  {
    icon: PenLine,
    titleKey: "ielts.mod.orwell.title",
    descKey: "ielts.mod.orwell.desc",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Headphones,
    titleKey: "ielts.mod.listening.title",
    descKey: "ielts.mod.listening.desc",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    icon: BookMarked,
    titleKey: "ielts.mod.reading.title",
    descKey: "ielts.mod.reading.desc",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Trophy,
    titleKey: "ielts.mod.mock.title",
    descKey: "ielts.mod.mock.desc",
    gradient: "from-yellow-500 to-amber-600",
  },
  {
    icon: Brain,
    titleKey: "ielts.mod.chat.title",
    descKey: "ielts.mod.chat.desc",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    icon: FileText,
    titleKey: "ielts.mod.stories.title",
    descKey: "ielts.mod.stories.desc",
    gradient: "from-fuchsia-500 to-pink-600",
  },
  {
    icon: Target,
    titleKey: "ielts.mod.spell.title",
    descKey: "ielts.mod.spell.desc",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    icon: Repeat,
    titleKey: "ielts.mod.spaced.title",
    descKey: "ielts.mod.spaced.desc",
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    icon: Layers,
    titleKey: "ielts.mod.grammar.title",
    descKey: "ielts.mod.grammar.desc",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    icon: Flame,
    titleKey: "ielts.mod.streaks.title",
    descKey: "ielts.mod.streaks.desc",
    gradient: "from-orange-500 to-red-600",
  },
];

type ValueProp = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelKey: TranslationKey;
};

const valueProps: ValueProp[] = [
  { icon: ClipboardCheck, labelKey: "ielts.value.vocab" },
  { icon: Brain, labelKey: "ielts.value.coaches" },
  { icon: Trophy, labelKey: "ielts.value.tests" },
  { icon: Globe2, labelKey: "ielts.value.bilingual" },
];

type Tier = {
  id: "intro" | "mid" | "complete";
  icon: React.ComponentType<{ size?: number; className?: string }>;
  logoSrc: string;
  logoBg: string;
  href: string;
  external: boolean;
  comingSoon: boolean;
  highlighted: boolean;
  ringClasses: string;
  iconGradient: string;
  ctaClasses: string;
  nameKey: TranslationKey;
  rangeKey: TranslationKey;
  bandKey: TranslationKey;
  blurbKey: TranslationKey;
  features: TranslationKey[];
};

const tiers: Tier[] = [
  {
    id: "intro",
    icon: Rocket,
    logoSrc: tierIntroLogo,
    logoBg: "bg-gradient-to-br from-[#0a1230] via-[#0d1a45] to-[#0a1230]",
    href: "/course/ielts/intro",
    external: true,
    comingSoon: false,
    highlighted: false,
    ringClasses: "border-slate-200 dark:border-slate-800",
    iconGradient: "from-sky-500 to-blue-600",
    ctaClasses:
      "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-95",
    nameKey: "ielts.tier.intro.name",
    rangeKey: "ielts.tier.intro.range",
    bandKey: "ielts.tier.intro.band",
    blurbKey: "ielts.tier.intro.blurb",
    features: [
      "ielts.tier.intro.f1",
      "ielts.tier.intro.f2",
      "ielts.tier.intro.f3",
      "ielts.tier.intro.f4",
    ],
  },
  {
    id: "mid",
    icon: GraduationCap,
    logoSrc: tierAdvanceLogo,
    logoBg: "bg-gradient-to-br from-[#1a0a30] via-[#2a0d4d] to-[#1a0a30]",
    href: "/course/ielts/advance",
    external: true,
    comingSoon: false,
    highlighted: false,
    ringClasses: "border-slate-200 dark:border-slate-800",
    iconGradient: "from-violet-500 to-purple-600",
    ctaClasses:
      "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-95",
    nameKey: "ielts.tier.mid.name",
    rangeKey: "ielts.tier.mid.range",
    bandKey: "ielts.tier.mid.band",
    blurbKey: "ielts.tier.mid.blurb",
    features: [
      "ielts.tier.mid.f1",
      "ielts.tier.mid.f2",
      "ielts.tier.mid.f3",
      "ielts.tier.mid.f4",
    ],
  },
  {
    id: "complete",
    icon: Crown,
    logoSrc: tierCompleteLogo,
    logoBg: "bg-gradient-to-br from-[#0a1230] via-[#0d1f2a] to-[#0a1230]",
    href: "/course/ielts/complete",
    external: true,
    comingSoon: false,
    highlighted: true,
    ringClasses:
      "border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/40 dark:ring-emerald-500/40",
    iconGradient: "from-emerald-500 to-teal-600",
    ctaClasses:
      "bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30",
    nameKey: "ielts.tier.complete.name",
    rangeKey: "ielts.tier.complete.range",
    bandKey: "ielts.tier.complete.band",
    blurbKey: "ielts.tier.complete.blurb",
    features: [
      "ielts.tier.complete.f1",
      "ielts.tier.complete.f2",
      "ielts.tier.complete.f3",
      "ielts.tier.complete.f4",
    ],
  },
];

export default function IeltsCourse() {
  const t = useT();
  const { dir } = useLanguage();
  // Back arrow direction-aware
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/40 dark:from-gray-950 dark:via-emerald-950/30 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40 dark:opacity-25">
          <div className="absolute -top-32 -left-20 w-[520px] h-[520px] bg-emerald-300 dark:bg-emerald-700 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[520px] h-[520px] bg-teal-300 dark:bg-teal-700 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] bg-cyan-200 dark:bg-cyan-800 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-12">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 text-center lg:text-start">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={14} />
                {t("common.poweredByAi")}
              </span>

              <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                <span className="text-slate-900 dark:text-white">
                  {t("ielts.hero.headline1")}
                </span>
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  {t("ielts.hero.headline2")}
                </span>
              </h2>

              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t("ielts.hero.subtitle")}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <a
                  href="#tiers"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  {t("ielts.hero.cta1")}
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#modules"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:scale-[1.03] active:scale-95 transition shadow-sm"
                >
                  {t("ielts.hero.cta2")}
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                {valueProps.map((v) => (
                  <span
                    key={v.labelKey}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    <v.icon
                      size={13}
                      className="text-emerald-500 dark:text-emerald-400"
                    />
                    {t(v.labelKey)}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column — video / preview */}
            <div className="lg:col-span-5">
              <div className="relative max-w-md mx-auto">
                <div className="absolute -inset-4 bg-gradient-to-br from-emerald-400/30 to-teal-300/30 dark:from-emerald-600/30 dark:to-teal-600/30 rounded-3xl blur-2xl" />
                <div className="relative bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-3xl p-3 shadow-xl overflow-hidden">
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a1f1d] via-[#0d2a26] to-[#0a1f1d] border border-emerald-500/20 aspect-square sm:aspect-[4/3] flex items-center justify-center p-5 sm:p-6">
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <div className="absolute -top-16 -left-16 w-56 h-56 bg-emerald-500 rounded-full blur-3xl" />
                      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-500 rounded-full blur-3xl" />
                    </div>
                    <img
                      src={lexoIeltsLogo}
                      alt={t("ielts.brandAlt")}
                      className="relative w-full h-full object-contain select-none drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                      draggable={false}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                        {t("ielts.preview.vocab")}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        2,198
                      </p>
                    </div>
                    <div className="rounded-lg bg-teal-50 dark:bg-teal-900/30 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">
                        {t("ielts.preview.tests")}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        L · R · M
                      </p>
                    </div>
                    <div className="rounded-lg bg-cyan-50 dark:bg-cyan-900/30 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
                        {t("ielts.preview.ai")}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {t("ielts.preview.coaches")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIERS — CHOOSE YOUR TRACK */}
      <section
        id="tiers"
        className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 sm:pt-6 pb-10 sm:pb-14 scroll-mt-20"
      >
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            {t("ielts.tiers.eyebrow")}
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("ielts.tiers.title")}
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {t("ielts.tiers.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {tiers.map((tier) => {
            const TierIcon = tier.icon;
            const ctaLabel = tier.comingSoon
              ? t("ielts.tiers.cta.notify")
              : t("courses.upsell.cta");
            const CtaArrow = dir === "rtl" ? ArrowLeft : ArrowRight;
            const ctaInner = (
              <span className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition">
                {ctaLabel}
                {!tier.comingSoon && <CtaArrow size={16} />}
              </span>
            );

            return (
              <div
                key={tier.id}
                className={`glow-card neon-border relative flex flex-col rounded-2xl bg-white dark:bg-slate-900/60 border ${tier.ringClasses} p-6 shadow-sm hover:shadow-xl transition-all ${tier.highlighted ? "md:-translate-y-2" : "hover:-translate-y-0.5"}`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    <Sparkles size={11} />
                    {t("ielts.tiers.popular")}
                  </span>
                )}
                {tier.comingSoon && (
                  <span className="absolute top-4 end-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    {t("ielts.tiers.comingSoon")}
                  </span>
                )}

                <div
                  className={`relative aspect-square w-full overflow-hidden rounded-2xl ${tier.logoBg} shadow-md mb-4 flex items-center justify-center p-3`}
                >
                  <img
                    src={tier.logoSrc}
                    alt={t(tier.nameKey)}
                    className="relative w-full h-full object-contain select-none drop-shadow-[0_0_24px_rgba(255,255,255,0.18)]"
                    draggable={false}
                  />
                  <div
                    className={`absolute top-3 end-3 w-9 h-9 rounded-xl bg-gradient-to-br ${tier.iconGradient} flex items-center justify-center text-white shadow-lg ring-2 ring-white/20`}
                  >
                    <TierIcon size={18} />
                  </div>
                </div>

                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {t(tier.nameKey)}
                </h4>
                <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {t(tier.rangeKey)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">
                    {t("ielts.tiers.bandLabel")}:
                  </span>{" "}
                  {t(tier.bandKey)}
                </p>

                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(tier.blurbKey)}
                </p>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {tier.features.map((fKey) => (
                    <li
                      key={fKey}
                      className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0"
                      />
                      <span>{t(fKey)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {tier.comingSoon ? (
                    <button
                      type="button"
                      disabled
                      className={`w-full ${tier.ctaClasses} rounded-xl`}
                      aria-disabled="true"
                    >
                      {ctaInner}
                    </button>
                  ) : (
                    <Link
                      href={tier.href}
                      data-testid={`link-enroll-tier-${tier.id}`}
                      className={`block w-full ${tier.ctaClasses} rounded-xl`}
                    >
                      {ctaInner}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODULES — WHAT'S INSIDE */}
      <section
        id="modules"
        className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-20"
      >
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider">
            {t("ielts.modules.eyebrow")}
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("ielts.modules.title")}
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t("ielts.modules.subtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ieltsModules.map((m) => (
            <div
              key={m.titleKey}
              className="group relative rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}
                >
                  <m.icon size={22} />
                </div>
                <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  {t("ielts.modules.included")}
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {t(m.titleKey)}
              </h4>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(m.descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ENROLL CTA */}
      <section
        id="enroll"
        className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 scroll-mt-20"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 p-8 sm:p-12 text-center shadow-2xl">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider">
              <Trophy size={14} />
              {t("ielts.cta.eyebrow")}
            </span>
            <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {t("ielts.cta.title")}
            </h3>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">
              {t("ielts.cta.subtitle")}
            </p>

            {/* Payment options preview */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {["Tabby", "Tamara", "Visa / Stripe", "Bank Transfer"].map(
                (p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm"
                  >
                    <CheckCircle2 size={12} />
                    {p}
                  </span>
                ),
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup?course=ielts"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-emerald-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
              >
                <Sparkles size={18} />
                {t("ielts.cta.button")}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 text-white font-semibold border border-white/30 hover:bg-white/20 hover:scale-105 active:scale-95 transition"
              >
                <BackIcon size={16} />
                {t("ielts.cta.back")}
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/70">{t("ielts.cta.note")}</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-gray-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
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
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-600 dark:text-emerald-400">
                {t("ielts.footer.brand")}
              </p>
            </div>
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
            © {new Date().getFullYear()} {t("common.copyright")}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <a
              href="#"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              {t("common.privacy")}
            </a>
            <span>·</span>
            <a
              href="#"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              {t("common.terms")}
            </a>
            <span>·</span>
            <a
              href="#"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              {t("common.contact")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
