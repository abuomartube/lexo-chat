// Typed fetch helpers for platform endpoints (enrollments, admin, sso).
// These hit /api which is the api-server artifact via the workspace proxy.

export type Tier = "intro" | "advance" | "complete";

export interface Enrollment {
  id: string;
  userId: string;
  tier: Tier;
  status: "active" | "expired" | "revoked";
  source: "admin" | "code" | "stripe";
  grantedBy: string | null;
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
  isActive: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  enrollments: Omit<Enrollment, "isActive">[];
  englishEnrollments?: Omit<EnglishEnrollment, "isActive">[];
}

export interface AccessCodeRow {
  id: string;
  code: string;
  tier: string;
  status: "active" | "used" | "revoked";
  maxUses: number;
  usedCount: number;
  createdBy: string | null;
  createdAt: string;
  redeemedByUserId: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  note: string | null;
  redeemerName: string | null;
  redeemerEmail: string | null;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

const init: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

export async function fetchMyEnrollments(): Promise<Enrollment[]> {
  const res = await fetch("/api/enrollments/me", {
    ...init,
    method: "GET",
    cache: "no-store",
  });
  const data = await jsonOrThrow<{ enrollments: Enrollment[] }>(res);
  return data.enrollments;
}

export async function redeemAccessCode(code: string): Promise<Enrollment> {
  const res = await fetch("/api/enrollments/redeem", {
    ...init,
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const data = await jsonOrThrow<{ enrollment: Enrollment }>(res);
  return data.enrollment;
}

export async function launchTier(tier: Tier): Promise<{ url: string }> {
  const res = await fetch(`/api/sso/${tier}/launch`, {
    ...init,
    method: "POST",
  });
  return jsonOrThrow<{ url: string }>(res);
}

// ───── Admin ─────

export async function fetchStudents(): Promise<Student[]> {
  const res = await fetch("/api/admin/students", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ students: Student[] }>(res);
  return data.students;
}

export async function grantTier(
  studentId: string,
  tier: Tier,
  expiresAt?: string | null,
  note?: string,
): Promise<Enrollment> {
  const res = await fetch(`/api/admin/students/${studentId}/grant`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ tier, expiresAt: expiresAt ?? null, note }),
  });
  const data = await jsonOrThrow<{ enrollment: Enrollment }>(res);
  return data.enrollment;
}

// Soft-revokes an INTRO enrollment (sets status to 'revoked'). Used from the
// inline X chip in the StudentsTab, which only lists intro enrollments.
// English enrollments are revoked from EnrollmentsTab via patchEnrollment.
export async function revokeEnrollment(enrollmentId: string): Promise<void> {
  const res = await fetch(
    `/api/admin/enrollments/${enrollmentId}?course=intro`,
    {
      ...init,
      method: "PATCH",
      body: JSON.stringify({ status: "revoked" }),
    },
  );
  await jsonOrThrow<{ enrollment: Enrollment }>(res);
}

// Soft-revokes an ENGLISH enrollment (sets status to 'revoked').
export async function revokeEnglishEnrollment(
  enrollmentId: string,
): Promise<void> {
  const res = await fetch(
    `/api/admin/enrollments/${enrollmentId}?course=english`,
    {
      ...init,
      method: "PATCH",
      body: JSON.stringify({ status: "revoked" }),
    },
  );
  await jsonOrThrow<{ enrollment: EnglishEnrollment }>(res);
}

export async function fetchAccessCodes(): Promise<AccessCodeRow[]> {
  const res = await fetch("/api/admin/codes", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ codes: AccessCodeRow[] }>(res);
  return data.codes;
}

