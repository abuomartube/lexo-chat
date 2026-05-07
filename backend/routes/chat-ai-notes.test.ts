import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();

const mockReturning = vi.fn();
const mockOnConflict = vi.fn(() => ({ returning: mockReturning }));
const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflict }));

const mockSelectWhere = vi.fn();
const mockSelectOrderBy = vi.fn();
const mockSelectLimit = vi.fn();
const mockSelectFrom = vi.fn(() => ({
  where: mockSelectWhere,
  orderBy: mockSelectOrderBy,
}));

const mockDeleteWhere = vi.fn();
const mockDeleteReturning = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return { values: mockValues };
    },
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return { from: mockSelectFrom };
    },
    delete: (...args: unknown[]) => {
      mockDelete(...args);
      return {
        where: (...wArgs: unknown[]) => {
          mockDeleteWhere(...wArgs);
          return { returning: mockDeleteReturning };
        },
      };
    },
  },
  chatAiNotesTable: {
    id: "id",
    userId: "user_id",
    action: "action",
    originalText: "original_text",
    resultJson: "result_json",
    createdAt: "created_at",
  },
  CHAT_AI_NOTE_ACTION_VALUES: ["correct", "translate", "explain"],
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: unknown[]) => ({ op: "eq", args: a })),
  and: vi.fn((...a: unknown[]) => ({ op: "and", args: a })),
  desc: vi.fn((col: unknown) => ({ op: "desc", col })),
}));

const notesModule = await import("./chat-ai-notes");
const notesRouter = notesModule.default;

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
  app.use(notesRouter);
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

  authedServer = http.createServer(buildApp("test-user-notes"));
  await new Promise<void>((r) => authedServer.listen(0, "127.0.0.1", r));
  const a = authedServer.address() as AddressInfo;
  authedBase = `http://127.0.0.1:${a.port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => unauthServer.close(() => r()));
  await new Promise<void>((r) => authedServer.close(() => r()));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /chat/notes", () => {
  it("returns 401 when no session is present", async () => {
    const res = await fetch(`${unauthBase}/chat/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "correct",
        originalText: "hi",
        resultJson: "{}",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    const res = await fetch(`${authedBase}/chat/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("invalid_request");
  });

  it("returns 400 when action is invalid", async () => {
    const res = await fetch(`${authedBase}/chat/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "pronounce",
        originalText: "hi",
        resultJson: "{}",
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe(
      "invalid_request",
    );
  });

  it("returns 400 when resultJson is not valid JSON", async () => {
    const res = await fetch(`${authedBase}/chat/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "correct",
        originalText: "hi",
        resultJson: "not json",
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe(
      "invalid_result_json",
    );
  });

  it("returns 201 on successful save", async () => {
    mockReturning.mockResolvedValueOnce([
      { id: "aaaa-bbbb-cccc-dddd" },
    ]);
    const res = await fetch(`${authedBase}/chat/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "correct",
        originalText: "I go school",
        resultJson: JSON.stringify({ corrected: "I went to school" }),
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      saved: boolean;
      duplicate: boolean;
      id: string;
    };
    expect(body.saved).toBe(true);
    expect(body.duplicate).toBe(false);
    expect(body.id).toBe("aaaa-bbbb-cccc-dddd");
  });

  it("returns 200 with duplicate:true when note already exists", async () => {
    mockReturning.mockResolvedValueOnce([]);
    mockSelectWhere.mockReturnValueOnce({
      limit: vi.fn().mockResolvedValueOnce([{ id: "existing-id" }]),
    });
    const res = await fetch(`${authedBase}/chat/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "translate",
        originalText: "hello",
        resultJson: JSON.stringify({ translatedText: "مرحبا" }),
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      saved: boolean;
      duplicate: boolean;
      id: string;
    };
    expect(body.saved).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(body.id).toBe("existing-id");
  });
});

describe("GET /chat/notes", () => {
  it("returns 401 when no session is present", async () => {
    const res = await fetch(`${unauthBase}/chat/notes`);
    expect(res.status).toBe(401);
  });

  it("returns notes list", async () => {
    mockSelectWhere.mockReturnValueOnce({
      orderBy: vi.fn().mockReturnValueOnce({
        limit: vi.fn().mockResolvedValueOnce([
          {
            id: "n1",
            action: "correct",
            originalText: "hi",
            resultJson: "{}",
            createdAt: new Date().toISOString(),
          },
        ]),
      }),
    });
    const res = await fetch(`${authedBase}/chat/notes`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { notes: unknown[] };
    expect(Array.isArray(body.notes)).toBe(true);
  });
});

describe("DELETE /chat/notes/:id", () => {
  it("returns 401 when no session is present", async () => {
    const res = await fetch(
      `${unauthBase}/chat/notes/00000000-0000-0000-0000-000000000000`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid id format", async () => {
    const res = await fetch(`${authedBase}/chat/notes/bad-id`, {
      method: "DELETE",
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe(
      "invalid_id",
    );
  });

  it("returns 404 when note does not exist", async () => {
    mockDeleteReturning.mockResolvedValueOnce([]);
    const res = await fetch(
      `${authedBase}/chat/notes/00000000-0000-0000-0000-000000000000`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error?: string }).error).toBe(
      "not_found",
    );
  });

  it("returns 200 when note is successfully deleted", async () => {
    mockDeleteReturning.mockResolvedValueOnce([{ id: "deleted-id" }]);
    const res = await fetch(
      `${authedBase}/chat/notes/00000000-0000-0000-0000-000000000000`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deleted: boolean };
    expect(body.deleted).toBe(true);
  });
});
