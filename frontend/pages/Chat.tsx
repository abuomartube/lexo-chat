import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Flame,
  MessageCircle,
  Trophy,
  Bell,
  Sparkles,
  Mic2,
  GraduationCap,
  Coffee,
  MessageSquareText,
  Users,
  ArrowRight,
  Bookmark,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { fetchRooms, type ChatRoomSummary } from "@/lib/chat-api";

const FILTERS = [
  {
    key: "all",
    labelEn: "All",
    labelAr: "الكل",
    icon: Sparkles,
  },
  {
    key: "speaking",
    labelEn: "Conversation",
    labelAr: "محادثة",
    icon: MessageSquareText,
  },
  {
    key: "voice",
    labelEn: "Voice Only",
    labelAr: "صوت فقط",
    icon: Mic2,
  },
  {
    key: "ielts",
    labelEn: "IELTS",
    labelAr: "آيلتس",
    icon: GraduationCap,
  },
  {
    key: "casual",
    labelEn: "Casual",
    labelAr: "عام",
    icon: Coffee,
  },
] as const;

function categoryIconBg(room: ChatRoomSummary): string {
  if (room.kind === "voice") {
    return "bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500";
  }
  switch (room.category) {
    case "ielts":
      return "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600";
    case "casual":
      return "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500";
    default:
      return "bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600";
  }
}

function categoryGlow(room: ChatRoomSummary): string {
  if (room.kind === "voice") return "shadow-[0_12px_28px_-10px_rgba(244,63,94,0.55)]";
  switch (room.category) {
    case "ielts":
      return "shadow-[0_12px_28px_-10px_rgba(16,185,129,0.55)]";
    case "casual":
      return "shadow-[0_12px_28px_-10px_rgba(249,115,22,0.55)]";
    default:
      return "shadow-[0_12px_28px_-10px_rgba(124,58,237,0.55)]";
  }
}

