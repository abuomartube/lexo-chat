import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export interface CertificatePdfInput {
  studentName: string;
  courseLabelEn: string;
  courseLabelAr: string;
  tierLabelEn: string;
  tierLabelAr: string;
  completionDate: Date;
  certificateId: string;
}

const here = path.dirname(fileURLToPath(import.meta.url));

function resolveFontPath(): string {
  const candidates = [
    path.resolve(here, "../assets/fonts/Cairo-Regular.ttf"),
    path.resolve(here, "../../assets/fonts/Cairo-Regular.ttf"),
    path.resolve(process.cwd(), "assets/fonts/Cairo-Regular.ttf"),
    path.resolve(
      process.cwd(),
      "artifacts/api-server/assets/fonts/Cairo-Regular.ttf",
    ),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Cairo-Regular.ttf not found. Looked in: ${candidates.join(", ")}`,
  );
}

const NAVY = "#1E2155";
const VIOLET = "#6B2FE6";
const ROYAL = "#4F7FFF";
const SLATE = "#475569";
const GOLD = "#C8A04E";

export async function generateCertificatePdf(
  input: CertificatePdfInput,
): Promise<Buffer> {
  const PDFDocumentMod = await import("pdfkit");
  const PDFDocument = PDFDocumentMod.default;

  const fontPath = resolveFontPath();

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
    info: {
      Title: `EduLexo Certificate ${input.certificateId}`,
      Author: "Abu Omar EduLexo",
      Subject: `${input.courseLabelEn} — ${input.tierLabelEn}`,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.registerFont("Cairo", fontPath);
  doc.font("Cairo");

  const W = doc.page.width;
  const H = doc.page.height;

  // Background gradient (navy → violet diagonal stripe header/footer).
  doc.save();
  doc.rect(0, 0, W, H).fill("#FFFFFF");
  doc.restore();

  // Top decorative band.
  doc.save();
  doc.rect(0, 0, W, 70).fill(NAVY);
  doc.restore();
  doc.save();
  doc.rect(0, 70, W, 8).fill(VIOLET);
  doc.restore();

  // Bottom decorative band.
  doc.save();
  doc.rect(0, H - 70, W, 70).fill(NAVY);
  doc.restore();
  doc.save();
  doc.rect(0, H - 78, W, 8).fill(VIOLET);
  doc.restore();

  // Inner gold border frame.
  const inset = 22;
  doc.save();
  doc
    .lineWidth(1.4)
    .strokeColor(GOLD)
    .rect(inset, inset, W - inset * 2, H - inset * 2)
    .stroke();
  doc.restore();

  // EduLexo wordmark (top band).
  doc
    .fillColor("#FFFFFF")
    .fontSize(14)
    .text("ABU OMAR EDULEXO", 0, 26, { align: "center", width: W });
  doc
    .fillColor("#C9CBE9")
    .fontSize(9)
    .text("Bilingual learning platform · منصة تعلم ثنائية اللغة", 0, 48, {
      align: "center",
      width: W,
    });

  // Title block.
  let cursorY = 110;
  doc
    .fillColor(NAVY)
    .fontSize(34)
    .text("Certificate of Completion", 0, cursorY, {
      align: "center",
      width: W,
    });
  cursorY += 44;
  doc
    .fillColor(VIOLET)
    .fontSize(18)
    .text("شهادة إتمام الدورة", 0, cursorY, {
      align: "center",
      width: W,
      features: ["rlig", "calt", "liga"],
    });
  cursorY += 36;

  // "Awarded to" tagline.
  doc
    .fillColor(SLATE)
    .fontSize(11)
    .text("This certificate is proudly presented to", 0, cursorY, {
      align: "center",
      width: W,
    });
  cursorY += 16;
  doc
    .fillColor(SLATE)
    .fontSize(10)
    .text("تُمنح هذه الشهادة بفخر إلى", 0, cursorY, {
      align: "center",
      width: W,
      features: ["rlig", "calt", "liga"],
    });
  cursorY += 22;

  // Student name (large).
  doc
    .fillColor(NAVY)
    .fontSize(36)
    .text(input.studentName, 0, cursorY, { align: "center", width: W });
  cursorY += 50;

  // Underline beneath name.
  const underlineW = Math.min(360, W * 0.45);
  doc
    .save()
    .lineWidth(0.8)
    .strokeColor(GOLD)
    .moveTo(W / 2 - underlineW / 2, cursorY - 4)
    .lineTo(W / 2 + underlineW / 2, cursorY - 4)
    .stroke()
    .restore();

  // Body line — EN.
  cursorY += 8;
  doc
    .fillColor(SLATE)
    .fontSize(12)
    .text(
      `for successfully completing the ${input.courseLabelEn} programme — ${input.tierLabelEn} tier.`,
      0,
      cursorY,
      { align: "center", width: W },
    );
  cursorY += 22;

  // Body line — AR.
  doc
    .fillColor(SLATE)
    .fontSize(11)
    .text(
      `لإتمامه/ها بنجاح برنامج ${input.courseLabelAr} — مستوى ${input.tierLabelAr}.`,
      0,
      cursorY,
      {
        align: "center",
        width: W,
        features: ["rlig", "calt", "liga"],
      },
    );
  cursorY += 30;

  // Completion date row.
  const dateStrEn = input.completionDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const dateStrAr = input.completionDate.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  doc
    .fillColor(NAVY)
    .fontSize(12)
    .text(`Completed on ${dateStrEn}`, 0, cursorY, {
      align: "center",
      width: W,
    });
  cursorY += 18;
  doc
    .fillColor(NAVY)
    .fontSize(10)
    .text(`بتاريخ ${dateStrAr}`, 0, cursorY, {
      align: "center",
      width: W,
      features: ["rlig", "calt", "liga"],
    });

  // Signature block (bottom-left).
  const sigY = H - 130;
  const sigCenterX = 200;
  doc
    .save()
    .lineWidth(0.8)
    .strokeColor(NAVY)
    .moveTo(sigCenterX - 90, sigY)
    .lineTo(sigCenterX + 90, sigY)
    .stroke()
    .restore();
  doc
    .fillColor(NAVY)
    .fontSize(11)
    .text("Abu Omar", sigCenterX - 90, sigY + 6, {
      align: "center",
      width: 180,
    });
  doc
    .fillColor(SLATE)
    .fontSize(9)
    .text("Founder & Lead Instructor", sigCenterX - 90, sigY + 22, {
      align: "center",
      width: 180,
    });
  doc
    .fillColor(SLATE)
    .fontSize(8)
    .text("المؤسس والمدرب الرئيسي", sigCenterX - 90, sigY + 36, {
      align: "center",
      width: 180,
      features: ["rlig", "calt", "liga"],
    });

  // Certificate ID (bottom-right).
  const idCenterX = W - 200;
  doc
    .save()
    .lineWidth(0.8)
    .strokeColor(NAVY)
    .moveTo(idCenterX - 90, sigY)
    .lineTo(idCenterX + 90, sigY)
    .stroke()
    .restore();
  doc
    .fillColor(NAVY)
    .fontSize(11)
    .text(input.certificateId, idCenterX - 90, sigY + 6, {
      align: "center",
      width: 180,
    });
  doc
    .fillColor(SLATE)
    .fontSize(9)
    .text("Certificate ID", idCenterX - 90, sigY + 22, {
      align: "center",
      width: 180,
    });
  doc
    .fillColor(SLATE)
    .fontSize(8)
    .text("رقم الشهادة", idCenterX - 90, sigY + 36, {
      align: "center",
      width: 180,
      features: ["rlig", "calt", "liga"],
    });

  // Footer text in bottom band.
  doc
    .fillColor("#C9CBE9")
    .fontSize(8)
    .text(
      "Verify this certificate by sharing the Certificate ID with the EduLexo team.",
      0,
      H - 38,
      { align: "center", width: W },
    );

  // Decorative corner accents on inner border.
  doc.save();
  doc.lineWidth(2).strokeColor(ROYAL);
  const accent = 36;
  // top-left
  doc
    .moveTo(inset, inset + accent)
    .lineTo(inset, inset)
    .lineTo(inset + accent, inset)
    .stroke();
  // top-right
  doc
    .moveTo(W - inset - accent, inset)
    .lineTo(W - inset, inset)
    .lineTo(W - inset, inset + accent)
    .stroke();
  // bottom-left
  doc
    .moveTo(inset, H - inset - accent)
    .lineTo(inset, H - inset)
    .lineTo(inset + accent, H - inset)
    .stroke();
  // bottom-right
  doc
    .moveTo(W - inset - accent, H - inset)
    .lineTo(W - inset, H - inset)
    .lineTo(W - inset, H - inset - accent)
    .stroke();
  doc.restore();

  doc.end();
  return done;
}
