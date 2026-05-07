import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import {
  fetchMyEnglishEnrollments,
  hasActiveEnglishAccess,
} from "@/lib/platform-api";

type Props = {
  children: ReactNode;
};

export default function EnglishOnlyRoute({ children }: Props) {
  const { isAdmin } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-english-enrollments"],
    queryFn: fetchMyEnglishEnrollments,
    enabled: !isAdmin,
  });

  if (isAdmin) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="text-slate-600 dark:text-slate-300">Loading…</div>
      </div>
    );
  }

  const enrollments = isError ? [] : (data ?? []);
  if (hasActiveEnglishAccess(enrollments)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl p-8 sm:p-10 ring-1 ring-slate-200/70 dark:ring-gray-800 shadow-lg text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <BookOpen size={26} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
            {isAr ? "مطلوب اشتراك في كورس الإنجليزي" : "English course required"}
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAr
              ? "هذه اللوحة مخصّصة لطلاب كورس Lexo for English (المبتدئ، المتقدّم، أو الكورس الشامل). اشترك في أحد الباقات للوصول."
              : "This dashboard is for students enrolled in a Lexo for English course (Beginner, Advanced, or Complete). Subscribe to a package to get access."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/english"
              data-testid="link-english-required-browse"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold shadow hover:shadow-lg transition"
            >
              {isAr ? "تصفّح باقات الإنجليزي" : "Browse English plans"}
            </Link>
            <Link
              href="/dashboard"
              data-testid="link-english-required-back"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200 text-sm font-bold ring-1 ring-slate-200 dark:ring-gray-700 hover:bg-slate-200 dark:hover:bg-gray-700 transition"
            >
              {isAr ? "العودة إلى لوحة التحكم" : "Back to dashboard"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
