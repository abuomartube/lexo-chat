import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, chatAiNotesTable, CHAT_AI_NOTE_ACTION_VALUES } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { awardAiXp } from "../lib/ai-xp";

const router: IRouter = Router();

const MAX_TEXT_LEN = 1000;
const MAX_RESULT_LEN = 10_000;

const saveNoteSchema = z.object({
  action: z.enum(CHAT_AI_NOTE_ACTION_VALUES),
  originalText: z.string().min(1).max(MAX_TEXT_LEN),
  resultJson: z.string().min(1).max(MAX_RESULT_LEN),
});

router.post("/chat/notes", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const parsed = saveNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    JSON.parse(parsed.data.resultJson);
  } catch {
    res.status(400).json({ error: "invalid_result_json" });
    return;
  }

  try {
    const [note] = await db
      .insert(chatAiNotesTable)
      .values({
        userId,
        action: parsed.data.action,
        originalText: parsed.data.originalText,
        resultJson: parsed.data.resultJson,
      })
      .onConflictDoNothing({
        target: [
          chatAiNotesTable.userId,
          chatAiNotesTable.action,
          chatAiNotesTable.originalText,
        ],
      })
      .returning({ id: chatAiNotesTable.id });

    if (!note) {
      const existing = await db
        .select({ id: chatAiNotesTable.id })
        .from(chatAiNotesTable)
        .where(
          and(
            eq(chatAiNotesTable.userId, userId),
            eq(chatAiNotesTable.action, parsed.data.action),
            eq(chatAiNotesTable.originalText, parsed.data.originalText),
          ),
        )
        .limit(1);

      res.status(200).json({
        saved: true,
        duplicate: true,
        id: existing[0]?.id ?? null,
      });
      return;
    }

    const xpAwarded = await awardAiXp(userId, "save_note", parsed.data.originalText);
    res.status(201).json({ saved: true, duplicate: false, id: note.id, xpAwarded });
  } catch (err) {
    req.log.error({ err }, "chat-ai-notes: save failed");
    res.status(500).json({ error: "save_failed" });
  }
});

router.get("/chat/notes", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const action = req.query.action as string | undefined;

  try {
    const conditions = [eq(chatAiNotesTable.userId, userId)];
    if (
      action &&
      (CHAT_AI_NOTE_ACTION_VALUES as readonly string[]).includes(action)
    ) {
      conditions.push(eq(chatAiNotesTable.action, action));
    }

    const notes = await db
      .select()
      .from(chatAiNotesTable)
      .where(and(...conditions))
      .orderBy(desc(chatAiNotesTable.createdAt))
      .limit(100);

    res.status(200).json({ notes });
  } catch (err) {
    req.log.error({ err }, "chat-ai-notes: list failed");
    res.status(500).json({ error: "list_failed" });
  }
});

router.delete("/chat/notes/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const noteId = req.params.id as string;

  if (
    !noteId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      noteId,
    )
  ) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  try {
    const deleted = await db
      .delete(chatAiNotesTable)
      .where(
        and(
          eq(chatAiNotesTable.id, noteId),
          eq(chatAiNotesTable.userId, userId),
        ),
      )
      .returning({ id: chatAiNotesTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "chat-ai-notes: delete failed");
    res.status(500).json({ error: "delete_failed" });
  }
});

export default router;
