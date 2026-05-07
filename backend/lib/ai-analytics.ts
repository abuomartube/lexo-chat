export type AiAction = "correct" | "translate" | "explain";

const counts: Record<AiAction, number> = {
  correct: 0,
  translate: 0,
  explain: 0,
};

export function recordAiAction(action: AiAction): void {
  counts[action]++;
}

export function getAiAnalytics(): Record<AiAction, number> {
  return { ...counts };
}

export const __testing = {
  resetCounts(): void {
    counts.correct = 0;
    counts.translate = 0;
    counts.explain = 0;
  },
};