export async function createAccessCodes(payload: {
  tier: Tier;
  count: number;
  maxUses?: number;
  expiresAt?: string | null;
  note?: string;
}): Promise<AccessCodeRow[]> {
  const res = await fetch("/api/admin/codes", {
    ...init,
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await jsonOrThrow<{ codes: AccessCodeRow[] }>(res);
  return data.codes;
}

export async function revokeAccessCode(codeId: string): Promise<void> {
  const res = await fetch(`/api/admin/codes/${codeId}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ code: AccessCodeRow }>(res);
}

export async function fetchEnglishAccessCodes(): Promise<AccessCodeRow[]> {
  const res = await fetch("/api/admin/english/codes", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ codes: AccessCodeRow[] }>(res);
  return data.codes;
}

export async function createEnglishAccessCodes(payload: {
  tier: EnglishTier;
  count: number;
  maxUses?: number;
  expiresAt?: string | null;
  note?: string;
}): Promise<AccessCodeRow[]> {
  const res = await fetch("/api/admin/english/codes", {
    ...init,
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await jsonOrThrow<{ codes: AccessCodeRow[] }>(res);
  return data.codes;
}

export async function revokeEnglishAccessCode(codeId: string): Promise<void> {
  const res = await fetch(`/api/admin/english/codes/${codeId}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ code: AccessCodeRow }>(res);
}

// ───── Phase 4 P2 — admin content management ─────

export interface AdminEnrollmentRow {
  id: string;
  userId: string;
  studentName: string | null;
  studentEmail: string | null;
  /** Tier name; values depend on `course` (intro: intro/advance/complete; english: beginner/intermediate/advanced). */
  tier: string;
  status: "active" | "expired" | "revoked";
  source: "admin" | "code" | "stripe";
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
  course: "intro" | "english";
}

export interface FaqRow {
  id: string;
  courseSlug: string | null;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRow {
  slug: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string | null;
  subtitleAr: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  /** Present on /admin/courses; absent on the public /courses endpoint. */
  totalActiveEnrollments?: number;
  tiers?: { tier: string; count: number }[];
}

export async function patchStudent(
  id: string,
  body: { name?: string; role?: "student" | "admin" },
): Promise<Student> {
  const res = await fetch(`/api/admin/students/${id}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ student: Student }>(res);
  return data.student;
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await fetch(`/api/admin/students/${id}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ message: string }>(res);
}

export async function fetchAllEnrollments(filters?: {
  status?: "active" | "expired" | "revoked";
  tier?: string;
  course?: "intro" | "english";
}): Promise<AdminEnrollmentRow[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.tier) params.set("tier", filters.tier);
  if (filters?.course) params.set("course", filters.course);
  const qs = params.toString();
  const res = await fetch(`/api/admin/enrollments${qs ? `?${qs}` : ""}`, {
    ...init,
    method: "GET",
  });
  const data = await jsonOrThrow<{ enrollments: AdminEnrollmentRow[] }>(res);
  return data.enrollments;
}

export async function patchEnrollment(
  id: string,
  course: "intro" | "english",
  body: {
    status?: "active" | "expired" | "revoked";
    expiresAt?: string | null;
    note?: string | null;
  },
): Promise<AdminEnrollmentRow> {
  const res = await fetch(`/api/admin/enrollments/${id}?course=${course}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ enrollment: AdminEnrollmentRow }>(res);
  return data.enrollment;
}

export async function deleteEnrollment(
  id: string,
  course: "intro" | "english",
): Promise<void> {
  const res = await fetch(`/api/admin/enrollments/${id}?course=${course}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ message: string }>(res);
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  activeToday: number;
  activeThisWeek: number;
  totalActiveEnrollments: number;
  enrollmentsByTier: {
    course: "intro" | "english";
    tier: string;
    count: number;
  }[];
  conversionRate: number;
  revenueAllTime: number;
  revenueDaily30: { date: string; amount: number }[];
  signupsDaily30: { date: string; count: number }[];
  enrollmentsDaily30: { date: string; count: number }[];
  recentSignups: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats", { ...init, method: "GET" });
  return jsonOrThrow<AdminStats>(res);
}

export async function fetchEmailRecipientsCount(
  audience: "all" | "course",
  courseSlug?: "intro" | "english" | "ielts",
): Promise<number> {
  const params = new URLSearchParams({ audience });
  if (courseSlug) params.set("courseSlug", courseSlug);
  const res = await fetch(`/api/admin/email/recipients?${params.toString()}`, {
    ...init,
    method: "GET",
  });
  const data = await jsonOrThrow<{ count: number }>(res);
  return data.count;
}

export async function broadcastEmail(body: {
  audience: "all" | "course";
  courseSlug?: "intro" | "english" | "ielts";
  subject: string;
  body: string;
}): Promise<{
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  stubMode: boolean;
}> {
  const res = await fetch("/api/admin/email/broadcast", {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

export type EmailLogType =
  | "email_verification"
  | "password_reset"
  | "welcome"
  | "enrollment_confirmation"
  | "course_access"
  | "expiry_reminder"
  | "admin_new_signup"
  | "admin_new_enrollment"
  | "broadcast";

export interface EmailLogRow {
  id: string;
  userId: string | null;
  toEmail: string;
  subject: string;
  emailType: EmailLogType;
  status: "sent" | "failed";
  error: string | null;
  sentAt: string;
}

export async function fetchEmailLog(params?: {
  type?: EmailLogType;
  status?: "sent" | "failed";
  limit?: number;
}): Promise<EmailLogRow[]> {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit));
  const url = q.toString() ? `/api/admin/emails?${q}` : "/api/admin/emails";
  const res = await fetch(url, { ...init, method: "GET" });
  const data = await jsonOrThrow<{ emails: EmailLogRow[] }>(res);
  return data.emails;
}

export interface ExpiringEnrollmentRow {
  enrollmentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  course: "intro" | "english";
  tier: string;
  expiresAt: string;
  alreadyReminded: boolean;
}

export async function fetchExpiringEnrollments(
  days = 7,
): Promise<{ days: number; enrollments: ExpiringEnrollmentRow[] }> {
  const res = await fetch(`/api/admin/email/expiring?days=${days}`, {
    ...init,
    method: "GET",
  });
  return jsonOrThrow(res);
}

export async function sendExpiryReminders(days = 7): Promise<{
  considered: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  stubMode: boolean;
}> {
  const res = await fetch(
    `/api/admin/email/send-expiry-reminders?days=${days}`,
    { ...init, method: "POST" },
  );
  return jsonOrThrow(res);
}

export async function fetchAdminFaqs(): Promise<FaqRow[]> {
  const res = await fetch("/api/admin/faqs", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ faqs: FaqRow[] }>(res);
  return data.faqs;
}

export async function createFaq(body: {
  courseSlug: string | null;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  isPublished?: boolean;
}): Promise<FaqRow> {
  const res = await fetch("/api/admin/faqs", {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ faq: FaqRow }>(res);
  return data.faq;
}

export async function patchFaq(
  id: string,
  body: Partial<{
    courseSlug: string | null;
    questionEn: string;
    questionAr: string;
    answerEn: string;
    answerAr: string;
    isPublished: boolean;
  }>,
): Promise<FaqRow> {
  const res = await fetch(`/api/admin/faqs/${id}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ faq: FaqRow }>(res);
  return data.faq;
}

export async function deleteFaq(id: string): Promise<void> {
  const res = await fetch(`/api/admin/faqs/${id}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ message: string }>(res);
}

export async function reorderFaqs(ids: string[]): Promise<void> {
  const res = await fetch("/api/admin/faqs/reorder", {
    ...init,
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  await jsonOrThrow<{ message: string }>(res);
}

export async function fetchAdminCourses(): Promise<CourseRow[]> {
  const res = await fetch("/api/admin/courses", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ courses: CourseRow[] }>(res);
  return data.courses;
}

export async function patchCourse(
  slug: string,
  body: Partial<{
    titleEn: string;
    titleAr: string;
    subtitleEn: string | null;
    subtitleAr: string | null;
    isPublished: boolean;
    displayOrder: number;
  }>,
): Promise<CourseRow> {
  const res = await fetch(`/api/admin/courses/${slug}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ course: CourseRow }>(res);
  return data.course;
}

export const TIER_LABELS: Record<Tier, { en: string; ar: string }> = {
  intro: { en: "IELTS Intro (A2 → B1)", ar: "آيلتس تمهيدي (A2 → B1)" },
  advance: { en: "IELTS Advance (B1 → C1)", ar: "آيلتس متقدم (B1 → C1)" },
  complete: { en: "IELTS Complete (A2 → C1)", ar: "آيلتس شامل (A2 → C1)" },
};

// ───── LEXO for English (separate course, separate tier enum) ─────

export type EnglishTier = "beginner" | "intermediate" | "advanced";

export interface EnglishEnrollment {
  id: string;
  userId: string;
  tier: EnglishTier;
  status: "active" | "expired" | "revoked";
  source: "admin" | "code" | "stripe";
  grantedBy: string | null;
  grantedAt: string;
  expiresAt: string | null;
  note: string | null;
  isActive: boolean;
}

export async function grantEnglishTier(
  studentId: string,
  tier: EnglishTier,
  expiresAt?: string | null,
  note?: string,
): Promise<EnglishEnrollment> {
  const res = await fetch(
    `/api/admin/english/students/${studentId}/grant`,
    {
      ...init,
      method: "POST",
      body: JSON.stringify({ tier, expiresAt: expiresAt ?? null, note }),
    },
  );
  const data = await jsonOrThrow<{ enrollment: EnglishEnrollment }>(res);
  return data.enrollment;
}

export async function fetchMyEnglishEnrollments(): Promise<
  EnglishEnrollment[]
> {
  const res = await fetch("/api/english/me", {
    ...init,
    method: "GET",
    cache: "no-store",
  });
  const data = await jsonOrThrow<{ enrollments: EnglishEnrollment[] }>(res);
  return data.enrollments;
}

export async function redeemEnglishCode(
  code: string,
): Promise<EnglishEnrollment> {
  const res = await fetch("/api/english/redeem", {
    ...init,
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const data = await jsonOrThrow<{ enrollment: EnglishEnrollment }>(res);
  return data.enrollment;
}

// English tools live inside the EduLexo dashboard hub at the English-scoped
// path /dashboard/english. The standalone /lexo landing was removed in
// phase 2 and now redirects here. Phase-2 L5 renamed the path from
// /dashboard/lexo to /dashboard/english to make English-only scope explicit.
export const ENGLISH_APP_URL = "/dashboard/english";

/**
 * Returns true if the user has at least one currently-active English
 * enrollment (status !== "revoked" AND isActive === true). Used as the gate
 * for the /dashboard/english Lexo Tools dashboard. Strict semantics: expired
 * enrollments do NOT grant access.
 */
export function hasActiveEnglishAccess(
  enrollments: EnglishEnrollment[] | undefined | null,
): boolean {
  if (!enrollments) return false;
  return enrollments.some((e) => e.status !== "revoked" && e.isActive);
}

export const ENGLISH_TIER_LABELS: Record<
  EnglishTier,
  { en: string; ar: string }
> = {
  beginner: { en: "A1 → B1", ar: "A1 → B1" },
  intermediate: { en: "B2 → C1", ar: "B2 → C1" },
  advanced: { en: "A1 → C1 (Complete)", ar: "A1 → C1 (شامل)" },
};

// ───── English lessons (read-only, used by /dashboard/english) ─────

export interface EnglishLessonSummary {
  id: number;
  title: string;
  titleAr: string | null;
  vimeoUrl: string;
  tier: string;
  level: string;
  sortOrder: number;
  locked: boolean;
  completed: boolean;
  progress: {
    watchedSeconds: number;
    durationSeconds: number;
    lastPositionSeconds: number;
  } | null;
}

export interface EnglishLessonsResponse {
  lessons: EnglishLessonSummary[];
  bestTier: EnglishTier | null;
  allowedLevels: string[];
}

export async function fetchEnglishLessons(): Promise<EnglishLessonsResponse> {
  const res = await fetch("/api/english/mentor/lessons", {
    ...init,
    method: "GET",
    cache: "no-store",
  });
  return jsonOrThrow<EnglishLessonsResponse>(res);
}

export interface EnglishStudyTimeResponse {
  totalMinutes: number;
  dailyBreakdown: { date: string; minutes: number }[];
}

export async function fetchEnglishStudyTime(
  range: "week" | "month" = "week",
): Promise<EnglishStudyTimeResponse> {
  const res = await fetch(
    `/api/english/me/study-time?range=${encodeURIComponent(range)}`,
    { ...init, method: "GET", cache: "no-store" },
  );
  return jsonOrThrow<EnglishStudyTimeResponse>(res);
}

export interface EnglishStreakResponse {
  currentStreak: number;
  longestStreak: number;
  todayActive: boolean;
  lastActiveDate: string | null;
}

export async function fetchEnglishStreak(): Promise<EnglishStreakResponse> {
  const res = await fetch(`/api/english/me/streak`, {
    ...init,
    method: "GET",
    cache: "no-store",
  });
  return jsonOrThrow<EnglishStreakResponse>(res);
}

export interface EnglishLastLessonResponse {
  lesson: {
    id: number;
    title: string;
    titleAr: string | null;
    level: string;
    tier: string;
    lastPositionSeconds: number;
    watchedSeconds: number;
    durationSeconds: number;
    updatedAt: string;
  } | null;
}

export async function fetchEnglishLastLesson(): Promise<EnglishLastLessonResponse> {
  const res = await fetch(`/api/english/me/last-lesson`, {
    ...init,
    method: "GET",
    cache: "no-store",
  });
  return jsonOrThrow<EnglishLastLessonResponse>(res);
}

// ─────────────────── English Curriculum (read-only) ─────────────────
// Thin GET wrapper for /api/english/curriculum/books used by the LexoHub
// Books Roadmap. Mirrors the server route response. Auth-gated; handler
// already filters by tier and returns per-book progress counts.
export interface EnglishCurriculumBook {
  id: number;
  tier: string;
  bookNumber: number;
  title: string;
  titleAr: string | null;
  subtitle: string | null;
  subtitleAr: string | null;
  coverImage: string | null;
  status: string;
  locked: boolean;
  totalLessons: number;
  completedLessons: number;
}

export interface EnglishCurriculumBooksResponse {
  bestTier: string | null;
  books: EnglishCurriculumBook[];
}

export async function fetchEnglishCurriculumBooks(): Promise<EnglishCurriculumBooksResponse> {
  const res = await fetch(`/api/english/curriculum/books`, {
    ...init,
    method: "GET",
    cache: "no-store",
  });
  return jsonOrThrow<EnglishCurriculumBooksResponse>(res);
}

// ─────────────────────────── Certificates ───────────────────────────

export type CertificateCourse = "intro" | "english";

export interface MyCertificate {
  id: string;
  course: CertificateCourse;
  tier: string;
  certificateId: string;
  completionDate: string;
  issuedAt: string;
}

export interface AdminCertificate extends MyCertificate {
  userId: string;
  userName: string;
  userEmail: string;
  revokedAt: string | null;
  revokeReason: string | null;
}

export async function fetchMyCertificates(): Promise<MyCertificate[]> {
  const res = await fetch("/api/certificates/mine", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ certificates: MyCertificate[] }>(res);
  return data.certificates;
}

export async function fetchAllCertificates(params?: {
  search?: string;
  course?: CertificateCourse;
  status?: "active" | "revoked";
}): Promise<AdminCertificate[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.course) qs.set("course", params.course);
  if (params?.status) qs.set("status", params.status);
  const url = `/api/admin/certificates${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { ...init, method: "GET" });
  const data = await jsonOrThrow<{ certificates: AdminCertificate[] }>(res);
  return data.certificates;
}

export async function issueCertificate(input: {
  userId: string;
  course: CertificateCourse;
  tier: string;
  enrollmentId?: string;
  completionDate?: string;
}): Promise<AdminCertificate> {
  const res = await fetch("/api/admin/certificates/issue", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ certificate: AdminCertificate }>(res);
  return data.certificate;
}

export async function revokeCertificate(
  id: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(`/api/admin/certificates/${id}/revoke`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ reason: reason ?? undefined }),
  });
  await jsonOrThrow<{ certificate: AdminCertificate }>(res);
}

export function getCertificatePdfUrl(id: string): string {
  return `/api/certificates/${id}/pdf`;
}

// ───── Checkout (Tabby + Tamara + Bank Transfer) ─────

export type CheckoutCourse = "intro" | "english" | "ielts";
/** Payment providers shown to the buyer at checkout. */
export type CheckoutProvider = "tabby" | "tamara" | "bank_transfer";
/** Provider that can produce a redirect URL — bank transfer cannot. */
export type RedirectProvider = "tabby" | "tamara";
export type PaymentMode = "sandbox" | "live";
export type PaymentStatus =
  | "created"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "expired";

export interface BankTransferDetails {
  bankNameEn: string;
  bankNameAr: string;
  accountNameEn: string;
  accountNameAr: string;
  iban: string;
  swift: string;
}

export interface BankTransferDetailsResponse {
  configured: boolean;
  bank?: BankTransferDetails;
  missing?: string;
}

export async function fetchBankTransferDetails(): Promise<BankTransferDetailsResponse> {
  const res = await fetch("/api/checkout/bank-transfer/details", {
    ...init,
    method: "GET",
  });
  return jsonOrThrow<BankTransferDetailsResponse>(res);
}

export interface BankTransferStartResponse {
  paymentId: string;
  provider: "bank_transfer";
  status: "pending";
  reference: string;
}

export interface BankTransferStartArgs {
  course: CheckoutCourse;
  tier: string;
  language: "en" | "ar";
  senderName: string;
  proofObjectPath: string;
  proofContentType: string;
  proofFilename: string;
  discountCode?: string;
}

export async function startBankTransferPayment(
  args: BankTransferStartArgs,
): Promise<BankTransferStartResponse> {
  const res = await fetch("/api/checkout/bank-transfer", {
    ...init,
    method: "POST",
    body: JSON.stringify(args),
  });
  return jsonOrThrow<BankTransferStartResponse>(res);
}

/**
 * Two-step direct-to-GCS upload used by the bank-transfer checkout for
 * payment-proof attachments. (1) ask the server for a presigned PUT URL,
 * then (2) PUT the file bytes straight to GCS. The server only sees the
 * resulting `objectPath` once the buyer submits the checkout form.
 */
export interface UploadedProof {
  objectPath: string;
  contentType: string;
  filename: string;
}

/**
 * Upload an avatar image and persist its object path on the user's profile.
 * Uses the same two-step request-url + PUT flow as the payment-proof helper,
 * then PATCHes /auth/me with the resulting `objectPath` so the server can
 * normalize it, set the ACL, and store it on the user row.
 */
export async function uploadAvatar(
  file: File,
): Promise<{ avatarUrl: string | null }> {
  const reqRes = await fetch("/api/storage/uploads/request-url", {
    ...init,
    method: "POST",
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const { uploadURL, objectPath } = await jsonOrThrow<{
    uploadURL: string;
    objectPath: string;
  }>(reqRes);
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error(`upload_failed_${putRes.status}`);
  const patchRes = await fetch("/api/auth/me", {
    ...init,
    method: "PATCH",
    body: JSON.stringify({ avatarObjectPath: objectPath }),
  });
  const data = await jsonOrThrow<{ user: { avatarUrl: string | null } }>(
    patchRes,
  );
  return { avatarUrl: data.user.avatarUrl };
}

/**
 * PATCH the current user's profile (name / phone / bio / clear avatar /
 * preferred language / notification preferences).
 * Returns nothing — callers should invalidate the auth-me query to refresh.
 */
export async function updateMyProfile(input: {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  avatarObjectPath?: string | null;
  preferredLanguage?: "en" | "ar";
  notifyExpiry?: boolean;
  notifyMarketing?: boolean;
}): Promise<void> {
  const res = await fetch("/api/auth/me", {
    ...init,
    method: "PATCH",
    body: JSON.stringify(input),
  });
  await jsonOrThrow(res);
}

/**
 * Change the current user's password. Server verifies `currentPassword`,
 * hashes the new one, and rotates the session cookie.
 */
export async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const res = await fetch("/api/auth/change-password", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  await jsonOrThrow(res);
}

export interface PublicProfileCert {
  id: string;
  course: "intro" | "english";
  tier: string;
  certificateId: string;
  completionDate: string;
  issuedAt: string;
}

export interface PublicProfileData {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  memberSince: string;
  certificates: PublicProfileCert[];
}

/**
 * Fetch a user's public profile (any signed-in user can view).
 * Returns avatar/name/bio/member-since/certificates only — no email or phone.
 */
export async function fetchPublicProfile(
  userId: string,
): Promise<PublicProfileData> {
  const res = await fetch(`/api/users/${encodeURIComponent(userId)}/profile`, {
    ...init,
    method: "GET",
  });
  const data = await jsonOrThrow<{ profile: PublicProfileData }>(res);
  return data.profile;
}

/**
 * Resolve a stored avatar path (`/objects/uploads/<id>`) to the URL that
 * actually serves the bytes (proxied through the API auth wall, where the
 * owning user passes the ACL check). Returns null when nothing is stored.
 */
export function avatarViewUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/objects/")) return `/api/storage${path}`;
  return null;
}

export async function uploadPaymentProof(file: File): Promise<UploadedProof> {
  const reqRes = await fetch("/api/storage/uploads/request-url", {
    ...init,
    method: "POST",
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const { uploadURL, objectPath } = await jsonOrThrow<{
    uploadURL: string;
    objectPath: string;
  }>(reqRes);
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`upload_failed_${putRes.status}`);
  }
  return {
    objectPath,
    contentType: file.type || "application/octet-stream",
    filename: file.name,
  };
}

/**
 * Convert an object-storage path (`/objects/uploads/<id>`) to its viewable
 * URL behind the API auth wall. Returns `null` if the path is missing or
 * malformed so callers can hide the link gracefully.
 */
export function bankProofViewUrl(
  objectPath: string | null | undefined,
): string | null {
  if (!objectPath || !objectPath.startsWith("/objects/")) return null;
  return `/api/storage${objectPath}`;
}

export async function adminVerifyBankPayment(
  paymentId: string,
  note?: string,
): Promise<{
  ok: true;
  status: "activated" | "already_captured";
  enrollmentId: string | null;
}> {
  const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ note: note ?? undefined }),
  });
  return jsonOrThrow(res);
}

export async function adminRejectBankPayment(
  paymentId: string,
  reason?: string,
): Promise<{ ok: true }> {
  const res = await fetch(`/api/admin/payments/${paymentId}/reject`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ reason: reason ?? undefined }),
  });
  return jsonOrThrow(res);
}

