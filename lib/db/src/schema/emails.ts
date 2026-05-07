import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const EMAIL_TYPE_VALUES = [
  "email_verification",
  "password_reset",
  "welcome",
  "enrollment_confirmation",
  "course_access",
  "expiry_reminder",
  "admin_new_signup",
  "admin_new_enrollment",
  "broadcast",
  "payment_verified",
  "payment_rejected",
  "abandoned_cart",
] as const;
export type EmailType = (typeof EMAIL_TYPE_VALUES)[number];

export const EMAIL_STATUS_VALUES = ["sent", "failed"] as const;
export type EmailStatus = (typeof EMAIL_STATUS_VALUES)[number];

export const emailsSentTable = pgTable(
  "emails_sent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    toEmail: varchar("to_email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    body: text("body").notNull(),
    emailType: varchar("email_type", { length: 64 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("sent"),
    error: text("error"),
    relatedId: varchar("related_id", { length: 64 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("emails_sent_user_id_idx").on(t.userId),
    typeIdx: index("emails_sent_type_idx").on(t.emailType),
    sentAtIdx: index("emails_sent_sent_at_idx").on(t.sentAt),
  }),
);
