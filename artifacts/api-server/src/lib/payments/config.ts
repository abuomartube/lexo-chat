import { getAppOrigin } from "../auth";

export type ProviderName = "tabby" | "tamara";
export type ProviderMode = "sandbox" | "live";

function readMode(envName: string): ProviderMode {
  const v = (process.env[envName] ?? "sandbox").trim().toLowerCase();
  return v === "live" ? "live" : "sandbox";
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new ProviderConfigError(name);
  }
  return v.trim();
}

export class ProviderConfigError extends Error {
  readonly missing: string;
  constructor(missing: string) {
    super(`Missing required env var: ${missing}`);
    this.missing = missing;
    this.name = "ProviderConfigError";
  }
}

export interface TabbyConfig {
  mode: ProviderMode;
  publicKey: string;
  secretKey: string;
  merchantCode: string;
  apiBase: string;
}

export interface TamaraConfig {
  mode: ProviderMode;
  apiBase: string;
  merchantToken: string;
  notificationToken: string;
  publicKey: string | null;
}

export interface BankTransferConfig {
  bankNameEn: string;
  bankNameAr: string;
  accountNameEn: string;
  accountNameAr: string;
  iban: string;
  swift: string;
}

/**
 * Resolve manual-bank-transfer display config from env. These values are NOT
 * secrets — they are publicly displayed to every buyer on the checkout page.
 * Required: BANK_NAME, BANK_ACCOUNT_NAME, BANK_IBAN.
 * Optional (fall back to EN value, or empty for SWIFT): BANK_NAME_AR,
 * BANK_ACCOUNT_NAME_AR, BANK_SWIFT.
 *
 * Throws ProviderConfigError if any required value is missing so the
 * /api/checkout/bank-transfer/details route can return `{ configured: false }`
 * and the UI can hide the bank-transfer tile.
 */
export function getBankTransferConfig(): BankTransferConfig {
  const bankNameEn = requireEnv("BANK_NAME");
  const accountNameEn = requireEnv("BANK_ACCOUNT_NAME");
  const iban = requireEnv("BANK_IBAN").replace(/\s+/g, "").toUpperCase();
  return {
    bankNameEn,
    bankNameAr: (process.env.BANK_NAME_AR ?? "").trim() || bankNameEn,
    accountNameEn,
    accountNameAr:
      (process.env.BANK_ACCOUNT_NAME_AR ?? "").trim() || accountNameEn,
    iban,
    swift: (process.env.BANK_SWIFT ?? "").trim().toUpperCase(),
  };
}

/**
 * Resolve Tabby config for an explicit mode (used for webhook/return paths
 * verifying historical payments) or — when no mode is given — for the mode
 * currently configured via TABBY_MODE (used when creating new sessions).
 */
export function getTabbyConfig(forMode?: ProviderMode): TabbyConfig {
  const mode = forMode ?? readMode("TABBY_MODE");
  const prefix = mode === "live" ? "TABBY_LIVE" : "TABBY_SANDBOX";
  return {
    mode,
    publicKey: requireEnv(`${prefix}_PUBLIC_KEY`),
    secretKey: requireEnv(`${prefix}_SECRET_KEY`),
    merchantCode: (process.env.TABBY_MERCHANT_CODE ?? "").trim() || "TCI",
    // Tabby's REST endpoints are mode-agnostic — the keys decide which
    // environment you hit.
    apiBase: "https://api.tabby.ai",
  };
}

/**
 * Resolve Tamara config for an explicit mode (used for webhook/return paths
 * verifying historical payments) or — when no mode is given — for the mode
 * currently configured via TAMARA_MODE (used when creating new sessions).
 */
export function getTamaraConfig(forMode?: ProviderMode): TamaraConfig {
  const mode = forMode ?? readMode("TAMARA_MODE");
  const prefix = mode === "live" ? "TAMARA_LIVE" : "TAMARA_SANDBOX";
  const apiBase =
    (process.env[`${prefix}_API_URL`] ?? "").trim() ||
    (mode === "live"
      ? "https://api.tamara.co"
      : "https://api-sandbox.tamara.co");
  return {
    mode,
    apiBase: apiBase.replace(/\/+$/, ""),
    merchantToken: requireEnv(`${prefix}_MERCHANT_TOKEN`),
    notificationToken: requireEnv(`${prefix}_NOTIFICATION_TOKEN`),
    publicKey: (process.env[`${prefix}_PUBLIC_KEY`] ?? "").trim() || null,
  };
}

/**
 * Public-facing absolute URL for redirect/return URLs sent to the providers.
 * Falls back to localhost only if no domain is configured.
 */
export function getCheckoutBaseUrl(): string {
  return getAppOrigin();
}

export function buildReturnUrl(
  provider: ProviderName,
  paymentId: string,
  outcome: "success" | "failure" | "cancel",
): string {
  const base = getCheckoutBaseUrl();
  const u = new URL(`${base}/api/checkout/return`);
  u.searchParams.set("provider", provider);
  u.searchParams.set("payment", paymentId);
  u.searchParams.set("outcome", outcome);
  return u.toString();
}

export function buildWebhookUrl(provider: ProviderName): string {
  return `${getCheckoutBaseUrl()}/api/checkout/${provider}/webhook`;
}
