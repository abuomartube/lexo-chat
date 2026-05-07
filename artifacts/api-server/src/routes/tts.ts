import { Router, type IRouter } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import crypto from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  stat,
  unlink,
  rename,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const router: IRouter = Router();

const ALLOWED_VOICES = new Set([
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const);
type AllowedVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

const MAX_TEXT_LEN = 500;
const MAX_MEM_CACHE_BYTES = 64 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_WARM_BATCH = 50;
const WARM_CONCURRENCY = 4;
const MAX_DISK_CACHE_BYTES = 512 * 1024 * 1024;

const CACHE_DIR = path.resolve(process.cwd(), "data", "tts-cache");

function ensureCacheDir(): Promise<void> {
  return mkdir(CACHE_DIR, { recursive: true }).then(() => undefined);
}

function keyOf(voice: string, text: string): string {
  return `${voice}::${text}`;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function diskPath(key: string): string {
  return path.join(CACHE_DIR, `${hashKey(key)}.mp3`);
}

const memCache = new Map<string, Buffer>();
let memCacheBytes = 0;

type DiskEntry = { size: number; mtimeMs: number };
const diskIndex = new Map<string, DiskEntry>();
let diskCacheBytes = 0;

function memCacheGet(key: string): Buffer | undefined {
  const v = memCache.get(key);
  if (v) {
    memCache.delete(key);
    memCache.set(key, v);
  }
  return v;
}

function memCacheSet(key: string, val: Buffer): void {
  if (val.length > MAX_MEM_CACHE_BYTES) return;
  const prev = memCache.get(key);
  if (prev) memCacheBytes -= prev.length;
  memCacheBytes += val.length;
  memCache.set(key, val);
  while (memCacheBytes > MAX_MEM_CACHE_BYTES) {
    const oldestKey = memCache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = memCache.get(oldestKey);
    memCache.delete(oldestKey);
    if (oldest) memCacheBytes -= oldest.length;
  }
}

function upsertDiskEntry(file: string, entry: DiskEntry): void {
  const prev = diskIndex.get(file);
  if (prev) diskCacheBytes -= prev.size;
  diskIndex.set(file, entry);
  diskCacheBytes += entry.size;
}

function removeDiskEntry(file: string): void {
  const prev = diskIndex.get(file);
  if (prev) {
    diskCacheBytes -= prev.size;
    diskIndex.delete(file);
  }
}

async function diskCacheGet(key: string): Promise<Buffer | null> {
  const file = diskPath(key);
  if (!diskIndex.has(file) && !existsSync(file)) return null;
  try {
    const buf = await readFile(file);
    if (!diskIndex.has(file)) {
      upsertDiskEntry(file, { size: buf.length, mtimeMs: Date.now() });
    }
    return buf;
  } catch {
    removeDiskEntry(file);
    return null;
  }
}

let evicting = false;
async function evictDiskIfNeeded(): Promise<void> {
  if (evicting) return;
  if (diskCacheBytes <= MAX_DISK_CACHE_BYTES) return;
  evicting = true;
  try {
    const entries = Array.from(diskIndex.entries()).sort(
      (a, b) => a[1].mtimeMs - b[1].mtimeMs,
    );
    for (const [file] of entries) {
      if (diskCacheBytes <= MAX_DISK_CACHE_BYTES * 0.9) break;
      try {
        await unlink(file);
        removeDiskEntry(file);
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") {
          removeDiskEntry(file);
        }
      }
    }
  } finally {
    evicting = false;
  }
}

async function diskCacheSet(key: string, val: Buffer): Promise<void> {
  await ensureCacheDir();
  const file = diskPath(key);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, val);
  await rename(tmp, file);
  upsertDiskEntry(file, { size: val.length, mtimeMs: Date.now() });
  if (diskCacheBytes > MAX_DISK_CACHE_BYTES) {
    void evictDiskIfNeeded();
  }
}

