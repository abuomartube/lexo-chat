import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { paymentsTable } from "./payments";

export const PAYMENT_AUDIT_ACTION_VALUES = [
  "verify",
  "reject",
  "resubmit",
] as const;
export type PaymentAuditAction = (typeof PAYMENT_AUDIT_ACTION_VALUES)[number];

/**
 * Append-only audit trail for admin actions on payments (and the matching
 * student "I re-submitted my proof" event). The payment row itself stores
 * the latest verified/rejected snapshot for fast reads, but this table
 * preserves the full history — important when a payment is rejected,
 * re-submitted, then verified.
 */
export const paymentAuditLogTable = pgTable(
  "payment_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => paymentsTable.id, { onDelete: "cascade" }),
    /**
     * Who performed the action. NULL when the actor was the student
     * themselves (e.g. action="resubmit") or when the original admin row
     * is later deleted.
     */
    adminId: uuid("admin_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 16 }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("payment_audit_log_payment_id_idx").on(t.paymentId),
    index("payment_audit_log_admin_id_idx").on(t.adminId),
    index("payment_audit_log_created_at_idx").on(t.createdAt.desc()),
  ],
);

export type PaymentAuditLog = typeof paymentAuditLogTable.$inferSelect;
export type InsertPaymentAuditLog = typeof paymentAuditLogTable.$inferInsert;
