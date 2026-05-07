import { logger } from "./logger";
import { db, usersTable, emailsSentTable, type EmailType } from "@workspace/db";
import { eq } from "drizzle-orm";

export type Locale = "en" | "ar";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailOptions = {
  emailType: EmailType;
  userId?: string | null;
  relatedId?: string | null;
};

/**
 * Send an email via Resend if `RESEND_API_KEY` is configured.
 * Falls back to a server-log stub when no provider is wired.
 * Every attempt — sent, stubbed, or failed — is recorded in
 * the `emails_sent` table for admin auditing.
 */
export async function sendEmail(
  message: EmailMessage,
  opts: SendEmailOptions,
): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from =
    process.env["EMAIL_FROM"]?.trim() ||
    "Abu Omar EduLexo <no-reply@edulexo.com>";

  let status: "sent" | "failed" = "sent";
  let errorMsg: string | null = null;

  if (!apiKey) {
    logger.info(
      { to: message.to, subject: message.subject, type: opts.emailType },
      "[email-stub] Would send email (RESEND_API_KEY not set)",
    );
  } else {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        status = "failed";
        errorMsg = `resend_${resp.status}: ${body.slice(0, 300)}`;
        logger.error(
          {
            to: message.to,
            type: opts.emailType,
            status: resp.status,
            body: body.slice(0, 300),
          },
          "Resend send failed",
        );
      } else {
        logger.info(
          { to: message.to, type: opts.emailType },
          "Email sent via Resend",
        );
      }
    } catch (err) {
      status = "failed";
      errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(
        { err, to: message.to, type: opts.emailType },
        "Resend request threw",
      );
    }
  }

  // Record in DB. Never throw from here — the caller already handled the
  // primary action; logging failure should not bubble up.
  try {
    await db.insert(emailsSentTable).values({
      userId: opts.userId ?? null,
      toEmail: message.to,
      subject: message.subject,
      body: message.text,
      emailType: opts.emailType,
      status,
      error: errorMsg,
      relatedId: opts.relatedId ?? null,
    });
  } catch (logErr) {
    logger.error(
      { err: logErr, to: message.to, type: opts.emailType },
      "Failed to write emails_sent row",
    );
  }
}

export async function getAdminEmails(): Promise<
  { id: string; email: string; name: string; locale: Locale }[]
> {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      preferredLanguage: usersTable.preferredLanguage,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    locale: normalizeLocale(r.preferredLanguage),
  }));
}

export function normalizeLocale(raw: string | null | undefined): Locale {
  return raw === "ar" ? "ar" : "en";
}

// ---------------------------------------------------------------------------
// Bilingual templates
// ---------------------------------------------------------------------------

const SIGN_OFF: Record<Locale, string> = {
  en: "— The Abu Omar EduLexo team",
  ar: "— فريق أبو عمر إيدوليكسو",
};

function tierLabel(tier: string, locale: Locale): string {
  if (locale === "ar") {
    const map: Record<string, string> = {
      intro: "تمهيدي",
      advance: "متقدم",
      complete: "كامل",
      basic: "أساسي",
      foundation: "تأسيسي",
      pro: "احترافي",
      beginner: "مبتدئ حتى المتوسط",
      intermediate: "متوسط حتى المتقدم",
      advanced: "شاملة",
    };
    return map[tier] ?? tier;
  }
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function courseLabel(course: string, locale: Locale): string {
  if (locale === "ar") {
    const map: Record<string, string> = {
      intro: "LEXO تمهيدي",
      english: "LEXO للإنجليزية",
      ielts: "LEXO للآيلتس",
    };
    return map[course] ?? course;
  }
  const map: Record<string, string> = {
    intro: "LEXO Intro",
    english: "LEXO for English",
    ielts: "LEXO for IELTS",
  };
  return map[course] ?? course;
}

export function buildEmailVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, verifyUrl, locale = "en" } = params;
  if (locale === "ar") {
    return {
      to,
      subject: "فعّل بريدك الإلكتروني — أبو عمر إيدوليكسو",
      text: `مرحباً ${name},\n\nأهلاً بك في أبو عمر إيدوليكسو! يرجى تأكيد بريدك الإلكتروني لتأمين حسابك واستلام تحديثات الدورات.\n\nاضغط على الرابط التالي للتفعيل (تنتهي صلاحيته خلال 24 ساعة):\n\n${verifyUrl}\n\nإن لم تنشئ هذا الحساب، يمكنك تجاهل هذه الرسالة.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: "Verify your Abu Omar EduLexo email",
    text: `Hi ${name},\n\nWelcome to Abu Omar EduLexo! Please confirm your email address so we can keep your account secure and send you important course updates.\n\nClick the link below to verify your email. This link expires in 24 hours.\n\n${verifyUrl}\n\nIf you didn't create this account, you can safely ignore this email.\n\n${SIGN_OFF.en}`,
  };
}

