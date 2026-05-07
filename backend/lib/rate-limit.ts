import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

export const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 20 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many attempts. Please wait a few minutes and try again.",
  },
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 10 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error:
      "Too many sign-up attempts from this network. Please try again later.",
  },
});

export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 20 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error:
      "Too many verification attempts. Please wait a few minutes and try again.",
  },
});

export const sendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 5 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip ?? "");
    const userId =
      typeof (req as { session?: { userId?: string } }).session?.userId ===
      "string"
        ? (req as { session: { userId: string } }).session.userId
        : "";
    return userId ? `${ip}|${userId}` : ip;
  },
  message: {
    error: "Too many verification email requests. Please try again later.",
  },
});

// Throttles admin broadcast email so a compromised admin session can't blast
// every recipient repeatedly. Per-admin (session userId) bucket; conservative
// in production, generous in dev for testing.
export const broadcastEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 5 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip ?? "");
    const userId =
      typeof (req as { session?: { userId?: string } }).session?.userId ===
      "string"
        ? (req as { session: { userId: string } }).session.userId
        : "";
    return userId ? `broadcast|${userId}` : `broadcast|${ip}`;
  },
  message: {
    error: "Too many broadcast attempts. Please wait an hour and try again.",
  },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: isProd ? 5 : 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip ?? "");
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    return email ? `${ip}|${email}` : ip;
  },
  message: {
    error: "Too many password reset requests. Please try again later.",
  },
});
