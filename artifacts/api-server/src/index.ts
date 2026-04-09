import app from "./app";
import { logger } from "./lib/logger";
import { seedDemoData } from "./seed";
import { runStartupMigrations } from "./migrations";
import { execSync } from "child_process";

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

try {
  execSync(`fuser -k ${port}/tcp 2>/dev/null`, { stdio: "ignore" });
} catch {}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await runStartupMigrations();
  await seedDemoData();
});
