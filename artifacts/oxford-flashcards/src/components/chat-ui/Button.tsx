import type { ReactNode } from "react";
import { chatUI } from "./tokens";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-4 py-2 text-[12px]",
  lg: "px-4 py-3 text-[13px]",
};

export function PrimaryButton({
  children,
  icon,
  size = "md",
  className = "",
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  size?: Size;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl font-bold text-white ring-1 ring-white/20 hover:brightness-110 active:brightness-95 active:scale-[0.97] transition-[transform,filter,background] duration-150 overflow-hidden ${SIZE[size]} ${className}`}
      style={{
        background: chatUI.gradient.purpleSimple,
        boxShadow: chatUI.shadow.purpleBtn,
      }}
    >
      {/* glossy top sheen */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <span className="relative inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
}

export function SecondaryButton({
  children,
  icon,
  size = "md",
  className = "",
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  size?: Size;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl font-bold text-slate-100 ring-1 ring-white/15 hover:bg-white/[0.08] active:bg-white/[0.04] active:scale-[0.97] transition-[transform,background] duration-150 overflow-hidden ${SIZE[size]} ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 12px -4px rgba(0,0,0,0.45)",
      }}
    >
      <span className="relative inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
}
