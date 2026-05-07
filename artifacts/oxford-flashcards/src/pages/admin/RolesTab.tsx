import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Search, Plus, Pencil, Trash2, X, Save, Users, Check } from "lucide-react";
import { useT, useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  LoadingPanel,
  ErrorPanel,
  Field,
  INPUT_CLS,
  SELECT_CLS,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  CARD_CLS,
  StatCard,
} from "@/components/admin/AdminPrimitives";
import { useToast } from "@/hooks/use-toast";
import {
  fetchStudents,
  patchStudent,
  type Student,
} from "@/lib/platform-api";

const ADMIN_ROLES = [
  { key: "super_admin", labelKey: "admin.roles.superAdmin", color: "from-rose-500 to-rose-600" },
  { key: "course_manager", labelKey: "admin.roles.courseManager", color: "from-blue-500 to-blue-600" },
  { key: "support_agent", labelKey: "admin.roles.supportAgent", color: "from-emerald-500 to-emerald-600" },
  { key: "chat_moderator", labelKey: "admin.roles.chatMod", color: "from-violet-500 to-violet-600" },
  { key: "finance_manager", labelKey: "admin.roles.financeManager", color: "from-amber-500 to-amber-600" },
] as const;

const PERMISSION_MODULES = [
  "overview",
  "landingPages",
  "englishCards",
  "ieltsCards",
  "courses",
  "faqs",
  "students",
  "enrollments",
  "codes",
  "certificates",
  "payments",
  "reports",
  "communication",
  "liveSessions",
  "support",
  "roles",
] as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  super_admin: PERMISSION_MODULES,
  course_manager: ["overview", "landingPages", "englishCards", "ieltsCards", "courses", "faqs"],
  support_agent: ["overview", "students", "support", "communication"],
  chat_moderator: ["overview", "students", "communication"],
  finance_manager: ["overview", "payments", "reports", "enrollments", "codes"],
};

export default function RolesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Student | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: students, isLoading, error } = useQuery({
    queryKey: ["admin-students"],
    queryFn: fetchStudents,
  });

  const patchMutation = useMutation({
    mutationFn: (args: { id: string; data: { role: "student" | "admin" } }) =>
      patchStudent(args.id, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      toast({ title: t("admin.roles.saved") });
      setEditingUser(null);
      setShowAddDialog(false);
    },
  });

  if (isLoading) return <LoadingPanel />;
  if (error) return <ErrorPanel msg={(error as Error).message} />;

  const allStudents = students ?? [];
  const admins = allStudents.filter((s) => s.role === "admin");
  const nonAdmins = allStudents.filter(
    (s) => s.role !== "admin" && (
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">{t("admin.roles.title")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.roles.subtitle")}
        </p>
      </div>

      {/* Role cards overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ADMIN_ROLES.map((role) => (
          <div key={role.key} className={`${CARD_CLS} p-4 relative overflow-hidden`}>
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${role.color}`} />
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              {t(role.labelKey)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {ROLE_PERMISSIONS[role.key]?.length ?? 0} {t("admin.roles.permissions").toLowerCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Admin users list */}
      <div className={`${CARD_CLS} overflow-hidden`}>
        <div className="p-5 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Shield size={16} className="text-indigo-600" />
            {t("admin.roles.admins")} ({admins.length})
          </h3>
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className={BTN_PRIMARY}
          >
            <Plus size={14} />
            {t("admin.roles.addAdmin")}
          </button>
        </div>

        {admins.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {t("admin.roles.noAdmins")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-950 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start">{t("admin.col.name")}</th>
                <th className="px-4 py-3 text-start">{t("admin.col.email")}</th>
                <th className="px-4 py-3 text-start">{t("admin.roles.currentRole")}</th>
                <th className="px-4 py-3 text-end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-4 py-3 font-medium">{admin.name}</td>
                  <td className="px-4 py-3 text-slate-500" dir="ltr">{admin.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                      <Shield size={10} />
                      {t("admin.roles.superAdmin")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    {admin.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t("admin.roles.confirmRemove"))) {
                            patchMutation.mutate({
                              id: admin.id,
                              data: { role: "student" },
                            });
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                      >
                        {t("admin.roles.removeAdmin")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Permission matrix */}
      <div className={`${CARD_CLS} overflow-hidden`}>
        <div className="p-5 border-b border-slate-200 dark:border-gray-800">
          <h3 className="text-sm font-bold">{t("admin.roles.permissions")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-gray-950">
              <tr>
                <th className="px-3 py-2 text-start font-semibold text-slate-500 uppercase tracking-wider sticky start-0 bg-slate-50 dark:bg-gray-950 z-10">
                  Module
                </th>
                {ADMIN_ROLES.map((role) => (
                  <th key={role.key} className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {t(role.labelKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {PERMISSION_MODULES.map((mod) => (
                <tr key={mod}>
                  <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200 sticky start-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap">
                    {t(`admin.tab.${mod}` as Parameters<typeof t>[0])}
                  </td>
                  {ADMIN_ROLES.map((role) => {
                    const has = ROLE_PERMISSIONS[role.key]?.includes(mod);
                    return (
                      <td key={role.key} className="px-3 py-2 text-center">
                        {has ? (
                          <Check size={14} className="mx-auto text-emerald-500" />
                        ) : (
                          <X size={14} className="mx-auto text-slate-300 dark:text-slate-600" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add admin dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`${CARD_CLS} w-full max-w-md mx-4 p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                {t("admin.roles.addAdmin")}
              </h3>
              <button type="button" onClick={() => setShowAddDialog(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <Field label={t("admin.roles.search")}>
              <div className="relative">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${INPUT_CLS} ps-9`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("admin.roles.search")}
                  dir="ltr"
                />
              </div>
            </Field>
            <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
              {nonAdmins.slice(0, 20).map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    patchMutation.mutate({
                      id: student.id,
                      data: { role: "admin" },
                    });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition text-start"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(student.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{student.name}</div>
                    <div className="text-xs text-slate-500 truncate" dir="ltr">{student.email}</div>
                  </div>
                </button>
              ))}
              {nonAdmins.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  {t("admin.roles.noAdmins")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
