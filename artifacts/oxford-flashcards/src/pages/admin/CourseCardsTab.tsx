import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  CreditCard,
} from "lucide-react";
import { useT, useLanguage } from "@/lib/i18n";
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
  fetchAdminCourseCards,
  createAdminCourseCard,
  patchAdminCourseCard,
  deleteAdminCourseCard,
  type AdminCourseCard,
} from "@/lib/platform-api";

export default function CourseCardsTab({ courseType }: { courseType: "english" | "ielts" }) {
  const t = useT();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminCourseCard | "new" | null>(null);

  const titleKey = courseType === "english" ? "admin.cards.title.en" : "admin.cards.title.ielts";
  const subtitleKey = courseType === "english" ? "admin.cards.subtitle.en" : "admin.cards.subtitle.ielts";

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "course-cards", courseType],
    queryFn: () => fetchAdminCourseCards(courseType),
  });

  const createMutation = useMutation({
    mutationFn: (card: Omit<AdminCourseCard, "id">) => createAdminCourseCard(card),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "course-cards", courseType] });
      toast({ title: t("admin.cards.saved") });
      setEditing(null);
    },
  });

  const patchMutation = useMutation({
    mutationFn: (args: { id: number; data: Partial<AdminCourseCard> }) =>
      patchAdminCourseCard(args.id, args.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "course-cards", courseType] });
      toast({ title: t("admin.cards.saved") });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminCourseCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "course-cards", courseType] });
    },
  });

  if (isLoading) return <LoadingPanel />;
  if (error) return <ErrorPanel msg={(error as Error).message} />;

  const cards = (data ?? []).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{t(titleKey)}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(subtitleKey)}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className={BTN_PRIMARY}
        >
          <Plus size={14} />
          {t("admin.cards.add")}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label={courseType === "english" ? t("admin.cards.title.en") : t("admin.cards.title.ielts")}
          value={String(cards.length)}
          accent="indigo"
          icon={<CreditCard size={18} />}
        />
        <StatCard
          label={t("admin.cards.active")}
          value={String(cards.filter((c) => c.isActive).length)}
          accent="emerald"
          icon={<Eye size={18} />}
        />
        <StatCard
          label={t("admin.cards.hidden")}
          value={String(cards.filter((c) => !c.isActive).length)}
          accent="amber"
          icon={<EyeOff size={18} />}
        />
      </div>

      {/* Card list */}
      {cards.length === 0 && !editing ? (
        <div className={`${CARD_CLS} p-10 text-center`}>
          <CreditCard size={32} className="mx-auto text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">{t("admin.cards.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) =>
            editing && typeof editing !== "string" && editing.id === card.id ? (
              <CardEditor
                key={card.id}
                card={card}
                courseType={courseType}
                onCancel={() => setEditing(null)}
                onSave={(data) => patchMutation.mutate({ id: card.id, data })}
                saving={patchMutation.isPending}
                t={t}
                lang={lang}
              />
            ) : (
              <CardRow
                key={card.id}
                card={card}
                lang={lang}
                t={t}
                onEdit={() => setEditing(card)}
                onDelete={() => {
                  if (window.confirm(t("admin.cards.confirmDelete"))) {
                    deleteMutation.mutate(card.id);
                  }
                }}
              />
            ),
          )}
        </div>
      )}

      {editing === "new" && (
        <CardEditor
          card={null}
          courseType={courseType}
          onCancel={() => setEditing(null)}
          onSave={(data) =>
            createMutation.mutate({
              ...data,
              courseType,
            } as Omit<AdminCourseCard, "id">)
          }
          saving={createMutation.isPending}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}

function CardRow({
  card,
  lang,
  t,
  onEdit,
  onDelete,
}: {
  card: AdminCourseCard;
  lang: string;
  t: (k: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const title = lang === "ar" ? card.titleAr : card.titleEn;
  const desc = lang === "ar" ? card.descriptionAr : card.descriptionEn;
  const finalPrice =
    card.discount > 0
      ? Math.round(card.price * (1 - card.discount / 100))
      : card.price;

  return (
    <div className={`${CARD_CLS} p-4 flex items-center gap-4`}>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
        {card.displayOrder}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold truncate">{title || "—"}</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              card.isActive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {card.isActive ? t("admin.cards.active") : t("admin.cards.hidden")}
          </span>
          {card.badgeEn && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              {lang === "ar" ? card.badgeAr : card.badgeEn}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">{desc || "—"}</p>
        <div className="flex items-center gap-3 mt-1 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {card.level || "—"}
          </span>
          {card.discount > 0 ? (
            <span>
              <span className="line-through text-slate-400">{card.price} SAR</span>{" "}
              <span className="font-bold text-emerald-600">{finalPrice} SAR</span>{" "}
              <span className="text-rose-500">(-{card.discount}%)</span>
            </span>
          ) : (
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {card.price} SAR
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-600 hover:text-rose-600 transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function CardEditor({
  card,
  courseType,
  onCancel,
  onSave,
  saving,
  t,
  lang,
}: {
  card: AdminCourseCard | null;
  courseType: "english" | "ielts";
  onCancel: () => void;
  onSave: (data: Partial<AdminCourseCard>) => void;
  saving: boolean;
  t: (k: string) => string;
  lang: string;
}) {
  const [form, setForm] = useState({
    titleEn: card?.titleEn ?? "",
    titleAr: card?.titleAr ?? "",
    descriptionEn: card?.descriptionEn ?? "",
    descriptionAr: card?.descriptionAr ?? "",
    level: card?.level ?? "",
    price: card?.price ?? 150,
    discount: card?.discount ?? 0,
    badgeEn: card?.badgeEn ?? "",
    badgeAr: card?.badgeAr ?? "",
    buttonTextEn: card?.buttonTextEn ?? "",
    buttonTextAr: card?.buttonTextAr ?? "",
    buttonLink: card?.buttonLink ?? "",
    imageUrl: card?.imageUrl ?? "",
    isActive: card?.isActive ?? true,
    displayOrder: card?.displayOrder ?? 0,
    targetBand: card?.targetBand ?? "",
  });

  const update = (key: string, val: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const finalPrice =
    form.discount > 0
      ? Math.round(form.price * (1 - form.discount / 100))
      : form.price;

  return (
    <div className={`${CARD_CLS} p-5 ring-2 ring-indigo-400/50`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">
          {card ? t("admin.cards.edit") : t("admin.cards.add")}
        </h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={`${t("admin.cards.cardTitle")} (EN)`}>
          <input className={INPUT_CLS} value={form.titleEn} onChange={(e) => update("titleEn", e.target.value)} dir="ltr" />
        </Field>
        <Field label={`${t("admin.cards.cardTitle")} (AR)`}>
          <input className={INPUT_CLS} value={form.titleAr} onChange={(e) => update("titleAr", e.target.value)} dir="rtl" />
        </Field>
        <Field label={`${t("admin.cards.desc")} (EN)`}>
          <textarea className={`${INPUT_CLS} min-h-[60px]`} value={form.descriptionEn} onChange={(e) => update("descriptionEn", e.target.value)} dir="ltr" rows={2} />
        </Field>
        <Field label={`${t("admin.cards.desc")} (AR)`}>
          <textarea className={`${INPUT_CLS} min-h-[60px]`} value={form.descriptionAr} onChange={(e) => update("descriptionAr", e.target.value)} dir="rtl" rows={2} />
        </Field>
        <Field label={t("admin.cards.level")}>
          <input className={INPUT_CLS} value={form.level} onChange={(e) => update("level", e.target.value)} dir="ltr" placeholder="e.g. A1 → B1" />
        </Field>
        {courseType === "ielts" && (
          <Field label={t("admin.cards.targetBand")}>
            <input className={INPUT_CLS} value={form.targetBand} onChange={(e) => update("targetBand", e.target.value)} dir="ltr" placeholder="e.g. 5.0 - 6.5" />
          </Field>
        )}
        <Field label={t("admin.cards.price")}>
          <input className={INPUT_CLS} type="number" value={form.price} onChange={(e) => update("price", Number(e.target.value))} dir="ltr" />
        </Field>
        <Field label={t("admin.cards.discount")}>
          <input className={INPUT_CLS} type="number" value={form.discount} onChange={(e) => update("discount", Number(e.target.value))} dir="ltr" min={0} max={100} />
        </Field>
        {form.discount > 0 && (
          <div className="col-span-full text-sm">
            <span className="text-slate-500">{t("admin.cards.originalPrice")}: </span>
            <span className="line-through">{form.price} SAR</span>
            <span className="mx-2">→</span>
            <span className="font-bold text-emerald-600">{finalPrice} SAR</span>
          </div>
        )}
        <Field label={`${t("admin.cards.badge")} (EN)`}>
          <input className={INPUT_CLS} value={form.badgeEn} onChange={(e) => update("badgeEn", e.target.value)} dir="ltr" placeholder="e.g. Best Value" />
        </Field>
        <Field label={`${t("admin.cards.badge")} (AR)`}>
          <input className={INPUT_CLS} value={form.badgeAr} onChange={(e) => update("badgeAr", e.target.value)} dir="rtl" placeholder="مثال: الأفضل قيمة" />
        </Field>
        <Field label={`${t("admin.cards.btnText")} (EN)`}>
          <input className={INPUT_CLS} value={form.buttonTextEn} onChange={(e) => update("buttonTextEn", e.target.value)} dir="ltr" />
        </Field>
        <Field label={`${t("admin.cards.btnText")} (AR)`}>
          <input className={INPUT_CLS} value={form.buttonTextAr} onChange={(e) => update("buttonTextAr", e.target.value)} dir="rtl" />
        </Field>
        <Field label={t("admin.cards.btnLink")}>
          <input className={INPUT_CLS} value={form.buttonLink} onChange={(e) => update("buttonLink", e.target.value)} dir="ltr" placeholder="/course/english/beginner" />
        </Field>
        <Field label={t("admin.cards.image")}>
          <input className={INPUT_CLS} value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} dir="ltr" />
        </Field>
        <Field label={t("admin.cards.order")}>
          <input className={INPUT_CLS} type="number" value={form.displayOrder} onChange={(e) => update("displayOrder", Number(e.target.value))} dir="ltr" />
        </Field>
      </div>

      <div className="flex items-center gap-4 mt-5">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-semibold">
            {form.isActive ? t("admin.cards.active") : t("admin.cards.hidden")}
          </span>
        </label>
        <div className="flex-1" />
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          <X size={14} />
        </button>
        <button
          type="button"
          onClick={() => onSave({ ...form, courseType })}
          disabled={saving}
          className={BTN_PRIMARY}
        >
          <Save size={14} />
          {t("admin.cards.save")}
        </button>
      </div>
    </div>
  );
}
