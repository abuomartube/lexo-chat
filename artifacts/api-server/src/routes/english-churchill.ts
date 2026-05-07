import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, englishEnrollmentsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

type ChatMessage = { role: "user" | "assistant"; content: string };

const CEFR_LEVELS = ["A1", "A2", "B1", "B1+", "B2", "C1"] as const;
type CefrLevel = (typeof CEFR_LEVELS)[number];

const BEGINNER_LEVELS: CefrLevel[] = ["A1", "A2", "B1"];
const INTERMEDIATE_LEVELS: CefrLevel[] = ["B1+", "B2", "C1"];

async function getStudentActiveTiers(userId: string): Promise<string[]> {
  const rows = await db
    .select({ tier: englishEnrollmentsTable.tier, expiresAt: englishEnrollmentsTable.expiresAt })
    .from(englishEnrollmentsTable)
    .where(
      and(
        eq(englishEnrollmentsTable.userId, userId),
        eq(englishEnrollmentsTable.status, "active"),
      ),
    );
  const now = new Date();
  const active = rows.filter((r) => !r.expiresAt || r.expiresAt > now);
  return [...new Set(active.map((r) => r.tier))];
}

function canAccessLevel(activeTiers: string[], level: CefrLevel): boolean {
  if (activeTiers.includes("advanced")) return true;
  if (activeTiers.includes("beginner") && BEGINNER_LEVELS.includes(level)) return true;
  if (activeTiers.includes("intermediate") && INTERMEDIATE_LEVELS.includes(level)) return true;
  return false;
}

function getAllowedLevels(activeTiers: string[]): CefrLevel[] {
  if (activeTiers.includes("advanced")) return [...CEFR_LEVELS];
  const allowed: CefrLevel[] = [];
  if (activeTiers.includes("beginner")) allowed.push(...BEGINNER_LEVELS);
  if (activeTiers.includes("intermediate")) allowed.push(...INTERMEDIATE_LEVELS);
  return allowed;
}

const LEVEL_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: "absolute beginner (CEFR A1). Use extremely simple words (hello, yes, no, I like, I have). Very short sentences of 5-10 words. Basic present tense only. Speak as if talking to someone who knows only 200 English words.",
  A2: "elementary learner (CEFR A2). Use simple everyday words. Short sentences of 8-15 words. Present and simple past tense. Speak clearly and slowly, like a patient friend helping someone practice basic English.",
  B1: "pre-intermediate learner (CEFR B1). Use common vocabulary and simple grammar. Sentences of 10-20 words. Present, past, future tenses. Can discuss familiar topics. Be encouraging and patient.",
  "B1+": "intermediate learner (CEFR B1+). Use moderately varied vocabulary. Slightly more complex sentences. Can discuss opinions and experiences. Natural but still accessible language.",
  B2: "upper-intermediate learner (CEFR B2). Use natural vocabulary including some idioms. More complex grammar is fine. Can discuss abstract topics. Speak naturally like talking to a friend who speaks good English.",
  C1: "advanced learner (CEFR C1). Use rich, natural vocabulary including idioms and phrasal verbs. Complex grammar and nuanced expression. Discuss abstract, professional, or cultural topics at depth. Speak as you would to a near-native speaker.",
};

const CHURCHILL_PROMPT = (level: CefrLevel, topic: string, conversationType: string) =>
  `You are Churchill, a warm, friendly British English conversation partner having a real, natural conversation with an English learner.

LEARNER LEVEL: ${LEVEL_DESCRIPTIONS[level]}

TOPIC: "${topic}"
CONVERSATION TYPE: ${conversationType === "free" ? "Free conversation — let the topic drift naturally wherever the learner wants to go." : "Topic-based conversation — keep the discussion focused on the topic while still being natural and engaging."}

Hard rules — NEVER break these:
- This is a casual, natural chat. NEVER correct the user's grammar, vocabulary, or pronunciation during the conversation. NEVER teach English. NEVER mention levels, exams, scores, or grammar rules.
- Speak like a real person, not a chatbot. Use natural contractions ("I'd", "you're", "that's").
- Keep replies SHORT: 1–2 sentences, about 15–35 words. Short enough for the learner to follow.
- React naturally to what they said (agree, react, share a quick opinion or tiny example), then ask ONE simple follow-up question.
- Never use markdown, bullet points, lists, or headings. Plain spoken English only.
- Never narrate actions ("*laughs*") and never refer to yourself as an AI.
- Adjust your language complexity to match the learner's level. For A1/A2, use very simple words and short sentences. For B2/C1, be more natural and expressive.
- Keep the conversation going like a friendly English teacher who genuinely enjoys chatting.

If the user has just opened the conversation, greet them warmly in ONE short sentence and ask ONE simple, open question about ${topic}.`;

