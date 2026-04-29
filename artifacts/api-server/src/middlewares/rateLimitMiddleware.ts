import type { Request, Response, NextFunction } from "express";
import { db, apiUsageTable, apiKeysTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import {
  PLAN_REQUEST_LIMITS,
  evaluateMonthlyQuota,
} from "../lib/security/quota-source.mjs";

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

    // Fast path: unlimited / no-access plans don't need the DB roundtrip.
    const fastDecision = evaluateMonthlyQuota({ plan, used: 0 });
    if (fastDecision.kind === "unlimited") {
      res.setHeader("X-RateLimit-Limit", "unlimited");
      res.setHeader("X-RateLimit-Remaining", "unlimited");
      res.setHeader("X-RateLimit-Reset", getNextMonthStart().toISOString());
      next();
      return;
    }
    if (fastDecision.kind === "no-access") {
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
      const decision = evaluateMonthlyQuota({ plan, used });

      if (decision.kind === "exceeded") {
        res.setHeader("X-RateLimit-Limit", String(decision.limit));
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", resetDate.toISOString());
        res.status(429).json({
          error: `Monthly API rate limit exceeded. Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan allows ${decision.limit.toLocaleString()} requests/month. Limit resets on ${resetDate.toLocaleDateString()}.`,
          limit: decision.limit,
          used: decision.used,
          resetDate: resetDate.toISOString(),
          upgrade: plan !== "enterprise",
        });
        return;
      }

      // decision.kind === "allowed"
      const allowed = decision as { kind: "allowed"; limit: number; remaining: number };
      res.setHeader("X-RateLimit-Limit", String(allowed.limit));
      res.setHeader("X-RateLimit-Remaining", String(allowed.remaining));
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