void (async () => {
  try {
    await ensureCacheDir();
    const files = await readdir(CACHE_DIR);
    for (const f of files) {
      if (!f.endsWith(".mp3")) continue;
      const full = path.join(CACHE_DIR, f);
      try {
        const s = await stat(full);
        upsertDiskEntry(full, { size: s.size, mtimeMs: s.mtimeMs });
      } catch {
        /* ignore */
      }
    }
    console.log(
      `[tts] disk cache loaded: ${diskIndex.size} files, ${(diskCacheBytes / 1024 / 1024).toFixed(1)}MB`,
    );
    if (diskCacheBytes > MAX_DISK_CACHE_BYTES) {
      void evictDiskIfNeeded();
    }
  } catch (err) {
    console.error("[tts] failed to load disk cache index", err);
  }
})();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const WARM_RATE_LIMIT_MAX = 10;
const WARM_RATE_LIMIT_TEXTS = 200;

const ipHits = new Map<string, number[]>();
const warmIpHits = new Map<string, number[]>();
const warmIpTextCounts = new Map<
  string,
  { count: number; windowStart: number }
>();

function rateLimitOk(
  ip: string,
  max: number,
  store: Map<string, number[]>,
): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (store.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= max) {
    store.set(ip, hits);
    return false;
  }
  hits.push(now);
  store.set(ip, hits);
  if (store.size > 5_000) {
    for (const [k, ts] of store) {
      const fresh = ts.filter((t) => t > cutoff);
      if (fresh.length === 0) store.delete(k);
      else store.set(k, fresh);
    }
  }
  return true;
}

const WARM_IP_TEXT_COUNTS_MAX = 5_000;

function pruneWarmIpTextCounts(now: number): void {
  for (const [k, e] of warmIpTextCounts) {
    if (now - e.windowStart > RATE_LIMIT_WINDOW_MS) warmIpTextCounts.delete(k);
  }
  if (warmIpTextCounts.size > WARM_IP_TEXT_COUNTS_MAX) {
    const sorted = Array.from(warmIpTextCounts.entries()).sort(
      (a, b) => a[1].windowStart - b[1].windowStart,
    );
    const toRemove = warmIpTextCounts.size - WARM_IP_TEXT_COUNTS_MAX;
    for (let i = 0; i < toRemove; i++) {
      warmIpTextCounts.delete(sorted[i][0]);
    }
  }
}

function warmTextBudgetOk(
  ip: string,
  want: number,
): { ok: boolean; allowed: number } {
  const now = Date.now();
  const entry = warmIpTextCounts.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    const allowed = Math.min(want, WARM_RATE_LIMIT_TEXTS);
    warmIpTextCounts.set(ip, { count: allowed, windowStart: now });
    if (warmIpTextCounts.size > WARM_IP_TEXT_COUNTS_MAX) {
      pruneWarmIpTextCounts(now);
    }
    return { ok: allowed > 0, allowed };
  }
  const remaining = Math.max(0, WARM_RATE_LIMIT_TEXTS - entry.count);
  const allowed = Math.min(want, remaining);
  entry.count += allowed;
  return { ok: allowed > 0, allowed };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const inflightGen = new Map<string, Promise<Buffer>>();

async function generateAndCache(
  text: string,
  voice: AllowedVoice,
): Promise<Buffer> {
  const key = keyOf(voice, text);

  const mem = memCacheGet(key);
  if (mem) return mem;

  const disk = await diskCacheGet(key);
  if (disk) {
    memCacheSet(key, disk);
    return disk;
  }

  const existing = inflightGen.get(key);
  if (existing) return existing;

  const p = (async () => {
    try {
      const buf = await withTimeout(
        textToSpeech(text, voice, "mp3"),
        REQUEST_TIMEOUT_MS,
        "tts",
      );
      if (!buf || buf.length === 0) throw new Error("empty audio buffer");
      memCacheSet(key, buf);
      diskCacheSet(key, buf).catch((e) => {
        console.error("[tts] failed to write disk cache", e);
      });
      return buf;
    } finally {
      inflightGen.delete(key);
    }
  })();

  inflightGen.set(key, p);
  return p;
}

