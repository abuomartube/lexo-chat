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
  A1: "absolute beginner (CEFR A1). Expect very simple sentences, basic present tense, limited vocabulary (200–400 words). Feedback should use very simple English. Focus on basic sentence formation and common word usage.",
  A2: "elementary learner (CEFR A2). Expect simple sentences about familiar topics, basic past/present tense, vocabulary of 400–800 words. Give clear, simple feedback. Focus on sentence completeness and basic grammar.",
  B1: "pre-intermediate learner (CEFR B1). Expect connected sentences, past/present/future tenses, some linking words. Vocabulary 800–1500 words. Focus on paragraph coherence, varied sentence starters, and common grammar patterns.",
  "B1+": "intermediate learner (CEFR B1+). Expect paragraphs with opinions and reasons. More complex grammar, conditional sentences. Focus on paragraph organization, cohesion, and vocabulary range.",
  B2: "upper-intermediate learner (CEFR B2). Expect well-organized paragraphs with clear arguments. Complex grammar, idiomatic language emerging. Focus on nuance, register, advanced connectors, and precision.",
  C1: "proficient learner (CEFR C1). Expect sophisticated, well-structured writing. Rich vocabulary, complex grammar, varied sentence structures. Focus on style, subtlety, academic/professional register, and native-like fluency.",
};

const WRITING_PROMPT = (level: CefrLevel, task: string) =>
  `You are Orwell, an experienced, encouraging English writing teacher reviewing a student's paragraph.

STUDENT LEVEL: ${LEVEL_GUIDELINES[level]}

WRITING TASK: "${task}"

Analyse the student's writing carefully. Be honest, specific, and constructive. Your goal is to help them become a better writer.

Return ONLY a valid JSON object with NO markdown fencing:

{
  "correctedVersion": "The student's paragraph with ALL grammar, spelling, and punctuation errors fixed. Keep the student's original ideas and style — only fix mistakes.",
  "improvedVersion": "A more natural, polished rewrite of the paragraph that a native speaker might write at a similar level. Keep the same ideas but improve flow, word choice, and naturalness.",
  "grammarFeedback": [
    { "error": "exact phrase with the mistake", "correction": "corrected version", "rule": "1-sentence grammar rule explanation" }
  ],
  "vocabularySuggestions": [
    { "original": "basic word/phrase used", "better": "more natural or precise alternative", "reason": "1-sentence explanation" }
  ],
  "sentenceStructure": "2-3 sentences about sentence variety, length, and flow. Comment on whether sentences feel natural or repetitive.",
  "paragraphOrganization": "2-3 sentences about how well the paragraph is organized. Does it have a clear topic sentence, supporting details, and a logical flow?",
  "overallSummary": "2-3 sentence honest overall assessment. Mention specific strengths and what to work on next.",
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}

Rules:
- Limit grammarFeedback to the 5 most important errors.
- Limit vocabularySuggestions to the 5 most useful upgrades.
- "error" fields MUST be exact phrases from the student's writing.
- Tailor complexity of feedback to the student's ${level} level.
- Be encouraging but honest. Celebrate what they did well.
- No exam scores or exam language. This is General English writing practice.`;

