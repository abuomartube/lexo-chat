import { useState, useCallback } from "react";

const STORAGE_KEY = "lexo-ai-feedback-enabled";

function readPref(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function useAiFeedbackToggle() {
  const [enabled, setEnabled] = useState(readPref);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { aiFeedbackEnabled: enabled, toggleAiFeedback: toggle } as const;
}
