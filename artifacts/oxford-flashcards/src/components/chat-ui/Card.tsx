import type { ReactNode } from "react";
import { chatUI } from "./tokens";

export function Card({
  children,
  className = "",
  title,
  icon,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`${chatUI.radius.card} ${chatUI.surface.card} p-3 ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-purple-300">{icon}</span>}
          <h3 className="text-[12px] font-bold text-white">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
