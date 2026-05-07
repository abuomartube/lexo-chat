import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  index,
  uniqueIndex,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const PAYMENT_COURSE_VALUES = ["intro", "english"] as const;
export type PaymentCourse = (typeof PAYMENT_COURSE_VALUES)[number];

export const PAYMENT_PROVIDER_VALUES = [
  "tabby",
  "tamara",
  "bank_transfer",
] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDER_VALUES)[number];

export const PAYMENT_MODE_VALUES = ["sandbox", "live"] as const;
export type PaymentMode = (typeof PAYMENT_MODE_VALUES)[number];

export const PAYMENT_STATUS_VALUES = [
  "created",
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

export const tierPricesTable = pgTable(
  "tier_prices",
  {
    course: varchar("course", { length: 16 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SAR"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.course, t.tier] })],
);

export type TierPrice = typeof tierPricesTable.$inferSelect;

export const paymentsTable = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    course: varchar("course", { length: 16 }).notNull(),
    tier: varchar("tier", { length: 32 }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("SAR"),
    provider: varchar("provider", { length: 16 }).notNull(),
    mode: varchar("mode", { length: 8 }).notNull(),
    // See note in `english.ts` — pinning the constraint name to the live
    // DB's existing `*_key` to avoid a publish-time rename diff.
    providerSessionId: text("provider_session_id").unique(
      "payments_provider_session_id_key",
    ),
    providerPaymentId: text("provider_payment_id"),
    status: varchar("status", { length: 16 }).notNull().default("created"),
    failureReason: text("failure_reason"),
    rawPayload: jsonb("raw_payload"),
    enrollmentId: uuid("enrollment_id"),
    /**
     * Bank-transfer fields. Only populated when `provider = "bank_transfer"`.
     * The student types in the name on their sending account (Arabic or
     * English) so the admin can match against the bank statement.
     */
    discountCodeId: uuid("discount_code_id"),
    originalAmountMinor: integer("original_amount_minor"),
    bankSenderName: varchar("bank_sender_name", { length: 200 }),
    /**
     * Object-storage path of the uploaded payment proof, e.g.
     * `/objects/uploads/<uuid>`. Served via `/api/storage/objects/<uuid>`
     * with auth + ACL guards (only the owner or an admin may view).
     */
    bankProofObjectPath: text("bank_proof_object_path"),
    /** MIME type captured at upload-time (e.g. `image/jpeg`, `application/pdf`). */
    bankProofContentType: varchar("bank_proof_content_type", { length: 128 }),
    /** Original filename, kept for the admin UI download link. */
    bankProofFilename: varchar("bank_proof_filename", { length: 256 }),
    /**
     * Phase-7 admin verification trail. Persisted as proper columns (rather
     * than only inside `rawPayload`) so admin filtering, CSV export, and
     * student-facing rejection messaging can query them efficiently.
     */
    rejectionReason: text("rejection_reason"),
    verifiedByUserId: uuid("verified_by_user_id").references(
      () => usersTable.id,
      {
        onDelete: "set null",
      },
    ),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectedByUserId: uuid("rejected_by_user_id").references(
      () => usersTable.id,
      {
        onDelete: "set null",
      },
    ),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
  },
  (t) => [
    index("payments_user_id_idx").on(t.userId),
    index("payments_status_idx").on(t.status),
    index("payments_provider_status_idx").on(t.provider, t.status),
    index("payments_created_at_idx").on(t.createdAt.desc()),
    // Phase-7 race-safety: prevent duplicate pending bank transfers for
    // the same buyer + course + tier at the database layer. The route
    // also has an app-level guard for a friendly early response, but a
    // race between two parallel requests can slip past the SELECT/INSERT
    // pair — this partial unique index closes that window. Constraint
    // violations surface to the route handler as PG error 23505 and are
    // mapped to `409 duplicate_pending_bank_transfer`.
    uniqueIndex("payments_unique_pending_bank_transfer")
      .on(t.userId, t.course, t.tier)
      .where(sql`provider = 'bank_transfer' AND status = 'pending'`),
  ],
);

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
