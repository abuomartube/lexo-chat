import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapAdminFromEnv } from "./lib/admin-bootstrap";
import { bootstrapTierPrices } from "./lib/price-bootstrap";
import { bootstrapChatRooms } from "./lib/chat-rooms-bootstrap";
import { seedWordsIfEmpty } from "./lib/lexo-flashcards/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  void bootstrapAdminFromEnv();
  void bootstrapTierPrices();
  void bootstrapChatRooms();
  void seedWordsIfEmpty().catch((err) =>
    logger.error({ err }, "Failed to seed Oxford 3000 words"),
  );
});
