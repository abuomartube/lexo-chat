import { Link } from "wouter";
import {
  Sparkles,
  BookOpen,
  Mic,
  PenLine,
  Headphones,
  BookMarked,
  Trophy,
  Video,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Globe2,
  Volume2,
  Layers,
  Award,
  ShoppingCart,
} from "lucide-react";
import lexoLogo from "@/assets/lexo-icon.png";
import lexoEnglishLogo from "@/assets/lexo-english.png";
import Header from "@/components/Header";
import { useCart } from "@/lib/cart-context";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { TranslationKey } from "@/lib/translations";

type Module = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  gradient: string;
  status: "ready" | "soon";
  href?: string;
};

const modules: Module[] = [
  {
    icon: BookOpen,
    titleKey: "english.mod.vocab.title",
    descKey: "english.mod.vocab.desc",
    gradient: "from-violet-500 to-purple-700",
    status: "ready",
    href: "/demo",
  },
  {
    icon: Video,
    titleKey: "english.mod.lessons.title",
    descKey: "english.mod.lessons.desc",
    gradient: "from-rose-500 to-pink-600",
    status: "soon",
  },
  {
    icon: Mic,
    titleKey: "english.mod.speaking.title",
    descKey: "english.mod.speaking.desc",
    gradient: "from-amber-400 to-orange-500",
    status: "soon",
  },
  {
    icon: PenLine,
    titleKey: "english.mod.writing.title",
    descKey: "english.mod.writing.desc",
    gradient: "from-emerald-500 to-teal-600",
    status: "soon",
  },
  {
    icon: Headphones,
    titleKey: "english.mod.listening.title",
    descKey: "english.mod.listening.desc",
    gradient: "from-sky-500 to-blue-600",
    status: "soon",
  },
  {
    icon: BookMarked,
    titleKey: "english.mod.reading.title",
    descKey: "english.mod.reading.desc",
    gradient: "from-fuchsia-500 to-purple-600",
    status: "soon",
  },
  {
    icon: Trophy,
    titleKey: "english.mod.test.title",
    descKey: "english.mod.test.desc",
    gradient: "from-yellow-500 to-amber-600",
    status: "soon",
  },
];

type Pkg = {
  tier: "beginner" | "intermediate" | "advanced";
  nameKey: TranslationKey;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  scopeKey: TranslationKey;
  featureKeys: TranslationKey[];
  levels: string;
  gradient: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge: TranslationKey | null;
};

const packages: Pkg[] = [
  {
    tier: "beginner",
    nameKey: "english.pkg1.name",
    labelKey: "english.pkg1.label",
    descKey: "english.pkg1.desc",
    scopeKey: "english.pkg1.scope",
    featureKeys: [
      "english.course.tier.foundations.f1",
      "english.course.tier.foundations.f2",
      "english.course.tier.foundations.f3",
      "english.course.tier.foundations.f4",
    ],
    levels: "A1 → B1",
    gradient: "from-emerald-400 via-teal-500 to-sky-600",
    icon: GraduationCap,
    badge: null,
  },
  {
    tier: "intermediate",
    nameKey: "english.pkg2.name",
    labelKey: "english.pkg2.label",
    descKey: "english.pkg2.desc",
    scopeKey: "english.pkg2.scope",
    featureKeys: [
      "english.course.tier.advanced.f1",
      "english.course.tier.advanced.f2",
      "english.course.tier.advanced.f3",
      "english.course.tier.advanced.f4",
    ],
    levels: "B1 → C1",
    gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    icon: Trophy,
    badge: null,
  },
  {
    tier: "advanced",
    nameKey: "english.pkg3.name",
    labelKey: "english.pkg3.label",
    descKey: "english.pkg3.desc",
    scopeKey: "english.pkg3.scope",
    featureKeys: [
      "english.course.tier.complete.f1",
      "english.course.tier.complete.f2",
      "english.course.tier.complete.f3",
      "english.course.tier.complete.f4",
    ],
    levels: "A1 → C1",
    gradient: "from-amber-400 via-orange-500 to-rose-600",
    icon: Award,
    badge: "english.packages.bestValue",
  },
];

type Highlight = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelKey: TranslationKey;
};

const highlights: Highlight[] = [
  { icon: Volume2, labelKey: "english.highlight.audio" },
  { icon: Globe2, labelKey: "english.highlight.bilingual" },
  { icon: Layers, labelKey: "english.highlight.cefr" },
  { icon: CheckCircle2, labelKey: "english.highlight.teacher" },
];

