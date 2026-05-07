import { Smile, Paperclip, Send } from "lucide-react";
import { chatUI } from "./tokens";

export function InputBar({
  placeholder = "Type a message...",
  value,
  onChange,
  onSend,
  onAttach,
  onEmoji,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  onSend?: () => void;
  onAttach?: () => void;
  onEmoji?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${chatUI.radius.input} ${chatUI.surface.glass} px-3 py-1.5`}
    >
      <button onClick={onEmoji} className="text-slate-400 hover:text-slate-200">
        <Smile size={18} />
      </button>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={!onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[13px] text-slate-200 placeholder:text-slate-500 outline-none"
      />
      <button
        onClick={onAttach}
        className="text-slate-400 hover:text-slate-200"
      >
        <Paperclip size={16} />
      </button>
      <button
        onClick={onSend}
        className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-white/15 hover:brightness-110 active:scale-90 transition-[transform,filter] duration-150"
        style={{
          background: chatUI.gradient.purpleSimple,
          boxShadow: chatUI.shadow.purpleBtn,
        }}
      >
        <Send size={13} className="text-white -ml-0.5" />
      </button>
    </div>
  );
}
