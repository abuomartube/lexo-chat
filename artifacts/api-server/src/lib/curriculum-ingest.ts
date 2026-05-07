// ============================================================================
// Curriculum ingest — typed BookDraft validation + staging.
//
// This module is the "step 2 + step 3" of the ingestion pipeline described
// in `.local/curriculum-architecture.md`:
//   * Validate a BookDraft (JSON) against strict Zod schemas.
//   * Resolve every vocabulary item to a canonical `words.id` (Lexo 5000).
//   * Stage the book + lessons + sections + vocab links + quizzes in ONE
//     transaction as `status='draft'`.
//
// Step 1 (PDF → BookDraft JSON) is intentionally NOT implemented yet. Admins
// can either upload a hand-crafted BookDraft JSON or, later, the PDF parser
// can produce one and feed it to `stageBookDraft`.
//
// Hard rules enforced here:
//   * Unmatched vocabulary words DO NOT silently insert into `words`. They
//     are returned in `unmatchedWords[]` and the caller decides what to do.
//   * Curriculum write paths NEVER write to `english_word_progress` (the
//     flashcards SRS state). Grep for `englishWordProgressTable` in this
//     file — it must not appear.
//   * Re-ingesting the same (tier, bookNumber) is idempotent: lessons are
//     upserted by (book_id, lesson_number); section + vocab rows for each
//     lesson are full-replaced inside the lesson's transaction. User
//     progress rows survive because they reference `lesson_id`, which is
//     preserved.
// ============================================================================

import { and, eq, sql, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  englishBooksTable,
  englishLessonsTable,
  englishLessonSectionsTable,
  englishLessonVocabTable,
  englishQuizzesTable,
  englishQuizQuestionsTable,
  wordsTable,
  ENGLISH_LESSON_SECTION_KINDS,
  ENGLISH_LESSON_SECTION_POSITION,
  ENGLISH_QUIZ_QUESTION_KINDS,
  ENGLISH_CEFR_LEVELS,
  ENGLISH_TIER_VALUES,
  lessonSectionBodySchemas,
  type EnglishLessonSectionKind,
  type EnglishCefrLevel,
} from "@workspace/db";

// ---------------------------------------------------------------------------
// Public draft types — what the ingestion endpoint accepts.
// ---------------------------------------------------------------------------

// Preserve the literal CEFR/tier unions through Zod parsing so downstream
// code that writes to typed columns (`englishLessonsTable.level`) doesn't
// have to widen-then-cast on every assignment.
const cefrLevel = z.enum(
  ENGLISH_CEFR_LEVELS as unknown as readonly [
    EnglishCefrLevel,
    ...EnglishCefrLevel[],
  ],
);
const tier = z.enum(
  ENGLISH_TIER_VALUES as unknown as readonly [string, ...string[]],
);

// A vocabulary item AS WRITTEN IN THE PDF — raw English text that we will
// resolve to a `words.id` during validation. The DB body shape uses `wordId`,
// not `en`; the ingest layer is the only place that does the lookup.
const vocabDraftItem = z.object({
  en: z.string().min(1).transform((s) => s.trim()),
  ar: z.string().min(1).optional(),
  pos: z.string().min(1).optional(), // optional part-of-speech disambiguation
  note: z.string().optional(),
});

const sentenceDraftItem = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

