import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).notNull().default("student"),
  emailVerified: boolean("email_verified").notNull().default(false),
  preferredLanguage: varchar("preferred_language", { length: 8 })
    .notNull()
    .default("en"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  notifyExpiry: boolean("notify_expiry").notNull().default(true),
  notifyMarketing: boolean("notify_marketing").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  token: varchar("token", { length: 64 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emailVerificationTokensTable = pgTable(
  "email_verification_tokens",
  {
    token: varchar("token", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdIdx: index("email_verification_tokens_user_id_idx").on(t.userId),
    // At most one unverified (unused) token per user. Combined with the
    // per-user advisory lock in dispatchVerificationEmail, this prevents
    // concurrent resends from leaving multiple valid links alive at once.
    activePerUser: uniqueIndex("email_verification_tokens_user_active_uidx")
      .on(t.userId)
      .where(sql`${t.usedAt} IS NULL`),
  }),
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = Omit<User, "passwordHash">;

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
