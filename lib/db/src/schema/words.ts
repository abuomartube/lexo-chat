import { pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

export const wordsTable = pgTable(
  "words",
  {
    id: serial("id").primaryKey(),
    level: text("level").notNull(),
    english: text("english").notNull(),
    pos: text("pos").notNull().default(""),
    arabic: text("arabic"),
    sentenceEn: text("sentence_en"),
    sentenceAr: text("sentence_ar"),
    audioWordPath: text("audio_word_path"),
    audioSentencePath: text("audio_sentence_path"),
  },
  (table) => ({
    uniq: uniqueIndex("words_level_english_pos_idx").on(
      table.level,
      table.english,
      table.pos,
    ),
  }),
);

export type Word = typeof wordsTable.$inferSelect;
export type InsertWord = typeof wordsTable.$inferInsert;