export interface CheckoutPreview {
  course: CheckoutCourse;
  tier: string;
  courseLabelEn: string;
  courseLabelAr: string;
  tierLabelEn: string;
  tierLabelAr: string;
  amountMinor: number;
  currency: string;
  alreadyEnrolled: boolean;
}

export interface CheckoutStartResponse {
  paymentId: string;
  provider: RedirectProvider;
  mode: PaymentMode;
  redirectUrl: string;
}

export async function fetchCheckoutPreview(
  course: CheckoutCourse,
  tier: string,
): Promise<CheckoutPreview> {
  const params = new URLSearchParams({ course, tier });
  const res = await fetch(`/api/checkout/preview?${params.toString()}`, {
    ...init,
    method: "GET",
  });
  return jsonOrThrow<CheckoutPreview>(res);
}

export async function startCheckout(
  provider: RedirectProvider,
  course: CheckoutCourse,
  tier: string,
  language: "en" | "ar",
  discountCode?: string,
): Promise<CheckoutStartResponse> {
  const body: Record<string, string> = { course, tier, language };
  if (discountCode) body.discountCode = discountCode;
  const res = await fetch(`/api/checkout/${provider}`, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
  return jsonOrThrow<CheckoutStartResponse>(res);
}

export interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  course: CheckoutCourse;
  tier: string;
  amountMinor: number;
  currency: string;
  provider: CheckoutProvider;
  mode: PaymentMode;
  status: PaymentStatus;
  providerSessionId: string | null;
  providerPaymentId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  capturedAt: string | null;
  /** Sender name typed by the student (bank-transfer rows only). */
  bankSenderName?: string | null;
  /** Object-storage path of the uploaded payment proof. */
  bankProofObjectPath?: string | null;
  /** MIME type of the uploaded proof. */
  bankProofContentType?: string | null;
  /** Original filename of the uploaded proof. */
  bankProofFilename?: string | null;
  /** Phase-7: persisted admin verification trail. */
  rejectionReason?: string | null;
  verifiedByUserId?: string | null;
  verifiedAt?: string | null;
  rejectedByUserId?: string | null;
  rejectedAt?: string | null;
}

