import crypto from "node:crypto";
import {
  getTamaraConfig,
  type ProviderMode,
  type TamaraConfig,
} from "./config";

export interface TamaraBuyer {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface TamaraCreateOrderInput {
  amountMinor: number;
  currency: string;
  course: string;
  tier: string;
  description: string;
  buyer: TamaraBuyer;
  orderReferenceId: string;
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  notificationUrl: string;
  language?: "en" | "ar";
  countryCode?: string;
}

export interface TamaraCreatedOrder {
  orderId: string;
  checkoutId: string | null;
  checkoutUrl: string | null;
  status: string;
  raw: unknown;
}

export interface TamaraRetrievedOrder {
  orderId: string;
  status: string;
  paymentStatus: string;
  raw: unknown;
}

function minorToMajor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

async function tamaraFetch(
  cfg: TamaraConfig,
  path: string,
  init: RequestInit,
): Promise<unknown> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${cfg.merchantToken}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${cfg.apiBase}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(
      `Tamara ${init.method ?? "GET"} ${path} failed (${res.status})`,
    ) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export async function createTamaraCheckoutOrder(
  input: TamaraCreateOrderInput,
): Promise<TamaraCreatedOrder> {
  const cfg = getTamaraConfig();
  const totalAmount = {
    amount: minorToMajor(input.amountMinor),
    currency: input.currency,
  };
  const body = {
    order_reference_id: input.orderReferenceId,
    total_amount: totalAmount,
    description: input.description,
    country_code: input.countryCode ?? "SA",
    payment_type: "PAY_BY_INSTALMENTS",
    locale: input.language === "ar" ? "ar_SA" : "en_US",
    items: [
      {
        reference_id: `${input.course}:${input.tier}`,
        type: "Digital",
        name: input.description,
        sku: `${input.course}-${input.tier}`,
        quantity: 1,
        unit_price: totalAmount,
        total_amount: totalAmount,
        tax_amount: { amount: "0.00", currency: input.currency },
        discount_amount: { amount: "0.00", currency: input.currency },
      },
    ],
    consumer: {
      first_name: input.buyer.firstName,
      last_name: input.buyer.lastName || input.buyer.firstName,
      phone_number: input.buyer.phone,
      email: input.buyer.email,
    },
    billing_address: {
      first_name: input.buyer.firstName,
      last_name: input.buyer.lastName || input.buyer.firstName,
      line1: "Online course",
      city: "Riyadh",
      country_code: input.countryCode ?? "SA",
      phone_number: input.buyer.phone,
    },
    shipping_address: {
      first_name: input.buyer.firstName,
      last_name: input.buyer.lastName || input.buyer.firstName,
      line1: "Online course",
      city: "Riyadh",
      country_code: input.countryCode ?? "SA",
      phone_number: input.buyer.phone,
    },
    tax_amount: { amount: "0.00", currency: input.currency },
    shipping_amount: { amount: "0.00", currency: input.currency },
    discount: {
      name: "",
      amount: { amount: "0.00", currency: input.currency },
    },
    merchant_url: {
      success: input.successUrl,
      failure: input.failureUrl,
      cancel: input.cancelUrl,
      notification: input.notificationUrl,
    },
  };
  const raw = (await tamaraFetch(cfg, "/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  })) as Record<string, unknown>;
  return {
    orderId: String(raw["order_id"] ?? ""),
    checkoutId: (raw["checkout_id"] as string | undefined) ?? null,
    checkoutUrl: (raw["checkout_url"] as string | undefined) ?? null,
    status: String(raw["status"] ?? ""),
    raw,
  };
}

export async function retrieveTamaraOrder(
  orderId: string,
  mode?: ProviderMode,
): Promise<TamaraRetrievedOrder> {
  const cfg = getTamaraConfig(mode);
  const raw = (await tamaraFetch(
    cfg,
    `/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" },
  )) as Record<string, unknown>;
  return {
    orderId: String(raw["order_id"] ?? ""),
    status: String(raw["status"] ?? ""),
    paymentStatus: String(raw["payment_status"] ?? raw["status"] ?? ""),
    raw,
  };
}

export async function authorizeTamaraOrder(
  orderId: string,
  mode?: ProviderMode,
): Promise<unknown> {
  const cfg = getTamaraConfig(mode);
  return tamaraFetch(cfg, `/orders/${encodeURIComponent(orderId)}/authorise`, {
    method: "POST",
    body: "{}",
  });
}

export async function captureTamaraOrder(input: {
  orderId: string;
  amountMinor: number;
  currency: string;
  mode?: ProviderMode;
}): Promise<unknown> {
  const cfg = getTamaraConfig(input.mode);
  const total = {
    amount: minorToMajor(input.amountMinor),
    currency: input.currency,
  };
  return tamaraFetch(cfg, `/payments/capture`, {
    method: "POST",
    body: JSON.stringify({
      order_id: input.orderId,
      total_amount: total,
      tax_amount: { amount: "0.00", currency: input.currency },
      shipping_amount: { amount: "0.00", currency: input.currency },
      discount_amount: { amount: "0.00", currency: input.currency },
      shipping_info: {
        shipped_at: new Date().toISOString(),
        shipping_company: "Digital",
        tracking_number: input.orderId,
        tracking_url: "",
      },
    }),
  });
}

/**
 * Verify a Tamara webhook by comparing the X-Tamara-Token header (or the
 * notification_token field in body) against the configured notification token.
 * Uses constant-time comparison.
 */
export function verifyTamaraNotification(
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
  mode?: ProviderMode,
): boolean {
  const cfg = getTamaraConfig(mode);
  const expected = cfg.notificationToken;

  const headerToken =
    (headers["tamara-token"] as string | undefined) ??
    (headers["x-tamara-token"] as string | undefined) ??
    (typeof headers["authorization"] === "string"
      ? (headers["authorization"] as string).replace(/^Bearer\s+/i, "")
      : undefined);

  const bodyToken =
    body && typeof body === "object" && body !== null
      ? ((body as Record<string, unknown>)["notification_token"] as
          | string
          | undefined)
      : undefined;

  const candidate = headerToken ?? bodyToken;
  if (!candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
