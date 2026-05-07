import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, uploadGrantsTable } from "@workspace/db";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { requireAuth, getUserById } from "../lib/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * Allow-listed MIME types for uploads. Bank-transfer proofs are the only
 * thing this endpoint is used for today, so we restrict to images, PDF and
 * Word docs. Server-side enforcement complements the client `accept=` and
 * stops a malicious client posting `application/x-msdownload` etc.
 */
export const ALLOWED_UPLOAD_CONTENT_TYPES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // LEXO Chat voice notes — MediaRecorder default mime varies by browser.
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

/**
 * Per-user rate limit: at most this many upload-URL grants minted in any
 * 1-hour window. The grant table doubles as our counter — no extra storage.
 * 20 is generous (5+ retries per checkout × 3 checkouts/hour).
 */
const UPLOAD_RATE_LIMIT_PER_HOUR = 20;

const RequestUploadUrlBody = z.object({
  name: z.string().min(1).max(256),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(20 * 1024 * 1024), // 20 MB cap
  contentType: z.string().min(1).max(128),
});

// NOTE (defense-in-depth, deferred): the `size` field above is checked
// server-side, but the presigned PUT URL itself does NOT carry a
// content-length constraint, so a determined attacker could PUT a much
// larger blob than they declared. The downside is bucket-cost abuse, not
// auth bypass. If this becomes a problem, switch `signObjectURL` to
// emit conditions like x-goog-content-length-range and verify after upload.

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload. The client sends JSON metadata
 * (name, size, contentType) — NOT the file. The browser then uploads the
 * file directly to the returned presigned URL via PUT.
 *
 * Auth: any logged-in user. The `objectPath` returned is owned by the
 * uploader and locked down by ACL on first use (see checkout route).
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    const body = parsed.data;

    // Phase-7a: server-side MIME allow-list. The client also restricts via
    // `accept=` but that's trivially bypassed; this is the real gate.
    const lowerType = body.contentType.toLowerCase().split(";")[0].trim();
    if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(lowerType)) {
      res.status(400).json({
        error: "unsupported_content_type",
        contentType: body.contentType,
      });
      return;
    }

    const userId = req.session.userId!;

    // Phase-7a: per-user rate limit. Counts grants minted in the last hour
    // — covers both the legitimate flow (a few retries per attempt) and the
    // pathological (script hammering the endpoint to exhaust upload-URL
    // signing quota or inflate bucket cost).
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [{ count: recentCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(uploadGrantsTable)
      .where(
        and(
          eq(uploadGrantsTable.userId, userId),
          gt(uploadGrantsTable.createdAt, oneHourAgo),
        ),
      );
    if (recentCount >= UPLOAD_RATE_LIMIT_PER_HOUR) {
      req.log.warn(
        { userId, recentCount, limit: UPLOAD_RATE_LIMIT_PER_HOUR },
        "upload-url request rate-limited",
      );
      res.status(429).json({
        error: "rate_limited",
        retryAfterSeconds: 60 * 60,
      });
      return;
    }

    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      // Bind the issued path to the requesting user. Anything that later
      // attaches this object (e.g. POST /api/checkout/bank-transfer) must
      // verify ownership against this row to prevent IDOR. Grants live for
      // 1 hour — well past the presigned URL's 15-minute TTL but short
      // enough that abandoned uploads age out.
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db
        .insert(uploadGrantsTable)
        .values({ objectPath, userId, expiresAt });

      res.json({ uploadURL, objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "upload_url_failed" });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve uploaded objects (e.g. bank-transfer payment proofs). Protected:
 * the object's ACL determines whether the viewer is allowed. Admins always
 * pass via `isAdmin` check on the request user.
 */
router.get(
  "/storage/objects/*path",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectPath = `/objects/${wildcardPath}`;
      const objectFile =
        await objectStorageService.getObjectEntityFile(objectPath);

      const userId = req.session.userId;
      const user = userId ? await getUserById(userId) : undefined;
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        const canAccess = await objectStorageService.canAccessObjectEntity({
          userId,
          objectFile,
          requestedPermission: ObjectPermission.READ,
        });
        if (!canAccess) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      }

      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      // Defense-in-depth for proof attachments: even though we re-validate
      // MIME against an allow-list both at upload-grant time and again
      // sink-side via GCS metadata, an attacker can still PUT arbitrary
      // bytes while *declaring* an allow-listed Content-Type. `nosniff`
      // forces the browser to honour the served Content-Type rather than
      // sniff the bytes — so even if the bytes look like HTML/JS, the
      // admin's browser will not interpret them as HTML and will not
      // execute embedded scripts. CSP adds a second layer that disables
      // any external loads/inline scripts the document might attempt.
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      req.log.error({ err: error }, "Error serving object");
      res.status(500).json({ error: "serve_failed" });
    }
  },
);

export default router;