export interface AdminPaymentsFilters {
  search?: string;
  course?: CheckoutCourse;
  provider?: CheckoutProvider;
  status?: PaymentStatus;
  limit?: number;
}

export async function fetchAdminPayments(
  filters: AdminPaymentsFilters = {},
): Promise<AdminPayment[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.course) params.set("course", filters.course);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.status) params.set("status", filters.status);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const res = await fetch(`/api/admin/payments${qs ? `?${qs}` : ""}`, {
    ...init,
    method: "GET",
  });
  const data = await jsonOrThrow<{ payments: AdminPayment[] }>(res);
  return data.payments;
}

/**
 * Phase-7c — student-facing payment row.
 */
export interface MyPayment {
  id: string;
  course: CheckoutCourse;
  tier: string;
  amountMinor: number;
  currency: string;
  provider: CheckoutProvider;
  status: PaymentStatus;
  failureReason: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  verifiedAt: string | null;
  capturedAt: string | null;
  createdAt: string;
  updatedAt: string;
  bankSenderName?: string | null;
  bankProofObjectPath?: string | null;
  bankProofContentType?: string | null;
  bankProofFilename?: string | null;
}

export async function fetchMyPayments(): Promise<MyPayment[]> {
  const res = await fetch(`/api/payments/me`, { ...init, method: "GET" });
  const data = await jsonOrThrow<{ payments: MyPayment[] }>(res);
  return data.payments;
}

