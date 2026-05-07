import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

const BAR_COUNT = 28;

function seededWaveformBars(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 9301 + 49297) & 0x7fffffff;
    bars.push(0.25 + ((h % 1000) / 1000) * 0.75);
  }
  return bars;
}

export default function VoicePlayer({
  src,
  durationSec,
  tone = "self",
}: {
  src: string;
  durationSec: number | null;
  tone?: "self" | "other";
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [actualDuration, setActualDuration] = useState<number>(
    durationSec ?? 0,
  );
  const bars = useMemo(() => seededWaveformBars(src), [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setActualDuration(a.duration);
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      void a.play();
      setPlaying(true);
    }
  }

  function fmt(s: number): string {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const pct =
    actualDuration > 0 ? Math.min(100, (progress / actualDuration) * 100) : 0;
  const playedBars = Math.floor((pct / 100) * BAR_COUNT);

  const isSelf = tone === "self";
  const btnBg = isSelf
    ? "bg-white/25 hover:bg-white/35 text-white"
    : "bg-purple-600 hover:bg-purple-500 text-white";

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <button
        onClick={toggle}
        type="button"
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${btnBg}`}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ms-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-[2px] h-7">
          {bars.map((h, i) => {
            const played = i < playedBars;
            const color = isSelf
              ? played
                ? "bg-white"
                : "bg-white/35"
              : played
                ? "bg-purple-400"
                : "bg-slate-600";
            return (
              <span
                key={i}
                className={`flex-1 rounded-full ${color} transition-colors`}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <div
          className={`text-[11px] font-mono ${
            isSelf ? "text-white/80" : "text-slate-400"
          }`}
        >
          {fmt(playing ? progress : actualDuration)}
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
