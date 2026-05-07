/**
 * Minimal Zoom Server-to-Server OAuth client.
 *
 * Auth: https://developers.zoom.us/docs/internal-apps/s2s-oauth/
 *   POST https://zoom.us/oauth/token?grant_type=account_credentials&account_id=...
 *   Authorization: Basic base64(clientId:clientSecret)
 *   → { access_token, expires_in (seconds), token_type, scope }
 *
 * Tokens last 1 hour. We cache in-process and refresh ~5 minutes before
 * expiry. This module is intentionally dependency-free (just `fetch`) so it
 * runs in the api-server's esbuild bundle without extra package installs.
 */

import { logger } from "./logger";

const ZOOM_API_BASE = "https://api.zoom.us/v2";
const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cached: CachedToken | null = null;
let inflight: Promise<CachedToken> | null = null;

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`${name} is not set`);
  }
  return v.trim();
}

async function fetchAccessToken(): Promise<CachedToken> {
  const accountId = envOrThrow("ZOOM_ACCOUNT_ID");
  const clientId = envOrThrow("ZOOM_CLIENT_ID");
  const clientSecret = envOrThrow("ZOOM_CLIENT_SECRET");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error(
      { status: res.status, body: body.slice(0, 500) },
      "zoom oauth token request failed",
    );
    throw new Error(`zoom_oauth_failed_${res.status}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };
  // Refresh 5 minutes before actual expiry to avoid races.
  const safetyMs = 5 * 60 * 1000;
  const expiresAt = Date.now() + data.expires_in * 1000 - safetyMs;
  return { accessToken: data.access_token, expiresAt };
}

async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }
  if (inflight) return (await inflight).accessToken;
  inflight = (async () => {
    try {
      const t = await fetchAccessToken();
      cached = t;
      return t;
    } finally {
      inflight = null;
    }
  })();
  return (await inflight).accessToken;
}

async function zoomFetch<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${ZOOM_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    logger.error(
      {
        method,
        path,
        status: res.status,
        body: text.slice(0, 500),
      },
      "zoom api error",
    );
    const message =
      (json as { message?: string } | undefined)?.message ??
      `zoom_api_failed_${res.status}`;
    const err = new Error(message) as Error & {
      status?: number;
      zoomBody?: unknown;
    };
    err.status = res.status;
    err.zoomBody = json;
    throw err;
  }
  return json as T;
}

export interface CreateZoomMeetingInput {
  topic: string;
  agenda?: string;
  startTime: Date;
  durationMin: number;
  /**
   * The Zoom user the meeting belongs to. "me" uses the bot account that
   * owns the S2S OAuth app. Pass an email or user-id to host as someone else.
   */
  hostUserId?: string;
}

export interface ZoomMeeting {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  start_url: string;
  password?: string;
}

export async function createZoomMeeting(
  input: CreateZoomMeetingInput,
): Promise<ZoomMeeting> {
  const host = input.hostUserId ?? "me";
  return zoomFetch<ZoomMeeting>(
    "POST",
    `/users/${encodeURIComponent(host)}/meetings`,
    {
      topic: input.topic,
      type: 2, // scheduled meeting
      start_time: input.startTime.toISOString(),
      duration: input.durationMin,
      timezone: "UTC",
      agenda: input.agenda ?? "",
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
        participant_video: false,
        host_video: true,
        approval_type: 2, // no registration
        audio: "both",
        auto_recording: "none",
      },
    },
  );
}

export async function updateZoomMeeting(
  meetingId: string,
  patch: Partial<{
    topic: string;
    agenda: string;
    start_time: string;
    duration: number;
  }>,
): Promise<void> {
  await zoomFetch<void>(
    "PATCH",
    `/meetings/${encodeURIComponent(meetingId)}`,
    patch,
  );
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  try {
    await zoomFetch<void>(
      "DELETE",
      `/meetings/${encodeURIComponent(meetingId)}`,
    );
  } catch (err) {
    // Best-effort: the meeting may already have been removed in Zoom. Don't
    // block the caller (admin cancelling a session) on a 404 from Zoom.
    const e = err as { status?: number };
    if (e.status === 404) return;
    throw err;
  }
}
