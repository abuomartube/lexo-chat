// Route tests for POST /api/chat/translate.
// Mirrors chat-ai.test.ts: minimal Express app with stubbed auth/session
// and a vi.mock'd OpenAI client so success-path requests do not call
// the real upstream.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

vi.mock("@workspace/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: () => [] }) }) }) },
  enrollmentsTable: { id: "id", userId: "user_id", status: "status", expiresAt: "expires_at" },
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  detectedLanguage: "en",
                  targetLanguage: "ar",
                  translatedText: "مرحبا",
                  learnerNote: null,
                }),
              },
            },
          ],
        })),
      },
    },
  },
}));

const openaiMod = await import("@workspace/integrations-openai-ai-server");
const createMock = vi.mocked(openaiMod.openai.chat.completions.create);

const translateModule = await import("./chat-ai-translate");
const translateRouter = translateModule.default;
const { __testing } = translateModule;

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
  app.use(translateRouter);
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

  authedServer = http.createServer(buildApp("test-user-trans"));
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

describe("POST /chat/translate", () => {
  it("returns 401 when no session is present", async () => {
    const res = await fetch(`${unauthBase}/chat/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 when authenticated request has invalid body", async () => {
    const res = await fetch(`${authedBase}/chat/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("invalid_request");
  });

  it("returns 502 when the model returns invalid/empty JSON", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not json at all" } }],
    } as never);
    const bad = await fetch(`${authedBase}/chat/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(bad.status).toBe(502);
    const body1 = (await bad.json()) as { error?: string };
    expect(body1.error).toBe("ai_invalid_response");

    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    } as never);
    const empty = await fetch(`${authedBase}/chat/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(empty.status).toBe(502);
    const body2 = (await empty.json()) as { error?: string };
    expect(body2.error).toBe("ai_empty_response");

    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              detectedLanguage: "en",
              targetLanguage: "ar",
              translatedText: "",
              learnerNote: null,
            }),
          },
        },
      ],
    } as never);
    const emptyText = await fetch(`${authedBase}/chat/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(emptyText.status).toBe(502);
    const body3 = (await emptyText.json()) as { error?: string };
    expect(body3.error).toBe("ai_invalid_response");
  });

  it("returns 429 after exceeding the per-user rate limit", async () => {
    const max = __testing.RATE_LIMIT_MAX;
    for (let i = 0; i < max; i++) {
      __testing.resetDailyLimit();
      const ok = await fetch(`${authedBase}/chat/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });
      expect(ok.status).toBe(200);
    }
    const limited = await fetch(`${authedBase}/chat/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    const body = (await limited.json()) as { error?: string };
    expect(body.error).toBe("rate_limited");
  });

  it("returns 403 daily_limit_reached after exceeding the daily cap", async () => {
    const { __testing: dt } = await import("../lib/ai-daily-limit");
    const FREE_LIMIT = dt.FREE_DAILY_LIMIT;

    for (let i = 0; i < FREE_LIMIT; i++) {
      __testing.resetRateLimit();
      const ok = await fetch(`${authedBase}/chat/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });
      expect(ok.status).toBe(200);
    }

    __testing.resetRateLimit();
    const blocked = await fetch(`${authedBase}/chat/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(blocked.status).toBe(403);
    const body = (await blocked.json()) as { error?: string };
    expect(body.error).toBe("daily_limit_reached");
  });
});