export async function resubmitBankProof(
  paymentId: string,
  body: {
    senderName: string;
    proofObjectPath: string;
    proofContentType: string;
    proofFilename: string;
  },
): Promise<{ ok: true; paymentId: string; status: "pending" }> {
  const res = await fetch(`/api/payments/${paymentId}/resubmit-proof`, {
    ...init,
    method: "POST",
    body: JSON.stringify(body),
  });
  return jsonOrThrow(res);
}

/**
 * Phase-7d — admin revenue report.
 */
export interface RevenueReportRow {
  id: string;
  createdAt: string;
  capturedAt: string | null;
  studentName: string;
  studentEmail: string;
  course: CheckoutCourse;
  tier: string;
  amountMinor: number;
  currency: string;
  provider: CheckoutProvider;
  status: PaymentStatus;
}

export interface RevenueReportSummary {
  provider: CheckoutProvider;
  transactions: number;
  revenueMinor: number;
  currency: string;
}

export interface RevenueReport {
  from: string;
  to: string;
  rows: RevenueReportRow[];
  summary: RevenueReportSummary[];
}

export async function fetchRevenueReport(
  from: string,
  to: string,
): Promise<RevenueReport> {
  const params = new URLSearchParams({ from, to, format: "json" });
  const res = await fetch(`/api/admin/reports/revenue?${params.toString()}`, {
    ...init,
    method: "GET",
  });
  return jsonOrThrow<RevenueReport>(res);
}

