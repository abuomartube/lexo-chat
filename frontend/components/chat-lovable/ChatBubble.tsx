import { useState } from "react";
import {
  GraduationCap,
  Pin,
  Megaphone,
  CheckCircle2,
  Sparkles,
  Pencil,
  MoreHorizontal,
  Star,
  Trophy,
  Mic2,
  Trash2,
  Languages,
  SpellCheck2,
  Lightbulb,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

export interface Correction {
  original: string;
  corrected: string;
  note?: string;
  by?: string;
}

interface ChatBubbleProps {
  author: string;
  text: string;
  time: string;
  side?: "left" | "right";
  reactions?: { emoji: string; count: number }[];
  avatarSrc?: string;
  authorRole?: "student" | "teacher";
  highlight?: boolean;
  pinned?: boolean;
  broadcast?: boolean;
  bestMessage?: boolean;
  correction?: Correction;
  isTeacherViewer?: boolean;
  isSpeaker?: boolean;
  onVoiceReply?: () => void;
  onTogglePin?: () => void;
  onToggleHighlight?: () => void;
  onToggleBest?: () => void;
  onCorrect?: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
  deleted?: boolean;
  /** Localized labels for the educational action row */
  learnLabels?: {
    translate: string;
    correct: string;
    explain: string;
    pronounce: string;
  };
  /** Click handler for the educational action row. When omitted, the row is hidden. */
  onLearnAction?: (kind: "translate" | "correct" | "explain" | "pronounce") => void;
}

interface LearnActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isMe: boolean;
}

const LearnActionButton = ({ icon, label, onClick, isMe }: LearnActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "lx-press inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide transition-colors",
      "bg-white/[0.05] backdrop-blur-xl ring-1 ring-white/10 text-slate-300",
      "hover:bg-purple-500/15 hover:text-purple-100 hover:ring-purple-400/30",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60",
      isMe ? "shadow-[0_4px_12px_-6px_rgba(124,58,237,0.35)]" : "shadow-[0_4px_12px_-6px_rgba(0,0,0,0.5)]",
    )}
  >
    <span className="text-purple-300">{icon}</span>
    <span>{label}</span>
  </button>
);

const RoleBadge = ({ role }: { role: "student" | "teacher" }) =>
  role === "teacher" ? (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-950 shadow-[0_0_10px_rgba(251,146,60,0.45)]">
      <GraduationCap className="h-2.5 w-2.5" /> Admin
    </span>
  ) : null;

