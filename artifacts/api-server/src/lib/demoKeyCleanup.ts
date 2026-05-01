// Task #161 — Postgres-backed wiring + nightly scheduler for the
// demo-key cleanup. The pure DELETE logic lives in
// `demo-key-cleanup-source.mjs`; this module wires drizzle/Postgres
// in and exposes:
//
//   * pruneExpiredDemoKeysOnce()      — run a single cleanup pass.
//   * startDemoKeyCleanupSchedule()   — fire one cleanup ~60s after
//     startup (so the first cleanup happens promptly, not 24h after
//     each deploy) and then every 24h thereafter via setInterval.
//
// The admin endpoint in `routes/demo-key.ts` calls
// pruneExpiredDemoKeysOnce() to allow manual / external scheduler
// triggering as well — that satisfies the "tiny endpoint hit by a
// cloud scheduler" half of the task without forcing us to ship a
// brand-new auth surface.
//
// The DELETE itself is a single statement so we don't open a
// transaction; api_usage rows for deleted keys are removed
// automatically by the ON DELETE CASCADE foreign key.

import { db, apiKeysTable } from "@workspace/db";
import { and, eq, lt, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import {
  createDemoKeyCleanup,
  DEMO_USER_ID,
  DEMO_KEY_CLEANUP_GRACE_MS,
  DEMO_KEY_CLEANUP_INTERVAL_MS,
} from "./demo-key-cleanup-source.mjs";

export {
  DEMO_USER_ID,
  DEMO_KEY_CLEANUP_GRACE_MS,
  DEMO_KEY_CLEANUP_INTERVAL_MS,
};

const STARTUP_DELAY_MS = 60 * 1000;

export const pruneExpiredDemoKeysOnce = createDemoKeyCleanup({
  logger,
  async deleteRows({ demoUserId, cutoff }) {
    const deleted = await db
      .delete(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.userId, demoUserId),
          isNotNull(apiKeysTable.expiresAt),
          lt(apiKeysTable.expiresAt, cutoff),
        ),
      )
      .returning({ id: apiKeysTable.id });
    return deleted.length;
  },
});

export interface DemoKeyCleanupSchedule {
  stop: () => void;
}

/**
 * Schedule the nightly demo-key cleanup. Returns a handle whose
 * `.stop()` clears both the startup timer and the recurring interval
 * (used by tests; in production the process simply exits).
 */
export function startDemoKeyCleanupSchedule(
  intervalMs: number = DEMO_KEY_CLEANUP_INTERVAL_MS,
  startupDelayMs: number = STARTUP_DELAY_MS,
): DemoKeyCleanupSchedule {
  const runOnce = () => {
    pruneExpiredDemoKeysOnce().catch((err) => {
      // pruneExpiredDemoKeysOnce already logs via the injected logger;
      // swallow the rejection here so an unhandled-promise-rejection
      // doesn't kill the process on a transient DB hiccup.
      logger.warn({ err }, "Demo-key cleanup pass failed (non-fatal)");
    });
  };

  const startupTimer = setTimeout(runOnce, startupDelayMs);
  // Don't keep the event loop alive purely for cleanup — if the server
  // is otherwise idle (e.g. during tests / shutdown), the process
  // should still be allowed to exit.
  if (typeof startupTimer.unref === "function") startupTimer.unref();

  const interval = setInterval(runOnce, intervalMs);
  if (typeof interval.unref === "function") interval.unref();

  logger.info(
    {
      intervalMs,
      startupDelayMs,
      graceMs: DEMO_KEY_CLEANUP_GRACE_MS,
    },
    "Demo-key cleanup scheduled",
  );

  return {
    stop() {
      clearTimeout(startupTimer);
      clearInterval(interval);
    },
  };
}
