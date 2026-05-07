import { useMemo } from "react";
import { wordFamilies, type WordFamily } from "@/data/word-families";
import * as Icons from "lucide-react";

interface WordFamiliesProps {
  selectedId: string | null;
  onSelect: (familyId: string) => void;
}

function FamilyIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (
    Icons as unknown as Record<
      string,
      React.ComponentType<{ size?: number; className?: string }>
    >
  )[name];
  if (!Cmp) return <Icons.Sparkles className={className} size={22} />;
  return <Cmp className={className} size={22} />;
}

export function WordFamilies({ selectedId, onSelect }: WordFamiliesProps) {
  const families = useMemo<WordFamily[]>(() => wordFamilies, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-1">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
            Word Families
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {families.length} themed groups · 10 related words each
          </p>
        </div>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums">
          {families.length} categories · {families.length * 10} words
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {families.map((fam) => {
          const active = selectedId === fam.id;
          return (
            <button
              key={fam.id}
              onClick={() => onSelect(fam.id)}
              className={`
                group relative overflow-hidden rounded-2xl p-4 text-left
                transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]
                ${
                  active
                    ? `bg-gradient-to-br ${fam.color} text-white shadow-lg ring-2 ring-white/50 dark:ring-violet-500/40`
                    : "bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-700 shadow-sm"
                }
              `}
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${
                      active
                        ? "bg-white/25 text-white"
                        : `bg-gradient-to-br ${fam.color} text-white shadow-sm`
                    }
                  `}
                >
                  <FamilyIcon name={fam.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`
                      text-sm font-bold leading-tight
                      ${active ? "text-white" : "text-gray-800 dark:text-gray-100"}
                    `}
                  >
                    {fam.title}
                  </p>
                  <p
                    dir="rtl"
                    lang="ar"
                    className={`
                      text-xs mt-0.5 leading-tight
                      ${active ? "text-white/85" : "text-gray-500 dark:text-gray-400"}
                    `}
                    style={{
                      fontFamily:
                        "'Cairo', 'Amiri', 'Noto Sans Arabic', sans-serif",
                    }}
                  >
                    {fam.titleAr}
                  </p>
                </div>
              </div>

              <p
                className={`
                  text-[11px] tracking-wide truncate
                  ${active ? "text-white/80" : "text-gray-400 dark:text-gray-500"}
                `}
              >
                {fam.words.slice(0, 4).join(" · ")}…
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
