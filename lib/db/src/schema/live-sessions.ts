import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const LIVE_SESSION_AUDIENCE_VALUES = ["public", "course"] as const;
export type LiveSessionAudience = (typeof LIVE_SESSION_AUDIENCE_VALUES)[number];

// "intro" / "english" — same set as certificates / payments
export const LIVE_SESSION_COURSE_VALUES = ["intro", "english"] as const;
export type LiveSessionCourse = (typeof LIVE_SESSION_COURSE_VALUES)[number];

export const liveSessionsTable = pgTable(
  "live_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    // audience controls visibility:
    //  - "public"  → any signed-in user can see+join
    //  - "course"  → only users with an active enrollment in (course, tier)
    audience: varchar("audience", { length: 16 }).notNull().default("public"),
    course: varchar("course", { length: 16 }),
    // tier is optional even for course-restricted sessions; null tier means
    // "any tier in this course"
    tier: varchar("tier", { length: 16 }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    // Zoom-side identifiers / URLs. join_url is what students click;
    // start_url is what the host clicks and is stored only so the admin can
    // start the meeting from our admin panel.
    zoomMeetingId: varchar("zoom_meeting_id", { length: 64 }).notNull(),
    zoomJoinUrl: text("zoom_join_url").notNull(),
    zoomStartUrl: text("zoom_start_url").notNull(),
    zoomPasscode: varchar("zoom_passcode", { length: 32 }),
    hostId: uuid("host_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("live_sessions_starts_at_idx").on(t.startsAt),
    index("live_sessions_audience_idx").on(t.audience),
  ],
);

export type LiveSession = typeof liveSessionsTable.$inferSelect;
export type InsertLiveSession = typeof liveSessionsTable.$inferInsert;
