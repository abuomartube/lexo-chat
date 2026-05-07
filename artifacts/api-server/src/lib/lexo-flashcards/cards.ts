import { eq } from "drizzle-orm";
import { db, wordsTable, type Word } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { hashKey } from "./audio";

type CardContent = {
  arabic: string;
  sentenceEn: string;
  sentenceAr: string;
};

const inflight = new Map<number, Promise<Word>>();

async function generateCardContent(word: Word): Promise<CardContent> {
  const prompt = `You are helping an Arabic-speaking learner study English vocabulary at CEFR level ${word.level}.
For the English word/phrase below, respond with strict JSON only (no prose, no markdown), with these exact fields:
{
  "arabic": "the most common, accurate Modern Standard Arabic translation of the word/phrase that fits the given part of speech. Use no diacritics. You may include 1 short alternate separated by ' / ' only when both are very commonly used. Keep it concise — 1 to 3 words maximum.",
  "sentenceEn": "ONE short, simple, natural English example sentence using the word in context. STRICT LIMITS: 4 to 8 words, must end with a period, no commas, no semicolons, no compound clauses, no abbreviations. Use everyday vocabulary appropriate for CEFR ${word.level}.",
  "sentenceAr": "a faithful, natural Modern Standard Arabic translation of sentenceEn. Keep it equally short (4 to 8 words). Translate the meaning, not word-for-word. Make sure it sounds natural to a native Arabic reader."
}

English word: ${word.english}
Part of speech: ${word.pos || "(unspecified)"}
CEFR level: ${word.level}`;

  const resp = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content:
          "You produce only valid minified JSON for an Arabic learner of English. Never include explanations or code fences.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = resp.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<CardContent>;
  if (!parsed.arabic || !parsed.sentenceEn || !parsed.sentenceAr) {
    throw new Error("OpenAI returned incomplete card content");
  }
  return {
    arabic: parsed.arabic,
    sentenceEn: parsed.sentenceEn,
    sentenceAr: parsed.sentenceAr,
  };
}

export async function ensureCard(id: number): Promise<Word | null> {
  const [existing] = await db
    .select()
    .from(wordsTable)
    .where(eq(wordsTable.id, id));
  if (!existing) return null;

  const needsContent =
    !existing.arabic || !existing.sentenceEn || !existing.sentenceAr;
  const needsWordAudio = !existing.audioWordPath;
  const needsSentenceAudio = !existing.audioSentencePath;

  if (!needsContent && !needsWordAudio && !needsSentenceAudio) return existing;

  if (inflight.has(id)) return inflight.get(id)!;

  const work = (async () => {
    let arabic = existing.arabic ?? "";
    let sentenceEn = existing.sentenceEn ?? "";
    let sentenceAr = existing.sentenceAr ?? "";
    if (needsContent) {
      const c = await generateCardContent(existing);
      arabic = c.arabic;
      sentenceEn = c.sentenceEn;
      sentenceAr = c.sentenceAr;
    }

    // Compute deterministic audio hashes synchronously. The actual MP3 is
    // generated lazily on first /api/audio/:hash request, so the card response
    // doesn't have to wait for two TTS round-trips.
    const audioWordPath = hashKey("en", existing.english);
    const audioSentencePath = hashKey("en", sentenceEn);

    const [updated] = await db
      .update(wordsTable)
      .set({
        arabic,
        sentenceEn,
        sentenceAr,
        audioWordPath,
        audioSentencePath,
      })
      .where(eq(wordsTable.id, id))
      .returning();
    return updated;
  })();

  inflight.set(id, work);
  try {
    return await work;
  } finally {
    inflight.delete(id);
  }
}
