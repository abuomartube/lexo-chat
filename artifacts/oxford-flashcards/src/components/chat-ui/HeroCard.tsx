import type { ReactNode } from "react";
import { chatUI } from "./tokens";

export function HeroCard({
  icon,
  title,
  subtitle,
  badges,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden ${chatUI.radius.hero} p-4 ring-1 ring-white/20`}
      style={{
        background: chatUI.gradient.hero,
        boxShadow: [
          "0 24px 60px -16px rgba(124,58,237,0.78)",
          "0 0 90px -20px rgba(99,102,241,0.55)",
          "0 4px 12px -2px rgba(0,0,0,0.4)",
          "inset 0 1px 0 rgba(255,255,255,0.32)",
          "inset 0 -1px 0 rgba(0,0,0,0.18)",
        ].join(", "),
      }}
    >
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-cyan-300/30 blur-3xl" />

      {/* shimmer top reflection */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)",
        }}
      />

      {/* dotted noise overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, #fff 1px, transparent 1.5px), radial-gradient(circle at 70% 30%, #fff 1px, transparent 1.5px), radial-gradient(circle at 45% 55%, #fff 0.5px, transparent 1px)",
          backgroundSize: "30px 30px, 22px 22px, 14px 14px",
        }}
      />

      <div className="relative flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.12) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.15), 0 4px 12px -2px rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.35)",
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-extrabold text-white truncate leading-tight tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-white/85 mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {badges && (
        <div className="relative flex items-center gap-2 mt-3 flex-wrap">
          {badges}
        </div>
      )}
    </div>
  );
}
