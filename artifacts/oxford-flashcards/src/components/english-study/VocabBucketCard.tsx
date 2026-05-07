import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// Phase E4 — single bucket card on the study plan view (Weak / Review /
// New / Mastery / Challenge). Intentionally low-decoration so a row of
// 4-5 of these reads as a clean grid, not a carnival.

type Lang = "en" | "ar";

interface VocabBucketCardProps {
  icon: ReactNode;
  toneClass: string; // gradient utility classes (e.g. "from-rose-500 to-pink-600")
  label: string;
  hint: string;
  count: number;
  total: number;
  lang: Lang;
  onClick?: () => void;
  testId?: string;
}

export function VocabBucketCard({
  icon,
  toneClass,
  label,
  hint,
  count,
  total,
  lang,
  onClick,
  testId,
}: VocabBucketCardProps) {
  const isAr = lang === "ar";
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty || !onClick}
      data-testid={testId}
      className={`group relative w-full overflow-hidden rounded-2xl bg-card text-left ring-1 ring-border/60 hover:ring-border shadow-sm hover:shadow-md transition-all duration-200 ${
        empty ? "opacity-60 cursor-default" : "hover:-translate-y-0.5"
      } p-4 sm:p-5`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-sm bg-gradient-to-br ${toneClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground truncate">
              {label}
            </p>
            <p className="text-[11px] tabular-nums font-semibold text-muted-foreground">
              <span className="text-foreground">{count}</span>
              {total > 0 && total !== count ? ` / ${total}` : ""}
            </p>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug line-clamp-2">
            {hint}
          </p>
        </div>
        {onClick && !empty && (
          <ChevronRight
            size={16}
            className={`mt-1.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isAr ? "rotate-180 group-hover:-translate-x-0.5" : ""}`}
          />
        )}
      </div>
    </button>
  );
}
