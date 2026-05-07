// Route tests for POST /api/chat/correct.
// These tests mount the chat-ai router on a minimal Express app with a
// stub auth/session middleware so we can exercise the contract without
// touching the real session store. The OpenAI client is stubbed via
// vi.mock so success-path requests do not call the real upstream.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  isAlreadyCorrect: true,
                  corrected: "ok",
                  explanation: "looks good",
                  naturalVersion: null,
                }),
              },
            },
          ],
        })),
      },
    },
  },
}));

const chatAiModule = await import("./chat-ai");
const chatAiRouter = chatAiModule.default;
const { __testing } = chatAiModule;

interface TestSession {
  userId?: string;
}

function buildApp(authedUserId?: string): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const sess: TestSession = authedUserId ? { userId: authedUserId } : {};
    (req as unknown as { session: TestSession }).session = sess;
    (req as unknown as { log: Record<string, () => void> }).log = {
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
    };
    next();
  });
  app.use(chatAiRouter);
  return app;
}

let unauthServer: http.Server;
let unauthBase: string;
let authedServer: http.Server;
let authedBase: string;

beforeAll(async () => {
  unauthServer = http.createServer(buildApp());
  await new Promise<void>((r) => unauthServer.listen(0, "127.0.0.1", r));
  const u = unauthServer.address() as AddressInfo;
  unauthBase = `http://127.0.0.1:${u.port}`;

  authedServer = http.createServer(buildApp("test-user-aaaa"));
  await new Promise<void>((r) => authedServer.listen(0, "127.0.0.1", r));
  const a = authedServer.address() as AddressInfo;
  authedBase = `http://127.0.0.1:${a.port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => unauthServer.close(() => r()));
  await new Promise<void>((r) => authedServer.close(() => r()));
});

beforeEach(() => {
  __testing.resetRateLimit();
  __testing.resetDailyLimit();
});

describe("POST /chat/correct", () => {
  it("returns 401 when no session is present", async () => {
    const res = await fetch(`${unauthBase}/chat/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "i goes home" }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 when authenticated request has invalid body", async () => {
    const res = await fetch(`${authedBase}/chat/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("invalid_request");
  });

  it("returns 429 after exceeding the per-user rate limit", async () => {
    const max = __testing.RATE_LIMIT_MAX;
    for (let i = 0; i < max; i++) {
      __testing.resetDailyLimit();
      const ok = await fetch(`${authedBase}/chat/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello there" }),
      });
      expect(ok.status).toBe(200);
    }
    const limited = await fetch(`${authedBase}/chat/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello there" }),
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    const body = (await limited.json()) as { error?: string };
    expect(body.error).toBe("rate_limited");
  });
});
