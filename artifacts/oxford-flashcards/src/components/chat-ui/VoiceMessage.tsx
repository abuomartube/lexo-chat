import { Play } from "lucide-react";

function Waveform({
  count = 22,
  played = 0.5,
  height = 20,
}: {
  count?: number;
  played?: number;
  height?: number;
}) {
  const heights = Array.from({ length: count }).map((_, i) => {
    const v = Math.sin(i * 0.7) * 0.5 + Math.sin(i * 1.9) * 0.3 + 0.6;
    return Math.max(0.2, Math.min(1, v));
  });
  const playedCount = Math.floor(count * played);
  return (
    <div className="flex items-center gap-[3px]" style={{ height }}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full ${
            i < playedCount ? "bg-white" : "bg-white/35"
          }`}
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function VoiceMessage({
  duration,
  played = 0.5,
  bars = 22,
}: {
  duration: string;
  played?: number;
  bars?: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button className="w-7 h-7 rounded-full bg-white/25 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/30">
        <Play size={12} className="text-white ml-0.5" />
      </button>
      <Waveform count={bars} played={played} />
      <span className="text-[10px] font-mono text-white font-semibold">
        {duration}
      </span>
    </div>
  );
}
