import { AVATAR_GRAD, type AvatarTone } from "./tokens";

export function Avatar({
  letter,
  tone,
  size = 28,
  ring = false,
}: {
  letter: string;
  tone: AvatarTone;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${AVATAR_GRAD[tone]} text-white font-bold flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.18)] ${
        ring ? "ring-2 ring-slate-950" : ""
      }`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
    </div>
  );
}