router.get("/tts", async (req, res) => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").toString();

  const text = String(req.query.text ?? "").trim();
  const voiceParam = String(req.query.voice ?? "fable");

  if (!text) {
    res.status(400).json({ error: "text query parameter is required" });
    return;
  }
  if (text.length > MAX_TEXT_LEN) {
    res.status(400).json({ error: `text exceeds ${MAX_TEXT_LEN} characters` });
    return;
  }
  if (!ALLOWED_VOICES.has(voiceParam as AllowedVoice)) {
    res.status(400).json({ error: "invalid voice" });
    return;
  }
  const voice = voiceParam as AllowedVoice;
  const key = keyOf(voice, text);
  const etag = `"${crypto.createHash("sha1").update(key).digest("hex")}"`;

  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }

  const mem = memCacheGet(key);
  if (mem) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(mem.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.status(200).end(mem);
    return;
  }

  const disk = await diskCacheGet(key);
  if (disk) {
    memCacheSet(key, disk);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(disk.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.status(200).end(disk);
    return;
  }

  if (!rateLimitOk(ip, RATE_LIMIT_MAX, ipHits)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  try {
    const buf = await generateAndCache(text, voice);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", etag);
    res.status(200).end(buf);
  } catch (err) {
    req.log.error({ err, text, voice }, "TTS generation failed");
    res.status(500).json({ error: "tts_failed" });
  }
});

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(limit, items.length); w++) {
    workers.push(
      (async () => {
        while (i < items.length) {
          const idx = i++;
          try {
            await task(items[idx]);
          } catch {
            /* swallow */
          }
        }
      })(),
    );
  }
  await Promise.all(workers);
}

router.post("/tts/warm", async (req, res) => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").toString();

  const body = req.body as { voice?: string; texts?: unknown };
  const voiceParam = String(body?.voice ?? "fable");
  if (!ALLOWED_VOICES.has(voiceParam as AllowedVoice)) {
    res.status(400).json({ error: "invalid voice" });
    return;
  }
  const voice = voiceParam as AllowedVoice;

  if (!Array.isArray(body?.texts)) {
    res.status(400).json({ error: "texts must be an array of strings" });
    return;
  }

  if (!rateLimitOk(ip, WARM_RATE_LIMIT_MAX, warmIpHits)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const seen = new Set<string>();
  const texts = (body.texts as unknown[])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => {
      if (!t || t.length > MAX_TEXT_LEN) return false;
      const k = keyOf(voice, t);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX_WARM_BATCH);

  let alreadyCached = 0;
  const toGenerate: string[] = [];

  for (const text of texts) {
    const key = keyOf(voice, text);
    if (memCache.has(key)) {
      alreadyCached++;
      continue;
    }
    const file = diskPath(key);
    if (diskIndex.has(file) || existsSync(file)) {
      if (!diskIndex.has(file)) {
        try {
          const s = await stat(file);
          upsertDiskEntry(file, { size: s.size, mtimeMs: s.mtimeMs });
        } catch {
          /* ignore */
        }
      }
      alreadyCached++;
      continue;
    }
    toGenerate.push(text);
  }

  const budget = warmTextBudgetOk(ip, toGenerate.length);
  const queued = toGenerate.slice(0, budget.allowed);

  res.status(202).json({
    accepted: texts.length,
    alreadyCached,
    queued: queued.length,
    rejectedByBudget: toGenerate.length - queued.length,
  });

  if (queued.length === 0) return;

  void runWithConcurrency(queued, WARM_CONCURRENCY, async (text) => {
    try {
      await generateAndCache(text, voice);
    } catch (err) {
      console.error("[tts/warm] failed", text, err);
    }
  });
});

export default router;
