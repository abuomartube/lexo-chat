import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Sparkles,
  Crown,
  ExternalLink,
  KeyRound,
  Loader2,
  CheckCircle2,
  Compass,
  Rocket,
  ShoppingCart,
} from "lucide-react";
import {
  fetchMyEnrollments,
  fetchMyEnglishEnrollments,
  redeemAccessCode,
  redeemEnglishCode,
  launchTier,
  ENGLISH_APP_URL,
  type Enrollment,
  type EnglishEnrollment,
  type Tier,
  type EnglishTier,
} from "@/lib/platform-api";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import tierIntroLogo from "@assets/F404C41A-045C-42E8-B2EF-B75CBD59294E_1777643375926.PNG";
import tierAdvanceLogo from "@assets/29C649F8-7100-4DBE-95BE-491CAAA5B4E8_1777643368790.PNG";
import tierCompleteLogo from "@assets/890CB599-C509-44F9-A6D7-493614DAC2F9_1777643368791.PNG";

const IELTS_TIER_META: Record<
  Tier,
  {
    logo: string;
    gradient: string;
    range: string;
    nameKey: TranslationKey;
    highlight?: boolean;
  }
> = {
  intro: {
    logo: tierIntroLogo,
    gradient: "from-blue-600 to-indigo-700",
    range: "A2 → B1",
    nameKey: "courses.tier.intro",
  },
  advance: {
    logo: tierAdvanceLogo,
    gradient: "from-purple-600 to-fuchsia-700",
    range: "B1 → C1",
    nameKey: "courses.tier.advance",
  },
  complete: {
    logo: tierCompleteLogo,
    gradient: "from-amber-500 via-orange-500 to-rose-600",
    range: "A2 → C1",
    nameKey: "courses.tier.complete",
    highlight: true,
  },
};

const ENGLISH_TIER_META: Record<
  EnglishTier,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    gradient: string;
    range: string;
    nameKey: TranslationKey;
    highlight?: boolean;
  }
> = {
  beginner: {
    icon: Rocket,
    gradient: "from-emerald-500 to-teal-600",
    range: "A1 → B1",
    nameKey: "courses.english.tier.beginner",
  },
  intermediate: {
    icon: Compass,
    gradient: "from-sky-500 to-indigo-600",
    range: "B2 → C1",
    nameKey: "courses.english.tier.intermediate",
  },
  advanced: {
    icon: Crown,
    gradient: "from-amber-500 via-orange-500 to-rose-600",
    range: "A1 → C1",
    nameKey: "courses.english.tier.advanced",
    highlight: true,
  },
};

