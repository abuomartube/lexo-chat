import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, englishEnrollmentsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

type FlashcardLevel = "A1" | "A2" | "B1" | "B2" | "C1";

const BEGINNER_LEVELS: FlashcardLevel[] = ["A1", "A2", "B1"];
const ADVANCED_LEVELS: FlashcardLevel[] = ["B2", "C1"];
const COMPLETE_LEVELS: FlashcardLevel[] = ["A1", "A2", "B1", "B2", "C1"];

async function getActiveTiers(userId: string): Promise<string[]> {
  const rows = await db
    .select({
      tier: englishEnrollmentsTable.tier,
      expiresAt: englishEnrollmentsTable.expiresAt,
    })
    .from(englishEnrollmentsTable)
    .where(
      and(
        eq(englishEnrollmentsTable.userId, userId),
        eq(englishEnrollmentsTable.status, "active"),
      ),
    );
  const now = new Date();
  const active = rows.filter((r) => !r.expiresAt || r.expiresAt > now);
  return [...new Set(active.map((r) => r.tier))];
}

function computeAllowedLevels(activeTiers: string[]): FlashcardLevel[] {
  if (activeTiers.includes("advanced")) return COMPLETE_LEVELS;
  const allowed = new Set<FlashcardLevel>();
  if (activeTiers.includes("beginner")) {
    BEGINNER_LEVELS.forEach((l) => allowed.add(l));
  }
  if (activeTiers.includes("intermediate")) {
    ADVANCED_LEVELS.forEach((l) => allowed.add(l));
  }
  return COMPLETE_LEVELS.filter((l) => allowed.has(l));
}

router.get(
  "/english/mentor/flashcards/access",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const activeTiers = await getActiveTiers(userId);
      const allowedLevels = computeAllowedLevels(activeTiers);
      if (allowedLevels.length === 0) {
        res.status(403).json({ error: "no_active_english_package" });
        return;
      }
      res.json({ allowedLevels, activeTiers });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/english/mentor/flashcards/level/:level",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const level = String(req.params.level).toUpperCase() as FlashcardLevel;
      if (!COMPLETE_LEVELS.includes(level)) {
        res.status(400).json({ error: "invalid_level" });
        return;
      }
      const activeTiers = await getActiveTiers(userId);
      const allowedLevels = computeAllowedLevels(activeTiers);
      if (!allowedLevels.includes(level)) {
        res.status(403).json({ error: "level_not_in_package", level });
        return;
      }
      res.json({ level, ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
