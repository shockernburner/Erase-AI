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

// Task #160 — non-mutating live status read for a demo key. Lets the
// developer preview poll quotaRemaining + expiresAt without consuming
// any of the key's 50-request lifetime budget. Returns the canonical
// DEMO_KEY_EXPIRED / DEMO_KEY_QUOTA_EXCEEDED codes (same vocabulary as
// the auth-time enforcer) so the UI can wire one switch on `code`.

const WELL_FORMED_KEY = /^eak_[A-Za-z0-9_-]{8,}$/;

export function isWellFormedDemoKey(token) {
  return typeof token === "string" && WELL_FORMED_KEY.test(token);
}

/**
 * @param {object} deps
 * @param {(keyHash: string) => Promise<null | {
 *   id: string,
 *   revokedAt: Date|null,
 *   expiresAt: Date|null,
 *   requestQuota: number|null,
 * }>} deps.findApiKeyByHash
 * @param {(apiKeyId: string) => Promise<number>} deps.countUsage
 * @param {(token: string) => string} deps.hashApiKey
 * @param {() => number} [deps.now]
 */
export function createDemoKeyStatusHandler({
  findApiKeyByHash,
  countUsage,
  hashApiKey,
  now = () => Date.now(),
}) {
  if (
    typeof findApiKeyByHash !== "function" ||
    typeof countUsage !== "function" ||
    typeof hashApiKey !== "function"
  ) {
    throw new Error(
      "createDemoKeyStatusHandler requires { findApiKeyByHash, countUsage, hashApiKey }",
    );
  }

  return async function demoKeyStatusHandler(req, res) {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Missing or invalid Authorization header. Use: Bearer <demo key>",
        code: "AUTH_REQUIRED",
      });
      return;
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: "API key is empty", code: "AUTH_INVALID_FORMAT" });
      return;
    }
    if (!isWellFormedDemoKey(token)) {
      res.status(401).json({
        error: "API key format is invalid. Expected an eak_… key.",
        code: "AUTH_INVALID_FORMAT",
      });
      return;
    }

    const keyHash = hashApiKey(token);
    let apiKey;
    try {
      apiKey = await findApiKeyByHash(keyHash);
    } catch {
      res.status(500).json({
        error: "Could not read demo key status right now. Please try again shortly.",
        code: "DEMO_KEY_STATUS_FAILED",
      });
      return;
    }
    if (!apiKey) {
      res.status(401).json({ error: "Demo key not recognized", code: "AUTH_INVALID_KEY" });
      return;
    }
    if (apiKey.revokedAt) {
      res.status(401).json({ error: "Demo key has been revoked", code: "AUTH_REVOKED_KEY" });
      return;
    }
    if (apiKey.requestQuota == null) {
      res.status(400).json({
        error: "This endpoint only reports status for demo keys.",
        code: "NOT_A_DEMO_KEY",
      });
      return;
    }

    let used = 0;
    try {
      used = await countUsage(apiKey.id);
    } catch {
      // Treat a counter read failure as 0 used; the auth-time enforcer
      // is still the source of truth that blocks usage. We never want a
      // status poll to falsely report exhaustion.
      used = 0;
    }

    const quota = apiKey.requestQuota;
    const remaining = Math.max(0, quota - used);
    const expiresAtMs = apiKey.expiresAt ? apiKey.expiresAt.getTime() : null;
    const expired = expiresAtMs != null && expiresAtMs <= now();
    const exhausted = !expired && used >= quota;
    const code = expired
      ? "DEMO_KEY_EXPIRED"
      : exhausted
      ? "DEMO_KEY_QUOTA_EXCEEDED"
      : "DEMO_KEY_OK";

    res.json({
      quota,
      used,
      quotaRemaining: remaining,
      expiresAt: apiKey.expiresAt ? apiKey.expiresAt.toISOString() : null,
      expired,
      exhausted,
      code,
    });
  };
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
