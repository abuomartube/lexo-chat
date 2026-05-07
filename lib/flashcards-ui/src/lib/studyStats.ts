import { useCallback, useEffect, useState } from "react";

const STATS_KEY = "lexo.studyStats.v1";
const HISTORY_KEY = "lexo.markHistory.v1";

export type Achievement =
  | "first_word"
  | "ten_mastered"
  | "fifty_mastered"
  | "streak_3"
  | "streak_7"
  | "level_5";

export const ACHIEVEMENT_META: Record<Achievement, { label: string; emoji: string }> = {
  first_word: { label: "First word!", emoji: "✨" },
  ten_mastered: { label: "10 words mastered", emoji: "🏆" },
  fifty_mastered: { label: "50 words mastered", emoji: "💎" },
  streak_3: { label: "3-day streak", emoji: "🔥" },
  streak_7: { label: "7-day streak", emoji: "⚡" },
  level_5: { label: "Level 5 reached", emoji: "🚀" },
};

export interface StudyStats {
  xp: number;
  streakDays: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  achievements: Achievement[];
}

/** Per-card mark history: { [cardId]: { known: n, learning: n } } */
export type MarkHistory = Record<number, { known: number; learning: number }>;

export type Difficulty = "easy" | "medium" | "hard";

const defaults: StudyStats = {
  xp: 0,
  streakDays: 0,
  lastActiveDate: null,
  achievements: [],
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86400000);
}

function readStats(): StudyStats {
  if (typeof window === "undefined") return { ...defaults };
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      achievements: Array.isArray(parsed?.achievements) ? parsed.achievements : [],
    };
  } catch {
    return { ...defaults };
  }
}

function writeStats(s: StudyStats) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function readHistory(): MarkHistory {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeHistory(h: MarkHistory) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* ignore */
  }
}

export function levelForXp(xp: number) {
  // Each level needs 100 XP (1, 2, 3, ...).
  const level = Math.floor(xp / 100) + 1;
  const intoLevel = xp % 100;
  return { level, intoLevel, nextAt: 100 };
}

const statsListeners = new Set<(s: StudyStats) => void>();
const historyListeners = new Set<(h: MarkHistory) => void>();
let statsCache: StudyStats | null = null;
let historyCache: MarkHistory | null = null;

function getStats(): StudyStats {
  if (!statsCache) statsCache = readStats();
  return statsCache;
}
function getHistory(): MarkHistory {
  if (!historyCache) historyCache = readHistory();
  return historyCache;
}

function emitStats() {
  const s = getStats();
  for (const fn of statsListeners) fn(s);
}
function emitHistory() {
  const h = getHistory();
  for (const fn of historyListeners) fn(h);
}

function awardAchievementsLocked(
  stats: StudyStats,
  context: { knownTotal: number; level: number },
  granted: Achievement[],
) {
  const has = (a: Achievement) => stats.achievements.includes(a);
  const grant = (a: Achievement) => {
    if (!has(a)) {
      stats.achievements.push(a);
      granted.push(a);
    }
  };
  if (context.knownTotal >= 1) grant("first_word");
  if (context.knownTotal >= 10) grant("ten_mastered");
  if (context.knownTotal >= 50) grant("fifty_mastered");
  if (stats.streakDays >= 3) grant("streak_3");
  if (stats.streakDays >= 7) grant("streak_7");
  if (context.level >= 5) grant("level_5");
}

export function useStudyStats() {
  const [stats, setStats] = useState<StudyStats>(() => getStats());
  const [history, setHistory] = useState<MarkHistory>(() => getHistory());

  useEffect(() => {
    const s = (m: StudyStats) => setStats({ ...m });
    const h = (m: MarkHistory) => setHistory({ ...m });
    statsListeners.add(s);
    historyListeners.add(h);
    return () => {
      statsListeners.delete(s);
      historyListeners.delete(h);
    };
  }, []);

  /**
   * Records a mark for a card. Returns achievements newly unlocked (for toast).
   */
  const recordMark = useCallback(
    (
      cardId: number,
      kind: "known" | "learning",
      knownTotalAfter: number,
    ): Achievement[] => {
      // Update history
      const h = { ...getHistory() };
      const cur = h[cardId] ?? { known: 0, learning: 0 };
      h[cardId] = {
        known: cur.known + (kind === "known" ? 1 : 0),
        learning: cur.learning + (kind === "learning" ? 1 : 0),
      };
      historyCache = h;
      writeHistory(h);
      emitHistory();

      // Update stats: XP, streak
      const s: StudyStats = { ...getStats(), achievements: [...getStats().achievements] };
      if (kind === "known") s.xp += 10;
      else s.xp += 2;

      const today = todayStr();
      if (s.lastActiveDate !== today) {
        if (s.lastActiveDate) {
          const diff = dayDiff(s.lastActiveDate, today);
          if (diff === 1) s.streakDays += 1;
          else if (diff > 1) s.streakDays = 1;
        } else {
          s.streakDays = 1;
        }
        s.lastActiveDate = today;
      } else if (s.streakDays === 0) {
        s.streakDays = 1;
      }

      const granted: Achievement[] = [];
      const { level } = levelForXp(s.xp);
      awardAchievementsLocked(s, { knownTotal: knownTotalAfter, level }, granted);

      statsCache = s;
      writeStats(s);
      emitStats();
      return granted;
    },
    [],
  );

  const getDifficulty = useCallback(
    (cardId: number): Difficulty => {
      const r = history[cardId];
      if (!r) return "medium";
      if (r.known >= 2 && r.known > r.learning) return "easy";
      if (r.learning >= 2 && r.learning >= r.known) return "hard";
      return "medium";
    },
    [history],
  );

  return { stats, history, recordMark, getDifficulty };
}