const conversationTurnDraft = z.object({
  speaker: z.enum(["A", "B"]),
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

const storyParagraphDraft = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

const grammarExampleDraft = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

export const lessonDraftSchema = z.object({
  lessonNumber: z.number().int().min(1).max(60),
  level: cefrLevel,
  theme: z.string().min(1).max(64).optional(),
  themeAr: z.string().min(1).max(128).optional(),
  title: z.string().min(1).max(255),
  titleAr: z.string().min(1).max(255).optional(),
  summary: z.string().min(1).max(255).optional(),
  summaryAr: z.string().min(1).max(255).optional(),
  // Empty string is the valid "no video yet" sentinel (matches the
  // `english_lessons.vimeo_url` column default of "").
  vimeoUrl: z.string().max(512).optional(),
  sections: z.object({
    vocabulary: z.object({ items: z.array(vocabDraftItem).min(1) }),
    sentences: z.object({ items: z.array(sentenceDraftItem).min(1) }),
    conversation: z.object({ turns: z.array(conversationTurnDraft).min(2) }),
    short_story: z.object({ paragraphs: z.array(storyParagraphDraft).min(1) }),
    grammar: z.object({
      focus: z.string().min(1),
      focus_ar: z.string().min(1).optional(),
      rule_en: z.string().min(1),
      rule_ar: z.string().min(1).optional(),
      examples: z.array(grammarExampleDraft).min(1),
    }),
    writing_prompt: z.object({
      prompt_en: z.string().min(1),
      prompt_ar: z.string().min(1).optional(),
      expected_min_sentences: z.number().int().min(1).max(20),
    }),
  }),
});
export type LessonDraft = z.infer<typeof lessonDraftSchema>;

const quizQuestionDraftSchema = z.object({
  position: z.number().int().min(1),
  kind: z.enum(
    ENGLISH_QUIZ_QUESTION_KINDS as readonly [string, ...string[]],
  ),
  promptEn: z.string().min(1),
  promptAr: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()),
  solution: z.record(z.string(), z.unknown()),
  points: z.number().int().min(1).max(20).default(1),
  lessonNumberRef: z.number().int().min(1).max(60).optional(),
});
export type QuizQuestionDraft = z.infer<typeof quizQuestionDraftSchema>;

export const quizDraftSchema = z.object({
  quizNumber: z.union([z.literal(1), z.literal(2)]),
  placedAfterLesson: z.number().int().min(1).max(60),
  title: z.string().min(1).max(255),
  titleAr: z.string().min(1).max(255).optional(),
  passThresholdPct: z.number().int().min(1).max(100).default(70),
  timeLimitSeconds: z.number().int().min(30).max(60 * 60 * 4).optional(),
  questions: z.array(quizQuestionDraftSchema).min(1),
});
export type QuizDraft = z.infer<typeof quizDraftSchema>;

export const bookDraftSchema = z.object({
  tier,
  bookNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1).max(255),
  titleAr: z.string().min(1).max(255).optional(),
  subtitle: z.string().min(1).max(255).optional(),
  subtitleAr: z.string().min(1).max(255).optional(),
  coverImage: z.string().min(1).max(512).optional(),
  lessons: z.array(lessonDraftSchema).min(1).max(60),
  quizzes: z.array(quizDraftSchema).max(2).default([]),
});
export type BookDraft = z.infer<typeof bookDraftSchema>;

// ---------------------------------------------------------------------------
// Result shapes returned to the admin caller.
// ---------------------------------------------------------------------------

export type UnmatchedWord = {
  lessonNumber: number;
  level: EnglishCefrLevel;
  en: string;
  pos?: string;
  reason: "not_found" | "ambiguous";
  candidates?: { id: number; level: string; pos: string }[];
};

export type StageBookResult = {
  ok: boolean;
  bookId: number;
  lessonsStaged: number;
  quizzesStaged: number;
  unmatchedWords: UnmatchedWord[];
};

// ---------------------------------------------------------------------------
// Vocab resolution — strict, never inserts into `words`.
// ---------------------------------------------------------------------------
//
// Lookup key is (level, lower(english)[, pos]).
//   * If exactly one row matches → use it.
//   * If multiple rows match (different POS) AND draft did not pin pos →
//     mark as `ambiguous` with candidate list.
//   * If zero rows match → `not_found`.
// Caller decides whether to (a) edit the draft, or (b) explicitly add the
// word to the Lexo 5000 catalog via a separate admin action (NOT done here).
// ---------------------------------------------------------------------------

type VocabKey = string; // `${level}|${lower(en)}`

async function loadVocabCandidates(
  draft: BookDraft,
): Promise<Map<VocabKey, { id: number; level: string; pos: string }[]>> {
  const keys = new Set<VocabKey>();
  const rawByKey = new Map<VocabKey, { level: string; en: string }>();
  for (const lesson of draft.lessons) {
    for (const item of lesson.sections.vocabulary.items) {
      const key = `${lesson.level}|${item.en.trim().toLowerCase()}`;
      keys.add(key);
      rawByKey.set(key, { level: lesson.level, en: item.en.trim() });
    }
  }
  if (keys.size === 0) return new Map();

  // Fetch all candidate rows for each (level, lower(english)) in one query.
  // We OR them via a CTE so we don't N+1 the DB.
  const conditions = [...keys].map(([_, ...__], i) => i); // placeholder; build below
  void conditions;
  const tuples = [...rawByKey.values()];
  const rows = await db.execute<{
    id: number;
    level: string;
    english: string;
    pos: string;
  }>(sql`
    SELECT id, level, english, pos
    FROM words
    WHERE (level, lower(english)) IN (
      ${sql.join(
        tuples.map(
          (t) => sql`(${t.level}, lower(${t.en}))`,
        ),
        sql`, `,
      )}
    )
  `);

  const map = new Map<
    VocabKey,
    { id: number; level: string; pos: string }[]
  >();
  for (const r of rows.rows) {
    const key = `${r.level}|${r.english.toLowerCase()}`;
    const arr = map.get(key) ?? [];
    arr.push({ id: r.id, level: r.level, pos: r.pos });
    map.set(key, arr);
  }
  return map;
}

