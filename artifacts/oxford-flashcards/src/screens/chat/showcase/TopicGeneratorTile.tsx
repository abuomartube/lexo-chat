import { Sparkles, RefreshCw, Lightbulb, Heart, Share2 } from "lucide-react";
import {
  Header,
  Card,
  PrimaryButton,
  SecondaryButton,
  BottomNav,
  ChatScrollBg,
} from "@/components/chat-ui";
import { TOPICS, ICE_BREAKERS } from "@/data/chat";

export function TopicGeneratorTile() {
  const topic = TOPICS[0];
  return (
    <>
      <Header
        title="مولّد المواضيع"
        subtitle={
          <span className="text-[10px] text-slate-400">
            احصل على موضوع جديد لكسر الجمود
          </span>
        }
      />
      <ChatScrollBg className="px-4 pt-4 pb-3 space-y-3">
        <div
          className="relative overflow-hidden rounded-3xl ring-1 ring-white/15 p-5 text-center"
          style={{
            background:
              "linear-gradient(135deg, #6d28d9 0%, #7c3aed 35%, #a855f7 70%, #ec4899 100%)",
            boxShadow:
              "0 24px 60px -12px rgba(124,58,237,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur ring-1 ring-white/30 text-white text-[10px] font-bold">
              <Sparkles size={11} /> Topic of the moment
            </span>
            <h2 className="mt-3 text-[22px] font-extrabold text-white leading-tight">
              {topic}
            </h2>
            <p className="mt-1.5 text-[12px] text-white/85 leading-snug">
              Talk about your favorite cuisines, family recipes, and the best
              meal you've ever had.
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/25 text-white text-[9.5px] font-semibold">
                Beginner+
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/25 text-white text-[9.5px] font-semibold">
                ~5 min
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/25 ring-1 ring-emerald-200/40 text-white text-[9.5px] font-bold">
                234 learners today
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SecondaryButton
            size="lg"
            icon={<Heart size={14} />}
            className="flex-1"
          >
            احفظ
          </SecondaryButton>
          <SecondaryButton
            size="lg"
            icon={<Share2 size={14} />}
            className="flex-1"
          >
            شارك
          </SecondaryButton>
          <PrimaryButton
            size="lg"
            icon={<RefreshCw size={14} />}
            className="flex-1"
          >
            موضوع جديد
          </PrimaryButton>
        </div>

        <Card title="Ice Breakers" icon={<Lightbulb size={13} />}>
          <ul className="space-y-1.5">
            {ICE_BREAKERS.slice(0, 3).map((q, i) => (
              <li
                key={i}
                className="text-[11.5px] text-slate-300 leading-snug flex gap-2"
              >
                <span className="text-purple-400 font-bold">·</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Card>
      </ChatScrollBg>
      <BottomNav active="chat" />
    </>
  );
}
