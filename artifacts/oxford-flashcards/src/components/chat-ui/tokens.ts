export const chatUI = {
  radius: {
    bubble: "rounded-[20px]",
    pill: "rounded-full",
    icon: "rounded-2xl",
    card: "rounded-[22px]",
    input: "rounded-full",
    hero: "rounded-[26px]",
  },
  spacing: {
    bubblePadX: "px-3.5",
    bubblePadY: "py-2",
    cardPad: "p-3",
    sectionGap: "space-y-3",
    rowGap: "gap-2",
  },
  text: {
    body: "text-[13px] leading-snug",
    name: "text-[11px] font-bold tracking-tight",
    time: "text-[9px] text-slate-500 font-medium",
    label: "text-[10px] font-semibold tracking-tight",
  },
  surface: {
    bubbleIncoming:
      "bg-gradient-to-br from-slate-800/85 to-slate-900/85 backdrop-blur-xl border border-white/[0.07] shadow-[0_4px_16px_-2px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]",
    card: "bg-gradient-to-br from-slate-800/70 to-slate-900/75 backdrop-blur-xl border border-white/[0.08] shadow-[0_14px_40px_-14px_rgba(0,0,0,0.75),0_2px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
    glass:
      "bg-slate-900/70 ring-1 ring-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_10px_-2px_rgba(0,0,0,0.45)]",
  },
  gradient: {
    purple:
      "linear-gradient(135deg, #c084fc 0%, #a855f7 28%, #7c3aed 65%, #4f46e5 100%)",
    purpleSimple:
      "linear-gradient(135deg, #b87cf5 0%, #8b5cf6 45%, #6d28d9 100%)",
    blueMic:
      "linear-gradient(135deg, #38bdf8 0%, #6366f1 35%, #a855f7 70%, #c026d3 100%)",
    hero: "linear-gradient(135deg, #4f46e5 0%, #6366f1 25%, #7c3aed 55%, #a855f7 85%, #c026d3 100%)",
  },
  shadow: {
    purpleGlow:
      "0 14px 40px -8px rgba(124,58,237,0.7), 0 0 60px -16px rgba(168,85,247,0.5), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18)",
    purpleBtn:
      "0 10px 24px -6px rgba(124,58,237,0.7), 0 2px 6px -1px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(0,0,0,0.18)",
    blueMic:
      "0 14px 36px -6px rgba(99,102,241,0.78), 0 0 50px -10px rgba(168,85,247,0.65), inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.22)",
    soft: "0 8px 24px -10px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  ambient: {
    pageBg:
      "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
    sceneBg: "linear-gradient(180deg, #0c1428 0%, #070c1d 50%, #02050d 100%)",
    radialTop:
      "radial-gradient(ellipse at top, rgba(124,58,237,0.10), transparent 60%)",
  },
  nameColor: {
    blue: "text-blue-300",
    pink: "text-pink-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    purple: "text-purple-300",
    rose: "text-rose-300",
  },
} as const;

export type AvatarTone =
  | "blue"
  | "pink"
  | "emerald"
  | "amber"
  | "purple"
  | "rose"
  | "indigo";

export const AVATAR_GRAD: Record<AvatarTone, string> = {
  blue: "from-sky-400 via-blue-500 to-indigo-600",
  pink: "from-pink-400 via-pink-500 to-rose-600",
  emerald: "from-emerald-400 via-emerald-500 to-teal-600",
  amber: "from-amber-300 via-amber-500 to-orange-600",
  purple: "from-fuchsia-400 via-purple-500 to-purple-700",
  rose: "from-rose-400 via-rose-500 to-red-600",
  indigo: "from-sky-400 via-indigo-500 to-indigo-700",
};

export const NAME_COLOR: Record<AvatarTone, string> = {
  blue: "text-blue-300",
  pink: "text-pink-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  purple: "text-purple-300",
  rose: "text-rose-300",
  indigo: "text-indigo-300",
};

export const ICON_STROKE = 2.25;
