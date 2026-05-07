import { db, tierPricesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_PRICES: Array<{
  course: string;
  tier: string;
  amountMinor: number;
  currency: string;
}> = [
  { course: "intro", tier: "intro", amountMinor: 15000, currency: "SAR" },
  { course: "intro", tier: "advance", amountMinor: 15000, currency: "SAR" },
  { course: "intro", tier: "complete", amountMinor: 15000, currency: "SAR" },
  { course: "english", tier: "beginner", amountMinor: 15000, currency: "SAR" },
  {
    course: "english",
    tier: "intermediate",
    amountMinor: 15000,
    currency: "SAR",
  },
  // The English course only recognizes three tier slugs: beginner,
  // intermediate, and advanced. The `advanced` tier is the canonical
  // "Complete Package" (all 5 CEFR levels A1→C1) and is priced at 250 SAR.
  // See lib/db/src/schema/english-mentor.ts for the tier→level mapping.
  { course: "english", tier: "advanced", amountMinor: 25000, currency: "SAR" },
];

export async function bootstrapTierPrices(): Promise<void> {
  try {
    await db
      .insert(tierPricesTable)
      .values(DEFAULT_PRICES)
      .onConflictDoNothing();

    // Force the canonical English Complete Package price (250 SAR) even when
    // the row already existed at the legacy 150 SAR value. This is safe to
    // run on every boot because the price is the single source of truth and
    // not a per-customer override.
    await db
      .update(tierPricesTable)
      .set({ amountMinor: 25000, currency: "SAR" })
      .where(
        and(
          eq(tierPricesTable.course, "english"),
          eq(tierPricesTable.tier, "advanced"),
        ),
      );

    // Remove the orphaned `english/complete` row that older bootstraps used
    // to seed. The English course never enrolled students at this tier slug,
    // so deleting it cannot orphan any payment or enrollment row.
    await db
      .delete(tierPricesTable)
      .where(
        and(
          eq(tierPricesTable.course, "english"),
          eq(tierPricesTable.tier, "complete"),
        ),
      );

    logger.info("Tier prices bootstrap completed");
  } catch (err) {
    logger.error({ err }, "Tier price bootstrap failed");
  }
}