export function buildPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, resetUrl, locale = "en" } = params;
  if (locale === "ar") {
    return {
      to,
      subject: "إعادة تعيين كلمة المرور — أبو عمر إيدوليكسو",
      text: `مرحباً ${name},\n\nوصلنا طلب لإعادة تعيين كلمة المرور لحسابك في أبو عمر إيدوليكسو.\n\nاضغط على الرابط التالي لاختيار كلمة مرور جديدة (تنتهي الصلاحية خلال 60 دقيقة):\n\n${resetUrl}\n\nإن لم تكن أنت من طلب ذلك، يمكنك تجاهل هذه الرسالة بأمان — لن تتغير كلمة المرور.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: "Reset your Abu Omar EduLexo password",
    text: `Hi ${name},\n\nWe received a request to reset the password for your Abu Omar EduLexo account.\n\nClick the link below to choose a new password. This link expires in 60 minutes.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password will not change.\n\n${SIGN_OFF.en}`,
  };
}

export function buildWelcomeEmail(params: {
  to: string;
  name: string;
  email: string;
  dashboardUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, email, dashboardUrl, locale = "en" } = params;
  if (locale === "ar") {
    return {
      to,
      subject: "أهلاً بك في أبو عمر إيدوليكسو 🎉",
      text: `مرحباً ${name},\n\nأهلاً بك في منصة أبو عمر إيدوليكسو لتعليم اللغات! حسابك جاهز للاستخدام.\n\nتفاصيل الحساب:\n  • البريد: ${email}\n  • الاسم: ${name}\n\nابدأ الآن من لوحة التحكم:\n${dashboardUrl}\n\nخطوات سريعة للبدء:\n  1. أكمل تأكيد بريدك من الرسالة المنفصلة.\n  2. تصفّح الدورات المتاحة.\n  3. استرد رمز الوصول إن كنت تملكه أو راسل المسؤول للاشتراك.\n\nنحن سعيدون بانضمامك إلينا!\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: "Welcome to Abu Omar EduLexo 🎉",
    text: `Hi ${name},\n\nWelcome to the Abu Omar EduLexo language-learning platform! Your account is ready to go.\n\nAccount details:\n  • Email: ${email}\n  • Name: ${name}\n\nJump straight into your dashboard:\n${dashboardUrl}\n\nQuick start:\n  1. Verify your email from the separate verification message.\n  2. Browse the available courses.\n  3. Redeem an access code if you have one, or contact the admin to enroll.\n\nWe're glad to have you on board!\n\n${SIGN_OFF.en}`,
  };
}

export function buildEnrollmentConfirmationEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  dashboardUrl: string;
  supportEmail: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    name,
    course,
    tier,
    dashboardUrl,
    supportEmail,
    locale = "en",
  } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  if (locale === "ar") {
    return {
      to,
      subject: `تم تأكيد اشتراكك في ${courseStr} — ${tierStr}`,
      text: `مرحباً ${name},\n\nيسعدنا إخبارك بأن المسؤول وافق على اشتراكك:\n  • الدورة: ${courseStr}\n  • المستوى: ${tierStr}\n\nيمكنك الآن الدخول مباشرة إلى الدرس الأول من لوحة التحكم:\n${dashboardUrl}\n\nنصائح للاستفادة القصوى:\n  • خصّص 20–30 دقيقة يومياً للدراسة المنتظمة.\n  • أكمل الاختبارات القصيرة لتثبيت المعلومة.\n  • راجع الكلمات الضعيفة كل أسبوع.\n\nهل تحتاج مساعدة؟ راسلنا على ${supportEmail}.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `Your enrollment is confirmed: ${courseStr} — ${tierStr}`,
    text: `Hi ${name},\n\nGreat news — the admin has approved your enrollment:\n  • Course: ${courseStr}\n  • Tier: ${tierStr}\n\nYou can jump straight into the first lesson from your dashboard:\n${dashboardUrl}\n\nLearning tips:\n  • Aim for 20–30 minutes a day for steady progress.\n  • Finish each lesson's short quiz to lock in what you learn.\n  • Review your weak-words list weekly.\n\nNeed help? Email us at ${supportEmail}.\n\n${SIGN_OFF.en}`,
  };
}

