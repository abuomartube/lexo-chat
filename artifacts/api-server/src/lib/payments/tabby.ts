import { getTabbyConfig, type ProviderMode, type TabbyConfig } from "./config";

export interface TabbyBuyer {
  email: string;
  name: string;
  phone: string;
}

export interface TabbyCreateSessionInput {
  amountMinor: number;
  currency: string;
  course: string;
  tier: string;
  buyer: TabbyBuyer;
  buyerHistory?: { registered_since?: string };
  orderReferenceId: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  webhookUrl: string;
  language?: "en" | "ar";
}

export interface TabbyCreatedSession {
  id: string;
  status: string;
  paymentId: string | null;
  redirectUrl: string | null;
  webUrl: string | null;
  rejectionReason: string | null;
  raw: unknown;
}

export interface TabbyRetrievedPayment {
  id: string;
  status: string;
  amount: string;
  currency: string;
  raw: unknown;
}

function minorToMajor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

async function tabbyFetch(
  cfg: TabbyConfig,
  path: string,
  init: RequestInit,
): Promise<unknown> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${cfg.secretKey}`);
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
      `Tabby ${init.method ?? "GET"} ${path} failed (${res.status})`,
    ) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

export async function createTabbyCheckoutSession(
  input: TabbyCreateSessionInput,
): Promise<TabbyCreatedSession> {
  const cfg = getTabbyConfig();

  const body = {
    payment: {
      amount: minorToMajor(input.amountMinor),
      currency: input.currency,
      description: input.description,
      buyer: {
        email: input.buyer.email,
        name: input.buyer.name,
        phone: input.buyer.phone,
      },
      buyer_history: input.buyerHistory ?? {},
      order: {
        reference_id: input.orderReferenceId,
        items: [
          {
            title: input.description,
            description: input.description,
            quantity: 1,
            unit_price: minorToMajor(input.amountMinor),
            category: input.course,
            reference_id: `${input.course}:${input.tier}`,
          },
        ],
      },
      shipping_address: {
        city: "Riyadh",
        address: "Online course access",
        zip: "00000",
      },
      meta: {
        order_id: input.orderReferenceId,
        customer: input.buyer.email,
      },
    },
    lang: input.language ?? "en",
    merchant_code: cfg.merchantCode,
    merchant_urls: {
      success: input.successUrl,
      cancel: input.cancelUrl,
      failure: input.failureUrl,
    },
    webhook_url: input.webhookUrl,
  };

  const raw = (await tabbyFetch(cfg, "/api/v2/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  })) as Record<string, unknown>;

  const id = String(raw["id"] ?? "");
  const status = String(raw["status"] ?? "");
  const payment =
    (raw["payment"] as Record<string, unknown> | undefined) ?? undefined;
  const configuration =
    (raw["configuration"] as Record<string, unknown> | undefined) ?? undefined;
  const availableProducts =
    (configuration?.["available_products"] as
      | Record<string, unknown>
      | undefined) ?? undefined;
  const installments =
    (availableProducts?.["installments"] as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const firstInstallment = installments[0];
  const webUrl = firstInstallment
    ? ((firstInstallment["web_url"] as string | undefined) ?? null)
    : null;

  return {
    id,
    status,
    paymentId: payment ? String(payment["id"] ?? "") || null : null,
    redirectUrl: webUrl,
    webUrl,
    rejectionReason:
      (raw["rejection_reason"] as string | null | undefined) ?? null,
    raw,
  };
}

export async function retrieveTabbyPayment(
  paymentId: string,
  mode?: ProviderMode,
): Promise<TabbyRetrievedPayment> {
  const cfg = getTabbyConfig(mode);
  const raw = (await tabbyFetch(
    cfg,
    `/api/v2/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
  )) as Record<string, unknown>;
  return {
    id: String(raw["id"] ?? ""),
    status: String(raw["status"] ?? ""),
    amount: String(raw["amount"] ?? ""),
    currency: String(raw["currency"] ?? ""),
    raw,
  };
}

export async function captureTabbyPayment(
  paymentId: string,
  amountMinor: number,
  currency: string,
  mode?: ProviderMode,
): Promise<unknown> {
  const cfg = getTabbyConfig(mode);
  return tabbyFetch(
    cfg,
    `/api/v2/payments/${encodeURIComponent(paymentId)}/captures`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: minorToMajor(amountMinor),
        currency,
      }),
    },
  );
}

/**
 * Tabby's webhook does not require signature verification when used with the
 * documented bearer-key model; the security relies on the URL being
 * unguessable and on always re-fetching the payment from Tabby before
 * trusting any state transition. We re-fetch via {@link retrieveTabbyPayment}
 * inside the route handler.
 */
export function isAuthorizedTabbyStatus(status: string): boolean {
  return status === "AUTHORIZED" || status === "CLOSED";
}
