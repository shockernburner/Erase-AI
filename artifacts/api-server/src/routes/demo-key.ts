import { Router, type IRouter, type Request, type Response } from "express";
import { db, apiKeysTable, apiUsageTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { generateApiKey, hashApiKey } from "../middlewares/apiKeyMiddleware";
import { ipBurstLimit } from "../middlewares/burstLimitMiddleware";
import { hashIp } from "../lib/security/burst-limiter.mjs";
import { logger } from "../lib/logger";
import { pruneExpiredDemoKeysOnce } from "../lib/demoKeyCleanup";
import {
  createDemoKeyHandler,
  createDemoKeyStatusHandler,
  DEMO_USER_ID,
  DEMO_KEY_TTL_MS,
  DEMO_KEY_REQUEST_QUOTA,
  DEMO_KEY_MINT_WINDOW_MS,
} from "./demo-key-source.mjs";

// Task #158 — public-visitor demo API key endpoint.
//
// Lets an unauthenticated visitor on the developer preview mint a real,
// usable `eak_…` key bound to the shared `system-demo-user` account.
// The key is short-lived (24h) and has a hard 50-request lifetime cap
// so a curl example on the marketing page can't be abused to hammer
// our paid AI vendor calls.
//
// Three layers of abuse control, in order of severity:
//   1) ipBurstLimit(): the same per-IP burst limiter every other public
//      route uses (30 req/min). Catches scripted brute-force.
//   2) Per-IP "1 mint per 24h" cap, enforced by counting prior api_keys
//      rows with a matching ip_hash + created_at >= now-24h.
//   3) Per-key 50-request hard cap and 24h TTL — both enforced by
//      apiKeyAuth on every subsequent /api/v1/* or /api/dev/* call.

export {
  DEMO_USER_ID,
  DEMO_KEY_TTL_MS,
  DEMO_KEY_REQUEST_QUOTA,
  DEMO_KEY_MINT_WINDOW_MS,
};

const router: IRouter = Router();

const demoKeyHandler = createDemoKeyHandler({
  generateApiKey,
  hashIp,
  logger,
  async findRecentMintCreatedAt({ ipHash, since }) {
    const recent = await db
      .select({ createdAt: apiKeysTable.createdAt })
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.ipHash, ipHash), gte(apiKeysTable.createdAt, since)))
      .orderBy(apiKeysTable.createdAt)
      .limit(1);
    return recent.length > 0 ? recent[0].createdAt : null;
  },
  async insertApiKey(row) {
    await db.insert(apiKeysTable).values(row);
  },
});

router.post("/demo-key", ipBurstLimit(), demoKeyHandler);

// Task #161 — admin-only manual trigger for the nightly demo-key
// cleanup. The cleanup also runs automatically on a 24h timer (see
// `lib/demoKeyCleanup.ts`); this endpoint exists so an operator (or
// an external cloud scheduler hitting it with an admin session) can
// force a pass without waiting for the next interval.
router.post("/demo-key/cleanup", async (req: Request, res: Response) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const userRole = (req.user as { role?: string } | undefined)?.role;
  if (userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  try {
    const { deletedCount, cutoff } = await pruneExpiredDemoKeysOnce();
    res.json({
      ok: true,
      deletedCount,
      cutoff: cutoff.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Manual demo-key cleanup failed");
    res.status(500).json({
      error: "Demo-key cleanup failed",
      code: "DEMO_KEY_CLEANUP_FAILED",
    });
  }
});

// Task #160 — non-mutating live status read for an issued demo key.
// The developer preview polls this every ~10s to keep the
// "X of 50 requests left" badge accurate and to swap the curl panel
// for a sign-up CTA the moment the key is exhausted or expires.
//
// This is intentionally a separate handler (not piggybacked on
// apiKeyAuth) so that polling never consumes any of the key's 50-request
// lifetime budget. The shared TTL/quota enforcer in apiKeyMiddleware
// remains the single canonical writer of api_usage rows.
const demoKeyStatusHandler = createDemoKeyStatusHandler({
  hashApiKey,
  async findApiKeyByHash(keyHash: string) {
    const [row] = await db
      .select({
        id: apiKeysTable.id,
        revokedAt: apiKeysTable.revokedAt,
        expiresAt: apiKeysTable.expiresAt,
        requestQuota: apiKeysTable.requestQuota,
      })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.keyHash, keyHash));
    return row ?? null;
  },
  async countUsage(apiKeyId: string) {
    const [usage] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiUsageTable)
      .where(eq(apiUsageTable.apiKeyId, apiKeyId));
    return usage?.count ?? 0;
  },
});

router.get("/demo-key/status", ipBurstLimit(), demoKeyStatusHandler);

export default router;