export function buildCourseAccessEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  dashboardUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, course, tier, dashboardUrl, locale = "en" } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  if (locale === "ar") {
    return {
      to,
      subject: `تم تفعيل دخولك إلى ${courseStr} — ${tierStr}`,
      text: `مرحباً ${name},\n\nأنت الآن مشترك في ${courseStr} — ${tierStr}.\n\nطريقة الدخول:\n  1. افتح لوحة التحكم: ${dashboardUrl}\n  2. اختر الدورة من القائمة الرئيسية.\n  3. ابدأ بالدرس الأول.\n\nخطوات أولى مقترحة:\n  • شاهد فيديو التعريف بالدورة.\n  • أكمل اختبار تحديد المستوى إن كان متوفراً.\n  • اضبط هدف الدراسة اليومي.\n\nبالتوفيق!\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `You're enrolled in ${courseStr} — ${tierStr}`,
    text: `Hi ${name},\n\nYou're now enrolled in ${courseStr} — ${tierStr}.\n\nHow to access:\n  1. Open your dashboard: ${dashboardUrl}\n  2. Pick the course from the main menu.\n  3. Start with the first lesson.\n\nSuggested first steps:\n  • Watch the course intro video.\n  • Take the placement quiz if one is available.\n  • Set a daily study goal.\n\nGood luck!\n\n${SIGN_OFF.en}`,
  };
}

export function buildExpiryReminderEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  expiresAt: Date;
  dashboardUrl: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    name,
    course,
    tier,
    expiresAt,
    dashboardUrl,
    locale = "en",
  } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  const expiryStr =
    locale === "ar"
      ? expiresAt.toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : expiresAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  if (locale === "ar") {
    return {
      to,
      subject: `تذكير: اشتراكك في ${courseStr} ينتهي في ${expiryStr}`,
      text: `مرحباً ${name},\n\nنود تذكيرك بأن اشتراكك في ${courseStr} (${tierStr}) سينتهي خلال 7 أيام، بتاريخ ${expiryStr}.\n\nللحفاظ على وصولك دون انقطاع، يرجى تجديد الاشتراك من لوحة التحكم:\n${dashboardUrl}\n\n🎁 عرض خاص للتجديد: تواصل مع المسؤول للحصول على رمز خصم خاص.\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `Reminder: your ${courseStr} access expires on ${expiryStr}`,
    text: `Hi ${name},\n\nA quick heads-up — your ${courseStr} (${tierStr}) enrollment is set to expire in 7 days, on ${expiryStr}.\n\nTo keep your access uninterrupted, renew from your dashboard:\n${dashboardUrl}\n\n🎁 Special renewal offer: contact the admin for a discount code.\n\n${SIGN_OFF.en}`,
  };
}

export function buildAdminNewSignupEmail(params: {
  to: string;
  adminName: string;
  newUserName: string;
  newUserEmail: string;
  signupAt: Date;
  adminUrl: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    adminName,
    newUserName,
    newUserEmail,
    signupAt,
    adminUrl,
    locale = "en",
  } = params;
  const when = signupAt.toISOString();
  if (locale === "ar") {
    return {
      to,
      subject: `تسجيل جديد: ${newUserName}`,
      text: `مرحباً ${adminName},\n\nهناك طالب جديد سجّل في المنصة:\n  • الاسم: ${newUserName}\n  • البريد: ${newUserEmail}\n  • وقت التسجيل: ${when}\n\nراجع التفاصيل من لوحة المسؤول:\n${adminUrl}\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `New signup: ${newUserName}`,
    text: `Hi ${adminName},\n\nA new student just signed up:\n  • Name: ${newUserName}\n  • Email: ${newUserEmail}\n  • Signed up at: ${when}\n\nReview details in the admin dashboard:\n${adminUrl}\n\n${SIGN_OFF.en}`,
  };
}

