import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, englishEnrollmentsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

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

const LEVEL_GUIDELINES: Record<CefrLevel, string> = {
  A1: "absolute beginner (CEFR A1). Use only the simplest words (200-400 word vocabulary). Very short, simple sentences (5-10 words). Present tense only. The script should be 40-60 words total. Questions should be very easy.",
  A2: "elementary learner (CEFR A2). Use simple everyday vocabulary (400-800 words). Short sentences (8-15 words). Present and simple past tense. The script should be 60-90 words total. Questions should be straightforward.",
  B1: "pre-intermediate learner (CEFR B1). Use common vocabulary (800-1500 words), some linking words. Past/present/future tenses. The script should be 90-130 words total. Questions can require some inference.",
  "B1+": "intermediate learner (CEFR B1+). Use moderately varied vocabulary, opinions and reasons. More complex grammar, conditional sentences. The script should be 130-170 words total. Questions can test understanding of opinions and implications.",
  B2: "upper-intermediate learner (CEFR B2). Use natural vocabulary including some idioms. Complex grammar, nuanced expression. The script should be 170-220 words total. Questions should test deeper comprehension and inference.",
  C1: "proficient learner (CEFR C1). Use rich, sophisticated vocabulary including idioms and phrasal verbs. Complex grammar, varied sentence structures. The script should be 220-280 words total. Questions should test nuance, tone, and critical understanding.",
};

const GENERATE_PROMPT = (level: CefrLevel, topic: string) =>
  `You are Attenborough, an expert English listening comprehension teacher creating a practice exercise.

STUDENT LEVEL: ${LEVEL_GUIDELINES[level]}

TOPIC: "${topic}"

Create a listening comprehension exercise. The "script" is a short passage that would normally be read aloud (audio will be added later). Write it as natural spoken English — like a short monologue, dialogue, announcement, or narration on the topic.

Return ONLY a valid JSON object with NO markdown fencing:

{
  "title": "A short, engaging title for this listening exercise",
  "script": "The full listening script text. Write natural, spoken-style English appropriate for the level. Make it interesting and relevant to the topic.",
  "questions": [
    {
      "type": "mcq",
      "question": "A comprehension question about the script",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact text of the correct option",
      "explanation": "1-2 sentence explanation of why this is correct, referencing the script"
    },
    {
      "type": "true_false",
      "question": "A true/false statement about the script",
      "options": ["True", "False"],
      "correctAnswer": "True or False",
      "explanation": "1-2 sentence explanation referencing the script"
    },
    {
      "type": "short_answer",
      "question": "A question requiring a brief answer from the script",
      "options": [],
      "correctAnswer": "The expected short answer (a few words)",
      "explanation": "1-2 sentence explanation with the relevant part of the script"
    }
  ],
  "vocabulary": [
    {
      "word": "A useful word or phrase from the script",
      "meaning": "Simple definition appropriate for the student's level",
      "example": "Another example sentence using this word"
    }
  ]
}

Rules:
- Include exactly 5 questions: 2 MCQ, 2 True/False, 1 Short Answer. Mix them up in order.
- Include 4-5 vocabulary items from the script.
- MCQ options must have exactly 4 choices.
- "correctAnswer" for MCQ must exactly match one of the options.
- "correctAnswer" for true_false must be exactly "True" or "False".
- Short answer "correctAnswer" should be brief (1-5 words).
- Make the script feel like natural spoken English, not a textbook.
- Tailor everything to the ${level} level.
- No exam language, no band scores. This is General English listening practice.`;

