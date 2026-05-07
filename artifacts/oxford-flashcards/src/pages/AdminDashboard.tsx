import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Users,
  KeyRound,
  Plus,
  X,
  Trash2,
  Copy,
  Check,
  Search,
  Pencil,
  GraduationCap,
  HelpCircle,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Mail,
  ChevronRight,
  Send,
  AlertCircle,
  Award,
  Download,
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  BarChart3,
  Video,
  CalendarDays,
  MessageSquare,
  Inbox,
  TrendingUp,
  DollarSign,
  UserPlus,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import AdminLayout, { type AdminTab } from "@/components/admin/AdminLayout";
import {
  StatCard,
  Th,
  Td,
  Field,
  LoadingPanel,
  ErrorPanel,
  RadioPill,
  CARD_CLS,
} from "@/components/admin/AdminPrimitives";
import LandingPagesTab from "@/pages/admin/LandingPagesTab";
import CourseCardsTab from "@/pages/admin/CourseCardsTab";
import RolesTab from "@/pages/admin/RolesTab";
import {
  fetchStudents,
  grantTier,
  grantEnglishTier,
  revokeEnrollment,
  revokeEnglishEnrollment,
  fetchAccessCodes,
  createAccessCodes,
  revokeAccessCode,
  fetchEnglishAccessCodes,
  createEnglishAccessCodes,
  revokeEnglishAccessCode,
  patchStudent,
  deleteStudent,
  fetchAllEnrollments,
  patchEnrollment,
  deleteEnrollment,
  fetchAdminFaqs,
  createFaq,
  patchFaq,
  deleteFaq,
  reorderFaqs,
  fetchAdminCourses,
  patchCourse,
  fetchAdminStats,
  fetchEmailRecipientsCount,
  broadcastEmail,
  fetchEmailLog,
  fetchExpiringEnrollments,
  sendExpiryReminders,
  type EmailLogRow,
  type EmailLogType,
  type ExpiringEnrollmentRow,
  TIER_LABELS,
  ENGLISH_TIER_LABELS,
  type Tier,
  type EnglishTier,
  type Student,
  type AccessCodeRow,
  type AdminEnrollmentRow,
  type FaqRow,
  type CourseRow,
  fetchAllCertificates,
  issueCertificate,
  revokeCertificate,
  getCertificatePdfUrl,
  type AdminCertificate,
  type CertificateCourse,
  fetchAdminPayments,
  adminVerifyBankPayment,
  adminRejectBankPayment,
  bankProofViewUrl,
  fetchRevenueReport,
  revenueReportCsvUrl,
  type AdminPayment,
  type CheckoutCourse,
  type CheckoutProvider,
  type PaymentStatus,
  type RevenueReport,
  fetchAdminLiveSessions,
  createLiveSession,
  deleteLiveSession,
  fetchAdminTickets,
  type LiveSession,
  type SupportStatus,
  type SupportTicket,
} from "@/lib/platform-api";
import { Link as WLink } from "wouter";

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <AdminLayout tab={tab} onTabChange={setTab}>
      {tab === "overview" && <OverviewTab />}
      {tab === "students" && <StudentsTab />}
      {tab === "enrollments" && <EnrollmentsTab />}
      {tab === "faqs" && <FaqsTab />}
      {tab === "courses" && <CoursesTab />}
      {tab === "landingPages" && <LandingPagesTab />}
      {tab === "englishCards" && <CourseCardsTab courseType="english" />}
      {tab === "ieltsCards" && <CourseCardsTab courseType="ielts" />}
      {tab === "communication" && <CommunicationTab />}
      {tab === "codes" && <CodesTab />}
      {tab === "discountCodes" && <DiscountCodesTab />}
      {tab === "certificates" && <CertificatesTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "liveSessions" && <LiveSessionsTab />}
      {tab === "support" && <SupportTab />}
      {tab === "roles" && <RolesTab />}
    </AdminLayout>
  );
}

// ───────────────────────── OVERVIEW TAB ─────────────────────────

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#3b82f6", "#a855f7", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const TOOLTIP_STYLE = {
  background: "rgba(15,23,42,0.92)",
  border: "none",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 12,
} as const;

