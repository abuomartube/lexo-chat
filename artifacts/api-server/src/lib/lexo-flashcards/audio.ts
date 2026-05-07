import crypto from "node:crypto";
import { openai } from "@workspace/integrations-openai-ai-server";
import { objectStorageClient, ObjectStorageService } from "../objectStorage";

const objectStorage = new ObjectStorageService();
const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (!bucketId) {
  throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID must be set");
}

const privateDir = (() => {
  const raw = process.env.PRIVATE_OBJECT_DIR;
  if (!raw) throw new Error("PRIVATE_OBJECT_DIR must be set");
  // Expected format: /<bucketId>/<dir...>
  const match = /^\/([^/]+)\/(.+)$/.exec(raw);
  if (!match) {
    throw new Error(
      `PRIVATE_OBJECT_DIR must be of the form /<bucketId>/<dir>, got: ${raw}`,
    );
  }
  const [, dirBucket, dir] = match;
  if (dirBucket !== bucketId) {
    throw new Error(
      `PRIVATE_OBJECT_DIR bucket "${dirBucket}" does not match DEFAULT_OBJECT_STORAGE_BUCKET_ID "${bucketId}"`,
    );
  }
  return dir;
})();

export type AudioLang = "en" | "ar";

const VOICES: Record<AudioLang, string> = {
  en: "alloy",
  ar: "alloy",
};

export function hashKey(lang: AudioLang, text: string): string {
  const h = crypto.createHash("sha256");
  h.update(`${lang}::${text}`);
  return h.digest("hex");
}

function audioObjectName(hash: string): string {
  return `${privateDir}/audio/${hash}.mp3`;
}

const inflightAudio = new Map<string, Promise<void>>();

async function generateAudio(
  lang: AudioLang,
  text: string,
  hash: string,
): Promise<void> {
  const objectName = audioObjectName(hash);
  const file = objectStorageClient.bucket(bucketId!).file(objectName);
  const instructions =
    lang === "en"
      ? "You are a text-to-speech engine. Speak the user's text exactly, in clear native English at a slightly slower pace suitable for vocabulary learners. Do not add words, comments, translations, or pronunciation notes."
      : "أنت محرّك تحويل نص إلى كلام. انطق نص المستخدم حرفيًا بالعربية الفصحى الواضحة وبسرعة معتدلة مناسبة للمتعلمين. لا تضِف أي كلمات أو تعليقات أو ترجمات.";
  const response = await openai.chat.completions.create({
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice: VOICES[lang] as "alloy", format: "mp3" },
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: `Repeat verbatim: ${text}` },
    ],
  });
  const audioData =
    (response.choices[0]?.message as unknown as { audio?: { data?: string } })
      ?.audio?.data ?? "";
  if (!audioData) {
    throw new Error("OpenAI returned no audio data");
  }
  const buffer = Buffer.from(audioData, "base64");
  await file.save(buffer, {
    contentType: "audio/mpeg",
    metadata: { contentType: "audio/mpeg" },
    resumable: false,
  });
}

/**
 * Compute the deterministic hash for (lang, text) and ensure the MP3 exists in
 * object storage, generating it via OpenAI if missing. De-duplicates concurrent
 * requests for the same hash.
 */
export async function ensureAudio(
  lang: AudioLang,
  text: string,
): Promise<string> {
  const hash = hashKey(lang, text);
  await ensureAudioForHash(lang, text, hash);
  return hash;
}

export async function ensureAudioForHash(
  lang: AudioLang,
  text: string,
  hash: string,
): Promise<void> {
  const objectName = audioObjectName(hash);
  const file = objectStorageClient.bucket(bucketId!).file(objectName);
  const [exists] = await file.exists();
  if (exists) return;
  const existing = inflightAudio.get(hash);
  if (existing) {
    await existing;
    return;
  }
  const work = generateAudio(lang, text, hash).finally(() => {
    inflightAudio.delete(hash);
  });
  inflightAudio.set(hash, work);
  await work;
}

export async function streamAudio(
  hash: string,
): Promise<{ stream: NodeJS.ReadableStream; size: number } | null> {
  const objectName = audioObjectName(hash);
  const file = objectStorageClient.bucket(bucketId!).file(objectName);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [meta] = await file.getMetadata();
  const size = Number(meta.size ?? 0);
  return { stream: file.createReadStream(), size };
}

export { objectStorage };
