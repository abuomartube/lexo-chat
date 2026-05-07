import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Eye, EyeOff, Save, X, FileText, Globe2 } from "lucide-react";
import { useT, useLanguage } from "@/lib/i18n";
import {
  LoadingPanel,
  ErrorPanel,
  Field,
  INPUT_CLS,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_CLS,
} from "@/components/admin/AdminPrimitives";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAdminLandingPages,
  patchAdminLandingPage,
  type AdminLandingPage,
} from "@/lib/platform-api";

const COURSES = ["english", "ielts", "intro"] as const;

export default function LandingPagesTab() {
  const t = useT();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "landing-pages"],
    queryFn: fetchAdminLandingPages,
  });

  const saveMutation = useMutation({
    mutationFn: (args: { course: string; data: Partial<AdminLandingPage> }) =>
      patchAdminLandingPage(args.course, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "landing-pages"] });
      toast({ title: t("admin.lp.saved") });
      setEditing(null);
    },
  });

  if (isLoading) return <LoadingPanel />;
  if (error) return <ErrorPanel msg={(error as Error).message} />;

  const pages = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">{t("admin.lp.title")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.lp.subtitle")}
        </p>
      </div>

      <div className="grid gap-4">
        {COURSES.map((course) => {
          const page = pages.find((p) => p.course === course);
          const isEditing = editing === course;

          return (
            <LandingPageCard
              key={course}
              course={course}
              page={page ?? null}
              isEditing={isEditing}
              onEdit={() => setEditing(course)}
              onCancel={() => setEditing(null)}
              onSave={(data) => saveMutation.mutate({ course, data })}
              saving={saveMutation.isPending}
              lang={lang}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );
}

function LandingPageCard({
  course,
  page,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  lang,
  t,
}: {
  course: string;
  page: AdminLandingPage | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: Partial<AdminLandingPage>) => void;
  saving: boolean;
  lang: string;
  t: (key: string) => string;
}) {
  const courseLabels: Record<string, string> = {
    english: t("admin.lp.course.english"),
    ielts: t("admin.lp.course.ielts"),
    intro: t("admin.lp.course.intro"),
  };

  const [form, setForm] = useState({
    titleEn: page?.titleEn ?? "",
    titleAr: page?.titleAr ?? "",
    subtitleEn: page?.subtitleEn ?? "",
    subtitleAr: page?.subtitleAr ?? "",
    heroImage: page?.heroImage ?? "",
    heroVideo: page?.heroVideo ?? "",
    introVideo: page?.introVideo ?? "",
    descriptionEn: page?.descriptionEn ?? "",
    descriptionAr: page?.descriptionAr ?? "",
    benefitsEn: page?.benefitsEn ?? "",
    benefitsAr: page?.benefitsAr ?? "",
    targetStudentEn: page?.targetStudentEn ?? "",
    targetStudentAr: page?.targetStudentAr ?? "",
    whatLearnEn: page?.whatLearnEn ?? "",
    whatLearnAr: page?.whatLearnAr ?? "",
    ctaTextEn: page?.ctaTextEn ?? "",
    ctaTextAr: page?.ctaTextAr ?? "",
    ctaLink: page?.ctaLink ?? "",
    isPublished: page?.isPublished ?? false,
  });

  const update = (key: string, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  if (!isEditing) {
    return (
      <div className={`${CARD_CLS} p-5`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {courseLabels[course] ?? course}
              </h3>
              <p className="text-xs text-slate-500">
                {page
                  ? (lang === "ar" ? page.titleAr : page.titleEn) || "—"
                  : t("admin.lp.draft")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                page?.isPublished
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              {page?.isPublished ? t("admin.lp.published") : t("admin.lp.draft")}
            </span>
            <button type="button" onClick={onEdit} className={BTN_SECONDARY}>
              <Pencil size={14} />
              {t("admin.lp.editPage")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CARD_CLS} p-5 ring-2 ring-indigo-400/50`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Globe2 size={20} className="text-indigo-600" />
          <h3 className="font-bold">{courseLabels[course] ?? course}</h3>
        </div>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={`${t("admin.lp.pageTitle")} (${t("admin.lp.en")})`}>
          <input
            className={INPUT_CLS}
            value={form.titleEn}
            onChange={(e) => update("titleEn", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={`${t("admin.lp.pageTitle")} (${t("admin.lp.ar")})`}>
          <input
            className={INPUT_CLS}
            value={form.titleAr}
            onChange={(e) => update("titleAr", e.target.value)}
            dir="rtl"
          />
        </Field>
        <Field label={`${t("admin.lp.pageSubtitle")} (${t("admin.lp.en")})`}>
          <input
            className={INPUT_CLS}
            value={form.subtitleEn}
            onChange={(e) => update("subtitleEn", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={`${t("admin.lp.pageSubtitle")} (${t("admin.lp.ar")})`}>
          <input
            className={INPUT_CLS}
            value={form.subtitleAr}
            onChange={(e) => update("subtitleAr", e.target.value)}
            dir="rtl"
          />
        </Field>
        <Field label={t("admin.lp.heroImage")}>
          <input
            className={INPUT_CLS}
            value={form.heroImage}
            onChange={(e) => update("heroImage", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={t("admin.lp.heroVideo")}>
          <input
            className={INPUT_CLS}
            value={form.heroVideo}
            onChange={(e) => update("heroVideo", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={t("admin.lp.introVideo")}>
          <input
            className={INPUT_CLS}
            value={form.introVideo}
            onChange={(e) => update("introVideo", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={t("admin.lp.ctaLink")}>
          <input
            className={INPUT_CLS}
            value={form.ctaLink}
            onChange={(e) => update("ctaLink", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={`${t("admin.lp.description")} (${t("admin.lp.en")})`}>
          <textarea
            className={`${INPUT_CLS} min-h-[80px]`}
            value={form.descriptionEn}
            onChange={(e) => update("descriptionEn", e.target.value)}
            dir="ltr"
            rows={3}
          />
        </Field>
        <Field label={`${t("admin.lp.description")} (${t("admin.lp.ar")})`}>
          <textarea
            className={`${INPUT_CLS} min-h-[80px]`}
            value={form.descriptionAr}
            onChange={(e) => update("descriptionAr", e.target.value)}
            dir="rtl"
            rows={3}
          />
        </Field>
        <Field label={`${t("admin.lp.benefits")} (${t("admin.lp.en")}) — ${t("admin.lp.benefitsHint")}`}>
          <textarea
            className={`${INPUT_CLS} min-h-[80px]`}
            value={form.benefitsEn}
            onChange={(e) => update("benefitsEn", e.target.value)}
            dir="ltr"
            rows={3}
          />
        </Field>
        <Field label={`${t("admin.lp.benefits")} (${t("admin.lp.ar")}) — ${t("admin.lp.benefitsHint")}`}>
          <textarea
            className={`${INPUT_CLS} min-h-[80px]`}
            value={form.benefitsAr}
            onChange={(e) => update("benefitsAr", e.target.value)}
            dir="rtl"
            rows={3}
          />
        </Field>
        <Field label={`${t("admin.lp.targetStudent")} (${t("admin.lp.en")})`}>
          <textarea
            className={`${INPUT_CLS} min-h-[60px]`}
            value={form.targetStudentEn}
            onChange={(e) => update("targetStudentEn", e.target.value)}
            dir="ltr"
            rows={2}
          />
        </Field>
        <Field label={`${t("admin.lp.targetStudent")} (${t("admin.lp.ar")})`}>
          <textarea
            className={`${INPUT_CLS} min-h-[60px]`}
            value={form.targetStudentAr}
            onChange={(e) => update("targetStudentAr", e.target.value)}
            dir="rtl"
            rows={2}
          />
        </Field>
        <Field label={`${t("admin.lp.whatLearn")} (${t("admin.lp.en")}) — ${t("admin.lp.benefitsHint")}`}>
          <textarea
            className={`${INPUT_CLS} min-h-[80px]`}
            value={form.whatLearnEn}
            onChange={(e) => update("whatLearnEn", e.target.value)}
            dir="ltr"
            rows={3}
          />
        </Field>
        <Field label={`${t("admin.lp.whatLearn")} (${t("admin.lp.ar")}) — ${t("admin.lp.benefitsHint")}`}>
          <textarea
            className={`${INPUT_CLS} min-h-[80px]`}
            value={form.whatLearnAr}
            onChange={(e) => update("whatLearnAr", e.target.value)}
            dir="rtl"
            rows={3}
          />
        </Field>
        <Field label={`${t("admin.lp.ctaText")} (${t("admin.lp.en")})`}>
          <input
            className={INPUT_CLS}
            value={form.ctaTextEn}
            onChange={(e) => update("ctaTextEn", e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={`${t("admin.lp.ctaText")} (${t("admin.lp.ar")})`}>
          <input
            className={INPUT_CLS}
            value={form.ctaTextAr}
            onChange={(e) => update("ctaTextAr", e.target.value)}
            dir="rtl"
          />
        </Field>
      </div>

      <div className="flex items-center gap-4 mt-5">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => update("isPublished", e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-semibold">
            {form.isPublished ? t("admin.lp.published") : t("admin.lp.draft")}
          </span>
        </label>
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          <X size={14} />
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving}
          className={BTN_PRIMARY}
        >
          <Save size={14} />
          {t("admin.lp.save")}
        </button>
      </div>
    </div>
  );
}
