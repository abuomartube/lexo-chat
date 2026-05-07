import {
  Mic,
  MessageSquare,
  Headphones,
  Sparkles,
  Trophy,
  User,
  Settings as SettingsIcon,
  GraduationCap,
  Lightbulb,
  Globe,
  ShieldCheck,
  Layers,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Heart,
  Check,
  Apple,
  Play,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";
import type { ReactNode } from "react";
import { MiniPhone, MINI_W } from "@/components/chat-ui";
import {
  CourseSelectionTile,
  RoomSelectionTile,
  RoomDetailsTile,
  ChatScreenTile,
  VoiceOnlyTile,
  TopicGeneratorTile,
  ProfileTile,
  LeaderboardTile,
  SettingsTile,
} from "@/screens/chat/showcase";

const FEATURES = [
  { icon: <MessageSquare size={14} />, label: "Themed text rooms" },
  { icon: <Mic size={14} />, label: "Voice notes & recording" },
  { icon: <Headphones size={14} />, label: "Voice-only live audio" },
  { icon: <Sparkles size={14} />, label: "AI topic generator" },
  { icon: <Lightbulb size={14} />, label: "Ice breakers" },
  { icon: <Globe size={14} />, label: "English-only nudge" },
  { icon: <ShieldCheck size={14} />, label: "Admin moderation" },
  { icon: <Trophy size={14} />, label: "XP leaderboard" },
  { icon: <User size={14} />, label: "User profiles & DMs" },
];

type Tile = {
  label: string;
  badge?: string;
  icon: ReactNode;
  body: ReactNode;
  dir?: "ltr" | "rtl";
  glow: string;
};

const TOP_ROW: Tile[] = [
  {
    label: "Course Selection",
    badge: "Entry",
    icon: <GraduationCap size={12} />,
    body: <CourseSelectionTile />,
    glow: "rgba(96,165,250,0.55)",
  },
  {
    label: "Room Selection",
    badge: "Browse",
    icon: <MessageSquare size={12} />,
    body: <RoomSelectionTile />,
    glow: "rgba(168,85,247,0.55)",
  },
  {
    label: "Room Details",
    badge: "Preview",
    icon: <Layers size={12} />,
    body: <RoomDetailsTile />,
    glow: "rgba(236,72,153,0.55)",
  },
  {
    label: "Chat Screen",
    badge: "Live",
    icon: <Mic size={12} />,
    body: <ChatScreenTile />,
    dir: "ltr",
    glow: "rgba(34,211,238,0.55)",
  },
];

const BOTTOM_ROW: Tile[] = [
  {
    label: "Voice Room",
    badge: "Audio",
    icon: <Headphones size={12} />,
    body: <VoiceOnlyTile />,
    glow: "rgba(124,58,237,0.6)",
  },
  {
    label: "Topic Generator",
    badge: "Feature",
    icon: <Sparkles size={12} />,
    body: <TopicGeneratorTile />,
    glow: "rgba(244,114,182,0.55)",
  },
  {
    label: "Profile",
    badge: "Account",
    icon: <User size={12} />,
    body: <ProfileTile />,
    glow: "rgba(99,102,241,0.55)",
  },
  {
    label: "Leaderboard",
    badge: "XP",
    icon: <Trophy size={12} />,
    body: <LeaderboardTile />,
    glow: "rgba(251,191,36,0.55)",
  },
  {
    label: "Settings",
    badge: "Account",
    icon: <SettingsIcon size={12} />,
    body: <SettingsTile />,
    glow: "rgba(148,163,184,0.45)",
  },
];

function FlowArrow() {
  return (
    <div className="flex flex-col items-center justify-center self-center px-1 select-none">
      <svg
        width="42"
        height="14"
        viewBox="0 0 42 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-purple-300"
      >
        <path
          d="M1 7 L34 7"
          stroke="url(#arrowGrad)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <path
          d="M30 2 L40 7 L30 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <defs>
          <linearGradient id="arrowGrad" x1="0" y1="0" x2="42" y2="0">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  return (
    <div className="flex flex-col items-center" style={{ width: MINI_W }}>
      <div className="flex items-center justify-center gap-1.5 mb-3 h-5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 ring-1 ring-white/10 backdrop-blur text-[10px] font-bold text-slate-300 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.6)] leading-none">
          {tile.icon}
          {tile.badge}
        </span>
      </div>

      {/* phone with halo + drop shadow + floor reflection */}
      <div className="relative" style={{ width: MINI_W }}>
        {/* colored halo behind the phone */}
        <div
          aria-hidden
          className="absolute -inset-10 rounded-[60px] blur-[60px] opacity-90 pointer-events-none"
          style={{ background: tile.glow }}
        />
        {/* secondary tighter halo */}
        <div
          aria-hidden
          className="absolute -inset-4 rounded-[44px] blur-2xl opacity-70 pointer-events-none"
          style={{ background: tile.glow }}
        />
        {/* top rim light */}
        <div
          aria-hidden
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-[80%] h-3 rounded-full blur-md opacity-80 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
          }}
        />
        {/* the phone itself, with a heavy drop shadow */}
        <div
          className="relative"
          style={{
            filter:
              "drop-shadow(0 30px 40px rgba(0,0,0,0.7)) drop-shadow(0 60px 80px rgba(0,0,0,0.55))",
          }}
        >
          <MiniPhone dir={tile.dir ?? "rtl"}>{tile.body}</MiniPhone>
        </div>
        {/* floor reflection ellipse beneath the phone */}
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-[80%] h-6 rounded-[50%] blur-xl opacity-80 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 70%)",
          }}
        />
      </div>

      <div className="mt-8 text-center h-5 flex items-center justify-center">
        <div className="text-[12.5px] font-bold text-white tracking-tight leading-none">
          {tile.label}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3.5 mb-8">
      <div
        className="text-[40px] leading-none font-black tracking-tighter bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #a855f7 0%, #ec4899 60%, #f97316 100%)",
        }}
      >
        {number}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[18px] font-extrabold text-white tracking-tight leading-none">
          {title}
        </div>
        <div className="text-[12.5px] text-slate-400 leading-none">{desc}</div>
      </div>
    </div>
  );
}

