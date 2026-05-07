import { chatUI } from "./tokens";

export function FilterChip({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  if (active) {
    return (
      <button
        onClick={onClick}
        className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white ring-1 ring-white/15"
        style={{
          background: chatUI.gradient.purpleSimple,
          boxShadow: chatUI.shadow.purpleBtn,
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-slate-300 bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
    >
      {label}
    </button>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  dir,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange?: (v: T) => void;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div dir={dir} className="flex items-center gap-2">
      {items.map((it) => (
        <FilterChip
          key={it.value}
          label={it.label}
          active={it.value === value}
          onClick={() => onChange?.(it.value)}
        />
      ))}
    </div>
  );
}
