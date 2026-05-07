import { useState, useCallback } from "react";

const translationCache = new Map<string, string>();

export function useTranslation() {
  const [translations, setTranslations] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const translate = useCallback(async (text: string): Promise<string> => {
    const key = text.toLowerCase().trim();

    if (translationCache.has(key)) {
      const cached = translationCache.get(key)!;
      setTranslations((prev) => new Map(prev).set(key, cached));
      return cached;
    }

    setLoading((prev) => new Set(prev).add(key));

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Translation API error");
      const data = await res.json();
      const translated: string = data?.responseData?.translatedText ?? text;

      translationCache.set(key, translated);
      setTranslations((prev) => new Map(prev).set(key, translated));
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return translated;
    } catch {
      const fallback = text;
      translationCache.set(key, fallback);
      setTranslations((prev) => new Map(prev).set(key, fallback));
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return fallback;
    }
  }, []);

  const getTranslation = useCallback(
    (text: string) => translations.get(text.toLowerCase().trim()) ?? null,
    [translations],
  );

  const isLoading = useCallback(
    (text: string) => loading.has(text.toLowerCase().trim()),
    [loading],
  );

  return { translate, getTranslation, isLoading };
}
