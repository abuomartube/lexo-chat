import { Heart, Check, FileText, Download, Crown } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { NAME_COLOR, chatUI, type AvatarTone } from "./tokens";

type CommonProps = {
  children: ReactNode;
  reactions?: number;
};

export function IncomingBubble({
  name,
  tone,
  letter,
  time,
  children,
  reactions,
  host,
  bare = false,
}: CommonProps & {
  name: string;
  tone: AvatarTone;
  letter: string;
  time: string;
  host?: boolean;
  bare?: boolean;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="relative">
        <Avatar letter={letter} tone={tone} size={26} />
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-[1.5px] ring-slate-950" />
      </div>
      <div className="max-w-[78%] relative">
        <div className="flex items-center gap-1.5 mb-0.5 ml-1">
          <span className={`${chatUI.text.name} ${NAME_COLOR[tone]}`}>
            {name}
          </span>
          {host && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-amber-500/15 ring-1 ring-amber-400/40 text-amber-300 text-[8.5px] font-extrabold tracking-wide uppercase shadow-[0_0_10px_rgba(251,191,36,0.25)]">
              <Crown size={8} strokeWidth={2.5} className="-mt-px" />
              Host
            </span>
          )}
          <span className={chatUI.text.time}>{time}</span>
        </div>
        {bare ? (
          children
        ) : (
          <div
            className={`${chatUI.radius.bubble} rounded-bl-md ${chatUI.surface.bubbleIncoming} ${chatUI.spacing.bubblePadX} ${chatUI.spacing.bubblePadY} ${chatUI.text.body}`}
          >
            {children}
          </div>
        )}
        {reactions !== undefined && (
          <span className="absolute -bottom-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-900 ring-1 ring-rose-500/40 text-rose-400 text-[9px] font-bold shadow">
            <Heart size={9} fill="currentColor" /> {reactions}
          </span>
        )}
      </div>
    </div>
  );
}

export function ImageContent({
  url,
  caption,
}: {
  url: string;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 bg-slate-900 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.65)] w-[220px]">
      <div
        className="w-full h-[140px] bg-cover bg-center"
        style={{ backgroundImage: `url(${url})` }}
      />
      {caption && (
        <div className="px-2.5 py-1.5 text-[11px] text-slate-200 leading-snug">
          {caption}
        </div>
      )}
    </div>
  );
}

export function FileContent({
  fileName,
  fileSize,
  pages,
  caption,
}: {
  fileName: string;
  fileSize: string;
  pages?: number;
  caption?: string;
}) {
  return (
    <div className="w-[230px] space-y-1.5">
      <div
        className={`${chatUI.radius.bubble} rounded-bl-md ${chatUI.surface.bubbleIncoming} p-2.5 flex items-center gap-2.5`}
      >
        <div
          className="w-9 h-11 rounded-md flex items-center justify-center shrink-0 ring-1 ring-rose-400/30 shadow-[0_4px_12px_-2px_rgba(244,63,94,0.45)]"
          style={{
            background:
              "linear-gradient(135deg, #ef4444 0%, #e11d48 60%, #be123c 100%)",
          }}
        >
          <FileText size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-bold text-white truncate">
            {fileName}
          </div>
          <div className="text-[9.5px] text-slate-400 font-medium tracking-tight">
            {pages ? `${pages} pages · ` : ""}
            {fileSize} · PDF
          </div>
        </div>
        <button
          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/15 ring-1 ring-white/15 flex items-center justify-center text-slate-200 shrink-0"
          aria-label="Download"
        >
          <Download size={11} />
        </button>
      </div>
      {caption && (
        <div className="px-1 text-[12px] text-slate-200 leading-snug">
          {caption}
        </div>
      )}
    </div>
  );
}

export function OutgoingBubble({
  time,
  delivered = true,
  className = "",
  children,
}: CommonProps & {
  time: string;
  delivered?: boolean;
  className?: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%]">
        <div className="flex items-center gap-1.5 mb-0.5 mr-1 justify-end">
          <span className={chatUI.text.time}>{time}</span>
          {delivered && (
            <span className="text-blue-400 inline-flex">
              <Check size={10} strokeWidth={3} />
              <Check size={10} strokeWidth={3} className="-ml-1.5" />
            </span>
          )}
          <span className={`${chatUI.text.name} text-purple-300`}>You</span>
        </div>
        <div
          className={`${chatUI.radius.bubble} rounded-br-md px-3 py-2 ring-1 ring-white/10 ${className}`}
          style={{
            background: chatUI.gradient.purple,
            boxShadow: chatUI.shadow.purpleGlow,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function SystemBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center">
      <div
        className="rounded-full px-3.5 py-1.5 ring-1 ring-amber-400/30 shadow-md inline-flex items-center gap-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.10))",
        }}
      >
        <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wide">
          System
        </span>
        <span className="text-[11px] text-amber-100">{children}</span>
      </div>
    </div>
  );
}
