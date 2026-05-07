import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, Loader2 } from "lucide-react";
import {
  getTtsUrl,
  setActiveTtsAudio,
  getActiveTtsAudio,
  getCachedBlobUrl,
  prefetchTts,
} from "@/lib/tts";

interface AudioButtonProps {
  text: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function AudioButton({
  text,
  size = "md",
  className = "",
  label,
}: AudioButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (text) prefetchTts(text);
  }, [text]);

  const stop = useCallback(() => {
    tokenRef.current++;
    const current = audioRef.current;
    if (current) {
      current.onplaying = null;
      current.onended = null;
      current.onerror = null;
      current.pause();
      current.src = "";
      audioRef.current = null;
    }
    if (getActiveTtsAudio() === current) setActiveTtsAudio(null);
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [text, stop]);

  const play = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;

    if (state !== "idle") {
      stop();
      return;
    }

    const myToken = ++tokenRef.current;
    const cached = getCachedBlobUrl(text);
    setState(cached ? "playing" : "loading");

    try {
      let src = cached;
      if (!src) {
        const result = await prefetchTts(text);
        if (tokenRef.current !== myToken) return;
        src = result ?? getTtsUrl(text);
      }

      const audio = new Audio(src);
      audio.preload = "auto";

      if (tokenRef.current !== myToken) return;
      audioRef.current = audio;
      setActiveTtsAudio(audio, () => {
        if (tokenRef.current === myToken) {
          setState("idle");
          audioRef.current = null;
        }
      });

      audio.onplaying = () => {
        if (tokenRef.current === myToken) setState("playing");
      };
      audio.onended = () => {
        if (tokenRef.current !== myToken) return;
        setState("idle");
        if (getActiveTtsAudio() === audio) setActiveTtsAudio(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        if (tokenRef.current !== myToken) return;
        setState("idle");
        if (getActiveTtsAudio() === audio) setActiveTtsAudio(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch {
      if (tokenRef.current === myToken) {
        setState("idle");
        if (audioRef.current && getActiveTtsAudio() === audioRef.current) {
          setActiveTtsAudio(null);
        }
        audioRef.current = null;
      }
    }
  };

  const sizeMap = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  const iconSize = { sm: 14, md: 18, lg: 22 };
  const isActive = state !== "idle";

  return (
    <button
      onClick={play}
      disabled={!text}
      aria-label={label ?? "Play pronunciation"}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all duration-200 select-none
        ${sizeMap[size]}
        ${
          text
            ? `cursor-pointer
             ${
               isActive
                 ? "bg-violet-600 text-white scale-110 shadow-md"
                 : "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/60 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md"
             }`
            : "cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50"
        }
        ${className}
      `}
    >
      {state === "loading" ? (
        <Loader2 size={iconSize[size]} className="animate-spin" />
      ) : (
        <Volume2 size={iconSize[size]} />
      )}
    </button>
  );
}