const TOPICS_BY_LEVEL: Record<CefrLevel, string[]> = {
  A1: [
    "At the supermarket", "Meeting a new friend", "My daily routine",
    "Ordering food at a restaurant", "At the doctor", "The weather today",
    "Asking for directions", "A phone call to a friend", "At school",
    "Shopping for clothes", "A birthday party", "My pet",
    "At the bus stop", "Cooking a simple meal", "My family",
    "A day at the park", "Checking in at a hotel", "Morning routine",
    "Buying a train ticket", "A message from a teacher",
  ],
  A2: [
    "Planning a weekend trip", "A conversation at work", "Returning an item to a shop",
    "Talking about hobbies", "A voicemail from a friend", "At the airport",
    "Describing a holiday", "A news report about weather", "Job interview basics",
    "Making a complaint", "A tour guide introduction", "Booking a table",
    "Talking about movies", "A radio advertisement", "Instructions for a recipe",
    "Lost and found", "A sports update", "Visiting a museum",
    "A dentist appointment", "Neighborhood news",
  ],
  B1: [
    "A podcast about healthy eating", "Travel tips from an expert",
    "A workplace meeting about a project", "An interview with a local hero",
    "A radio discussion about technology", "University orientation talk",
    "Environmental news report", "A talk about learning languages",
    "Customer service call", "A speech at a community event",
    "A documentary excerpt about cities", "Career advice segment",
    "A discussion about social media habits", "Public transport announcement",
    "A talk about cultural festivals", "Health and fitness advice",
    "A conversation about moving to a new city", "Book club discussion",
    "A news story about innovation", "Parent-teacher meeting",
  ],
  "B1+": [
    "A debate on remote work vs office work", "A podcast about mental health awareness",
    "An interview with an entrepreneur", "A lecture on climate change basics",
    "A panel discussion on education reform", "A travel documentary narration",
    "A conversation about work-life balance", "A TED-style talk on creativity",
    "A news analysis of economic trends", "A discussion about cultural differences",
    "An expert talking about sleep science", "A podcast episode on volunteering",
    "A conversation about ethical shopping", "A talk about digital privacy",
    "A documentary about food cultures", "A debate on social media regulation",
    "An interview about career changes", "A lecture on communication skills",
    "A talk about sustainable living", "A discussion about generational differences",
  ],
  B2: [
    "A lecture on the psychology of decision-making", "A debate on artificial intelligence ethics",
    "An investigative journalism piece on food waste", "A panel on globalization and local economies",
    "A documentary narration on ocean conservation", "A TED talk on cognitive biases",
    "A discussion on the future of journalism", "An expert interview on urban planning",
    "A podcast on the science of happiness", "A debate on privacy vs security",
    "A lecture on the history of language", "A panel on renewable energy policy",
    "An interview with a human rights advocate", "A talk on the impact of social media on democracy",
    "A documentary excerpt on space exploration", "A discussion on immigration and identity",
    "A lecture on behavioral economics", "A podcast on the philosophy of work",
    "A debate on universal basic income", "A talk on cross-cultural communication",
  ],
  C1: [
    "A keynote on the paradox of choice in modern society",
    "A symposium discussion on algorithmic accountability",
    "An in-depth analysis of post-truth politics",
    "A lecture on the neuroscience of language acquisition",
    "A panel debate on the ethics of genetic engineering",
    "A documentary narration on the anthropocene era",
    "An academic talk on the economics of inequality",
    "A roundtable on intellectual property in the digital age",
    "A lecture on the philosophy of consciousness",
    "A discussion on the geopolitics of energy transition",
    "An expert analysis of media bias and framing",
    "A talk on the intersection of art and technology",
    "A debate on the limits of free expression",
    "A lecture on systemic risk in financial markets",
    "A podcast deep-dive on collective memory and identity",
    "A symposium on the future of higher education",
    "An analysis of power dynamics in international diplomacy",
    "A talk on the ethics of surveillance capitalism",
    "A discussion on biodiversity loss and ecosystem collapse",
    "A lecture on the rhetoric of political persuasion",
  ],
};

const generateBodySchema = z.object({
  level: z.enum(CEFR_LEVELS),
  topic: z.string().min(1).max(300),
});

router.get("/english/mentor/attenborough/topics", requireAuth, async (req, res, next) => {
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

router.post("/english/mentor/attenborough/generate", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    if (activeTiers.length === 0) {
      res.status(403).json({ error: "No active package" });
      return;
    }

    const parsed = generateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    const { level, topic } = parsed.data;

    if (!canAccessLevel(activeTiers, level)) {
      res.status(403).json({ error: "This level belongs to another package." });
      return;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GENERATE_PROMPT(level, topic) },
        { role: "user", content: `Create a listening exercise about: "${topic}"` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let exercise: unknown;
    try {
      exercise = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
      exercise = JSON.parse(cleaned);
    }

    const ex = exercise as Record<string, unknown>;
    if (
      !ex ||
      typeof ex.script !== "string" ||
      typeof ex.title !== "string" ||
      !Array.isArray(ex.questions) ||
      ex.questions.length === 0
    ) {
      res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
      return;
    }

    res.json({ exercise });
  } catch (err) {
    req.log.error({ err }, "Attenborough generate error");
    res.status(500).json({ error: "Exercise generation failed. Please try again." });
  }
});

export default router;
