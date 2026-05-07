import { db, chatXpTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";

const XP_VALUES: Record<string, number> = {
  correct: 2,
  translate: 2,
  explain: 2,
  save_note: 3,
};

const COOLDOWN_MS = 5 * 60 * 1000;
const cooldownMap = new Map<string, number>();

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function cooldownKey(userId: string, action: string, text: string): string {
  const normalized = normalize(text);
  const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  return `${userId}:${action}:${hash}`;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cooldownMap) {
    if (now - v > COOLDOWN_MS) cooldownMap.delete(k);
  }
}, 60_000);

export async function awardAiXp(
  userId: string,
  action: string,
  text: string,
): Promise<number> {
  const xp = XP_VALUES[action] ?? 0;
  if (xp === 0) return 0;

  const key = cooldownKey(userId, action, text);
  const last = cooldownMap.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return 0;

  try {
    await db
      .insert(chatXpTable)
      .values({
        userId,
        totalXp: xp,
        messagesSent: 0,
        voiceNotesSent: 0,
        imagesSent: 0,
        lastActivityAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chatXpTable.userId,
        set: {
          totalXp: sql`${chatXpTable.totalXp} + ${xp}`,
          lastActivityAt: new Date(),
        },
      });
    cooldownMap.set(key, Date.now());
    return xp;
  } catch {
    return 0;
  }
}

export const __testing = {
  clearCooldowns(): void {
    cooldownMap.clear();
  },
};
