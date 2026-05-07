import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";

interface VoiceBubbleProps {
  duration: string | number;
  time: string;
  side?: "left" | "right";
  src?: string;
  peaks?: number[];
  seed?: number;
  bars?: number;
  /** Show author + avatar on the left side */
  author?: string;
  /** Hover-to-delete */
  canDelete?: boolean;
  onDelete?: () => void;
  deleted?: boolean;
}

const parseDuration = (d: string | number): number => {
  if (typeof d === "number") return d;
  const [m, s] = d.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.max(0, Math.floor(s % 60));
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const generatePeaks = (n: number, seed: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.abs(
      Math.sin((i + 1) * 0.7 + seed) +
        Math.sin((i + 1) * 1.9 + seed * 0.3) * 0.6,
    );
    out.push(Math.min(1, 0.25 + v * 0.55));
  }
  return out;
};

export const VoiceBubble = ({
  duration,
  time,
  side = "right",
  src,
  peaks,
  seed = 1,
  bars = 28,
  author,
  canDelete,
  onDelete,
  deleted,
}: VoiceBubbleProps) => {
  const isMe = side === "right";
  const total = useMemo(() => parseDuration(duration), [duration]);
  const peakArr = useMemo(
    () => peaks ?? generatePeaks(bars, seed),
    [peaks, bars, seed],
  );

  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [hover, setHover] = useState(false);
  // Real media duration once known (overrides prop when available)
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const effectiveTotal =
    mediaDuration && Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : total;

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const tick = () => {
    const a = audioRef.current;
    if (!a) {
      stopRaf();
      return;
    }
    setPos(a.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  };

  const toggle = () => {
    if (!audioRef.current || deleted) return;
    if (playing) {
      audioRef.current.pause();
      stopRaf();
      setPlaying(false);
    } else {
      if (pos >= effectiveTotal) audioRef.current.currentTime = 0;
      const p = audioRef.current.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
      if (p && typeof p.then === "function") {
        p.catch(() => {
          stopRaf();
          setPlaying(false);
        });
      }
    }
  };

  useEffect(() => () => stopRaf(), []);

  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    audioRef.current = a;
    const onEnd = () => {
      setPlaying(false);
      setPos(effectiveTotal);
      stopRaf();
    };
    const onMeta = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setMediaDuration(a.duration);
      }
    };
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    return () => {
      a.pause();
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      audioRef.current = null;
      stopRaf();
      setPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || deleted || effectiveTotal <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    const t = ratio * effectiveTotal;
    setPos(t);
    audioRef.current.currentTime = t;
  };

  const progress = effectiveTotal > 0 ? pos / effectiveTotal : 0;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "flex w-full gap-2 my-2",
        isMe ? "flex-row-reverse lx-bubble-in-r" : "flex-row lx-bubble-in-l",
      )}
    >
      {!isMe && author && (
        <div className="self-end mb-1">
          <Avatar name={author} size="sm" />
        </div>
      )}
      <div
        className={cn(
          "flex min-w-0 max-w-[82%] sm:max-w-[78%] md:max-w-[60%] lg:max-w-[54%] flex-col gap-1",
          isMe && "items-end",
        )}
      >
        {!isMe && author && (
          <span className="text-[11px] font-semibold tracking-wide text-slate-300 px-1">
            {author}
          </span>
        )}
        <div className="relative">
          <div
            className={cn(
              "flex items-center gap-3 rounded-[22px] px-3.5 py-2.5",
              isMe
                ? "rounded-br-md lx-bubble-out"
                : "rounded-tl-md lx-bubble-in",
            )}
          >
            <button
              onClick={toggle}
              disabled={!src || deleted}
              type="button"
              aria-label={playing ? "Pause voice message" : "Play voice message"}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full backdrop-blur transition-all active:scale-95 disabled:opacity-50",
                isMe
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-purple-500/20 text-purple-200 hover:bg-purple-500/30",
                playing && "lx-soft-pulse",
              )}
            >
              {playing ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </button>

            <div
              onClick={seek}
              className="relative flex h-8 flex-1 cursor-pointer items-center gap-0.5 min-w-[120px]"
            >
              {peakArr.map((p, i) => {
                const barProgress = (i + 1) / peakArr.length;
                const reached = barProgress <= progress;
                return (
                  <span
                    key={i}
                    className={cn(
                      "w-0.5 rounded-full transition-[opacity] duration-100",
                      reached ? "opacity-100" : "opacity-40",
                    )}
                    style={{
                      height: `${4 + p * 22}px`,
                      background: "currentColor",
                    }}
                  />
                );
              })}
              <span
                className="pointer-events-none absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-current shadow-[0_0_6px_currentColor] transition-[left] duration-100"
                style={{
                  left: `${progress * 100}%`,
                  opacity: playing || pos > 0 ? 1 : 0,
                }}
              />
            </div>

            <span className="shrink-0 tabular-nums text-xs opacity-90">
              {playing || pos > 0 ? fmt(pos) : fmt(effectiveTotal)}
            </span>
          </div>

          {canDelete && !deleted && hover && (
            <button
              onClick={onDelete}
              title="Delete"
              type="button"
              className={cn(
                "lx-press absolute -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600",
                isMe ? "-left-2" : "-right-2",
              )}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <div
          className={cn(
            "text-[10px] tabular-nums text-slate-400 px-1",
            isMe ? "text-end" : "text-start",
          )}
        >
          {time}
        </div>
      </div>
    </div>
  );
};

export default VoiceBubble;
