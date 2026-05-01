// Task #158 — handler core for the public-visitor demo API key endpoint.
//
// Exported as a plain `.mjs` factory so the node:test suite can import
// it directly without a TypeScript loader. The Express route module
// (`demo-key.ts`) imports this and wires the real dependencies in;
// tests inject mocks for db / generateApiKey / hashIp / now.
//
// The handler enforces:
//   * one mint per IP per `mintWindowMs` (default 24h), counted from
//     `apiKeysTable` rows where `ipHash` matches and `createdAt` is
//     within the window. We refuse re-issuance rather than re-emitting
//     the previous key — see route docs for why.
//   * sets a `Retry-After` header (in seconds) on the 429 so well-behaved
//     CLI clients back off correctly.
//
// On success it inserts the new row with `expiresAt`, `requestQuota`,
// and `ipHash` populated, and returns the raw key + curl example.

export const DEMO_USER_ID = "system-demo-user";
export const DEMO_KEY_TTL_MS = 24 * 60 * 60 * 1000;
export const DEMO_KEY_REQUEST_QUOTA = 50;
export const DEMO_KEY_MINT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function buildCurlExample(origin, key) {
  return `curl -X POST ${origin}/api/v1/datasets/upload \\
  -H "Authorization: Bearer ${key}" \\
  -F "file=@dataset.csv"`;
}

/**
 * Build the demo-key Express handler.
 *
 * @param {object} deps
 * @param {(args: { ipHash: string, since: Date }) => Promise<Date | null>} deps.findRecentMintCreatedAt
 *   Returns the createdAt of the earliest demo key minted from this
 *   IP within the `since` window, or null if none. Pulled out so tests
 *   don't need a real Postgres.
 * @param {(row: object) => Promise<void>} deps.insertApiKey
 *   Persists the new api_keys row.
 * @param {() => { raw: string, hash: string, prefix: string }} deps.generateApiKey
 * @param {(ip: string) => string} deps.hashIp
 * @param {(req: import("express").Request) => string} [deps.getRequestIp]
 *   Defaults to `req.ip ?? req.socket?.remoteAddress ?? "unknown"`.
 * @param {() => number} [deps.now] - injectable clock for tests.
 * @param {{ error: (...args: any[]) => void }} [deps.logger]
 * @param {number} [deps.mintWindowMs]
 * @param {number} [deps.ttlMs]
 * @param {number} [deps.requestQuota]
 */
export function createDemoKeyHandler({
  findRecentMintCreatedAt,
  insertApiKey,
  generateApiKey,
  hashIp,
  getRequestIp = (req) => req.ip ?? req.socket?.remoteAddress ?? "unknown",
  now = () => Date.now(),
  logger = { error: () => {} },
  mintWindowMs = DEMO_KEY_MINT_WINDOW_MS,
  ttlMs = DEMO_KEY_TTL_MS,
  requestQuota = DEMO_KEY_REQUEST_QUOTA,
}) {
  return async function demoKeyHandler(req, res) {
    const ip = getRequestIp(req);
    const ipHash = hashIp(ip);

    try {
      const since = new Date(now() - mintWindowMs);
      const recentCreatedAt = await findRecentMintCreatedAt({ ipHash, since });

      if (recentCreatedAt) {
        const retryAt = new Date(recentCreatedAt.getTime() + mintWindowMs);
        const retryAfterSec = Math.max(1, Math.ceil((retryAt.getTime() - now()) / 1000));
        res.setHeader("Retry-After", String(retryAfterSec));
        res.status(429).json({
          error:
            "A demo API key has already been issued from this network in the last 24 hours. Sign up for a free account to get your own key.",
          code: "DEMO_KEY_IP_RATE_LIMITED",
          retryAt: retryAt.toISOString(),
          retryAfter: retryAfterSec,
        });
        return;
      }

      const { raw, hash, prefix } = generateApiKey();
      const expiresAt = new Date(now() + ttlMs);

      await insertApiKey({
        userId: DEMO_USER_ID,
        keyHash: hash,
        keyPrefix: prefix,
        name: `demo-${ipHash.slice(0, 8)}`,
        expiresAt,
        requestQuota,
        ipHash,
      });

      const origin = `${req.protocol}://${req.get("host")}`;
      res.json({
        key: raw,
        expiresAt: expiresAt.toISOString(),
        quota: requestQuota,
        quotaRemaining: requestQuota,
        curlExample: buildCurlExample(origin, raw),
      });
    } catch (err) {
      logger.error({ err, ipHash }, "Failed to mint demo API key");
      res.status(500).json({
        error: "Could not mint a demo API key right now. Please try again shortly.",
        code: "DEMO_KEY_MINT_FAILED",
      });
    }
  };
}
