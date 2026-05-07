import { and, eq, gt, isNull, or } from "drizzle-orm";
import {
  db,
  englishEnrollmentsTable,
  type EnglishTier,
} from "@workspace/db";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

export const ALL_LEVELS: readonly CefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
] as const;

const TIER_TO_LEVELS: Record<EnglishTier, readonly CefrLevel[]> = {
  beginner: ["A1", "A2", "B1"],
  intermediate: ["B1", "B2", "C1"],
  advanced: ["A1", "A2", "B1", "B2", "C1"],
};

export async function getAllowedLevelsForUser(
  userId: string,
): Promise<CefrLevel[]> {
  const now = new Date();
  const rows = await db
    .select({ tier: englishEnrollmentsTable.tier })
    .from(englishEnrollmentsTable)
    .where(
      and(
        eq(englishEnrollmentsTable.userId, userId),
        eq(englishEnrollmentsTable.status, "active"),
        or(
          isNull(englishEnrollmentsTable.expiresAt),
          gt(englishEnrollmentsTable.expiresAt, now),
        ),
      ),
    );

  const allowed = new Set<CefrLevel>();
  for (const row of rows) {
    const levels = TIER_TO_LEVELS[row.tier as EnglishTier];
    if (levels) for (const l of levels) allowed.add(l);
  }
  return ALL_LEVELS.filter((l) => allowed.has(l));
}