/**
 * Returns a download URL for the CSV revenue report. The browser hits
 * this directly so the cookie session is sent.
 */
export function revenueReportCsvUrl(from: string, to: string): string {
  const params = new URLSearchParams({ from, to, format: "csv" });
  return `/api/admin/reports/revenue?${params.toString()}`;
}

// ───── Live sessions ─────

export interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  audience: "public" | "course";
  course: "intro" | "english" | null;
  tier: string | null;
  startsAt: string;
  durationMin: number;
  zoomMeetingId: string;
  zoomJoinUrl: string;
  zoomStartUrl?: string;
  zoomPasscode: string | null;
  hostId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchMyLiveSessions(): Promise<LiveSession[]> {
  const res = await fetch("/api/live-sessions", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ sessions: LiveSession[] }>(res);
  return data.sessions;
}

export async function fetchAdminLiveSessions(): Promise<LiveSession[]> {
  const res = await fetch("/api/admin/live-sessions", {
    ...init,
    method: "GET",
  });
  const data = await jsonOrThrow<{ sessions: LiveSession[] }>(res);
  return data.sessions;
}

export async function createLiveSession(input: {
  title: string;
  description?: string;
  audience: "public" | "course";
  course?: "intro" | "english" | null;
  tier?: string | null;
  startsAt: string; // ISO
  durationMin: number;
}): Promise<LiveSession> {
  const res = await fetch("/api/admin/live-sessions", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ session: LiveSession }>(res);
  return data.session;
}

