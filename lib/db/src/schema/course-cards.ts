import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  serial,
  integer,
  real,
} from "drizzle-orm/pg-core";

export const courseCardsTable = pgTable("course_cards", {
  id: serial("id").primaryKey(),
  courseType: varchar("course_type", { length: 32 }).notNull(),
  titleEn: text("title_en").notNull().default(""),
  titleAr: text("title_ar").notNull().default(""),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  level: varchar("level", { length: 32 }).notNull().default(""),
  price: real("price").notNull().default(0),
  discount: real("discount").notNull().default(0),
  badgeEn: text("badge_en").notNull().default(""),
  badgeAr: text("badge_ar").notNull().default(""),
  buttonTextEn: text("button_text_en").notNull().default(""),
  buttonTextAr: text("button_text_ar").notNull().default(""),
  buttonLink: text("button_link").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  targetBand: varchar("target_band", { length: 32 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CourseCard = typeof courseCardsTable.$inferSelect;
