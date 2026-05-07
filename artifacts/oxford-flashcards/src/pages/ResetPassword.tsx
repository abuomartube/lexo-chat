import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const t = useT();
  const [location] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const tk = params.get("token") ?? "";
    setToken(tk);
  }, [location]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(t("auth.reset.errMissingToken"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.reset.errPasswordShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.reset.errPasswordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      const data = (err as { data?: { error?: string } } | null)?.data;
      setError(
        data?.error ??
          (err instanceof Error ? err.message : t("auth.reset.errFailed")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell title={t("auth.reset.doneTitle")}>
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {t("auth.reset.doneBody")}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md"
          >
            {t("auth.reset.goLogin")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.reset.title")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
          >
            {t("auth.reset.newPassword")}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder={t("auth.reset.newPasswordPh")}
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
          >
            {t("auth.reset.confirm")}
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
          />
        </div>
        {error && (
          <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2 border border-rose-200 dark:border-rose-900/40">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {t("auth.reset.submit")}
        </button>
      </form>
    </AuthShell>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500";
