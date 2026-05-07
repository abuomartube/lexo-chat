import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

export default function UnverifiedEmailBanner() {
  const { user, sendVerificationEmail } = useAuth();
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified) return null;

  const onResend = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await sendVerificationEmail();
      setSent(true);
    } catch (err) {
      const data = (err as { data?: { error?: string } } | null)?.data;
      setError(
        data?.error ??
          (err instanceof Error ? err.message : t("auth.verify.errFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-amber-300/70 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200/70 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 flex items-center justify-center">
        <Mail size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-amber-900 dark:text-amber-100">
          {t("auth.unverified.title")}
        </p>
        <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-200/80 mt-0.5">
          {t("auth.unverified.body")}
        </p>
        {sent && (
          <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {t("auth.unverified.sent")}
          </p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onResend}
        disabled={submitting || sent}
        className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-60"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {submitting
          ? t("auth.unverified.sending")
          : sent
            ? t("auth.unverified.sent")
            : t("auth.unverified.resend")}
      </button>
    </div>
  );
}
