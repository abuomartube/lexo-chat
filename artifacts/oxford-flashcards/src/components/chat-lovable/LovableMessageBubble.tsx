import { ImageIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat-api";
import { ChatBubble } from "./ChatBubble";
import { VoiceBubble } from "./VoiceBubble";
import { Avatar } from "./Avatar";
import { LearnPanel, type LearnActionKind } from "./LearnPanel";
import "./lovable-chat.css";

const LEARN_LABELS = {
  en: {
    translate: "Translate",
    correct: "Correct",
    explain: "Explain",
    pronounce: "Pronounce",
  },
  ar: {
    translate: "ترجمة",
    correct: "تصحيح",
    explain: "شرح",
    pronounce: "نطق",
  },
} as const;

interface Props {
  msg: ChatMessage;
  isMine: boolean;
  canDelete: boolean;
  onDelete: () => void;
  lang: "en" | "ar";
  aiFeedbackEnabled?: boolean;
}

function seedFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 999 + 1;
}

export default function LovableMessageBubble({
  msg,
  isMine,
  canDelete,
  onDelete,
  lang,
  aiFeedbackEnabled = true,
}: Props) {
  const [hover, setHover] = useState(false);
  const [learnKind, setLearnKind] = useState<LearnActionKind | null>(null);
  const handleLearnAction = (kind: LearnActionKind) => {
    setLearnKind(kind);
  };
  const time = new Date(msg.createdAt).toLocaleTimeString(
    lang === "ar" ? "ar-EG" : "en-US",
    { hour: "numeric", minute: "2-digit" },
  );
  const side: "left" | "right" = isMine ? "right" : "left";

  if (msg.kind === "system") {
    return (
      <div className="my-4 flex justify-center lx-fade-in">
        <div
          dir="auto"
          className="text-[11px] font-medium px-3.5 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-xl text-slate-300 ring-1 ring-white/10 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.5)]"
        >
          {msg.body}
        </div>
      </div>
    );
  }

  if (msg.kind === "text") {
    return (
      <>
        <ChatBubble
          author={msg.authorName}
          text={
            msg.deleted
              ? lang === "ar"
                ? "تم حذف الرسالة"
                : "message deleted"
              : msg.body ?? ""
          }
          deleted={!!msg.deleted}
          time={time}
          side={side}
          authorRole={msg.authorRole === "admin" ? "teacher" : "student"}
          canDelete={canDelete}
          onDelete={onDelete}
          learnLabels={msg.deleted || !aiFeedbackEnabled ? undefined : LEARN_LABELS[lang]}
          onLearnAction={msg.deleted || !aiFeedbackEnabled ? undefined : handleLearnAction}
        />
        {!msg.deleted && aiFeedbackEnabled && (
          <LearnPanel
            open={learnKind !== null}
            onOpenChange={(v) => {
              if (!v) setLearnKind(null);
            }}
            kind={learnKind}
            messageText={msg.body ?? ""}
            lang={lang}
          />
        )}
      </>
    );
  }

  if (msg.kind === "voice") {
    if (msg.deleted) {
      return (
        <div
          className={cn(
            "flex w-full gap-2 my-2",
            isMine ? "flex-row-reverse lx-bubble-in-r" : "flex-row lx-bubble-in-l",
          )}
        >
          {!isMine && (
            <div className="self-end mb-1">
              <Avatar name={msg.authorName} size="sm" />
            </div>
          )}
          <div className={cn("flex min-w-0 max-w-[82%] sm:max-w-[78%] md:max-w-[60%] flex-col gap-1", isMine && "items-end")}>
            <div
              dir="auto"
              className={cn(
                "rounded-[22px] px-4 py-2.5 text-sm italic opacity-70",
                isMine ? "rounded-br-md lx-bubble-out" : "rounded-tl-md lx-bubble-in",
              )}
            >
              {lang === "ar" ? "تم حذف الرسالة" : "message deleted"}
            </div>
            <div className={cn("text-[10px] tabular-nums text-slate-400 px-1", isMine ? "text-end" : "text-start")}>
              {time}
            </div>
          </div>
        </div>
      );
    }
    return (
      <VoiceBubble
        duration={msg.audioDurationSec ?? 0}
        time={time}
        side={side}
        src={msg.attachmentUrl ?? undefined}
        seed={seedFor(msg.id)}
        author={isMine ? undefined : msg.authorName}
        canDelete={canDelete}
        onDelete={onDelete}
      />
    );
  }

  if (msg.kind === "image") {
    return (
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn(
          "flex w-full gap-2 my-2",
          isMine ? "flex-row-reverse lx-bubble-in-r" : "flex-row lx-bubble-in-l",
        )}
      >
        {!isMine && (
          <div className="self-end mb-1">
            <Avatar name={msg.authorName} size="sm" />
          </div>
        )}
        <div className={cn("flex min-w-0 max-w-[82%] sm:max-w-[78%] md:max-w-[60%] flex-col gap-1", isMine && "items-end")}>
          {!isMine && (
            <span className="text-[11px] font-semibold tracking-wide text-slate-300 px-1">
              {msg.authorName}
            </span>
          )}
          <div className="relative group">
            {msg.deleted || !msg.attachmentUrl ? (
              <div
                dir="auto"
                className={cn(
                  "flex items-center gap-2 rounded-[22px] px-4 py-2.5 text-sm italic opacity-70",
                  isMine ? "rounded-br-md lx-bubble-out" : "rounded-tl-md lx-bubble-in",
                )}
              >
                <ImageIcon className="h-4 w-4" />
                {msg.deleted
                  ? lang === "ar"
                    ? "تم حذف الرسالة"
                    : "message deleted"
                  : lang === "ar"
                    ? "مرفق"
                    : "attachment"}
              </div>
            ) : (
              <a
                href={msg.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full max-w-[320px] overflow-hidden rounded-[22px] ring-1 ring-white/15 shadow-[0_14px_40px_-14px_rgba(0,0,0,0.7),0_4px_12px_-4px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-0.5 hover:ring-white/25"
              >
                <img
                  src={msg.attachmentUrl}
                  alt="attachment"
                  className="block w-full h-auto max-h-[320px] object-cover"
                  loading="lazy"
                />
              </a>
            )}
            {canDelete && !msg.deleted && hover && (
              <button
                onClick={onDelete}
                title="Delete"
                type="button"
                className={cn(
                  "lx-press absolute -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600",
                  isMine ? "-left-2" : "-right-2",
                )}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className={cn("text-[10px] tabular-nums text-slate-400 px-1", isMine ? "text-end" : "text-start")}>
            {time}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
