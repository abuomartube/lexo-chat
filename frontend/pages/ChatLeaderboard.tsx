import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Mic,
  Image as ImageIcon,
  MessageSquare,
  Crown,
  Medal,
  Award,
  Sparkles,
  Flame,
} from "lucide-react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/chat-api";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ChatLeaderboardPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["chat-leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 30000,
  });

  const all = data?.leaderboard ?? [];
  const topThree = all.slice(0, 3);
  const rest = all.slice(3);

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
        {/* Back link */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-1 text-purple-300 text-sm mb-4 font-semibold hover:text-purple-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 rounded px-1"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {lang === "ar" ? "رجوع" : "Back"}
        </Link>

        {/* === HERO === */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-amber-500/10 via-purple-600/10 to-indigo-600/10 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(124,58,237,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />

          <div className="relative px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur px-2.5 py-1 ring-1 ring-white/10 text-[10.5px] font-bold uppercase tracking-[0.14em] text-amber-200">
                  <Trophy size={11} className="text-amber-300" />
                  {lang === "ar" ? "هذا الأسبوع" : "This Week"}
                </div>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-purple-200 to-indigo-200 bg-clip-text text-transparent drop-shadow-[0_2px_18px_rgba(245,158,11,0.35)]">
                  {lang === "ar" ? "لوحة المتصدرين" : "Leaderboard"}
                </h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-300/85 max-w-md">
                  {lang === "ar"
                    ? "تصدّر اللوحة عبر الدردشة، إرسال الملاحظات الصوتية، ومشاركة الصور مع المجتمع."
                    : "Climb the ranks by chatting, sending voice notes, and sharing with the community."}
                </p>
              </div>
              <div
                className="hidden sm:flex shrink-0 h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 ring-1 ring-amber-200/40 shadow-[0_12px_28px_-8px_rgba(245,158,11,0.6),inset_0_1px_0_rgba(255,255,255,0.4)]"
                aria-hidden="true"
              >
                <Trophy size={26} className="text-amber-950" />
              </div>
            </div>
          </div>
        </section>

        {/* === YOUR XP CARD === */}
        {data?.me && (
          <section
            className="relative overflow-hidden rounded-[24px] text-white p-5 mb-6 ring-1 ring-purple-300/25 shadow-[0_30px_70px_-18px_rgba(124,58,237,0.65),0_8px_24px_-8px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6366f1 55%, #4f46e5 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 80% -10%, rgba(255,255,255,0.25), transparent 50%)",
              }}
            />
            <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <p className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-purple-100 font-bold">
                <Sparkles size={11} />
                {lang === "ar" ? "نقاطك" : "Your XP"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                  {data.me.totalXp}
                </span>
                <span className="text-purple-100 font-semibold text-sm">XP</span>
                <span className="ms-3 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold ring-1 ring-white/20">
                  {lang === "ar" ? "مستوى" : "Level"} {data.me.level}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
                <Stat
                  icon={<MessageSquare size={12} />}
                  label={lang === "ar" ? "نص" : "Text"}
                  value={data.me.messagesSent}
                />
                <Stat
                  icon={<Mic size={12} />}
                  label={lang === "ar" ? "صوت" : "Voice"}
                  value={data.me.voiceNotesSent}
                />
                <Stat
                  icon={<ImageIcon size={12} />}
                  label={lang === "ar" ? "صور" : "Images"}
                  value={data.me.imagesSent}
                />
              </div>
            </div>
          </section>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="rounded-[24px] bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/10 p-12 flex justify-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
            <Loader2 className="animate-spin text-purple-300" />
          </div>
        )}
        {error && (
          <div className="rounded-[24px] bg-red-500/10 backdrop-blur-xl ring-1 ring-red-400/30 p-4 text-sm text-red-300">
            {(error as Error).message}
          </div>
        )}

        {/* === TOP 3 PODIUM === */}
        {topThree.length > 0 && (
          <section className="mb-5 rounded-[24px] p-4 sm:p-5 bg-gradient-to-br from-slate-800/55 to-slate-900/65 backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="mb-4 flex items-center gap-2">
              <Flame size={14} className="text-amber-300" />
              <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-200">
                {lang === "ar" ? "نجوم الأسبوع" : "Top Speakers"}
              </h2>
            </div>
            <ol className="grid grid-cols-3 gap-2 sm:gap-3 items-end">
              {/* Reorder visually: 2nd, 1st, 3rd — but mark order with semantic value */}
              {orderForPodium(topThree).map((entry) => (
                <PodiumCard
                  key={entry.userId}
                  entry={entry}
                  isMe={entry.userId === user?.id}
                  lang={lang}
                />
              ))}
            </ol>
          </section>
        )}

        {/* === RANKED LIST === */}
        {rest.length > 0 && (
          <section className="rounded-[24px] p-3 sm:p-4 bg-gradient-to-br from-slate-800/55 to-slate-900/65 backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <ul className="space-y-2">
              {rest.map((entry) => {
                const isMe = entry.userId === user?.id;
                return (
                  <li
                    key={entry.userId}
                    className={`flex items-center gap-3 p-3 rounded-2xl backdrop-blur-xl ring-1 transition shadow-[0_4px_18px_-6px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)] ${
                      isMe
                        ? "bg-purple-500/15 ring-purple-300/40"
                        : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="w-8 text-center shrink-0">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10 px-1.5 text-[12px] font-bold text-slate-300 tabular-nums">
                        {entry.rank}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold ring-2 ring-white/10 shadow-[0_8px_18px_-6px_rgba(124,58,237,0.6)] shrink-0">
                      {initials(entry.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-[14px] truncate text-white"
                        dir="auto"
                      >
                        {entry.name}
                        {isMe && (
                          <span className="ms-2 text-[10px] text-purple-300 font-bold uppercase tracking-wide">
                            {lang === "ar" ? "أنت" : "You"}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {lang === "ar" ? "مستوى" : "Lvl"} {entry.level}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-bold text-purple-200 tabular-nums drop-shadow-[0_1px_8px_rgba(168,85,247,0.5)]">
                        {entry.totalXp}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                        XP
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && all.length === 0 && (
          <div className="rounded-[24px] bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/10 p-12 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
            <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-500/20 ring-1 ring-purple-300/25">
              <Trophy size={22} className="text-purple-200" />
            </div>
            <p className="text-[15px] font-bold text-white">
              {lang === "ar" ? "اللوحة فارغة" : "No XP yet"}
            </p>
            <p className="mt-1.5 text-[12.5px] text-slate-400">
              {lang === "ar"
                ? "ابدأ بإرسال أول رسالة وكن أول المتصدرين!"
                : "Send your first message and be the first on the board!"}
            </p>
            <Link
              href="/chat"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_8px_22px_-6px_rgba(124,58,237,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)",
              }}
            >
              {lang === "ar" ? "ابدأ المحادثة" : "Start chatting"}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Reorders [1st, 2nd, 3rd] into visual podium order [2nd, 1st, 3rd].
 * If the top slice doesn't have the canonical 1/2/3 ranks (data oddity),
 * fall back to the original order so no entry is dropped.
 */
function orderForPodium(top: LeaderboardEntry[]): LeaderboardEntry[] {
  const byRank = new Map(top.map((e) => [e.rank, e] as const));
  const hasCanonical = byRank.has(1) && byRank.has(2) && byRank.has(3);
  if (!hasCanonical) return top;
  return [byRank.get(2)!, byRank.get(1)!, byRank.get(3)!];
}

function PodiumCard({
  entry,
  isMe,
  lang,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  lang: "en" | "ar";
}) {
  const isFirst = entry.rank === 1;
  const isSecond = entry.rank === 2;
  const isThird = entry.rank === 3;

  const tile = isFirst
    ? "from-amber-300 via-amber-400 to-orange-500 ring-amber-200/45 text-amber-950 shadow-[0_14px_30px_-8px_rgba(245,158,11,0.65),inset_0_1px_0_rgba(255,255,255,0.4)]"
    : isSecond
      ? "from-slate-200 via-slate-300 to-slate-400 ring-slate-100/40 text-slate-800 shadow-[0_12px_26px_-8px_rgba(148,163,184,0.55),inset_0_1px_0_rgba(255,255,255,0.4)]"
      : "from-orange-300 via-orange-400 to-amber-600 ring-orange-200/40 text-orange-950 shadow-[0_12px_26px_-8px_rgba(249,115,22,0.55),inset_0_1px_0_rgba(255,255,255,0.4)]";

  const heightCls = isFirst ? "pt-0" : isSecond ? "pt-3" : "pt-5";
  const Icon = isFirst ? Crown : isSecond ? Medal : Award;

  return (
    <li
      className={`group relative flex flex-col items-center text-center rounded-2xl ${heightCls} ${
        isMe
          ? "bg-purple-500/10 ring-1 ring-purple-300/40 shadow-[0_8px_24px_-10px_rgba(168,85,247,0.55)] px-1 py-2"
          : ""
      }`}
      aria-label={`Rank ${entry.rank}: ${entry.name}`}
    >
      {/* Crown floats above 1st */}
      {isFirst && (
        <Crown
          size={18}
          className="absolute -top-2 text-amber-300 drop-shadow-[0_2px_6px_rgba(245,158,11,0.7)] animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Avatar tile */}
      <div
        className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${tile} ring-1 ${
          isFirst ? "h-16 w-16 sm:h-20 sm:w-20" : "h-14 w-14 sm:h-16 sm:w-16"
        } ${isMe ? "outline outline-2 outline-offset-2 outline-purple-300/50" : ""}`}
      >
        <span
          className={`font-extrabold ${
            isFirst ? "text-lg sm:text-xl" : "text-base sm:text-lg"
          }`}
        >
          {initials(entry.name)}
        </span>
        {/* Rank chip */}
        <span
          className={`absolute -bottom-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 backdrop-blur ${
            isFirst
              ? "bg-amber-500 text-amber-950 ring-amber-300/60"
              : isSecond
                ? "bg-slate-300 text-slate-800 ring-slate-200/60"
                : "bg-orange-400 text-orange-950 ring-orange-300/60"
          }`}
        >
          <Icon size={9} />#{entry.rank}
        </span>
      </div>

      {/* Name */}
      <div
        className={`mt-3.5 px-1 w-full text-[12px] font-bold truncate ${
          isMe ? "text-purple-200" : "text-white"
        }`}
        dir="auto"
        title={entry.name}
      >
        {entry.name}
        {isMe && (
          <span className="ms-1 text-[9px] text-purple-300 font-bold uppercase tracking-wide">
            {lang === "ar" ? "أنت" : "You"}
          </span>
        )}
      </div>
      <div className="text-[10px] text-slate-400 leading-tight">
        {lang === "ar" ? "مستوى" : "Lvl"} {entry.level}
      </div>
      {/* XP */}
      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 ring-1 ring-white/10">
        <span className="text-[11.5px] font-bold tabular-nums text-purple-200">
          {entry.totalXp}
        </span>
        <span className="text-[9px] text-slate-400 uppercase tracking-wide">
          XP
        </span>
      </div>
    </li>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur-md px-2 py-2 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
      <div className="flex items-center justify-center gap-1 text-purple-100">
        {icon}
        <span className="font-bold text-white tabular-nums">{value}</span>
      </div>
      <p className="text-[10px] uppercase text-purple-200 mt-0.5 tracking-wide">
        {label}
      </p>
    </div>
  );
}
