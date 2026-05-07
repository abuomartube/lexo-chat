import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Mail,
  Phone,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Receipt,
  Camera,
  Pencil,
  Award,
  CalendarDays,
  Loader2,
  Trash2,
  UserRound,
  Settings,
  UserCircle2,
} from "lucide-react";
import Header from "@/components/Header";
import MyCourses from "@/components/MyCourses";
import MyCertificates from "@/components/MyCertificates";
import UnverifiedEmailBanner from "@/components/UnverifiedEmailBanner";
import { useAuth } from "@/lib/auth-context";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import { CURRICULUM_ENABLED } from "@/lib/feature-flags";
// Note: `hasActiveEnglishAccess` is intentionally NOT imported here anymore —
// the legacy "Lexo English Dashboard" Quick-Action tile (the historical
// Oxford-3000 flashcards entry point) was removed in the dashboard hierarchy
// cleanup. The English curriculum is now reached through the single primary
// "English" tile below; deeper learning surfaces live one click in.
import {
  fetchMyEnrollments,
  fetchMyEnglishEnrollments,
  fetchMyCertificates,
  uploadAvatar,
  updateMyProfile,
  avatarViewUrl,
  fetchMyLiveSessions,
  type LiveSession,
} from "@/lib/platform-api";

const PAYMENT_BANNER_KEYS: Record<
  string,
  { key: TranslationKey; tone: "success" | "warning" | "error" }
