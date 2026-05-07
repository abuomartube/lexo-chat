import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  LayoutDashboard,
  Shield,
  ChevronDown,
  Settings,
  UserCircle2,
  HelpCircle,
  MessageCircle,
  ShoppingCart,
} from "lucide-react";
import edulexoLogo from "@/assets/edulexo-logo.png";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

type NavItem = { labelKey: TranslationKey; href: string };

const NAV: NavItem[] = [
  { labelKey: "nav.courses", href: "/#products" },
  { labelKey: "nav.features", href: "/#features" },
  { labelKey: "nav.freeLessons", href: "/free-lessons" },
  { labelKey: "nav.assessment", href: "/assessment" },
  { labelKey: "nav.affiliate", href: "/affiliate" },
];

function Avatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white dark:ring-gray-900">
      {initials}
    </div>
  );
}

function LangToggle({
  compact = true,
  onToggle,
}: {
  compact?: boolean;
  onToggle?: () => void;
}) {
  const { lang, setLang, t } = useLanguage();

  const options: {
    code: "en" | "ar";
    flag: string;
    label: string;
    ariaLabel: string;
  }[] = [
    {
      code: "en",
      flag: "🇬🇧",
      label: "EN",
      ariaLabel: t("header.langSwitchToEn"),
    },
    {
      code: "ar",
      flag: "🇸🇦",
      label: "العربية",
      ariaLabel: t("header.langSwitchToAr"),
    },
  ];

  const handleClick = (code: "en" | "ar") => {
    if (code !== lang) setLang(code);
    onToggle?.();
  };

  return (
    <div
      data-testid="lang-toggle"
      role="group"
      aria-label="Language switcher"
      className={`${
        compact ? "h-10" : "w-full h-11"
      } inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 backdrop-blur shadow-sm overflow-hidden`}
    >
      {options.map((opt, i) => {
        const active = lang === opt.code;
        return (
          <div key={opt.code} className="flex items-center h-full">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="h-5 w-px bg-slate-200 dark:bg-gray-700"
              />
            )}
            <button
              type="button"
              onClick={() => handleClick(opt.code)}
              aria-label={opt.ariaLabel}
              aria-pressed={active}
              title={opt.ariaLabel}
              data-testid={`lang-option-${opt.code}`}
              className={`${
                compact ? "h-full px-3" : "h-full px-4 flex-1"
              } inline-flex items-center justify-center gap-1.5 text-sm font-bold transition-all duration-300 ease-out ${
                active
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-inner scale-100"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-indigo-700 dark:hover:text-indigo-300"
              }`}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {opt.flag}
              </span>
              <span
                className={`${opt.code === "ar" ? "text-[13px]" : "text-xs uppercase tracking-wider"}`}
              >
                {opt.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function Header() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMounted, setMobileMounted] = useState(false);
  const [mobileShown, setMobileShown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (mobileOpen) {
      setMobileMounted(true);
      const id = window.requestAnimationFrame(() => setMobileShown(true));
      return () => window.cancelAnimationFrame(id);
    }
    setMobileShown(false);
    const t = window.setTimeout(() => setMobileMounted(false), 320);
    return () => window.clearTimeout(t);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileMounted) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileMounted]);

  // Close the drawer if the language is switched while it's open
  // (otherwise the panel would jump from one side of the screen to the other).
  useEffect(() => {
    setMobileOpen(false);
  }, [lang]);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-950/75 border-b border-slate-100/80 dark:border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <img
            src={edulexoLogo}
            alt="Abu Omar EduLexo"
            className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
          />
          <div className="leading-tight hidden sm:block">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight">
              <span className="text-slate-900 dark:text-white">
                {t("common.brandPrefix")}
              </span>
              <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                {t("common.brandSuffix")}
              </span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              {t("common.tagline")}
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">
          <LangToggle />

          <button
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? t("header.themeLight") : t("header.themeDark")
            }
            className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-all hover:scale-110 active:scale-95 shadow-sm"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            href="/cart"
            aria-label={t("header.cart")}
            data-testid="header-cart"
            className="relative w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-all hover:scale-110 active:scale-95 shadow-sm"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-bold px-1 shadow ring-2 ring-white dark:ring-gray-950">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 pe-2 ps-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                aria-label={t("header.accountMenu")}
                aria-expanded={menuOpen}
              >
                <Avatar name={user.name} />
                <ChevronDown
                  size={14}
                  className="text-slate-500 dark:text-slate-400 hidden sm:block"
                />
              </button>
              {menuOpen && (
                <div className="absolute end-0 top-full mt-2 w-60 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-2xl py-2 origin-top-right animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
                  >
                    <LayoutDashboard size={16} /> {t("header.dashboard")}
                  </Link>
                  <Link
                    href={`/u/${user.id}`}
                    onClick={() => setMenuOpen(false)}
                    data-testid="link-public-profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
                  >
                    <UserCircle2 size={16} /> {t("header.publicProfile")}
                  </Link>
                  <Link
                    href="/account-settings"
                    onClick={() => setMenuOpen(false)}
                    data-testid="link-account-settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
                  >
                    <Settings size={16} /> {t("header.settings")}
                  </Link>
                  <Link
                    href="/chat"
                    onClick={() => setMenuOpen(false)}
                    data-testid="link-chat"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
                  >
                    <MessageCircle size={16} /> {t("header.chat")}
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => setMenuOpen(false)}
                    data-testid="link-support"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 transition"
                  >
                    <HelpCircle size={16} /> {t("header.support")}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition"
                    >
                      <Shield size={16} /> {t("header.admin")}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                  >
                    <LogOut size={16} /> {t("header.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
              >
                {t("header.login")}
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-95 transition"
              >
                {t("header.signup")}
              </Link>
            </>
          )}

          {/* Hamburger (lg:hidden) */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={t("header.toggleMenu")}
            aria-expanded={mobileOpen}
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer + backdrop — portaled to <body> so they aren't constrained by the
          header's containing block (the header uses backdrop-filter, which would otherwise
          trap fixed-position descendants inside it). */}
      {mobileMounted &&
        createPortal(
          <div className="lg:hidden">
            {/* Backdrop */}
            <div
              data-testid="mobile-backdrop"
              onClick={closeMobile}
              aria-hidden="true"
              className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
                mobileShown ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* Sidebar */}
            <aside
              data-testid="mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t("header.toggleMenu")}
              className={`fixed top-0 bottom-0 z-50 ${
                lang === "ar" ? "right-0" : "left-0"
              } w-80 max-w-[85vw] bg-white dark:bg-gray-950 shadow-2xl shadow-black/40 ring-1 ring-black/5 dark:ring-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
                mobileShown
                  ? "translate-x-0"
                  : lang === "ar"
                    ? "translate-x-full"
                    : "-translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                <Link
                  href="/"
                  onClick={closeMobile}
                  className="flex items-center gap-2"
                >
                  <img
                    src={edulexoLogo}
                    alt="Abu Omar EduLexo"
                    className="w-9 h-9 object-contain"
                  />
                  <span className="text-base font-extrabold tracking-tight">
                    <span className="text-slate-900 dark:text-white">
                      {t("common.brandPrefix")}
                    </span>
                    <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                      {t("common.brandSuffix")}
                    </span>
                  </span>
                </Link>
                <button
                  onClick={closeMobile}
                  aria-label="Close menu"
                  data-testid="mobile-close"
                  className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className="px-3 py-3 rounded-lg text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
                <Link
                  href="/cart"
                  onClick={closeMobile}
                  data-testid="mobile-cart-link"
                  className="px-3 py-3 rounded-lg text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition flex items-center gap-2"
                >
                  <ShoppingCart size={16} />
                  {t("header.cart")}
                  {cartCount > 0 && (
                    <span className="ms-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-bold px-1.5">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-gray-800">
                  <LangToggle compact={false} />
                </div>
                {!isAuthenticated && (
                  <div className="flex gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-gray-800">
                    <Link
                      href="/login"
                      onClick={closeMobile}
                      className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30"
                    >
                      {t("header.login")}
                    </Link>
                    <Link
                      href="/signup"
                      onClick={closeMobile}
                      className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 text-white"
                    >
                      {t("header.signup")}
                    </Link>
                  </div>
                )}
              </nav>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  );
}
