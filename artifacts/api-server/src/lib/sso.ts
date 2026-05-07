import crypto from "node:crypto";

function getSecret(): string {
  const s = process.env.SSO_SHARED_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SSO_SHARED_SECRET must be set (>=16 chars) for SSO bridge",
    );
  }
  return s;
}

export interface SsoPayload {
  userId: string;
  email: string;
  name: string;
  tier: string;
  jti: string; // unique token id; consumer must enforce single-use
  exp: number; // unix seconds
}

export function newJti(): string {
  return crypto.randomBytes(16).toString("base64url");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function signSsoToken(payload: SsoPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifySsoToken(token: string): SsoPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts as [string, string];
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(body)
      .digest();
    const provided = fromB64url(sig);
    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    ) {
      return null;
    }
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SsoPayload;
    if (
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
