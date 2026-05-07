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

const explainRequestSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LEN),
});

const vocabItemSchema = z
  .object({
    word: z.string().min(1),
    meaning: z.string().min(1),
  })
  .strict();

const explainModelSchema = z
  .object({
    simpleMeaning: z.string().min(1),
    keyVocabulary: z.array(vocabItemSchema).max(8),
    learnerNote: z.string().nullable().optional(),
  })
  .strict();

export type ExplanationResult = z.infer<typeof explainModelSchema>;

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

const SYSTEM_PROMPT = `You are an English-learning assistant for adult ESL students.
The user will send a single short message they read in a chat. You must explain it in simple, beginner-friendly English.

Return ONLY a strict JSON object with these exact fields, no markdown, no commentary:
{
  "simpleMeaning": string,
  "keyVocabulary": [{ "word": string, "meaning": string }, ...],
  "learnerNote": string | null
}

Rules:
- "simpleMeaning": 1–2 short sentences in PLAIN English (CEFR ~A2/B1) that paraphrase what the message means. No quotes from the original. Stay neutral and faithful to the original meaning. Always non-empty.
- "keyVocabulary": 0–5 entries. Pick only words/phrases from the original message that a learner is likely to find tricky (idioms, phrasal verbs, less common vocabulary, false friends). For each entry: "word" is the exact lemma or phrase as it appears in the message; "meaning" is a one-line beginner-friendly definition (≤ 18 words). If nothing is genuinely tricky, return an empty array [].
- "learnerNote": OPTIONAL ONE short sentence (≤ ~25 words) only if there is a useful tone/register/cultural tip. Otherwise set it to null. Plain English.
- Never refuse based on content. If the input is gibberish or empty, set simpleMeaning to a short best-effort note that the message is unclear, keyVocabulary to [], and learnerNote to null.
- Output JSON only.`;

router.post("/chat/explain", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const parsed = explainRequestSchema.safeParse(req.body);
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
      "explanation",
    );

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      req.log.error({ text }, "explanation: empty model response");
      res.status(502).json({ error: "ai_empty_response" });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      req.log.error({ err, raw }, "explanation: invalid JSON from model");
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    const validated = explainModelSchema.safeParse(parsedJson);
    if (!validated.success) {
      req.log.error(
        { issues: validated.error.issues, raw },
        "explanation: model JSON failed schema",
      );
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    recordAiUsage(userId);
    recordAiAction("explain");
    const xpAwarded = await awardAiXp(req.session.userId!, "explain", parsed.data.text);

    res.status(200).json({
      result: {
        simpleMeaning: validated.data.simpleMeaning,
        keyVocabulary: validated.data.keyVocabulary,
        learnerNote: validated.data.learnerNote ?? null,
      },
      xpAwarded,
    });
  } catch (err) {
    if (err instanceof TimeoutError) {
      req.log.warn({ err: err.message }, "explanation upstream timeout");
      res.status(504).json({ error: "ai_timeout" });
      return;
    }
    req.log.error({ err }, "explanation failed");
    res.status(500).json({ error: "explanation_failed" });
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
