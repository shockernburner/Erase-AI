import { Router, type IRouter, type Request, type Response } from "express";
import { db, apiKeysTable, apiUsageTable } from "@workspace/db";
import { eq, and, isNull, desc, gte, sql } from "drizzle-orm";
import { generateApiKey } from "../middlewares/apiKeyMiddleware";
import { getUserPlan, refreshPlanFromDB } from "../middlewares/planMiddleware";
import { PLAN_REQUEST_LIMITS, getMonthStart, getNextMonthStart } from "../middlewares/rateLimitMiddleware";

const router: IRouter = Router();
router.use(refreshPlanFromDB);

const API_KEY_LIMITS: Record<string, number> = {
  pro: 5,
  business: 20,
  enterprise: 100,
};

function getApiKeyLimit(plan: string): number {
  return API_KEY_LIMITS[plan] ?? 0;
}

function requireApiAccess(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  const plan = getUserPlan(req);
  if (plan === "free") {
    res.status(403).json({
      error: "API access requires a Pro, Business, or Enterprise plan",
      upgrade: true,
    });
    return false;
  }
  return true;
}

router.post("/keys", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    res.status(400).json({ error: "API key name is required" });
    return;
  }

  const existingKeys = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, req.user!.id), isNull(apiKeysTable.revokedAt)));

  const plan = getUserPlan(req);
  const keyLimit = getApiKeyLimit(plan);
  if (existingKeys.length >= keyLimit) {
    res.status(400).json({ error: `Maximum of ${keyLimit} active API keys allowed on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan. Revoke an existing key or upgrade for more.` });
    return;
  }

  const { raw, hash, prefix } = generateApiKey();

  const [apiKey] = await db.insert(apiKeysTable).values({
    userId: req.user!.id,
    keyHash: hash,
    keyPrefix: prefix,
    name: name.trim(),
  }).returning();

  res.status(201).json({
    id: apiKey.id,
    key: raw,
    prefix: apiKey.keyPrefix,
    name: apiKey.name,
    createdAt: apiKey.createdAt.toISOString(),
    warning: "Store this key securely. It will not be shown again.",
  });
});

router.get("/keys", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const keys = await db
    .select({
      id: apiKeysTable.id,
      keyPrefix: apiKeysTable.keyPrefix,
      name: apiKeysTable.name,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
      revokedAt: apiKeysTable.revokedAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, req.user!.id))
    .orderBy(desc(apiKeysTable.createdAt));

  res.json({
    keys: keys.map(k => ({
      id: k.id,
      prefix: k.keyPrefix,
      name: k.name,
      createdAt: k.createdAt.toISOString(),
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      revokedAt: k.revokedAt?.toISOString() ?? null,
      active: !k.revokedAt,
    })),
  });
});

router.delete("/keys/:id", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const keyId = req.params.id as string;

  const [key] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.userId, req.user!.id)));

  if (!key) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  if (key.revokedAt) {
    res.status(400).json({ error: "API key is already revoked" });
    return;
  }

  await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeysTable.id, keyId));

  res.json({ message: "API key revoked successfully" });
});

router.get("/usage", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const plan = getUserPlan(req);
  const limit = PLAN_REQUEST_LIMITS[plan] ?? 0;
  const monthStart = getMonthStart();
  const resetDate = getNextMonthStart();

  try {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiUsageTable)
      .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
      .where(
        and(
          eq(apiKeysTable.userId, req.user!.id),
          gte(apiUsageTable.createdAt, monthStart),
        ),
      );

    const used = totalResult?.count ?? 0;

    const dailyBreakdown = await db
      .select({
        date: sql<string>`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(apiUsageTable)
      .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
      .where(
        and(
          eq(apiKeysTable.userId, req.user!.id),
          gte(apiUsageTable.createdAt, monthStart),
        ),
      )
      .groupBy(sql`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`);

    res.json({
      used,
      limit: limit === -1 ? null : limit,
      unlimited: limit === -1,
      remaining: limit === -1 ? null : Math.max(0, limit - used),
      percentUsed: limit === -1 ? 0 : Math.round((used / limit) * 100),
      periodStart: monthStart.toISOString(),
      periodEnd: resetDate.toISOString(),
      dailyBreakdown: dailyBreakdown.map((d) => ({
        date: d.date,
        requests: d.count,
      })),
    });
  } catch (err) {
    console.error("Usage stats error:", err);
    res.status(500).json({ error: "Failed to fetch usage stats" });
  }
});

export default router;
