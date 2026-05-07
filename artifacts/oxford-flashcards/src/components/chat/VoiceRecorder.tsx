import { useEffect, useRef, useState } from "react";
import { Mic, Square, Send, Trash2, Loader2 } from "lucide-react";

export interface RecordedClip {
  blob: Blob;
  mime: string;
  durationSec: number;
}

export default function VoiceRecorder({
  onSend,
  onCancel,
  disabled,
}: {
  onSend: (clip: RecordedClip) => Promise<void> | void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<
    "idle" | "recording" | "ready" | "sending"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<RecordedClip | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  // Pick a mime the browser actually supports.
  function pickMime(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const c of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(c)
      ) {
        return c;
      }
    }
    return "audio/webm";
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mime.split(";")[0],
        });
        const dur = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        setClip({ blob, mime: mime.split(";")[0], durationSec: dur });
        setState("ready");
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRecRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setState("recording");
      setSeconds(0);
      tickRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(s);
        if (s >= 120) stop(); // hard cap 2 min
      }, 250);
    } catch (e) {
      setError((e as Error).message || "mic_unavailable");
      setState("idle");
    }
  }

  function stop() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
  }

  function discard() {
    setClip(null);
    setState("idle");
    setSeconds(0);
  }

  async function send() {
    if (!clip) return;
    setState("sending");
    try {
      await onSend(clip);
      setClip(null);
      setState("idle");
      setSeconds(0);
    } catch (e) {
      setError((e as Error).message || "send_failed");
      setState("ready");
    }
  }

  // Auto-start the moment the component mounts.
  useEffect(() => {
    void start();
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        try {
          mediaRecRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmt(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-purple-100 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
      {state === "recording" && (
        <>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="font-mono text-sm text-red-700 dark:text-red-300">
            {fmt(seconds)}
          </span>
          <span className="flex-1 text-xs text-purple-700 dark:text-purple-300">
            Recording…
          </span>
          <button
            onClick={() => {
              stop();
              discard();
              onCancel();
            }}
            className="p-2 rounded-full text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60"
            type="button"
            aria-label="Cancel"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={stop}
            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
            type="button"
            aria-label="Stop"
          >
            <Square size={16} />
          </button>
        </>
      )}
      {state === "ready" && clip && (
        <>
          <Mic size={16} className="text-purple-700 dark:text-purple-300" />
          <span className="font-mono text-sm text-purple-700 dark:text-purple-300">
            {fmt(clip.durationSec)}
          </span>
          <span className="flex-1 text-xs text-purple-700 dark:text-purple-300">
            Ready to send
          </span>
          <button
            onClick={() => {
              discard();
              onCancel();
            }}
            className="p-2 rounded-full text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60"
            type="button"
            aria-label="Discard"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={send}
            disabled={disabled}
            className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            type="button"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </>
      )}
      {state === "sending" && (
        <span className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
          <Loader2 size={16} className="animate-spin" /> Sending…
        </span>
      )}
      {state === "idle" && error && (
        <span className="text-xs text-red-600 dark:text-red-400">
          Could not access microphone: {error}
        </span>
      )}
    </div>
  );
}
