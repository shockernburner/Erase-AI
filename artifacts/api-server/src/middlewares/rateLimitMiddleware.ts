import type { Request, Response, NextFunction } from "express";
import { db, apiUsageTable, apiKeysTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";

const PLAN_REQUEST_LIMITS: Record<string, number> = {
  pro: 1000,
  business: 10000,
  enterprise: -1,
};

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function apiRateLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const apiKeyId = req.apiKeyId;
    if (!apiKeyId) {
      next();
      return;
    }

    const plan = req.user?.planType || "free";
    const limit = PLAN_REQUEST_LIMITS[plan] ?? 0;

    if (limit === -1) {
      res.setHeader("X-RateLimit-Limit", "unlimited");
      res.setHeader("X-RateLimit-Remaining", "unlimited");
      res.setHeader("X-RateLimit-Reset", getNextMonthStart().toISOString());
      next();
      return;
    }

    if (limit === 0) {
      res.status(403).json({ error: "API access not available on this plan" });
      return;
    }

    try {
      const monthStart = getMonthStart();

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(apiUsageTable)
        .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
        .where(
          and(
            eq(apiKeysTable.userId, req.user!.id),
            gte(apiUsageTable.createdAt, monthStart),
          ),
        );

      const used = result?.count ?? 0;
      const resetDate = getNextMonthStart();

      if (used >= limit) {
        res.setHeader("X-RateLimit-Limit", String(limit));
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", resetDate.toISOString());
        res.status(429).json({
          error: `Monthly API rate limit exceeded. Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan allows ${limit.toLocaleString()} requests/month. Limit resets on ${resetDate.toLocaleDateString()}.`,
          limit,
          used,
          resetDate: resetDate.toISOString(),
          upgrade: plan !== "enterprise",
        });
        return;
      }

      const remaining = Math.max(0, limit - used - 1);
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", resetDate.toISOString());

      next();
    } catch (err) {
      console.error("Rate limit check error:", err);
      res.status(503).json({ error: "Unable to verify rate limit. Please try again shortly." });
    }
  };
}

export function trackApiUsage() {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKeyId = req.apiKeyId;
    if (!apiKeyId) {
      next();
      return;
    }

    res.on("finish", () => {
      db.insert(apiUsageTable)
        .values({
          apiKeyId,
          endpoint: req.method + " " + req.path,
          responseStatus: res.statusCode,
        })
        .catch((err) => {
          console.error("Failed to log API usage:", err);
        });
    });

    next();
  };
}

export { PLAN_REQUEST_LIMITS, getMonthStart, getNextMonthStart };
