// Task #161 — nightly cleanup for expired public-visitor demo API keys.
//
// Background: every successful POST /api/dev/demo-key inserts a row in
// `api_keys` owned by the shared `system-demo-user`. apiKeyAuth already
// rejects keys past `expires_at` at request time, so the rows pose no
// security problem — but they would otherwise grow unboundedly (~one
// per unique visitor IP forever) and slow the per-IP rate-limit lookup
// that scans by `(ip_hash, created_at)`.
//
// This module contains the pure cleanup logic, exported as a `.mjs`
// factory so the node:test suite can import it directly without a
// TypeScript loader. The TS wrapper (`demoKeyCleanup.ts`) wires real
// Postgres in via the `deleteRows` callback; tests pass an in-memory
// fake.
//
// Rules:
//   * Only rows with `user_id = system-demo-user` are touched.
//     Hand-issued user keys are left alone even if they've expired.
//   * A 7-day grace period beyond `expires_at` is preserved so we keep
//     audit / debugging headroom (e.g. "did this 25-hour-old curl call
//     come from a demo key?").
//   * Corresponding `api_usage` rows are pruned automatically by the
//     `ON DELETE CASCADE` foreign key on `api_usage.api_key_id` — see
//     `lib/db/src/schema/auth.ts`. We don't need a second DELETE.

export const DEMO_USER_ID = "system-demo-user";
export const DEMO_KEY_CLEANUP_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
export const DEMO_KEY_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Build the cleanup function.
 *
 * @param {object} deps
 * @param {(args: { demoUserId: string, cutoff: Date }) => Promise<number>} deps.deleteRows
 *   Deletes `api_keys` rows where `user_id = demoUserId` AND
 *   `expires_at IS NOT NULL` AND `expires_at < cutoff`. Returns the
 *   number of rows deleted. Pulled out so tests don't need real
 *   Postgres.
 * @param {() => number} [deps.now] - injectable clock for tests.
 * @param {string} [deps.demoUserId]
 * @param {number} [deps.graceMs]
 * @param {{ info?: (...a: any[]) => void, error?: (...a: any[]) => void }} [deps.logger]
 * @returns {() => Promise<{ deletedCount: number, cutoff: Date }>}
 */
export function createDemoKeyCleanup({
  deleteRows,
  now = () => Date.now(),
  demoUserId = DEMO_USER_ID,
  graceMs = DEMO_KEY_CLEANUP_GRACE_MS,
  logger = { info: () => {}, error: () => {} },
}) {
  if (typeof deleteRows !== "function") {
    throw new Error("createDemoKeyCleanup: deleteRows must be a function");
  }
  if (!Number.isFinite(graceMs) || graceMs < 0) {
    throw new Error("createDemoKeyCleanup: graceMs must be a non-negative number");
  }
  return async function pruneExpiredDemoKeys() {
    const cutoff = new Date(now() - graceMs);
    try {
      const deletedCount = await deleteRows({ demoUserId, cutoff });
      const safeCount = Number.isFinite(deletedCount) ? deletedCount : 0;
      if (safeCount > 0 && logger.info) {
        logger.info(
          { deletedCount: safeCount, cutoff: cutoff.toISOString(), demoUserId },
          "Demo-key cleanup: pruned expired demo keys",
        );
      }
      return { deletedCount: safeCount, cutoff };
    } catch (err) {
      if (logger.error) {
        logger.error({ err, cutoff: cutoff.toISOString() }, "Demo-key cleanup failed");
      }
      throw err;
    }
  };
}