export default function ChatShowcase() {
  return (
    <div
      dir="ltr"
      className="min-h-screen w-full text-white relative overflow-x-auto"
      style={{
        background:
          "radial-gradient(ellipse 1200px 600px at 50% -10%, rgba(168,85,247,0.28), transparent 70%), radial-gradient(ellipse at top left, rgba(124,58,237,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(37,99,235,0.20), transparent 55%), linear-gradient(180deg, #0a0a1f 0%, #050816 50%, #02030a 100%)",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* overhead spotlight — bright from the top, fading down */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,255,0.10) 0%, rgba(168,85,247,0.08) 30%, transparent 70%)",
        }}
      />
      {/* secondary side rim lights */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[140px] opacity-60"
        style={{ background: "rgba(124,58,237,0.45)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[40%] right-[10%] w-[700px] h-[700px] rounded-full blur-[160px] opacity-50"
        style={{ background: "rgba(236,72,153,0.35)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[5%] left-[40%] w-[800px] h-[500px] rounded-full blur-[180px] opacity-50"
        style={{ background: "rgba(59,130,246,0.30)" }}
      />

      {/* SVG noise/texture overlay */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.07] mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="showcase-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#showcase-noise)" />
      </svg>

      {/* dotted canvas grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 100% 80% at 50% 30%, black 30%, transparent 90%)",
        }}
      />

      <div className="relative flex min-w-[1520px]">
        {/* SIDEBAR */}
        <aside className="w-[300px] shrink-0 border-r border-white/10 bg-slate-950/40 backdrop-blur-md p-7 flex flex-col gap-7 sticky top-0 self-start min-h-screen">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center ring-1 ring-white/20"
                style={{
                  background:
                    "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
                  boxShadow:
                    "0 10px 30px -8px rgba(124,58,237,0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                <MessageSquare size={18} className="text-white" />
              </div>
              <div>
                <div
                  className="text-[24px] font-black tracking-tight bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #ffffff 0%, #c4b5fd 60%, #f9a8d4 100%)",
                  }}
                >
                  LEXO
                </div>
                <div className="text-[10px] font-semibold text-slate-400 -mt-0.5 tracking-wider">
                  CHAT · PHASE 1
                </div>
              </div>
            </div>

            <p className="mt-5 text-[13px] text-slate-300 leading-relaxed">
              Speak English with confidence. Practice in themed rooms with
              learners around the world — text, voice notes, and live audio.
            </p>
          </div>

          <div>
            <div className="text-[10.5px] font-bold tracking-wider text-slate-500 mb-3">
              FEATURES
            </div>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-2.5 text-[12.5px] text-slate-200"
                >
                  <span className="w-7 h-7 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-purple-300">
                    {f.icon}
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v0.1.0 · interactive preview
            </div>
            <div className="mt-1 text-[10.5px] text-slate-500">
              9 screens · 5 rooms · 10 personas
            </div>
          </div>
        </aside>

        {/* MAIN CANVAS */}
        <main className="flex-1 min-w-0">
          {/* TOP NAV BAR */}
          <nav className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/60 border-b border-white/5">
            <div className="px-14 h-14 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-6 text-[12.5px] font-semibold text-slate-300">
                  <a className="hover:text-white transition cursor-pointer flex items-center gap-1.5">
                    Product
                  </a>
                  <a className="hover:text-white transition cursor-pointer">
                    Features
                  </a>
                  <a className="hover:text-white transition cursor-pointer">
                    Pricing
                  </a>
                  <a className="hover:text-white transition cursor-pointer">
                    Roadmap
                  </a>
                  <a className="hover:text-white transition cursor-pointer">
                    Changelog
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-[12.5px] font-semibold text-slate-300 hover:text-white transition">
                  Sign in
                </button>
                <button
                  className="text-[12.5px] font-bold text-white px-3.5 h-8 rounded-lg ring-1 ring-white/15 flex items-center gap-1.5 shadow-[0_4px_14px_-2px_rgba(168,85,247,0.5)] hover:shadow-[0_6px_20px_-2px_rgba(168,85,247,0.7)] transition-all"
                  style={{
                    background:
                      "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                  }}
                >
                  Get early access
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </nav>

          <div className="px-14 py-14">
            {/* HERO */}
            <div className="mb-12">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 ring-1 ring-purple-500/30 text-purple-200 text-[10.5px] font-bold tracking-wide leading-none">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-400" />
                </span>
                NOW IN PRIVATE BETA · v0.1
              </span>
              <h1 className="mt-5 text-[56px] font-black text-white tracking-tighter leading-[1.02] max-w-[780px]">
                The English chat app{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)",
                  }}
                >
                  that actually makes you fluent.
                </span>
              </h1>
              <p className="mt-5 text-[16px] text-slate-300 max-w-[640px] leading-relaxed">
                Practice real conversations in themed rooms with learners around
                the world. Voice notes, AI topics, ice breakers, and an XP
                leaderboard — built for the 73% of learners who never get to
                speak.
              </p>

              {/* CTA row */}
              <div className="mt-7 flex items-center gap-3">
                <button
                  className="text-[13.5px] font-bold text-white px-5 h-11 rounded-xl ring-1 ring-white/15 flex items-center gap-2 shadow-[0_10px_30px_-6px_rgba(168,85,247,0.6)] hover:shadow-[0_14px_40px_-6px_rgba(168,85,247,0.8)] hover:-translate-y-0.5 transition-all"
                  style={{
                    background:
                      "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                  }}
                >
                  Get early access
                  <ArrowRight size={15} />
                </button>
                <button className="text-[13.5px] font-bold text-white px-5 h-11 rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition flex items-center gap-2">
                  <Play size={13} className="fill-white" />
                  Watch demo · 90s
                </button>
              </div>

              {/* Trust strip */}
              <div className="mt-10 flex items-center gap-6 text-[12px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[
                      "linear-gradient(135deg,#f472b6,#a855f7)",
                      "linear-gradient(135deg,#60a5fa,#818cf8)",
                      "linear-gradient(135deg,#fbbf24,#f97316)",
                      "linear-gradient(135deg,#34d399,#0ea5e9)",
                      "linear-gradient(135deg,#f87171,#ec4899)",
                    ].map((g, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full ring-2 ring-slate-950"
                        style={{ background: g }}
                      />
                    ))}
                  </div>
                  <span>
                    <span className="font-bold text-white">
                      12,400+ learners
                    </span>{" "}
                    on the waitlist
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} size={12} className="fill-amber-400" />
                    ))}
                  </div>
                  <span>
                    <span className="font-bold text-white">4.9</span> from 870
                    beta reviews
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe size={13} className="text-cyan-400" />
                  <span>
                    <span className="font-bold text-white">52</span> countries
                  </span>
                </div>
              </div>
            </div>

            {/* METRICS STRIP */}
            <div className="mb-16 grid grid-cols-4 gap-px rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5 backdrop-blur">
              {[
                {
                  value: "12.4K",
                  label: "Active learners",
                  grad: "from-purple-400 to-fuchsia-400",
                },
                {
                  value: "186K",
                  label: "Messages this week",
                  grad: "from-cyan-400 to-blue-400",
                },
                {
                  value: "4.2M",
                  label: "XP earned by community",
                  grad: "from-amber-400 to-orange-400",
                },
                {
                  value: "98.3%",
                  label: "Stay English uptime",
                  grad: "from-emerald-400 to-teal-400",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-slate-950/60 backdrop-blur px-6 py-5"
                >
                  <div
                    className={`text-[28px] font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br ${s.grad} leading-none`}
                  >
                    {s.value}
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-slate-400 font-medium">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* VALUE PROPS */}
            <div className="mb-20 grid grid-cols-3 gap-4">
              {[
                {
                  icon: <Zap size={16} className="text-amber-300" />,
                  color: "rgba(251,191,36,0.4)",
                  title: "Speak in 30 seconds",
                  desc: "Pick a course, drop into a themed room, hear real voices instantly. No matchmaking queue.",
                },
                {
                  icon: <Shield size={16} className="text-emerald-300" />,
                  color: "rgba(52,211,153,0.4)",
                  title: "English-only, enforced",
                  desc: "AI nudges anyone who switches languages. Mods can mute, ban, or kick — kept clean by default.",
                },
                {
                  icon: <Heart size={16} className="text-rose-300" />,
                  color: "rgba(244,114,182,0.4)",
                  title: "Designed to keep you coming back",
                  desc: "Streaks, XP, leaderboards, and ice breakers built in. Learners return 4.7× more than Anki.",
                },
              ].map((v) => (
                <div
                  key={v.title}
                  className="relative rounded-2xl p-5 ring-1 ring-white/10 bg-white/[0.03] backdrop-blur hover:bg-white/[0.05] transition group overflow-hidden"
                >
                  <div
                    aria-hidden
                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition"
                    style={{ background: v.color }}
                  />
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-3">
                      {v.icon}
                    </div>
                    <div className="text-[14px] font-extrabold text-white tracking-tight mb-1.5">
                      {v.title}
                    </div>
                    <div className="text-[12.5px] text-slate-400 leading-relaxed">
                      {v.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* TOP ROW — User Journey */}
            <SectionHeading
              number="01"
              title="User Journey"
              desc="From course → room → live conversation."
            />
            <div className="flex items-start justify-center gap-1 mb-28">
              {TOP_ROW.map((tile, i) => (
                <div key={tile.label} className="flex items-stretch">
                  <TileCard tile={tile} />
                  {i < TOP_ROW.length - 1 && <FlowArrow />}
                </div>
              ))}
            </div>

            {/* BOTTOM ROW — Features */}
            <SectionHeading
              number="02"
              title="Features"
              desc="Everything that makes the room feel alive."
            />
            <div className="flex items-start justify-center gap-6 mb-20">
              {BOTTOM_ROW.map((tile) => (
                <TileCard key={tile.label} tile={tile} />
              ))}
            </div>

            {/* TESTIMONIAL */}
            <div className="mt-20 mb-20">
              <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur p-10">
                <div
                  aria-hidden
                  className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-40"
                  style={{ background: "rgba(168,85,247,0.5)" }}
                />
                <div
                  aria-hidden
                  className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-40"
                  style={{ background: "rgba(236,72,153,0.45)" }}
                />
                <div className="relative max-w-[820px]">
                  <div className="text-[8rem] leading-none font-black text-white/[0.06] absolute -top-8 -left-2 select-none">
                    &ldquo;
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400 mb-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} size={14} className="fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-[22px] font-medium text-white tracking-tight leading-snug">
                    &ldquo;I tried Cambly, Tandem, italki — none of them stuck.
                    LEXO is the first app where I actually{" "}
                    <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent font-bold">
                      look forward to opening it
                    </span>
                    . Voice notes feel like WhatsApp with my friends, not a
                    classroom.&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full ring-2 ring-white/20 flex items-center justify-center text-white font-extrabold text-[15px]"
                      style={{
                        background:
                          "linear-gradient(135deg, #f472b6 0%, #a855f7 100%)",
                      }}
                    >
                      L
                    </div>
                    <div>
                      <div className="text-[13.5px] font-bold text-white">
                        Layla H.
                      </div>
                      <div className="text-[11.5px] text-slate-400">
                        IELTS candidate · Riyadh, Saudi Arabia · Beta user since
                        March
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-emerald-300 font-bold">
                        ↑ Band 6.5 → 7.5 in 8 weeks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PRICING / CTA */}
            <div className="mb-20 grid grid-cols-3 gap-4">
              {[
                {
                  name: "Free",
                  price: "$0",
                  tag: "Start chatting today",
                  features: [
                    "Join 5 themed rooms",
                    "Send 50 voice notes / day",
                    "Daily AI topics",
                    "Basic leaderboard",
                  ],
                  cta: "Start free",
                  highlight: false,
                },
                {
                  name: "Pro",
                  price: "$8",
                  tag: "Most popular · 14-day trial",
                  features: [
                    "Unlimited rooms & DMs",
                    "Unlimited voice notes",
                    "Advanced AI topic packs",
                    "Pronunciation feedback",
                    "Priority moderation",
                    "Custom ice breakers",
                  ],
                  cta: "Start Pro trial",
                  highlight: true,
                },
                {
                  name: "Schools",
                  price: "Custom",
                  tag: "Teachers & cohorts",
                  features: [
                    "Private rooms for your class",
                    "Teacher dashboard & analytics",
                    "Bulk seats with SSO",
                    "Curriculum alignment",
                  ],
                  cta: "Talk to sales",
                  highlight: false,
                },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`relative rounded-2xl p-6 ring-1 backdrop-blur transition ${
                    p.highlight
                      ? "ring-purple-400/40 bg-gradient-to-b from-purple-500/[0.12] to-pink-500/[0.05]"
                      : "ring-white/10 bg-white/[0.03]"
                  }`}
                >
                  {p.highlight && (
                    <>
                      <div
                        aria-hidden
                        className="absolute -inset-0.5 rounded-2xl blur opacity-60 -z-10"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(168,85,247,0.5), rgba(236,72,153,0.4))",
                        }}
                      />
                      <span className="absolute -top-2.5 left-6 text-[9.5px] font-extrabold tracking-wider text-white px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                        RECOMMENDED
                      </span>
                    </>
                  )}
                  <div className="text-[13px] font-bold text-slate-300">
                    {p.name}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-[36px] font-black text-white tracking-tighter leading-none">
                      {p.price}
                    </span>
                    {p.price.startsWith("$") && p.price !== "$0" && (
                      <span className="text-[12px] text-slate-400 font-medium">
                        /month
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11.5px] text-slate-400">
                    {p.tag}
                  </div>
                  <ul className="mt-5 space-y-2">
                    {p.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[12.5px] text-slate-300"
                      >
                        <Check
                          size={13}
                          className={`mt-0.5 shrink-0 ${
                            p.highlight ? "text-purple-300" : "text-emerald-400"
                          }`}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`mt-6 w-full h-10 rounded-xl text-[13px] font-bold transition flex items-center justify-center gap-1.5 ${
                      p.highlight
                        ? "text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.6)] hover:shadow-[0_12px_32px_-6px_rgba(168,85,247,0.8)]"
                        : "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10"
                    }`}
                    style={
                      p.highlight
                        ? {
                            background:
                              "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                          }
                        : undefined
                    }
                  >
                    {p.cta}
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* WAITLIST CTA */}
            <div className="mt-12 mb-16 relative rounded-3xl overflow-hidden ring-1 ring-white/15 p-12 text-center">
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(168,85,247,0.35) 0%, rgba(236,72,153,0.18) 40%, rgba(15,23,42,0.95) 100%)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0 -z-10 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  maskImage:
                    "radial-gradient(ellipse 60% 80% at 50% 50%, black 30%, transparent 70%)",
                }}
              />
              <h2 className="text-[36px] font-black text-white tracking-tighter leading-[1.05] max-w-[640px] mx-auto">
                Stop studying English.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)",
                  }}
                >
                  Start speaking it.
                </span>
              </h2>
              <p className="mt-3 text-[14.5px] text-slate-300 max-w-[520px] mx-auto leading-relaxed">
                Join 12,400 learners on the waitlist. Get early access this
                quarter, lock in 50% off Pro for life.
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="mt-7 flex items-center justify-center gap-2 max-w-[460px] mx-auto"
              >
                <input
                  type="email"
                  placeholder="you@email.com"
                  className="flex-1 h-11 rounded-xl px-4 bg-slate-950/60 ring-1 ring-white/15 text-[13.5px] text-white placeholder-slate-500 focus:ring-purple-400/60 focus:outline-none transition"
                />
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl text-[13.5px] font-bold text-white ring-1 ring-white/15 flex items-center gap-1.5 shadow-[0_10px_30px_-6px_rgba(168,85,247,0.7)] hover:shadow-[0_14px_40px_-6px_rgba(168,85,247,0.9)] transition"
                  style={{
                    background:
                      "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                  }}
                >
                  Join waitlist
                  <ArrowRight size={14} />
                </button>
              </form>
              <div className="mt-4 text-[11.5px] text-slate-400 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Check size={11} className="text-emerald-400" />
                  No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={11} className="text-emerald-400" />
                  Free forever tier
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={11} className="text-emerald-400" />
                  Cancel anytime
                </span>
              </div>
              <div className="mt-7 flex items-center justify-center gap-3">
                <button className="h-10 px-4 rounded-xl bg-black ring-1 ring-white/15 text-white text-[12px] font-bold flex items-center gap-2 hover:bg-black/80 transition">
                  <Apple size={16} />
                  <div className="text-left leading-tight">
                    <div className="text-[8.5px] font-medium opacity-80">
                      Download on the
                    </div>
                    <div className="text-[12px] font-extrabold">App Store</div>
                  </div>
                </button>
                <button className="h-10 px-4 rounded-xl bg-black ring-1 ring-white/15 text-white text-[12px] font-bold flex items-center gap-2 hover:bg-black/80 transition">
                  <Play size={14} className="fill-white" />
                  <div className="text-left leading-tight">
                    <div className="text-[8.5px] font-medium opacity-80">
                      Get it on
                    </div>
                    <div className="text-[12px] font-extrabold">
                      Google Play
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* FOOTER */}
            <footer className="border-t border-white/10 pt-10 pb-8">
              <div className="grid grid-cols-5 gap-8 mb-10">
                <div className="col-span-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center ring-1 ring-white/20"
                      style={{
                        background:
                          "linear-gradient(135deg, #60a5fa 0%, #818cf8 35%, #a855f7 100%)",
                      }}
                    >
                      <MessageSquare size={15} className="text-white" />
                    </div>
                    <div className="text-[18px] font-black tracking-tight text-white">
                      LEXO
                    </div>
                  </div>
                  <p className="mt-4 text-[12.5px] text-slate-400 leading-relaxed max-w-[280px]">
                    The English chat app that actually makes you fluent. Built
                    in Riyadh, used worldwide.
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    {[Twitter, Linkedin, Github].map((Icon, i) => (
                      <a
                        key={i}
                        className="w-8 h-8 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      >
                        <Icon size={14} />
                      </a>
                    ))}
                  </div>
                </div>
                {[
                  {
                    title: "Product",
                    links: [
                      "Features",
                      "Voice rooms",
                      "AI topics",
                      "Leaderboard",
                      "Roadmap",
                    ],
                  },
                  {
                    title: "Company",
                    links: ["About", "Blog", "Careers", "Press kit", "Contact"],
                  },
                  {
                    title: "Resources",
                    links: [
                      "Help center",
                      "Community",
                      "API docs",
                      "Status",
                      "Privacy",
                    ],
                  },
                ].map((col) => (
                  <div key={col.title}>
                    <div className="text-[11px] font-bold tracking-wider text-slate-500 mb-4">
                      {col.title.toUpperCase()}
                    </div>
                    <ul className="space-y-2.5">
                      {col.links.map((l) => (
                        <li
                          key={l}
                          className="text-[12.5px] text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-6 flex items-center justify-between text-[11.5px] text-slate-500">
                <div>
                  © 2026 LEXO Labs · Built with care in Riyadh & San Francisco
                </div>
                <div className="flex items-center gap-5">
                  <span>Terms</span>
                  <span>Privacy</span>
                  <span>Cookies</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    All systems normal
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
