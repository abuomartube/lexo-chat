import { index, json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Session store for connect-pg-simple. Schema mirrors that library's
 * default table.sql so we can disable createTableIfMissing in production builds
 * (the bundled SQL file isn't reachable from our esbuild dist).
 */
export const userSessionsTable = pgTable(
  "user_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
  },
  (t) => ({
    expireIdx: index("IDX_user_sessions_expire").on(t.expire),
  }),
);
