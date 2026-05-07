import type { ReactNode } from "react";
import Header from "@/components/Header";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-3xl shadow-xl ring-1 ring-slate-200/70 dark:ring-gray-800 p-7 sm:p-9">
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {subtitle}
              </p>
            )}
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