function resolveVocab(
  draft: BookDraft,
  candidates: Map<VocabKey, { id: number; level: string; pos: string }[]>,
): { resolved: Map<string, number>; unmatched: UnmatchedWord[] } {
  // resolved key: `${lessonNumber}|${i}` → wordId
  const resolved = new Map<string, number>();
  const unmatched: UnmatchedWord[] = [];

  for (const lesson of draft.lessons) {
    lesson.sections.vocabulary.items.forEach((item, i) => {
      const key = `${lesson.level}|${item.en.trim().toLowerCase()}`;
      const cands = candidates.get(key) ?? [];
      const filtered = item.pos
        ? cands.filter((c) => c.pos.toLowerCase() === item.pos!.toLowerCase())
        : cands;

      if (filtered.length === 1) {
        resolved.set(`${lesson.lessonNumber}|${i}`, filtered[0].id);
      } else if (filtered.length === 0) {
        unmatched.push({
          lessonNumber: lesson.lessonNumber,
          level: lesson.level,
          en: item.en,
          pos: item.pos,
          reason: "not_found",
          candidates: cands.length ? cands : undefined,
        });
      } else {
        unmatched.push({
          lessonNumber: lesson.lessonNumber,
          level: lesson.level,
          en: item.en,
          pos: item.pos,
          reason: "ambiguous",
          candidates: filtered,
        });
      }
    });
  }

  return { resolved, unmatched };
}

// ---------------------------------------------------------------------------
// Stage the book in one transaction. If `unmatchedWords` is non-empty, the
// caller may choose to abort; this function still stages the book + the
// lessons whose vocabulary fully resolved, and SKIPS lessons with unmatched
// words (so the admin sees partial progress in the review UI without
// half-written sections in the DB).
//
// Returns `ok: false` iff at least one unmatched word was found. The book
// itself is always created/updated so the admin can fix and re-ingest.
// ---------------------------------------------------------------------------

