import { useEffect, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import {
  Play,
  Download,
  ChevronDown,
  Star,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Target,
  Trophy,
  Brain,
  Globe2,
  BookOpen,
  Headphones,
  ClipboardCheck,
  Mic,
  Sparkles,
  Award,
} from "lucide-react";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context";
import tierIntroLogo from "@assets/F404C41A-045C-42E8-B2EF-B75CBD59294E_1777643375926.PNG";
import tierAdvanceLogo from "@assets/29C649F8-7100-4DBE-95BE-491CAAA5B4E8_1777643368790.PNG";
import tierCompleteLogo from "@assets/890CB599-C509-44F9-A6D7-493614DAC2F9_1777643368791.PNG";

type Tier = "intro" | "advance" | "complete";
const VALID_TIERS: Tier[] = ["intro", "advance", "complete"];

type TierMeta = {
  logo: string;
  nameKey: TranslationKey;
  rangeKey: TranslationKey;
  bandKey: TranslationKey;
  blurbKey: TranslationKey;
  features: TranslationKey[];
};

const TIER_META: Record<Tier, TierMeta> = {
  intro: {
    logo: tierIntroLogo,
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
  advance: {
    logo: tierAdvanceLogo,
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
  complete: {
    logo: tierCompleteLogo,
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
};

const GOALS: Array<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}> = [
  {
    icon: Trophy,
    titleKey: "course.detail.goal1.title",
    descKey: "course.detail.goal1.desc",
  },
  {
    icon: Brain,
    titleKey: "course.detail.goal2.title",
    descKey: "course.detail.goal2.desc",
  },
  {
    icon: Mic,
    titleKey: "course.detail.goal3.title",
    descKey: "course.detail.goal3.desc",
  },
  {
    icon: Target,
    titleKey: "course.detail.goal4.title",
    descKey: "course.detail.goal4.desc",
  },
];

const SHOWCASE_TILES: Array<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelKey: TranslationKey;
  gradient: string;
}> = [
  {
    icon: BookOpen,
    labelKey: "course.detail.image1.label",
    gradient: "from-[#0a1f44] to-[#123b75]",
  },
  {
    icon: Headphones,
    labelKey: "course.detail.image2.label",
    gradient: "from-[#123b75] to-[#0a1f44]",
  },
  {
    icon: ClipboardCheck,
    labelKey: "course.detail.image3.label",
    gradient: "from-[#0a1f44] via-[#123b75] to-[#ff8a00]",
  },
  {
    icon: Mic,
    labelKey: "course.detail.image4.label",
    gradient: "from-[#ff8a00] to-[#0a1f44]",
  },
];

const FAQ_ITEMS: Array<{ qKey: TranslationKey; aKey: TranslationKey }> = [
  { qKey: "course.detail.faq.q1", aKey: "course.detail.faq.a1" },
  { qKey: "course.detail.faq.q2", aKey: "course.detail.faq.a2" },
  { qKey: "course.detail.faq.q3", aKey: "course.detail.faq.a3" },
  { qKey: "course.detail.faq.q4", aKey: "course.detail.faq.a4" },
  { qKey: "course.detail.faq.q5", aKey: "course.detail.faq.a5" },
];

const TESTIMONIALS: Array<{
  nameKey: TranslationKey;
  scoreKey: TranslationKey;
  quoteKey: TranslationKey;
  hue: string;
}> = [
  {
    nameKey: "course.detail.t1.name",
    scoreKey: "course.detail.t1.score",
    quoteKey: "course.detail.t1.quote",
    hue: "from-[#0a1f44] to-[#123b75]",
  },
  {
    nameKey: "course.detail.t2.name",
    scoreKey: "course.detail.t2.score",
    quoteKey: "course.detail.t2.quote",
    hue: "from-[#123b75] to-[#ff8a00]",
  },
  {
    nameKey: "course.detail.t3.name",
    scoreKey: "course.detail.t3.score",
    quoteKey: "course.detail.t3.quote",
    hue: "from-[#ff8a00] to-[#0a1f44]",
  },
];

type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  createdAt: number;
};

function loadReviews(tier: Tier): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`course-reviews:${tier}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isReview) : [];
  } catch {
    return [];
  }
}

function isReview(value: unknown): value is Review {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Review).id === "string" &&
    typeof (value as Review).name === "string" &&
    typeof (value as Review).rating === "number" &&
    typeof (value as Review).text === "string" &&
    typeof (value as Review).createdAt === "number"
  );
}

export default function CourseDetail() {
  const [, params] = useRoute<{ tier: string }>("/course/ielts/:tier");
  const t = useT();
  const { lang, dir } = useLanguage();
  const { toast } = useToast();
  const { addItem, hasItem } = useCart();
  const [, navigate] = useLocation();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const FwdIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const rawTier = (params?.tier ?? "").toLowerCase();
  const tier = (VALID_TIERS as readonly string[]).includes(rawTier)
    ? (rawTier as Tier)
    : null;
  const meta = tier ? TIER_META[tier] : null;

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [reviews, setReviews] = useState<Review[]>(() =>
    tier ? loadReviews(tier) : [],
  );
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (!tier) return;
    setReviews(loadReviews(tier));
  }, [tier]);

  const submitReview = () => {
    if (!tier) return;
    const trimmedName = reviewName.trim();
    const trimmedText = reviewText.trim();
    if (!trimmedName || !trimmedText) return;
    const next: Review = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      rating: reviewRating,
      text: trimmedText,
      createdAt: Date.now(),
    };
    const updated = [next, ...reviews].slice(0, 50);
    setReviews(updated);
    try {
      window.localStorage.setItem(
        `course-reviews:${tier}`,
        JSON.stringify(updated),
      );
    } catch {
      /* ignore quota errors */
    }
    setReviewName("");
    setReviewText("");
    setReviewRating(5);
    toast({ title: t("course.detail.reviews.thanks") });
  };

  const handlePreviewClick = () => {
    toast({ title: t("course.detail.previewToast") });
  };

  const handlePdfClick = () => {
    toast({ title: t("course.detail.preview.pdfToast") });
  };

  const inCart = tier ? hasItem({ course: "ielts", tier }) : false;

  const handleAddToCart = () => {
    if (!tier) return;
    const added = addItem({ course: "ielts", tier });
    if (added) {
      toast({ title: t("course.detail.cta.added") });
    } else {
      toast({ title: t("cart.alreadyInCart") });
    }
  };

  if (!tier || !meta) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <p className="text-lg font-semibold">{t("course.detail.invalid")}</p>
          <Link
            href="/ielts"
            data-testid="link-back-to-courses"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0a1f44] text-white font-semibold hover:bg-[#123b75] transition"
          >
            <BackIcon size={16} />
            {t("course.detail.back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100"
      data-testid={`page-course-detail-${tier}`}
    >
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1f44] via-[#123b75] to-[#0a1f44] text-white">
        <div className="absolute inset-0 -z-0 opacity-40 pointer-events-none">
          <div className="absolute -top-32 -start-20 w-[480px] h-[480px] bg-[#ff8a00] rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-32 -end-20 w-[520px] h-[520px] bg-[#123b75] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <Link
            href="/ielts"
            data-testid="link-back-courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition mb-6"
          >
            <BackIcon size={16} />
            {t("course.detail.back")}
          </Link>

          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff8a00]/15 border border-[#ff8a00]/40 text-[#ffb866] text-xs font-bold uppercase tracking-wider mb-5">
                <Sparkles size={14} />
                {t(meta.bandKey)}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                {t(meta.nameKey)}
              </h1>
              <p className="mt-3 text-base sm:text-lg font-semibold text-[#ffb866]">
                {t(meta.rangeKey)}
              </p>
              <p className="mt-5 text-base sm:text-lg text-white/85 max-w-xl leading-relaxed">
                {t("course.detail.heroTagline")}
              </p>
              <p className="mt-3 text-sm text-white/70 max-w-xl leading-relaxed">
                {t(meta.blurbKey)}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  data-testid="button-hero-add-cart"
                  className={`glow-button inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow-lg transition ${
                    inCart
                      ? "bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600"
                      : "bg-[#ff8a00] text-white shadow-[#ff8a00]/30 hover:bg-[#ff9a20] hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  <ShoppingCart size={16} />
                  {inCart ? t("cart.inCart") : t("cart.addToCart")}
                </button>
                {inCart && (
                  <Link
                    href="/cart"
                    data-testid="button-hero-go-cart"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl backdrop-blur border border-white/30 text-white font-semibold hover:bg-white/20 transition"
                  >
                    {t("cart.goToCart")}
                    <FwdIcon size={16} />
                  </Link>
                )}
              </div>
              <p className="mt-3 text-xs text-white/60">
                {t("course.detail.cta.includes")}
              </p>
            </div>

            {/* Hero video card */}
            <div className="lg:col-span-5">
              <button
                type="button"
                onClick={handlePreviewClick}
                data-testid="button-hero-play"
                className="group relative block w-full aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-[#0a1f44] to-[#123b75] border border-white/15 shadow-2xl shadow-black/40"
              >
                <img
                  src={meta.logo}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain p-8 opacity-90 group-hover:scale-105 transition-transform duration-500"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-20 h-20 rounded-full bg-[#ff8a00] flex items-center justify-center shadow-2xl shadow-[#ff8a00]/40 group-hover:scale-110 transition-transform">
                    <Play
                      size={32}
                      className="text-white ms-1"
                      fill="currentColor"
                    />
                  </span>
                </div>
                <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                    {t("course.detail.playPreview")}
                  </span>
                  <span className="text-xs font-semibold text-white/70">
                    2:14
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 py-14"
        data-testid="section-about"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a1f44] dark:text-white">
          {t("course.detail.about.title")}
        </h2>
        <div className="mt-6 space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-base">
          <p>{t("course.detail.about.body1")}</p>
          <p>{t("course.detail.about.body2")}</p>
        </div>
        <ul className="mt-7 grid sm:grid-cols-2 gap-3">
          {meta.features.map((fKey) => (
            <li
              key={fKey}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <CheckCircle2
                size={18}
                className="text-[#ff8a00] mt-0.5 flex-shrink-0"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {t(fKey)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* GOALS */}
      <section
        className="bg-white dark:bg-slate-900 py-14 border-y border-slate-200 dark:border-slate-800"
        data-testid="section-goals"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a1f44] dark:text-white">
              {t("course.detail.goals.title")}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t("course.detail.goals.subtitle")}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {GOALS.map((g, i) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.titleKey}
                  data-testid={`card-goal-${i + 1}`}
                  className="glow-card neon-border rounded-2xl p-6 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0a1f44] to-[#123b75] flex items-center justify-center text-white shadow-lg mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-[#0a1f44] dark:text-white">
                    {t(g.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t(g.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SHOWCASE IMAGES */}
      <section
        className="max-w-6xl mx-auto px-4 sm:px-6 py-14"
        data-testid="section-images"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a1f44] dark:text-white">
            {t("course.detail.images.title")}
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t("course.detail.images.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SHOWCASE_TILES.map((tile, i) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.labelKey}
                data-testid={`tile-showcase-${i + 1}`}
                className={`glow-card relative aspect-square rounded-2xl bg-gradient-to-br ${tile.gradient} overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon size={56} className="text-white/30" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {t(tile.labelKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PREVIEW */}
      <section
        className="bg-gradient-to-br from-[#0a1f44] via-[#123b75] to-[#0a1f44] text-white py-14"
        data-testid="section-preview"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              {t("course.detail.preview.title")}
            </h2>
            <p className="mt-3 text-white/80 max-w-2xl mx-auto">
              {t("course.detail.preview.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={handlePreviewClick}
              data-testid="button-preview-video"
              className="group relative aspect-video rounded-2xl overflow-hidden bg-black/30 border border-white/20 shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#123b75]/50 to-[#0a1f44]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="w-16 h-16 rounded-full bg-[#ff8a00] flex items-center justify-center shadow-2xl shadow-[#ff8a00]/40 group-hover:scale-110 transition-transform">
                  <Play
                    size={28}
                    className="text-white ms-1"
                    fill="currentColor"
                  />
                </span>
                <p className="text-sm font-bold tracking-wide text-white">
                  {t("course.detail.preview.video")}
                </p>
              </div>
            </button>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/20 p-6 flex flex-col items-start justify-between gap-5">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#ff8a00] flex items-center justify-center shadow-lg mb-4">
                  <Download size={22} className="text-white" />
                </div>
                <h3 className="text-xl font-bold">
                  {t("course.detail.preview.pdf")}
                </h3>
                <p className="mt-2 text-sm text-white/75 leading-relaxed">
                  {t("course.detail.preview.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePdfClick}
                data-testid="button-preview-pdf"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0a1f44] font-bold text-sm hover:bg-[#ffb866] hover:text-white transition"
              >
                <Download size={16} />
                {t("course.detail.preview.pdf")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="max-w-3xl mx-auto px-4 sm:px-6 py-14"
        data-testid="section-faq"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a1f44] dark:text-white text-center">
          {t("course.detail.faq.title")}
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={item.qKey}
                data-testid={`faq-item-${i + 1}`}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  data-testid={`faq-toggle-${i + 1}`}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span className="text-base font-bold text-[#0a1f44] dark:text-white">
                    {t(item.qKey)}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-[#ff8a00] flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}
                >
                  <p className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t(item.aKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        className="bg-white dark:bg-slate-900 py-14 border-y border-slate-200 dark:border-slate-800"
        data-testid="section-testimonials"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a1f44] dark:text-white text-center">
            {t("course.detail.testimonials.title")}
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((tt, i) => {
              const name = t(tt.nameKey);
              const initials = name
                .split(/\s+/)
                .map((n) => n.charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={tt.nameKey}
                  data-testid={`testimonial-${i + 1}`}
                  className="glow-card rounded-2xl p-6 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${tt.hue} flex items-center justify-center text-white font-bold text-base shadow-md`}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0a1f44] dark:text-white truncate">
                        {name}
                      </p>
                      <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff8a00]">
                        <Award size={12} />
                        {t(tt.scoreKey)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className="text-[#ff8a00]"
                        fill="currentColor"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                    "{t(tt.quoteKey)}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section
        className="max-w-3xl mx-auto px-4 sm:px-6 py-14"
        data-testid="section-reviews"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0a1f44] dark:text-white">
            {t("course.detail.reviews.title")}
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            {t("course.detail.reviews.subtitle")}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitReview();
          }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
          data-testid="form-review"
        >
          <div>
            <label className="block text-sm font-semibold text-[#0a1f44] dark:text-white mb-2">
              {t("course.detail.reviews.rateLabel")}
            </label>
            <div className="flex items-center gap-1" role="radiogroup">
              {[1, 2, 3, 4, 5].map((s) => {
                const filled = (hoverRating || reviewRating) >= s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    data-testid={`rating-star-${s}`}
                    aria-label={`${s} star${s > 1 ? "s" : ""}`}
                    aria-checked={reviewRating === s}
                    role="radio"
                    className="p-1 rounded transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={
                        filled
                          ? "text-[#ff8a00]"
                          : "text-slate-300 dark:text-slate-600"
                      }
                      fill={filled ? "currentColor" : "none"}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label
              htmlFor="review-name"
              className="block text-sm font-semibold text-[#0a1f44] dark:text-white mb-2"
            >
              {t("course.detail.reviews.nameLabel")}
            </label>
            <input
              id="review-name"
              type="text"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              placeholder={t("course.detail.reviews.namePlaceholder")}
              data-testid="input-review-name"
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff8a00] focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="review-text"
              className="block text-sm font-semibold text-[#0a1f44] dark:text-white mb-2"
            >
              {t("course.detail.reviews.commentLabel")}
            </label>
            <textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t("course.detail.reviews.commentPlaceholder")}
              data-testid="input-review-text"
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff8a00] focus:border-transparent text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={!reviewName.trim() || !reviewText.trim()}
            data-testid="button-submit-review"
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0a1f44] text-white font-bold hover:bg-[#123b75] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {t("course.detail.reviews.submit")}
          </button>
        </form>

        <div className="mt-8 space-y-3" data-testid="list-reviews">
          {reviews.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-8">
              {t("course.detail.reviews.empty")}
            </p>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                data-testid={`review-${r.id}`}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-sm text-[#0a1f44] dark:text-white">
                    {r.name}
                  </p>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={13}
                        className={
                          s <= r.rating
                            ? "text-[#ff8a00]"
                            : "text-slate-300 dark:text-slate-600"
                        }
                        fill={s <= r.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {r.text}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString(
                    lang === "ar" ? "ar-EG" : "en-US",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section
        className="bg-gradient-to-br from-[#0a1f44] via-[#123b75] to-[#0a1f44] text-white py-16"
        data-testid="section-bottom-cta"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Globe2 size={42} className="mx-auto text-[#ff8a00] mb-4" />
          <h2 className="text-3xl sm:text-4xl font-extrabold">
            {t(meta.nameKey)}
          </h2>
          <p className="mt-3 text-lg text-white/80">
            {t("course.detail.cta.priceFull")}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {t("course.detail.cta.includes")}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              data-testid="button-bottom-add-cart"
              className={`glow-button inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold shadow-lg transition ${
                inCart
                  ? "bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600"
                  : "bg-[#ff8a00] text-white shadow-[#ff8a00]/40 hover:bg-[#ff9a20] hover:scale-[1.02] active:scale-95"
              }`}
            >
              <ShoppingCart size={16} />
              {inCart ? t("cart.inCart") : t("cart.addToCart")}
            </button>
            {inCart && (
              <Link
                href="/cart"
                data-testid="button-bottom-go-cart"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl backdrop-blur border border-white/30 text-white font-semibold hover:bg-white/20 transition"
              >
                {t("cart.goToCart")}
                <FwdIcon size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FLOATING CTA */}
      {inCart ? (
        <Link
          href="/cart"
          data-testid="button-floating-go-cart"
          className="glow-button fixed bottom-5 end-5 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500 text-white font-bold shadow-2xl shadow-emerald-500/40 hover:bg-emerald-600 hover:scale-[1.03] active:scale-95 transition"
        >
          <ShoppingCart size={16} />
          {t("cart.goToCart")}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleAddToCart}
          data-testid="button-floating-add-cart"
          className="glow-button fixed bottom-5 end-5 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#ff8a00] text-white font-bold shadow-2xl shadow-[#ff8a00]/40 hover:bg-[#ff9a20] hover:scale-[1.03] active:scale-95 transition"
        >
          <ShoppingCart size={16} />
          {t("cart.addToCart")} · {t("course.detail.cta.price")}
        </button>
      )}
    </div>
  );
}