export default function ChatPage() {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: fetchRooms,
    refetchInterval: 15000,
  });

  const filtered = useMemo<ChatRoomSummary[]>(() => {
    const rooms = data?.rooms ?? [];
    return rooms.filter((r) => {
      if (filter !== "all") {
        if (filter === "voice" && r.kind !== "voice") return false;
        if (filter !== "voice" && r.category !== filter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          r.nameEn.toLowerCase().includes(q) ||
          r.nameAr.includes(search.trim()) ||
          (r.descriptionEn ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, filter, search]);

  const totalOnline = useMemo(
    () => (data?.rooms ?? []).reduce((sum, r) => sum + (r.onlineCount || 0), 0),
    [data],
  );
  const totalRooms = data?.rooms.length ?? 0;

  return (
    <div
      className="dark min-h-screen text-slate-100 relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, #1f1750 0%, #0d1330 28%, #060b1f 55%, #02040e 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(124,58,237,0.18), transparent 60%)",
        }}
      />
      <Header />
      <main className="relative max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* === HERO === */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-purple-600/15 via-indigo-600/10 to-slate-900/40 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(124,58,237,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-purple-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur px-2.5 py-1 ring-1 ring-white/10 text-[10.5px] font-bold uppercase tracking-[0.14em] text-purple-200">
                  <Sparkles size={11} className="text-purple-300" />
                  LEXO Chat
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-200 via-purple-200 to-indigo-200 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(168,85,247,0.4)]">
                  {lang === "ar"
                    ? "تدرّب على الإنجليزية مع المجتمع"
                    : "Practice English, Together"}
                </h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-300/85 max-w-md">
                  {lang === "ar"
                    ? "انضم إلى غرف حيّة مع متعلمين من كل مكان، مارس المحادثة، وحسّن لغتك بثقة."
                    : "Join live rooms with learners around the world, practice real conversations, and grow your English with confidence."}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <Link
                  href="/chat/messages"
                  aria-label={lang === "ar" ? "الرسائل" : "Messages"}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 hover:ring-purple-400/40 hover:bg-white/[0.10] text-slate-200 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  <MessageCircle size={16} />
                </Link>
                <Link
                  href="/chat/leaderboard"
                  aria-label={lang === "ar" ? "المتصدرون" : "Leaderboard"}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 hover:ring-purple-400/40 hover:bg-white/[0.10] text-slate-200 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  <Trophy size={16} />
                </Link>
                <Link
                  href="/chat/notes"
                  aria-label={lang === "ar" ? "ملاحظاتي" : "My Notes"}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 hover:ring-purple-400/40 hover:bg-white/[0.10] text-slate-200 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  <Bookmark size={16} />
                </Link>
                <button
                  type="button"
                  aria-label={lang === "ar" ? "الإشعارات" : "Notifications"}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 hover:ring-purple-400/40 hover:bg-white/[0.10] text-slate-200 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                >
                  <Bell size={16} />
                </button>
              </div>
            </div>

            {/* Live stats */}
            <div className="mt-5 flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-white/[0.05] backdrop-blur ring-1 ring-white/10 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11.5px] font-semibold text-emerald-200 tabular-nums">
                  {totalOnline}
                </span>
                <span className="text-[11.5px] text-slate-400">
                  {lang === "ar" ? "متصل الآن" : "online now"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/[0.05] backdrop-blur ring-1 ring-white/10 px-3 py-1.5">
                <Users size={11} className="text-purple-300" />
                <span className="text-[11.5px] font-semibold text-slate-200 tabular-nums">
                  {totalRooms}
                </span>
                <span className="text-[11.5px] text-slate-400">
                  {lang === "ar" ? "غرفة" : "rooms"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* === ROOMS PANEL === */}
        <section className="rounded-[28px] p-4 sm:p-5 bg-gradient-to-br from-slate-800/55 to-slate-900/65 backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),0_8px_24px_-8px_rgba(124,58,237,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-white tracking-tight">
                {lang === "ar" ? "اختر غرفة" : "Choose a Room"}
              </h2>
              <p className="text-[11.5px] text-slate-400 mt-0.5">
                {lang === "ar"
                  ? "ابدأ المحادثة فورًا — لا حاجة للتسجيل المسبق"
                  : "Jump into a live conversation — no signup needed"}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "ابحث عن غرفة..." : "Search rooms…"}
              className="w-full ps-9 pe-3 py-2.5 rounded-2xl bg-slate-950/60 ring-1 ring-white/10 text-sm text-slate-100 placeholder:text-slate-500/80 focus:outline-none focus:ring-2 focus:ring-purple-400/60 backdrop-blur-xl transition"
              aria-label={lang === "ar" ? "ابحث عن غرفة" : "Search rooms"}
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 ${
                    active
                      ? "text-white ring-purple-400/40 shadow-[0_8px_22px_-6px_rgba(124,58,237,0.7)]"
                      : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.10] hover:text-white ring-white/10 backdrop-blur-xl"
                  }`}
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
                        }
                      : undefined
                  }
                  type="button"
                  aria-pressed={active}
                >
                  <Icon size={12} className={active ? "text-white" : "text-purple-300"} />
                  {lang === "ar" ? f.labelAr : f.labelEn}
                </button>
              );
            })}
          </div>

          {isLoading && (
            <div className="py-12 flex justify-center">
              <Loader2 size={26} className="animate-spin text-purple-400" />
            </div>
          )}
          {error && (
            <div className="rounded-2xl bg-red-950/40 ring-1 ring-red-500/30 p-4 text-sm text-red-300 backdrop-blur-xl">
              {(error as Error).message}
            </div>
          )}

          <ul className="space-y-2.5">
            {filtered.map((room) => {
              const isHot = room.id === data?.hotRoomId && room.onlineCount > 0;
              const isVoice = room.kind === "voice";
              const isLive = room.onlineCount > 0;
              const description =
                lang === "ar"
                  ? room.descriptionAr ?? room.descriptionEn ?? ""
                  : room.descriptionEn ?? room.descriptionAr ?? "";
              return (
                <li key={room.id}>
                  <Link
                    href={`/chat/r/${room.slug}`}
                    className="group relative block overflow-hidden rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/10 hover:ring-purple-400/40 p-3.5 sm:p-4 transition-all backdrop-blur-xl shadow-[0_4px_18px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
                  >
                    {/* Hover sheen */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-500/[0.06] via-transparent to-indigo-500/[0.04]" />

                    <div className="relative flex items-center gap-3">
                      <div
                        className={`shrink-0 w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-2xl ring-1 ring-white/15 ${categoryIconBg(
                          room,
                        )} ${categoryGlow(room)} transition-transform group-hover:scale-105`}
                        aria-hidden="true"
                      >
                        <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                          {room.emoji ?? (isVoice ? "🎙️" : "💬")}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="font-bold text-white truncate text-[14.5px] tracking-tight"
                            dir="auto"
                          >
                            {lang === "ar" ? room.nameAr : room.nameEn}
                          </h3>
                          {isHot && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 ring-1 ring-orange-400/30 text-orange-200 text-[9.5px] font-bold uppercase tracking-wide">
                              <Flame size={9} />
                              {lang === "ar" ? "نشط" : "Hot"}
                            </span>
                          )}
                          {isVoice && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 ring-1 ring-amber-400/25 text-amber-200 text-[9.5px] font-bold uppercase tracking-wide">
                              <Mic2 size={9} />
                              {lang === "ar" ? "صوت" : "Voice"}
                            </span>
                          )}
                        </div>

                        {description && (
                          <p
                            className="mt-0.5 text-[11.5px] leading-snug text-slate-400/90 truncate"
                            dir="auto"
                          >
                            {description}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              {isLive && (
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
                              )}
                              <span
                                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                  isLive ? "bg-emerald-400" : "bg-slate-600"
                                }`}
                              />
                            </span>
                            <span
                              className={`tabular-nums font-semibold ${
                                isLive ? "text-emerald-200" : "text-slate-400"
                              }`}
                            >
                              {room.onlineCount}
                            </span>
                            <span className="text-slate-500">
                              {lang === "ar" ? "متصل" : "online"}
                            </span>
                          </span>
                          {room.level && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900/80 ring-1 ring-white/5 text-slate-300 font-mono text-[10px]">
                              {room.level}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11.5px] font-bold ring-1 transition ${
                          isVoice
                            ? "bg-amber-500/15 text-amber-200 ring-amber-400/30"
                            : "text-white ring-purple-400/40 shadow-[0_8px_22px_-6px_rgba(124,58,237,0.7)] group-hover:brightness-110"
                        }`}
                        style={
                          isVoice
                            ? undefined
                            : {
                                background:
                                  "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%)",
                              }
                        }
                      >
                        {isVoice
                          ? lang === "ar"
                            ? "قريباً"
                            : "Soon"
                          : lang === "ar"
                            ? "انضمام"
                            : "Join"}
                        {!isVoice && (
                          <ArrowRight
                            size={12}
                            className="rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                          />
                        )}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <li className="rounded-2xl bg-slate-900/40 ring-1 ring-white/5 p-8 text-center text-sm text-slate-400 backdrop-blur-xl">
                {lang === "ar" ? "لا توجد غرف مطابقة." : "No matching rooms."}
              </li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