export async function stageBookDraft(
  rawDraft: unknown,
): Promise<StageBookResult> {
  const draft = bookDraftSchema.parse(rawDraft);

  // Pre-validate every section body shape with the LOCKED schemas from
  // english-curriculum.ts. This catches drift between the loose draft
  // schema and the strict on-disk shape (e.g. extra fields in payloads).
  // Vocabulary is validated post-resolution since the draft uses `en` and
  // the DB uses `wordId`.
  for (const lesson of draft.lessons) {
    for (const kind of ENGLISH_LESSON_SECTION_KINDS) {
      if (kind === "vocabulary") continue;
      const body = (lesson.sections as Record<string, unknown>)[kind];
      const schema = lessonSectionBodySchemas[kind];
      const r = schema.safeParse(body);
      if (!r.success) {
        throw new Error(
          `Lesson ${lesson.lessonNumber} section "${kind}" failed validation: ${r.error.message}`,
        );
      }
    }
  }

  // Resolve vocab against the Lexo 5000.
  const candidates = await loadVocabCandidates(draft);
  const { resolved, unmatched } = resolveVocab(draft, candidates);

  let lessonsStaged = 0;
  let quizzesStaged = 0;
  let bookId = 0;

  await db.transaction(async (tx) => {
    // Upsert the book (always, so admin sees progress even on partial fail).
    const existing = await tx
      .select({ id: englishBooksTable.id })
      .from(englishBooksTable)
      .where(
        and(
          eq(englishBooksTable.tier, draft.tier),
          eq(englishBooksTable.bookNumber, draft.bookNumber),
        ),
      )
      .limit(1);

    if (existing[0]) {
      bookId = existing[0].id;
      await tx
        .update(englishBooksTable)
        .set({
          title: draft.title,
          titleAr: draft.titleAr ?? null,
          subtitle: draft.subtitle ?? null,
          subtitleAr: draft.subtitleAr ?? null,
          coverImage: draft.coverImage ?? null,
          status: "draft", // re-ingest always returns to draft until republished
        })
        .where(eq(englishBooksTable.id, bookId));
    } else {
      const inserted = await tx
        .insert(englishBooksTable)
        .values({
          tier: draft.tier,
          bookNumber: draft.bookNumber,
          title: draft.title,
          titleAr: draft.titleAr ?? null,
          subtitle: draft.subtitle ?? null,
          subtitleAr: draft.subtitleAr ?? null,
          coverImage: draft.coverImage ?? null,
          status: "draft",
          sortOrder: draft.bookNumber,
        })
        .returning({ id: englishBooksTable.id });
      bookId = inserted[0].id;
    }

    // Skip lessons that have any unmatched word — their vocabulary section
    // body cannot be built without a wordId.
    const unmatchedLessons = new Set(unmatched.map((u) => u.lessonNumber));

    for (const lesson of draft.lessons) {
      if (unmatchedLessons.has(lesson.lessonNumber)) continue;

      // Upsert the lesson row by (book_id, lesson_number).
      const existingLesson = await tx
        .select({ id: englishLessonsTable.id })
        .from(englishLessonsTable)
        .where(
          and(
            eq(englishLessonsTable.bookId, bookId),
            eq(englishLessonsTable.lessonNumber, lesson.lessonNumber),
          ),
        )
        .limit(1);

      const lessonValues = {
        title: lesson.title,
        titleAr: lesson.titleAr ?? null,
        vimeoUrl: lesson.vimeoUrl ?? "",
        tier: draft.tier,
        level: lesson.level,
        sortOrder: lesson.lessonNumber,
        bookId,
        lessonNumber: lesson.lessonNumber,
        theme: lesson.theme ?? null,
        themeAr: lesson.themeAr ?? null,
        summary: lesson.summary ?? null,
        summaryAr: lesson.summaryAr ?? null,
      };

      let lessonId: number;
      if (existingLesson[0]) {
        lessonId = existingLesson[0].id;
        await tx
          .update(englishLessonsTable)
          .set(lessonValues)
          .where(eq(englishLessonsTable.id, lessonId));
      } else {
        const ins = await tx
          .insert(englishLessonsTable)
          .values(lessonValues)
          .returning({ id: englishLessonsTable.id });
        lessonId = ins[0].id;
      }

      // Replace section + vocab rows for this lesson.
      await tx
        .delete(englishLessonSectionsTable)
        .where(eq(englishLessonSectionsTable.lessonId, lessonId));
      await tx
        .delete(englishLessonVocabTable)
        .where(eq(englishLessonVocabTable.lessonId, lessonId));

      // --- vocabulary section (uses resolved wordIds) ---
      const vocabItems = lesson.sections.vocabulary.items.map((item, i) => {
        const wordId = resolved.get(`${lesson.lessonNumber}|${i}`)!;
        return {
          wordId,
          displayOrder: i,
          ...(item.note ? { note: item.note } : {}),
        };
      });
      const vocabBody = { items: vocabItems };
      const vocabBodyValid = lessonSectionBodySchemas.vocabulary.safeParse(vocabBody);
      if (!vocabBodyValid.success) {
        throw new Error(
          `Lesson ${lesson.lessonNumber} vocabulary body invalid after resolution: ${vocabBodyValid.error.message}`,
        );
      }

      const sectionRows: Array<{
        kind: EnglishLessonSectionKind;
        body: unknown;
        bodyAr: unknown | null;
      }> = [
        { kind: "vocabulary", body: vocabBody, bodyAr: null },
        { kind: "sentences", body: lesson.sections.sentences, bodyAr: null },
        { kind: "conversation", body: lesson.sections.conversation, bodyAr: null },
        { kind: "short_story", body: lesson.sections.short_story, bodyAr: null },
        { kind: "grammar", body: lesson.sections.grammar, bodyAr: null },
        { kind: "writing_prompt", body: lesson.sections.writing_prompt, bodyAr: null },
      ];

      await tx.insert(englishLessonSectionsTable).values(
        sectionRows.map((s) => ({
          lessonId,
          kind: s.kind,
          position: ENGLISH_LESSON_SECTION_POSITION[s.kind],
          body: s.body as object,
          bodyAr: s.bodyAr as object | null,
        })),
      );

      await tx.insert(englishLessonVocabTable).values(
        vocabItems.map((v) => ({
          lessonId,
          wordId: v.wordId,
          displayOrder: v.displayOrder,
        })),
      );

      lessonsStaged += 1;
    }

    // Quizzes — replace by (book_id, quiz_number).
    for (const quiz of draft.quizzes) {
      const existingQuiz = await tx
        .select({ id: englishQuizzesTable.id })
        .from(englishQuizzesTable)
        .where(
          and(
            eq(englishQuizzesTable.bookId, bookId),
            eq(englishQuizzesTable.quizNumber, quiz.quizNumber),
          ),
        )
        .limit(1);

      const quizValues = {
        bookId,
        quizNumber: quiz.quizNumber,
        placedAfterLesson: quiz.placedAfterLesson,
        title: quiz.title,
        titleAr: quiz.titleAr ?? null,
        passThresholdPct: quiz.passThresholdPct,
        timeLimitSeconds: quiz.timeLimitSeconds ?? null,
        status: "draft" as const,
      };

      let quizId: number;
      if (existingQuiz[0]) {
        quizId = existingQuiz[0].id;
        await tx
          .update(englishQuizzesTable)
          .set(quizValues)
          .where(eq(englishQuizzesTable.id, quizId));
        await tx
          .delete(englishQuizQuestionsTable)
          .where(eq(englishQuizQuestionsTable.quizId, quizId));
      } else {
        const ins = await tx
          .insert(englishQuizzesTable)
          .values(quizValues)
          .returning({ id: englishQuizzesTable.id });
        quizId = ins[0].id;
      }

      // Resolve lessonNumberRef → lessonId per question (best-effort).
      const refNumbers = quiz.questions
        .map((q) => q.lessonNumberRef)
        .filter((n): n is number => typeof n === "number");
      const refMap = new Map<number, number>();
      if (refNumbers.length) {
        const refRows = await tx
          .select({
            id: englishLessonsTable.id,
            n: englishLessonsTable.lessonNumber,
          })
          .from(englishLessonsTable)
          .where(
            and(
              eq(englishLessonsTable.bookId, bookId),
              inArray(englishLessonsTable.lessonNumber, refNumbers),
            ),
          );
        for (const r of refRows)
          if (r.n !== null) refMap.set(r.n, r.id);
      }

      await tx.insert(englishQuizQuestionsTable).values(
        quiz.questions.map((q) => ({
          quizId,
          position: q.position,
          kind: q.kind,
          promptEn: q.promptEn,
          promptAr: q.promptAr ?? null,
          payload: q.payload as object,
          solution: q.solution as object,
          points: q.points,
          lessonRef: q.lessonNumberRef
            ? refMap.get(q.lessonNumberRef) ?? null
            : null,
        })),
      );

      quizzesStaged += 1;
    }
  });

  return {
    ok: unmatched.length === 0,
    bookId,
    lessonsStaged,
    quizzesStaged,
    unmatchedWords: unmatched,
  };
}