export async function deleteLiveSession(id: string): Promise<void> {
  const res = await fetch(`/api/admin/live-sessions/${id}`, {
    ...init,
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`);
  }
}

// ───── Support tickets ─────

export type SupportStatus =
  | "awaiting_admin"
  | "awaiting_user"
  | "resolved"
  | "closed";
export type SupportCategory =
  | "general"
  | "billing"
  | "technical"
  | "course_content"
  | "account";
export type SupportRole = "student" | "admin";

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  lastActivityAt: string;
  closedAt: string | null;
  createdAt: string;
  // Admin-list only:
  userName?: string;
  userEmail?: string;
}

export interface SupportAttachment {
  id: string;
  messageId: string;
  objectPath: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: SupportRole;
  body: string;
  createdAt: string;
  attachments: SupportAttachment[];
}

export interface AttachmentInput {
  objectPath: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const res = await fetch("/api/support/tickets", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ tickets: SupportTicket[] }>(res);
  return data.tickets;
}

export async function fetchTicket(
  id: string,
): Promise<{ ticket: SupportTicket; messages: SupportMessage[] }> {
  const res = await fetch(`/api/support/tickets/${id}`, {
    ...init,
    method: "GET",
  });
  return jsonOrThrow<{ ticket: SupportTicket; messages: SupportMessage[] }>(
    res,
  );
}

export async function createTicket(input: {
  subject: string;
  category?: SupportCategory;
  body: string;
  attachments?: AttachmentInput[];
}): Promise<SupportTicket> {
  const res = await fetch("/api/support/tickets", {
    ...init,
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ ticket: SupportTicket }>(res);
  return data.ticket;
}

export async function replyToTicket(
  ticketId: string,
  body: string,
  attachments?: AttachmentInput[],
): Promise<{ message: SupportMessage; ticket: SupportTicket }> {
  const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
    ...init,
    method: "POST",
    body: JSON.stringify({ body, attachments }),
  });
  return jsonOrThrow<{ message: SupportMessage; ticket: SupportTicket }>(res);
}

export async function fetchAdminTickets(
  status?: SupportStatus,
): Promise<{ tickets: SupportTicket[]; counts: Record<string, number> }> {
  const url = status
    ? `/api/admin/support/tickets?status=${status}`
    : `/api/admin/support/tickets`;
  const res = await fetch(url, { ...init, method: "GET" });
  return jsonOrThrow<{
    tickets: SupportTicket[];
    counts: Record<string, number>;
  }>(res);
}

export async function setTicketStatus(
  id: string,
  status: SupportStatus,
): Promise<SupportTicket> {
  const res = await fetch(`/api/admin/support/tickets/${id}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const data = await jsonOrThrow<{ ticket: SupportTicket }>(res);
  return data.ticket;
}

export function attachmentDownloadUrl(id: string): string {
  return `/api/support/attachments/${id}`;
}

/**
 * Request a presigned URL, then PUT the file directly. Returns the metadata
 * needed to attach it to a message.
 */
export async function uploadSupportAttachment(
  file: File,
): Promise<AttachmentInput> {
  const meta = {
    name: file.name,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  };
  const grantRes = await fetch("/api/storage/uploads/request-url", {
    ...init,
    method: "POST",
    body: JSON.stringify(meta),
  });
  const grant = await jsonOrThrow<{ uploadURL: string; objectPath: string }>(
    grantRes,
  );
  const putRes = await fetch(grant.uploadURL, {
    method: "PUT",
    headers: { "Content-Type": meta.contentType },
    body: file,
  });
  if (!putRes.ok) throw new Error(`upload_failed_${putRes.status}`);
  return {
    objectPath: grant.objectPath,
    filename: file.name,
    contentType: meta.contentType,
    sizeBytes: file.size,
  };
}

export interface AdminLandingPage {
  id: number;
  course: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  heroImage: string;
  heroVideo: string;
  introVideo: string;
  descriptionEn: string;
  descriptionAr: string;
  benefitsEn: string;
  benefitsAr: string;
  targetStudentEn: string;
  targetStudentAr: string;
  whatLearnEn: string;
  whatLearnAr: string;
  ctaTextEn: string;
  ctaTextAr: string;
  ctaLink: string;
  isPublished: boolean;
}

export async function fetchAdminLandingPages(): Promise<AdminLandingPage[]> {
  const res = await fetch("/api/admin/landing-pages", { ...init, method: "GET" });
  const data = await jsonOrThrow<{ pages: AdminLandingPage[] }>(res);
  return data.pages;
}

export async function patchAdminLandingPage(
  course: string,
  body: Partial<AdminLandingPage>,
): Promise<AdminLandingPage> {
  const res = await fetch(`/api/admin/landing-pages/${course}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ page: AdminLandingPage }>(res);
  return data.page;
}

export interface AdminCourseCard {
  id: number;
  courseType: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  level: string;
  price: number;
  discount: number;
  badgeEn: string;
  badgeAr: string;
  buttonTextEn: string;
  buttonTextAr: string;
  buttonLink: string;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
  targetBand: string;
}

export async function fetchAdminCourseCards(
  courseType: string,
): Promise<AdminCourseCard[]> {
  const res = await fetch(
    `/api/admin/course-cards?courseType=${encodeURIComponent(courseType)}`,
    { ...init, method: "GET" },
  );
  const data = await jsonOrThrow<{ cards: AdminCourseCard[] }>(res);
  return data.cards;
}

export async function createAdminCourseCard(
  card: Omit<AdminCourseCard, "id">,
): Promise<AdminCourseCard> {
  const res = await fetch("/api/admin/course-cards", {
    ...init,
    method: "POST",
    body: JSON.stringify(card),
  });
  const data = await jsonOrThrow<{ card: AdminCourseCard }>(res);
  return data.card;
}

export async function patchAdminCourseCard(
  id: number,
  body: Partial<AdminCourseCard>,
): Promise<AdminCourseCard> {
  const res = await fetch(`/api/admin/course-cards/${id}`, {
    ...init,
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await jsonOrThrow<{ card: AdminCourseCard }>(res);
  return data.card;
}

export async function deleteAdminCourseCard(id: number): Promise<void> {
  const res = await fetch(`/api/admin/course-cards/${id}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow<{ ok: boolean }>(res);
}
