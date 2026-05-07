import { Link } from "wouter";
import { ShoppingCart, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useT, useLanguage } from "@/lib/i18n";

export default function AbandonedCartBanner() {
  const { reminderLevel, dismissReminder, count } = useCart();
  const t = useT();
  const { dir } = useLanguage();
  const FwdIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  if (reminderLevel === "none") return null;

  const isStrong = reminderLevel === "strong";

  return (
    <div
      data-testid="abandoned-cart-banner"
      className={`relative overflow-hidden ${
        isStrong
          ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white"
          : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 text-slate-800 dark:text-slate-100 ring-1 ring-amber-200/60 dark:ring-amber-800/40"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isStrong
              ? "bg-white/20"
              : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          }`}
        >
          <ShoppingCart size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isStrong ? "text-white" : ""}`}>
            {isStrong ? t("cart.reminder.strong") : t("cart.reminder.soft")}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              isStrong ? "text-white/80" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {t("cart.reminder.itemCount").replace("{count}", String(count))}
          </p>
        </div>

        <Link
          href="/cart"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
            isStrong
              ? "bg-white text-indigo-700 hover:bg-white/90 shadow"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow hover:shadow-lg"
          }`}
        >
          {t("cart.reminder.cta")}
          <FwdIcon size={14} />
        </Link>

        <button
          type="button"
          onClick={dismissReminder}
          aria-label="Dismiss"
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
            isStrong
              ? "text-white/70 hover:text-white hover:bg-white/10"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
