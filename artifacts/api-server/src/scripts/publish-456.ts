import { db, englishBooksTable, englishQuizzesTable } from "@workspace/db";
import { checkBookPublishable } from "../lib/curriculum-ingest.js";
import { inArray } from "drizzle-orm";

const ids = [4, 5, 6];
const out: any = { gate: {}, before: [], after: [] };

out.before = await db
  .select({
    id: englishBooksTable.id,
    status: englishBooksTable.status,
    tier: englishBooksTable.tier,
    n: englishBooksTable.bookNumber,
  })
  .from(englishBooksTable)
  .where(inArray(englishBooksTable.id, ids));

for (const id of ids) {
  out.gate[id] = await checkBookPublishable(id);
}

const allOk = ids.every((id) => out.gate[id].ok);
if (!allOk) {
  console.log(JSON.stringify({ ok: false, ...out }, null, 2));
  process.exit(1);
}

await db
  .update(englishBooksTable)
  .set({ status: "published", updatedAt: new Date() })
  .where(inArray(englishBooksTable.id, ids));
await db
  .update(englishQuizzesTable)
  .set({ status: "published", updatedAt: new Date() })
  .where(inArray(englishQuizzesTable.bookId, ids));

out.after = await db
  .select({
    id: englishBooksTable.id,
    status: englishBooksTable.status,
    tier: englishBooksTable.tier,
    n: englishBooksTable.bookNumber,
  })
  .from(englishBooksTable)
  .where(inArray(englishBooksTable.id, ids));
out.quizzes = await db
  .select({
    bookId: englishQuizzesTable.bookId,
    status: englishQuizzesTable.status,
    qn: englishQuizzesTable.quizNumber,
  })
  .from(englishQuizzesTable)
  .where(inArray(englishQuizzesTable.bookId, ids));

console.log(JSON.stringify({ ok: true, ...out }, null, 2));
process.exit(0);
