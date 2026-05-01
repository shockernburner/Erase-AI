// Shared demo-key TTL + per-key request quota gate (task #158).
// Bound by both apiKeyAuth (/api/v1/*) and sessionOrApiKeyAuth
// (/api/dev/*) so a 24h / 50-request demo key is enforced identically
// on both surfaces, on every endpoint they expose.
//
// For keys WITH a requestQuota (demo keys), the auth middleware is
// the single canonical writer of api_usage rows. trackApiUsage skips
// these requests to avoid double-counting. For keys WITHOUT a quota
// (normal user keys), trackApiUsage handles billing/cost logging on
// the routes that mount it.

/**
 * @typedef {{ id: string, expiresAt: Date|null, requestQuota: number|null }} ApiKeyRow
 * @typedef {{ ok: true } | { ok: false, status: number, body: Record<string, unknown> }} EnforcementResult
 * @typedef {{
 *   countUsage: (apiKeyId: string) => Promise<number>,
 *   insertUsage: (args: { apiKeyId: string, endpoint: string }) => Promise<void>,
 * }} EnforcementStore
 */

/**
 * Pure decision over (apiKey, used, now).
 *
 * @param {ApiKeyRow} apiKey
 * @param {number} used
 * @param {number} now epoch ms
 * @returns {EnforcementResult}
 */
export function decideApiKeyEnforcement(apiKey, used, now) {
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= now) {
    return {
      ok: false,
      status: 401,
      body: {
        error: "Demo API key has expired. Mint a new one from the developer preview.",
        code: "DEMO_KEY_EXPIRED",
      },
    };
  }
  if (apiKey.requestQuota != null && used >= apiKey.requestQuota) {
    return {
      ok: false,
      status: 429,
      body: {
        error: `Demo API key quota exhausted (${apiKey.requestQuota} requests). Sign up for a free account to get your own key.`,
        code: "DEMO_KEY_QUOTA_EXCEEDED",
        limit: apiKey.requestQuota,
        used,
      },
    };
  }
  return { ok: true };
}

/**
 * @param {EnforcementStore} store
 */
export function createApiKeyEnforcer(store) {
  if (
    !store ||
    typeof store.countUsage !== "function" ||
    typeof store.insertUsage !== "function"
  ) {
    throw new Error("createApiKeyEnforcer requires { countUsage, insertUsage }");
  }
  /**
   * @param {ApiKeyRow} apiKey
   * @param {{ method: string, path: string }} req
   * @returns {Promise<EnforcementResult>}
   */
  return async function enforce(apiKey, req) {
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
      return decideApiKeyEnforcement(apiKey, 0, Date.now());
    }
    if (apiKey.requestQuota == null) {
      return { ok: true };
    }
    const used = await store.countUsage(apiKey.id);
    const decision = decideApiKeyEnforcement(apiKey, used, Date.now());
    if (!decision.ok) return decision;
    // Single writer for demo-key usage rows. trackApiUsage skips
    // quota-tracked requests so we don't double-count.
    try {
      await store.insertUsage({
        apiKeyId: apiKey.id,
        endpoint: req.method + " " + req.path,
      });
    } catch {
      // Non-fatal: counter row failure shouldn't block the request.
    }
    return { ok: true };
  };
}
