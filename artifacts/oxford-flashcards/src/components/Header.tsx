import { Link, useLocation } from "wouter";
import { Moon, Sun, LogOut, MessageCircle, Languages } from "lucide-react";
import edulexoLogo from "@/assets/edulexo-logo.png";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";

export default function Header() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { lang, toggle: toggleLang, dir } = useLanguage();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header
      dir={dir}
      className="sticky top-0 z-40 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-slate-950/80 backdrop-blur"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link href="/chat" className="flex items-center gap-2 shrink-0">
          <img src={edulexoLogo} alt="LEXO Chat" className="h-8 w-auto" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            LEXO Chat
          </span>
        </Link>

        <nav className="ms-auto flex items-center gap-1 sm:gap-2">
          {isAuthenticated && (
            <Link
              href="/chat"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            >
              <MessageCircle className="h-4 w-4" />
              {lang === "ar" ? "الغرف" : "Rooms"}
            </Link>
          )}

          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle language"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          >
            <Languages className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">
                {lang === "ar" ? "خروج" : "Logout"}
              </span>
              {user?.name ? (
                <span className="hidden md:inline text-xs text-slate-500 ms-1">
                  ({user.name})
                </span>
              ) : null}
            </button>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {lang === "ar" ? "دخول" : "Login"}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
