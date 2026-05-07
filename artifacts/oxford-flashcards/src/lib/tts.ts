const ttsUrlCache = new Map<string, string>();

function makeKey(text: string, voice: string): string {
  return `${voice}::${text.trim()}`;
}

export function getTtsUrl(text: string, voice: "fable" = "fable"): string {
  const key = makeKey(text, voice);
  let url = ttsUrlCache.get(key);
  if (!url) {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
    url = `${base}/api/tts?voice=${voice}&text=${encodeURIComponent(text.trim())}`;
    ttsUrlCache.set(key, url);
  }
  return url;
}

const blobCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function getCachedBlobUrl(
  text: string,
  voice: "fable" = "fable",
): string | null {
  return blobCache.get(makeKey(text, voice)) ?? null;
}

function getApiBase(): string {
  return (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
}

const warmedSet = new Set<string>();

export function warmTtsBatch(texts: string[], voice: "fable" = "fable"): void {
  const fresh = texts
    .map((t) => t?.trim())
    .filter((t): t is string => !!t)
    .filter((t) => {
      const key = makeKey(t, voice);
      if (warmedSet.has(key) || blobCache.has(key)) return false;
      warmedSet.add(key);
      return true;
    });
  if (fresh.length === 0) return;

  const url = `${getApiBase()}/api/tts/warm`;
  for (let i = 0; i < fresh.length; i += 50) {
    const batch = fresh.slice(i, i + 50);
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice, texts: batch }),
      keepalive: true,
    }).catch(() => {
      for (const t of batch) warmedSet.delete(makeKey(t, voice));
    });
  }
}

export function prefetchTts(
  text: string | null | undefined,
  voice: "fable" = "fable",
): Promise<string> | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const key = makeKey(trimmed, voice);
  const cached = blobCache.get(key);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(getTtsUrl(trimmed, voice));
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(key, blobUrl);
      return blobUrl;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  promise.catch(() => {});
  return promise;
}

interface ActiveEntry {
  audio: HTMLAudioElement;
  onInterrupt: () => void;
}

let active: ActiveEntry | null = null;

export function setActiveTtsAudio(
  audio: HTMLAudioElement | null,
  onInterrupt?: () => void,
): void {
  if (active && active.audio !== audio) {
    const prev = active;
    active = null;
    prev.audio.pause();
    prev.audio.src = "";
    prev.onInterrupt();
  }
  if (audio) {
    active = { audio, onInterrupt: onInterrupt ?? (() => {}) };
  }
}

export function stopActiveTtsAudio(): void {
  if (active) {
    const prev = active;
    active = null;
    prev.audio.pause();
    prev.audio.src = "";
    prev.onInterrupt();
  }
}

export function getActiveTtsAudio(): HTMLAudioElement | null {
  return active?.audio ?? null;
}
