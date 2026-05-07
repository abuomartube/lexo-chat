// ============================================================================
// English vocabulary routes — Phase E2.
//
// Endpoints (all under /api, all require auth, all English-only):
//   GET  /english/vocab/queue?limit=N&level=A1|A2|B1|B2|C1
//   POST /english/vocab/attempt           body: { wordId, result }
//   POST /english/vocab/:wordId/mastered
//   POST /english/vocab/:wordId/needs-review
//   GET  /english/vocab/stats
//
// Validation: ad-hoc Zod inside each handler (matches the existing pattern
// in routes/english*.ts). Generated React Query hooks live in
// lib/api-client-react after running `pnpm --filter @workspace/api-spec run codegen`.
// ============================================================================

import { Router, type IRouter } from "express";
import { z } from "zod";
import { ENGLISH_CEFR_LEVELS } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  buildVocabQueue,
  getVocabStats,
  markMastered,
  markNeedsReview,
  recordAttempt,
} from "../lib/english-vocab-service";

const router: IRouter = Router();

const QueueQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  level: z.enum(ENGLISH_CEFR_LEVELS).optional(),
});

router.get("/english/vocab/queue", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const parsed = QueueQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }
    const result = await buildVocabQueue(
      userId,
      parsed.data.limit,
      parsed.data.level ?? null,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const AttemptBody = z.object({
  wordId: z.coerce.number().int().positive(),
  result: z.enum(["correct", "incorrect"]),
});

router.post("/english/vocab/attempt", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const parsed = AttemptBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }
    const out = await recordAttempt(userId, parsed.data.wordId, parsed.data.result);
    if (!out.ok) {
      if (out.err.kind === "word_not_found") {
        res.status(404).json({ error: "Word not found" });
        return;
      }
      res
        .status(403)
        .json({ error: "Word level not in your active package", allowedLevels: out.err.allowedLevels });
      return;
    }
    res.json(out.data);
  } catch (err) {
    next(err);
  }
});

const WordIdParam = z.object({ wordId: z.coerce.number().int().positive() });

router.post(
  "/english/vocab/:wordId/mastered",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const parsed = WordIdParam.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid wordId" });
        return;
      }
      const out = await markMastered(userId, parsed.data.wordId);
      if (!out.ok) {
        if (out.err.kind === "word_not_found") {
          res.status(404).json({ error: "Word not found" });
          return;
        }
        res
          .status(403)
          .json({ error: "Word level not in your active package", allowedLevels: out.err.allowedLevels });
        return;
      }
      res.json(out.data);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/english/vocab/:wordId/needs-review",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const parsed = WordIdParam.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid wordId" });
        return;
      }
      const out = await markNeedsReview(userId, parsed.data.wordId);
      if (!out.ok) {
        if (out.err.kind === "word_not_found") {
          res.status(404).json({ error: "Word not found" });
          return;
        }
        res
          .status(403)
          .json({ error: "Word level not in your active package", allowedLevels: out.err.allowedLevels });
        return;
      }
      res.json(out.data);
    } catch (err) {
      next(err);
    }
  },
);

router.get("/english/vocab/stats", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const stats = await getVocabStats(userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
