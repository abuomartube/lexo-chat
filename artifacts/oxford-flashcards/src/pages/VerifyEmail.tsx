import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

type Status = "loading" | "success" | "error";

export default function VerifyEmail() {
  const { verifyEmail, isAuthenticated } = useAuth();
  const t = useT();
  const [location] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") ?? "";
    if (!token) {
      setStatus("error");
      setError(t("auth.verify.errMissingToken"));
      return;
    }
    void (async () => {
      try {
        await verifyEmail({ token });
        setStatus("success");
      } catch (err) {
        const data = (err as { data?: { error?: string } } | null)?.data;
        setError(
          data?.error ??
            (err instanceof Error ? err.message : t("auth.verify.errFailed")),
        );
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  if (status === "loading") {
    return (
      <AuthShell title={t("auth.verify.title")}>
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-slate-600 dark:text-slate-300">
          <Loader2
            size={32}
            className="animate-spin text-indigo-600 dark:text-indigo-400"
          />
        </div>
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell title={t("auth.verify.successTitle")}>
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {t("auth.verify.successBody")}
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md"
          >
            {isAuthenticated
              ? t("auth.verify.goDashboard")
              : t("auth.verify.goLogin")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.verify.successTitle")}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center">
          <AlertCircle size={28} />
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {error ?? t("auth.verify.errFailed")}
        </p>
        <Link
          href={isAuthenticated ? "/dashboard" : "/login"}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md"
        >
          {isAuthenticated
            ? t("auth.verify.tryAgain")
            : t("auth.verify.goLogin")}
        </Link>
      </div>
    </AuthShell>
  );
}
