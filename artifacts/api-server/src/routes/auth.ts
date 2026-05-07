import { Router, type IRouter } from "express";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  passwordResetTokensTable,
  emailVerificationTokensTable,
  certificatesTable,
  type User,
} from "@workspace/db";
import {
  SignupBody,
  LoginBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  VerifyEmailBody,
  UpdateProfileBody,
  ChangePasswordBody,
  LoginResponse as AuthResponseSchema,
  GetCurrentUserResponse as MeResponseSchema,
  ForgotPasswordResponse as MessageResponseSchema,
  GetPublicProfileResponse as PublicProfileResponseSchema,
} from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";
import { uploadGrantsTable } from "@workspace/db";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  getAppOrigin,
  toPublicUser,
  getUserById,
  getUserByEmail,
  requireAuth,
} from "../lib/auth";
import {
  buildPasswordResetEmail,
  buildEmailVerificationEmail,
  buildWelcomeEmail,
  buildAdminNewSignupEmail,
  sendEmail,
  getAdminEmails,
  normalizeLocale,
} from "../lib/email";
import {
  authIpLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  sendVerificationLimiter,
  verifyEmailLimiter,
} from "../lib/rate-limit";
import type { Logger } from "pino";

async function dispatchVerificationEmail(
  user: User,
  log: Logger,
): Promise<{ verifyUrl: string } | null> {
  if (user.emailVerified) return null;

  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Invalidate prior unused tokens for this user and insert the new one
  // atomically. A per-user advisory lock serialises concurrent calls
  // (e.g. user spam-clicks "resend"), so we never observe two unused tokens
  // simultaneously and never violate the partial-unique index on
  // (user_id) WHERE used_at IS NULL.
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`email_verify_${user.id}`}))`,
    );

    await tx
      .update(emailVerificationTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokensTable.userId, user.id),
          isNull(emailVerificationTokensTable.usedAt),
        ),
      );

    await tx.insert(emailVerificationTokensTable).values({
      token: tokenHash,
      userId: user.id,
      email: user.email,
      expiresAt,
    });
  });

  const verifyUrl = `${getAppOrigin()}/verify-email?token=${encodeURIComponent(rawToken)}`;

  await sendEmail(
    buildEmailVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
      locale: normalizeLocale(user.preferredLanguage),
    }),
    { emailType: "email_verification", userId: user.id },
  );

  if (process.env.NODE_ENV !== "production") {
    log.info(
      { userId: user.id, verifyUrl },
      "[dev-only] Email verification link",
    );
  } else {
    log.info({ userId: user.id }, "Email verification link generated");
  }

  return { verifyUrl };
}

const router: IRouter = Router();

function loginSession(req: Express.Request, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session!.regenerate((err) => {
      if (err) return reject(err);
      req.session!.userId = user.id;
      req.session!.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

router.post("/auth/signup", signupLimiter, async (req, res, next) => {
  try {
    const parsed = SignupBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { name, email, phone, password } = parsed.data;
    const normalized = email.trim().toLowerCase();

    const existing = await getUserByEmail(normalized);
    if (existing) {
      res
        .status(409)
        .json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(usersTable)
      .values({
        name: name.trim(),
        email: normalized,
        phone: phone?.trim() || null,
        passwordHash,
        role: "student",
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create user");
    }

    await loginSession(req, created);

    // Fire-and-forget verification email; never block signup if delivery fails.
    try {
      await dispatchVerificationEmail(created, req.log);
    } catch (mailErr) {
      req.log.warn(
        { err: mailErr, userId: created.id },
        "Failed to send verification email at signup",
      );
    }

    // Welcome email + admin notification — fire-and-forget, never block signup.
    const dashboardUrl = `${getAppOrigin()}/dashboard`;
    const adminUrl = `${getAppOrigin()}/admin`;
    void (async () => {
      try {
        await sendEmail(
          buildWelcomeEmail({
            to: created.email,
            name: created.name,
            email: created.email,
            dashboardUrl,
            locale: normalizeLocale(created.preferredLanguage),
          }),
          { emailType: "welcome", userId: created.id },
        );
      } catch (mailErr) {
        req.log.warn(
          { err: mailErr, userId: created.id },
          "Failed to send welcome email",
        );
      }
      try {
        const admins = await getAdminEmails();
        for (const admin of admins) {
          await sendEmail(
            buildAdminNewSignupEmail({
              to: admin.email,
              adminName: admin.name,
              newUserName: created.name,
              newUserEmail: created.email,
              signupAt: new Date(),
              adminUrl,
              locale: admin.locale,
            }),
            {
              emailType: "admin_new_signup",
              userId: admin.id,
              relatedId: created.id,
            },
          );
        }
      } catch (mailErr) {
        req.log.warn(
          { err: mailErr, userId: created.id },
          "Failed to notify admins of new signup",
        );
      }
    })();

    const body = AuthResponseSchema.parse({ user: toPublicUser(created) });
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", authIpLimiter, async (req, res, next) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { email, password } = parsed.data;
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await loginSession(req, user);

    const body = AuthResponseSchema.parse({ user: toPublicUser(user) });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

router.post("/auth/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("edulexo.sid");
    res.status(204).send();
  });
});

router.get("/auth/me", async (req, res, next) => {
  try {
    if (!req.session.userId) {
      const body = MeResponseSchema.parse({ user: null });
      res.json(body);
      return;
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => undefined);
      const body = MeResponseSchema.parse({ user: null });
      res.json(body);
      return;
    }
    const body = MeResponseSchema.parse({ user: toPublicUser(user) });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// PATCH /auth/me — update profile fields the user owns: name, phone, bio,
// and avatar. Avatars come in as an `avatarObjectPath` returned by the
// storage upload-grant flow; we set the ACL to grant the owner READ and
// store the normalized object path. The same path can later be served
// through GET /api/storage/objects/* (admins always have access; the
// owning user passes via owner-bypass in the ACL check).
const objectStorageForAvatars = new ObjectStorageService();

router.patch("/auth/me", requireAuth, async (req, res, next) => {
  try {
    const parsed = UpdateProfileBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
      return;
    }
    const {
      name,
      phone,
      bio,
      avatarObjectPath,
      preferredLanguage,
      notifyExpiry,
      notifyMarketing,
    } = parsed.data;

    const updates: Partial<
      Pick<
        User,
        | "name"
        | "phone"
        | "bio"
        | "avatarUrl"
        | "preferredLanguage"
        | "notifyExpiry"
        | "notifyMarketing"
        | "updatedAt"
      >
    > = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined)
      updates.phone = phone === null ? null : phone.trim() || null;
    if (bio !== undefined)
      updates.bio = bio === null ? null : bio.trim() || null;
    if (preferredLanguage !== undefined)
      updates.preferredLanguage = preferredLanguage;
    if (notifyExpiry !== undefined) updates.notifyExpiry = notifyExpiry;
    if (notifyMarketing !== undefined)
      updates.notifyMarketing = notifyMarketing;

    if (avatarObjectPath !== undefined) {
      if (avatarObjectPath === null || avatarObjectPath === "") {
        updates.avatarUrl = null;
      } else {
        // Strict shape check — only accept the canonical entity path that
        // request-url issues. Reject external URLs, traversal, anything
        // that isn't `/objects/<uuid-ish>` to prevent storing arbitrary
        // strings as the user's avatar URL.
        if (!/^\/objects\/[A-Za-z0-9_-]{8,128}$/.test(avatarObjectPath)) {
          res.status(400).json({ error: "invalid_avatar_path" });
          return;
        }
        // IDOR guard — verify this exact object path was granted to this
        // user (and hasn't expired or been used elsewhere). Mirrors the
        // bank-transfer attach flow.
        const [grant] = await db
          .select({ id: uploadGrantsTable.id })
          .from(uploadGrantsTable)
          .where(
            and(
              eq(uploadGrantsTable.objectPath, avatarObjectPath),
              eq(uploadGrantsTable.userId, req.session.userId!),
              gt(uploadGrantsTable.expiresAt, new Date()),
              isNull(uploadGrantsTable.usedAt),
            ),
          )
          .limit(1);
        if (!grant) {
          res.status(403).json({ error: "avatar_path_not_owned" });
          return;
        }
        try {
          const normalized =
            await objectStorageForAvatars.trySetObjectEntityAclPolicy(
              avatarObjectPath,
              {
                owner: req.session.userId!,
                visibility: "private",
              },
            );
          updates.avatarUrl = normalized;
          await db
            .update(uploadGrantsTable)
            .set({ usedAt: new Date() })
            .where(eq(uploadGrantsTable.id, grant.id));
        } catch (err) {
          req.log.warn({ err, avatarObjectPath }, "avatar ACL set failed");
          res.status(400).json({ error: "invalid_avatar_path" });
          return;
        }
      }
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.session.userId!))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "user_not_found" });
      return;
    }
    const body = AuthResponseSchema.parse({ user: toPublicUser(updated) });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// POST /auth/change-password — verifies the current password, hashes the
// new one, and rotates the session. Rate-limited per-IP via authIpLimiter
// (same limiter that protects /auth/login + /auth/reset-password).
router.post(
  "/auth/change-password",
  authIpLimiter,
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = ChangePasswordBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message ?? "Invalid input",
        });
        return;
      }
      const { currentPassword, newPassword } = parsed.data;
      const user = await getUserById(req.session.userId!);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
      if (currentPassword === newPassword) {
        res.status(400).json({
          error: "New password must be different from current password",
        });
        return;
      }
      const passwordHash = await hashPassword(newPassword);
      await db
        .update(usersTable)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
      // Rotate the session so any leaked old session ID can't continue to act
      // as the user with the new credentials.
      await loginSession(req, user);
      const body = MessageResponseSchema.parse({
        message: "Password updated.",
      });
      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

// GET /users/:userId/profile — public profile of any user. Auth required so
// we don't expose the existence of accounts to anonymous scrapers, but any
// signed-in user can view another student's avatar/name/bio/certs (no email,
// phone, role or notification prefs).
router.get("/users/:userId/profile", requireAuth, async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const certs = await db
      .select({
        id: certificatesTable.id,
        course: certificatesTable.course,
        tier: certificatesTable.tier,
        certificateId: certificatesTable.certificateId,
        completionDate: certificatesTable.completionDate,
        issuedAt: certificatesTable.issuedAt,
      })
      .from(certificatesTable)
      .where(
        and(
          eq(certificatesTable.userId, user.id),
          isNull(certificatesTable.revokedAt),
        ),
      )
      .orderBy(desc(certificatesTable.issuedAt));

    const body = PublicProfileResponseSchema.parse({
      profile: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        memberSince: user.createdAt.toISOString(),
        certificates: certs.map((c) => ({
          id: c.id,
          course: c.course,
          tier: c.tier,
          certificateId: c.certificateId,
          completionDate: c.completionDate,
          issuedAt: c.issuedAt.toISOString(),
        })),
      },
    });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/auth/forgot-password",
  forgotPasswordLimiter,
  async (req, res, next) => {
    try {
      const parsed = ForgotPasswordBody.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
        return;
      }
      const { email } = parsed.data;
      const user = await getUserByEmail(email);

      // Always respond OK — never reveal whether an email is registered.
      if (user) {
        const rawToken = generateToken(32);
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.insert(passwordResetTokensTable).values({
          token: tokenHash,
          userId: user.id,
          expiresAt,
        });
        const resetUrl = `${getAppOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const message = buildPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl,
          locale: normalizeLocale(user.preferredLanguage),
        });
        await sendEmail(message, {
          emailType: "password_reset",
          userId: user.id,
        });
        // Never log raw tokens in production. In dev only, log the URL so
        // we can complete the reset flow without a real email pipeline.
        if (process.env.NODE_ENV !== "production") {
          req.log.info(
            { userId: user.id, resetUrl },
            "[dev-only] Password reset link",
          );
        } else {
          req.log.info({ userId: user.id }, "Password reset link generated");
        }
      }

      const body = MessageResponseSchema.parse({
        message: "If that email is registered, a reset link is on its way.",
      });
      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

