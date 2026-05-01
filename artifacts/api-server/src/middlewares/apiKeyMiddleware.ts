import { createHash, randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, apiKeysTable, apiUsageTable, usersTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { toPlanType } from "./planMiddleware";
import {
  createApiKeyEnforcer,
  type EnforcementResult,
} from "./api-key-enforcement-source.mjs";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `eak_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 8);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Task #158 — shared demo-key TTL + quota gate. Bound by both
// apiKeyAuth (/api/v1/*) and sessionOrApiKeyAuth (/api/dev/*).
//
// For demo keys (requestQuota != null) the auth middleware is the
// single canonical writer of api_usage rows, so the quota covers
// every endpoint regardless of whether trackApiUsage is mounted.
// trackApiUsage detects req.apiKeyHasQuota and skips logging to
// avoid double-counting.
export type ApiKeyEnforcementResult = EnforcementResult;

const apiKeyEnforcer = createApiKeyEnforcer({
  async countUsage(apiKeyId: string): Promise<number> {
    const [usage] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiUsageTable)
      .where(eq(apiUsageTable.apiKeyId, apiKeyId));
    return usage?.count ?? 0;
  },
  async insertUsage({ apiKeyId, endpoint }: { apiKeyId: string; endpoint: string }) {
    await db.insert(apiUsageTable).values({
      apiKeyId,
      endpoint,
      responseStatus: null,
    });
  },
});

export async function enforceApiKeyTtlAndQuota(
  apiKey: typeof apiKeysTable.$inferSelect,
  req: Pick<Request, "method" | "path">,
): Promise<ApiKeyEnforcementResult> {
  return apiKeyEnforcer(
    { id: apiKey.id, expiresAt: apiKey.expiresAt, requestQuota: apiKey.requestQuota },
    { method: req.method, path: req.path },
  );
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer <API_KEY>" });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "API key is empty" });
    return;
  }

  const keyHash = hashApiKey(token);

  const [apiKey] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyHash, keyHash), isNull(apiKeysTable.revokedAt)));

  if (!apiKey) {
    res.status(401).json({ error: "Invalid or revoked API key" });
    return;
  }

  // Task #158 — TTL + quota gate (shared with sessionOrApiKeyAuth).
  const enforcement = await enforceApiKeyTtlAndQuota(apiKey, req);
  if (!enforcement.ok) {
    res.status(enforcement.status).json(enforcement.body);
    return;
  }
  // Demo keys (with quota) are counted here on every endpoint;
  // trackApiUsage uses this flag to avoid double-logging the request.
  req.apiKeyHasQuota = apiKey.requestQuota != null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, apiKey.userId));

  if (!user) {
    res.status(401).json({ error: "API key owner not found" });
    return;
  }

  db.update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, apiKey.id))
    .execute()
    .catch(() => {});

  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  req.user = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role as "user" | "admin",
    planType: toPlanType(user.planType),
    planStartDate: user.planStartDate?.toISOString() ?? null,
    planEndDate: user.planEndDate?.toISOString() ?? null,
  };

  req.apiKeyId = apiKey.id;

  next();
}
