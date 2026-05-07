// ============================================================================
// English day & streak helpers (Phase E5 stabilization).
//
// Single source of truth for:
//   * The "civil day" used for all English engagement features (Asia/Riyadh).
//   * The streak computation (consecutive Riyadh days ending today, with at
//     least one row in english_xp_events).
//
// This module replaces three previous near-identical implementations that
// lived in english-engagement-service.ts, english-planner-service.ts, and
// english-vocab-service.ts. Those modules now delegate here, so the
// dashboard, planner hero, vocab stats, and motivation copy can never
// disagree on what "today" means or how long the user's streak is.
// ============================================================================

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export const ENGLISH_TZ = "Asia/Riyadh" as const;

/**
 * Format a Date as a YYYY-MM-DD string in Asia/Riyadh.
 * If `d` is omitted, uses "now".
 */
export function riyadhDateString(d: Date = new Date()): string {
  // en-CA locale gives stable YYYY-MM-DD output.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ENGLISH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function shiftDays(yyyyMmDd: string, deltaDays: number): string {
  // Anchor at noon UTC to avoid DST/half-hour edge cases when stepping by
  // one day. The timezone offset only affects formatting, not the +/-1 day
  // arithmetic — so we round-trip through UTC midnight is fine here.
  const [y, m, d] = yyyyMmDd.split("-").map(Number) as [number, number, number];
  const t = Date.UTC(y, m - 1, d, 12, 0, 0) + deltaDays * 86_400_000;
  const next = new Date(t);
  return riyadhDateString(next);
}

/**
 * Distinct Riyadh-civil-day strings (YYYY-MM-DD) that have at least one
 * english_xp_events row for the user, newest first, capped at 365.
 */
export async function getEnglishActivityDays(userId: string): Promise<string[]> {
  const rows = await db.execute<{ d: string }>(sql`
    SELECT DISTINCT to_char(
      created_at AT TIME ZONE ${ENGLISH_TZ},
      'YYYY-MM-DD'
    ) AS d
    FROM english_xp_events
    WHERE user_id = ${userId}
    ORDER BY d DESC
    LIMIT 365
  `);
  return rows.rows.map((r) => r.d);
}

/**
 * Consecutive Riyadh days, ending today (or yesterday if no XP today yet),
 * with at least one english_xp_events row.
 */
export async function computeEnglishStreakDays(userId: string): Promise<number> {
  const days = await getEnglishActivityDays(userId);
  if (days.length === 0) return 0;

  let cursor = riyadhDateString();
  let streak = 0;
  for (const d of days) {
    if (d === cursor) {
      streak += 1;
      cursor = shiftDays(cursor, -1);
    } else if (streak === 0) {
      // No event today yet — let the streak start at "yesterday".
      const y = shiftDays(cursor, -1);
      if (d === y) {
        streak = 1;
        cursor = shiftDays(y, -1);
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return streak;
}
