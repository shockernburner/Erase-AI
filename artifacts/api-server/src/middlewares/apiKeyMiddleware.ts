import { createHash, randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, apiKeysTable, usersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `eak_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 8);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
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
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role as "user" | "admin",
    planType: (user.planType || "free") as "free" | "pro" | "enterprise",
    planStartDate: user.planStartDate?.toISOString() ?? null,
    planEndDate: user.planEndDate?.toISOString() ?? null,
  };

  next();
}
