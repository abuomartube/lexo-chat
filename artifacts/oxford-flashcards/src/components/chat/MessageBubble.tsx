import { Trash2, Image as ImageIcon } from "lucide-react";
import VoicePlayer from "./VoicePlayer";
import type { ChatMessage } from "@/lib/chat-api";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const PALETTE = [
  "from-purple-500 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-fuchsia-500 to-purple-600",
];

function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

const NAME_COLOR = [
  "text-purple-300",
  "text-cyan-300",
  "text-rose-300",
  "text-amber-300",
  "text-emerald-300",
  "text-fuchsia-300",
];

function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return NAME_COLOR[Math.abs(h) % NAME_COLOR.length]!;
}

export default function MessageBubble({
  msg,
  isMine,
  canDelete,
  onDelete,
  lang,
}: {
  msg: ChatMessage;
  isMine: boolean;
  canDelete: boolean;
  onDelete: () => void;
  lang: "en" | "ar";
}) {
  const time = new Date(msg.createdAt).toLocaleTimeString(
    lang === "ar" ? "ar-EG" : "en-US",
    { hour: "numeric", minute: "2-digit" },
  );

  if (msg.kind === "system") {
    return (
      <div className="my-3 flex justify-center">
        <div className="text-[11px] px-3 py-1.5 rounded-full bg-slate-800/70 text-slate-300 border border-slate-700">
          {msg.body}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2 my-2.5 ${isMine ? "flex-row-reverse" : "flex-row"} items-end`}
    >
      {!isMine && (
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorForName(msg.authorName)} text-white flex items-center justify-center text-[11px] font-bold shrink-0`}
        >
          {initials(msg.authorName)}
        </div>
      )}
      <div
        className={`max-w-[78%] flex flex-col ${isMine ? "items-end" : "items-start"}`}
      >
        {!isMine && (
          <span
            className={`text-[11px] font-bold mb-1 px-1 ${nameColor(msg.authorName)}`}
          >
            {msg.authorName}
            {msg.authorRole === "admin" && (
              <span className="ms-1.5 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px] uppercase tracking-wide">
                Admin
              </span>
            )}
          </span>
        )}
        <div
          className={`group relative px-3.5 py-2.5 rounded-2xl shadow-md ${
            isMine
              ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-md"
              : "bg-slate-800 text-slate-100 rounded-bl-md"
          }`}
        >
          {msg.deleted ? (
            <span className="italic opacity-70 text-sm">message deleted</span>
          ) : msg.kind === "text" ? (
            <p className="text-sm whitespace-pre-wrap break-words">
              {msg.body}
            </p>
          ) : msg.kind === "voice" && msg.attachmentUrl ? (
            <VoicePlayer
              src={msg.attachmentUrl}
              durationSec={msg.audioDurationSec}
              tone={isMine ? "self" : "other"}
            />
          ) : msg.kind === "image" && msg.attachmentUrl ? (
            <a
              href={msg.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="block max-w-[260px]"
            >
              <img
                src={msg.attachmentUrl}
                alt="attachment"
                className="rounded-xl max-h-[260px] object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs opacity-80">
              <ImageIcon size={14} /> attachment
            </span>
          )}
          <div
            className={`mt-1 text-[10px] ${
              isMine ? "text-white/70 text-end" : "text-slate-400"
            }`}
          >
            {time}
          </div>
          {canDelete && !msg.deleted && (
            <button
              onClick={onDelete}
              type="button"
              aria-label="Delete"
              className={`absolute -top-2 ${
                isMine ? "-start-2" : "-end-2"
              } opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow`}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
