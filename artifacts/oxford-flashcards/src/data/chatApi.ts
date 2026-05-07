/**
 * chatApi — placeholder API layer for the LEXO Chat UI.
 *
 * Every screen in src/screens/chat/* talks to this module instead of
 * touching mock data directly. When the real backend is ready, only this
 * file needs to change — swap each function body with a fetch / react-query
 * call and the screens stay the same.
 *
 * All functions are async on purpose so call-sites already await Promises.
 */

import {
  MOCK_ROOMS,
  USERS,
  AMBIENT_PHRASES,
  getRoomById,
  seedMessages,
  nowTime,
  randomDuration,
  nextMessageId,
  pickRandom,
  type MockRoom,
  type ChatMsg,
  type User,
} from "./chat";

// ---- types exposed to screens (kept stable across mock/real swap) -------

export type Room = MockRoom;
export type Message = ChatMsg;

export type SendResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type JoinRoomResult = {
  ok: true;
  roomId: string;
  joinedAt: number;
};

// ---- internal: simulated network latency ---------------------------------

const SIMULATED_LATENCY_MS = 0; // bump to e.g. 250 to preview loading states

function fake<T>(value: T): Promise<T> {
  if (SIMULATED_LATENCY_MS === 0) return Promise.resolve(value);
  return new Promise((resolve) =>
    setTimeout(() => resolve(value), SIMULATED_LATENCY_MS),
  );
}

// ---- in-memory message store (per-room) ----------------------------------
// Replace with server state once the backend is wired.

const roomMessages = new Map<string, Message[]>();

function getOrSeed(roomId: string): Message[] {
  let list = roomMessages.get(roomId);
  if (!list) {
    list = seedMessages(roomId);
    roomMessages.set(roomId, list);
  }
  return list;
}

// ---- public API ----------------------------------------------------------

/** List all chat rooms. TODO: GET /api/chat/rooms */
export function getRooms(): Promise<Room[]> {
  return fake(MOCK_ROOMS);
}

/** Fetch a single room by id. TODO: GET /api/chat/rooms/:id */
export function getRoom(id: string | undefined): Promise<Room | undefined> {
  return fake(getRoomById(id));
}

/**
 * Join a room (membership / presence side-effect on the server).
 * TODO: POST /api/chat/rooms/:id/join
 */
export function joinRoom(id: string): Promise<JoinRoomResult> {
  return fake({ ok: true as const, roomId: id, joinedAt: Date.now() });
}

/** Leave a room. TODO: POST /api/chat/rooms/:id/leave */
export function leaveRoom(id: string): Promise<{ ok: true }> {
  void id;
  return fake({ ok: true as const });
}

/** Fetch the message history for a room. TODO: GET /api/chat/rooms/:id/messages */
export function getMessages(roomId: string): Promise<Message[]> {
  return fake([...getOrSeed(roomId)]);
}

/**
 * Send a text message. Returns the persisted message (with server id/time).
 * TODO: POST /api/chat/rooms/:id/messages { text }
 */
export function sendMessage(
  roomId: string,
  text: string,
): Promise<SendResult<Message>> {
  const trimmed = text.trim();
  if (!trimmed) {
    return fake({ ok: false as const, error: "EMPTY_MESSAGE" });
  }
  const msg: Message = {
    id: nextMessageId(),
    kind: "outgoing",
    text: trimmed,
    time: nowTime(),
  };
  getOrSeed(roomId).push(msg);
  return fake({ ok: true as const, data: msg });
}

/**
 * Send a voice note. The real backend will accept an uploaded audio blob
 * and return its URL + duration. For now we just store the duration string.
 * TODO: POST /api/chat/rooms/:id/voice  (multipart upload)
 */
export function sendVoiceMessage(
  roomId: string,
  duration: string = randomDuration(),
): Promise<SendResult<Message>> {
  const msg: Message = {
    id: nextMessageId(),
    kind: "voice-out",
    duration,
    time: nowTime(),
  };
  getOrSeed(roomId).push(msg);
  return fake({ ok: true as const, data: msg });
}

/**
 * Post a system message (used by Topic / Ice Breaker actions).
 * TODO: POST /api/chat/rooms/:id/system  — or handled server-side entirely.
 */
export function postSystemMessage(
  roomId: string,
  text: string,
): Promise<SendResult<Message>> {
  const msg: Message = {
    id: nextMessageId(),
    kind: "system",
    text,
    time: nowTime(),
  };
  getOrSeed(roomId).push(msg);
  return fake({ ok: true as const, data: msg });
}

// ---- Activity / presence simulator ---------------------------------------
// In production this becomes a websocket / polling subscription.

export type RoomActivityEvent =
  | { type: "typing"; user: User }
  | { type: "typing-stop" }
  | { type: "message"; message: Message }
  | { type: "presence"; online: number };

type ActivityHandler = (e: RoomActivityEvent) => void;

/**
 * Subscribe to live activity in a room: typing indicators, ambient incoming
 * messages from other users, and online-count fluctuations. Returns an
 * unsubscribe function. TODO: replace with a websocket subscription.
 */
export function subscribeToRoom(
  roomId: string,
  onEvent: ActivityHandler,
): () => void {
  const room = getRoomById(roomId);
  if (!room) return () => {};

  let cancelled = false;
  let online = room.online;
  const timers: ReturnType<typeof setTimeout>[] = [];

  function schedule(fn: () => void, ms: number) {
    if (cancelled) return;
    timers.push(setTimeout(fn, ms));
  }

  function pickOther(): User {
    return pickRandom(USERS.slice(0, 8));
  }

  function loop() {
    if (cancelled) return;
    const user = pickOther();
    onEvent({ type: "typing", user });
    schedule(
      () => {
        if (cancelled) return;
        onEvent({ type: "typing-stop" });
        const sendVoice = Math.random() < 0.25;
        const msg: Message = sendVoice
          ? {
              id: nextMessageId(),
              kind: "voice-in",
              name: user.name,
              letter: user.letter,
              tone: user.tone,
              time: nowTime(),
              duration: randomDuration(),
            }
          : {
              id: nextMessageId(),
              kind: "incoming",
              name: user.name,
              letter: user.letter,
              tone: user.tone,
              time: nowTime(),
              text: pickRandom(AMBIENT_PHRASES),
            };
        getOrSeed(roomId).push(msg);
        onEvent({ type: "message", message: msg });

        // jitter the online count by ±1
        const delta = Math.random() < 0.5 ? -1 : 1;
        online = Math.max(3, online + delta);
        onEvent({ type: "presence", online });

        schedule(loop, 6000 + Math.random() * 7000);
      },
      1500 + Math.random() * 1800,
    );
  }

  // first event slightly after subscribe
  schedule(loop, 2500 + Math.random() * 2000);

  return () => {
    cancelled = true;
    for (const t of timers) clearTimeout(t);
  };
}
