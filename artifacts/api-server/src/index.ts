import app from "./app";
import { logger } from "./lib/logger";
import { seedDemoData } from "./seed";
import { runStartupMigrations } from "./migrations";
import { startDemoKeyCleanupSchedule } from "./lib/demoKeyCleanup";

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

const server = app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await runStartupMigrations();
  await seedDemoData();
  // Task #161 — kick off the nightly cleanup of expired
  // public-visitor demo API keys. Runs once shortly after startup
  // and then every 24h thereafter.
  startDemoKeyCleanupSchedule();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error({ port }, "Port already in use. Kill the stale process or choose a different PORT.");
  } else {
    logger.error({ err }, "Server startup error");
  }
  process.exit(1);
});
