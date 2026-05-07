import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Send,
  AlertCircle,
  ArrowLeft,
  Paperclip,
  Download,
  Shield,
  UserRound,
} from "lucide-react";
import Header from "@/components/Header";
import { useT, useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  fetchTicket,
  replyToTicket,
  uploadSupportAttachment,
  attachmentDownloadUrl,
  setTicketStatus,
  type SupportMessage,
  type SupportTicket,
  type SupportStatus,
  type AttachmentInput,
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

export default function SupportThread() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const t = useT();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
    refetchInterval: 30_000,
  });

  const isAdmin = user?.role === "admin";
  const backHref = isAdmin ? "/admin?tab=support" : "/support";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 dark:from-gray-950 dark:via-indigo-950/40 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-4"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" /> {t("support.back")}
        </Link>

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
        {data && (
          <ThreadView
            ticket={data.ticket}
            messages={data.messages}
            lang={lang}
            t={t}
            isAdmin={isAdmin}
            onChanged={() =>
              qc.invalidateQueries({ queryKey: ["ticket", ticketId] })
            }
          />
        )}
      </main>
    </div>
  );
}

function ThreadView({
  ticket,
  messages,
  lang,
  t,
  isAdmin,
  onChanged,
}: {
  ticket: SupportTicket;
  messages: SupportMessage[];
  lang: "en" | "ar";
  t: (k: import("@/lib/translations").TranslationKey) => string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const statusMut = useMutation({
    mutationFn: (status: SupportStatus) => setTicketStatus(ticket.id, status),
    onSuccess: () => {
      onChanged();
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  return (
    <>
      <header className="mb-4">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span
            className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_TONE[ticket.status]}`}
          >
            {t(`support.status.${ticket.status}` as never)}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {t(`support.category.${ticket.category}` as never)}
          </span>
        </div>
        <h1 className="mt-2 text-xl sm:text-2xl font-extrabold">
          {ticket.subject}
        </h1>
        {isAdmin && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                "awaiting_user",
                "awaiting_admin",
                "resolved",
                "closed",
              ] as SupportStatus[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => statusMut.mutate(s)}
                disabled={ticket.status === s}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                  ticket.status === s
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                    : "border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800"
                }`}
                data-testid={`status-${s}`}
              >
                {t(`support.status.${s}` as never)}
              </button>
            ))}
          </div>
        )}
      </header>

      <ul className="space-y-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} lang={lang} t={t} />
        ))}
      </ul>

      {ticket.status === "closed" && !isAdmin ? (
        <div className="mt-6 rounded-2xl bg-slate-100 dark:bg-gray-800 p-5 text-center text-sm text-slate-600 dark:text-slate-300">
          {t("support.closedNotice")}
        </div>
      ) : (
        <ReplyBox ticketId={ticket.id} t={t} onSent={onChanged} />
      )}
    </>
  );
}

function MessageBubble({
  message,
  lang,
  t,
}: {
  message: SupportMessage;
  lang: "en" | "ar";
  t: (k: import("@/lib/translations").TranslationKey) => string;
}) {
  const isAdmin = message.authorRole === "admin";
  const time = new Date(message.createdAt).toLocaleString(
    lang === "ar" ? "ar-EG" : "en-US",
    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  );
  return (
    <li className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${
          isAdmin
            ? "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800"
            : "bg-indigo-600 text-white border-indigo-700"
        }`}
        data-testid={`message-${message.id}`}
      >
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${isAdmin ? "text-indigo-700 dark:text-indigo-300" : "text-indigo-100"}`}
        >
          {isAdmin ? <Shield size={12} /> : <UserRound size={12} />}
          {t(`support.role.${message.authorRole}` as never)}
          <span
            className={`font-normal opacity-70 ml-1 ${!isAdmin ? "text-indigo-100" : ""}`}
          >
            · {time}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.body}
        </p>
        {message.attachments.length > 0 && (
          <ul className="mt-3 space-y-1">
            {message.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={attachmentDownloadUrl(a.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2 py-1 ${
                    isAdmin
                      ? "bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200"
                      : "bg-indigo-700 hover:bg-indigo-800 text-white"
                  }`}
                >
                  <Paperclip size={11} /> {a.filename}
                  <Download size={11} className="opacity-70" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function ReplyBox({
  ticketId,
  t,
  onSent,
}: {
  ticketId: string;
  t: (k: import("@/lib/translations").TranslationKey) => string;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
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
      return replyToTicket(ticketId, body, attachments);
    },
    onSuccess: () => {
      setBody("");
      setFiles([]);
      onSent();
    },
    onError: (e) => setError((e as Error).message),
  });

  const disabled = mutation.isPending || uploading || body.trim().length < 1;

  return (
    <div className="mt-6 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={10_000}
        placeholder={t("support.reply.placeholder")}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
        data-testid="reply-body"
      />
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
          <Paperclip size={13} />
          <span>{t("support.field.attachments")}</span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, 5))
            }
            className="hidden"
            data-testid="reply-files"
          />
        </label>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold text-sm"
          data-testid="reply-send"
        >
          {(mutation.isPending || uploading) && (
            <Loader2 size={14} className="animate-spin" />
          )}
          <Send size={14} /> {t("support.send")}
        </button>
      </div>
      {files.length > 0 && (
        <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-1">
              <Paperclip size={11} /> {f.name}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 inline-flex items-center gap-1">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  );
}
