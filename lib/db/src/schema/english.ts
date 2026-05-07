import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ENGLISH_TIER_VALUES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export type EnglishTier = (typeof ENGLISH_TIER_VALUES)[number];

export const englishEnrollmentsTable = pgTable(
  "english_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 16 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    source: varchar("source", { length: 16 }).notNull().default("admin"),
    grantedBy: uuid("granted_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    note: text("note"),
    paymentId: uuid("payment_id"),
    paymentStatus: varchar("payment_status", { length: 16 }),
  },
  (t) => [
    uniqueIndex("english_enrollments_active_user_tier_uniq")
      .on(t.userId, t.tier)
      .where(sql`status = 'active'`),
  ],
);

export const englishAccessCodesTable = pgTable("english_access_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Pinned to the postgres-default constraint name (`*_key`) instead of
  // drizzle's `*_unique` convention because the live database — including
  // production — was originally created with the `_key` suffix. Renaming
  // the constraint shows up to Replit's publish-time dev↔prod diff as a
  // drop+add, which the validator refuses as potentially data-losing.
  // Keeping the explicit `_key` name keeps schema, dev DB, and prod DB
  // perfectly aligned.
  code: varchar("code", { length: 32 })
    .notNull()
    .unique("english_access_codes_code_key"),
  tier: varchar("tier", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  redeemedByUserId: uuid("redeemed_by_user_id").references(
    () => usersTable.id,
    { onDelete: "set null" },
  ),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  note: text("note"),
});

export const insertEnglishEnrollmentSchema = createInsertSchema(
  englishEnrollmentsTable,
).omit({ id: true, grantedAt: true });
export type InsertEnglishEnrollment = z.infer<
  typeof insertEnglishEnrollmentSchema
>;
