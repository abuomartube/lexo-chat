import { db, chatRoomsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_ROOMS = [
  {
    slug: "speaking-beginner",
    nameEn: "Speaking Room - Beginner",
    nameAr: "غرفة المحادثة - المبتدئين",
    kind: "text",
    level: "A1 → A2",
    category: "speaking",
    descriptionEn:
      "Practice basic English speaking with friendly learners. Build confidence one sentence at a time.",
    descriptionAr:
      "تدرّب على المحادثة الإنجليزية الأساسية مع متعلمين ودودين. ابنِ ثقتك جملةً جملة.",
    emoji: "🎤",
    sortOrder: 10,
  },
  {
    slug: "speaking-intermediate",
    nameEn: "Speaking Room - Intermediate",
    nameAr: "غرفة المحادثة - المتوسط",
    kind: "text",
    level: "B2 → C1",
    category: "speaking",
    descriptionEn:
      "Discuss daily topics and improve your fluency. Open to all intermediate to advanced learners.",
    descriptionAr:
      "ناقش مواضيع يومية وحسّن طلاقتك. مفتوحة لجميع المتعلمين من المتوسط إلى المتقدم.",
    emoji: "🎤",
    sortOrder: 20,
  },
  {
    slug: "voice-only",
    nameEn: "Voice Only Room",
    nameAr: "غرفة الصوت فقط",
    kind: "voice",
    level: null,
    category: "voice",
    descriptionEn:
      "Live audio practice — coming soon. Talk like Clubhouse with raise-hand and moderators.",
    descriptionAr:
      "محادثة صوتية مباشرة — قريباً. تحدّث كما في كلب هاوس مع رفع اليد ومشرفين.",
    emoji: "🎧",
    sortOrder: 30,
  },
  {
    slug: "ielts-speaking",
    nameEn: "IELTS Speaking Room",
    nameAr: "غرفة محادثة الآيلتس",
    kind: "text",
    level: "B1 → C2",
    category: "ielts",
    descriptionEn:
      "Practice IELTS Speaking parts 1, 2, 3 with peers. Get used to the timing and exam format.",
    descriptionAr:
      "تدرّب على أجزاء محادثة الآيلتس 1 و2 و3 مع الزملاء. اعتد على التوقيت وشكل الامتحان.",
    emoji: "🎯",
    sortOrder: 40,
  },
  {
    slug: "casual-chat",
    nameEn: "Casual Chat",
    nameAr: "الدردشة العامة",
    kind: "text",
    level: null,
    category: "casual",
    descriptionEn:
      "Chat about anything — your day, hobbies, weekend plans. The most relaxed room.",
    descriptionAr:
      "تحدّث عن أي شيء — يومك، هواياتك، خطط نهاية الأسبوع. الغرفة الأكثر استرخاءً.",
    emoji: "💬",
    sortOrder: 50,
  },
] as const;

export async function bootstrapChatRooms(): Promise<void> {
  try {
    await db
      .insert(chatRoomsTable)
      .values(
        DEFAULT_ROOMS.map((r) => ({
          slug: r.slug,
          nameEn: r.nameEn,
          nameAr: r.nameAr,
          kind: r.kind,
          level: r.level,
          category: r.category,
          descriptionEn: r.descriptionEn,
          descriptionAr: r.descriptionAr,
          emoji: r.emoji,
          sortOrder: r.sortOrder,
          active: true,
        })),
      )
      .onConflictDoUpdate({
        target: chatRoomsTable.slug,
        set: {
          nameEn: sql`excluded.name_en`,
          nameAr: sql`excluded.name_ar`,
          kind: sql`excluded.kind`,
          level: sql`excluded.level`,
          category: sql`excluded.category`,
          descriptionEn: sql`excluded.description_en`,
          descriptionAr: sql`excluded.description_ar`,
          emoji: sql`excluded.emoji`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
    logger.info({ count: DEFAULT_ROOMS.length }, "Chat rooms bootstrapped");
  } catch (err) {
    logger.error({ err }, "Chat rooms bootstrap failed");
  }
}
