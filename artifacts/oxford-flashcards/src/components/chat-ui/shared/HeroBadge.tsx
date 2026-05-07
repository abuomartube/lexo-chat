import type { ReactNode } from "react";

export function HeroBadge({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-[10.5px] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
      {icon}
      {children}
    </span>
  );
}
