import { motion, AnimatePresence } from "framer-motion";
import { ACHIEVEMENT_META, type Achievement } from "./lib/studyStats";

interface Props {
  achievements: Achievement[];
}

export function AchievementToast({ achievements }: Props) {
  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {achievements.map((a) => {
          const meta = ACHIEVEMENT_META[a];
          return (
            <motion.div
              key={a}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl glass-card-premium border border-violet-400/30 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)]"
            >
              <span className="text-2xl leading-none">{meta.emoji}</span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-violet-300/80">
                  Achievement
                </span>
                <span className="text-sm font-semibold text-white">{meta.label}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
