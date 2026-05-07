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
  A1: "absolute beginner (CEFR A1). Use only the simplest words (200-400 word vocabulary). Very short, simple sentences (5-8 words). Present tense only. The passage should be 40-60 words total. Questions should be very easy with answers directly stated in the text.",
  A2: "elementary learner (CEFR A2). Use simple everyday vocabulary (400-800 words). Short sentences (8-12 words). Present and simple past tense. The passage should be 60-100 words total. Questions should be straightforward with answers clearly in the text.",
  B1: "pre-intermediate learner (CEFR B1). Use common vocabulary (800-1500 words), some linking words and connectors. Past/present/future tenses. The passage should be 100-150 words total. Questions can require some basic inference.",
  "B1+": "intermediate learner (CEFR B1+). Use moderately varied vocabulary, opinions and reasons. More complex grammar, conditional sentences, relative clauses. The passage should be 150-200 words total. Questions can test understanding of opinions, purpose, and implications.",
  B2: "upper-intermediate learner (CEFR B2). Use natural vocabulary including some idioms and collocations. Complex grammar, nuanced expression, varied paragraph structure. The passage should be 200-280 words total. Questions should test deeper comprehension, inference, and author intent.",
  C1: "proficient learner (CEFR C1). Use rich, sophisticated vocabulary including idioms, phrasal verbs, and figurative language. Complex grammar, varied sentence structures, cohesive argumentation. The passage should be 280-380 words total. Questions should test nuance, tone, critical understanding, and the ability to distinguish between similar ideas.",
};

const GENERATE_PROMPT = (level: CefrLevel, topic: string) =>
  `You are Hemingway, an expert English reading comprehension teacher creating a practice exercise.

STUDENT LEVEL: ${LEVEL_GUIDELINES[level]}

TOPIC: "${topic}"

Create a reading comprehension exercise. Write a short passage (article, story excerpt, letter, blog post, or informational text) on the topic. The passage must be written English text appropriate for reading practice — not a transcript.

Return ONLY a valid JSON object with NO markdown fencing:

{
  "title": "A short, engaging title for this reading passage",
  "passage": "The full reading passage text. Write clear, well-structured English appropriate for the level. Make it interesting and relevant to the topic. Use paragraphs for B1+ and above.",
  "questions": [
    {
      "type": "mcq",
      "question": "A comprehension question about the passage",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact text of the correct option",
      "explanation": "1-2 sentence explanation of why this is correct, referencing the passage"
    },
    {
      "type": "true_false",
      "question": "A true/false statement about the passage",
      "options": ["True", "False"],
      "correctAnswer": "True or False",
      "explanation": "1-2 sentence explanation referencing the passage"
    },
    {
      "type": "short_answer",
      "question": "A question requiring a brief answer from the passage",
      "options": [],
      "correctAnswer": "The expected short answer (a few words)",
      "explanation": "1-2 sentence explanation with the relevant part of the passage"
    },
    {
      "type": "matching",
      "question": "Match each idea with the correct detail from the passage",
      "pairs": [
        { "left": "Idea or concept A", "right": "Matching detail from passage" },
        { "left": "Idea or concept B", "right": "Matching detail from passage" },
        { "left": "Idea or concept C", "right": "Matching detail from passage" }
      ],
      "explanation": "Brief explanation of how the ideas connect to the passage"
    }
  ],
  "vocabulary": [
    {
      "word": "A useful word or phrase from the passage",
      "meaning": "Simple definition appropriate for the student's level",
      "example": "Another example sentence using this word"
    }
  ]
}

Rules:
- Include exactly 6 questions: 2 MCQ, 2 True/False, 1 Short Answer, 1 Matching. Mix up the order (but put matching last).
- Include 4-5 vocabulary items from the passage.
- MCQ options must have exactly 4 choices.
- "correctAnswer" for MCQ must exactly match one of the options.
- "correctAnswer" for true_false must be exactly "True" or "False".
- Short answer "correctAnswer" should be brief (1-5 words).
- Matching "pairs" must have exactly 3 pairs. Each pair has "left" (concept) and "right" (detail).
- Make the passage feel natural and engaging, not like a textbook exercise.
- Tailor everything to the ${level} level.
- No exam language, no band scores, no test-prep style. This is General English reading practice.`;

