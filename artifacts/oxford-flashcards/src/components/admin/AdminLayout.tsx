import { useState } from "react";
import { Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  HelpCircle,
  BookOpen,
  Mail,
  KeyRound,
  Award,
  CreditCard,
  BarChart3,
  Video,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  CreditCard as CardIcon,
  Shield,
  Settings,
  Menu,
  X,
  Tag,
} from "lucide-react";
import { useT, useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";

export type AdminTab =
  | "overview"
  | "students"
  | "enrollments"
  | "faqs"
  | "courses"
  | "landingPages"
  | "englishCards"
  | "ieltsCards"
  | "communication"
  | "codes"
  | "discountCodes"
  | "certificates"
  | "payments"
  | "reports"
  | "liveSessions"
  | "support"
  | "roles";

type TabGroup = {
  titleKey: TranslationKey;
  items: TabDef[];
};

type TabDef = {
  key: AdminTab;
  icon: React.ComponentType<{ size?: number }>;
  labelKey: TranslationKey;
};

const TAB_GROUPS: TabGroup[] = [
  {
    titleKey: "admin.group.main",
    items: [
      { key: "overview", icon: LayoutDashboard, labelKey: "admin.tab.overview" },
    ],
  },
  {
    titleKey: "admin.group.content",
    items: [
      { key: "landingPages", icon: FileText, labelKey: "admin.tab.landingPages" },
      { key: "englishCards", icon: CardIcon, labelKey: "admin.tab.englishCards" },
      { key: "ieltsCards", icon: CardIcon, labelKey: "admin.tab.ieltsCards" },
      { key: "courses", icon: BookOpen, labelKey: "admin.tab.courses" },
      { key: "faqs", icon: HelpCircle, labelKey: "admin.tab.faqs" },
    ],
  },
  {
    titleKey: "admin.group.users",
    items: [
      { key: "students", icon: Users, labelKey: "admin.tab.students" },
      { key: "enrollments", icon: GraduationCap, labelKey: "admin.tab.enrollments" },
      { key: "codes", icon: KeyRound, labelKey: "admin.tab.codes" },
      { key: "discountCodes", icon: Tag, labelKey: "admin.tab.discountCodes" },
      { key: "certificates", icon: Award, labelKey: "admin.tab.certificates" },
    ],
  },
  {
    titleKey: "admin.group.finance",
    items: [
      { key: "payments", icon: CreditCard, labelKey: "admin.tab.payments" },
      { key: "reports", icon: BarChart3, labelKey: "admin.reports.tab" },
    ],
  },
  {
    titleKey: "admin.group.engagement",
    items: [
      { key: "communication", icon: Mail, labelKey: "admin.tab.communication" },
      { key: "liveSessions", icon: Video, labelKey: "admin.tab.liveSessions" },
      { key: "support", icon: MessageSquare, labelKey: "admin.tab.support" },
    ],
  },
  {
    titleKey: "admin.group.system",
    items: [
      { key: "roles", icon: Shield, labelKey: "admin.tab.roles" },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap((g) => g.items);

export default function AdminLayout({
  tab,
  onTabChange,
  children,
}: {
  tab: AdminTab;
  onTabChange: (t: AdminTab) => void;
  children: React.ReactNode;
}) {
  const t = useT();
  const { lang, dir } = useLanguage();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeDef = ALL_TABS.find((d) => d.key === tab) ?? ALL_TABS[0]!;
  const CollapseIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ExpandIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  function renderNav(mobile = false) {
    return (
      <nav className="flex flex-col gap-0.5">
        {TAB_GROUPS.map((group) => (
          <div key={group.titleKey} className="mb-2">
            {!collapsed && (
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {t(group.titleKey)}
              </div>
            )}
            {group.items.map((item) => {
              const active = tab === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onTabChange(item.key);
                    if (mobile) setMobileOpen(false);
                  }}
                  data-testid={`admin-nav-${item.key}`}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={`w-full inline-flex items-center gap-2.5 rounded-xl text-sm font-semibold transition text-start ${
                    collapsed ? "px-2.5 py-2 justify-center" : "px-3 py-2"
                  } ${
                    active
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <Icon size={16} />
                  {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100 flex" dir={dir}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 bottom-0 z-30 bg-white dark:bg-gray-900 border-e border-slate-200 dark:border-gray-800 transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-100 dark:border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-extrabold shrink-0">E</div>
          {!collapsed && (
            <span className="text-sm font-extrabold tracking-tight">
              <span className="text-slate-900 dark:text-white">Abu Omar </span>
              <span className="bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                EduLexo
              </span>
            </span>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {renderNav()}
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-slate-100 dark:border-gray-800 p-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && t("admin.sidebar.collapse")}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed top-0 bottom-0 start-0 z-50 w-72 bg-white dark:bg-gray-900 border-e border-slate-200 dark:border-gray-800 flex flex-col lg:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-extrabold">E</div>
                <span className="text-sm font-extrabold tracking-tight">
                  <span className="text-slate-900 dark:text-white">Abu Omar </span>
                  <span className="bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                    EduLexo
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {renderNav(true)}
            </div>
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${collapsed ? "lg:ms-[68px]" : "lg:ms-64"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center"
              >
                <Menu size={18} />
              </button>
              <div>
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Link href="/admin" className="font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600">
                    {t("admin.title")}
                  </Link>
                  <ChevronRight size={12} className="opacity-60 rtl:rotate-180" />
                  <span>{t(activeDef.labelKey)}</span>
                </nav>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent mt-0.5">
                  {t(activeDef.labelKey)}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
              >
                ← {t("admin.backToSite")}
              </Link>
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {(user.name ?? user.email ?? "A").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                    {user.name ?? user.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
