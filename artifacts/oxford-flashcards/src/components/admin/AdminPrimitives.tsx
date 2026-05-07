import { Loader2 } from "lucide-react";

export function StatCard({
  label,
  value,
  subValue,
  accent,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  accent: "indigo" | "violet" | "blue" | "purple" | "emerald" | "amber" | "rose";
  icon?: React.ReactNode;
}) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-fuchsia-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 relative overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accents[accent]}`}
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {value}
          </div>
          {subValue && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {subValue}
            </div>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function Th({
  children,
  align,
}: {
  children?: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  align,
  ltr,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "right";
  ltr?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 ${align === "right" ? "text-right" : ""} ${className}`}
      {...(ltr ? { dir: "ltr" } : {})}
    >
      {children}
    </td>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

export function LoadingPanel({ inline = false }: { inline?: boolean }) {
  return (
    <div
      className={`${inline ? "py-12" : "min-h-[40vh]"} flex items-center justify-center`}
    >
      <Loader2 size={20} className="animate-spin text-slate-400" />
    </div>
  );
}

export function ErrorPanel({ msg }: { msg: string }) {
  return (
    <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-2xl p-5 text-sm">
      {msg}
    </div>
  );
}

export function RadioPill({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
        checked
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white dark:bg-gray-950 border-slate-300 dark:border-gray-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400"
      }`}
    >
      {label}
    </button>
  );
}

export const INPUT_CLS =
  "w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600";

export const SELECT_CLS =
  "rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600";

export const BTN_PRIMARY =
  "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow hover:shadow-lg transition disabled:opacity-50";

export const BTN_SECONDARY =
  "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-gray-800 transition disabled:opacity-50";

export const BTN_DANGER =
  "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold shadow hover:bg-rose-700 transition disabled:opacity-50";

export const CARD_CLS =
  "rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900";