const TOPICS_BY_LEVEL: Record<CefrLevel, string[]> = {
  A1: [
    "My best friend", "A day at the park", "My favourite food",
    "Going to school", "A letter from a pen pal", "Shopping for groceries",
    "My pet cat", "The weather this week", "A new neighbour",
    "A birthday invitation", "At the playground", "My bedroom",
    "A postcard from holiday", "Breakfast around the world", "A lost toy",
    "My family photo", "A trip to the zoo", "Helping at home",
    "A simple recipe", "The bus ride",
  ],
  A2: [
    "A weekend adventure", "My first job", "Moving to a new city",
    "A review of a restaurant", "How to stay healthy", "A day without a phone",
    "An email to a colleague", "A local festival", "Learning a new hobby",
    "Travel tips for beginners", "A funny thing that happened", "Life in a small town",
    "An unusual pet", "Online vs in-store shopping", "A school memory",
    "Famous landmarks", "A recipe from my country", "The best season",
    "A kind stranger", "Why I love reading",
  ],
  B1: [
    "The benefits of outdoor exercise", "How social media changed communication",
    "A blog post about sustainable fashion", "Growing up bilingual",
    "Why volunteering matters", "A city vs countryside debate",
    "The history of chocolate", "Remote learning experiences",
    "A travel blog: hidden gems in Europe", "The importance of sleep",
    "How music affects mood", "A review of a popular TV show",
    "The rise of electric cars", "Traditional vs modern medicine",
    "The art of storytelling", "Living abroad for the first time",
    "Food waste and what we can do", "A letter to my future self",
    "Why people collect things", "The power of kindness",
  ],
  "B1+": [
    "The psychology of first impressions", "How architecture shapes behaviour",
    "The ethics of fast fashion", "Digital nomads and the future of work",
    "Why some languages disappear", "The science behind habits",
    "A comparison of education systems", "The impact of tourism on local cultures",
    "How advertising influences our choices", "The role of libraries in the digital age",
    "Urban gardening and community building", "The true cost of convenience",
    "How stories shape national identity", "Minimalism as a lifestyle",
    "The changing definition of success", "Introverts in an extrovert world",
    "The relationship between food and memory", "Why people resist change",
    "The art of negotiation", "How colour affects our emotions",
  ],
  B2: [
    "The paradox of choice in consumer culture", "How cognitive biases shape decision-making",
    "The economic case for renewable energy", "Literary analysis: the unreliable narrator",
    "The ethics of data collection in the digital age", "How migration has shaped world cuisines",
    "The psychology of procrastination", "The role of satire in political discourse",
    "Why diverse teams outperform homogeneous ones", "The neuroscience of creativity",
    "Climate justice and global inequality", "The future of urban transportation",
    "How social norms evolve over time", "The cultural significance of street art",
    "The hidden costs of perfectionism", "Technology and the erosion of privacy",
    "The influence of childhood reading on adult empathy", "Rethinking the 40-hour work week",
    "The philosophy of forgiveness", "How language shapes thought",
  ],
  C1: [
    "The rhetoric of persuasion in modern media",
    "Epistemic humility and the limits of expertise",
    "The sociolinguistics of code-switching",
    "Post-colonial perspectives on world literature",
    "The economics of attention in the information age",
    "Algorithmic bias and structural inequality",
    "The phenomenology of nostalgia",
    "Degrowth as an alternative economic paradigm",
    "The ethics of humanitarian intervention",
    "How collective memory shapes political identity",
    "The paradox of tolerance in liberal democracies",
    "Narrative medicine and the art of clinical empathy",
    "The philosophical implications of artificial consciousness",
    "Cultural hegemony and soft power in international relations",
    "The aesthetics of imperfection in Japanese philosophy",
    "Cognitive load theory and its implications for education",
    "The intersection of ecology and indigenous knowledge",
    "Linguistic relativity revisited: new evidence and old debates",
    "The politics of space: architecture as ideology",
    "The moral philosophy of effective altruism",
  ],
};

const generateBodySchema = z.object({
  level: z.enum(CEFR_LEVELS),
  topic: z.string().min(1).max(300),
});

router.get("/english/mentor/hemingway/topics", requireAuth, async (req, res, next) => {
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

router.post("/english/mentor/hemingway/generate", requireAuth, async (req, res, next) => {
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
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GENERATE_PROMPT(level, topic) },
        { role: "user", content: `Create a reading exercise about: "${topic}"` },
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
      typeof ex.passage !== "string" ||
      typeof ex.title !== "string" ||
      !Array.isArray(ex.questions) ||
      ex.questions.length === 0
    ) {
      res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
      return;
    }

    const questions = ex.questions as Record<string, unknown>[];
    for (const q of questions) {
      if (!q || typeof q.question !== "string" || typeof q.explanation !== "string") {
        res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
        return;
      }
      const t = q.type as string;
      if (t === "mcq") {
        if (!Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctAnswer !== "string") {
          res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
          return;
        }
      } else if (t === "true_false") {
        if (typeof q.correctAnswer !== "string" || !["True", "False"].includes(q.correctAnswer)) {
          res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
          return;
        }
      } else if (t === "short_answer") {
        if (typeof q.correctAnswer !== "string") {
          res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
          return;
        }
      } else if (t === "matching") {
        if (!Array.isArray(q.pairs) || q.pairs.length < 2) {
          res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
          return;
        }
        for (const p of q.pairs as Record<string, unknown>[]) {
          if (!p || typeof p.left !== "string" || typeof p.right !== "string") {
            res.status(502).json({ error: "Exercise generation returned invalid data. Please try again." });
            return;
          }
        }
      }
    }

    res.json({ exercise });
  } catch (err) {
    req.log.error({ err }, "Hemingway generate error");
    res.status(500).json({ error: "Exercise generation failed. Please try again." });
  }
});

export default router;
