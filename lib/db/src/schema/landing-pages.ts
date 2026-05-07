import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  serial,
} from "drizzle-orm/pg-core";

export const landingPagesTable = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  course: varchar("course", { length: 32 }).notNull().unique(),
  titleEn: text("title_en").notNull().default(""),
  titleAr: text("title_ar").notNull().default(""),
  subtitleEn: text("subtitle_en").notNull().default(""),
  subtitleAr: text("subtitle_ar").notNull().default(""),
  heroImage: text("hero_image").notNull().default(""),
  heroVideo: text("hero_video").notNull().default(""),
  introVideo: text("intro_video").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  benefitsEn: text("benefits_en").notNull().default(""),
  benefitsAr: text("benefits_ar").notNull().default(""),
  targetStudentEn: text("target_student_en").notNull().default(""),
  targetStudentAr: text("target_student_ar").notNull().default(""),
  whatLearnEn: text("what_learn_en").notNull().default(""),
  whatLearnAr: text("what_learn_ar").notNull().default(""),
  ctaTextEn: text("cta_text_en").notNull().default(""),
  ctaTextAr: text("cta_text_ar").notNull().default(""),
  ctaLink: text("cta_link").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LandingPage = typeof landingPagesTable.$inferSelect;
