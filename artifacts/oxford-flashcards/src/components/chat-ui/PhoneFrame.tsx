import type { ReactNode } from "react";
import { chatUI } from "./tokens";

export function PhoneFrame({
  children,
  dir = "rtl",
}: {
  children: ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div
      className="relative w-[390px] h-[844px] rounded-[48px] p-[7px]"
      style={{
        background:
          "linear-gradient(160deg, #2a3247 0%, #161e36 30%, #0a1024 60%, #020617 100%)",
        boxShadow: [
          "0 80px 140px -30px rgba(0,0,0,0.9)",
          "0 30px 60px -10px rgba(0,0,0,0.7)",
          "0 0 0 1px rgba(255,255,255,0.08)",
          "0 0 0 2px rgba(0,0,0,0.5)",
          "0 0 100px -20px rgba(124,58,237,0.55)",
          "0 0 200px -40px rgba(99,102,241,0.4)",
          "inset 0 1px 0 rgba(255,255,255,0.12)",
        ].join(", "),
      }}
    >
      <div
        dir={dir}
        className="relative w-full h-full rounded-[42px] overflow-hidden flex flex-col text-white animate-fade-in"
        style={{
          background: chatUI.ambient.sceneBg,
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 2px 6px rgba(255,255,255,0.04)",
        }}
      >
        {/* notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-7 rounded-full bg-black z-30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
          <span className="absolute top-2 right-4 w-1.5 h-1.5 rounded-full bg-slate-700/80 ring-1 ring-slate-600/60" />
          <span className="absolute top-2.5 left-5 w-0.5 h-0.5 rounded-full bg-slate-700/60" />
        </div>

        {/* status bar */}
        <div
          dir="ltr"
          className="relative z-10 flex items-center justify-between px-7 pt-3 pb-1 text-[12px] font-semibold text-white/90"
        >
          <span className="tracking-tight">9:41</span>
          <span className="flex items-center gap-1.5">
            <span className="flex items-end gap-[2px]">
              <span className="w-[3px] h-[5px] bg-white rounded-sm" />
              <span className="w-[3px] h-[7px] bg-white rounded-sm" />
              <span className="w-[3px] h-[9px] bg-white rounded-sm" />
              <span className="w-[3px] h-[11px] bg-white rounded-sm" />
            </span>
            <span className="text-[10px] tracking-tight">5G</span>
            <span className="inline-flex items-center">
              <span className="w-5 h-2.5 rounded-[3px] border border-white/85 relative">
                <span className="absolute inset-0.5 rounded-sm bg-white" />
              </span>
              <span className="w-0.5 h-1 bg-white/85 rounded-r-sm" />
            </span>
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}

export function PageBackdrop({ children }: { children: ReactNode }) {
  return (
    <div
      dir="ltr"
      className="min-h-screen w-full flex items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: chatUI.ambient.pageBg,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[15%] left-[25%] w-[520px] h-[520px] rounded-full bg-purple-700/30 blur-[160px]" />
        <div className="absolute bottom-[15%] right-[25%] w-[520px] h-[520px] rounded-full bg-blue-700/25 blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-fuchsia-900/12 blur-[200px]" />
      </div>
      {children}
    </div>
  );
}
