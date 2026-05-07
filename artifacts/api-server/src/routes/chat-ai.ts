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

const correctRequestSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LEN),
});

const correctionModelSchema = z.object({
  isAlreadyCorrect: z.boolean(),
  corrected: z.string(),
  explanation: z.string(),
  naturalVersion: z.string().nullable().optional(),
});

export type CorrectionResult = z.infer<typeof correctionModelSchema>;

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
The user will send a single short message in English (or attempting English).
Return ONLY a strict JSON object with these exact fields, no markdown, no commentary:
{
  "isAlreadyCorrect": boolean,
  "corrected": string,
  "explanation": string,
  "naturalVersion": string | null
}

Rules:
- "corrected": the grammatically correct version of the user's text. If the original is already fully correct, repeat it unchanged.
- "explanation": ONE short, friendly, beginner-friendly sentence (max ~30 words) explaining the main fix or, if already correct, briefly affirming why it works. Plain English, no jargon. Do not list multiple fixes; pick the most important one.
- "naturalVersion": OPTIONAL more natural / native-sounding rewrite that a fluent speaker would actually say. Use null if "corrected" already sounds perfectly natural and no rewrite would help.
- "isAlreadyCorrect": true ONLY if the original text has no grammar, spelling, or word-choice errors.
- Never invent new content, opinions, or facts. Stay close to the user's meaning.
- If the input is empty, gibberish, or not attempting English, set isAlreadyCorrect=false, corrected to a best-effort cleanup, and explain in one sentence that the input was unclear.
- Output JSON only.`;

router.post("/chat/correct", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const parsed = correctRequestSchema.safeParse(req.body);
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
      "correction",
    );

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      req.log.error({ text }, "correction: empty model response");
      res.status(502).json({ error: "ai_empty_response" });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      req.log.error({ err, raw }, "correction: invalid JSON from model");
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    const validated = correctionModelSchema.safeParse(parsedJson);
    if (!validated.success) {
      req.log.error(
        { issues: validated.error.issues, raw },
        "correction: model JSON failed schema",
      );
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    recordAiUsage(userId);
    recordAiAction("correct");
    const xpAwarded = await awardAiXp(req.session.userId!, "correct", parsed.data.text);

    res.status(200).json({
      result: {
        isAlreadyCorrect: validated.data.isAlreadyCorrect,
        corrected: validated.data.corrected,
        explanation: validated.data.explanation,
        naturalVersion: validated.data.naturalVersion ?? null,
      },
      xpAwarded,
    });
  } catch (err) {
    if (err instanceof TimeoutError) {
      req.log.warn({ err: err.message }, "correction upstream timeout");
      res.status(504).json({ error: "ai_timeout" });
      return;
    }
    req.log.error({ err }, "correction failed");
    res.status(500).json({ error: "correction_failed" });
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
