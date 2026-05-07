import { Router, type IRouter } from "express";
import { sql, eq, asc, and, or, ilike, inArray } from "drizzle-orm";
import { db, wordsTable } from "@workspace/db";
import {
  ListLevelsResponse,
  ListWordsResponse,
  ListWordsQueryParams,
  GetCardParams,
  GetCardResponse,
} from "@workspace/api-zod";
import { ensureCard } from "../lib/lexo-flashcards/cards";
import { streamAudio, ensureAudioForHash } from "../lib/lexo-flashcards/audio";
import {
  ALL_LEVELS,
  getAllowedLevelsForUser,
  type CefrLevel,
} from "../lib/lexo-flashcards/access";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/levels",
  requireAuth,
  async (req, res, next): Promise<void> => {
    try {
      const allowed = await getAllowedLevelsForUser(req.session.userId!);
      if (allowed.length === 0) {
        res.status(403).json({ error: "no_active_english_enrollment" });
        return;
      }

      const rows = await db
        .select({
          level: wordsTable.level,
          count: sql<number>`count(*)::int`,
        })
        .from(wordsTable)
        .where(inArray(wordsTable.level, allowed as unknown as string[]))
        .groupBy(wordsTable.level);

      const map = new Map(rows.map((r) => [r.level, r.count]));
      const ordered = allowed.map((level) => ({
        level,
        count: map.get(level) ?? 0,
      }));
      res.set("Cache-Control", "no-store");
      res.json(ListLevelsResponse.parse(ordered));
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/words",
  requireAuth,
  async (req, res, next): Promise<void> => {
    try {
      const parsed = ListWordsQueryParams.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      const { level, search } = parsed.data;

      const allowed = await getAllowedLevelsForUser(req.session.userId!);
      if (allowed.length === 0) {
        res.status(403).json({ error: "no_active_english_enrollment" });
        return;
      }

      // Determine the effective level filter.
      // - "ALL" or missing → all levels the user is allowed to see.
      // - Specific level → only if user is allowed to see it, else 403.
      let levelsFilter: CefrLevel[];
      if (!level || level === "ALL") {
        levelsFilter = allowed;
      } else if (allowed.includes(level as CefrLevel)) {
        levelsFilter = [level as CefrLevel];
      } else {
        res.status(403).json({ error: "level_not_in_plan" });
        return;
      }

      const filters = [
        inArray(wordsTable.level, levelsFilter as unknown as string[]),
      ];
      if (search && search.trim().length > 0) {
        filters.push(ilike(wordsTable.english, `${search.trim()}%`));
      }

      const rows = await db
        .select({
          id: wordsTable.id,
          english: wordsTable.english,
          pos: wordsTable.pos,
          level: wordsTable.level,
        })
        .from(wordsTable)
        .where(and(...filters))
        .orderBy(
          asc(wordsTable.level),
          asc(wordsTable.english),
          asc(wordsTable.id),
        );

      res.set("Cache-Control", "no-store");
      res.json(ListWordsResponse.parse(rows));
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/cards/:id",
  requireAuth,
  async (req, res, next): Promise<void> => {
    try {
      const parsed = GetCardParams.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      const id = parsed.data.id;

      // Check level allowance BEFORE doing any expensive AI work.
      const [preview] = await db
        .select({ level: wordsTable.level })
        .from(wordsTable)
        .where(eq(wordsTable.id, id));
      if (!preview) {
        res.status(404).json({ error: "Card not found" });
        return;
      }
      const allowed = await getAllowedLevelsForUser(req.session.userId!);
      if (!allowed.includes(preview.level as CefrLevel)) {
        res.status(403).json({ error: "level_not_in_plan" });
        return;
      }

      const card = await ensureCard(id);
      if (!card) {
        res.status(404).json({ error: "Card not found" });
        return;
      }
      const payload = {
        id: card.id,
        level: card.level,
        english: card.english,
        pos: card.pos,
        arabic: card.arabic ?? "",
        sentenceEn: card.sentenceEn ?? "",
        sentenceAr: card.sentenceAr ?? "",
        audioWordUrl: `/api/audio/${card.audioWordPath}.mp3`,
        audioSentenceUrl: `/api/audio/${card.audioSentencePath}.mp3`,
      };
      res.json(GetCardResponse.parse(payload));
    } catch (err) {
      req.log.error({ err }, "Failed to build card");
      res.status(500).json({ error: "Failed to build card" });
    }
  },
);

// Audio streaming. Hashes are content-addressed (sha256 of "lang::text"),
// so they cannot be guessed; cards endpoint already enforces tier access
// before disclosing the hash. Synthesis is gated by an existing words row
// matching the hash, so abuse is bounded to seed data.
router.get("/audio/:hash.mp3", async (req, res): Promise<void> => {
  const rawHash = Array.isArray(req.params.hash)
    ? req.params.hash[0]
    : req.params.hash;
  if (!rawHash || !/^[a-f0-9]{64}$/.test(rawHash)) {
    res.status(400).json({ error: "Invalid audio id" });
    return;
  }
  let result = await streamAudio(rawHash);
  if (!result) {
    const [row] = await db
      .select({
        english: wordsTable.english,
        sentenceEn: wordsTable.sentenceEn,
        audioWordPath: wordsTable.audioWordPath,
        audioSentencePath: wordsTable.audioSentencePath,
      })
      .from(wordsTable)
      .where(
        or(
          eq(wordsTable.audioWordPath, rawHash),
          eq(wordsTable.audioSentencePath, rawHash),
        ),
      )
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Audio not found" });
      return;
    }
    const text =
      row.audioWordPath === rawHash ? row.english : row.sentenceEn ?? "";
    if (!text) {
      res.status(404).json({ error: "Audio not found" });
      return;
    }
    try {
      await ensureAudioForHash("en", text, rawHash);
    } catch (err) {
      req.log.error({ err, hash: rawHash }, "Failed to synthesize audio");
      res.status(500).json({ error: "Failed to synthesize audio" });
      return;
    }
    result = await streamAudio(rawHash);
    if (!result) {
      res.status(500).json({ error: "Audio not available after generation" });
      return;
    }
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", String(result.size));
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  result.stream.on("error", (err) => {
    req.log.error({ err }, "Audio stream error");
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  result.stream.pipe(res);
});

export default router;
