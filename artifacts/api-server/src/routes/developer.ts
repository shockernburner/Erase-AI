import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { db, apiKeysTable, apiUsageTable, usersTable, webhooksTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and, isNull, desc, gte, sql } from "drizzle-orm";
import { generateApiKey } from "../middlewares/apiKeyMiddleware";
import { getUserPlan, refreshPlanFromDB } from "../middlewares/planMiddleware";
import {
  PLAN_REQUEST_LIMITS,
  PLAN_SPEND_BUDGET_MICROS,
  getMonthStart,
  getNextMonthStart,
} from "../middlewares/rateLimitMiddleware";
import { resolveSpendBudget } from "../lib/security/spend-source.mjs";
import { sendTestWebhook, resolveAndValidateUrl } from "../lib/webhookDispatcher";

const router: IRouter = Router();
router.use(refreshPlanFromDB);

const API_KEY_LIMITS: Record<string, number> = {
  personal: 2,
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
      error: "API access requires a Personal, Pro, Business, or Enterprise plan",
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
      .select({
        count: sql<number>`count(*)::int`,
        spend: sql<number>`COALESCE(SUM(${apiUsageTable.costMicros}), 0)::bigint`,
        tokens: sql<number>`COALESCE(SUM(${apiUsageTable.tokens}), 0)::bigint`,
      })
      .from(apiUsageTable)
      .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
      .where(
        and(
          eq(apiKeysTable.userId, req.user!.id),
          gte(apiUsageTable.createdAt, monthStart),
        ),
      );

    const used = totalResult?.count ?? 0;
    const usedMicros = Number(totalResult?.spend ?? 0);
    const tokensUsed = Number(totalResult?.tokens ?? 0);

    const [overrideRow] = await db
      .select({ override: usersTable.apiSpendOverrideMicros })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));
    const override = overrideRow?.override ?? null;
    const spendBudgetMicros = resolveSpendBudget({
      plan,
      override: override === null ? null : Number(override),
    });
    const spendUnlimited = spendBudgetMicros === -1;
    const spendNoAccess = spendBudgetMicros === 0;
    const spendPercent = spendUnlimited || spendBudgetMicros <= 0
      ? 0
      : Math.round((usedMicros / spendBudgetMicros) * 100);

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
      spend: {
        usedMicros,
        limitMicros: spendUnlimited ? null : (spendNoAccess ? 0 : spendBudgetMicros),
        unlimited: spendUnlimited,
        noAccess: spendNoAccess,
        remainingMicros: spendUnlimited
          ? null
          : Math.max(0, spendBudgetMicros - usedMicros),
        percentUsed: spendPercent,
        tokensUsed,
        overrideActive: override !== null,
        // Convenience for the dashboard UI — same shape but in dollars.
        usedUsd: usedMicros / 1_000_000,
        limitUsd: spendUnlimited ? null : (spendNoAccess ? 0 : spendBudgetMicros / 1_000_000),
      },
    });
  } catch (err) {
    console.error("Usage stats error:", err);
    res.status(500).json({ error: "Failed to fetch usage stats" });
  }
});

router.get("/webhooks", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;
  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.userId, req.user!.id))
      .limit(1);

    if (!webhook) {
      res.json({ webhook: null });
      return;
    }

    res.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        isActive: webhook.isActive === 1,
        createdAt: webhook.createdAt.toISOString(),
        updatedAt: webhook.updatedAt.toISOString(),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch webhook" });
  }
});

router.post("/webhooks", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const { url } = req.body as { url?: string };
  if (!url || !url.trim()) {
    res.status(400).json({ error: "Webhook URL is required" });
    return;
  }

  const urlCheck = await resolveAndValidateUrl(url);
  if (!urlCheck.safe) {
    res.status(400).json({ error: urlCheck.error });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.userId, req.user!.id))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "You already have a webhook registered. Update or delete it first." });
      return;
    }

    const secret = randomBytes(32).toString("hex");

    const [webhook] = await db.insert(webhooksTable).values({
      userId: req.user!.id,
      url: url.trim(),
      secret,
    }).returning();

    res.status(201).json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        isActive: webhook.isActive === 1,
        createdAt: webhook.createdAt.toISOString(),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

router.patch("/webhooks/:id", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const webhookId = req.params.id as string;
  const { url, isActive } = req.body as { url?: string; isActive?: boolean };

  if (url !== undefined) {
    if (!url.trim()) {
      res.status(400).json({ error: "URL cannot be empty" });
      return;
    }
    const patchUrlCheck = await resolveAndValidateUrl(url);
    if (!patchUrlCheck.safe) {
      res.status(400).json({ error: patchUrlCheck.error });
      return;
    }
  }

  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, req.user!.id)));

    if (!webhook) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (url !== undefined) {
      updates.url = url.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = isActive ? 1 : 0;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No updates provided" });
      return;
    }

    updates.updatedAt = new Date();

    await db.update(webhooksTable).set(updates).where(eq(webhooksTable.id, webhookId));

    const [updated] = await db
      .select()
      .from(webhooksTable)
      .where(eq(webhooksTable.id, webhookId));

    res.json({
      webhook: {
        id: updated.id,
        url: updated.url,
        isActive: updated.isActive === 1,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to update webhook" });
  }
});

router.delete("/webhooks/:id", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const webhookId = req.params.id as string;

  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, req.user!.id)));

    if (!webhook) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    await db.delete(webhookDeliveriesTable).where(eq(webhookDeliveriesTable.webhookId, webhookId));
    await db.delete(webhooksTable).where(eq(webhooksTable.id, webhookId));

    res.json({ message: "Webhook deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

router.post("/webhooks/:id/test", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const webhookId = req.params.id as string;

  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, req.user!.id)));

    if (!webhook) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    const result = await sendTestWebhook(webhook.id, webhook.url, webhook.secret);

    res.json({
      success: result.success,
      status: result.status,
      message: result.success
        ? "Test webhook delivered successfully"
        : `Webhook delivery failed: ${result.body || "No response"}`,
    });
  } catch {
    res.status(500).json({ error: "Failed to send test webhook" });
  }
});

router.get("/webhooks/:id/deliveries", async (req: Request, res: Response) => {
  if (!requireApiAccess(req, res)) return;

  const webhookId = req.params.id as string;

  try {
    const [webhook] = await db
      .select()
      .from(webhooksTable)
      .where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.userId, req.user!.id)));

    if (!webhook) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    const deliveries = await db
      .select()
      .from(webhookDeliveriesTable)
      .where(eq(webhookDeliveriesTable.webhookId, webhookId))
      .orderBy(desc(webhookDeliveriesTable.deliveredAt))
      .limit(20);

    res.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        event: d.event,
        responseStatus: d.responseStatus,
        attempt: d.attempt,
        success: d.success === 1,
        deliveredAt: d.deliveredAt.toISOString(),
      })),
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch delivery history" });
  }
});

export default router;
