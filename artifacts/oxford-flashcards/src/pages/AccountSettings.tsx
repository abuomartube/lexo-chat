import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  KeyRound,
  Languages,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bell,
  Megaphone,
  Eye,
  EyeOff,
} from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useT, useLanguage } from "@/lib/i18n";
import { changeMyPassword, updateMyProfile } from "@/lib/platform-api";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "ok" }
  | { kind: "err"; msg: string };

export default function AccountSettings() {
  const { user } = useAuth();
  const t = useT();
  const { lang, setLang } = useLanguage();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
            data-testid="link-back-dashboard"
          >
            <ArrowLeft size={15} className="rtl:rotate-180" />
            {t("settings.backToDashboard")}
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("settings.subtitle")}
          </p>
        </div>

        <ChangePasswordSection t={t} />
        <LanguageSection
          t={t}
          currentServer={(user.preferredLanguage ?? "en") as "en" | "ar"}
          currentClient={lang}
          onChangeClient={setLang}
        />
        <EmailPreferencesSection
          t={t}
          notifyExpiry={user.notifyExpiry ?? true}
          notifyMarketing={user.notifyMarketing ?? false}
          email={user.email}
        />
      </main>
    </div>
  );
}

// ─────────────────── Change password ───────────────────

function ChangePasswordSection({ t }: { t: (k: never) => string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState({ kind: "idle" });
    if (next.length < 8) {
      setState({
        kind: "err",
        msg: (t as (k: string) => string)("settings.password.errShort"),
      });
      return;
    }
    if (next !== confirm) {
      setState({
        kind: "err",
        msg: (t as (k: string) => string)("settings.password.errMismatch"),
      });
      return;
    }
    if (next === current) {
      setState({
        kind: "err",
        msg: (t as (k: string) => string)("settings.password.errSame"),
      });
      return;
    }
    setState({ kind: "saving" });
    try {
      await changeMyPassword({ currentPassword: current, newPassword: next });
      setState({ kind: "ok" });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (t as (k: string) => string)("settings.password.errFailed");
      setState({ kind: "err", msg });
    }
  }

  const tt = t as (k: string) => string;

  return (
    <section
      data-testid="section-change-password"
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
    >
      <SectionHeader
        icon={<KeyRound size={18} />}
        title={tt("settings.password.title")}
        subtitle={tt("settings.password.subtitle")}
      />
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <PasswordField
          id="cs-current"
          label={tt("settings.password.current")}
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((s) => !s)}
          testId="input-current-password"
          required
        />
        <PasswordField
          id="cs-new"
          label={tt("settings.password.new")}
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          show={showNext}
          onToggleShow={() => setShowNext((s) => !s)}
          testId="input-new-password"
          required
          hint={tt("settings.password.hint")}
        />
        <PasswordField
          id="cs-confirm"
          label={tt("settings.password.confirm")}
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          show={showNext}
          onToggleShow={() => setShowNext((s) => !s)}
          testId="input-confirm-password"
          required
        />
        {state.kind === "err" && (
          <p
            role="alert"
            data-testid="password-error"
            className="text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2 border border-rose-200 dark:border-rose-900/40"
          >
            {state.msg}
          </p>
        )}
        {state.kind === "ok" && (
          <p
            role="status"
            data-testid="password-success"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 size={16} /> {tt("settings.password.saved")}
          </p>
        )}
        <button
          type="submit"
          data-testid="button-change-password"
          disabled={state.kind === "saving" || !current || !next || !confirm}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {state.kind === "saving" && (
            <Loader2 size={15} className="animate-spin" />
          )}
          {state.kind === "saving"
            ? tt("settings.password.saving")
            : tt("settings.password.submit")}
        </button>
      </form>
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  required,
  hint,
  testId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  required?: boolean;
  hint?: string;
  testId?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className="w-full px-3.5 py-2.5 pe-10 rounded-xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute end-2 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          tabIndex={-1}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

// ─────────────────── Language ───────────────────

function LanguageSection({
  t,
  currentServer,
  currentClient,
  onChangeClient,
}: {
  t: (k: never) => string;
  currentServer: "en" | "ar";
  currentClient: "en" | "ar";
  onChangeClient: (l: "en" | "ar") => void;
}) {
  const tt = t as (k: string) => string;
  const qc = useQueryClient();
  const [pending, setPending] = useState<null | "en" | "ar">(null);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  async function pick(next: "en" | "ar") {
    if (next === currentServer && next === currentClient) return;
    setPending(next);
    setState({ kind: "saving" });
    try {
      await updateMyProfile({ preferredLanguage: next });
      onChangeClient(next);
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setState({ kind: "ok" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : tt("settings.language.errFailed");
      setState({ kind: "err", msg });
    } finally {
      setPending(null);
    }
  }

  const options: { code: "en" | "ar"; label: string; flag: string }[] = [
    { code: "en", label: tt("settings.language.en"), flag: "🇬🇧" },
    { code: "ar", label: tt("settings.language.ar"), flag: "🇸🇦" },
  ];

  return (
    <section
      data-testid="section-language"
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
    >
      <SectionHeader
        icon={<Languages size={18} />}
        title={tt("settings.language.title")}
        subtitle={tt("settings.language.subtitle")}
      />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const active = opt.code === currentServer;
          const isPending = pending === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => void pick(opt.code)}
              disabled={pending !== null}
              data-testid={`button-language-${opt.code}`}
              aria-pressed={active}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-start ${
                active
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
                  : "border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700"
              } disabled:opacity-60`}
            >
              <span className="text-2xl" aria-hidden>
                {opt.flag}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{opt.label}</span>
                {active && (
                  <span className="block text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider">
                    {tt("settings.language.current")}
                  </span>
                )}
              </span>
              {isPending && (
                <Loader2 size={16} className="animate-spin text-indigo-600" />
              )}
            </button>
          );
        })}
      </div>
      {state.kind === "ok" && (
        <p
          role="status"
          data-testid="language-success"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 size={16} /> {tt("settings.language.saved")}
        </p>
      )}
      {state.kind === "err" && (
        <p
          role="alert"
          className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400"
        >
          {state.msg}
        </p>
      )}
    </section>
  );
}

// ─────────────────── Email preferences ───────────────────

function EmailPreferencesSection({
  t,
  notifyExpiry,
  notifyMarketing,
  email,
}: {
  t: (k: never) => string;
  notifyExpiry: boolean;
  notifyMarketing: boolean;
  email: string;
}) {
  const tt = t as (k: string) => string;
  const qc = useQueryClient();
  const [expiry, setExpiry] = useState(notifyExpiry);
  const [marketing, setMarketing] = useState(notifyMarketing);
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [pendingField, setPendingField] = useState<
    null | "notifyExpiry" | "notifyMarketing"
  >(null);

  useEffect(() => {
    setExpiry(notifyExpiry);
  }, [notifyExpiry]);
  useEffect(() => {
    setMarketing(notifyMarketing);
  }, [notifyMarketing]);

  async function persist(
    field: "notifyExpiry" | "notifyMarketing",
    value: boolean,
  ) {
    // single-flight: ignore further toggles while one is in progress
    if (pendingField !== null) return;
    const prev = field === "notifyExpiry" ? expiry : marketing;
    if (field === "notifyExpiry") setExpiry(value);
    else setMarketing(value);
    setPendingField(field);
    setState({ kind: "saving" });
    try {
      await updateMyProfile({ [field]: value });
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setState({ kind: "ok" });
    } catch (err) {
      // revert optimistic update on failure
      if (field === "notifyExpiry") setExpiry(prev);
      else setMarketing(prev);
      const msg =
        err instanceof Error ? err.message : tt("settings.emails.errFailed");
      setState({ kind: "err", msg });
    } finally {
      setPendingField(null);
    }
  }

  const isPending = pendingField !== null;

  return (
    <section
      data-testid="section-email-prefs"
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
    >
      <SectionHeader
        icon={<Mail size={18} />}
        title={tt("settings.emails.title")}
        subtitle={tt("settings.emails.subtitle")}
      />
      <p
        className="mt-2 text-xs text-slate-500 dark:text-slate-400 ltr:font-mono rtl:text-end break-all"
        dir="ltr"
      >
        {email}
      </p>

      <div className="mt-5 space-y-3">
        <ToggleRow
          icon={<Bell size={16} />}
          label={tt("settings.emails.expiryLabel")}
          desc={tt("settings.emails.expiryDesc")}
          checked={expiry}
          onChange={(v) => void persist("notifyExpiry", v)}
          disabled={isPending}
          testId="toggle-notify-expiry"
        />
        <ToggleRow
          icon={<Megaphone size={16} />}
          label={tt("settings.emails.marketingLabel")}
          desc={tt("settings.emails.marketingDesc")}
          checked={marketing}
          onChange={(v) => void persist("notifyMarketing", v)}
          disabled={isPending}
          testId="toggle-notify-marketing"
        />
      </div>

      {state.kind === "ok" && (
        <p
          role="status"
          data-testid="emails-success"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 size={16} /> {tt("settings.emails.saved")}
        </p>
      )}
      {state.kind === "err" && (
        <p
          role="alert"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400"
        >
          <AlertCircle size={16} /> {state.msg}
        </p>
      )}
    </section>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
  disabled,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition ${disabled ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
    >
      <span className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {desc}
        </span>
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
        aria-hidden
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
            checked
              ? "translate-x-5 rtl:-translate-x-5"
              : "translate-x-0.5 rtl:-translate-x-0.5"
          }`}
        />
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
      />
    </label>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex items-start gap-3">
      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
        {icon}
      </span>
      <div>
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {subtitle}
        </p>
      </div>
    </header>
  );
}
