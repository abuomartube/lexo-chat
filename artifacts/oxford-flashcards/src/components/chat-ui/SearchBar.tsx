import { Search } from "lucide-react";
import { chatUI } from "./tokens";

export function SearchBar({
  placeholder = "Search...",
  value,
  onChange,
  dir,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${chatUI.radius.input} ${chatUI.surface.glass} px-3.5 py-2`}
    >
      <Search size={14} className="text-slate-500 shrink-0" />
      <input
        dir={dir}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={!onChange}
        placeholder={placeholder}
        className={`flex-1 bg-transparent text-[12px] text-slate-200 placeholder:text-slate-500 outline-none ${
          dir === "rtl" ? "text-right" : "text-left"
        }`}
      />
    </div>
  );
}
