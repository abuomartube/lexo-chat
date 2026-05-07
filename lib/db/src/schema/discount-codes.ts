import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const DISCOUNT_TYPE_VALUES = ["percentage", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPE_VALUES)[number];

export const DISCOUNT_SCOPE_VALUES = ["general", "specific"] as const;
export type DiscountScope = (typeof DISCOUNT_SCOPE_VALUES)[number];

export const DISCOUNT_STATUS_VALUES = ["active", "inactive"] as const;
export type DiscountStatus = (typeof DISCOUNT_STATUS_VALUES)[number];

export const discountCodesTable = pgTable(
  "discount_codes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 50 }).notNull().unique(),
    discountType: text("discount_type", { enum: DISCOUNT_TYPE_VALUES }).notNull(),
    discountValue: integer("discount_value").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    neverExpires: boolean("never_expires").notNull().default(false),
    scope: text("scope", { enum: DISCOUNT_SCOPE_VALUES }).notNull().default("general"),
    specificCourse: varchar("specific_course", { length: 50 }),
    specificTier: varchar("specific_tier", { length: 50 }),
    totalUsageLimit: integer("total_usage_limit"),
    perUserLimit: integer("per_user_limit").notNull().default(1),
    oneTimePerUser: boolean("one_time_per_user").notNull().default(true),
    firstPurchaseOnly: boolean("first_purchase_only").notNull().default(false),
    newUsersOnly: boolean("new_users_only").notNull().default(false),
    status: text("status", { enum: DISCOUNT_STATUS_VALUES }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("discount_codes_code_idx").on(table.code),
    index("discount_codes_status_idx").on(table.status),
  ],
);

export const insertDiscountCodeSchema = createInsertSchema(discountCodesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodesTable.$inferSelect;

export const discountCodeUsagesTable = pgTable(
  "discount_code_usages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    discountCodeId: uuid("discount_code_id")
      .notNull()
      .references(() => discountCodesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("discount_code_usages_code_idx").on(table.discountCodeId),
    index("discount_code_usages_user_idx").on(table.userId),
  ],
);

export type DiscountCodeUsage = typeof discountCodeUsagesTable.$inferSelect;
