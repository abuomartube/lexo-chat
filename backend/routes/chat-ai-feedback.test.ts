import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
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
                  summary: "Good effort! You're making progress.",
                  commonMistakes: ["Subject-verb agreement"],
                  vocabularySuggestions: ["Try using 'delighted' instead of 'happy'"],
                  fluencySuggestions: ["Use contractions for a more natural sound"],
                  practicalTips: ["Read English news daily", "Practice writing short paragraphs", "Record yourself speaking"],
                  voiceNote: null,
                }),
              },
            },
          ],
        })),
      },
    },
  },
}));

const TEST_ROOM_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const TEST_USER_ID = "test-feedback-user";

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@workspace/db");
  return {
    ...actual,
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(function (this: unknown) {
        return Promise.resolve([]);
      }),
    },
  };
});

const { db } = await import("@workspace/db");
const chatAiFeedbackModule = await import("./chat-ai-feedback");
const chatAiFeedbackRouter = chatAiFeedbackModule.default;

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
  app.use(chatAiFeedbackRouter);
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

  authedServer = http.createServer(buildApp(TEST_USER_ID));
  await new Promise<void>((r) => authedServer.listen(0, "127.0.0.1", r));
  const a = authedServer.address() as AddressInfo;
  authedBase = `http://127.0.0.1:${a.port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => unauthServer.close(() => r()));
  await new Promise<void>((r) => authedServer.close(() => r()));
});

describe("POST /chat/my-feedback", () => {
  it("returns 401 when no session is present", async () => {
    const res = await fetch(`${unauthBase}/chat/my-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomSlug: "general" }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 when roomSlug is missing", async () => {
    const res = await fetch(`${authedBase}/chat/my-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("invalid_request");
  });

  it("returns 404 when the room does not exist", async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    (db as unknown as { select: typeof mockSelect }).select = mockSelect;

    const res = await fetch(`${authedBase}/chat/my-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomSlug: "nonexistent-room-xyz" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("room_not_found");
  });

  it("returns a friendly empty report when user has no messages", async () => {
    let callCount = 0;
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) return Promise.resolve([]);
              return Promise.resolve([]);
            }),
          }),
          then: undefined,
        }),
      }),
    });

    const mockSelectRoom = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: TEST_ROOM_ID }]),
      }),
    });

    let selectCall = 0;
    (db as unknown as { select: typeof mockSelect }).select = vi.fn().mockImplementation((...args: unknown[]) => {
      selectCall++;
      if (selectCall === 1) return mockSelectRoom(...args);
      return mockSelect(...args);
    });

    const res = await fetch(`${authedBase}/chat/my-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomSlug: "general" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { report: { summary: string; practicalTips: string[] } };
    expect(body.report).toBeDefined();
    expect(body.report.summary).toContain("haven't sent");
    expect(body.report.practicalTips.length).toBeGreaterThan(0);
  });
});
