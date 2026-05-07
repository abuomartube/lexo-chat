import { Router, type IRouter } from "express";
import { sql, gte, desc, eq, and } from "drizzle-orm";
import {
  db,
  usersTable,
  enrollmentsTable,
  englishEnrollmentsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function startOfDayUtc(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

router.get("/admin/stats", requireAdmin, async (_req, res, next) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = startOfDayUtc(29); // inclusive 30-day window

    const [{ count: totalUsersStr }] = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(usersTable);
    const totalUsers = Number(totalUsersStr ?? 0);

    const [{ count: studentsStr }] = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(usersTable)
      .where(eq(usersTable.role, "student"));
    const totalStudents = Number(studentsStr ?? 0);

    // "Active" proxy = signed up OR had any enrollment created in the window
    // (we don't track last_login). Counted as DISTINCT user.
    const activeTodayRows = await db.execute(sql`
      SELECT COUNT(DISTINCT id)::text AS c FROM (
        SELECT id FROM users WHERE created_at >= ${dayAgo}
        UNION
        SELECT user_id AS id FROM enrollments WHERE granted_at >= ${dayAgo}
        UNION
        SELECT user_id AS id FROM english_enrollments WHERE granted_at >= ${dayAgo}
      ) u
    `);
    const activeToday = Number(
      (activeTodayRows.rows[0] as { c?: string })?.c ?? 0,
    );

    const activeWeekRows = await db.execute(sql`
      SELECT COUNT(DISTINCT id)::text AS c FROM (
        SELECT id FROM users WHERE created_at >= ${weekAgo}
        UNION
        SELECT user_id AS id FROM enrollments WHERE granted_at >= ${weekAgo}
        UNION
        SELECT user_id AS id FROM english_enrollments WHERE granted_at >= ${weekAgo}
      ) u
    `);
    const activeThisWeek = Number(
      (activeWeekRows.rows[0] as { c?: string })?.c ?? 0,
    );

    // Active enrollments grouped by (course, tier).
    const introByTier = await db
      .select({
        tier: enrollmentsTable.tier,
        count: sql<string>`count(*)::text`,
      })
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.status, "active"))
      .groupBy(enrollmentsTable.tier);
    const englishByTier = await db
      .select({
        tier: englishEnrollmentsTable.tier,
        count: sql<string>`count(*)::text`,
      })
      .from(englishEnrollmentsTable)
      .where(eq(englishEnrollmentsTable.status, "active"))
      .groupBy(englishEnrollmentsTable.tier);

    const enrollmentsByTier = [
      ...introByTier.map((r) => ({
        course: "intro" as const,
        tier: r.tier,
        count: Number(r.count),
      })),
      ...englishByTier.map((r) => ({
        course: "english" as const,
        tier: r.tier,
        count: Number(r.count),
      })),
    ];
    const totalActiveEnrollments = enrollmentsByTier.reduce(
      (acc, r) => acc + r.count,
      0,
    );

    // Conversion = distinct students with ≥1 enrollment / total students.
    const convertedRows = await db.execute(sql`
      SELECT COUNT(DISTINCT u.id)::text AS c
      FROM users u
      WHERE u.role = 'student' AND (
        EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = u.id)
        OR EXISTS (SELECT 1 FROM english_enrollments e WHERE e.user_id = u.id)
      )
    `);
    const convertedStudents = Number(
      (convertedRows.rows[0] as { c?: string })?.c ?? 0,
    );
    const conversionRate =
      totalStudents > 0 ? convertedStudents / totalStudents : 0;

    // Recent signups
    const recentSignups = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(5);

    // 30-day signup trend (UTC day buckets, zero-filled)
    const signupRows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', created_at), 'YYYY-MM-DD')`,
        count: sql<string>`count(*)::text`,
      })
      .from(usersTable)
      .where(gte(usersTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', created_at)`);
    const signupMap = new Map(signupRows.map((r) => [r.day, Number(r.count)]));

    // 30-day enrollments trend (union both tables)
    const enrollmentTrendRows = await db.execute(sql`
      SELECT day, COUNT(*)::text AS c FROM (
        SELECT to_char(date_trunc('day', granted_at), 'YYYY-MM-DD') AS day
          FROM enrollments WHERE granted_at >= ${thirtyDaysAgo}
        UNION ALL
        SELECT to_char(date_trunc('day', granted_at), 'YYYY-MM-DD') AS day
          FROM english_enrollments WHERE granted_at >= ${thirtyDaysAgo}
      ) x
      GROUP BY day
    `);
    const enrollMap = new Map<string, number>();
    for (const r of enrollmentTrendRows.rows as { day: string; c: string }[]) {
      enrollMap.set(r.day, Number(r.c));
    }

    const signupsDaily30: { date: string; count: number }[] = [];
    const enrollmentsDaily30: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDayUtc(i);
      const key = d.toISOString().slice(0, 10);
      signupsDaily30.push({ date: key, count: signupMap.get(key) ?? 0 });
      enrollmentsDaily30.push({ date: key, count: enrollMap.get(key) ?? 0 });
    }

    res.json({
      totalUsers,
      totalStudents,
      activeToday,
      activeThisWeek,
      totalActiveEnrollments,
      enrollmentsByTier,
      conversionRate,
      revenueAllTime: 0,
      revenueDaily30: signupsDaily30.map((r) => ({ date: r.date, amount: 0 })),
      signupsDaily30,
      enrollmentsDaily30,
      recentSignups,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