router.post("/auth/reset-password", authIpLimiter, async (req, res, next) => {
  try {
    const parsed = ResetPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, tokenHash),
          isNull(passwordResetTokensTable.usedAt),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      res
        .status(400)
        .json({ error: "This reset link is invalid or has expired." });
      return;
    }

    const passwordHash = await hashPassword(password);
    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, record.userId));
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.token, tokenHash));

    const body = MessageResponseSchema.parse({
      message: "Password updated. You can now log in with your new password.",
    });
    res.json(body);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/auth/send-verification",
  sendVerificationLimiter,
  requireAuth,
  async (req, res, next) => {
    try {
      const user = await getUserById(req.session.userId!);
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      if (user.emailVerified) {
        const body = MessageResponseSchema.parse({
          message: "Your email is already verified.",
        });
        res.json(body);
        return;
      }

      await dispatchVerificationEmail(user, req.log);

      const body = MessageResponseSchema.parse({
        message: "Verification email sent. Please check your inbox.",
      });
      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/auth/verify-email",
  verifyEmailLimiter,
  async (req, res, next) => {
    try {
      const parsed = VerifyEmailBody.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
        return;
      }
      const { token } = parsed.data;
      const tokenHash = hashToken(token);

      const [record] = await db
        .select()
        .from(emailVerificationTokensTable)
        .where(
          and(
            eq(emailVerificationTokensTable.token, tokenHash),
            isNull(emailVerificationTokensTable.usedAt),
            gt(emailVerificationTokensTable.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!record) {
        res.status(400).json({
          error: "This verification link is invalid or has expired.",
        });
        return;
      }

      const user = await getUserById(record.userId);
      if (!user) {
        res.status(400).json({
          error: "This verification link is invalid or has expired.",
        });
        return;
      }

      // Only confirm if the email on the token still matches the user's current
      // email — otherwise the address was changed after the link was issued.
      if (user.email !== record.email) {
        await db
          .update(emailVerificationTokensTable)
          .set({ usedAt: new Date() })
          .where(eq(emailVerificationTokensTable.token, tokenHash));
        res.status(400).json({
          error: "This verification link is no longer valid for your account.",
        });
        return;
      }

      await db
        .update(usersTable)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(usersTable.id, record.userId));
      await db
        .update(emailVerificationTokensTable)
        .set({ usedAt: new Date() })
        .where(eq(emailVerificationTokensTable.token, tokenHash));

      const body = MessageResponseSchema.parse({
        message: "Email verified. Thank you!",
      });
      res.json(body);
    } catch (err) {
      next(err);
    }
  },
);

export { requireAuth };
export default router;
