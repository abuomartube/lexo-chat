import { readFileSync } from "node:fs";
import { stageBookDraft } from "../lib/curriculum-ingest.js";

async function main() {
  const path = process.argv[2] ?? ".local/book1-full.json";
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const result = await stageBookDraft(raw);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