export const ChatBubble = ({
  author,
  text,
  time,
  side = "left",
  reactions,
  avatarSrc,
  authorRole = "student",
  highlight,
  pinned,
  broadcast,
  bestMessage,
  correction,
  isTeacherViewer,
  isSpeaker,
  onVoiceReply,
  onTogglePin,
  onToggleHighlight,
  onToggleBest,
  onCorrect,
  canDelete,
  onDelete,
  deleted,
  learnLabels,
  onLearnAction,
}: ChatBubbleProps) => {
  const isMe = side === "right";
  const [hover, setHover] = useState(false);

  if (broadcast) {
    return (
      <div className="mx-auto my-2 w-full max-w-[92%] lx-bubble-in-l">
        <div className="relative overflow-hidden rounded-[20px] border border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent px-4 py-3 shadow-[0_0_24px_rgba(251,146,60,0.25)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 shadow-[0_0_18px_rgba(251,146,60,0.45)]">
              <Megaphone className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Broadcast
                </span>
                <RoleBadge role="teacher" />
                <span className="ms-auto text-[10px] text-slate-400">
                  {time}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-amber-50">{text}</p>
              <p className="mt-0.5 text-[10px] text-amber-200/70">— {author}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "group flex w-full gap-2 my-2",
        isMe ? "flex-row-reverse lx-bubble-in-r" : "flex-row lx-bubble-in-l",
      )}
    >
      {!isMe && (
        <div className="self-end mb-1">
          <Avatar name={author} size="sm" src={avatarSrc} />
        </div>
      )}
      <div
        className={cn(
          "flex min-w-0 max-w-[82%] sm:max-w-[78%] md:max-w-[68%] lg:max-w-[62%] flex-col gap-1",
          isMe && "items-end",
        )}
      >
        {!isMe && (
          <div className="flex items-center gap-1.5 px-1">
            <span
              className={cn(
                "text-[11px] font-semibold tracking-wide",
                authorRole === "teacher" ? "text-amber-300" : "text-slate-300",
              )}
            >
              {author}
            </span>
            <RoleBadge role={authorRole} />
            {isSpeaker && (
              <span
                title="Active speaker"
                className="inline-flex items-center gap-0.5 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[8px] font-semibold text-purple-300 ring-1 ring-purple-400/30"
              >
                <Mic2 className="h-2.5 w-2.5" /> Speaker
              </span>
            )}
            {pinned && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[8px] font-semibold text-purple-300">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            {bestMessage && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-950 shadow-[0_0_10px_rgba(251,146,60,0.45)]">
                <Trophy className="h-2.5 w-2.5" /> Best
              </span>
            )}
          </div>
        )}

        <div className="relative">
          <div
            dir="auto"
            className={cn(
              "lx-msg-text whitespace-pre-line rounded-[22px] px-4 py-2.5 sm:py-3 transition-all duration-200 hover:-translate-y-0.5",
              isMe ? "rounded-br-md lx-bubble-out" : "rounded-tl-md lx-bubble-in",
              authorRole === "teacher" &&
                !isMe &&
                "border border-amber-400/40 bg-amber-400/10 shadow-[0_10px_28px_-12px_rgba(251,146,60,0.32)]",
              highlight &&
                "ring-2 ring-purple-400/60 shadow-[0_0_28px_rgba(124,58,237,0.45)]",
              pinned && "ring-1 ring-purple-400/40",
              bestMessage &&
                "ring-2 ring-amber-400/70 shadow-[0_0_24px_rgba(251,146,60,0.45)]",
            )}
          >
            {deleted ? (
              <span className="italic opacity-70">{text || "message deleted"}</span>
            ) : (
              text
            )}
          </div>

          {/* Hover quick-actions */}
          {!deleted && (isTeacherViewer || canDelete) && hover && (
            <div
              className={cn(
                "absolute -top-3 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/90 px-1 py-0.5 backdrop-blur-xl lx-fade-in shadow-[0_18px_44px_-14px_rgba(0,0,0,0.7)]",
                isMe ? "left-2" : "right-2",
              )}
            >
              {isTeacherViewer && !isMe && (
                <>
                  <button
                    onClick={onCorrect}
                    title="Correct sentence"
                    className="lx-press flex h-6 w-6 items-center justify-center rounded-full text-emerald-300 hover:bg-emerald-400/15"
                    type="button"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={onToggleHighlight}
                    title={highlight ? "Remove highlight" : "Highlight"}
                    className={cn(
                      "lx-press flex h-6 w-6 items-center justify-center rounded-full hover:bg-purple-500/15",
                      highlight ? "text-purple-300" : "text-slate-400",
                    )}
                    type="button"
                  >
                    <Sparkles className="h-3 w-3" />
                  </button>
                  <button
                    onClick={onTogglePin}
                    title={pinned ? "Unpin" : "Pin"}
                    className={cn(
                      "lx-press flex h-6 w-6 items-center justify-center rounded-full hover:bg-purple-500/15",
                      pinned ? "text-purple-300" : "text-slate-400",
                    )}
                    type="button"
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button
                    onClick={onToggleBest}
                    title={bestMessage ? "Remove best" : "Mark as best"}
                    className={cn(
                      "lx-press flex h-6 w-6 items-center justify-center rounded-full hover:bg-amber-400/15",
                      bestMessage ? "text-amber-300" : "text-slate-400",
                    )}
                    type="button"
                  >
                    <Star
                      className={cn("h-3 w-3", bestMessage && "fill-amber-300")}
                    />
                  </button>
                  <span className="px-0.5 text-slate-500">
                    <MoreHorizontal className="h-3 w-3" />
                  </span>
                </>
              )}
              {canDelete && (
                <button
                  onClick={onDelete}
                  title="Delete"
                  className="lx-press flex h-6 w-6 items-center justify-center rounded-full text-rose-300 hover:bg-rose-500/15"
                  type="button"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {!isMe && onVoiceReply && (
          <button
            onClick={onVoiceReply}
            type="button"
            className="lx-press mt-1 inline-flex items-center gap-1 self-start rounded-full border border-purple-400/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 hover:bg-purple-500/20"
          >
            <Mic2 className="h-2.5 w-2.5" /> Voice reply
          </button>
        )}

        {correction && (
          <div className="lx-fade-in mt-1 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs shadow-[0_0_18px_rgba(16,185,129,0.18)]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Correction
              {correction.by && (
                <span className="ms-1 font-normal normal-case text-emerald-200/70">
                  by {correction.by}
                </span>
              )}
            </div>
            <p className="mt-1 text-emerald-50/90">
              <span className="text-emerald-200/60 line-through">
                {correction.original}
              </span>
              <span className="mx-1.5 text-emerald-300">→</span>
              <span className="font-semibold text-emerald-50">
                {correction.corrected}
              </span>
            </p>
            {correction.note && (
              <p className="mt-1 text-[10px] text-emerald-200/70">
                💡 {correction.note}
              </p>
            )}
          </div>
        )}

        {!deleted && onLearnAction && learnLabels && (
          <div
            className={cn(
              "mt-1 flex flex-wrap items-center gap-1.5",
              isMe ? "justify-end" : "justify-start",
            )}
          >
            <LearnActionButton
              isMe={isMe}
              icon={<Languages className="h-3 w-3" />}
              label={learnLabels.translate}
              onClick={() => onLearnAction("translate")}
            />
            <LearnActionButton
              isMe={isMe}
              icon={<SpellCheck2 className="h-3 w-3" />}
              label={learnLabels.correct}
              onClick={() => onLearnAction("correct")}
            />
            <LearnActionButton
              isMe={isMe}
              icon={<Lightbulb className="h-3 w-3" />}
              label={learnLabels.explain}
              onClick={() => onLearnAction("explain")}
            />
            <LearnActionButton
              isMe={isMe}
              icon={<Volume2 className="h-3 w-3" />}
              label={learnLabels.pronounce}
              onClick={() => onLearnAction("pronounce")}
            />
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2 px-1 text-[10px] tabular-nums text-slate-400",
            isMe && "flex-row-reverse",
          )}
        >
          <span>{time}</span>
          {reactions?.map((r, i) => (
            <span
              key={i}
              className="rounded-full bg-white/[0.06] px-1.5 py-0.5"
            >
              {r.emoji} {r.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
