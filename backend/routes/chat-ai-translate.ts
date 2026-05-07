import { Router, type IRouter } from "express";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../lib/auth";
import { awardAiXp } from "../lib/ai-xp";
import { recordAiAction } from "../lib/ai-analytics";
import { checkAiDailyLimit, recordAiUsage, __testing as __dailyTesting } from "../lib/ai-daily-limit";

const router: IRouter = Router();

const MAX_TEXT_LEN = 1000;
const REQUEST_TIMEOUT_MS = 20_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

const translateRequestSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LEN),
});

const translationModelSchema = z
  .object({
    detectedLanguage: z.enum(["en", "ar", "other"]),
    targetLanguage: z.enum(["en", "ar"]),
    translatedText: z.string().min(1),
    learnerNote: z.string().nullable().optional(),
  })
  .strict();

export type TranslationResult = z.infer<typeof translationModelSchema>;

class TimeoutError extends Error {
  constructor(label: string) {
    super(`${label} timed out`);
    this.name = "TimeoutError";
  }
}

const userHits = new Map<string, number[]>();

function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (userHits.get(userId) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    userHits.set(userId, hits);
    return false;
  }
  hits.push(now);
  userHits.set(userId, hits);
  if (userHits.size > 5_000) {
    for (const [k, ts] of userHits) {
      const fresh = ts.filter((t) => t > cutoff);
      if (fresh.length === 0) userHits.delete(k);
      else userHits.set(k, fresh);
    }
  }
  return true;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(label)), ms);
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

const SYSTEM_PROMPT = `You are a translation assistant for adult ESL students learning English.
The user will send a single short message. You must:

1. Detect the language of the input. If it is mostly English, set detectedLanguage="en". If it is mostly Arabic, set detectedLanguage="ar". Otherwise set detectedLanguage="other".
2. Translation direction:
   - If detectedLanguage="en", translate the message to natural Modern Standard Arabic. Set targetLanguage="ar".
   - If detectedLanguage="ar", translate the message to natural conversational English. Set targetLanguage="en".
   - If detectedLanguage="other", translate the message to natural English. Set targetLanguage="en".
3. "translatedText": the translation only — no quotes, no commentary, no labels.
4. "learnerNote": OPTIONAL ONE short, friendly, beginner-friendly sentence (max ~25 words) ONLY if there is a genuinely useful learning point (an idiom, a tricky word, a tone difference, or a common false-friend). Otherwise set it to null. Plain English even when the target is Arabic.

Return ONLY a strict JSON object with these exact fields, no markdown, no commentary:
{
  "detectedLanguage": "en" | "ar" | "other",
  "targetLanguage": "en" | "ar",
  "translatedText": string,
  "learnerNote": string | null
}

Rules:
- Stay close to the user's meaning. Do not add facts, opinions, or new content.
- Never refuse based on content; if the input is gibberish or empty, set detectedLanguage="other", targetLanguage="en", translatedText to a best-effort cleanup, and put a short note that the input was unclear.
- Output JSON only.`;

router.post("/chat/translate", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const parsed = translateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const text = parsed.data.text.trim();
  if (!text) {
    res.status(400).json({ error: "empty_text" });
    return;
  }

  if (!rateLimitOk(userId)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const quota = await checkAiDailyLimit(userId);
  if (!quota.allowed) {
    res.status(403).json({
      error: "daily_limit_reached",
      used: quota.used,
      limit: quota.limit,
    });
    return;
  }

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
      REQUEST_TIMEOUT_MS,
      "translation",
    );

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      req.log.error({ text }, "translation: empty model response");
      res.status(502).json({ error: "ai_empty_response" });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      req.log.error({ err, raw }, "translation: invalid JSON from model");
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    const validated = translationModelSchema.safeParse(parsedJson);
    if (!validated.success) {
      req.log.error(
        { issues: validated.error.issues, raw },
        "translation: model JSON failed schema",
      );
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    recordAiUsage(userId);
    recordAiAction("translate");
    const xpAwarded = await awardAiXp(req.session.userId!, "translate", parsed.data.text);

    res.status(200).json({
      result: {
        detectedLanguage: validated.data.detectedLanguage,
        targetLanguage: validated.data.targetLanguage,
        translatedText: validated.data.translatedText,
        learnerNote: validated.data.learnerNote ?? null,
      },
      xpAwarded,
    });
  } catch (err) {
    if (err instanceof TimeoutError) {
      req.log.warn({ err: err.message }, "translation upstream timeout");
      res.status(504).json({ error: "ai_timeout" });
      return;
    }
    req.log.error({ err }, "translation failed");
    res.status(500).json({ error: "translation_failed" });
  }
});

export const __testing = {
  resetRateLimit(): void {
    userHits.clear();
  },
  resetDailyLimit(): void {
    __dailyTesting.clearUsage();
  },
  RATE_LIMIT_MAX,
};

export default router;
