// Typed fetch helpers for LEXO Chat endpoints (mounted at /api/chat).

export interface ChatRoomSummary {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  kind: "text" | "voice";
  level: string | null;
  category: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  emoji: string | null;
  onlineCount: number;
}

export interface ChatRoomDetail extends ChatRoomSummary {
  rulesEn: string | null;
  rulesAr: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  authorName: string;
  authorRole: string;
  kind: "text" | "voice" | "image" | "system";
  body: string | null;
  deleted: boolean;
  attachmentMime: string | null;
  attachmentSizeBytes: number | null;
  audioDurationSec: number | null;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface DmThreadSummary {
  id: string;
  otherUserId: string;
  otherUserName: string;
  lastActivityAt: string;
  preview: { body: string | null; kind: string; createdAt: string } | null;
}

export interface DmMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  kind: "text" | "voice" | "image" | "system";
  body: string | null;
  deleted: boolean;
  attachmentMime: string | null;
  audioDurationSec: number | null;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalXp: number;
  level: number;
  messagesSent: number;
  voiceNotesSent: number;
  imagesSent: number;
}

const init: RequestInit = { credentials: "include" };

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

// ─────────────────── Rooms ───────────────────

export async function fetchRooms(): Promise<{
  rooms: ChatRoomSummary[];
  hotRoomId: string | null;
}> {
  const res = await fetch("/api/chat/rooms", init);
  return jsonOrThrow(res);
}

export async function fetchRoom(slug: string): Promise<{
  room: ChatRoomDetail;
  activeUsers: { id: string; name: string }[];
}> {
  const res = await fetch(`/api/chat/rooms/${encodeURIComponent(slug)}`, init);
  return jsonOrThrow(res);
}

export async function fetchMessages(
  slug: string,
  since?: string,
): Promise<{ messages: ChatMessage[] }> {
  const url = since
    ? `/api/chat/rooms/${encodeURIComponent(slug)}/messages?since=${encodeURIComponent(since)}`
    : `/api/chat/rooms/${encodeURIComponent(slug)}/messages`;
  const res = await fetch(url, init);
  return jsonOrThrow(res);
}

export async function sendTextMessage(
  slug: string,
  body: string,
): Promise<{ message: ChatMessage }> {
  const res = await fetch(
    `/api/chat/rooms/${encodeURIComponent(slug)}/messages`,
    {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "text", body }),
    },
  );
  return jsonOrThrow(res);
}

export async function sendAttachmentMessage(
  slug: string,
  kind: "voice" | "image",
  attachment: {
    objectPath: string;
    mime: string;
    sizeBytes: number;
    audioDurationSec?: number;
  },
): Promise<{ message: ChatMessage }> {
  const res = await fetch(
    `/api/chat/rooms/${encodeURIComponent(slug)}/messages`,
    {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, attachment }),
    },
  );
  return jsonOrThrow(res);
}

export async function deleteMessage(id: string): Promise<void> {
  const res = await fetch(`/api/chat/messages/${id}`, {
    ...init,
    method: "DELETE",
  });
  await jsonOrThrow(res);
}

export async function heartbeat(
  slug: string,
): Promise<{ onlineCount: number }> {
  const res = await fetch(
    `/api/chat/rooms/${encodeURIComponent(slug)}/heartbeat`,
    { ...init, method: "POST" },
  );
  return jsonOrThrow(res);
}

// ─────────────────── Topics & ice breakers ───────────────────

export interface TopicResult {
  topic: { en: string; ar: string };
  categories: string[];
}
export async function fetchTopic(category?: string): Promise<TopicResult> {
  const url = category
    ? `/api/chat/topics?category=${encodeURIComponent(category)}`
    : "/api/chat/topics";
  const res = await fetch(url, init);
  return jsonOrThrow(res);
}

export async function fetchIceBreaker(): Promise<{
  icebreaker: { en: string; ar: string };
}> {
  const res = await fetch("/api/chat/icebreakers", init);
  return jsonOrThrow(res);
}

// ─────────────────── Leaderboard ───────────────────

export async function fetchLeaderboard(): Promise<{
  leaderboard: LeaderboardEntry[];
  me: {
    totalXp: number;
    level: number;
    messagesSent: number;
    voiceNotesSent: number;
    imagesSent: number;
  };
}> {
  const res = await fetch("/api/chat/leaderboard", init);
  return jsonOrThrow(res);
}

// ─────────────────── DMs ───────────────────

export async function fetchDmThreads(): Promise<{
  threads: DmThreadSummary[];
}> {
  const res = await fetch("/api/chat/dm/threads", init);
  return jsonOrThrow(res);
}

export async function openDmThread(otherUserId: string): Promise<{
  thread: { id: string; otherUserId: string; otherUserName: string };
}> {
  const res = await fetch("/api/chat/dm/threads", {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otherUserId }),
  });
  return jsonOrThrow(res);
}