export default function LandingPage() {
  const t = useT();
  const { addItem, hasItem } = useCart();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-orange-50/40 dark:from-gray-950 dark:via-violet-950/40 dark:to-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40 dark:opacity-30">
          <div className="absolute -top-32 -left-20 w-[500px] h-[500px] bg-violet-300 dark:bg-violet-700 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-orange-300 dark:bg-amber-700 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] bg-pink-200 dark:bg-fuchsia-800 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left column — copy */}
            <div className="lg:col-span-7 text-center lg:text-start">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={14} />
                {t("english.eyebrow")}
              </span>

              <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                <span className="text-gray-900 dark:text-white">
                  {t("english.hero.headline1")}
                </span>
                <br />
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-orange-500 dark:from-violet-400 dark:via-purple-400 dark:to-amber-400 bg-clip-text text-transparent">
                  {t("english.hero.headline2")}
                </span>
              </h2>

              <p className="mt-5 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t("english.hero.subtitle")}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <a
                  href="/dashboard"
                  data-testid="link-hero-open-english"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.03] active:scale-95 transition"
                >
                  {t("english.tier.openCourse")}
                  <ArrowRight size={18} />
                </a>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:scale-[1.03] active:scale-95 transition shadow-sm"
                >
                  {t("english.hero.cta2")}
                </Link>
              </div>

              {/* Highlight chips */}
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                {highlights.map((h) => (
                  <span
                    key={h.labelKey}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    <h.icon
                      size={13}
                      className="text-violet-500 dark:text-violet-400"
                    />
                    {t(h.labelKey)}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column — preview card */}
            <div className="lg:col-span-5">
              <div className="relative max-w-md mx-auto space-y-4">
                <div className="absolute -inset-4 bg-gradient-to-br from-violet-400/30 to-orange-300/30 dark:from-violet-600/30 dark:to-amber-600/30 rounded-3xl blur-2xl" />

                {/* Brand showcase — LEXO for English logo on dark gradient panel */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0d0e2a] via-[#1a1340] to-[#0d0e2a] border border-violet-500/20 shadow-xl shadow-violet-900/20 p-5 sm:p-6 flex items-center justify-center aspect-[16/9]">
                  <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute -top-10 -left-10 w-48 h-48 bg-violet-600 rounded-full blur-3xl" />
                    <div className="absolute -bottom-12 -right-12 w-52 h-52 bg-fuchsia-500 rounded-full blur-3xl" />
                  </div>
                  <img
                    src={lexoEnglishLogo}
                    alt={t("english.brandAlt")}
                    className="relative w-full h-full object-contain select-none drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                    draggable={false}
                  />
                </div>

                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      {t("english.preview.today")}
                    </span>
                  </div>

                  {/* Mock flashcard */}
                  <div className="rounded-2xl bg-gradient-to-br from-violet-100 via-violet-50 to-purple-100 dark:from-violet-900/40 dark:via-violet-900/30 dark:to-purple-900/40 border border-violet-200/70 dark:border-violet-700/40 p-8 text-center shadow-md">
                    <p
                      className="text-4xl font-extrabold tracking-tight text-violet-900 dark:text-violet-100"
                      dir="ltr"
                    >
                      excellent
                    </p>
                    <p
                      className="mt-2 text-sm italic text-violet-600/80 dark:text-violet-300/80"
                      dir="ltr"
                    >
                      /ˈek.səl.ənt/
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-widest text-violet-500/70 dark:text-violet-300/70">
                      Adjective
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-violet-800/40 text-violet-700 dark:text-violet-200 text-xs font-semibold border border-violet-200/60 dark:border-violet-700/50">
                      <Volume2 size={12} /> {t("english.preview.british")}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      {
                        label: "A1",
                        color:
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                      },
                      {
                        label: "A2",
                        color:
                          "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                      },
                      {
                        label: "B1",
                        color:
                          "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
                      },
                      {
                        label: "B2",
                        color:
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                      },
                    ].map((l) => (
                      <div
                        key={l.label}
                        className={`${l.color} rounded-lg py-2 text-center text-xs font-bold`}
                      >
                        {l.label}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{t("english.preview.words")}</span>
                    <span className="font-semibold text-violet-600 dark:text-violet-400">
                      {t("english.preview.families")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-amber-900/30 text-orange-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            {t("english.packages.eyebrow")}
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("english.packages.title")}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t("english.packages.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {packages.map((pkg) => {
            const featured = pkg.badge !== null;
            return (
              <div
                key={pkg.nameKey}
                className={`group relative rounded-3xl overflow-hidden border bg-white dark:bg-gray-900/60 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 ${
                  featured
                    ? "border-violet-300 dark:border-violet-600 md:scale-[1.04] shadow-lg ring-2 ring-violet-200/60 dark:ring-violet-700/40"
                    : "border-gray-100 dark:border-gray-800"
                }`}
              >
                <div className={`h-2 bg-gradient-to-r ${pkg.gradient}`} />
                {featured && pkg.badge && (
                  <div className="absolute top-4 end-4 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                      <Sparkles size={10} />
                      {t(pkg.badge)}
                    </span>
                  </div>
                )}
                <div className="p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {t(pkg.labelKey)}
                      </p>
                      <h4 className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">
                        {t(pkg.nameKey)}
                      </h4>
                    </div>
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center text-white shadow-lg shrink-0`}
                    >
                      <pkg.icon size={26} />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200"
                      dir="ltr"
                    >
                      CEFR {pkg.levels}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-wider">
                      {t(pkg.scopeKey)}
                    </span>
                  </div>

                  <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {t(pkg.descKey)}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {pkg.featureKeys.map((fk) => (
                      <li
                        key={fk}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <CheckCircle2
                          size={16}
                          className="mt-0.5 text-emerald-500 shrink-0"
                        />
                        <span>{t(fk)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-col gap-2">
                    <Link
                      href={`/course/english/${pkg.tier}`}
                      data-testid={`link-pkg-${pkg.tier}`}
                      className={`glow-button w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition bg-gradient-to-r ${pkg.gradient}`}
                    >
                      {t("english.tier.openCourse")}
                      <ArrowRight size={16} />
                    </Link>
                    <button
                      type="button"
                      data-testid={`btn-cart-${pkg.tier}`}
                      onClick={() => {
                        const added = addItem({ course: "english", tier: pkg.tier });
                        toast({
                          title: added
                            ? t("course.detail.cta.added")
                            : t("cart.alreadyInCart"),
                        });
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        hasItem({ course: "english", tier: pkg.tier })
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <ShoppingCart size={14} />
                      {hasItem({ course: "english", tier: pkg.tier })
                        ? t("cart.inCart")
                        : t("course.detail.cta.addToCart")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODULES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider">
            {t("english.modules.eyebrow")}
          </span>
          <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("english.modules.title")}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t("english.modules.subtitle")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => {
            const card = (
              <div className="group relative h-full rounded-2xl bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <m.icon size={22} />
                  </div>
                  {m.status === "ready" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 size={10} /> {t("english.modules.live")}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                      {t("english.modules.soon")}
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t(m.titleKey)}
                </h4>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t(m.descKey)}
                </p>
                {m.status === "ready" && (
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400 group-hover:gap-2 transition-all">
                    {t("english.modules.open")} <ArrowRight size={14} />
                  </div>
                )}
              </div>
            );
            return m.status === "ready" && m.href ? (
              <Link key={m.titleKey} href={m.href}>
                {card}
              </Link>
            ) : (
              <div key={m.titleKey}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-orange-500 p-8 sm:p-12 text-center shadow-2xl">
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
              {t("english.cta.title")}
            </h3>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">
              {t("english.cta.subtitle")}
            </p>
            <a
              href="/dashboard"
              data-testid="link-final-cta-english"
              className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-violet-700 font-bold shadow-xl hover:scale-105 active:scale-95 transition"
            >
              {t("english.tier.openCourse")}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-gray-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={lexoLogo} alt="LEXO" className="w-7 h-7 object-contain" />
            <span className="text-sm font-bold">
              <span className="text-gray-900 dark:text-white">LEXO </span>
              <span className="bg-gradient-to-r from-violet-600 to-purple-700 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                {t("english.footer.brand")}
              </span>
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
            © {new Date().getFullYear()} {t("english.footer.copyright")}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <a
              href="#"
              className="hover:text-violet-600 dark:hover:text-violet-400 transition"
            >
              {t("common.privacy")}
            </a>
            <span>·</span>
            <a
              href="#"
              className="hover:text-violet-600 dark:hover:text-violet-400 transition"
            >
              {t("common.terms")}
            </a>
            <span>·</span>
            <a
              href="#"
              className="hover:text-violet-600 dark:hover:text-violet-400 transition"
            >
              {t("common.contact")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
