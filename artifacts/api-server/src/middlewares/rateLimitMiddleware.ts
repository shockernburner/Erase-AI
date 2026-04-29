import type { Request, Response, NextFunction } from "express";
import { db, apiUsageTable, apiKeysTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { PLAN_REQUEST_LIMITS } from "../lib/security/quota-source.mjs";
import { createApiRateLimitMiddleware } from "../lib/security/quota-middleware.mjs";

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

// Real DB-backed lookup. Counts how many api_usage rows exist for any
// API key owned by `userId` since `monthStart`.
async function lookupMonthlyUsage(userId: string, monthStart: Date): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiUsageTable)
    .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
    .where(
      and(
        eq(apiKeysTable.userId, userId),
        gte(apiUsageTable.createdAt, monthStart),
      ),
    );
  return result?.count ?? 0;
}

export function apiRateLimit() {
  return createApiRateLimitMiddleware({ lookupMonthlyUsage });
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