const TASKS_BY_LEVEL: Record<CefrLevel, string[]> = {
  A1: [
    "Write about yourself", "Describe your family", "My favorite food",
    "My daily routine", "Describe your house", "My best friend",
    "What I like to do", "My school or work", "A place I like",
    "Things I can do", "My favorite animal", "What I eat for breakfast",
    "The weather today", "My bedroom", "A happy day",
    "My favorite color and why", "What I do on weekends", "My teacher",
    "Things in my bag", "A picture I like",
  ],
  A2: [
    "My last weekend", "A vacation I took", "My favorite hobby",
    "A person I admire", "Describe your city", "A book or movie I like",
    "My morning routine", "A special celebration", "What I want to learn",
    "My neighborhood", "A gift I received", "An interesting job",
    "My favorite season", "A meal I cooked", "A sport I enjoy",
    "Something I am good at", "A funny experience", "My dream house",
    "A place I visited", "What makes me happy",
  ],
  B1: [
    "The advantages of learning English", "A memorable trip",
    "How technology changed my life", "My opinion about social media",
    "A challenge I overcame", "Why reading is important",
    "Describe your ideal weekend", "The best advice I ever received",
    "How I stay healthy", "A tradition in my culture",
    "The importance of friendship", "A skill I want to develop",
    "My favorite place in my city", "How music affects mood",
    "An experience that taught me something", "Life in a big city vs small town",
    "My plans for the future", "A news story that interested me",
    "Why exercise matters", "Something I changed my mind about",
  ],
  "B1+": [
    "Should schools teach more life skills?",
    "The impact of technology on communication",
    "Describe a time you had to make a difficult decision",
    "The role of tradition in modern society",
    "Is social media good for society?",
    "The importance of work-life balance",
    "How travel broadens the mind",
    "Should people follow their passion or choose practical careers?",
    "The influence of advertising on people",
    "A cultural difference that surprised me",
    "How do you define success?",
    "The pros and cons of remote work",
    "Should everyone learn a second language?",
    "The effect of music on learning",
    "How can communities become more inclusive?",
    "A time I stepped outside my comfort zone",
    "The role of sports in building character",
    "How has your perspective changed over time?",
    "What makes a good leader?",
    "The value of volunteering",
  ],
  B2: [
    "To what extent does social media shape public opinion?",
    "Should governments invest more in renewable energy?",
    "How does globalization affect local cultures?",
    "The ethical implications of artificial intelligence",
    "Is competition always beneficial?",
    "How can education systems better prepare students for the real world?",
    "The relationship between money and happiness",
    "Should there be limits on free speech?",
    "How do stereotypes affect society?",
    "The role of art in social change",
    "Is privacy more important than security?",
    "How has the concept of work changed in recent decades?",
    "The impact of urbanization on the environment",
    "Should voting be mandatory?",
    "How do childhood experiences shape adult behavior?",
    "The pros and cons of a cashless society",
    "Is it possible to be truly objective?",
    "The future of traditional media",
    "How does language influence thought?",
    "The balance between individual rights and collective responsibility",
  ],
  C1: [
    "Critically evaluate the role of technology in shaping human relationships",
    "To what extent should economic growth take priority over environmental sustainability?",
    "Analyze the tension between cultural preservation and modernization",
    "How does power dynamics in language shape social hierarchies?",
    "Evaluate the effectiveness of international cooperation on global challenges",
    "The paradox of choice in consumer societies",
    "How do cognitive biases undermine rational decision-making?",
    "The role of dissent in a functioning democracy",
    "Examine the ethical boundaries of scientific research",
    "How has digital literacy redefined what it means to be educated?",
    "The implications of algorithmic decision-making on individual autonomy",
    "Critically assess the concept of meritocracy",
    "How does collective memory shape national identity?",
    "The intersection of ethics and innovation in healthcare",
    "Evaluate the claim that globalization benefits everyone equally",
    "The philosophical implications of artificial consciousness",
    "How do economic systems influence moral behavior?",
    "The role of narrative in constructing personal identity",
    "Examine the concept of intellectual property in the digital age",
    "The tension between efficiency and equity in public policy",
  ],
};

const submitBodySchema = z.object({
  level: z.enum(CEFR_LEVELS),
  task: z.string().min(1).max(300),
  text: z.string().min(1).max(5000),
});

router.get("/english/mentor/orwell/tasks", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    if (activeTiers.length === 0) {
      res.status(403).json({ error: "No active package" });
      return;
    }
    const allowed = getAllowedLevels(activeTiers);
    const tasks: Record<string, string[]> = {};
    for (const lvl of allowed) {
      tasks[lvl] = TASKS_BY_LEVEL[lvl];
    }
    res.json({ tasks, allowedLevels: allowed, activeTiers });
  } catch (err) {
    next(err);
  }
});

router.post("/english/mentor/orwell/submit", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const activeTiers = await getStudentActiveTiers(userId);
    if (activeTiers.length === 0) {
      res.status(403).json({ error: "No active package" });
      return;
    }

    const parsed = submitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }

    const { level, task, text } = parsed.data;

    if (!canAccessLevel(activeTiers, level)) {
      res.status(403).json({ error: "This level belongs to another package." });
      return;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: WRITING_PROMPT(level, task) },
        { role: "user", content: text },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let feedback: unknown;
    try {
      feedback = JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
      feedback = JSON.parse(cleaned);
    }

    res.json({ feedback });
  } catch (err) {
    req.log.error({ err }, "Orwell submit error");
    res.status(500).json({ error: "Feedback generation failed. Please try again." });
  }
});

export default router;