function OverviewTab() {
  const t = useT();
  const { lang } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  if (isLoading) return <LoadingPanel />;
  if (error) return <ErrorPanel msg={(error as Error).message} />;
  if (!data) return null;

  const fmtNumber = (n: number) =>
    new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US").format(n);
  const fmtPct = (n: number) =>
    new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(n);

  const tierPieData = data.enrollmentsByTier.map((row) => {
    const label =
      row.course === "intro"
        ? (TIER_LABELS[row.tier as Tier]?.[lang] ?? row.tier)
        : (ENGLISH_TIER_LABELS[row.tier as EnglishTier]?.[lang] ?? row.tier);
    const courseLabel =
      row.course === "intro" ? t("admin.course.ielts") : t("admin.course.english");
    return { name: `${courseLabel} - ${label}`, value: row.count };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={t("admin.overview.totalUsers")}
          value={fmtNumber(data.totalUsers)}
          accent="indigo"
          icon={<Users size={18} />}
        />
        <StatCard
          label={t("admin.overview.activeToday")}
          value={fmtNumber(data.activeToday)}
          accent="emerald"
          icon={<Activity size={18} />}
        />
        <StatCard
          label={t("admin.overview.totalStudents")}
          value={fmtNumber(data.totalStudents)}
          accent="violet"
          icon={<UserPlus size={18} />}
        />
        <StatCard
          label={t("admin.overview.totalEnrollments")}
          value={fmtNumber(data.totalActiveEnrollments)}
          accent="blue"
          icon={<GraduationCap size={18} />}
        />
        <StatCard
          label={t("admin.overview.activeWeek")}
          value={fmtNumber(data.activeThisWeek)}
          accent="purple"
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label={t("admin.overview.conversion")}
          value={fmtPct(data.conversionRate)}
          accent="amber"
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label={t("admin.overview.revenue")}
          value="$0"
          subValue={t("admin.overview.revenueNote")}
          accent="rose"
          icon={<DollarSign size={18} />}
        />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
        {t("admin.overview.activeProxyNote")}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={CARD_CLS + " p-5"}>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
            {t("admin.overview.signupTrend")}
          </h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data.signupsDaily30} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d: string) => d.slice(5)} minTickGap={20} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#cbd5e1" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={CARD_CLS + " p-5"}>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
            {t("admin.overview.enrollmentTrend")}
          </h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={data.enrollmentsDaily30} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d: string) => d.slice(5)} minTickGap={20} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#cbd5e1" }} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {tierPieData.length > 0 && (
          <div className={CARD_CLS + " p-5"}>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
              {t("admin.overview.tierBreakdown")}
            </h2>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={tierPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {tierPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {data.revenueDaily30 && data.revenueDaily30.length > 0 && (
          <div className={CARD_CLS + " p-5"}>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
              {t("admin.overview.revenue")}
            </h2>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={data.revenueDaily30} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(d: string) => d.slice(5)} minTickGap={20} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#cbd5e1" }} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className={CARD_CLS + " overflow-hidden"}>
        <div className="p-5 border-b border-slate-200 dark:border-gray-800">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {t("admin.overview.recentSignups")}
          </h2>
        </div>
        {data.recentSignups.length === 0 ? (
          <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
            {t("admin.overview.noSignupsYet")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-950 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <Th>{t("admin.col.name")}</Th>
                  <Th>{t("admin.col.email")}</Th>
                  <Th>{t("admin.col.role")}</Th>
                  <Th>{t("admin.col.signedUp")}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {data.recentSignups.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-800/40">
                    <Td>{u.name}</Td>
                    <Td ltr>{u.email}</Td>
                    <Td>
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                        {u.role}
                      </span>
                    </Td>
                    <Td>
                      {new Date(u.createdAt).toLocaleString(
                        lang === "ar" ? "ar-EG" : "en-US",
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── COMMUNICATION TAB ─────────────────────────

function CommunicationTab() {
  const t = useT();
  const [audience, setAudience] = useState<"all" | "course">("all");
  const [courseSlug, setCourseSlug] = useState<"english" | "ielts">(
    "english",
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!subject.trim() || !body.trim()) {
      setFeedback({ type: "error", msg: t("admin.comm.errMissing") });
      return;
    }
    try {
      const count = await fetchEmailRecipientsCount(
        audience,
        audience === "course" ? courseSlug : undefined,
      );
      const ok = window.confirm(
        t("admin.comm.confirm").replace("{n}", String(count)),
      );
      if (!ok) return;
      setSending(true);
      const result = await broadcastEmail({
        audience,
        courseSlug: audience === "course" ? courseSlug : undefined,
        subject: subject.trim(),
        body: body.trim(),
      });
      setFeedback({
        type: "success",
        msg: t("admin.comm.sent")
          .replace("{sent}", String(result.sentCount))
          .replace("{total}", String(result.recipientCount))
          .replace("{failed}", String(result.failedCount)),
      });
      setSubject("");
      setBody("");
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to send",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
        <AlertCircle
          size={18}
          className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
        />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          {t("admin.comm.stubBanner")}
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-4"
      >
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {t("admin.comm.title")}
        </h2>

        <Field label={t("admin.comm.audience")}>
          <div className="flex flex-wrap gap-2">
            <RadioPill
              checked={audience === "all"}
              onChange={() => setAudience("all")}
              label={t("admin.comm.audienceAll")}
            />
            <RadioPill
              checked={audience === "course"}
              onChange={() => setAudience("course")}
              label={t("admin.comm.audienceCourse")}
            />
          </div>
        </Field>

        {audience === "course" && (
          <Field label={t("admin.comm.course")}>
            <select
              value={courseSlug}
              onChange={(e) =>
                setCourseSlug(e.target.value as "english" | "ielts")
              }
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm w-full sm:w-64"
            >
              <option value="english">{t("admin.course.english")}</option>
              <option value="ielts">{t("admin.course.ielts")}</option>
            </select>
          </Field>
        )}

        <Field label={t("admin.comm.subject")}>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm"
            placeholder={t("admin.comm.subjectPh")}
          />
        </Field>

        <Field label={t("admin.comm.body")}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm font-mono"
            placeholder={t("admin.comm.bodyPh")}
          />
        </Field>

        {feedback && (
          <div
            className={`text-sm rounded-lg px-3 py-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-60 shadow-sm"
          >
            {sending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {t("admin.comm.send")}
          </button>
        </div>
      </form>

      <ExpiryRemindersCard />
      <EmailLogCard />
    </div>
  );
}

function ExpiryRemindersCard() {
  const t = useT();
  const qc = useQueryClient();
  const [days, setDays] = useState(7);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "email", "expiring", days],
    queryFn: () => fetchExpiringEnrollments(days),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendExpiryReminders(days),
    onSuccess: (r) => {
      setFeedback({
        type: "success",
        msg: t("admin.expiry.sentMsg")
          .replace("{sent}", String(r.sentCount))
          .replace("{considered}", String(r.considered))
          .replace("{skipped}", String(r.skippedCount))
          .replace("{failed}", String(r.failedCount)),
      });
      qc.invalidateQueries({ queryKey: ["admin", "email", "expiring"] });
      qc.invalidateQueries({ queryKey: ["admin", "emails"] });
    },
    onError: (err) =>
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed",
      }),
  });

  const enrollments: ExpiringEnrollmentRow[] = data?.enrollments ?? [];
  const pending = enrollments.filter((e) => !e.alreadyReminded).length;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {t("admin.expiry.title")}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>{t("admin.expiry.windowLabel")}</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950"
          >
            <option value={3}>3</option>
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
          </select>
          <span>{t("admin.expiry.days")}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <Loader2 size={14} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t("admin.expiry.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-gray-800">
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.expiry.col.student")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.expiry.col.course")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.expiry.col.tier")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.expiry.col.expiresAt")}
                </th>
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.expiry.col.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr
                  key={e.enrollmentId}
                  className="border-b border-slate-100 dark:border-gray-800/60"
                >
                  <td className="px-5 sm:px-6 py-2">
                    <div className="font-medium text-slate-700 dark:text-slate-200">
                      {e.userName}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {e.userEmail}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 capitalize">
                    {e.course}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 capitalize">
                    {e.tier}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                    {new Date(e.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 sm:px-6 py-2">
                    {e.alreadyReminded ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <Check size={12} />
                        {t("admin.expiry.statusReminded")}
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">
                        {t("admin.expiry.statusPending")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {feedback && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={sendMutation.isPending || pending === 0}
          onClick={() => {
            if (
              window.confirm(
                t("admin.expiry.confirm").replace("{n}", String(pending)),
              )
            ) {
              setFeedback(null);
              sendMutation.mutate();
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-50 shadow-sm"
        >
          {sendMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
          {t("admin.expiry.sendBtn").replace("{n}", String(pending))}
        </button>
      </div>
    </div>
  );
}

const EMAIL_TYPE_OPTIONS: {
  value: "" | EmailLogType;
  labelKey: TranslationKey;
}[] = [
  { value: "", labelKey: "admin.emailLog.allTypes" },
  { value: "welcome", labelKey: "admin.emailLog.type.welcome" },
  {
    value: "enrollment_confirmation",
    labelKey: "admin.emailLog.type.enrollment_confirmation",
  },
  { value: "course_access", labelKey: "admin.emailLog.type.course_access" },
  { value: "expiry_reminder", labelKey: "admin.emailLog.type.expiry_reminder" },
  {
    value: "admin_new_signup",
    labelKey: "admin.emailLog.type.admin_new_signup",
  },
  {
    value: "admin_new_enrollment",
    labelKey: "admin.emailLog.type.admin_new_enrollment",
  },
  { value: "broadcast", labelKey: "admin.emailLog.type.broadcast" },
  {
    value: "email_verification",
    labelKey: "admin.emailLog.type.email_verification",
  },
  {
    value: "password_reset",
    labelKey: "admin.emailLog.type.password_reset",
  },
];

function EmailLogCard() {
  const t = useT();
  const [typeFilter, setTypeFilter] = useState<"" | EmailLogType>("");
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed">("");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "emails", typeFilter, statusFilter],
    queryFn: () =>
      fetchEmailLog({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      }),
  });
  const rows: EmailLogRow[] = data ?? [];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {t("admin.emailLog.title")}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | EmailLogType)}
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950"
          >
            {EMAIL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | "sent" | "failed")
            }
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950"
          >
            <option value="">{t("admin.emailLog.allStatuses")}</option>
            <option value="sent">{t("admin.emailLog.statusSent")}</option>
            <option value="failed">{t("admin.emailLog.statusFailed")}</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {isFetching ? (
              <Loader2 size={11} className="inline animate-spin" />
            ) : (
              t("admin.emailLog.refresh")
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <Loader2 size={14} className="inline animate-spin mr-2" />
          {t("common.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t("admin.emailLog.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-gray-800">
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.emailLog.col.when")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.emailLog.col.type")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.emailLog.col.recipient")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("admin.emailLog.col.subject")}
                </th>
                <th className="px-5 sm:px-6 py-2 font-medium">
                  {t("admin.emailLog.col.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 dark:border-gray-800/60 align-top"
                >
                  <td className="px-5 sm:px-6 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {new Date(r.sentAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium">
                      {r.emailType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                    {r.toEmail}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-[300px]">
                    {r.subject}
                  </td>
                  <td className="px-5 sm:px-6 py-2">
                    {r.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <Check size={11} />
                        {t("admin.emailLog.statusSent")}
                      </span>
                    ) : (
                      <span
                        className="text-rose-700 dark:text-rose-300"
                        title={r.error ?? undefined}
                      >
                        {t("admin.emailLog.statusFailed")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── STUDENTS TAB ─────────────────────────

function StudentsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [grantingFor, setGrantingFor] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: fetchStudents,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeEnrollment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-students"] }),
  });

  const revokeEnglishStudentMutation = useMutation({
    mutationFn: revokeEnglishEnrollment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-students"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
    },
    onError: (err) => window.alert((err as Error).message),
  });

  const filtered = useMemo(() => {
    const list = studentsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [studentsQuery.data, search]);

  if (studentsQuery.isLoading) return <LoadingPanel />;
  if (studentsQuery.isError)
    return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder={t("admin.students.search")}
            className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <Th>{t("admin.students.col.name")}</Th>
                <Th>{t("admin.students.col.email")}</Th>
                <Th>{t("admin.students.col.role")}</Th>
                <Th>{t("admin.students.col.tiers")}</Th>
                <Th>{t("admin.students.col.joined")}</Th>
                <Th align="right">{t("admin.students.col.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40"
                >
                  <Td className="font-medium">{s.name}</Td>
                  <Td className="text-slate-600 dark:text-slate-300" ltr>
                    {s.email}
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${s.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200" : "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-200"}`}
                    >
                      {s.role}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {s.enrollments.length === 0 &&
                      (s.englishEnrollments?.length ?? 0) === 0 ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <>
                          {s.enrollments.map((e) => (
                            <span
                              key={e.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                e.status === "active"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                  : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-slate-400 line-through"
                              }`}
                              title="IELTS"
                            >
                              IELTS · {e.tier}
                              {e.status === "active" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        t("admin.students.confirmRevoke"),
                                      )
                                    ) {
                                      revokeMutation.mutate(e.id);
                                    }
                                  }}
                                  className="hover:text-rose-600"
                                  title={t("admin.students.revoke")}
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </span>
                          ))}
                          {(s.englishEnrollments ?? []).map((e) => (
                            <span
                              key={e.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                e.status === "active"
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                                  : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-slate-400 line-through"
                              }`}
                              title="LEXO for English"
                            >
                              EN · {e.tier}
                              {e.status === "active" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        t("admin.students.confirmRevoke"),
                                      )
                                    ) {
                                      revokeEnglishStudentMutation.mutate(
                                        e.id,
                                      );
                                    }
                                  }}
                                  className="hover:text-rose-600"
                                  title={t("admin.students.revoke")}
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </Td>
                  <Td className="text-slate-500 dark:text-slate-400 text-xs">
                    {new Date(s.createdAt).toLocaleDateString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setGrantingFor(s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
                      >
                        <Plus size={13} /> {t("admin.students.grant")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStudent(s)}
                        className="text-slate-400 hover:text-indigo-600 transition"
                        title={t("admin.students.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      {currentUser?.id !== s.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                t("admin.students.confirmDelete").replace(
                                  "{name}",
                                  s.name,
                                ),
                              )
                            ) {
                              deleteMutation.mutate(s.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title={t("admin.students.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-slate-500 text-sm"
                  >
                    —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {grantingFor && (
        <GrantTierModal
          student={grantingFor}
          onClose={() => setGrantingFor(null)}
          onGranted={() => {
            setGrantingFor(null);
            qc.invalidateQueries({ queryKey: ["admin-students"] });
          }}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isSelf={currentUser?.id === editingStudent.id}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            qc.invalidateQueries({ queryKey: ["admin-students"] });
          }}
        />
      )}
    </div>
  );
}

function EditStudentModal({
  student,
  isSelf,
  onClose,
  onSaved,
}: {
  student: Student;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(student.name);
  const [role, setRole] = useState<"student" | "admin">(
    student.role === "admin" ? "admin" : "student",
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      patchStudent(student.id, {
        ...(name !== student.name ? { name } : {}),
        ...(role !== student.role ? { role } : {}),
      }),
    onSuccess: onSaved,
  });

  const noChanges = name === student.name && role === student.role;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">
              {t("admin.students.editTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5" dir="ltr">
              {student.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!noChanges) saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label={t("admin.students.editName")}>
            <input
              type="text"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              maxLength={120}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label={t("admin.students.editRole")}>
            <select
              value={role}
              onChange={(ev) =>
                setRole(ev.target.value === "admin" ? "admin" : "student")
              }
              disabled={isSelf}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="student">student</option>
              <option value="admin">admin</option>
            </select>
            {isSelf && (
              <p className="mt-1.5 text-xs text-slate-500">
                {t("admin.students.editSelfNote")}
              </p>
            )}
          </Field>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">
              {(saveMutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || noChanges}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GrantTierModal({
  student,
  onClose,
  onGranted,
}: {
  student: Student;
  onClose: () => void;
  onGranted: () => void;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [course, setCourse] = useState<"intro" | "english">("intro");
  const [tier, setTier] = useState<Tier | EnglishTier>("intro");
  const [note, setNote] = useState("");

  const grantMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (course === "english") {
        await grantEnglishTier(
          student.id,
          tier as EnglishTier,
          null,
          note || undefined,
        );
      } else {
        await grantTier(student.id, tier as Tier, null, note || undefined);
      }
    },
    onSuccess: onGranted,
  });

  const tierOptions =
    course === "english"
      ? (Object.keys(ENGLISH_TIER_LABELS) as EnglishTier[]).map((tk) => ({
          value: tk,
          label: ENGLISH_TIER_LABELS[tk][lang],
        }))
      : (Object.keys(TIER_LABELS) as Tier[]).map((tk) => ({
          value: tk,
          label: TIER_LABELS[tk][lang],
        }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">
              {t("admin.students.grantTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {student.name}{" "}
              <span dir="ltr" className="text-xs">
                ({student.email})
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            grantMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {lang === "ar" ? "الدورة" : "Course"}
            </label>
            <select
              value={course}
              onChange={(ev) => {
                const next = ev.target.value as "intro" | "english";
                setCourse(next);
                setTier(next === "english" ? "beginner" : "intro");
              }}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="intro">
                {lang === "ar" ? "IELTS / المنصّة" : "IELTS / Platform"}
              </option>
              <option value="english">
                {lang === "ar" ? "LEXO للإنجليزية" : "LEXO for English"}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t("admin.students.grantTier")}
            </label>
            <select
              value={tier}
              onChange={(ev) =>
                setTier(ev.target.value as Tier | EnglishTier)
              }
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {tierOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t("admin.students.grantNote")}
            </label>
            <input
              type="text"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {grantMutation.isError && (
            <p className="text-rose-600 text-sm">
              {(grantMutation.error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={grantMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {grantMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.students.grantSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── CODES TAB ─────────────────────────

function CodesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [course, setCourse] = useState<"intro" | "english">("intro");
  const [tier, setTier] = useState<Tier | EnglishTier>("intro");
  const [count, setCount] = useState(5);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const ieltsCodesQuery = useQuery({
    queryKey: ["admin-codes"],
    queryFn: fetchAccessCodes,
  });

  const englishCodesQuery = useQuery({
    queryKey: ["admin-english-codes"],
    queryFn: fetchEnglishAccessCodes,
  });

  const createIeltsMutation = useMutation({
    mutationFn: createAccessCodes,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-codes"] });
      setNote("");
    },
  });

  const createEnglishMutation = useMutation({
    mutationFn: createEnglishAccessCodes,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-english-codes"] });
      setNote("");
    },
  });

  const revokeIeltsMutation = useMutation({
    mutationFn: revokeAccessCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-codes"] }),
  });

  const revokeEnglishMutation = useMutation({
    mutationFn: revokeEnglishAccessCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-english-codes"] }),
  });

  const activeTiers = course === "intro" ? TIER_LABELS : ENGLISH_TIER_LABELS;
  const activeCodesQuery = course === "intro" ? ieltsCodesQuery : englishCodesQuery;
  const activeCreateMutation = course === "intro" ? createIeltsMutation : createEnglishMutation;
  const activeRevokeMutation = course === "intro" ? revokeIeltsMutation : revokeEnglishMutation;

  function handleCourseChange(next: "intro" | "english") {
    setCourse(next);
    if (next === "intro") {
      setTier((Object.keys(TIER_LABELS) as Tier[])[0]);
    } else {
      setTier((Object.keys(ENGLISH_TIER_LABELS) as EnglishTier[])[0]);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
    });
  }

  function handleCreate(ev: React.FormEvent) {
    ev.preventDefault();
    if (course === "intro") {
      createIeltsMutation.mutate({ tier: tier as Tier, count, maxUses, note: note || undefined });
    } else {
      createEnglishMutation.mutate({ tier: tier as EnglishTier, count, maxUses, note: note || undefined });
    }
  }

  if (activeCodesQuery.isError)
    return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleCourseChange("intro")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            course === "intro"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow"
              : "bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-gray-700 hover:ring-indigo-400"
          }`}
        >
          {t("admin.course.ielts")}
        </button>
        <button
          type="button"
          onClick={() => handleCourseChange("english")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            course === "english"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow"
              : "bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-gray-700 hover:ring-indigo-400"
          }`}
        >
          {t("admin.course.english")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <aside className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 p-5 self-start">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Plus size={16} /> {t("admin.codes.generate.title")}
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label={t("admin.codes.generate.tier")}>
              <select
                value={tier}
                onChange={(ev) => setTier(ev.target.value as Tier | EnglishTier)}
                className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                {Object.entries(activeTiers).map(([key, labels]) => (
                  <option key={key} value={key}>
                    {labels[lang === "ar" ? "ar" : "en"]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.codes.generate.count")}>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(ev) =>
                  setCount(Math.max(1, Math.min(100, +ev.target.value || 1)))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.codes.generate.maxUses")}>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxUses}
                onChange={(ev) =>
                  setMaxUses(Math.max(1, Math.min(1000, +ev.target.value || 1)))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.codes.generate.note")}>
              <input
                type="text"
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <button
              type="submit"
              disabled={activeCreateMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {activeCreateMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.codes.generate.submit")}
            </button>
            {activeCreateMutation.isError && (
              <p className="text-rose-600 text-xs">
                {(activeCreateMutation.error as Error).message}
              </p>
            )}
          </form>
        </aside>

        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
          {activeRevokeMutation.isError && (
            <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {(activeRevokeMutation.error as Error).message}
            </div>
          )}
          {activeCodesQuery.isLoading ? (
            <LoadingPanel inline />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <Th>{t("admin.codes.col.code")}</Th>
                    <Th>{t("admin.codes.col.tier")}</Th>
                    <Th>{t("admin.codes.col.status")}</Th>
                    <Th>{t("admin.codes.col.uses")}</Th>
                    <Th>{t("admin.codes.col.redeemer")}</Th>
                    <Th>{t("admin.codes.col.created")}</Th>
                    <Th align="right"></Th>
                  </tr>
                </thead>
                <tbody>
                  {(activeCodesQuery.data ?? []).map((c) => (
                    <CodeRow
                      key={c.id}
                      c={c}
                      lang={lang}
                      copied={copiedCode === c.code}
                      onCopy={() => copyCode(c.code)}
                      onRevoke={() => {
                        if (window.confirm(t("admin.codes.confirmRevoke"))) {
                          activeRevokeMutation.mutate(c.id);
                        }
                      }}
                    />
                  ))}
                  {(activeCodesQuery.data ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-10 text-slate-500 text-sm"
                      >
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeRow({
  c,
  lang,
  copied,
  onCopy,
  onRevoke,
}: {
  c: AccessCodeRow;
  lang: string;
  copied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  const t = useT();
  const statusColor =
    c.status === "active"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
      : c.status === "used"
        ? "bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200";
  return (
    <tr className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40">
      <Td>
        <div className="flex items-center gap-2">
          <code
            className="font-mono text-xs bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded"
            dir="ltr"
          >
            {c.code}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="text-slate-400 hover:text-indigo-600 transition"
            title={t("admin.codes.copy")}
          >
            {copied ? (
              <Check size={14} className="text-emerald-600" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </Td>
      <Td>
        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
          {c.tier}
        </span>
      </Td>
      <Td>
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}
        >
          {c.status}
        </span>
      </Td>
      <Td className="text-xs text-slate-600 dark:text-slate-300">
        {c.usedCount} / {c.maxUses}
      </Td>
      <Td className="text-xs">
        {c.redeemerEmail ? (
          <span dir="ltr" className="text-slate-600 dark:text-slate-300">
            {c.redeemerEmail}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </Td>
      <Td className="text-xs text-slate-500 dark:text-slate-400">
        {new Date(c.createdAt).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { day: "numeric", month: "short", year: "numeric" },
        )}
      </Td>
      <Td align="right">
        {c.status === "active" && (
          <button
            type="button"
            onClick={onRevoke}
            className="text-rose-500 hover:text-rose-700"
            title={t("admin.students.revoke")}
          >
            <Trash2 size={14} />
          </button>
        )}
      </Td>
    </tr>
  );
}

// ───────────────────────── ENROLLMENTS TAB ─────────────────────────

const STATUS_LABELS = {
  active: {
    en: "Active",
    ar: "نشط",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  expired: {
    en: "Expired",
    ar: "منتهي",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  },
  revoked: {
    en: "Revoked",
    ar: "ملغى",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  },
} as const;

function EnrollmentsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<
    "" | "active" | "expired" | "revoked"
  >("");
  const [courseFilter, setCourseFilter] = useState<"" | "intro" | "english">(
    "",
  );
  const [tierFilter, setTierFilter] = useState<string>("");
  const [editing, setEditing] = useState<AdminEnrollmentRow | null>(null);

  const enrollmentsQuery = useQuery({
    queryKey: ["admin-enrollments", statusFilter, tierFilter, courseFilter],
    queryFn: () =>
      fetchAllEnrollments({
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
        course: courseFilter || undefined,
      }),
  });

  const patchMutation = useMutation({
    mutationFn: (args: {
      row: AdminEnrollmentRow;
      status: "active" | "revoked";
    }) =>
      patchEnrollment(args.row.id, args.row.course, { status: args.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (err: Error) => alert(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (row: AdminEnrollmentRow) =>
      deleteEnrollment(row.id, row.course),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (err: Error) => alert(err.message),
  });

  if (enrollmentsQuery.isError)
    return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  const rows = enrollmentsQuery.data ?? [];

  // Tier options depend on selected course (or union of both).
  const tierOptions: { value: string; label: string }[] =
    courseFilter === "english"
      ? Object.entries(ENGLISH_TIER_LABELS).map(([v, l]) => ({
          value: v,
          label: l[lang],
        }))
      : courseFilter === "intro"
        ? Object.entries(TIER_LABELS).map(([v, l]) => ({
            value: v,
            label: l[lang],
          }))
        : [
            ...Object.entries(TIER_LABELS).map(([v, l]) => ({
              value: v,
              label: l[lang],
            })),
            ...Object.entries(ENGLISH_TIER_LABELS).map(([v, l]) => ({
              value: v,
              label: l[lang],
            })),
          ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={courseFilter}
          onChange={(ev) => {
            setCourseFilter(ev.target.value as typeof courseFilter);
            setTierFilter("");
          }}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.enrollments.filter.allCourses")}</option>
          <option value="intro">{t("admin.course.ielts")}</option>
          <option value="english">{t("admin.course.english")}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(ev) =>
            setStatusFilter(ev.target.value as typeof statusFilter)
          }
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.enrollments.filter.allStatus")}</option>
          <option value="active">
            {STATUS_LABELS.active[lang === "ar" ? "ar" : "en"]}
          </option>
          <option value="expired">
            {STATUS_LABELS.expired[lang === "ar" ? "ar" : "en"]}
          </option>
          <option value="revoked">
            {STATUS_LABELS.revoked[lang === "ar" ? "ar" : "en"]}
          </option>
        </select>
        <select
          value={tierFilter}
          onChange={(ev) => setTierFilter(ev.target.value)}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">{t("admin.enrollments.filter.allTiers")}</option>
          {tierOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 ms-auto">
          {rows.length} {t("admin.enrollments.count")}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        {enrollmentsQuery.isLoading ? (
          <LoadingPanel inline />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <Th>{t("admin.enrollments.col.student")}</Th>
                  <Th>{t("admin.enrollments.col.course")}</Th>
                  <Th>{t("admin.enrollments.col.tier")}</Th>
                  <Th>{t("admin.enrollments.col.status")}</Th>
                  <Th>{t("admin.enrollments.col.granted")}</Th>
                  <Th align="right">{t("admin.enrollments.col.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const tierLabel =
                    e.course === "intro"
                      ? (TIER_LABELS[e.tier as Tier]?.[lang] ?? e.tier)
                      : (ENGLISH_TIER_LABELS[e.tier as EnglishTier]?.[lang] ??
                        e.tier);
                  return (
                    <tr
                      key={`${e.course}-${e.id}`}
                      className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40"
                    >
                      <Td>
                        <div className="font-medium">
                          {e.studentName ?? "—"}
                        </div>
                        <div className="text-xs text-slate-500" dir="ltr">
                          {e.studentEmail ?? ""}
                        </div>
                      </Td>
                      <Td>
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          {e.course === "intro"
                            ? t("admin.course.ielts")
                            : t("admin.course.english")}
                        </span>
                      </Td>
                      <Td>
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                          {tierLabel}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_LABELS[e.status].color}`}
                        >
                          {STATUS_LABELS[e.status][lang === "ar" ? "ar" : "en"]}
                        </span>
                      </Td>
                      <Td className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(e.grantedAt).toLocaleDateString(
                          lang === "ar" ? "ar-EG" : "en-US",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </Td>
                      <Td align="right">
                        <div className="inline-flex gap-1">
                          {e.status !== "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                patchMutation.mutate({
                                  row: e,
                                  status: "active",
                                })
                              }
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                              title={t("admin.enrollments.approve")}
                            >
                              {t("admin.enrollments.approve")}
                            </button>
                          )}
                          {e.status === "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                patchMutation.mutate({
                                  row: e,
                                  status: "revoked",
                                })
                              }
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-200"
                              title={t("admin.enrollments.reject")}
                            >
                              {t("admin.enrollments.reject")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing(e)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                            title={t("admin.enrollments.edit")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  t("admin.enrollments.confirmDelete"),
                                )
                              ) {
                                deleteMutation.mutate(e);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title={t("admin.enrollments.delete")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-slate-500 text-sm"
                    >
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EnrollmentEditModal
          enrollment={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
            qc.invalidateQueries({ queryKey: ["admin-students"] });
            qc.invalidateQueries({ queryKey: ["admin", "stats"] });
          }}
        />
      )}
    </div>
  );
}

function EnrollmentEditModal({
  enrollment,
  onClose,
  onSaved,
}: {
  enrollment: AdminEnrollmentRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [status, setStatus] = useState<"active" | "expired" | "revoked">(
    enrollment.status,
  );
  const [expiresAt, setExpiresAt] = useState(
    enrollment.expiresAt ? enrollment.expiresAt.slice(0, 10) : "",
  );
  const [note, setNote] = useState(enrollment.note ?? "");

  const saveMutation = useMutation({
    mutationFn: () =>
      patchEnrollment(enrollment.id, enrollment.course, {
        status,
        expiresAt: expiresAt
          ? new Date(expiresAt + "T23:59:59Z").toISOString()
          : null,
        note: note.trim() || null,
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">
              {t("admin.enrollments.editTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {enrollment.studentName}{" "}
              <span dir="ltr">· {enrollment.tier}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Field label={t("admin.enrollments.col.status")}>
            <select
              value={status}
              onChange={(ev) => setStatus(ev.target.value as typeof status)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="active">active</option>
              <option value="expired">expired</option>
              <option value="revoked">revoked</option>
            </select>
          </Field>
          <Field label={t("admin.enrollments.col.expires")}>
            <input
              type="date"
              value={expiresAt}
              onChange={(ev) => setExpiresAt(ev.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              dir="ltr"
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("admin.enrollments.expiresHint")}
            </p>
          </Field>
          <Field label={t("admin.students.grantNote")}>
            <input
              type="text"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </Field>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">
              {(saveMutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── FAQ TAB ─────────────────────────

const COURSE_SLUGS = ["english", "ielts"] as const;

function FaqsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<FaqRow | "new" | null>(null);

  const faqsQuery = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: fetchAdminFaqs,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderFaqs,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      patchFaq(id, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faqs"] }),
  });

  if (faqsQuery.isError)
    return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  const all = faqsQuery.data ?? [];
  const visible = all.filter((f) => {
    if (filter === "all") return true;
    if (filter === "global") return f.courseSlug === null;
    return f.courseSlug === filter;
  });

  function moveUp(faq: FaqRow) {
    const sameBucket = all
      .filter((f) => f.courseSlug === faq.courseSlug)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sameBucket.findIndex((f) => f.id === faq.id);
    if (idx <= 0) return;
    const reordered = [...sameBucket];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    reorderMutation.mutate(reordered.map((f) => f.id));
  }

  function moveDown(faq: FaqRow) {
    const sameBucket = all
      .filter((f) => f.courseSlug === faq.courseSlug)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sameBucket.findIndex((f) => f.id === faq.id);
    if (idx === -1 || idx >= sameBucket.length - 1) return;
    const reordered = [...sameBucket];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    reorderMutation.mutate(reordered.map((f) => f.id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(ev) => setFilter(ev.target.value)}
          className="rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="all">{t("admin.faqs.filter.all")}</option>
          <option value="global">{t("admin.faqs.filter.global")}</option>
          {COURSE_SLUGS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="ms-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow"
        >
          <Plus size={14} /> {t("admin.faqs.add")}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        {faqsQuery.isLoading ? (
          <LoadingPanel inline />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <Th>{t("admin.faqs.col.scope")}</Th>
                  <Th>{t("admin.faqs.col.question")}</Th>
                  <Th>{t("admin.faqs.col.published")}</Th>
                  <Th align="right">{t("admin.faqs.col.actions")}</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40 align-top"
                  >
                    <Td>
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-200">
                        {f.courseSlug ?? t("admin.faqs.global")}
                      </span>
                    </Td>
                    <Td>
                      <div className="font-medium max-w-md">
                        {lang === "ar" ? f.questionAr : f.questionEn}
                      </div>
                      <div
                        className="text-xs text-slate-500 max-w-md truncate"
                        dir={lang === "ar" ? "rtl" : "ltr"}
                      >
                        {lang === "ar" ? f.questionEn : f.questionAr}
                      </div>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() =>
                          togglePublishMutation.mutate({
                            id: f.id,
                            isPublished: !f.isPublished,
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs"
                        title={
                          f.isPublished
                            ? t("admin.faqs.unpublish")
                            : t("admin.faqs.publish")
                        }
                      >
                        {f.isPublished ? (
                          <Eye size={14} className="text-emerald-600" />
                        ) : (
                          <EyeOff size={14} className="text-slate-400" />
                        )}
                        <span
                          className={
                            f.isPublished
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-slate-500"
                          }
                        >
                          {f.isPublished
                            ? t("admin.faqs.published")
                            : t("admin.faqs.draft")}
                        </span>
                      </button>
                    </Td>
                    <Td align="right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveUp(f)}
                          className="text-slate-400 hover:text-indigo-600"
                          title={t("admin.faqs.moveUp")}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(f)}
                          className="text-slate-400 hover:text-indigo-600"
                          title={t("admin.faqs.moveDown")}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(f)}
                          className="text-slate-400 hover:text-indigo-600 ms-1"
                          title={t("admin.faqs.edit")}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(t("admin.faqs.confirmDelete"))) {
                              deleteMutation.mutate(f.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600"
                          title={t("admin.faqs.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-slate-500 text-sm"
                    >
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <FaqEditModal
          faq={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-faqs"] });
          }}
        />
      )}
    </div>
  );
}

function FaqEditModal({
  faq,
  onClose,
  onSaved,
}: {
  faq: FaqRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [courseSlug, setCourseSlug] = useState<string>(faq?.courseSlug ?? "");
  const [questionEn, setQuestionEn] = useState(faq?.questionEn ?? "");
  const [questionAr, setQuestionAr] = useState(faq?.questionAr ?? "");
  const [answerEn, setAnswerEn] = useState(faq?.answerEn ?? "");
  const [answerAr, setAnswerAr] = useState(faq?.answerAr ?? "");
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        courseSlug: courseSlug || null,
        questionEn,
        questionAr,
        answerEn,
        answerAr,
        isPublished,
      };
      return faq ? patchFaq(faq.id, payload) : createFaq(payload);
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800 my-8">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold">
            {faq ? t("admin.faqs.editTitle") : t("admin.faqs.addTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.faqs.col.scope")}>
              <select
                value={courseSlug}
                onChange={(ev) => setCourseSlug(ev.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">{t("admin.faqs.global")}</option>
                {COURSE_SLUGS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.faqs.publishedLabel")}>
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(ev) => setIsPublished(ev.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">
                  {isPublished
                    ? t("admin.faqs.published")
                    : t("admin.faqs.draft")}
                </span>
              </label>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.faqs.questionEn")}>
              <input
                type="text"
                value={questionEn}
                onChange={(ev) => setQuestionEn(ev.target.value)}
                required
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.faqs.questionAr")}>
              <input
                type="text"
                value={questionAr}
                onChange={(ev) => setQuestionAr(ev.target.value)}
                required
                dir="rtl"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.faqs.answerEn")}>
              <textarea
                value={answerEn}
                onChange={(ev) => setAnswerEn(ev.target.value)}
                required
                dir="ltr"
                rows={5}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.faqs.answerAr")}>
              <textarea
                value={answerAr}
                onChange={(ev) => setAnswerAr(ev.target.value)}
                required
                dir="rtl"
                rows={5}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">
              {(saveMutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── COURSES TAB ─────────────────────────

function CoursesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CourseRow | null>(null);

  const coursesQuery = useQuery({
    queryKey: ["admin-courses"],
    queryFn: fetchAdminCourses,
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({
      slug,
      isPublished,
    }: {
      slug: string;
      isPublished: boolean;
    }) => patchCourse(slug, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  if (coursesQuery.isError)
    return <ErrorPanel msg={t("admin.error.loadFailed")} />;
  if (coursesQuery.isLoading) return <LoadingPanel />;

  const courses = coursesQuery.data ?? [];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <div
            key={c.slug}
            className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="inline-flex px-2 py-0.5 text-xs font-mono font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-200">
                {c.slug}
              </span>
              <button
                type="button"
                onClick={() =>
                  togglePublishMutation.mutate({
                    slug: c.slug,
                    isPublished: !c.isPublished,
                  })
                }
                className="inline-flex items-center gap-1 text-xs"
                title={
                  c.isPublished
                    ? t("admin.faqs.unpublish")
                    : t("admin.faqs.publish")
                }
              >
                {c.isPublished ? (
                  <Eye size={14} className="text-emerald-600" />
                ) : (
                  <EyeOff size={14} className="text-slate-400" />
                )}
                <span
                  className={
                    c.isPublished
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-slate-500"
                  }
                >
                  {c.isPublished
                    ? t("admin.faqs.published")
                    : t("admin.faqs.draft")}
                </span>
              </button>
            </div>
            <h3
              className="text-base font-bold mt-2"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              {lang === "ar" ? c.titleAr : c.titleEn}
            </h3>
            {(lang === "ar" ? c.subtitleAr : c.subtitleEn) && (
              <p
                className="text-sm text-slate-600 dark:text-slate-300 mt-1"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {lang === "ar" ? c.subtitleAr : c.subtitleEn}
              </p>
            )}
            <div className="mt-4 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 px-3 py-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  {t("admin.courses.totalEnrollments")}
                </span>
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {c.totalActiveEnrollments ?? 0}
                </span>
              </div>
              {c.tiers && c.tiers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.tiers.map((tr) => {
                    const label =
                      c.slug === "intro"
                        ? (TIER_LABELS[tr.tier as Tier]?.[lang] ?? tr.tier)
                        : c.slug === "english"
                          ? (ENGLISH_TIER_LABELS[tr.tier as EnglishTier]?.[
                              lang
                            ] ?? tr.tier)
                          : tr.tier;
                    return (
                      <span
                        key={tr.tier}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-200"
                      >
                        {label}
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {tr.count}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
              {(!c.tiers || c.tiers.length === 0) && (
                <div className="mt-1 text-[11px] text-slate-400">
                  {t("admin.courses.noEnrollments")}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-3 text-xs text-slate-500">
              <span>
                {t("admin.courses.order")}: {c.displayOrder}
              </span>
              <button
                type="button"
                onClick={() => setEditing(c)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
              >
                <Pencil size={13} /> {t("admin.courses.edit")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <CourseEditModal
          course={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-courses"] });
          }}
        />
      )}
    </div>
  );
}

function CourseEditModal({
  course,
  onClose,
  onSaved,
}: {
  course: CourseRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [titleEn, setTitleEn] = useState(course.titleEn);
  const [titleAr, setTitleAr] = useState(course.titleAr);
  const [subtitleEn, setSubtitleEn] = useState(course.subtitleEn ?? "");
  const [subtitleAr, setSubtitleAr] = useState(course.subtitleAr ?? "");
  const [isPublished, setIsPublished] = useState(course.isPublished);
  const [displayOrder, setDisplayOrder] = useState(course.displayOrder);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchCourse(course.slug, {
        titleEn,
        titleAr,
        subtitleEn: subtitleEn.trim() || null,
        subtitleAr: subtitleAr.trim() || null,
        isPublished,
        displayOrder,
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 ring-1 ring-slate-200 dark:ring-gray-800 my-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">
              {t("admin.courses.editTitle")}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5 font-mono">
              {course.slug}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t("admin.courses.titleEn")}>
              <input
                type="text"
                value={titleEn}
                onChange={(ev) => setTitleEn(ev.target.value)}
                required
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.titleAr")}>
              <input
                type="text"
                value={titleAr}
                onChange={(ev) => setTitleAr(ev.target.value)}
                required
                dir="rtl"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.subtitleEn")}>
              <input
                type="text"
                value={subtitleEn}
                onChange={(ev) => setSubtitleEn(ev.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.subtitleAr")}>
              <input
                type="text"
                value={subtitleAr}
                onChange={(ev) => setSubtitleAr(ev.target.value)}
                dir="rtl"
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.courses.order")}>
              <input
                type="number"
                value={displayOrder}
                onChange={(ev) =>
                  setDisplayOrder(parseInt(ev.target.value, 10) || 0)
                }
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label={t("admin.faqs.publishedLabel")}>
              <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(ev) => setIsPublished(ev.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">
                  {isPublished
                    ? t("admin.faqs.published")
                    : t("admin.faqs.draft")}
                </span>
              </label>
            </Field>
          </div>
          {saveMutation.isError && (
            <p className="text-rose-600 text-sm">
              {(saveMutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t("admin.students.cancel")}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow disabled:opacity-50"
            >
              {saveMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.students.editSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────── Certificates ───────────────────────────

const CERT_COURSE_LABELS: Record<CertificateCourse, TranslationKey> = {
  intro: "admin.course.ielts",
  english: "admin.certs.course.english",
};

const CERT_COURSE_TIERS: Record<CertificateCourse, string[]> = {
  intro: ["intro", "advance", "complete"],
  english: ["beginner", "intermediate", "advanced"],
};

function formatCertDate(iso: string, lang: "en" | "ar"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function CertificatesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showIssue, setShowIssue] = useState(false);

  const certsQuery = useQuery({
    queryKey: ["admin-certificates"],
    queryFn: () => fetchAllCertificates(),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      revokeCertificate(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-certificates"] });
    },
    onError: (err) => window.alert((err as Error).message),
  });

  const filtered = useMemo(() => {
    const list = certsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.userName.toLowerCase().includes(q) ||
        c.userEmail.toLowerCase().includes(q) ||
        c.certificateId.toLowerCase().includes(q),
    );
  }, [certsQuery.data, search]);

  if (certsQuery.isLoading) return <LoadingPanel />;
  if (certsQuery.isError)
    return <ErrorPanel msg={t("admin.error.loadFailed")} />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder={t("admin.certs.search")}
            className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="cert-search"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowIssue(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold shadow"
          data-testid="cert-issue-open"
        >
          <Plus size={15} />
          {t("admin.certs.issue")}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <Th>{t("certs.col.student")}</Th>
                <Th>{t("certs.col.course")}</Th>
                <Th>{t("certs.col.tier")}</Th>
                <Th>{t("certs.col.id")}</Th>
                <Th>{t("certs.col.completion")}</Th>
                <Th>{t("certs.col.status")}</Th>
                <Th align="right">{t("certs.col.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    {t("admin.certs.empty")}
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <CertificateRow
                  key={c.id}
                  cert={c}
                  lang={lang}
                  t={t}
                  onRevoke={() => {
                    if (!window.confirm(t("admin.certs.revoke.confirm")))
                      return;
                    const reason =
                      window.prompt(t("admin.certs.revoke.reason")) ??
                      undefined;
                    revokeMutation.mutate({
                      id: c.id,
                      reason:
                        reason && reason.trim() ? reason.trim() : undefined,
                    });
                  }}
                  revoking={revokeMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showIssue && (
        <IssueCertificateModal
          onClose={() => setShowIssue(false)}
          onIssued={() => {
            qc.invalidateQueries({ queryKey: ["admin-certificates"] });
            setShowIssue(false);
          }}
        />
      )}
    </div>
  );
}

function CertificateRow({
  cert,
  lang,
  t,
  onRevoke,
  revoking,
}: {
  cert: AdminCertificate;
  lang: "en" | "ar";
  t: (k: TranslationKey) => string;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const courseLabel = t(
    CERT_COURSE_LABELS[cert.course] ?? "admin.course.ielts",
  );
  const isRevoked = !!cert.revokedAt;
  return (
    <tr
      className="border-t border-slate-100 dark:border-gray-800 hover:bg-slate-50/60 dark:hover:bg-gray-800/40"
      data-testid={`cert-row-${cert.certificateId}`}
    >
      <Td>
        <div className="font-medium">{cert.userName}</div>
        <div className="text-xs text-slate-500" dir="ltr">
          {cert.userEmail}
        </div>
      </Td>
      <Td>{courseLabel}</Td>
      <Td className="capitalize">{cert.tier}</Td>
      <Td ltr className="font-mono text-xs">
        {cert.certificateId}
      </Td>
      <Td className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {formatCertDate(cert.completionDate, lang)}
      </Td>
      <Td>
        {isRevoked ? (
          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
            {t("certs.status.revoked")}
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            {t("certs.status.active")}
          </span>
        )}
      </Td>
      <Td align="right">
        <div className="flex items-center justify-end gap-2">
          {!isRevoked && (
            <a
              href={getCertificatePdfUrl(cert.id)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 px-2.5 py-1 text-xs font-semibold"
              data-testid={`cert-download-${cert.certificateId}`}
            >
              <Download size={13} />
              PDF
            </a>
          )}
          {!isRevoked && (
            <button
              type="button"
              onClick={onRevoke}
              disabled={revoking}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
              data-testid={`cert-revoke-${cert.certificateId}`}
            >
              <Trash2 size={13} />
              {t("admin.certs.revoke")}
            </button>
          )}
        </div>
      </Td>
    </tr>
  );
}

function IssueCertificateModal({
  onClose,
  onIssued,
}: {
  onClose: () => void;
  onIssued: () => void;
}) {
  const t = useT();
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState<string>("");
  const [course, setCourse] = useState<CertificateCourse>("english");
  const [tier, setTier] = useState<string>(CERT_COURSE_TIERS.english[0]!);
  const [completionDate, setCompletionDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["admin-students"],
    queryFn: fetchStudents,
  });

  const filteredStudents = useMemo(() => {
    const list = studentsQuery.data ?? [];
    const q = studentSearch.trim().toLowerCase();
    if (!q) return list.slice(0, 10);
    return list
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [studentsQuery.data, studentSearch]);

  const issueMutation = useMutation({
    mutationFn: issueCertificate,
    onSuccess: () => onIssued(),
    onError: (err) => setError((err as Error).message),
  });

  function changeCourse(next: CertificateCourse) {
    setCourse(next);
    setTier(CERT_COURSE_TIERS[next][0]!);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!studentId) {
      setError(t("admin.certs.modal.student"));
      return;
    }
    issueMutation.mutate({
      userId: studentId,
      course,
      tier,
      completionDate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800"
        data-testid="cert-issue-modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-800">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            {t("admin.certs.modal.title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800"
            aria-label="close"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <Field label={t("admin.certs.modal.student")}>
            <input
              type="text"
              value={studentSearch}
              onChange={(ev) => {
                setStudentSearch(ev.target.value);
                setStudentId("");
              }}
              placeholder={t("admin.certs.modal.studentPh")}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="cert-issue-student-search"
            />
            <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950">
              {filteredStudents.length === 0 && (
                <p className="px-3 py-3 text-xs text-slate-500">—</p>
              )}
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStudentId(s.id);
                    setStudentSearch(`${s.name} (${s.email})`);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                    studentId === s.id
                      ? "bg-indigo-100 dark:bg-indigo-900/50"
                      : ""
                  }`}
                  data-testid={`cert-issue-student-${s.email}`}
                >
                  <span className="font-medium">{s.name}</span>{" "}
                  <span className="text-slate-500" dir="ltr">
                    · {s.email}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("admin.certs.modal.course")}>
              <select
                value={course}
                onChange={(ev) =>
                  changeCourse(ev.target.value as CertificateCourse)
                }
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="cert-issue-course"
              >
                <option value="english">
                  {t("admin.certs.course.english")}
                </option>
              </select>
            </Field>
            <Field label={t("admin.certs.modal.tier")}>
              <select
                value={tier}
                onChange={(ev) => setTier(ev.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="cert-issue-tier"
              >
                {CERT_COURSE_TIERS[course].map((tn) => (
                  <option key={tn} value={tn} className="capitalize">
                    {tn}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t("admin.certs.modal.completion")}>
            <input
              type="date"
              value={completionDate}
              onChange={(ev) => setCompletionDate(ev.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              data-testid="cert-issue-date"
            />
          </Field>

          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-3 py-2 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200"
            >
              {t("admin.certs.modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={issueMutation.isPending || !studentId}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow disabled:opacity-50"
              data-testid="cert-issue-submit"
            >
              {issueMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("admin.certs.modal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────── PAYMENTS ─────────────────────────

const PAYMENT_COURSE_OPTS: ReadonlyArray<CheckoutCourse> = ["intro", "english"];
const PAYMENT_PROVIDER_OPTS: ReadonlyArray<CheckoutProvider> = [
  "tabby",
  "tamara",
  "bank_transfer",
];

function providerLabel(
  p: CheckoutProvider,
  t: (k: TranslationKey) => string,
): string {
  // Provider names stay branded for the admin (Tabby/Tamara are the actual
  // settlement partners — admin needs to know which one to reconcile against).
  // Bank transfer is the only one we translate, since it isn't a brand.
  if (p === "tabby") return "Tabby";
  if (p === "tamara") return "Tamara";
  return t("admin.payments.provider.bank_transfer");
}
const PAYMENT_STATUS_OPTS: ReadonlyArray<PaymentStatus> = [
  "created",
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "expired",
];

function paymentStatusTone(s: PaymentStatus): string {
  switch (s) {
    case "captured":
    case "authorized":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "pending":
    case "created":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
    case "failed":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
    case "cancelled":
    case "expired":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }
}

function PaymentsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState<CheckoutCourse | "">("");
  const [provider, setProvider] = useState<CheckoutProvider | "">("");
  const [status, setStatus] = useState<PaymentStatus | "">("");

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      course: course || undefined,
      provider: provider || undefined,
      status: status || undefined,
    }),
    [search, course, provider, status],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-payments", filters],
    queryFn: () => fetchAdminPayments(filters),
    staleTime: 30_000,
  });

  const payments: AdminPayment[] = data ?? [];

  // Quick-filter chip: "Pending bank transfers" — pre-selects
  // provider=bank_transfer + status=pending so the admin can triage manual
  // verifications in one click.
  const pendingBankTransferActive =
    provider === "bank_transfer" && status === "pending";
  const applyPendingBankTransfer = () => {
    if (pendingBankTransferActive) {
      setProvider("");
      setStatus("");
    } else {
      setProvider("bank_transfer");
      setStatus("pending");
    }
  };

  const refetchAll = () => {
    void qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };

  return (
    <div className="space-y-5" data-testid="admin-payments">
      <div>
        <h2 className="text-xl font-bold">{t("admin.payments.title")}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t("admin.payments.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyPendingBankTransfer}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 transition ${
            pendingBankTransferActive
              ? "bg-indigo-600 text-white ring-indigo-600 shadow"
              : "bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-gray-800 hover:ring-indigo-300"
          }`}
          data-testid="quick-filter-pending-bank-transfers"
        >
          <Clock size={12} />
          {t("admin.payments.bankTransferPending")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
        <div className="md:col-span-2 relative">
          <Search
            size={14}
            className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-slate-400"
          />
          <input
            type="search"
            placeholder={t("admin.payments.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ltr:pl-9 rtl:pr-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            data-testid="payments-search"
          />
        </div>
        <FilterSelect
          value={course}
          onChange={(v) => setCourse(v as CheckoutCourse | "")}
          allLabel={t("admin.payments.filter.all")}
          options={PAYMENT_COURSE_OPTS.map((c) => ({
            value: c,
            label: c === "intro" ? "LEXO IELTS" : "LEXO English",
          }))}
          testId="payments-course-filter"
        />
        <FilterSelect
          value={provider}
          onChange={(v) => setProvider(v as CheckoutProvider | "")}
          allLabel={t("admin.payments.filter.all")}
          options={PAYMENT_PROVIDER_OPTS.map((p) => ({
            value: p,
            label: providerLabel(p, t),
          }))}
          testId="payments-provider-filter"
        />
        <div className="flex gap-2">
          <FilterSelect
            value={status}
            onChange={(v) => setStatus(v as PaymentStatus | "")}
            allLabel={t("admin.payments.filter.all")}
            options={PAYMENT_STATUS_OPTS.map((s) => ({ value: s, label: s }))}
            testId="payments-status-filter"
          />
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-800"
            data-testid="payments-refresh"
            aria-label={t("admin.payments.refresh")}
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">
                  {t("admin.payments.col.student")}
                </th>
                <th className="text-start px-4 py-3 font-semibold">
                  {t("admin.payments.col.product")}
                </th>
                <th className="text-start px-4 py-3 font-semibold">
                  {t("admin.payments.col.provider")}
                </th>
                <th className="text-start px-4 py-3 font-semibold">
                  {t("admin.payments.col.amount")}
                </th>
                <th className="text-start px-4 py-3 font-semibold">
                  {t("admin.payments.col.status")}
                </th>
                <th className="text-start px-4 py-3 font-semibold">
                  {t("admin.payments.col.created")}
                </th>
                <th className="text-end px-4 py-3 font-semibold">
                  {t("admin.payments.col.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    <Loader2 size={16} className="animate-spin inline mr-2" />…
                  </td>
                </tr>
              )}
              {!isLoading && payments.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    {t("admin.payments.empty")}
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  lang={lang}
                  t={t}
                  onChanged={refetchAll}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      data-testid={testId}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PaymentRow({
  payment,
  lang,
  t,
  onChanged,
}: {
  payment: AdminPayment;
  lang: "en" | "ar";
  t: (k: TranslationKey) => string;
  /** Re-fetch the payments list once the row's status has flipped. */
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "verify" | "reject">(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const major = (payment.amountMinor / 100).toFixed(0);
  const created = new Date(payment.createdAt).toLocaleString(
    lang === "ar" ? "ar-EG" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  );

  // Bank-transfer rows that haven't been actioned yet are the only ones
  // where Verify / Reject buttons should appear. Tabby/Tamara settle
  // automatically through their webhooks.
  const isPendingBankTransfer =
    payment.provider === "bank_transfer" &&
    (payment.status === "pending" || payment.status === "created");

  const proofUrl = bankProofViewUrl(payment.bankProofObjectPath);

  const onVerify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (!confirm(t("admin.payments.verifyConfirm"))) return;
    setBusy("verify");
    setActionError(null);
    try {
      await adminVerifyBankPayment(payment.id);
      onChanged();
    } catch (err) {
      setActionError((err as Error).message ?? "error");
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (!confirm(t("admin.payments.rejectConfirm"))) return;
    // Prompt the admin for the rejection reason. The student will see this
    // verbatim in their "My Payments" page and rejection email, so we
    // discourage empty submissions but allow the admin to bail.
    const raw = prompt(t("admin.payments.rejectionReasonPrompt"), "");
    if (raw === null) return;
    const reason = raw.trim();
    if (!reason) return;
    setBusy("reject");
    setActionError(null);
    try {
      await adminRejectBankPayment(payment.id, reason);
      onChanged();
    } catch (err) {
      setActionError((err as Error).message ?? "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <tr
        className="hover:bg-slate-50 dark:hover:bg-gray-800/40 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
        data-testid={`payment-row-${payment.id}`}
      >
        <td className="px-4 py-3">
          <div className="font-semibold">{payment.userName}</div>
          <div className="text-xs text-slate-500" dir="ltr">
            {payment.userEmail}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">
            {payment.course === "intro" ? "LEXO IELTS" : "LEXO English"}
          </div>
          <div className="text-xs text-slate-500 capitalize">
            {payment.tier}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-medium">
              {providerLabel(payment.provider, t)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-200 uppercase tracking-wide">
              {payment.mode}
            </span>
          </span>
        </td>
        <td className="px-4 py-3 font-bold" dir="ltr">
          {major} {payment.currency}
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${paymentStatusTone(payment.status)}`}
          >
            {payment.status}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-500 text-xs">{created}</td>
        <td className="px-4 py-3 text-end">
          {isPendingBankTransfer ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={onVerify}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 disabled:cursor-wait"
                data-testid={`payment-verify-${payment.id}`}
              >
                {busy === "verify" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={11} />
                )}
                {busy === "verify"
                  ? t("admin.payments.verifying")
                  : t("admin.payments.verify")}
              </button>
              <button
                type="button"
                onClick={onReject}
                disabled={busy !== null}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60 disabled:cursor-wait"
                data-testid={`payment-reject-${payment.id}`}
              >
                {busy === "reject" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <XCircle size={11} />
                )}
                {busy === "reject"
                  ? t("admin.payments.rejecting")
                  : t("admin.payments.reject")}
              </button>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/70 dark:bg-gray-800/30">
          <td colSpan={7} className="px-4 py-4 text-xs">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <DetailKV label="Payment ID" value={payment.id} mono />
              <DetailKV
                label="Provider session ID"
                value={payment.providerSessionId ?? "—"}
                mono
              />
              <DetailKV
                label="Provider payment ID"
                value={payment.providerPaymentId ?? "—"}
                mono
              />
              <DetailKV
                label="Captured at"
                value={
                  payment.capturedAt
                    ? new Date(payment.capturedAt).toLocaleString(
                        lang === "ar" ? "ar-EG" : "en-US",
                      )
                    : "—"
                }
              />
              {payment.bankSenderName && (
                <DetailKV
                  label={t("admin.payments.bankSenderName")}
                  value={payment.bankSenderName}
                />
              )}
              {proofUrl && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    {t("admin.payments.bankProof")}
                  </dt>
                  <dd className="text-sm">
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                      data-testid={`payment-proof-${payment.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                      {payment.bankProofFilename ??
                        t("admin.payments.bankProofView")}
                    </a>
                  </dd>
                </div>
              )}
              {payment.failureReason && (
                <div className="sm:col-span-2">
                  <DetailKV
                    label="Failure reason"
                    value={payment.failureReason}
                  />
                </div>
              )}
              {payment.rejectionReason && (
                <div className="sm:col-span-2">
                  <DetailKV
                    label={t("payments.my.rejectionReason")}
                    value={payment.rejectionReason}
                  />
                </div>
              )}
              {payment.verifiedAt && (
                <DetailKV
                  label="Verified at"
                  value={new Date(payment.verifiedAt).toLocaleString(
                    lang === "ar" ? "ar-EG" : "en-US",
                  )}
                />
              )}
              {payment.rejectedAt && (
                <DetailKV
                  label="Rejected at"
                  value={new Date(payment.rejectedAt).toLocaleString(
                    lang === "ar" ? "ar-EG" : "en-US",
                  )}
                />
              )}
            </dl>
            {actionError && (
              <p
                className="mt-2 text-xs text-rose-600 dark:text-rose-400"
                data-testid={`payment-action-error-${payment.id}`}
              >
                {actionError}
              </p>
            )}
            {/* unused t: keep param so existing callers stay typed */}
            <span className="sr-only">{t("admin.payments.modeBadge")}</span>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailKV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className={`text-sm break-all ${mono ? "font-mono" : ""}`} dir="ltr">
        {value}
      </dd>
    </div>
  );
}

// ───────────────────────── REPORTS TAB ─────────────────────────

/**
 * Default the date range to the current calendar month — the most common
 * reporting need ("how much did we book this month?"). Both fields accept
 * `YYYY-MM-DD` and the server treats the range as inclusive.
 */
function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(y, m + 1, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(first), to: fmt(last) };
}

function ReportsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const initial = useMemo(defaultRange, []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [params, setParams] = useState<{ from: string; to: string } | null>(
    initial,
  );

  const { data, isFetching, error, refetch } = useQuery<RevenueReport>({
    queryKey: ["admin-revenue-report", params],
    queryFn: () => fetchRevenueReport(params!.from, params!.to),
    enabled: params !== null,
    staleTime: 30_000,
  });

  const onRun = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ from, to });
    void refetch();
  };

  const fmtMoney = (minor: number, currency: string) =>
    `${(minor / 100).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${currency}`;

  return (
    <div className="space-y-5" data-testid="admin-reports">
      <div>
        <h2 className="text-xl font-bold">{t("admin.reports.title")}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t("admin.reports.subtitle")}
        </p>
      </div>

      <form
        onSubmit={onRun}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
      >
        <label className="text-sm">
          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {t("admin.reports.from")}
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            data-testid="reports-from"
            required
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {t("admin.reports.to")}
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            data-testid="reports-to"
            required
          />
        </label>
        <button
          type="submit"
          disabled={isFetching || !from || !to}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white"
          data-testid="reports-run"
        >
          {isFetching ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {t("admin.reports.run")}
        </button>
        {params && (
          <a
            href={revenueReportCsvUrl(params.from, params.to)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="reports-csv"
          >
            <Download size={14} />
            {t("admin.reports.downloadCsv")}
          </a>
        )}
      </form>

      {error && <ErrorPanel msg={(error as Error).message} />}

      {data && (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <h3 className="text-sm font-bold mb-3">
              {t("admin.reports.summaryTitle")}
            </h3>
            <table className="min-w-full text-sm" data-testid="reports-summary">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-start py-2 font-semibold">
                    {t("admin.reports.method")}
                  </th>
                  <th className="text-start py-2 font-semibold">
                    {t("admin.reports.transactions")}
                  </th>
                  <th className="text-start py-2 font-semibold">
                    {t("admin.reports.revenue")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {data.summary.map((s) => (
                  <tr
                    key={s.provider}
                    data-testid={`reports-summary-row-${s.provider}`}
                  >
                    <td className="py-2 font-medium">
                      {providerLabel(s.provider, t)}
                    </td>
                    <td className="py-2">{s.transactions}</td>
                    <td className="py-2 font-bold" dir="ltr">
                      {fmtMoney(s.revenueMinor, s.currency)}
                    </td>
                  </tr>
                ))}
                {data.summary.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-slate-500">
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" data-testid="reports-rows">
                <thead className="bg-slate-50 dark:bg-gray-800/60 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-start px-4 py-3 font-semibold">
                      {t("admin.reports.col.date")}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold">
                      {t("admin.reports.col.student")}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold">
                      {t("admin.reports.col.course")}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold">
                      {t("admin.reports.col.amount")}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold">
                      {t("admin.reports.col.method")}
                    </th>
                    <th className="text-start px-4 py-3 font-semibold">
                      {t("admin.reports.col.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-300 text-xs">
                        {new Date(
                          r.capturedAt ?? r.createdAt,
                        ).toLocaleDateString(
                          lang === "ar" ? "ar-EG" : "en-US",
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{r.studentName}</div>
                        <div className="text-xs text-slate-500" dir="ltr">
                          {r.studentEmail}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {r.course === "intro" ? "LEXO IELTS" : "LEXO English"} ·{" "}
                        {r.tier}
                      </td>
                      <td className="px-4 py-2 font-bold" dir="ltr">
                        {fmtMoney(r.amountMinor, r.currency)}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {providerLabel(r.provider, t)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${paymentStatusTone(r.status)}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        {t("admin.reports.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── LIVE SESSIONS TAB ─────────────────────────

function LiveSessionsTab() {
  const t = useT();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-live-sessions"],
    queryFn: fetchAdminLiveSessions,
  });

  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t("admin.live.subtitle")}
      </p>
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm"
        data-testid="admin-live-create-btn"
      >
        <Plus size={16} /> {t("admin.live.create")}
      </button>

      {showForm && (
        <NewLiveSessionForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["admin-live-sessions"] });
            setShowForm(false);
          }}
        />
      )}

      {isLoading && <LoadingPanel />}
      {error && <ErrorPanel msg={(error as Error).message} />}
      {data && data.length === 0 && !isLoading && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 text-center text-sm text-slate-500">
          {t("admin.live.empty")}
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((s: LiveSession) => (
            <AdminSessionRow
              key={s.id}
              session={s}
              lang={lang}
              t={t}
              onChanged={() =>
                qc.invalidateQueries({ queryKey: ["admin-live-sessions"] })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminSessionRow({
  session,
  lang,
  t,
  onChanged,
}: {
  session: LiveSession;
  lang: "en" | "ar";
  t: (k: TranslationKey) => string;
  onChanged: () => void;
}) {
  const delMut = useMutation({
    mutationFn: () => deleteLiveSession(session.id),
    onSuccess: onChanged,
  });
  const dt = new Date(session.startsAt).toLocaleString(
    lang === "ar" ? "ar-EG" : "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
  return (
    <li
      className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-5"
      data-testid={`admin-session-${session.id}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold">
              {session.audience === "public"
                ? t("liveSessions.badge.public")
                : `${session.course === "english" ? "English" : "IELTS"}${session.tier ? " · " + session.tier : ""}`}
            </span>
            {session.cancelledAt && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold">
                {t("admin.live.cancelled")}
              </span>
            )}
          </div>
          <h3 className="mt-2 font-bold">{session.title}</h3>
          {session.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {session.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} /> {dt}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {session.durationMin}{" "}
              {t("liveSessions.minutes")}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {session.zoomStartUrl && (
              <a
                href={session.zoomStartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100"
              >
                <ExternalLink size={11} /> {t("admin.live.startUrl")}
              </a>
            )}
            <a
              href={session.zoomJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200"
            >
              <ExternalLink size={11} /> {t("admin.live.joinUrl")}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t("admin.live.confirmCancel"))) delMut.mutate();
          }}
          disabled={delMut.isPending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
          data-testid={`admin-session-cancel-${session.id}`}
        >
          <Trash2 size={12} /> {t("admin.live.cancel")}
        </button>
      </div>
    </li>
  );
}

function NewLiveSessionForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<"public" | "course">("public");
  const [course, setCourse] = useState<"intro" | "english">("intro");
  const [tier, setTier] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      setError(null);
      return createLiveSession({
        title,
        description: description || undefined,
        audience,
        course: audience === "course" ? course : null,
        tier: audience === "course" && tier ? tier : null,
        startsAt: new Date(startsAt).toISOString(),
        durationMin,
      });
    },
    onSuccess: onCreated,
    onError: (e) => setError((e as Error).message),
  });

  const disabled = mutation.isPending || !title.trim() || !startsAt;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{t("admin.live.create")}</h2>
        <LiveField label={t("admin.live.field.title")}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            data-testid="admin-live-title"
          />
        </LiveField>
        <LiveField label={t("admin.live.field.description")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </LiveField>
        <LiveField label={t("admin.live.field.audience")}>
          <div className="flex flex-col gap-1 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={audience === "public"}
                onChange={() => setAudience("public")}
              />
              {t("admin.live.audience.public")}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={audience === "course"}
                onChange={() => setAudience("course")}
              />
              {t("admin.live.audience.course")}
            </label>
          </div>
        </LiveField>
        {audience === "course" && (
          <>
            <LiveField label={t("admin.live.field.course")}>
              <select
                value={course}
                onChange={(e) =>
                  setCourse(e.target.value as "intro" | "english")
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="intro">IELTS</option>
                <option value="english">English</option>
              </select>
            </LiveField>
            <LiveField label={t("admin.live.field.tier")}>
              <input
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                placeholder="(any)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </LiveField>
          </>
        )}
        <LiveField label={t("admin.live.field.startsAt")}>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            data-testid="admin-live-startsAt"
          />
        </LiveField>
        <LiveField label={t("admin.live.field.duration")}>
          <input
            type="number"
            min={5}
            max={600}
            value={durationMin}
            onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 60)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </LiveField>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3 inline-flex items-center gap-1">
            <AlertCircle size={14} /> {error}
          </p>
        )}
        <div className="flex gap-2 justify-end mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={disabled}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold text-sm inline-flex items-center gap-2"
            data-testid="admin-live-submit"
          >
            {mutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      {children}
    </div>
  );
}

// ───────────────────────── SUPPORT TAB (admin) ─────────────────────────

function SupportTab() {
  const t = useT();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<SupportStatus | "all">("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-tickets", filter],
    queryFn: () => fetchAdminTickets(filter === "all" ? undefined : filter),
    refetchInterval: 60_000,
  });

  const filters: Array<{
    key: SupportStatus | "all";
    labelKey: TranslationKey;
  }> = [
    { key: "all", labelKey: "admin.support.filter.all" },
    { key: "awaiting_admin", labelKey: "support.status.awaiting_admin" },
    { key: "awaiting_user", labelKey: "support.status.awaiting_user" },
    { key: "resolved", labelKey: "support.status.resolved" },
    { key: "closed", labelKey: "support.status.closed" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t("admin.support.subtitle")}
      </p>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              filter === f.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800"
            }`}
            data-testid={`admin-support-filter-${f.key}`}
          >
            {t(f.labelKey)}
            {data?.counts?.[f.key] ? ` (${data.counts[f.key]})` : ""}
          </button>
        ))}
      </div>

      {isLoading && <LoadingPanel />}
      {error && <ErrorPanel msg={(error as Error).message} />}
      {data && data.tickets.length === 0 && !isLoading && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-10 text-center">
          <Inbox size={32} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">
            {t("admin.support.empty")}
          </p>
        </div>
      )}
      {data && data.tickets.length > 0 && (
        <ul className="space-y-2">
          {data.tickets.map((tkt: SupportTicket) => (
            <li key={tkt.id}>
              <WLink
                href={`/support/${tkt.id}`}
                className="block rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-4 hover:border-indigo-400 transition"
                data-testid={`admin-ticket-${tkt.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        {t(`support.status.${tkt.status}` as TranslationKey)}
                      </span>
                      <span className="text-slate-500">
                        {t(
                          `support.category.${tkt.category}` as TranslationKey,
                        )}
                      </span>
                    </div>
                    <h3 className="mt-1 font-bold truncate">{tkt.subject}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("admin.support.from")}: {tkt.userName ?? tkt.userId} ·{" "}
                      <span dir="ltr">{tkt.userEmail ?? ""}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(tkt.lastActivityAt).toLocaleString(
                        lang === "ar" ? "ar-EG" : "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                  <ChevronRight className="text-slate-400 rtl:rotate-180" />
                </div>
              </WLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── DISCOUNT CODES TAB ─────────────────────────

type DiscountCodeRow = {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string | null;
  neverExpires: boolean;
  scope: "general" | "specific";
  specificCourse: string | null;
  specificTier: string | null;
  totalUsageLimit: number | null;
  perUserLimit: number;
  oneTimePerUser: boolean;
  firstPurchaseOnly: boolean;
  newUsersOnly: boolean;
  status: "active" | "inactive";
  totalUsed: number;
  createdAt: string;
};

const COURSE_OPTIONS = [
  { value: "english", labelKey: "admin.discountCodes.courseEnglish" as const },
  { value: "ielts", labelKey: "admin.discountCodes.courseIelts" as const },
];

const TIER_OPTIONS: Record<string, string[]> = {
  english: ["beginner", "intermediate", "advanced"],
  ielts: ["intro", "advance", "complete"],
};

function DiscountCodesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const [codes, setCodes] = useState<DiscountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage");
  const [formValue, setFormValue] = useState("");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState("");
  const [formNeverExpires, setFormNeverExpires] = useState(false);
  const [formScope, setFormScope] = useState<"general" | "specific">("general");
  const [formCourse, setFormCourse] = useState("");
  const [formTier, setFormTier] = useState("");
  const [formTotalLimit, setFormTotalLimit] = useState("");
  const [formPerUserLimit, setFormPerUserLimit] = useState("1");
  const [formOneTime, setFormOneTime] = useState(true);
  const [formFirstPurchaseOnly, setFormFirstPurchaseOnly] = useState(false);
  const [formNewUsersOnly, setFormNewUsersOnly] = useState(false);
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  async function fetchCodes() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/discount-codes", { credentials: "include" });
      if (res.ok) setCodes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCodes(); }, []);

  function resetForm() {
    setFormCode("");
    setFormType("percentage");
    setFormValue("");
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate("");
    setFormNeverExpires(false);
    setFormScope("general");
    setFormCourse("");
    setFormTier("");
    setFormTotalLimit("");
    setFormPerUserLimit("1");
    setFormOneTime(true);
    setFormFirstPurchaseOnly(false);
    setFormNewUsersOnly(false);
    setFormStatus("active");
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(row: DiscountCodeRow) {
    setFormCode(row.code);
    setFormType(row.discountType);
    setFormValue(String(row.discountValue));
    setFormStartDate(row.startDate.slice(0, 10));
    setFormEndDate(row.endDate ? row.endDate.slice(0, 10) : "");
    setFormNeverExpires(row.neverExpires);
    setFormScope(row.scope);
    setFormCourse(row.specificCourse ?? "");
    setFormTier(row.specificTier ?? "");
    setFormTotalLimit(row.totalUsageLimit != null ? String(row.totalUsageLimit) : "");
    setFormPerUserLimit(String(row.perUserLimit));
    setFormOneTime(row.oneTimePerUser);
    setFormFirstPurchaseOnly(row.firstPurchaseOnly);
    setFormNewUsersOnly(row.newUsersOnly);
    setFormStatus(row.status);
    setEditId(row.id);
    setShowForm(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: formCode,
        discountType: formType,
        discountValue: Number(formValue),
        startDate: new Date(formStartDate).toISOString(),
        endDate: formNeverExpires ? null : formEndDate ? new Date(formEndDate).toISOString() : null,
        neverExpires: formNeverExpires,
        scope: formScope,
        specificCourse: formScope === "specific" ? formCourse : null,
        specificTier: formScope === "specific" ? formTier : null,
        totalUsageLimit: formTotalLimit ? Number(formTotalLimit) : null,
        perUserLimit: Number(formPerUserLimit) || 1,
        oneTimePerUser: formOneTime,
        firstPurchaseOnly: formFirstPurchaseOnly,
        newUsersOnly: formNewUsersOnly,
        status: formStatus,
      };

      const url = editId ? `/api/admin/discount-codes/${editId}` : "/api/admin/discount-codes";
      const method = editId ? "PATCH" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      resetForm();
      fetchCodes();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin.discountCodes.confirmDelete"))) return;
    await fetch(`/api/admin/discount-codes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    fetchCodes();
  }

  async function toggleStatus(row: DiscountCodeRow) {
    await fetch(`/api/admin/discount-codes/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: row.status === "active" ? "inactive" : "active" }),
    });
    fetchCodes();
  }

  const inputCls = "w-full rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{t("admin.tab.discountCodes")}</h2>
          <p className="text-sm text-slate-500">{t("admin.discountCodes.subtitle")}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow hover:shadow-lg transition"
          >
            + {t("admin.discountCodes.create")}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-5 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-slate-200 dark:ring-gray-800 shadow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("admin.discountCodes.code")}</label>
              <input className={inputCls} value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder={t("admin.discountCodes.codePlaceholder")} required dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>{t("admin.discountCodes.type")}</label>
              <select className={inputCls} value={formType} onChange={(e) => setFormType(e.target.value as "percentage" | "fixed")}>
                <option value="percentage">{t("admin.discountCodes.typePercentage")}</option>
                <option value="fixed">{t("admin.discountCodes.typeFixed")}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("admin.discountCodes.value")}</label>
              <input className={inputCls} type="number" min="1" value={formValue} onChange={(e) => setFormValue(e.target.value)} required dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>{t("admin.discountCodes.status")}</label>
              <select className={inputCls} value={formStatus} onChange={(e) => setFormStatus(e.target.value as "active" | "inactive")}>
                <option value="active">{t("admin.discountCodes.active")}</option>
                <option value="inactive">{t("admin.discountCodes.inactive")}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("admin.discountCodes.startDate")}</label>
              <input className={inputCls} type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} required dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>{t("admin.discountCodes.endDate")}</label>
              <input className={inputCls} type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} disabled={formNeverExpires} dir="ltr" />
              <label className="flex items-center gap-2 mt-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={formNeverExpires} onChange={(e) => setFormNeverExpires(e.target.checked)} className="rounded" />
                {t("admin.discountCodes.neverExpires")}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("admin.discountCodes.scope")}</label>
              <select className={inputCls} value={formScope} onChange={(e) => { setFormScope(e.target.value as "general" | "specific"); setFormCourse(""); setFormTier(""); }}>
                <option value="general">{t("admin.discountCodes.scopeGeneral")}</option>
                <option value="specific">{t("admin.discountCodes.scopeSpecific")}</option>
              </select>
            </div>
            {formScope === "specific" && (
              <>
                <div>
                  <label className={labelCls}>{t("admin.discountCodes.course")}</label>
                  <select className={inputCls} value={formCourse} onChange={(e) => { setFormCourse(e.target.value); setFormTier(""); }}>
                    <option value="">{t("admin.discountCodes.selectCourse")}</option>
                    {COURSE_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                    ))}
                  </select>
                </div>
                {formCourse && TIER_OPTIONS[formCourse] && (
                  <div>
                    <label className={labelCls}>{t("admin.discountCodes.tier")}</label>
                    <select className={inputCls} value={formTier} onChange={(e) => setFormTier(e.target.value)}>
                      <option value="">{t("admin.discountCodes.selectTier")}</option>
                      {TIER_OPTIONS[formCourse]!.map((tier) => (
                        <option key={tier} value={tier}>{tier}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t("admin.discountCodes.totalUsageLimit")}</label>
              <input className={inputCls} type="number" min="1" value={formTotalLimit} onChange={(e) => setFormTotalLimit(e.target.value)} placeholder={t("admin.discountCodes.unlimitedUsage")} dir="ltr" />
            </div>
            <div>
              <label className={labelCls}>{t("admin.discountCodes.perUserLimit")}</label>
              <input className={inputCls} type="number" min="1" value={formPerUserLimit} onChange={(e) => setFormPerUserLimit(e.target.value)} dir="ltr" />
            </div>
            <div className="flex flex-col gap-2 pb-2 justify-end">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={formOneTime} onChange={(e) => setFormOneTime(e.target.checked)} className="rounded" />
                {t("admin.discountCodes.oneTimePerUser")}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={formFirstPurchaseOnly} onChange={(e) => setFormFirstPurchaseOnly(e.target.checked)} className="rounded" />
                {t("admin.discountCodes.firstPurchaseOnly")}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={formNewUsersOnly} onChange={(e) => setFormNewUsersOnly(e.target.checked)} className="rounded" />
                {t("admin.discountCodes.newUsersOnly")}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow disabled:opacity-50 hover:shadow-lg transition">
              {t("admin.discountCodes.save")}
            </button>
            <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition">
              {t("admin.discountCodes.cancel")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        </div>
      ) : codes.length === 0 ? (
        <p className="text-center py-10 text-slate-400">{t("admin.discountCodes.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 dark:ring-gray-800 shadow">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-start">{t("admin.discountCodes.code")}</th>
                <th className="px-4 py-3 text-start">{t("admin.discountCodes.value")}</th>
                <th className="px-4 py-3 text-start">{t("admin.discountCodes.scope")}</th>
                <th className="px-4 py-3 text-start">{t("admin.discountCodes.startDate")}</th>
                <th className="px-4 py-3 text-start">{t("admin.discountCodes.endDate")}</th>
                <th className="px-4 py-3 text-center">{t("admin.discountCodes.totalUsed")}</th>
                <th className="px-4 py-3 text-center">{t("admin.discountCodes.totalUsageLimit")}</th>
                <th className="px-4 py-3 text-center">{t("admin.discountCodes.status")}</th>
                <th className="px-4 py-3 text-center">{t("admin.discountCodes.actions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-100 dark:divide-gray-800">
              {codes.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400" dir="ltr">{row.code}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {row.discountType === "percentage" ? `${row.discountValue}%` : `${row.discountValue} SAR`}
                  </td>
                  <td className="px-4 py-3">
                    {row.scope === "general" ? t("admin.discountCodes.general") : (
                      <span>{t("admin.discountCodes.specific")}: {row.specificCourse}{row.specificTier ? `/${row.specificTier}` : ""}</span>
                    )}
                  </td>
                  <td className="px-4 py-3" dir="ltr">{new Date(row.startDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {row.neverExpires ? t("admin.discountCodes.never") : row.endDate ? new Date(row.endDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{row.totalUsed}</td>
                  <td className="px-4 py-3 text-center">{row.totalUsageLimit ?? "∞"}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleStatus(row)} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-slate-400"}`}>
                      {row.status === "active" ? t("admin.discountCodes.active") : t("admin.discountCodes.inactive")}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(row)} className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold">{t("admin.discountCodes.edit")}</button>
                      <button onClick={() => handleDelete(row.id)} className="text-rose-500 hover:text-rose-700 text-xs font-semibold">{t("admin.discountCodes.delete")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
