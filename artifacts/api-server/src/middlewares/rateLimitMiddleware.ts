import type { Request, Response, NextFunction } from "express";
import { db, apiUsageTable, apiKeysTable, usersTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { PLAN_REQUEST_LIMITS } from "../lib/security/quota-source.mjs";
import { createApiRateLimitMiddleware } from "../lib/security/quota-middleware.mjs";
import {
  PLAN_SPEND_BUDGET_MICROS,
  PLAN_TOKEN_COST_MICROS_PER_TOKEN,
  estimateRequestCost,
} from "../lib/security/spend-source.mjs";
import { createApiSpendCapMiddleware } from "../lib/security/spend-middleware.mjs";

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

// Sums cost_micros for this user's API-key traffic MTD (task #132).
async function lookupMonthlySpend(userId: string, monthStart: Date): Promise<number> {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${apiUsageTable.costMicros}), 0)::bigint` })
    .from(apiUsageTable)
    .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
    .where(
      and(
        eq(apiKeysTable.userId, userId),
        gte(apiUsageTable.createdAt, monthStart),
      ),
    );
  // SUM returns a string for bigint in node-postgres; coerce.
  return Number(result?.total ?? 0);
}

async function lookupSpendOverride(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ override: usersTable.apiSpendOverrideMicros })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const v = row?.override;
  return v === null || v === undefined ? null : Number(v);
}

export function apiRateLimit() {
  return createApiRateLimitMiddleware({ lookupMonthlyUsage });
}

export function apiSpendCap() {
  return createApiSpendCapMiddleware({ lookupMonthlySpend, lookupSpendOverride });
}

// Wraps res.write/res.end so we can count bytes sent back to the
// caller without buffering the entire response. Returns a getter for
// the running total.
function instrumentResponseSize(res: Response): () => number {
  let bytes = 0;
  const origWrite = res.write.bind(res) as typeof res.write;
  const origEnd = res.end.bind(res) as typeof res.end;

  const countChunk = (chunk: unknown): void => {
    if (chunk == null) return;
    if (Buffer.isBuffer(chunk)) {
      bytes += chunk.length;
    } else if (typeof chunk === "string") {
      bytes += Buffer.byteLength(chunk);
    } else if (chunk instanceof Uint8Array) {
      bytes += chunk.byteLength;
    }
  };

  res.write = function patchedWrite(this: Response, ...args: unknown[]) {
    countChunk(args[0]);
    return (origWrite as (...a: unknown[]) => boolean).apply(this, args);
  } as typeof res.write;

  res.end = function patchedEnd(this: Response, ...args: unknown[]) {
    countChunk(args[0]);
    return (origEnd as (...a: unknown[]) => Response).apply(this, args);
  } as typeof res.end;

  return () => bytes;
}

export function trackApiUsage() {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKeyId = req.apiKeyId;
    if (!apiKeyId) {
      next();
      return;
    }

    // Falls back to Content-Length when the body parser hasn't
    // materialised a buffer (e.g. multipart streaming).
    const requestBytes = (() => {
      const cl = Number(req.headers["content-length"]);
      if (Number.isFinite(cl) && cl > 0) return cl;
      const body = (req as Request & { body?: unknown }).body;
      if (body && typeof body === "object") {
        try {
          return Buffer.byteLength(JSON.stringify(body));
        } catch {
          return 0;
        }
      }
      return 0;
    })();

    const getResponseBytes = instrumentResponseSize(res);
    const plan = req.user?.planType || "free";

    res.on("finish", () => {
      const responseBytes = getResponseBytes();
      // Only bill vendor cost on 2xx/3xx (vendor was plausibly called).
      // 4xx is almost always input validation rejected before vendor;
      // 5xx is our own failure. Request count itself is still logged.
      const billVendor = res.statusCode < 400;
      const { tokens, costMicros } = billVendor
        ? estimateRequestCost({ plan, requestBytes, responseBytes })
        : { tokens: 0, costMicros: 0 };
      db.insert(apiUsageTable)
        .values({
          apiKeyId,
          endpoint: req.method + " " + req.path,
          responseStatus: res.statusCode,
          tokens,
          costMicros,
        })
        .catch((err) => {
          console.error("Failed to log API usage:", err);
        });
    });

    next();
  };
}

export {
  PLAN_REQUEST_LIMITS,
  PLAN_SPEND_BUDGET_MICROS,
  PLAN_TOKEN_COST_MICROS_PER_TOKEN,
  getMonthStart,
  getNextMonthStart,
  lookupMonthlySpend,
  lookupSpendOverride,
};
