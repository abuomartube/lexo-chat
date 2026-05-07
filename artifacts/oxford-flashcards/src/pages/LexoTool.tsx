import { Link, Redirect, useParams, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { CURRICULUM_ENABLED } from "@/lib/feature-flags";

const TOOL_PATHS: Record<string, string> = {
  speaking: "/lexo/tools/speaking",
  writing: "/lexo/tools/writing",
  listening: "/lexo/tools/listening",
  reading: "/lexo/tools/reading",
  lessons: "/lexo/tools/lessons",
  flashcards: "/lexo/flashcards/",
  curriculum: "/lexo/curriculum",
};

const TOOL_TITLES: Record<string, { en: string; ar: string }> = {
  speaking: { en: "Speaking", ar: "التحدث" },
  writing: { en: "Writing", ar: "الكتابة" },
  listening: { en: "Listening", ar: "الاستماع" },
  reading: { en: "Reading", ar: "القراءة" },
  lessons: { en: "Video Lessons", ar: "دروس الفيديو" },
  flashcards: { en: "Flashcards", ar: "البطاقات" },
  curriculum: { en: "Books & Lessons", ar: "الكتب والدروس" },
};

export default function LexoTool() {
  const params = useParams<{ tool: string }>();
  const tool = params.tool ?? "";
  const search = useSearch();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  // Strategic Simplification (May 2026): the Lexo curriculum tools
  // (lessons / speaking / writing / listening / reading / curriculum)
  // are hidden from the active student experience. Redirect to the
  // simplified English hub instead. The standalone flashcards tool is
  // also reached more directly via /app, so it redirects too.
  if (!CURRICULUM_ENABLED) {
    return <Redirect to="/dashboard/english" replace />;
  }

  const target = TOOL_PATHS[tool];
  const title = TOOL_TITLES[tool];

  if (!target || !title) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950">
        <Header />
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isAr ? "أداة غير معروفة" : "Unknown tool"}
          </h1>
          <Link
            href="/dashboard/english"
            className="mt-4 inline-block text-indigo-700 dark:text-indigo-300 hover:underline"
          >
            {isAr ? "العودة إلى أدوات ليكسو" : "Back to Lexo tools"}
          </Link>
        </main>
      </div>
    );
  }

  // For the lessons tool, forward a parent ?lesson=<id> query param into
  // the iframe so the embedded Lessons page can deep-link / auto-open it.
  // Only forward for the lessons tool to keep other tools' URLs untouched.
  let extra = "";
  if (tool === "lessons" && search) {
    const sp = new URLSearchParams(search);
    const lessonParam = sp.get("lesson");
    if (lessonParam && /^\d+$/.test(lessonParam)) {
      extra = `&lesson=${lessonParam}`;
    }
  }
  const sep = target.includes("?") ? "&" : "?";
  const src = `${target}${sep}embed=1${extra}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:from-gray-950 dark:via-indigo-950/50 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/dashboard/english"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300"
            data-testid="link-back-lexo-hub"
          >
            <ArrowLeft size={16} className={isAr ? "rotate-180" : ""} />
            {isAr ? "أدوات ليكسو" : "Lexo Tools"}
          </Link>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            {isAr ? title.ar : title.en}
          </h1>
        </div>

        <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur rounded-2xl ring-1 ring-slate-200/70 dark:ring-gray-800 shadow overflow-hidden">
          <iframe
            key={tool}
            src={src}
            title={isAr ? title.ar : title.en}
            data-testid={`iframe-lexo-${tool}`}
            className="w-full block"
            style={{ height: "calc(100vh - 200px)", minHeight: 600, border: 0 }}
            allow="clipboard-read; clipboard-write; microphone; camera; autoplay; fullscreen"
          />
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
          {isAr
            ? "هذه الأداة تعمل داخل منصّة EduLexo."
            : "This tool runs inside EduLexo."}
        </p>
      </main>
    </div>
  );
}
