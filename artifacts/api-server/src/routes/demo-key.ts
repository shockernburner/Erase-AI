import { Router, type IRouter } from "express";
import { db, apiKeysTable } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";
import { generateApiKey } from "../middlewares/apiKeyMiddleware";
import { ipBurstLimit } from "../middlewares/burstLimitMiddleware";
import { hashIp } from "../lib/security/burst-limiter.mjs";
import { logger } from "../lib/logger";
import {
  createDemoKeyHandler,
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

export default router;
