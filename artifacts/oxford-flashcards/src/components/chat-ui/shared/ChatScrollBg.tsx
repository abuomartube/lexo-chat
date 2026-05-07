import type { ReactNode, RefObject } from "react";

const BG_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 60%)",
};

export function ChatScrollBg({
  children,
  className = "",
  scrollRef,
}: {
  children: ReactNode;
  className?: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={scrollRef}
      className={`relative z-10 flex-1 overflow-y-auto ${className}`}
      style={BG_STYLE}
    >
      {children}
    </div>
  );
}
