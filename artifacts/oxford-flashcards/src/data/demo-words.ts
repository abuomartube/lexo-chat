import {
  oxfordWordsByLevel,
  type CEFRLevel,
  type OxfordWord,
} from "./oxford-words";

const candidates: Record<CEFRLevel, string[]> = {
  A1: [
    "hello",
    "family",
    "friend",
    "water",
    "house",
    "school",
    "happy",
    "beautiful",
    "music",
    "book",
    "apple",
    "morning",
    "coffee",
    "garden",
    "sister",
    "brother",
    "love",
    "time",
    "food",
    "city",
  ],
  A2: [
    "weekend",
    "kitchen",
    "important",
    "exercise",
    "yesterday",
    "wonderful",
    "interesting",
    "kind",
    "morning",
    "dream",
    "comfortable",
    "delicious",
    "favourite",
    "advice",
    "actually",
    "quickly",
    "honest",
    "energy",
    "midnight",
    "season",
  ],
  B1: [
    "amazing",
    "encourage",
    "achieve",
    "challenge",
    "knowledge",
    "opportunity",
    "decision",
    "develop",
    "successful",
    "imagination",
    "adventure",
    "society",
    "technology",
    "culture",
    "opinion",
    "experience",
    "improve",
    "creative",
    "responsible",
    "powerful",
  ],
  B2: [
    "appreciate",
    "fascinating",
    "sufficient",
    "magnificent",
    "occasionally",
    "perspective",
    "genuine",
    "complicated",
    "remarkable",
    "outstanding",
    "considerable",
    "inevitable",
    "tremendous",
    "effective",
    "ambitious",
    "criticism",
    "convince",
    "dedicate",
    "establish",
    "prosperous",
  ],
};

function pickAvailable(level: CEFRLevel, count: number): string[] {
  const pool = new Set(oxfordWordsByLevel[level]);
  const chosen: string[] = [];
  for (const w of candidates[level]) {
    if (pool.has(w) && !chosen.includes(w)) {
      chosen.push(w);
      if (chosen.length >= count) break;
    }
  }
  // Top up from the front of the level list if we couldn't find enough
  if (chosen.length < count) {
    for (const w of oxfordWordsByLevel[level]) {
      if (!chosen.includes(w)) {
        chosen.push(w);
        if (chosen.length >= count) break;
      }
    }
  }
  return chosen;
}

export const DEMO_WORDS_PER_LEVEL = 10;

export const demoWordsByLevel: Record<CEFRLevel, string[]> = {
  A1: pickAvailable("A1", DEMO_WORDS_PER_LEVEL),
  A2: pickAvailable("A2", DEMO_WORDS_PER_LEVEL),
  B1: pickAvailable("B1", DEMO_WORDS_PER_LEVEL),
  B2: pickAvailable("B2", DEMO_WORDS_PER_LEVEL),
};

export const demoWords: OxfordWord[] = (
  Object.entries(demoWordsByLevel) as [CEFRLevel, string[]][]
).flatMap(([level, words]) => words.map((word) => ({ word, level })));
