import { db, enrollmentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = 100;

const usageMap = new Map<string, number>();

function todayKey(userId: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `${userId}:${d}`;
}

setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  for (const k of usageMap.keys()) {
    if (!k.endsWith(today)) usageMap.delete(k);
  }
}, 5 * 60_000);

async function hasActiveEnrollment(userId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: enrollmentsTable.id })
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, userId),
          eq(enrollmentsTable.status, "active"),
          sql`(${enrollmentsTable.expiresAt} IS NULL OR ${enrollmentsTable.expiresAt} > NOW())`,
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

export interface DailyLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export async function checkAiDailyLimit(
  userId: string,
): Promise<DailyLimitResult> {
  const key = todayKey(userId);
  const used = usageMap.get(key) ?? 0;

  const premium = await hasActiveEnrollment(userId);
  const limit = premium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const remaining = Math.max(0, limit - used);

  return { allowed: used < limit, used, limit, remaining };
}

export function recordAiUsage(userId: string): void {
  const key = todayKey(userId);
  usageMap.set(key, (usageMap.get(key) ?? 0) + 1);
}

export const __testing = {
  clearUsage(): void {
    usageMap.clear();
  },
  FREE_DAILY_LIMIT,
  PREMIUM_DAILY_LIMIT,
};
