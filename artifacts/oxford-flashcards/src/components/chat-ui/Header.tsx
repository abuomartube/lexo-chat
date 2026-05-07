import { ChevronLeft, MoreVertical } from "lucide-react";
import type { ReactNode } from "react";

export function Header({
  title,
  subtitle,
  right,
  controls,
  onBack,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  controls?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <header className="relative z-10 px-4 pt-2 pb-2.5 border-b border-white/5">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
        >
          <ChevronLeft size={18} className="text-slate-300" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-[15px] font-bold text-white leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <div className="flex items-center justify-center gap-2 mt-1">
              {subtitle}
            </div>
          )}
        </div>
        {right ?? (
          <button className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
            <MoreVertical size={16} className="text-slate-300" />
          </button>
        )}
      </div>
      {controls && (
        <div className="flex items-center justify-between gap-2 mt-2">
          {controls}
        </div>
      )}
    </header>
  );
}