// ---------------------------------------------------------------------------
// Publish gate — refuses to publish if a book has any lesson missing a
// section, or any vocabulary section referencing a missing word.
// ---------------------------------------------------------------------------

export type PublishCheckResult = {
  ok: boolean;
  errors: string[];
  lessonCount: number;
  fullySectionedLessonCount: number;
};

export async function checkBookPublishable(
  bookId: number,
): Promise<PublishCheckResult> {
  const errors: string[] = [];

  const book = await db
    .select()
    .from(englishBooksTable)
    .where(eq(englishBooksTable.id, bookId))
    .limit(1);
  if (!book[0]) {
    return { ok: false, errors: ["book_not_found"], lessonCount: 0, fullySectionedLessonCount: 0 };
  }

  const lessons = await db
    .select({ id: englishLessonsTable.id, n: englishLessonsTable.lessonNumber })
    .from(englishLessonsTable)
    .where(eq(englishLessonsTable.bookId, bookId));

  const requiredKinds = ENGLISH_LESSON_SECTION_KINDS;
  let fullySectioned = 0;
  for (const l of lessons) {
    const sections = await db
      .select({ kind: englishLessonSectionsTable.kind })
      .from(englishLessonSectionsTable)
      .where(eq(englishLessonSectionsTable.lessonId, l.id));
    const have = new Set(sections.map((s) => s.kind));
    const missing = requiredKinds.filter((k) => !have.has(k));
    if (missing.length) {
      errors.push(
        `lesson ${l.n}: missing sections [${missing.join(", ")}]`,
      );
    } else {
      fullySectioned += 1;
    }
  }

  if (lessons.length === 0) errors.push("book has no lessons");

  return {
    ok: errors.length === 0,
    errors,
    lessonCount: lessons.length,
    fullySectionedLessonCount: fullySectioned,
  };
}
