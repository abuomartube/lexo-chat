import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const ABANDONED_THRESHOLD_MS = 30 * 60 * 1000;

export function useAbandonedCartSync() {
  const { items, lastActivityAt } = useCart();
  const { isAuthenticated } = useAuth();
  const { lang } = useLanguage();
  const lastSyncRef = useRef(0);
  const itemsRef = useRef(items);
  const lastActivityRef = useRef(lastActivityAt);
  const langRef = useRef(lang);
  const authRef = useRef(isAuthenticated);

  itemsRef.current = items;
  lastActivityRef.current = lastActivityAt;
  langRef.current = lang;
  authRef.current = isAuthenticated;

  useEffect(() => {
    function trySync() {
      if (!authRef.current || itemsRef.current.length === 0 || lastActivityRef.current === 0) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < ABANDONED_THRESHOLD_MS) return;
      if (Date.now() - lastSyncRef.current < SYNC_INTERVAL_MS) return;

      lastSyncRef.current = Date.now();

      const payload = {
        items: itemsRef.current.map((i) => ({ course: i.course, tier: i.tier })),
        lastActivityAt: lastActivityRef.current,
        locale: langRef.current,
      };

      void fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    trySync();

    const id = setInterval(trySync, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, items, lastActivityAt, lang]);
}