const FEEDBACK_PROMPT = (level: CefrLevel, topic: string) =>
  `You are an experienced English teacher reviewing a conversation between a learner (user) and a conversation partner (assistant). The learner's target level is ${level}. The topic was: "${topic}".

Analyse ONLY the user's messages. Be honest, specific, and constructive. Focus on helping them improve their English naturally.

Return ONLY a valid JSON object with NO markdown fencing:

{
  "summary": "2–3 sentence honest overall assessment of the learner's English in this conversation. Mention specific strengths and areas for improvement. Reference their ${level} level goals.",
  "grammarMistakes": [
    { "original": "exact phrase the user wrote", "correction": "fixed version", "explanation": "1 sentence why" }
  ],
  "vocabularyUpgrades": [
    { "original": "basic word/phrase used", "better": "more natural/advanced alternative", "example": "short example sentence", "reason": "1 short reason" }
  ],
  "betterExpressions": [
    { "original": "what the user said", "better": "more natural way to say it", "explanation": "why this sounds more natural" }
  ],
  "fluencyNotes": "2-3 sentences about the learner's fluency and naturalness. Comment on sentence flow, response length, and conversation engagement.",
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "wordCount": 0,
  "userTurns": 0
}

Rules:
- Limit grammarMistakes to the 5 most important.
- Limit vocabularyUpgrades to the 5 most useful.
- Limit betterExpressions to the 4 best improvements.
- "original" fields MUST be exact phrases from the user's messages.
- No exam scores or exam language. This is General English practice.
- Be encouraging but honest. Celebrate what they did well.
- Tailor feedback to their ${level} level — don't expect C1 quality from an A1 learner.`;

const TOPICS_BY_LEVEL: Record<CefrLevel, string[]> = {
  A1: [
    "My family", "My home", "Food I like", "My daily routine", "Colors and clothes",
    "Animals", "Weather today", "My school", "Shopping", "Numbers and counting",
    "My best friend", "Hobbies I enjoy", "My favorite food", "At the restaurant",
    "Parts of the body", "Days and months", "My bedroom", "Fruits and vegetables",
    "Transport", "At the park", "My toys and games", "Simple greetings",
    "Birthday party", "My pet", "In the kitchen", "At the beach",
    "Morning routine", "Favorite sport", "My neighborhood", "Simple jobs",
  ],
  A2: [
    "Weekend plans", "My hometown", "A holiday I enjoyed", "My favorite movie",
    "Cooking a meal", "School subjects", "A day at the beach", "Social media",
    "My best memory", "Going to a restaurant", "Sports and exercise", "Music I like",
    "A trip I took", "My dream house", "Shopping habits", "Celebrations",
    "My neighbors", "A normal day", "Games and apps", "Learning languages",
    "A funny story", "My morning routine", "Future plans", "A market visit",
    "A rainy day", "My favorite season", "Meeting new people", "At the airport",
    "A school memory", "Evening activities",
  ],
  B1: [
    "Travel experiences", "Work and career", "Technology in daily life", "Health and fitness",
    "Environmental issues", "Social media impact", "Childhood memories", "Cultural traditions",
    "Education systems", "City vs village life", "Friendship", "Money and saving",
    "A book or movie review", "News and current events", "Volunteering", "Fashion and style",
    "Public transport", "Food culture", "Life goals", "A person I admire",
    "Online learning", "Stress and relaxation", "Pets and animals", "Festivals",
    "A challenging experience", "Teamwork", "My daily commute", "Cooking traditions",
    "Gadgets I use", "Weekend activities",
  ],
  "B1+": [
    "Work-life balance", "Climate change", "Social media influence", "Cultural differences",
    "Artificial intelligence", "Healthy lifestyle", "Urbanization", "Globalization",
    "Education reform", "Community service", "Mental health awareness", "Entrepreneurship",
    "Sustainable living", "Media literacy", "Gender equality", "Digital privacy",
    "Remote work", "Travel and tourism industry", "Food sustainability", "Youth culture",
    "Public speaking", "Career changes", "Technology addiction", "Cultural identity",
    "Financial literacy", "Creativity and innovation", "Workplace diversity",
    "News consumption", "Personal growth", "Social responsibility",
  ],
  B2: [
    "Ethics in technology", "Work culture differences", "Mental health in society",
    "Freedom of speech", "The future of education", "Immigration and integration",
    "Social inequality", "Consumerism", "The role of art in society", "Aging populations",
    "Scientific discoveries", "Democracy and governance", "Media bias", "Space exploration",
    "Renewable energy", "Cultural appropriation", "Privacy vs security", "Social entrepreneurship",
    "The gig economy", "Philosophical questions", "Cybersecurity", "Human rights",
    "Fake news", "Generational differences", "Mindfulness and wellbeing", "Biodiversity",
    "Urban planning", "Ethics of AI", "Historical lessons", "Global cooperation",
  ],
  C1: [
    "The philosophy of happiness", "Ethics of genetic engineering", "Post-truth society",
    "The future of democracy", "Cognitive biases in decision-making", "Cultural hegemony",
    "The paradox of choice", "Artificial consciousness", "Economic inequality solutions",
    "The role of dissent in society", "Digital transformation of industries",
    "Sustainability vs economic growth", "The ethics of surveillance",
    "Language and identity", "The meaning of success", "Power dynamics in organizations",
    "The future of work", "Moral relativism", "Systemic racism", "Universal basic income",
    "The attention economy", "Philosophical ethics", "Posthumanism",
    "The politics of food", "Media manipulation", "Existentialism in modern life",
    "Innovation vs tradition", "The limits of science", "Social contract theory",
    "The nature of consciousness",
  ],
};

const chatBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(40).default([]),
  level: z.enum(CEFR_LEVELS),
  mode: z.enum(["text", "voice"]),
  conversationType: z.enum(["free", "topic"]),
  topic: z.string().min(1).max(200),
  isStart: z.boolean().optional(),
});

const feedbackBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).min(1).max(40),
  level: z.enum(CEFR_LEVELS),
  topic: z.string().min(1).max(200),
});

router.get("/english/mentor/churchill/topics", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    if (activeTiers.length === 0) {
      res.status(403).json({ error: "No active package" });
      return;
    }
    const allowed = getAllowedLevels(activeTiers);
    const topics: Record<string, string[]> = {};
    for (const lvl of allowed) {
      topics[lvl] = TOPICS_BY_LEVEL[lvl];
    }
    res.json({ topics, allowedLevels: allowed, activeTiers });
  } catch (err) {
    next(err);
  }
});

router.post("/english/mentor/churchill/chat", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    if (activeTiers.length === 0) {
      res.status(403).json({ error: "No active package" });
      return;
    }

    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    const { messages, level, mode, conversationType, topic, isStart } = parsed.data;

    if (!canAccessLevel(activeTiers, level)) {
      res.status(403).json({ error: "This level belongs to another package." });
      return;
    }

    if (mode === "voice") {
      res.status(400).json({ error: "Voice mode coming soon." });
      return;
    }

    const safeMessages: ChatMessage[] = messages.slice(-20);
    const ctx: ChatMessage[] =
      safeMessages.length > 0
        ? safeMessages
        : [{ role: "user", content: isStart ? "(start the conversation now)" : "(say hi)" }];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.85,
      max_tokens: 250,
      messages: [
        { role: "system", content: CHURCHILL_PROMPT(level, topic, conversationType) },
        ...ctx,
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    req.log.error({ err }, "Churchill chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed. Please try again." });
    } else {
      try {
        res.write("data: [ERROR]\n\n");
        res.end();
      } catch { /* ignore */ }
    }
  }
});

router.post("/english/mentor/churchill/feedback", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    if (activeTiers.length === 0) {
      res.status(403).json({ error: "No active package" });
      return;
    }

    const parsed = feedbackBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    const { messages, level, topic } = parsed.data;

    if (!canAccessLevel(activeTiers, level)) {
      res.status(403).json({ error: "This level belongs to another package." });
      return;
    }

    const transcript = messages
      .map((m) => `${m.role === "user" ? "LEARNER" : "CHURCHILL"}: ${m.content}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FEEDBACK_PROMPT(level, topic) },
        { role: "user", content: transcript },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let parsed2: unknown;
    try {
      parsed2 = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
      parsed2 = JSON.parse(cleaned);
    }

    res.json({ feedback: parsed2 });
  } catch (err) {
    req.log.error({ err }, "Churchill feedback error");
    res.status(500).json({ error: "Feedback generation failed. Please try again." });
  }
});

export default router;