// Display order for the always-on tier grid. Every tier renders a card,
// even ones the student has not enrolled in yet — those become upsell cards
// that link directly to the existing /checkout/<course>/<tier> flow. This
// gives the dashboard a stable 3-up layout and surfaces tier upgrades as
// first-class CTAs instead of hiding them behind a redeem form.
const IELTS_TIER_ORDER: Tier[] = ["intro", "advance", "complete"];
const ENGLISH_TIER_ORDER: EnglishTier[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export default function MyCourses() {
  const t = useT();
  const { lang } = useLanguage();

  return (
    <div className="space-y-6">
      <IeltsSection t={t} lang={lang} />
      <EnglishSection t={t} lang={lang} />
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
    </div>
  );
}

function formatDate(value: string | null, lang: "en" | "ar"): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Whole days remaining until expiry. Returns null when there is no expiry
// (admin-granted lifetime enrollments) so the caller can hide the countdown.
//
// We use `Math.ceil` so an active subscription never reads "0 days remaining"
// during the final <24h window — the spec calls this row a "countdown", and
// the natural reading is "≥1 day until expiry". Negative values fall through
// to the caller's `days >= 0` guard and are masked by the expired-state UI.
function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

function daysRemainingLabel(
  days: number,
  t: (k: TranslationKey) => string,
): string {
  if (days === 1) return t("courses.dayRemaining");
  return t("courses.daysRemaining").replace("{n}", String(days));
}

// Status-pill renderer reused by both the IELTS and English cards.
function StatusBadge({
  active,
  t,
}: {
  active: boolean;
  t: (k: TranslationKey) => string;
}) {
  return (
    <span
      data-testid={`badge-status-${active ? "active" : "expired"}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      {t(active ? "courses.status.active" : "courses.status.expired")}
    </span>
  );
}

// Renders the subscription metadata block (enrollment date, expiry date,
// days-remaining or expired notice). Shared between IELTS and English cards.
function SubscriptionMeta({
  grantedAt,
  expiresAt,
  isActive,
  lang,
  t,
}: {
  grantedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  lang: "en" | "ar";
  t: (k: TranslationKey) => string;
}) {
  const enrolledLabel = formatDate(grantedAt, lang);
  const expiresLabel = formatDate(expiresAt, lang);
  const days = daysUntil(expiresAt);
  return (
    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
      {enrolledLabel && (
        <p>
          {t("courses.enrolledOn")}:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {enrolledLabel}
          </span>
        </p>
      )}
      {expiresLabel && (
        <p>
          {t("courses.expiresOn")}:{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {expiresLabel}
          </span>
        </p>
      )}
      {isActive && days !== null && days >= 0 && (
        <p
          data-testid="text-days-remaining"
          className={
            days <= 7
              ? "font-semibold text-amber-600 dark:text-amber-400"
              : "font-medium text-slate-600 dark:text-slate-300"
          }
        >
          {daysRemainingLabel(days, t)}
        </p>
      )}
      {!isActive && (
        <p
          data-testid="text-expired-message"
          className="font-semibold text-rose-600 dark:text-rose-400"
        >
          {t("courses.expiredMessage")}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── IELTS section ─────────────────────────

function IeltsSection({
  t,
  lang,
}: {
  t: (k: TranslationKey) => string;
  lang: "en" | "ar";
}) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: fetchMyEnrollments,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemAccessCode,
    onSuccess: (e) => {
      setRedeemMsg({
        kind: "ok",
        text: t("courses.redeem.success").replace(
          "{tier}",
          t(IELTS_TIER_META[e.tier].nameKey),
        ),
      });
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
    onError: (err: Error) => setRedeemMsg({ kind: "err", text: err.message }),
  });

  const launchMutation = useMutation({
    mutationFn: launchTier,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (err: Error) => alert(err.message),
  });

  const enrollments: Enrollment[] = enrollmentsQuery.data ?? [];
  // Show every non-revoked enrollment (active AND expired). Expired cards
  // surface a "Renew Now" CTA; revoked rows are hidden entirely.
  const visible = enrollments.filter((e) => e.status !== "revoked");

  return (
    <section
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
      data-testid="section-courses-ielts"
    >
      <SectionHeader
        icon={
          <GraduationCap
            size={18}
            className="text-indigo-600 dark:text-indigo-400"
          />
        }
        title={t("courses.section.ielts")}
        loading={enrollmentsQuery.isFetching}
      />

      {enrollmentsQuery.isLoading ? (
        <div className="py-10 text-center text-slate-500 text-sm">
          <Loader2 size={20} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {IELTS_TIER_ORDER.map((tier) => {
            const meta = IELTS_TIER_META[tier];
            const e = visible.find((x) => x.tier === tier);
            // Unowned tier — render an upsell card that goes straight to checkout.
            // We do NOT use SubscriptionMeta / StatusBadge here because the user
            // has no enrollment row at all, not even an expired one.
            if (!e) {
              return (
                <div
                  key={`upsell-${tier}`}
                  data-testid={`card-ielts-upsell-${tier}`}
                  className={`glow-card relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition ${
                    meta.highlight
                      ? "ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg shadow-amber-400/30 hover:shadow-xl hover:shadow-amber-400/40 md:scale-[1.02]"
                      : "ring-1 ring-slate-200 dark:ring-gray-800 shadow-sm hover:shadow-md"
                  }`}
                >
                  {meta.highlight && (
                    <span className="absolute top-2 end-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow">
                      ★ {t("courses.tier.featured")}
                    </span>
                  )}
                  <div className="bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 p-4 text-white flex items-center gap-3">
                    <img
                      src={meta.logo}
                      alt=""
                      className="w-12 h-12 object-contain bg-white/10 rounded-lg p-1.5 opacity-80"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider opacity-80">
                        {meta.range}
                      </p>
                      <h3 className="text-base font-bold leading-tight">
                        {t(meta.nameKey)}
                      </h3>
                    </div>
                    <span
                      data-testid={`badge-ielts-not-enrolled-${tier}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white"
                    >
                      {t("courses.upsell.notEnrolled")}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-3 space-y-0.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {t("courses.upsell.priceLabel")}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {t("courses.upsell.accessNote")}
                      </p>
                    </div>
                    <Link
                      href={`/checkout/intro/${tier}`}
                      data-testid={`link-enroll-ielts-${tier}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow hover:opacity-90 transition"
                    >
                      <ShoppingCart size={15} />
                      {t("courses.upsell.cta")}
                    </Link>
                  </div>
                </div>
              );
            }
            const isActive = e.isActive;
            return (
              <div
                key={e.id}
                data-testid={`card-ielts-enrollment-${e.tier}`}
                className={`glow-card relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition ${
                  meta.highlight
                    ? "ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg shadow-amber-400/30 hover:shadow-xl hover:shadow-amber-400/40 md:scale-[1.02]"
                    : "ring-1 ring-slate-200 dark:ring-gray-800 shadow-sm hover:shadow-md"
                }`}
              >
                {meta.highlight && (
                  <span className="absolute top-2 end-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow">
                    ★ {t("courses.tier.featured")}
                  </span>
                )}
                <div
                  className={`bg-gradient-to-br ${meta.gradient} p-4 text-white flex items-center gap-3`}
                >
                  <img
                    src={meta.logo}
                    alt=""
                    className="w-12 h-12 object-contain bg-white/15 rounded-lg p-1.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider opacity-80">
                      {meta.range}
                    </p>
                    <h3 className="text-base font-bold leading-tight">
                      {t(meta.nameKey)}
                    </h3>
                  </div>
                  <StatusBadge active={isActive} t={t} />
                </div>
                <div className="p-4">
                  <SubscriptionMeta
                    grantedAt={e.grantedAt}
                    expiresAt={e.expiresAt}
                    isActive={isActive}
                    lang={lang}
                    t={t}
                  />
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => launchMutation.mutate(e.tier)}
                      disabled={launchMutation.isPending}
                      data-testid={`button-launch-ielts-${e.tier}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition disabled:opacity-50"
                    >
                      {launchMutation.isPending &&
                      launchMutation.variables === e.tier ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <ExternalLink size={15} />
                      )}
                      {t("courses.launch")}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        data-testid={`button-launch-ielts-${e.tier}-disabled`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600/80 text-white font-semibold text-sm cursor-not-allowed opacity-70"
                      >
                        <ExternalLink size={15} />
                        {t("courses.launch")}
                      </button>
                      <Link
                        href={`/checkout/intro/${e.tier}`}
                        data-testid={`link-renew-ielts-${e.tier}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow hover:opacity-90 transition"
                      >
                        <Rocket size={15} />
                        {t("courses.renew")}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RedeemForm
        title={t("courses.redeem.title")}
        button={t("courses.redeem.button")}
        code={code}
        setCode={setCode}
        msg={redeemMsg}
        pending={redeemMutation.isPending}
        onSubmit={(c) => {
          setRedeemMsg(null);
          redeemMutation.mutate(c);
        }}
        testIdPrefix="ielts"
      />
    </section>
  );
}

// ───────────────────────── English section ─────────────────────────

function EnglishSection({
  t,
  lang,
}: {
  t: (k: TranslationKey) => string;
  lang: "en" | "ar";
}) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["my-english-enrollments"],
    queryFn: fetchMyEnglishEnrollments,
  });

  const redeemMutation = useMutation({
    mutationFn: redeemEnglishCode,
    onSuccess: (e) => {
      setRedeemMsg({
        kind: "ok",
        text: t("courses.redeem.success").replace(
          "{tier}",
          t(ENGLISH_TIER_META[e.tier].nameKey),
        ),
      });
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-english-enrollments"] });
    },
    onError: (err: Error) => setRedeemMsg({ kind: "err", text: err.message }),
  });

  const enrollments: EnglishEnrollment[] = enrollmentsQuery.data ?? [];
  const visible = enrollments.filter((e) => e.status !== "revoked");

  return (
    <section
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
      data-testid="section-courses-english"
    >
      <SectionHeader
        icon={
          <Sparkles
            size={18}
            className="text-violet-600 dark:text-violet-400"
          />
        }
        title={t("courses.section.english")}
        loading={enrollmentsQuery.isFetching}
      />

      {enrollmentsQuery.isLoading ? (
        <div className="py-10 text-center text-slate-500 text-sm">
          <Loader2 size={20} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENGLISH_TIER_ORDER.map((tier) => {
            const meta = ENGLISH_TIER_META[tier];
            const Icon = meta.icon;
            const e = visible.find((x) => x.tier === tier);
            // Unowned tier — show upsell card pointing at /checkout/english/<tier>.
            if (!e) {
              return (
                <div
                  key={`upsell-${tier}`}
                  data-testid={`card-english-upsell-${tier}`}
                  className={`glow-card relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition ${
                    meta.highlight
                      ? "ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg shadow-amber-400/30 hover:shadow-xl hover:shadow-amber-400/40 md:scale-[1.02]"
                      : "ring-1 ring-slate-200 dark:ring-gray-800 shadow-sm hover:shadow-md"
                  }`}
                >
                  {meta.highlight && (
                    <span className="absolute top-2 end-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow">
                      ★ {t("courses.tier.featured")}
                    </span>
                  )}
                  <div className="bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 p-4 text-white flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white/10 p-2 flex items-center justify-center">
                      <Icon size={24} className="text-white opacity-80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider opacity-80">
                        {meta.range}
                      </p>
                      <h3 className="text-base font-bold leading-tight">
                        {t(meta.nameKey)}
                      </h3>
                    </div>
                    <span
                      data-testid={`badge-english-not-enrolled-${tier}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white"
                    >
                      {t("courses.upsell.notEnrolled")}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-3 space-y-0.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {t("courses.upsell.priceLabel")}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {t("courses.upsell.accessNote")}
                      </p>
                    </div>
                    <Link
                      href={`/checkout/english/${tier}`}
                      data-testid={`link-enroll-english-${tier}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm shadow hover:opacity-90 transition"
                    >
                      <ShoppingCart size={15} />
                      {t("courses.upsell.cta")}
                    </Link>
                  </div>
                </div>
              );
            }
            const isActive = e.isActive;
            return (
              <div
                key={e.id}
                data-testid={`card-english-enrollment-${tier}`}
                className={`glow-card relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 transition ${
                  meta.highlight
                    ? "ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg shadow-amber-400/30 hover:shadow-xl hover:shadow-amber-400/40 md:scale-[1.02]"
                    : "ring-1 ring-slate-200 dark:ring-gray-800 shadow-sm hover:shadow-md"
                }`}
              >
                {meta.highlight && (
                  <span className="absolute top-2 end-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow">
                    ★ {t("courses.tier.featured")}
                  </span>
                )}
                <div
                  className={`bg-gradient-to-br ${meta.gradient} p-4 text-white flex items-center gap-3`}
                >
                  <div className="w-12 h-12 rounded-lg bg-white/15 p-2 flex items-center justify-center">
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider opacity-80">
                      {meta.range}
                    </p>
                    <h3 className="text-base font-bold leading-tight">
                      {t(meta.nameKey)}
                    </h3>
                  </div>
                  <StatusBadge active={isActive} t={t} />
                </div>
                <div className="p-4">
                  <SubscriptionMeta
                    grantedAt={e.grantedAt}
                    expiresAt={e.expiresAt}
                    isActive={isActive}
                    lang={lang}
                    t={t}
                  />
                  {isActive ? (
                    <a
                      href={ENGLISH_APP_URL}
                      data-testid={`button-launch-english-${e.tier}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition"
                    >
                      <ExternalLink size={15} />
                      {t("courses.launch")}
                    </a>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        data-testid={`button-launch-english-${e.tier}-disabled`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600/80 text-white font-semibold text-sm cursor-not-allowed opacity-70"
                      >
                        <ExternalLink size={15} />
                        {t("courses.launch")}
                      </button>
                      <Link
                        href={`/checkout/english/${e.tier}`}
                        data-testid={`link-renew-english-${e.tier}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm shadow hover:opacity-90 transition"
                      >
                        <Rocket size={15} />
                        {t("courses.renew")}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RedeemForm
        title={t("courses.english.redeem.title")}
        button={t("courses.redeem.button")}
        code={code}
        setCode={setCode}
        msg={redeemMsg}
        pending={redeemMutation.isPending}
        onSubmit={(c) => {
          setRedeemMsg(null);
          redeemMutation.mutate(c);
        }}
        testIdPrefix="english"
      />
    </section>
  );
}

// ───────────────────────── Shared redeem form ─────────────────────────

function RedeemForm({
  title,
  button,
  code,
  setCode,
  msg,
  pending,
  onSubmit,
  testIdPrefix,
}: {
  title: string;
  button: string;
  code: string;
  setCode: (s: string) => void;
  msg: { kind: "ok" | "err"; text: string } | null;
  pending: boolean;
  onSubmit: (code: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-800">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
        <KeyRound size={16} />
        {title}
      </h3>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (code.trim()) onSubmit(code.trim());
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={code}
          onChange={(ev) => setCode(ev.target.value.toUpperCase())}
          placeholder="ABCD-EFGH-JKLM"
          data-testid={`input-redeem-${testIdPrefix}`}
          className="flex-1 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          data-testid={`button-redeem-${testIdPrefix}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <CheckCircle2 size={15} />
          )}
          {button}
        </button>
      </form>
      {msg && (
        <p
          className={`mt-2 text-sm ${
            msg.kind === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
          data-testid={`text-redeem-${testIdPrefix}-msg`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
