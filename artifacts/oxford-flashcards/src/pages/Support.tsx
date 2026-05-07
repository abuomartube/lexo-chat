import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
} from "lucide-react";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
import {
  fetchMyTickets,
  createTicket,
  uploadSupportAttachment,
  type SupportTicket,
  type SupportCategory,
  type AttachmentInput,
  type SupportStatus,
} from "@/lib/platform-api";

const STATUS_TONE: Record<SupportStatus, string> = {
  awaiting_admin:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  awaiting_user:
    "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  resolved:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-300",
};

export default function SupportPage() {
  const t = useT();
  const { lang } = useLanguage();
  const [showNew, setShowNew] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: fetchMyTickets,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-gray-950 dark:via-indigo-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
              {t("support.title")}
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-300 text-sm">
              {t("support.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm"
            data-testid="new-ticket-btn"
          >
            <Plus size={16} /> {t("support.new")}
          </button>
        </header>

        {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}

        {isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 flex justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300 flex gap-2">
            <AlertCircle size={18} /> {(error as Error).message}
          </div>
        )}
        {data && data.length === 0 && !isLoading && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 text-center">
            <Inbox size={36} className="mx-auto text-slate-400" />
            <p className="mt-3 text-slate-600 dark:text-slate-300 font-medium">
              {t("support.empty")}
            </p>
          </div>
        )}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} lang={lang} t={t} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function TicketRow({
  ticket,
  lang,
  t,
}: {
  ticket: SupportTicket;
  lang: "en" | "ar";
  t: (k: import("@/lib/translations").TranslationKey) => string;
}) {
  const updated = new Date(ticket.lastActivityAt).toLocaleString(
    lang === "ar" ? "ar-EG" : "en-US",
    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  );
  return (
    <li>
      <Link
        href={`/support/${ticket.id}`}
        className="block rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 hover:border-indigo-400 transition"
        data-testid={`ticket-row-${ticket.id}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_TONE[ticket.status]}`}
              >
                {t(`support.status.${ticket.status}` as never)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {t(`support.category.${ticket.category}` as never)}
              </span>
            </div>
            <h3 className="mt-1.5 font-bold truncate">{ticket.subject}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <Clock size={11} /> {updated}
            </p>
          </div>
          <ChevronRight className="text-slate-400 rtl:rotate-180" />
        </div>
      </Link>
    </li>
  );
}

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<SupportCategory>("general");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      let attachments: AttachmentInput[] = [];
      if (files.length > 0) {
        setUploading(true);
        try {
          attachments = await Promise.all(files.map(uploadSupportAttachment));
        } finally {
          setUploading(false);
        }
      }
      return createTicket({ subject, body, category, attachments });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const disabled =
    mutation.isPending ||
    uploading ||
    subject.trim().length < 2 ||
    body.trim().length < 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("support.new.title")}</h2>
        <label className="block text-sm font-semibold mb-1">
          {t("support.field.subject")}
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm mb-3"
          data-testid="new-ticket-subject"
        />
        <label className="block text-sm font-semibold mb-1">
          {t("support.field.category")}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SupportCategory)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm mb-3"
        >
          {(
            [
              "general",
              "billing",
              "technical",
              "course_content",
              "account",
            ] as const
          ).map((c) => (
            <option key={c} value={c}>
              {t(`support.category.${c}` as never)}
            </option>
          ))}
        </select>
        <label className="block text-sm font-semibold mb-1">
          {t("support.field.body")}
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={10_000}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm mb-3"
          data-testid="new-ticket-body"
        />
        <label className="block text-sm font-semibold mb-1">
          {t("support.field.attachments")}
        </label>
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) =>
            setFiles(Array.from(e.target.files ?? []).slice(0, 5))
          }
          className="block w-full text-sm mb-3"
          data-testid="new-ticket-files"
        />
        {files.length > 0 && (
          <ul className="text-xs text-slate-600 dark:text-slate-300 mb-3 space-y-0.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-1">
                <Paperclip size={11} /> {f.name} ({Math.round(f.size / 1024)}{" "}
                KB)
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3 inline-flex items-center gap-1">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={disabled}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold text-sm inline-flex items-center gap-2"
            data-testid="submit-new-ticket"
          >
            {(mutation.isPending || uploading) && (
              <Loader2 size={14} className="animate-spin" />
            )}
            <MessageSquare size={14} /> {t("support.send")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Used by status icons elsewhere
export const SUPPORT_STATUS_ICONS: Record<SupportStatus, React.ReactNode> = {
  awaiting_admin: <Clock size={12} />,
  awaiting_user: <MessageSquare size={12} />,
  resolved: <CheckCircle2 size={12} />,
  closed: <XCircle size={12} />,
};
