import { useEffect, useState } from "react";
import { useT, useLanguage } from "@/lib/i18n";
import Header from "@/components/Header";
import {
  bankProofViewUrl,
  fetchMyPayments,
  resubmitBankProof,
  uploadPaymentProof,
  type MyPayment,
} from "@/lib/platform-api";
import { AlertCircle, CheckCircle2, Clock, Upload, X } from "lucide-react";
import type { TranslationKey } from "@/lib/translations";

const STATUS_KEY: Record<string, TranslationKey> = {
  pending: "payments.my.status.pending",
  captured: "payments.my.status.captured",
  failed: "payments.my.status.failed",
  cancelled: "payments.my.status.cancelled",
  expired: "payments.my.status.expired",
  created: "payments.my.status.created",
  authorized: "payments.my.status.authorized",
  refunded: "payments.my.status.refunded",
};

const STATUS_TONE: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  captured:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  cancelled:
    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  expired: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  created: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  authorized:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  refunded: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function MyPayments() {
  const t = useT();
  const { lang } = useLanguage();
  const [payments, setPayments] = useState<MyPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const rows = await fetchMyPayments();
      setPayments(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("payments.my.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t("payments.my.subtitle")}
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700/50 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {payments === null && !error && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <Clock size={14} className="inline me-1" /> Loading…
          </div>
        )}

        {payments && payments.length === 0 && (
          <div
            className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
            data-testid="payments-empty"
          >
            {t("payments.my.empty")}
          </div>
        )}

        <ul className="space-y-4" data-testid="payments-list">
          {(payments ?? []).map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              lang={lang}
              t={t}
              onChanged={load}
            />
          ))}
        </ul>
      </main>
    </div>
  );
}

function PaymentCard({
  payment: p,
  lang,
  t,
  onChanged,
}: {
  payment: MyPayment;
  lang: "en" | "ar";
  t: ReturnType<typeof useT>;
  onChanged: () => void;
}) {
  const created = new Date(p.createdAt).toLocaleDateString(
    lang === "ar" ? "ar-EG" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );
  const amount = `${(p.amountMinor / 100).toFixed(0)} ${p.currency}`;
  const statusKey = STATUS_KEY[p.status] ?? "payments.my.status.pending";
  const statusTone = STATUS_TONE[p.status] ?? STATUS_TONE.pending;
  const proofUrl = bankProofViewUrl(p.bankProofObjectPath);

  // A bank-transfer row is "resubmittable" when it's in a terminal failed
  // state. The server enforces the same condition.
  const canResubmit =
    p.provider === "bank_transfer" &&
    (p.status === "failed" ||
      p.status === "cancelled" ||
      p.status === "expired");

  return (
    <li
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900/60 p-5 shadow-sm"
      data-testid={`payment-row-${p.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            {p.course} — {p.tier}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {created} · {p.provider.replace("_", " ")} · {amount}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}
          data-testid={`payment-status-${p.id}`}
        >
          {p.status === "captured" ? (
            <CheckCircle2 size={12} />
          ) : p.status === "pending" ? (
            <Clock size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          {t(statusKey)}
        </span>
      </div>

      {p.provider === "bank_transfer" && p.bankSenderName && (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          {t("checkout.bankTransfer.senderLabel")}:{" "}
          <span className="font-semibold">{p.bankSenderName}</span>
        </p>
      )}

      {p.rejectionReason && (
        <div
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800/50 px-3 py-2"
          data-testid={`payment-rejection-${p.id}`}
        >
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
            {t("payments.my.rejectionReason")}
          </p>
          <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-200">
            {p.rejectionReason}
          </p>
        </div>
      )}

      {proofUrl && (
        <a
          href={proofUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
        >
          {t("payments.my.viewProof")}
        </a>
      )}

      {canResubmit && <ResubmitForm payment={p} t={t} onChanged={onChanged} />}
    </li>
  );
}

function ResubmitForm({
  payment: p,
  t,
  onChanged,
}: {
  payment: MyPayment;
  t: ReturnType<typeof useT>;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState(p.bankSenderName ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || senderName.trim().length < 2) {
      setError("missing_fields");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const uploaded = await uploadPaymentProof(file);
      await resubmitBankProof(p.id, {
        senderName: senderName.trim(),
        proofObjectPath: uploaded.objectPath,
        proofContentType: uploaded.contentType,
        proofFilename: uploaded.filename,
      });
      setSuccess(true);
      setOpen(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "resubmit_failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <p
        className="mt-4 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"
        data-testid={`payment-resubmit-success-${p.id}`}
      >
        <CheckCircle2 size={14} /> {t("payments.my.reuploadSuccess")}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2"
        data-testid={`payment-reupload-open-${p.id}`}
      >
        <Upload size={14} /> {t("payments.my.reupload")}
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-3 rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-3"
      data-testid={`payment-resubmit-form-${p.id}`}
    >
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {t("payments.my.reuploadHint")}
      </p>
      <input
        type="text"
        value={senderName}
        onChange={(e) => setSenderName(e.target.value)}
        placeholder={t("checkout.bankTransfer.senderPlaceholder")}
        className="w-full rounded-md border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        maxLength={200}
        data-testid={`resubmit-sender-${p.id}`}
      />
      <input
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-xs"
        data-testid={`resubmit-file-${p.id}`}
      />
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !file || senderName.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-3 py-1.5"
          data-testid={`resubmit-submit-${p.id}`}
        >
          {submitting ? "…" : t("payments.my.reuploadSubmit")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs px-2 py-1"
        >
          <X size={12} />
        </button>
      </div>
    </form>
  );
}
