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

export const TIER_VALUES = ["intro", "advance", "complete"] as const;
export type Tier = (typeof TIER_VALUES)[number];

export const ENROLLMENT_STATUS_VALUES = [
  "active",
  "expired",
  "revoked",
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS_VALUES)[number];

export const ENROLLMENT_SOURCE_VALUES = [
  "admin",
  "code",
  "stripe",
  "tabby",
  "tamara",
  "bank_transfer",
] as const;
export type EnrollmentSource = (typeof ENROLLMENT_SOURCE_VALUES)[number];

export const ACCESS_CODE_STATUS_VALUES = ["active", "used", "revoked"] as const;
export type AccessCodeStatus = (typeof ACCESS_CODE_STATUS_VALUES)[number];

export const enrollmentsTable = pgTable(
  "enrollments",
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
    // Prevent duplicate active enrollments for the same user+tier.
    // Inactive (expired/revoked) rows are allowed to coexist.
    uniqueIndex("enrollments_active_user_tier_uniq")
      .on(t.userId, t.tier)
      .where(sql`status = 'active'`),
  ],
);

export const accessCodesTable = pgTable("platform_access_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 32 }).notNull().unique(),
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

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit(
  {
    id: true,
    grantedAt: true,
  },
);
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollmentsTable.$inferSelect;

export const insertAccessCodeSchema = createInsertSchema(accessCodesTable).omit(
  {
    id: true,
    createdAt: true,
    usedCount: true,
  },
);
export type InsertAccessCode = z.infer<typeof insertAccessCodeSchema>;
export type AccessCode = typeof accessCodesTable.$inferSelect;
