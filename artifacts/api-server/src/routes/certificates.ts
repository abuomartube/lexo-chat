import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  certificatesTable,
  CERTIFICATE_COURSE_VALUES,
  ISSUABLE_CERTIFICATE_COURSE_VALUES,
} from "@workspace/db";
import { requireAuth, requireAdmin, getUserById } from "../lib/auth";
import { generateCertificatePdf } from "../lib/certificate-pdf";

const router: IRouter = Router();

const COURSE_LABELS_EN: Record<string, string> = {
  intro: "LEXO Intro",
  english: "LEXO for English",
};

const COURSE_LABELS_AR: Record<string, string> = {
  intro: "ليكسو للتأسيس",
  english: "ليكسو للغة الإنجليزية",
};

const TIER_LABELS_AR: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  advance: "متقدم",
  complete: "شامل",
  foundation: "تأسيس",
  basic: "أساسي",
};

function titleCase(s: string): string {
  return s
    .split(/[\s_-]+/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(" ");
}

function courseLabelEn(course: string): string {
  return COURSE_LABELS_EN[course] ?? course;
}

function courseLabelAr(course: string): string {
  return COURSE_LABELS_AR[course] ?? course;
}

function tierLabelEn(tier: string): string {
  return titleCase(tier);
}

function tierLabelAr(tier: string): string {
  return TIER_LABELS_AR[tier.toLowerCase()] ?? titleCase(tier);
}

async function allocateCertificateId(): Promise<string> {
  const result = await db.execute(sql`SELECT nextval('certificates_seq') AS n`);
  const rows = result.rows as { n: number | string }[];
  const n = Number(rows[0]?.n ?? 0);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Failed to allocate certificate sequence");
  }
  const year = new Date().getUTCFullYear();
  return `EDULEXO-${year}-${String(n).padStart(6, "0")}`;
}

const IssueBody = z.object({
  userId: z.string().uuid(),
  course: z.enum(ISSUABLE_CERTIFICATE_COURSE_VALUES),
  tier: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((s) => s.toLowerCase()),
  enrollmentId: z.string().uuid().optional(),
  completionDate: z.string().optional(),
});

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

router.post(
  "/admin/certificates/issue",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = IssueBody.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: "Invalid body", details: parsed.error.flatten() });
        return;
      }
      const { userId, course, tier, enrollmentId } = parsed.data;
      const completionDate = parsed.data.completionDate
        ? new Date(parsed.data.completionDate)
        : new Date();
      if (Number.isNaN(completionDate.getTime())) {
        res.status(400).json({ error: "Invalid completionDate" });
        return;
      }

      const [student] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      const [existing] = await db
        .select({ id: certificatesTable.id })
        .from(certificatesTable)
        .where(
          and(
            eq(certificatesTable.userId, userId),
            eq(certificatesTable.course, course),
            eq(certificatesTable.tier, tier),
            isNull(certificatesTable.revokedAt),
          ),
        )
        .limit(1);
      if (existing) {
        res.status(409).json({
          error: "Active certificate already exists for this user/course/tier",
        });
        return;
      }

      const certificateId = await allocateCertificateId();
      const completionDateStr = completionDate.toISOString().slice(0, 10);
      try {
        const [row] = await db
          .insert(certificatesTable)
          .values({
            userId,
            course,
            tier,
            enrollmentId: enrollmentId ?? null,
            certificateId,
            completionDate: completionDateStr,
            issuedBy: req.session.userId ?? null,
          })
          .returning();
        res.status(201).json({ certificate: row });
        return;
      } catch (err) {
        if (isUniqueViolation(err)) {
          res.status(409).json({
            error:
              "Active certificate already exists for this user/course/tier",
          });
          return;
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  },
);

const ListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  course: z.enum(CERTIFICATE_COURSE_VALUES).optional(),
  status: z.enum(["active", "revoked"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

router.get("/admin/certificates", requireAdmin, async (req, res, next) => {
  try {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }
    const { search, course, status, limit } = parsed.data;
    const conds = [] as ReturnType<typeof eq>[];
    if (course) conds.push(eq(certificatesTable.course, course));
    if (status === "active") conds.push(isNull(certificatesTable.revokedAt));
    if (status === "revoked") {
      conds.push(
        sql`${certificatesTable.revokedAt} IS NOT NULL` as ReturnType<
          typeof eq
        >,
      );
    }
    if (search) {
      const like = `%${search}%`;
      conds.push(
        or(
          ilike(usersTable.name, like),
          ilike(usersTable.email, like),
          ilike(certificatesTable.certificateId, like),
        ) as ReturnType<typeof eq>,
      );
    }

    const rows = await db
      .select({
        id: certificatesTable.id,
        userId: certificatesTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
        course: certificatesTable.course,
        tier: certificatesTable.tier,
        certificateId: certificatesTable.certificateId,
        completionDate: certificatesTable.completionDate,
        issuedAt: certificatesTable.issuedAt,
        revokedAt: certificatesTable.revokedAt,
        revokeReason: certificatesTable.revokeReason,
      })
      .from(certificatesTable)
      .innerJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(certificatesTable.issuedAt))
      .limit(limit ?? 200);

    res.json({ certificates: rows });
  } catch (err) {
    next(err);
  }
});

const RevokeBody = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

router.post(
  "/admin/certificates/:id/revoke",
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = RevokeBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid body" });
        return;
      }
      const id = String(req.params.id);
      const [updated] = await db
        .update(certificatesTable)
        .set({
          revokedAt: new Date(),
          revokeReason: parsed.data.reason ?? null,
        })
        .where(
          and(
            eq(certificatesTable.id, id),
            isNull(certificatesTable.revokedAt),
          ),
        )
        .returning();
      if (!updated) {
        res
          .status(404)
          .json({ error: "Certificate not found or already revoked" });
        return;
      }
      res.json({ certificate: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/certificates/mine", requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: certificatesTable.id,
        course: certificatesTable.course,
        tier: certificatesTable.tier,
        certificateId: certificatesTable.certificateId,
        completionDate: certificatesTable.completionDate,
        issuedAt: certificatesTable.issuedAt,
      })
      .from(certificatesTable)
      .where(
        and(
          eq(certificatesTable.userId, req.session.userId!),
          isNull(certificatesTable.revokedAt),
        ),
      )
      .orderBy(desc(certificatesTable.issuedAt));
    res.json({ certificates: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/certificates/:id/pdf", requireAuth, async (req, res, next) => {
  try {
    const [row] = await db
      .select({
        id: certificatesTable.id,
        userId: certificatesTable.userId,
        userName: usersTable.name,
        course: certificatesTable.course,
        tier: certificatesTable.tier,
        certificateId: certificatesTable.certificateId,
        completionDate: certificatesTable.completionDate,
        revokedAt: certificatesTable.revokedAt,
      })
      .from(certificatesTable)
      .innerJoin(usersTable, eq(usersTable.id, certificatesTable.userId))
      .where(eq(certificatesTable.id, String(req.params.id)))
      .limit(1);
    // Authorization: owner OR admin. Resolve admin status first so we never
    // leak existence/revocation state to non-authorized callers.
    const me = await getUserById(req.session.userId!);
    const isAdmin = !!me && me.role === "admin";

    if (!row) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }
    if (!isAdmin && row.userId !== req.session.userId) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }
    if (row.revokedAt) {
      res.status(410).json({ error: "Certificate has been revoked" });
      return;
    }

    const completionDate = new Date(`${row.completionDate}T00:00:00Z`);
    const pdf = await generateCertificatePdf({
      studentName: row.userName,
      courseLabelEn: courseLabelEn(row.course),
      courseLabelAr: courseLabelAr(row.course),
      tierLabelEn: tierLabelEn(row.tier),
      tierLabelAr: tierLabelAr(row.tier),
      completionDate,
      certificateId: row.certificateId,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${row.certificateId}.pdf"`,
    );
    res.setHeader("Content-Length", String(pdf.length));
    res.end(pdf);
  } catch (err) {
    next(err);
  }
});

export default router;
