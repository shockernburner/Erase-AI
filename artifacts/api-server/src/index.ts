import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { logger } from "./lib/logger";
import { seedDemoData } from "./seed";
import { runStartupMigrations } from "./migrations";
import { startDemoKeyCleanupSchedule } from "./lib/demoKeyCleanup";
import { getStripeSync } from "./lib/stripe";

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
  await initStripe();
  // Task #161 — kick off the nightly cleanup of expired
  // public-visitor demo API keys. Runs once shortly after startup
  // and then every 24h thereafter.
  startDemoKeyCleanupSchedule();
});

// Initialize the Stripe integration: create/upgrade the `stripe.*` schema,
// register the managed webhook, and backfill product/price/subscription data.
// This is intentionally NON-FATAL — if Stripe isn't connected yet (or briefly
// unreachable) the rest of the API must keep serving. Once Stripe is connected
// in the Integrations tab and the server restarts, initialization completes.
async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("Skipping Stripe init: DATABASE_URL is not set");
    return;
  }

  try {
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    // Managed webhook setup is isolated in its own try/catch: a webhook failure
    // must NOT prevent the catalog backfill below from running, otherwise a
    // single bad boot leaves stripe.products/prices empty and checkout returns
    // PRICE_NOT_FOUND until the next restart.
    try {
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
      if (domain) {
        const webhookResult = await stripeSync.findOrCreateManagedWebhook(
          `https://${domain}/api/stripe/webhook`,
        );
        logger.info(
          { url: webhookResult?.url ?? "setup complete" },
          "Stripe managed webhook configured",
        );
      } else {
        logger.warn("REPLIT_DOMAINS not set — skipping managed webhook setup");
      }
    } catch (err) {
      logger.error({ err }, "Stripe managed webhook setup failed (continuing to backfill)");
    }

    // Backfill runs in the background; failures here are logged, not fatal.
    // NOTE: `object: "all"` is REQUIRED. Calling syncBackfill() with no args
    // makes `object` default to a method reference, the internal switch falls
    // through to its no-op default, and NOTHING is synced (products/prices
    // never land in the stripe.* schema, so checkout can't resolve a price).
    stripeSync
      .syncBackfill({ object: "all" })
      .then(() => logger.info("Stripe data backfill complete"))
      .catch((err) => logger.error({ err }, "Stripe data backfill failed"));
  } catch (err) {
    logger.warn(
      { err },
      "Stripe init skipped (integration not connected or unavailable) — payments disabled until connected",
    );
  }
}

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error({ port }, "Port already in use. Kill the stale process or choose a different PORT.");
  } else {
    logger.error({ err }, "Server startup error");
  }
  process.exit(1);
});
