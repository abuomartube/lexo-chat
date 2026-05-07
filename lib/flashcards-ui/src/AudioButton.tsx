import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "./lib/utils";

interface AudioButtonProps {
  url: string;
  className?: string;
  size?: "default" | "sm" | "icon";
  variant?: "default" | "ghost" | "secondary";
}

export function AudioButton({
  url,
  className,
  size = "icon",
  variant = "secondary",
}: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingPlayRef = useRef(false);

  // Fully download the MP3 into a Blob URL the moment we know the URL,
  // so play() is instant (no network round-trip on click).
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;

    const onEnded = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);

    void (async () => {
      try {
        const resp = await fetch(url, { cache: "force-cache" });
        if (!resp.ok) throw new Error(`audio fetch ${resp.status}`);
        const blob = await resp.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        a.src = objectUrl;
        a.load();
        if (pendingPlayRef.current) {
          pendingPlayRef.current = false;
          a.currentTime = 0;
          setIsPlaying(true);
          const p = a.play();
          if (p && typeof p.then === "function") {
            p.catch(() => setIsPlaying(false));
          }
        }
      } catch (err) {
        console.error("Audio preload failed", err);
      }
    })();

    return () => {
      cancelled = true;
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPause);
      a.pause();
      a.src = "";
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (audioRef.current === a) audioRef.current = null;
    };
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const a = audioRef.current;
    if (!a) {
      pendingPlayRef.current = true;
      return;
    }
    if (isPlaying) {
      a.pause();
      a.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    // If the blob hasn't been assigned yet, queue play for when it's ready.
    if (!a.src) {
      pendingPlayRef.current = true;
      setIsPlaying(true);
      return;
    }
    a.currentTime = 0;
    setIsPlaying(true);
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.catch((err) => {
        console.error("Audio playback failed", err);
        setIsPlaying(false);
      });
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={!url}
      className={cn(
        "rounded-full transition-all relative overflow-hidden",
        isPlaying && "text-primary ring-2 ring-primary/50",
        className,
      )}
    >
      {isPlaying ? (
        <Pause className="w-4 h-4 fill-current" />
      ) : (
        <Play className="w-4 h-4 fill-current" />
      )}
      {isPlaying && (
        <span className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
      )}
    </Button>
  );
}
