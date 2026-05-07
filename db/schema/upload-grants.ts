import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Tracks every presigned-upload URL we hand out, so a later operation
 * (e.g. attaching a file as a bank-transfer payment proof) can verify
 * that the object path was actually issued to *this* user, hasn't
 * expired, and hasn't already been used.
 *
 * Without this, the bank-transfer route would be a textbook IDOR — a
 * logged-in attacker who learns another user's `/objects/<uuid>` path
 * could attach it to their own payment and even reassign its ACL owner.
 */
export const uploadGrantsTable = pgTable(
  "upload_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // See note in `english.ts` — pinning the constraint name to the live
    // DB's existing `*_key` to avoid a publish-time rename diff.
    objectPath: text("object_path")
      .notNull()
      .unique("upload_grants_object_path_key"),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Set the moment the grant is consumed (e.g. attached to a payment). */
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("upload_grants_user_id_idx").on(t.userId),
    index("upload_grants_expires_at_idx").on(t.expiresAt),
  ],
);

export type UploadGrant = typeof uploadGrantsTable.$inferSelect;
export type NewUploadGrant = typeof uploadGrantsTable.$inferInsert;
