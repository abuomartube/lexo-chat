import { useState, useCallback, useEffect, useRef } from "react";

export interface Phonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: { name: string; url: string };
}

export interface Definition {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  license?: { name: string; url: string };
  sourceUrls?: string[];
}

export interface ProcessedEntry {
  entry: DictionaryEntry | null;
  phonetic: string | null;
  primaryExample: string | null;
  partOfSpeech: string | null;
}

const dataCache = new Map<string, ProcessedEntry>();
const inflight = new Map<string, Promise<ProcessedEntry>>();

const EXAMPLE_OVERRIDES: Record<string, string> = {
  across: "I walked across the street.",
};

function processEntry(
  entry: DictionaryEntry | null,
  word?: string,
): ProcessedEntry {
  const override = word ? EXAMPLE_OVERRIDES[word.toLowerCase()] : undefined;

  if (!entry) {
    return {
      entry: null,
      phonetic: null,
      primaryExample: override ?? null,
      partOfSpeech: null,
    };
  }

  const phonetics = entry.phonetics ?? [];
  const phonetic =
    phonetics.find((p) => p.text)?.text ?? entry.phonetic ?? null;

  const allDefinitions = entry.meanings.flatMap((m) => m.definitions);
  const primaryExample =
    override ?? allDefinitions.find((d) => d.example)?.example ?? null;
  const partOfSpeech = entry.meanings[0]?.partOfSpeech ?? null;

  return { entry, phonetic, primaryExample, partOfSpeech };
}

async function fetchWord(word: string): Promise<ProcessedEntry> {
  if (dataCache.has(word)) return dataCache.get(word)!;
  if (inflight.has(word)) return inflight.get(word)!;

  const promise = (async () => {
    let processed: ProcessedEntry;
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      );
      if (res.ok) {
        const data: DictionaryEntry[] = await res.json();
        processed = processEntry(data[0] ?? null, word);
      } else {
        processed = processEntry(null, word);
      }
    } catch {
      processed = processEntry(null, word);
    }
    dataCache.set(word, processed);
    inflight.delete(word);
    return processed;
  })();

  inflight.set(word, promise);
  return promise;
}

export function prefetchWord(word: string): void {
  void fetchWord(word);
}

export interface DictionaryResult extends ProcessedEntry {
  loading: boolean;
  error: string | null;
}

export function useDictionary() {
  const [result, setResult] = useState<DictionaryResult>({
    entry: null,
    phonetic: null,
    primaryExample: null,
    partOfSpeech: null,
    loading: false,
    error: null,
  });

  const reqRef = useRef(0);

  const lookup = useCallback(async (word: string) => {
    const id = ++reqRef.current;

    if (dataCache.has(word)) {
      const processed = dataCache.get(word)!;
      setResult({
        ...processed,
        loading: false,
        error: processed.entry ? null : "Word not found",
      });
      return;
    }

    setResult((prev) => ({ ...prev, loading: true, error: null }));
    const processed = await fetchWord(word);
    if (id !== reqRef.current) return;
    setResult({
      ...processed,
      loading: false,
      error: processed.entry ? null : "Word not found",
    });
  }, []);

  useEffect(() => {
    return () => {
      reqRef.current++;
    };
  }, []);

  return { ...result, lookup };
}
