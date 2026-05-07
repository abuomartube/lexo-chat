import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { hashPassword } from "./auth";

export async function bootstrapAdminFromEnv(): Promise<void> {
  const rawEmail = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  if (!rawEmail) return;

  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, rawEmail))
      .limit(1);

    if (existing) {
      if (existing.role !== "admin" || !existing.emailVerified) {
        await db
          .update(usersTable)
          .set({ role: "admin", emailVerified: true })
          .where(eq(usersTable.id, existing.id));
        logger.info(
          { email: rawEmail },
          "Promoted user to admin via ADMIN_EMAIL",
        );
      }
      const newPwd = process.env["ADMIN_PASSWORD"];
      if (newPwd && newPwd.length >= 6) {
        const passwordHash = await hashPassword(newPwd);
        await db
          .update(usersTable)
          .set({ passwordHash })
          .where(eq(usersTable.id, existing.id));
        logger.info(
          { email: rawEmail },
          "Reset admin password via ADMIN_PASSWORD",
        );
      }
      return;
    }

    const newPwd = process.env["ADMIN_PASSWORD"];
    if (!newPwd || newPwd.length < 6) {
      logger.warn(
        { email: rawEmail },
        "ADMIN_EMAIL set but no matching account found and ADMIN_PASSWORD missing; skipping bootstrap",
      );
      return;
    }
    const passwordHash = await hashPassword(newPwd);
    await db.insert(usersTable).values({
      name: "Admin",
      email: rawEmail,
      passwordHash,
      role: "admin",
      emailVerified: true,
    });
    logger.info(
      { email: rawEmail },
      "Created admin account via ADMIN_EMAIL/ADMIN_PASSWORD",
    );
  } catch (err) {
    logger.error({ err }, "Admin bootstrap failed");
  }
}
