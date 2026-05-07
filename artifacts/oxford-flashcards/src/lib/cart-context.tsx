import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  course: "intro" | "english" | "ielts";
  tier: string;
};

function cartKey(item: CartItem): string {
  return `${item.course}:${item.tier}`;
}

function parseKey(key: string): CartItem | null {
  const [course, tier] = key.split(":");
  if ((course === "intro" || course === "english" || course === "ielts") && tier) {
    return { course, tier };
  }
  return null;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("cart");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((k: string) => parseKey(k)).filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem("cart", JSON.stringify(items.map(cartKey)));
  } catch {}
}

function loadCartTimestamp(): number {
  try {
    const v = localStorage.getItem("cart_activity_at");
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

function saveCartTimestamp(ts: number) {
  try {
    localStorage.setItem("cart_activity_at", String(ts));
  } catch {}
}

function loadReminderDismissed(): number {
  try {
    const v = localStorage.getItem("cart_reminder_dismissed");
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

function saveReminderDismissed(ts: number) {
  try {
    localStorage.setItem("cart_reminder_dismissed", String(ts));
  } catch {}
}

export type ReminderLevel = "none" | "soft" | "strong";

type CartContextValue = {
  items: CartItem[];
  count: number;
  addItem: (item: CartItem) => boolean;
  removeItem: (item: CartItem) => void;
  hasItem: (item: CartItem) => boolean;
  clearCart: () => void;
  lastActivityAt: number;
  reminderLevel: ReminderLevel;
  dismissReminder: () => void;
};

const SOFT_THRESHOLD_MS = 30 * 60 * 1000;
const STRONG_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const TICK_INTERVAL_MS = 60 * 1000;

function computeLevel(
  itemCount: number,
  activityAt: number,
  dismissed: number,
): ReminderLevel {
  if (itemCount === 0 || activityAt === 0) return "none";
  const elapsed = Date.now() - activityAt;
  if (dismissed > activityAt) return "none";
  if (elapsed >= STRONG_THRESHOLD_MS) return "strong";
  if (elapsed >= SOFT_THRESHOLD_MS) return "soft";
  return "none";
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [lastActivityAt, setLastActivityAt] = useState<number>(loadCartTimestamp);
  const [dismissedAt, setDismissedAt] = useState<number>(loadReminderDismissed);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  useEffect(() => {
    if (lastActivityAt > 0) saveCartTimestamp(lastActivityAt);
  }, [lastActivityAt]);

  const touchActivity = useCallback(() => {
    const now = Date.now();
    setLastActivityAt(now);
  }, []);

  const addItem = useCallback((item: CartItem): boolean => {
    let added = false;
    setItems((prev) => {
      const key = cartKey(item);
      if (prev.some((i) => cartKey(i) === key)) return prev;
      added = true;
      return [...prev, item];
    });
    touchActivity();
    return added;
  }, [touchActivity]);

  const removeItem = useCallback((item: CartItem) => {
    const key = cartKey(item);
    setItems((prev) => prev.filter((i) => cartKey(i) !== key));
    touchActivity();
  }, [touchActivity]);

  const hasItem = useCallback(
    (item: CartItem): boolean => {
      const key = cartKey(item);
      return items.some((i) => cartKey(i) === key);
    },
    [items],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setLastActivityAt(0);
    saveCartTimestamp(0);
    setDismissedAt(0);
    saveReminderDismissed(0);
  }, []);

  const reminderLevel: ReminderLevel = useMemo(
    () => computeLevel(items.length, lastActivityAt, dismissedAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length, lastActivityAt, dismissedAt, tick],
  );

  const dismissReminder = useCallback(() => {
    const now = Date.now();
    setDismissedAt(now);
    saveReminderDismissed(now);
  }, []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      addItem,
      removeItem,
      hasItem,
      clearCart,
      lastActivityAt,
      reminderLevel,
      dismissReminder,
    }),
    [items, addItem, removeItem, hasItem, clearCart, lastActivityAt, reminderLevel, dismissReminder],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