export function buildAdminNewEnrollmentEmail(params: {
  to: string;
  adminName: string;
  studentName: string;
  studentEmail: string;
  course: string;
  tier: string;
  source: string;
  adminUrl: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    adminName,
    studentName,
    studentEmail,
    course,
    tier,
    source,
    adminUrl,
    locale = "en",
  } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  if (locale === "ar") {
    return {
      to,
      subject: `اشتراك جديد: ${studentName} في ${courseStr}`,
      text: `مرحباً ${adminName},\n\nتم إنشاء اشتراك جديد:\n  • الطالب: ${studentName} (${studentEmail})\n  • الدورة: ${courseStr}\n  • المستوى: ${tierStr}\n  • المصدر: ${source}\n\nالتفاصيل من لوحة المسؤول:\n${adminUrl}\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `New enrollment: ${studentName} in ${courseStr}`,
    text: `Hi ${adminName},\n\nA new enrollment was created:\n  • Student: ${studentName} (${studentEmail})\n  • Course: ${courseStr}\n  • Tier: ${tierStr}\n  • Source: ${source}\n\nDetails in the admin dashboard:\n${adminUrl}\n\n${SIGN_OFF.en}`,
  };
}

export function buildPaymentVerifiedEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  amountSar: number;
  verifiedAt: Date;
  dashboardUrl: string;
  locale?: Locale;
}): EmailMessage {
  const {
    to,
    name,
    course,
    tier,
    amountSar,
    verifiedAt,
    dashboardUrl,
    locale = "en",
  } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  const when =
    locale === "ar"
      ? verifiedAt.toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : verifiedAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  if (locale === "ar") {
    return {
      to,
      subject: `تم تأكيد الدفع ✅ — ${courseStr}`,
      text: `مرحباً ${name},\n\nتم التحقق من تحويلك البنكي وتفعيل اشتراكك.\n  • الدورة: ${courseStr} — ${tierStr}\n  • المبلغ: ${amountSar} ر.س\n  • تاريخ التفعيل: ${when}\n\nيمكنك الآن الدخول إلى الدورة:\n${dashboardUrl}\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: `Payment Verified ✅ — ${courseStr}`,
    text: `Hi ${name},\n\nWe've verified your bank transfer and your enrollment is now active.\n  • Course: ${courseStr} — ${tierStr}\n  • Amount: ${amountSar} SAR\n  • Activated on: ${when}\n\nAccess your course here:\n${dashboardUrl}\n\n${SIGN_OFF.en}`,
  };
}

export function buildAbandonedCartEmail(params: {
  to: string;
  name: string;
  cartItems: { course: string; tier: string }[];
  cartUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, cartItems, cartUrl, locale = "en" } = params;
  const itemLines = cartItems
    .map((i) => `  • ${courseLabel(i.course, locale)} — ${tierLabel(i.tier, locale)}`)
    .join("\n");
  if (locale === "ar") {
    return {
      to,
      subject: "لديك دورات في السلة بانتظارك",
      text: `مرحباً ${name},\n\nلاحظنا أنك أضفت دورات إلى سلتك لكنك لم تكمل التسجيل بعد:\n${itemLines}\n\nأكمل عملية الشراء الآن:\n${cartUrl}\n\nلا تفوّت فرصتك في التعلم!\n\n${SIGN_OFF.ar}`,
    };
  }
  return {
    to,
    subject: "You left courses in your cart",
    text: `Hi ${name},\n\nWe noticed you added courses to your cart but haven't completed checkout:\n${itemLines}\n\nComplete your purchase now:\n${cartUrl}\n\nDon't miss out on your learning journey!\n\n${SIGN_OFF.en}`,
  };
}

export function buildPaymentRejectedEmail(params: {
  to: string;
  name: string;
  course: string;
  tier: string;
  reason: string | null;
  paymentsUrl: string;
  locale?: Locale;
}): EmailMessage {
  const { to, name, course, tier, reason, paymentsUrl, locale = "en" } = params;
  const courseStr = courseLabel(course, locale);
  const tierStr = tierLabel(tier, locale);
  if (locale === "ar") {
    const reasonLine = reason
      ? `\n  • السبب: ${reason}`
      : "\n  • لم يُذكر سبب محدد.";
    return {
      to,
      subject: `لم يتم قبول إثبات الدفع ❌ — ${courseStr}`,
      text: `مرحباً ${name},\n\nراجع المسؤول إثبات تحويلك البنكي ولم يتم قبوله.\n  • الدورة: ${courseStr} — ${tierStr}${reasonLine}\n\nيمكنك رفع إثبات جديد من صفحة المدفوعات:\n${paymentsUrl}\n\nإن كنت بحاجة إلى مساعدة، لا تتردد بالتواصل معنا.\n\n${SIGN_OFF.ar}`,
    };
  }
  const reasonLine = reason
    ? `\n  • Reason: ${reason}`
    : "\n  • No specific reason was provided.";
  return {
    to,
    subject: `Payment Rejected ❌ — ${courseStr}`,
    text: `Hi ${name},\n\nAn admin reviewed your bank transfer proof and was unable to verify it.\n  • Course: ${courseStr} — ${tierStr}${reasonLine}\n\nYou can re-upload a new proof from your payments page:\n${paymentsUrl}\n\nIf you need help, please reply to this email.\n\n${SIGN_OFF.en}`,
  };
}