export async function fetchDmMessages(
  threadId: string,
  since?: string,
): Promise<{
  messages: DmMessage[];
  otherUser: { id: string; name: string };
}> {
  const url = since
    ? `/api/chat/dm/threads/${threadId}/messages?since=${encodeURIComponent(since)}`
    : `/api/chat/dm/threads/${threadId}/messages`;
  const res = await fetch(url, init);
  return jsonOrThrow(res);
}

export async function sendDmText(
  threadId: string,
  body: string,
): Promise<{ message: DmMessage }> {
  const res = await fetch(`/api/chat/dm/threads/${threadId}/messages`, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "text", body }),
  });
  return jsonOrThrow(res);
}

export async function sendDmAttachment(
  threadId: string,
  kind: "voice" | "image",
  attachment: {
    objectPath: string;
    mime: string;
    sizeBytes: number;
    audioDurationSec?: number;
  },
): Promise<{ message: DmMessage }> {
  const res = await fetch(`/api/chat/dm/threads/${threadId}/messages`, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, attachment }),
  });
  return jsonOrThrow(res);
}

// ─────────────────── Uploads (shared with /storage) ───────────────────

export async function requestUploadUrl(
  name: string,
  size: number,
  contentType: string,
): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch("/api/storage/uploads/request-url", {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, size, contentType }),
  });
  return jsonOrThrow(res);
}

export async function uploadBlob(
  uploadURL: string,
  blob: Blob,
  contentType: string,
): Promise<void> {
  const r = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!r.ok) throw new Error(`upload_failed_${r.status}`);
}

/**
 * Convenience: request signed URL → PUT → return objectPath.
 */
export async function uploadFileAndGetPath(
  file: Blob,
  filename: string,
  contentType: string,
): Promise<string> {
  const { uploadURL, objectPath } = await requestUploadUrl(
    filename,
    file.size,
    contentType,
  );
  await uploadBlob(uploadURL, file, contentType);
  return objectPath;
}

// ─────────────────── AI: Correction ───────────────────

export interface CorrectionResult {
  isAlreadyCorrect: boolean;
  corrected: string;
  explanation: string;
  naturalVersion: string | null;
}

export async function correctMessage(
  text: string,
  signal?: AbortSignal,
): Promise<{ result: CorrectionResult; xpAwarded?: number }> {
  const res = await fetch("/api/chat/correct", {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  return jsonOrThrow(res);
}

// ─────────────────── AI: Translation ───────────────────

export interface TranslationResult {
  detectedLanguage: "en" | "ar" | "other";
  targetLanguage: "en" | "ar";
  translatedText: string;
  learnerNote: string | null;
}

export async function translateMessage(
  text: string,
  signal?: AbortSignal,
): Promise<{ result: TranslationResult; xpAwarded?: number }> {
  const res = await fetch("/api/chat/translate", {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  return jsonOrThrow(res);
}

// ─────────────────── AI: Explanation ───────────────────

export interface ExplanationVocabItem {
  word: string;
  meaning: string;
}

export interface ExplanationResult {
  simpleMeaning: string;
  keyVocabulary: ExplanationVocabItem[];
  learnerNote: string | null;
}

export async function explainMessage(
  text: string,
  signal?: AbortSignal,
): Promise<{ result: ExplanationResult; xpAwarded?: number }> {
  const res = await fetch("/api/chat/explain", {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  return jsonOrThrow(res);
}

// ─────────────────── AI Notes: Save / List / Delete ───────────────────

export interface SaveNotePayload {
  action: "correct" | "translate" | "explain";
  originalText: string;
  resultJson: string;
}

export interface SaveNoteResponse {
  saved: boolean;
  duplicate: boolean;
  id: string | null;
  xpAwarded?: number;
}

export async function saveAiNote(
  payload: SaveNotePayload,
): Promise<SaveNoteResponse> {
  const res = await fetch("/api/chat/notes", {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

export interface AiNote {
  id: string;
  userId: string;
  action: string;
  originalText: string;
  resultJson: string;
  createdAt: string;
}

export async function fetchAiNotes(
  action?: string,
): Promise<{ notes: AiNote[] }> {
  const params = action ? `?action=${encodeURIComponent(action)}` : "";
  const res = await fetch(`/api/chat/notes${params}`, init);
  return jsonOrThrow(res);
}

export async function deleteAiNote(id: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`/api/chat/notes/${id}`, {
    ...init,
    method: "DELETE",
  });
  return jsonOrThrow(res);
}

// ─────────────────── AI: Private Feedback Report ───────────────────

export interface FeedbackReport {
  summary: string;
  commonMistakes: string[];
  vocabularySuggestions: string[];
  fluencySuggestions: string[];
  practicalTips: string[];
  voiceNote: string | null;
}

export async function fetchMyFeedback(
  roomSlug: string,
  signal?: AbortSignal,
): Promise<{ report: FeedbackReport }> {
  const res = await fetch("/api/chat/my-feedback", {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomSlug }),
    signal,
  });
  return jsonOrThrow(res);
}

// ─────────────────── Helpers ───────────────────

const ARABIC_RE = /[\u0600-\u06FF]/;
export function containsArabic(s: string): boolean {
  return ARABIC_RE.test(s);
}
