import { Router } from "express";
import { requireAuth, getUserById } from "../lib/auth";
import { db, emailsSentTable } from "@workspace/db";
import { eq, and, desc, gt } from "drizzle-orm";
import { sendEmail, buildAbandonedCartEmail, type Locale } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

const ABANDONED_CART_EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const inFlightUsers = new Set<string>();

router.post("/cart/sync", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId!;
    const { items, lastActivityAt, locale } = req.body as {
      items: { course: string; tier: string }[];
      lastActivityAt: number;
      locale?: string;
    };

    if (!Array.isArray(items) || typeof lastActivityAt !== "number") {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (items.length === 0) {
      res.json({ ok: true, emailScheduled: false });
      return;
    }

    const elapsed = Date.now() - lastActivityAt;
    if (elapsed < ABANDONED_CART_EMAIL_COOLDOWN_MS) {
      res.json({ ok: true, emailScheduled: false, reason: "too_early" });
      return;
    }

    if (inFlightUsers.has(userId)) {
      res.json({ ok: true, emailScheduled: false, reason: "in_flight" });
      return;
    }

    const cooldownCutoff = new Date(Date.now() - ABANDONED_CART_EMAIL_COOLDOWN_MS);
    const recentEmails = await db
      .select({ sentAt: emailsSentTable.sentAt })
      .from(emailsSentTable)
      .where(
        and(
          eq(emailsSentTable.userId, userId),
          eq(emailsSentTable.emailType, "abandoned_cart"),
          eq(emailsSentTable.status, "sent"),
          gt(emailsSentTable.sentAt, cooldownCutoff),
        ),
      )
      .orderBy(desc(emailsSentTable.sentAt))
      .limit(1);

    if (recentEmails.length > 0) {
      res.json({ ok: true, emailScheduled: false, reason: "cooldown" });
      return;
    }

    const emailLocale: Locale = locale === "ar" ? "ar" : "en";
    const domains = process.env["REPLIT_DOMAINS"] || "";
    const domain = domains.split(",")[0]?.trim() || "edulexo.com";
    const cartUrl = `https://${domain}/oxford-flashcards/cart`;

    const message = buildAbandonedCartEmail({
      to: user.email,
      name: user.name,
      cartItems: items,
      cartUrl,
      locale: emailLocale,
    });

    inFlightUsers.add(userId);
    try {
      await sendEmail(message, {
        emailType: "abandoned_cart",
        userId,
        relatedId: `cart-${userId}`,
      });
      res.json({ ok: true, emailScheduled: true });
    } catch (err) {
      logger.error({ err, userId }, "Failed to send abandoned cart email");
      res.json({ ok: true, emailScheduled: false, reason: "send_failed" });
    } finally {
      inFlightUsers.delete(userId);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
