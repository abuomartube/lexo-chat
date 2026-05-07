// Generate 6 interactive exercises per Book 1 lesson (Lexo For English).
// Sources content strictly from the lesson's own sections + vocab.
// Idempotent: deletes prior source='ai' exercises for these lessons first.
//
// Hard rules (matches user constraints):
//   - Only writes to english_exercises. Never touches flashcards/IELTS/quizzes.
//   - Links via lesson_id only (set on insert).
//   - Difficulty inherited from lesson.level.
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

type Vocab = { word_id: number; en: string; ar: string; display_order: number };
type Lesson = { id: number; lesson_number: number; level: string; title: string; title_ar: string | null };

type Ex = {
  type: string;
  prompt: string;
  promptAr: string;
  payload: unknown;
  solution: unknown;
};

function pickN<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

function tokenize(s: string): string[] {
  // Keep punctuation attached; split on whitespace.
  return s.trim().split(/\s+/);
}

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function genExercises(
  lesson: Lesson,
  vocab: Vocab[],
  byKind: Record<string, any>,
  otherLessonTitles: { en: string; ar: string }[],
): Ex[] {
  const out: Ex[] = [];
  const sentencesItems: { en: string; ar: string }[] = byKind.sentences?.items ?? [];
  const conversation: { speaker: string; en: string; ar: string }[] = byKind.conversation?.turns ?? [];
  const story: { en: string; ar: string }[] = byKind.short_story?.paragraphs ?? [];
  const grammar = byKind.grammar ?? {};
  const writing = byKind.writing_prompt ?? {};

  const v0 = vocab[0]!;
  const v1 = vocab[1] ?? v0;
  const v2 = vocab[2] ?? v0;
  const v3 = vocab[3] ?? v0;

  // 1) MCQ — vocabulary meaning (English -> Arabic, distractors from same lesson)
  {
    const choices = pickN(shuffleSeeded(vocab, lesson.id * 7), 4);
    const correctIndex = choices.findIndex((c) => c.word_id === v0.word_id);
    const finalChoices =
      correctIndex >= 0
        ? choices
        : [v0, ...choices.filter((c) => c.word_id !== v0.word_id).slice(0, 3)];
    const idx = finalChoices.findIndex((c) => c.word_id === v0.word_id);
    out.push({
      type: "mcq",
      prompt: `What does "${v0.en}" mean?`,
      promptAr: `ما معنى كلمة "${v0.en}"؟`,
      payload: {
        word_id: v0.word_id,
        word_en: v0.en,
        choices: finalChoices.map((c) => ({ en: c.en, ar: c.ar, word_id: c.word_id })),
      },
      solution: { correctIndex: idx, correct_word_id: v0.word_id },
    });
  }

  // 2) Fill blank — pick a sentence containing a vocab word; blank that word
  {
    let chosen: { sentence: { en: string; ar: string }; word: Vocab } | null = null;
    for (const s of sentencesItems) {
      const lower = s.en.toLowerCase();
      const w = vocab.find((vv) => {
        const en = vv.en.toLowerCase();
        // Prefer multi-word match or whole-word match
        return new RegExp(`\\b${en.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(lower);
      });
      if (w) {
        chosen = { sentence: s, word: w };
        break;
      }
    }
    if (!chosen) {
      // Fallback: blank "is" or first noun-ish token of first sentence
      const s = sentencesItems[0] ?? { en: `${v0.en} is important.`, ar: `${v0.ar} مهم.` };
      chosen = { sentence: s, word: v0 };
    }
    const re = new RegExp(`\\b${chosen.word.en.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i");
    const blanked = chosen.sentence.en.replace(re, "_____");
    out.push({
      type: "fill_blank",
      prompt: `Fill the blank: ${blanked}`,
      promptAr: `املأ الفراغ: ${blanked}`,
      payload: {
        sentence_en: chosen.sentence.en,
        sentence_ar: chosen.sentence.ar,
        blanked_en: blanked,
        choices: pickN(shuffleSeeded(vocab, lesson.id * 13), 4).map((c) => c.en),
      },
      solution: { answer: chosen.word.en, word_id: chosen.word.word_id },
    });
  }

  // 3) Matching — 4 vocab pairs (en <-> ar)
  {
    const pairs = pickN(shuffleSeeded(vocab, lesson.id * 17), Math.min(4, vocab.length)).map((c) => ({
      en: c.en,
      ar: c.ar,
      word_id: c.word_id,
    }));
    out.push({
      type: "matching",
      prompt: "Match each English word to its Arabic meaning.",
      promptAr: "طابق كل كلمة إنجليزية مع معناها العربي.",
      payload: {
        left: pairs.map((p) => ({ key: p.word_id, text: p.en })),
        right: shuffleSeeded(pairs, lesson.id * 19).map((p) => ({ key: p.word_id, text: p.ar })),
      },
      solution: { pairs: pairs.map((p) => ({ left: p.word_id, right: p.word_id })) },
    });
  }

  // 4) Sentence build — pick a sentence (prefer one from conversation, else sentences)
  {
    const candidate =
      conversation[0]?.en ?? sentencesItems[0]?.en ?? `${v0.en} is good.`;
    const candidateAr =
      conversation[0]?.ar ?? sentencesItems[0]?.ar ?? `${v0.ar} جيد.`;
    const tokens = tokenize(candidate);
    const shuffled = shuffleSeeded(tokens, lesson.id * 23);
    out.push({
      type: "sentence_build",
      prompt: "Reorder the words to make a correct sentence.",
      promptAr: "أعد ترتيب الكلمات لتكوين جملة صحيحة.",
      payload: {
        tokens_shuffled: shuffled,
        hint_ar: candidateAr,
      },
      solution: { tokens_ordered: tokens, sentence_en: candidate },
    });
  }

  // 5) Reading check — comprehension on the short story (which lesson title fits?)
  {
    const passageEn = story.map((p) => p.en).join(" ");
    const passageAr = story.map((p) => p.ar).join(" ");
    const distractors = shuffleSeeded(otherLessonTitles, lesson.id * 29).slice(0, 3);
    const choices = shuffleSeeded(
      [{ en: lesson.title, ar: lesson.title_ar ?? lesson.title }, ...distractors],
      lesson.id * 31,
    );
    const correctIndex = choices.findIndex((c) => c.en === lesson.title);
    out.push({
      type: "reading_check",
      prompt: "Read the short story. Which title best fits the story?",
      promptAr: "اقرأ القصة القصيرة. أي عنوان يناسب القصة أكثر؟",
      payload: {
        passage_en: passageEn,
        passage_ar: passageAr,
        choices,
      },
      solution: { correctIndex, correct_title: lesson.title },
    });
  }

  // 6) Vocabulary recall — Arabic prompt -> English answer (drills last vocab word)
  {
    const target = vocab[vocab.length - 1] ?? v0;
    out.push({
      type: "vocabulary_recall",
      prompt: `Type the English word for: "${target.ar}"`,
      promptAr: `اكتب الكلمة الإنجليزية المقابلة لـ: "${target.ar}"`,
      payload: {
        word_id: target.word_id,
        prompt_ar: target.ar,
        accept_case_insensitive: true,
      },
      solution: { answer_en: target.en, word_id: target.word_id },
    });
  }

  return out;
}

async function main() {
  const bookId = Number(process.argv[2] ?? 1);

  const lessonsRes = await db.execute<Lesson>(sql`
    SELECT id, lesson_number, level, title, title_ar
    FROM english_lessons WHERE book_id=${bookId} ORDER BY lesson_number
  `);
  const lessons = lessonsRes.rows;
  if (lessons.length === 0) {
    console.error(`No lessons found for book_id=${bookId}`);
    process.exit(1);
  }
  const ids = lessons.map((l) => l.id);

  // Idempotent: clear previous AI-generated exercises for these lessons.
  await db.execute(
    sql`DELETE FROM english_exercises WHERE source='ai' AND lesson_id IN (${sql.join(
      ids.map((i) => sql`${i}`),
      sql`, `,
    )})`,
  );

  const otherTitles = lessons.map((l) => ({ en: l.title, ar: l.title_ar ?? l.title }));

  let total = 0;
  const perLesson: Record<number, number> = {};
  const failed: { lesson_number: number; error: string }[] = [];

  for (const lesson of lessons) {
    try {
      const vocab = (
        await db.execute<Vocab>(sql`
          SELECT v.word_id, w.english AS en, w.arabic AS ar, v.display_order
          FROM english_lesson_vocab v JOIN words w ON v.word_id=w.id
          WHERE v.lesson_id=${lesson.id} ORDER BY v.display_order
        `)
      ).rows;

      const sectionsRes = await db.execute<{ kind: string; body: any }>(sql`
        SELECT kind, body FROM english_lesson_sections WHERE lesson_id=${lesson.id}
      `);
      const byKind: Record<string, any> = {};
      for (const s of sectionsRes.rows) byKind[s.kind] = s.body;

      const exercises = genExercises(
        lesson,
        vocab,
        byKind,
        otherTitles.filter((t) => t.en !== lesson.title),
      );

      for (const ex of exercises) {
        await db.execute(sql`
          INSERT INTO english_exercises
            (level, type, prompt, prompt_ar, payload, solution, xp_reward, lesson_id, source, is_active)
          VALUES (
            ${lesson.level}, ${ex.type}, ${ex.prompt}, ${ex.promptAr},
            ${JSON.stringify(ex.payload)}::jsonb,
            ${JSON.stringify(ex.solution)}::jsonb,
            10, ${lesson.id}, 'ai', true
          )
        `);
        total++;
      }
      perLesson[lesson.lesson_number] = exercises.length;
    } catch (e) {
      failed.push({ lesson_number: lesson.lesson_number, error: String(e) });
    }
  }

  console.log(JSON.stringify({ ok: failed.length === 0, bookId, totalInserted: total, perLesson, failed }, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