> = {
  success: { key: "checkout.banner.success", tone: "success" },
  failed: { key: "checkout.banner.failed", tone: "error" },
  cancelled: { key: "checkout.banner.cancelled", tone: "warning" },
  pending: { key: "checkout.banner.pending", tone: "warning" },
  pending_bank_transfer: {
    key: "checkout.banner.pendingBankTransfer",
    tone: "warning",
  },
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const t = useT();
  const { lang } = useLanguage();
  const [paymentBanner, setPaymentBanner] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const status = url.searchParams.get("payment");
    if (status && PAYMENT_BANNER_KEYS[status]) {
      setPaymentBanner(status);
      url.searchParams.delete("payment");
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, []);

  if (!user) return null;

  const created = new Date(user.createdAt);
  const memberSince = created.toLocaleDateString(
    lang === "ar" ? "ar-EG" : "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome */}
        <section className="bg-gradient-to-br from-indigo-700 via-purple-600 to-blue-600 text-white rounded-3xl p-7 sm:p-10 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100/90">
            {t("dashboard.eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t("dashboard.welcome")} {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl">
            {t("dashboard.subtitle")}
          </p>
        </section>

        <UnverifiedEmailBanner />

        {paymentBanner && (
          <PaymentBanner
            status={paymentBanner}
            text={t(PAYMENT_BANNER_KEYS[paymentBanner].key)}
            tone={PAYMENT_BANNER_KEYS[paymentBanner].tone}
            onDismiss={() => setPaymentBanner(null)}
          />
        )}

        {/* Subscription summary cards */}
        <SummarySection t={t} />

        {/* Quick actions — primary product entries.
            Hierarchy: English (curriculum) is the dominant card and spans
            two columns on md+; IELTS sits beside it; placement assessment
            is a supporting tile on the row below. The legacy "Lexo English
            Dashboard" tile (the historical Oxford-3000 flashcards entry)
            was removed — the curriculum-driven English experience is the
            sole primary English entry point now. Flashcards remain
            reachable as a secondary practice tool inside the English hub. */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            href="/english"
            icon={<BookOpen size={22} />}
            title={t("dashboard.action.english.title")}
            description={t("dashboard.action.english.desc")}
            tone="from-blue-600 to-indigo-600"
            className="md:col-span-2"
          />
          <ActionCard
            href="/ielts"
            icon={<GraduationCap size={22} />}
            title={t("dashboard.action.ielts.title")}
            description={t("dashboard.action.ielts.desc")}
            tone="from-purple-600 to-indigo-700"
          />
          <ActionCard
            href="/assessment"
            icon={<Sparkles size={22} />}
            title={t("dashboard.action.assessment.title")}
            description={t("dashboard.action.assessment.desc")}
            tone="from-emerald-600 to-teal-600"
            className="md:col-span-3"
          />
        </section>

        {/* My Courses + Profile */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MyCourses />
            {CURRICULUM_ENABLED && <UpcomingLiveSessions />}
            <MyCertificates />
          </div>

          <ProfileCard user={user} memberSince={memberSince} t={t} />
        </section>
      </main>
    </div>
  );
}

// ─────────────────── Subscription summary ───────────────────

function daysUntil(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

function SummarySection({ t }: { t: (k: TranslationKey) => string }) {
  // Pull the same data MyCourses + MyCertificates use; React Query dedupes
  // so this does not refetch — it just reads the shared cache once it warms.
  const ielts = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: fetchMyEnrollments,
  });
  const english = useQuery({
    queryKey: ["my-english-enrollments"],
    queryFn: fetchMyEnglishEnrollments,
  });
  const certs = useQuery({
    queryKey: ["my-certificates"],
    queryFn: fetchMyCertificates,
  });

  const summary = useMemo(() => {
    const allEnrollments = [
      ...(ielts.data ?? []).map((e) => ({
        active: e.isActive,
        expiresAt: e.expiresAt,
        status: e.status,
      })),
      ...(english.data ?? []).map((e) => ({
        active: e.isActive,
        expiresAt: e.expiresAt,
        status: e.status,
      })),
    ].filter((e) => e.status !== "revoked");
    const totalOwned = allEnrollments.length;
    const active = allEnrollments.filter((e) => e.active);
    const activeCount = active.length;
    // Smallest non-null daysUntil among active enrollments. Lifetime grants
    // (expiresAt == null) are skipped — they never need a renewal warning.
    const minDays = active
      .map((e) => daysUntil(e.expiresAt))
      .filter((d): d is number => d !== null && d >= 0)
      .reduce<number | null>(
        (acc, n) => (acc === null || n < acc ? n : acc),
        null,
      );
    return {
      totalOwned,
      activeCount,
      minDays,
      certCount: certs.data?.length ?? 0,
    };
  }, [ielts.data, english.data, certs.data]);

  // Avoid the misleading "0 / 0 / no active subscription" state during the
  // initial fetch by treating any in-flight query as still loading.
  const loading = ielts.isLoading || english.isLoading || certs.isLoading;

  const expiryText = loading
    ? "…"
    : summary.minDays === null
      ? summary.activeCount === 0
        ? t("dashboard.summary.nextExpiryNone")
        : "∞"
      : summary.minDays === 1
        ? t("dashboard.summary.dayShort")
        : t("dashboard.summary.daysShort").replace(
            "{n}",
            String(summary.minDays),
          );

  const expirySoon =
    !loading && summary.minDays !== null && summary.minDays <= 7;

  return (
    <section className="mt-6" aria-label={t("dashboard.summary.title")}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<BookOpen size={20} />}
          tone="from-indigo-600 to-blue-600"
          label={t("dashboard.summary.activeCourses")}
          value={loading ? "…" : String(summary.activeCount)}
          note={
            loading
              ? ""
              : t("dashboard.summary.activeCoursesNote").replace(
                  "{total}",
                  String(summary.totalOwned),
                )
          }
          testId="summary-active-courses"
        />
        <SummaryCard
          icon={<Award size={20} />}
          tone="from-amber-500 to-orange-600"
          label={t("dashboard.summary.certificates")}
          value={loading ? "…" : String(summary.certCount)}
          note={loading ? "" : t("dashboard.summary.certificatesNote")}
          testId="summary-certificates"
        />
        <SummaryCard
          icon={<CalendarDays size={20} />}
          tone={
            expirySoon
              ? "from-rose-500 to-red-600"
              : "from-emerald-500 to-teal-600"
          }
          label={t("dashboard.summary.nextExpiry")}
          value={expiryText}
          note={expirySoon ? t("dashboard.summary.expiringSoon") : ""}
          testId="summary-next-expiry"
        />
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  tone,
  label,
  value,
  note,
  testId,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  note?: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow flex items-start gap-4"
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-md shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 break-words">
          {value}
        </p>
        {note && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────── Profile card ───────────────────

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "student" | "admin";
  bio?: string | null;
  avatarUrl?: string | null;
};

function ProfileCard({
  user,
  memberSince,
  t,
}: {
  user: ProfileUser;
  memberSince: string;
  t: (k: TranslationKey) => string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const avatarSrc = avatarViewUrl(user.avatarUrl);

  async function handleFile(file: File) {
    setUploadError(null);
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setUploadError(t("dashboard.profile.invalidType"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError(t("dashboard.profile.fileTooLarge"));
      return;
    }
    setUploading(true);
    try {
      await uploadAvatar(file);
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    } catch {
      setUploadError(t("dashboard.profile.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setUploadError(null);
    setUploading(true);
    try {
      await updateMyProfile({ avatarObjectPath: null });
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
    } catch {
      setUploadError(t("dashboard.profile.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow"
      data-testid="card-profile"
    >
      {/* Avatar */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
            data-testid="avatar-display"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserRound size={44} className="text-white/90" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={t("dashboard.profile.changePhoto")}
            data-testid="button-change-avatar"
            className="absolute -bottom-1 -end-1 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900 transition disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Camera size={15} />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            data-testid="input-avatar-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <h2 className="mt-3 text-lg font-bold leading-tight">{user.name}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {user.role === "admin"
            ? t("dashboard.profile.admin")
            : t("dashboard.profile.student")}
        </p>
        {avatarSrc && (
          <button
            type="button"
            onClick={removePhoto}
            disabled={uploading}
            data-testid="button-remove-avatar"
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 disabled:opacity-50"
          >
            <Trash2 size={12} /> {t("dashboard.profile.removePhoto")}
          </button>
        )}
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          {t("dashboard.profile.uploadHint")}
        </p>
        {uploadError && (
          <p
            className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400"
            role="alert"
          >
            {uploadError}
          </p>
        )}
      </div>

      {/* Bio */}
      <div className="mt-5 pt-5 border-t border-slate-200/70 dark:border-gray-800">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
          {t("dashboard.profile.bio")}
        </p>
        <p
          data-testid="text-profile-bio"
          className={`text-sm leading-relaxed ${user.bio ? "text-slate-700 dark:text-slate-200" : "italic text-slate-400 dark:text-slate-500"}`}
        >
          {user.bio || t("dashboard.profile.bioPlaceholder")}
        </p>
      </div>

      {/* Contact rows */}
      <ul className="mt-5 pt-5 border-t border-slate-200/70 dark:border-gray-800 space-y-3 text-sm">
        <ProfileRow
          icon={<Mail size={15} />}
          label={t("dashboard.profile.email")}
          value={user.email}
          ltr
        />
        {user.phone && (
          <ProfileRow
            icon={<Phone size={15} />}
            label={t("dashboard.profile.phone")}
            value={user.phone}
            ltr
          />
        )}
        <ProfileRow
          icon={<ShieldCheck size={15} />}
          label={t("dashboard.profile.accountType")}
          value={
            user.role === "admin"
              ? t("dashboard.profile.admin")
              : t("dashboard.profile.student")
          }
        />
        <ProfileRow
          icon={<Clock size={15} />}
          label={t("dashboard.profile.memberSince")}
          value={memberSince}
        />
      </ul>

      <button
        type="button"
        onClick={() => setEditing(true)}
        data-testid="button-edit-profile"
        className="mt-5 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow transition"
      >
        <Pencil size={15} /> {t("dashboard.profile.editBtn")}
      </button>

      <Link
        href="/account-settings"
        data-testid="link-account-settings-dashboard"
        className="mt-2 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition"
      >
        <Settings size={15} /> {t("dashboard.profile.accountSettings")}
      </Link>

      <Link
        href={`/u/${user.id}`}
        data-testid="link-view-public-profile"
        className="mt-2 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition"
      >
        <UserCircle2 size={15} /> {t("dashboard.profile.viewPublic")}
      </Link>

      <Link
        href="/payments"
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
        data-testid="link-my-payments"
      >
        <Receipt size={15} /> {t("payments.my.title")}
      </Link>

      {editing && (
        <EditProfileModal
          user={user}
          t={t}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["auth", "me"] });
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  user,
  t,
  onClose,
  onSaved,
}: {
  user: ProfileUser;
  t: (k: TranslationKey) => string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the previously-focused element so we can restore focus on
  // close, then auto-focus the first field. Esc closes the modal.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    nameRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const prev = triggerRef.current;
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError(t("dashboard.profile.saveFailed"));
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({
        name: trimmedName,
        phone: phone.trim() ? phone.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
      });
      await onSaved();
    } catch {
      setError(t("dashboard.profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 ring-1 ring-slate-200 dark:ring-gray-800"
        data-testid="modal-edit-profile"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {t("dashboard.profile.editTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
            >
              {t("dashboard.profile.fieldName")}
            </label>
            <input
              id="profile-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              minLength={2}
              data-testid="input-profile-name"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="profile-phone"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
            >
              {t("dashboard.profile.fieldPhone")}
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={32}
              dir="ltr"
              data-testid="input-profile-phone"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="profile-bio"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1"
            >
              {t("dashboard.profile.fieldBio")}
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={4}
              maxLength={500}
              placeholder={t("dashboard.profile.bioPlaceholder")}
              data-testid="input-profile-bio"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t("dashboard.profile.bioCounter").replace(
                "{n}",
                String(bio.length),
              )}
            </p>
          </div>
          {error && (
            <p
              className="text-sm font-medium text-rose-600 dark:text-rose-400"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
            data-testid="button-cancel-profile"
          >
            {t("dashboard.profile.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            data-testid="button-save-profile"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow disabled:opacity-50 inline-flex items-center gap-2 transition"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving
              ? t("dashboard.profile.saving")
              : t("dashboard.profile.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────── Misc ───────────────────

function PaymentBanner({
  status,
  text,
  tone,
  onDismiss,
}: {
  status: string;
  text: string;
  tone: "success" | "warning" | "error";
  onDismiss: () => void;
}) {
  const palette =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-100"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 text-amber-900 dark:text-amber-100"
        : "border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700/50 text-rose-900 dark:text-rose-100";
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      data-payment-status={status}
      className={`mt-6 rounded-2xl border p-4 flex items-start gap-3 ${palette}`}
    >
      <Icon size={20} className="shrink-0 mt-0.5" />
      <p className="text-sm font-medium flex-1">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  tone,
  className,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-5 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow hover:shadow-lg transition${
        className ? ` ${className}` : ""
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition`}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </Link>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  ltr = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p
          className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words"
          {...(ltr ? { dir: "ltr" } : {})}
        >
          {value}
        </p>
      </div>
    </li>
  );
}

// ─────────────────── Upcoming live sessions widget ───────────────────

function UpcomingLiveSessions() {
  const t = useT();
  const { lang } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["my-live-sessions"],
    queryFn: fetchMyLiveSessions,
    refetchInterval: 60_000,
  });

  if (isLoading) return null;
  const sessions = (data ?? []).slice(0, 3);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-5">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
          <CalendarDays
            size={18}
            className="text-indigo-600 dark:text-indigo-400"
          />
          {t("dashboard.liveSessions.cardTitle")}
        </h3>
        <Link
          href="/live-sessions"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          data-testid="dash-live-viewall"
        >
          {t("dashboard.liveSessions.viewAll")} →
        </Link>
      </header>
      {sessions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("dashboard.liveSessions.none")}
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s: LiveSession) => {
            const dt = new Date(s.startsAt).toLocaleString(
              lang === "ar" ? "ar-EG" : "en-US",
              {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              },
            );
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{s.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {dt}
                  </p>
                </div>
                <a
                  href={s.zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  data-testid={`dash-live-join-${s.id}`}
                >
                  {t("liveSessions.join")}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
