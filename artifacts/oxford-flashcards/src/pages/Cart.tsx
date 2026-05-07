import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  ArrowLeft,
  PackageOpen,
  Loader2,
  Tag,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Header from "@/components/Header";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useT, useLanguage } from "@/lib/i18n";
import { fetchCheckoutPreview, type CheckoutPreview } from "@/lib/platform-api";
import { useAuth } from "@/lib/auth-context";

type PriceInfo = {
  amountMinor: number;
  currency: string;
  courseLabelEn: string;
  courseLabelAr: string;
  tierLabelEn: string;
  tierLabelAr: string;
};

type DiscountInfo = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  scope: "general" | "specific";
  specificCourse: string | null;
  specificTier: string | null;
};

function formatAmount(
  minor: number,
  currency: string,
  lang: "en" | "ar",
): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major.toFixed(0)} ${currency}`;
  }
}

function calcDiscount(
  subtotalMinor: number,
  discount: DiscountInfo | null,
): number {
  if (!discount) return 0;
  if (discount.discountType === "percentage") {
    return Math.round((subtotalMinor * discount.discountValue) / 100);
  }
  const fixedMinor = discount.discountValue * 100;
  return Math.min(fixedMinor, subtotalMinor);
}

export default function Cart() {
  const { items, removeItem, clearCart } = useCart();
  const t = useT();
  const { lang, dir } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const FwdIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [loading, setLoading] = useState(false);

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInfo | null>(null);
  const [discountMsg, setDiscountMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    let alive = true;
    setLoading(true);

    const fetches = items.map(async (item) => {
      const key = `${item.course}:${item.tier}`;
      try {
        const preview = await fetchCheckoutPreview(item.course, item.tier);
        return [key, {
          amountMinor: preview.amountMinor,
          currency: preview.currency,
          courseLabelEn: preview.courseLabelEn,
          courseLabelAr: preview.courseLabelAr,
          tierLabelEn: preview.tierLabelEn,
          tierLabelAr: preview.tierLabelAr,
        }] as [string, PriceInfo];
      } catch {
        return null;
      }
    });

    Promise.all(fetches)
      .then((results) => {
        if (!alive) return;
        const map: Record<string, PriceInfo> = {};
        for (const r of results) {
          if (r) map[r[0]] = r[1];
        }
        setPrices(map);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [items]);

  const subtotal = items.reduce((sum, item) => {
    const key = `${item.course}:${item.tier}`;
    const info = prices[key];
    return sum + (info?.amountMinor ?? 0);
  }, 0);

  const currency = Object.values(prices)[0]?.currency ?? "SAR";
  const discountAmount = calcDiscount(subtotal, appliedDiscount);
  const total = subtotal - discountAmount;

  async function handleApplyDiscount() {
    const code = discountCode.trim();
    if (!code) return;
    setDiscountLoading(true);
    setDiscountMsg(null);

    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          items: items.map((i) => ({ course: i.course, tier: i.tier })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppliedDiscount({
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          scope: data.scope,
          specificCourse: data.specificCourse,
          specificTier: data.specificTier,
        });
        setDiscountMsg({ kind: "ok", text: t("cart.discount.success") });
      } else {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        setAppliedDiscount(null);
        let msg = t("cart.discount.invalid");
        if (err.error === "expired") msg = t("cart.discount.expired");
        else if (err.error === "already_used") msg = t("cart.discount.alreadyUsed");
        else if (err.error === "not_applicable") msg = t("cart.discount.notApplicable");
        else if (err.error === "usage_limit_reached") msg = t("cart.discount.usageLimitReached");
        else if (err.error === "first_purchase_only") msg = t("cart.discount.firstPurchaseOnly");
        else if (err.error === "new_users_only") msg = t("cart.discount.newUsersOnly");
        setDiscountMsg({ kind: "err", text: msg });
      }
    } catch {
      setAppliedDiscount(null);
      setDiscountMsg({ kind: "err", text: t("cart.discount.invalid") });
    } finally {
      setDiscountLoading(false);
    }
  }

  function handleRemoveDiscount() {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountMsg(null);
  }

  function handleCheckout() {
    if (items.length === 0) return;
    const firstItem = items[0];
    const discountParam = appliedDiscount ? `&discount=${encodeURIComponent(appliedDiscount.code)}` : "";
    const checkoutUrl = `/checkout/${firstItem.course}/${firstItem.tier}?fromCart=1${discountParam}`;
    if (isAuthenticated) {
      navigate(checkoutUrl);
    } else {
      navigate(`/login?next=${encodeURIComponent(checkoutUrl)}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <ShoppingCart size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("cart.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("cart.subtitle")}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-10 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow text-center">
            <PackageOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t("cart.empty")}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {t("cart.emptyHint")}
            </p>
            <Link
              href="/english"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition"
            >
              <BackIcon size={16} />
              {t("cart.continueShopping")}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {loading ? (
              <div className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-8 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow text-center">
                <Loader2 size={24} className="mx-auto animate-spin text-indigo-500 mb-2" />
                <p className="text-sm text-slate-500">{t("cart.loading")}</p>
              </div>
            ) : (
              <>
                {/* Cart items */}
                <section className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur ring-1 ring-slate-200/70 dark:ring-gray-800 shadow overflow-hidden">
                  {items.map((item, idx) => {
                    const key = `${item.course}:${item.tier}`;
                    const info = prices[key];
                    const courseLabel = info
                      ? lang === "ar" ? info.courseLabelAr : info.courseLabelEn
                      : item.course;
                    const tierLabel = info
                      ? lang === "ar" ? info.tierLabelAr : info.tierLabelEn
                      : item.tier;
                    const price = info
                      ? formatAmount(info.amountMinor, info.currency, lang)
                      : "—";

                    return (
                      <div
                        key={key}
                        data-testid={`cart-item-${key}`}
                        className={`flex items-center gap-4 p-5 ${
                          idx > 0 ? "border-t border-slate-100 dark:border-gray-800" : ""
                        }`}
                      >
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow shrink-0">
                          {item.tier.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {courseLabel}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {tierLabel}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="font-extrabold text-base text-slate-900 dark:text-white">
                            {price}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          aria-label={t("cart.remove")}
                          data-testid={`cart-remove-${key}`}
                          className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/40 transition shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </section>

                {/* Discount code */}
                <section className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
                  <label className="text-sm font-bold flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-200">
                    <Tag size={16} className="text-indigo-500" />
                    {t("cart.discount.label")}
                  </label>
                  {appliedDiscount ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800">
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {t("cart.discount.success")}
                        </p>
                        <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                          {appliedDiscount.code}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition"
                      >
                        {t("cart.discount.remove")}
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        handleApplyDiscount();
                      }}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(ev) => setDiscountCode(ev.target.value.toUpperCase())}
                        placeholder={t("cart.discount.placeholder")}
                        data-testid="input-discount-code"
                        className="flex-1 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        dir="ltr"
                      />
                      <button
                        type="submit"
                        disabled={discountLoading || !discountCode.trim()}
                        data-testid="button-apply-discount"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50 hover:shadow-lg transition"
                      >
                        {discountLoading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Tag size={15} />
                        )}
                        {t("cart.discount.apply")}
                      </button>
                    </form>
                  )}
                  {discountMsg && !appliedDiscount && (
                    <p
                      className={`mt-2 text-sm flex items-center gap-1.5 ${
                        discountMsg.kind === "ok"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                      data-testid="text-discount-msg"
                    >
                      <XCircle size={14} />
                      {discountMsg.text}
                    </p>
                  )}
                </section>

                {/* Price summary */}
                <section className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {t("cart.subtotal")} ({items.length} {items.length === 1 ? t("cart.item") : t("cart.items")})
                    </span>
                    <span className="text-sm font-semibold">
                      {formatAmount(subtotal, currency, lang)}
                    </span>
                  </div>

                  {discountAmount > 0 && appliedDiscount && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Tag size={12} />
                        {t("cart.discount.codeLine")}: <code className="font-mono text-xs" dir="ltr">{appliedDiscount.code}</code>
                      </span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        −{formatAmount(discountAmount, currency, lang)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-gray-800">
                    <span className="text-base font-bold">{t("cart.total")}</span>
                    <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {formatAmount(total, currency, lang)}
                    </span>
                  </div>
                </section>

                {/* Action buttons — single checkout button */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/english"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-gray-900 ring-1 ring-slate-200 dark:ring-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
                  >
                    <BackIcon size={16} />
                    {t("cart.continueShopping")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    data-testid="cart-checkout-btn"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl transition"
                  >
                    {t("cart.checkout")}
                    <FwdIcon size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={clearCart}
                  data-testid="cart-clear"
                  className="w-full text-center text-xs text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition py-2"
                >
                  {t("cart.clearAll")}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
