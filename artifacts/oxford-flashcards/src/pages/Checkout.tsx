import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Upload,
  FileText,
  X,
} from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useT, useLanguage } from "@/lib/i18n";
import {
  fetchBankTransferDetails,
  fetchCheckoutPreview,
  startBankTransferPayment,
  startCheckout,
  uploadPaymentProof,
  type BankTransferDetails,
  type CheckoutPreview,
  type CheckoutProvider,
  type CheckoutCourse,
  type UploadedProof,
} from "@/lib/platform-api";
import tabbyLogoUrl from "@assets/Photoroom_20260501_230042_1777665690785.PNG";
import tamaraLogoUrl from "@assets/IMG_6229_1777665695004.PNG";
import alrajhiLogoUrl from "@assets/IMG_6235_1777667928326.PNG";

const VALID_TIERS: Record<CheckoutCourse, readonly string[]> = {
  intro: ["intro", "advance", "complete"],
  english: ["beginner", "intermediate", "advanced"],
  ielts: ["intro", "advance", "complete"],
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

/** Pretty-print a SA IBAN as `SA46 8000 0133 6080 1649 7687` for readability. */
function formatIban(iban: string): string {
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  return compact.match(/.{1,4}/g)?.join(" ") ?? compact;
}

export default function Checkout() {
  const [, params] = useRoute<{ course: string; tier: string }>(
    "/checkout/:course/:tier",
  );
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const t = useT();
  const { lang } = useLanguage();

  const course = (params?.course ?? "").toLowerCase();
  const tier = (params?.tier ?? "").toLowerCase();

  const urlParams = new URLSearchParams(window.location.search);
  const discountCode = urlParams.get("discount") || undefined;
  const isValid =
    (course === "intro" || course === "english") &&
    VALID_TIERS[course as CheckoutCourse].includes(tier);

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [bank, setBank] = useState<BankTransferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<CheckoutProvider>("tabby");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ─── Bank-transfer-specific state ───────────────────────────────────────
  // The student must provide a sender name and upload a payment proof
  // (image / PDF / doc) before we can record their bank-transfer payment.
  // The proof is uploaded direct-to-GCS as soon as it's picked, so when
  // they hit submit we already have an `objectPath` to attach.
  const [bankSenderName, setBankSenderName] = useState("");
  const [bankProof, setBankProof] = useState<UploadedProof | null>(null);
  const [bankProofUploading, setBankProofUploading] = useState(false);
  const [bankProofError, setBankProofError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValid) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadError(null);
    // Load checkout preview + bank-transfer config in parallel. The bank
    // details endpoint never throws — if env vars are missing it returns
    // { configured: false } and we just hide the bank-transfer tile.
    Promise.all([
      fetchCheckoutPreview(course as CheckoutCourse, tier),
      fetchBankTransferDetails().catch(
        () =>
          ({ configured: false }) as Awaited<
            ReturnType<typeof fetchBankTransferDetails>
          >,
      ),
    ])
      .then(([p, b]) => {
        if (!alive) return;
        setPreview(p);
        if (b.configured && b.bank) setBank(b.bank);
      })
      .catch((err: unknown) => {
        if (alive) setLoadError((err as Error).message ?? "error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [course, tier, isValid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || !agree || submitting) return;

    if (provider === "bank_transfer") {
      // Hard-stop — the bank-transfer route requires both a non-empty sender
      // name and an uploaded proof. We surface inline errors instead of
      // letting the server reject with a generic 400.
      if (bankSenderName.trim().length < 2) {
        setSubmitError(t("checkout.bankTransfer.senderRequired"));
        return;
      }
      if (!bankProof) {
        setSubmitError(t("checkout.bankTransfer.proofRequired"));
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (provider === "bank_transfer") {
        await startBankTransferPayment({
          course: preview.course,
          tier: preview.tier,
          language: lang,
          senderName: bankSenderName.trim(),
          proofObjectPath: bankProof!.objectPath,
          proofContentType: bankProof!.contentType,
          proofFilename: bankProof!.filename,
          discountCode,
        });
        navigate("/dashboard?payment=pending_bank_transfer");
        return;
      }
      const start = await startCheckout(
        provider,
        preview.course,
        preview.tier,
        lang,
        discountCode,
      );
      window.location.href = start.redirectUrl;
    } catch (err) {
      setSubmitting(false);
      const msg = (err as Error).message ?? "error";
      if (
        msg === "provider_not_configured" ||
        msg === "bank_transfer_not_configured"
      ) {
        setSubmitError(t("checkout.providerNotConfigured"));
      } else if (msg === "already_enrolled") {
        navigate("/dashboard?payment=success");
      } else if (msg === "discount_invalid") {
        setSubmitError(t("checkout.discountInvalid"));
      } else {
        setSubmitError(t("checkout.error"));
      }
    }
  };

  const handleProofPicked = async (file: File) => {
    setBankProofError(null);
    // Cap the upload at 10 MB to mirror common phone screenshot sizes
    // without letting an attacker DoS the bucket.
    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setBankProofError(t("checkout.bankTransfer.fileTooLarge"));
      return;
    }
    setBankProofUploading(true);
    try {
      const uploaded = await uploadPaymentProof(file);
      setBankProof(uploaded);
    } catch (err) {
      const msg = (err as Error).message ?? "error";
      setBankProofError(
        msg.startsWith("upload_failed_")
          ? t("checkout.bankTransfer.uploadFailed")
          : t("checkout.bankTransfer.uploadFailed"),
      );
    } finally {
      setBankProofUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("checkout.title")}
          </h1>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-gray-900 ring-1 ring-slate-200 dark:ring-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
          >
            <ArrowRight size={14} className="rtl:rotate-180" />
            {t("checkout.backToCart")}
          </Link>
        </div>

        {!isValid && (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-5 text-sm">
            {t("checkout.notFound")}
            <div className="mt-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-semibold"
              >
                {t("checkout.goToDashboard")} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {isValid && loading && (
          <div className="mt-8 rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-8 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow text-center text-sm text-slate-500">
            {t("checkout.loading")}
          </div>
        )}

        {isValid && !loading && loadError && (
          <div className="mt-8 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700/50 p-5 text-sm">
            {t("checkout.error")}
          </div>
        )}

        {isValid && !loading && preview && preview.alreadyEnrolled && (
          <div className="mt-8 rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700/50 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                size={22}
              />
              <div className="flex-1">
                <p className="font-semibold">{t("checkout.alreadyEnrolled")}</p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-semibold"
                >
                  {t("checkout.goToDashboard")} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {isValid && !loading && preview && !preview.alreadyEnrolled && (
          <CheckoutForm
            preview={preview}
            bank={bank}
            lang={lang}
            provider={provider}
            setProvider={setProvider}
            agree={agree}
            setAgree={setAgree}
            submitting={submitting}
            submitError={submitError}
            onSubmit={handleSubmit}
            t={t}
            bankSenderName={bankSenderName}
            setBankSenderName={setBankSenderName}
            bankProof={bankProof}
            bankProofUploading={bankProofUploading}
            bankProofError={bankProofError}
            onProofPicked={handleProofPicked}
            onProofClear={() => {
              setBankProof(null);
              setBankProofError(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

function CheckoutForm({
  preview,
  bank,
  lang,
  provider,
  setProvider,
  agree,
  setAgree,
  submitting,
  submitError,
  onSubmit,
  t,
  bankSenderName,
  setBankSenderName,
  bankProof,
  bankProofUploading,
  bankProofError,
  onProofPicked,
  onProofClear,
}: {
  preview: CheckoutPreview;
  bank: BankTransferDetails | null;
  lang: "en" | "ar";
  provider: CheckoutProvider;
  setProvider: (p: CheckoutProvider) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  t: (k: Parameters<ReturnType<typeof useT>>[0]) => string;
  bankSenderName: string;
  setBankSenderName: (v: string) => void;
  bankProof: UploadedProof | null;
  bankProofUploading: boolean;
  bankProofError: string | null;
  onProofPicked: (file: File) => void;
  onProofClear: () => void;
}) {
  const courseLabel = useMemo(
    () => (lang === "ar" ? preview.courseLabelAr : preview.courseLabelEn),
    [preview, lang],
  );
  const tierLabel = useMemo(
    () => (lang === "ar" ? preview.tierLabelAr : preview.tierLabelEn),
    [preview, lang],
  );
  const total = formatAmount(preview.amountMinor, preview.currency, lang);

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <section className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
        <h2 className="text-base font-bold mb-4">{t("checkout.summary")}</h2>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-slate-500">{t("checkout.course")}</dt>
          <dd className="col-span-2 font-medium">{courseLabel}</dd>
          <dt className="text-slate-500">{t("checkout.tier")}</dt>
          <dd className="col-span-2 font-medium">{tierLabel}</dd>
          <dt className="text-slate-500">{t("checkout.total")}</dt>
          <dd className="col-span-2 font-extrabold text-lg">{total}</dd>
        </dl>
      </section>

      <section className="rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur p-6 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow">
        <h2 className="text-base font-bold mb-4">
          {t("checkout.choosePayment")}
        </h2>
        <div
          className={`grid grid-cols-1 gap-3 ${
            bank ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          <ProviderTile
            id="tabby"
            ariaLabel={t("checkout.payWithTabby")}
            line1={t("checkout.tabbyLine1")}
            line2={t("checkout.tabbyLine2")}
            ringColor="ring-[#3BFFC1]"
            bgColor="bg-[#3BFFC1]/10"
            checked={provider === "tabby"}
            onSelect={() => setProvider("tabby")}
            logo={<TabbyLogo />}
          />
          <ProviderTile
            id="tamara"
            ariaLabel={t("checkout.payWithTamara")}
            line1={t("checkout.tamaraLine1")}
            line2={t("checkout.tamaraLine2")}
            ringColor="ring-[#3D1560]"
            bgColor="bg-[#3D1560]/5"
            checked={provider === "tamara"}
            onSelect={() => setProvider("tamara")}
            logo={<TamaraLogo />}
          />
          {bank && (
            <ProviderTile
              id="bank_transfer"
              ariaLabel={t("checkout.payWithBankTransfer")}
              line1={t("checkout.bankTransferLine1")}
              line2={t("checkout.bankTransferLine2")}
              ringColor="ring-[#3838E0]"
              bgColor="bg-[#3838E0]/5"
              checked={provider === "bank_transfer"}
              onSelect={() => setProvider("bank_transfer")}
              logo={<AlRajhiLogo />}
            />
          )}
        </div>
      </section>

      {provider === "bank_transfer" && bank && (
        <BankInstructions
          bank={bank}
          lang={lang}
          total={total}
          t={t}
          senderName={bankSenderName}
          setSenderName={setBankSenderName}
          proof={bankProof}
          uploading={bankProofUploading}
          uploadError={bankProofError}
          onProofPicked={onProofPicked}
          onProofClear={onProofClear}
        />
      )}

      <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          data-testid="agree-terms"
        />
        <span>{t("checkout.terms")}</span>
      </label>

      {submitError && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700/50 p-4 text-sm flex items-start gap-2">
          <AlertCircle
            size={16}
            className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
          />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={
          !agree ||
          submitting ||
          (provider === "bank_transfer" &&
            (bankProofUploading ||
              !bankProof ||
              bankSenderName.trim().length < 2))
        }
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition"
        data-testid="checkout-submit"
      >
        {submitting
          ? t("checkout.processing")
          : provider === "bank_transfer"
            ? t("checkout.bankTransfer.iSentIt")
            : t("checkout.continue")}
        {!submitting && <ArrowRight size={16} />}
      </button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 inline-flex items-center justify-center gap-1.5 w-full">
        <ShieldCheck size={12} /> {t("checkout.secure")}
      </p>
    </form>
  );
}

function ProviderTile({
  id,
  ariaLabel,
  line1,
  line2,
  ringColor,
  bgColor,
  checked,
  onSelect,
  logo,
}: {
  id: string;
  ariaLabel: string;
  line1: string;
  line2: string;
  ringColor: string;
  bgColor: string;
  checked: boolean;
  onSelect: () => void;
  logo: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      aria-label={ariaLabel}
      className={`group flex flex-col items-start gap-3 text-start rounded-xl p-5 min-h-[140px] ring-2 bg-white dark:bg-gray-900/60 transition ${
        checked
          ? `${ringColor} ${bgColor} shadow-md`
          : "ring-slate-200 dark:ring-gray-800 hover:ring-slate-300 dark:hover:ring-gray-700"
      }`}
      data-provider={id}
      data-testid={`provider-${id}`}
    >
      <div className="h-9 flex items-center">{logo}</div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
          {line1}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
          {line2}
        </p>
      </div>
    </button>
  );
}

/**
 * Bank-transfer instructions panel shown only when the buyer selects
 * "Bank Transfer". Three sections, top-to-bottom:
 *  1. Bank details (read-only) — copy-able IBAN + SWIFT.
 *  2. Sender-name input — the student types whoever's name is on the
 *     sending account, so an admin can match it against the bank statement.
 *  3. Payment-proof file picker — image, PDF, or document up to 10 MB,
 *     uploaded direct-to-GCS via a presigned URL. The admin views it
 *     from the Payments tab to verify the deposit.
 */
function BankInstructions({
  bank,
  lang,
  total,
  t,
  senderName,
  setSenderName,
  proof,
  uploading,
  uploadError,
  onProofPicked,
  onProofClear,
}: {
  bank: BankTransferDetails;
  lang: "en" | "ar";
  total: string;
  t: (k: Parameters<ReturnType<typeof useT>>[0]) => string;
  senderName: string;
  setSenderName: (v: string) => void;
  proof: UploadedProof | null;
  uploading: boolean;
  uploadError: string | null;
  onProofPicked: (file: File) => void;
  onProofClear: () => void;
}) {
  const accountName = lang === "ar" ? bank.accountNameAr : bank.accountNameEn;
  const bankName = lang === "ar" ? bank.bankNameAr : bank.bankNameEn;
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <section
      className="rounded-2xl border-2 border-[#3838E0]/30 bg-[#3838E0]/5 dark:bg-[#3838E0]/10 p-6 space-y-5"
      data-testid="bank-instructions"
    >
      <div className="flex items-start gap-3">
        <Building2
          size={22}
          className="text-[#3838E0] shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold">
            {t("checkout.bankTransfer.title")}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("checkout.bankTransfer.instructions")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <BankRow label={t("checkout.bankTransfer.amount")} value={total} bold />
        <BankRow label={t("checkout.bankTransfer.bankName")} value={bankName} />
        <BankRow
          label={t("checkout.bankTransfer.accountName")}
          value={accountName}
        />
        <BankRow
          label={t("checkout.bankTransfer.iban")}
          value={formatIban(bank.iban)}
          copyValue={bank.iban}
          mono
          t={t}
        />
        {bank.swift && (
          <BankRow
            label={t("checkout.bankTransfer.swift")}
            value={bank.swift}
            copyValue={bank.swift}
            mono
            t={t}
          />
        )}
      </div>

      {/* Sender name + proof upload */}
      <div className="border-t border-[#3838E0]/20 pt-4 space-y-4">
        <div>
          <label
            htmlFor="bank-sender-name"
            className="block text-sm font-semibold mb-1.5"
          >
            {t("checkout.bankTransfer.senderLabel")}
            <span className="text-rose-600 ms-1">*</span>
          </label>
          <input
            id="bank-sender-name"
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder={t("checkout.bankTransfer.senderPlaceholder")}
            className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3838E0]"
            maxLength={200}
            data-testid="bank-sender-name"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("checkout.bankTransfer.senderHelp")}
          </p>
        </div>

        <div>
          <p className="block text-sm font-semibold mb-1.5">
            {t("checkout.bankTransfer.proofLabel")}
            <span className="text-rose-600 ms-1">*</span>
          </p>

          {!proof ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#3838E0]/50 bg-white dark:bg-gray-900/60 px-4 py-6 text-sm font-semibold text-[#3838E0] hover:bg-[#3838E0]/5 disabled:opacity-60 disabled:cursor-wait transition"
              data-testid="bank-proof-pick"
            >
              <Upload size={16} />
              {uploading
                ? t("checkout.bankTransfer.uploading")
                : t("checkout.bankTransfer.proofPick")}
            </button>
          ) : (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700/50 px-3 py-2.5"
              data-testid="bank-proof-uploaded"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText
                  size={16}
                  className="text-emerald-600 dark:text-emerald-400 shrink-0"
                />
                <span className="text-sm font-medium truncate" dir="ltr">
                  {proof.filename}
                </span>
                <CheckCircle2
                  size={14}
                  className="text-emerald-600 dark:text-emerald-400 shrink-0"
                />
              </div>
              <button
                type="button"
                onClick={onProofClear}
                aria-label={t("checkout.bankTransfer.proofRemove")}
                className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                data-testid="bank-proof-remove"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onProofPicked(file);
              // Reset so picking the same file twice still fires onChange.
              e.target.value = "";
            }}
            data-testid="bank-proof-input"
          />

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("checkout.bankTransfer.proofHelp")}
          </p>

          {uploadError && (
            <p
              className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
              data-testid="bank-proof-error"
            >
              <AlertCircle size={12} /> {uploadError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BankRow({
  label,
  value,
  copyValue,
  mono,
  bold,
  t,
}: {
  label: string;
  value: string;
  copyValue?: string;
  mono?: boolean;
  bold?: boolean;
  t?: (k: Parameters<ReturnType<typeof useT>>[0]) => string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently noop.
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-gray-900/60 ring-1 ring-slate-200 dark:ring-gray-800 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p
          className={`text-sm break-all ${
            mono ? "font-mono tracking-wide" : ""
          } ${bold ? "font-extrabold text-base" : "font-medium"}`}
        >
          {value}
        </p>
      </div>
      {copyValue && (
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#3838E0] hover:bg-[#3838E0]/10 transition"
          aria-label={
            copied
              ? t?.("checkout.bankTransfer.copied")
              : t?.("checkout.bankTransfer.copy")
          }
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span className="hidden sm:inline">
            {copied
              ? t?.("checkout.bankTransfer.copied")
              : t?.("checkout.bankTransfer.copy")}
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Official Tabby payment-method chip. Renders the brand asset supplied by
 * Tabby's merchant kit (mint `#3BFFC1` chip with the "tabby" wordmark in
 * their custom typography). Aspect ratio is preserved so the wordmark
 * never distorts.
 */
function TabbyLogo() {
  return (
    <img
      src={tabbyLogoUrl}
      alt="Tabby"
      className="h-9 w-auto object-contain select-none"
      draggable={false}
    />
  );
}

/**
 * Official Tamara payment-method chip. Renders the brand asset supplied by
 * Tamara's merchant kit (signature warm gradient with the "tamara"
 * wordmark in their custom typography). Aspect ratio is preserved so the
 * wordmark never distorts.
 */
function TamaraLogo() {
  return (
    <img
      src={tamaraLogoUrl}
      alt="Tamara"
      className="h-9 w-auto object-contain select-none"
      draggable={false}
    />
  );
}

/**
 * Official Al Rajhi Bank logo (مصرف الراجحي). Used on the bank-transfer
 * tile so buyers immediately recognise where their money is going.
 */
function AlRajhiLogo() {
  return (
    <img
      src={alrajhiLogoUrl}
      alt="Al Rajhi Bank"
      className="h-9 w-auto object-contain select-none"
      draggable={false}
    />
  );
}
