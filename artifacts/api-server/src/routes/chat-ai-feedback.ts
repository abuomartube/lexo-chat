import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, chatMessagesTable, chatRoomsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const REQUEST_TIMEOUT_MS = 30_000;

const feedbackRequestSchema = z.object({
  roomSlug: z.string().min(1).max(200),
});

const feedbackResponseSchema = z.object({
  summary: z.string(),
  commonMistakes: z.array(z.string()),
  vocabularySuggestions: z.array(z.string()),
  fluencySuggestions: z.array(z.string()),
  practicalTips: z.array(z.string()),
  voiceNote: z.string().nullable(),
});

export type FeedbackReport = z.infer<typeof feedbackResponseSchema>;

const EMPTY_REPORT: FeedbackReport = {
  summary: "You haven't sent any text messages in this room yet. Start chatting to get personalised feedback!",
  commonMistakes: [],
  vocabularySuggestions: [],
  fluencySuggestions: [],
  practicalTips: [
    "Try sending a few messages in the chat room first.",
    "Use the Correct and Explain buttons to learn from each message.",
    "Practice writing short sentences about everyday topics.",
  ],
  voiceNote: null,
};

const SYSTEM_PROMPT = `You are a private English-learning feedback assistant.
The student has been practising in a chat room. You will receive ONLY the student's own text messages.

Analyse the messages and return ONLY a strict JSON object with these fields:
{
  "summary": string,          // 2-3 sentence overall assessment, friendly and encouraging
  "commonMistakes": string[], // up to 5 recurring grammar/spelling/word-choice mistakes found
  "vocabularySuggestions": string[], // up to 5 vocabulary upgrades or new words they could use
  "fluencySuggestions": string[],   // up to 3 naturalness/fluency tips
  "practicalTips": string[],        // exactly 3 actionable improvement tips
  "voiceNote": null                 // always null for now (voice analysis coming soon)
}

Rules:
- Be encouraging and constructive.
- If there are very few messages, still give helpful general tips.
- Keep each item concise (1-2 sentences max).
- Output JSON only, no markdown, no commentary.`;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

router.post("/chat/my-feedback", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const parsed = feedbackRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", details: parsed.error.issues });
    return;
  }

  const { roomSlug } = parsed.data;

  const [room] = await db
    .select({ id: chatRoomsTable.id })
    .from(chatRoomsTable)
    .where(eq(chatRoomsTable.slug, roomSlug));

  if (!room) {
    res.status(404).json({ error: "room_not_found" });
    return;
  }

  const userMessages = await db
    .select({
      body: chatMessagesTable.body,
      kind: chatMessagesTable.kind,
      createdAt: chatMessagesTable.createdAt,
    })
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.roomId, room.id),
        eq(chatMessagesTable.userId, userId),
      ),
    )
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(100);

  const textMessages = userMessages.filter(
    (m) => m.kind === "text" && m.body && m.body.trim().length > 0,
  );

  const hasVoice = userMessages.some((m) => m.kind === "voice");

  if (textMessages.length === 0) {
    const report: FeedbackReport = {
      ...EMPTY_REPORT,
      voiceNote: hasVoice ? "Voice feedback coming soon / تقييم الرسائل الصوتية قريبًا" : null,
    };
    res.status(200).json({ report });
    return;
  }

  const studentText = textMessages
    .map((m, i) => `${i + 1}. ${m.body}`)
    .join("\n");

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: studentText },
        ],
      }),
      REQUEST_TIMEOUT_MS,
      "feedback",
    );

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      req.log.error("feedback: empty model response");
      res.status(502).json({ error: "ai_empty_response" });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      req.log.error({ raw }, "feedback: invalid JSON from model");
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    const validated = feedbackResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      req.log.error({ issues: validated.error.issues, raw }, "feedback: schema validation failed");
      res.status(502).json({ error: "ai_invalid_response" });
      return;
    }

    const report: FeedbackReport = {
      ...validated.data,
      voiceNote: hasVoice ? "Voice feedback coming soon / تقييم الرسائل الصوتية قريبًا" : null,
    };

    res.status(200).json({ report });
  } catch (err) {
    if (err instanceof Error && err.message.includes("timed out")) {
      req.log.warn("feedback: upstream timeout");
      res.status(504).json({ error: "ai_timeout" });
      return;
    }
    req.log.error({ err }, "feedback: generation failed");
    res.status(500).json({ error: "feedback_failed" });
  }
});

export default router;
