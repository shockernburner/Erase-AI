import { Router, type Request, type Response, type NextFunction } from "express";
import { db, apiKeysTable, usersTable } from "@workspace/db";
import { sql, eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { analyzePromptSafety } from "../lib/dev/safety";
import { sanitizeText } from "../lib/dev/sanitize";
import { refreshPlanFromDB } from "../middlewares/planMiddleware";
import { maskSecret } from "../lib/dev/secrets";
import { hashApiKey } from "../middlewares/apiKeyMiddleware";
import { getSessionId, getSession } from "../lib/auth";

const router = Router();

async function sessionOrApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: "API key is empty", code: "AUTH_INVALID_KEY", meta: buildMeta() });
      return;
    }

    const keyHash = hashApiKey(token);
    const [apiKey] = await db
      .select()
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.keyHash, keyHash), isNull(apiKeysTable.revokedAt)));

    if (!apiKey) {
      res.status(401).json({ error: "Invalid or revoked API key", code: "AUTH_INVALID_KEY", meta: buildMeta() });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, apiKey.userId));

    if (!user) {
      res.status(401).json({ error: "API key owner not found", code: "AUTH_USER_NOT_FOUND", meta: buildMeta() });
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
      planType: (user.planType || "free") as "free" | "pro" | "business" | "enterprise",
      planStartDate: user.planStartDate?.toISOString() ?? null,
      planEndDate: user.planEndDate?.toISOString() ?? null,
    };
    req.apiKeyId = apiKey.id;
    return next();
  }

  if (req.user?.id) {
    return next();
  }

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session?.user?.id) {
      req.isAuthenticated = function (this: Request) {
        return this.user != null;
      } as Request["isAuthenticated"];
      req.user = session.user;
      return next();
    }
  }

  res.status(401).json({
    error: "Authentication required. Use Bearer API key or session cookie.",
    code: "AUTH_REQUIRED",
    meta: buildMeta(),
  });
}

const API_VERSION = "1.0";

function buildMeta() {
  return {
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}

// Public, auth-optional health probe. The browser extension and external
// monitors hit this without credentials to verify the server is reachable.
// When a Bearer token OR a logged-in session cookie is provided we resolve
// the caller's plan + remaining daily quota so the popup and the in-app
// install card can render that info with a single round-trip.
async function buildAuthedPingPayload(
  user: { id: string; email: string | null; planType: string | null },
  meta: ReturnType<typeof buildMeta>,
) {
  const planType = (user.planType || "free") as string;
  let dailyLimit: number | null = null;
  let dailyUsed = 0;
  let dailyRemaining: number | null = null;
  if (planType === "free") {
    try {
      dailyUsed = await getDailyUsageCount(user.id);
    } catch {
      dailyUsed = 0;
    }
    dailyLimit = FREE_DAILY_LIMIT;
    dailyRemaining = Math.max(0, FREE_DAILY_LIMIT - dailyUsed);
  }
  return {
    ok: true,
    version: API_VERSION,
    timestamp: meta.timestamp,
    plan: planType,
    email: user.email,
    dailyLimit,
    dailyUsed,
    dailyRemaining,
    meta,
  };
}

router.get("/ping", async (req, res) => {
  const meta = buildMeta();
  const authHeader = req.headers.authorization;

  // 1. Bearer token path — validate the API key and resolve the owner.
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Invalid Authorization header. Use: Bearer <API_KEY>",
        code: "AUTH_INVALID_HEADER",
        meta,
      });
      return;
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: "API key is empty", code: "AUTH_INVALID_KEY", meta });
      return;
    }
    const keyHash = hashApiKey(token);
    const [apiKey] = await db
      .select()
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.keyHash, keyHash), isNull(apiKeysTable.revokedAt)));
    if (!apiKey) {
      res.status(401).json({ error: "Invalid or revoked API key", code: "AUTH_INVALID_KEY", meta });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, apiKey.userId));
    if (!user) {
      res.status(401).json({ error: "API key owner not found", code: "AUTH_USER_NOT_FOUND", meta });
      return;
    }
    res.json(await buildAuthedPingPayload(
      { id: user.id, email: user.email, planType: user.planType ?? null },
      meta,
    ));
    return;
  }

  // 2. Session-cookie path — if the browser has an authenticated session,
  //    return the same enriched payload. We re-read the user from the DB so
  //    the plan/quota reflects the current row, not a stale session snapshot.
  const sid = getSessionId(req);
  if (sid) {
    try {
      const session = await getSession(sid);
      if (session?.user?.id) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.user.id));
        if (user) {
          res.json(await buildAuthedPingPayload(
            { id: user.id, email: user.email, planType: user.planType ?? null },
            meta,
          ));
          return;
        }
      }
    } catch {
      // Fall through to the unauthenticated response — a broken session must
      // never make the public health probe fail.
    }
  }

  // 3. Anonymous probe — public health check.
  res.json({ ok: true, version: API_VERSION, timestamp: meta.timestamp, meta });
});

router.use(sessionOrApiKeyAuth);

const FREE_DAILY_LIMIT = 10;

function redactInputForStorage(text: string): string {
  let redacted = text.substring(0, 500);
  redacted = redacted.replace(/\b(sk-|ghp_|xoxb-|pk_live_|sk_live_|AKIA)[A-Za-z0-9_\-]{8,}/g, (m) => maskSecret(m));
  redacted = redacted.replace(/(postgres(ql)?|mysql|mongodb(\+srv)?|redis):\/\/[^\s'"]+/gi, "[DB_URL_REDACTED]");
  redacted = redacted.replace(/-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END/g, "[PRIVATE_KEY_REDACTED]");
  redacted = redacted.replace(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_\-]{10,}/g, "[JWT_REDACTED]");
  if (text.length > 500) redacted += "...";
  return redacted;
}

async function getDailyUsageCount(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await db.execute(sql`
    SELECT count(*)::int as count FROM dev_scans
    WHERE user_id = ${userId}
    AND created_at >= ${todayStart.toISOString()}
  `);

  return (result.rows[0] as Record<string, unknown>)?.count as number || 0;
}

async function checkDailyLimit(userId: string, plan: string): Promise<{ allowed: boolean; used: number }> {
  if (plan !== "free") return { allowed: true, used: 0 };
  const used = await getDailyUsageCount(userId);
  return { allowed: used < FREE_DAILY_LIMIT, used };
}

router.post("/analyze", refreshPlanFromDB, async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED", meta: buildMeta() });
      return;
    }

    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required and must be a string", code: "INVALID_INPUT", meta: buildMeta() });
      return;
    }

    if (text.length > 10000) {
      res.status(400).json({ error: "Text must be 10,000 characters or fewer", code: "INPUT_TOO_LONG", meta: buildMeta() });
      return;
    }

    const plan = req.user.planType || "free";
    const { allowed, used } = await checkDailyLimit(req.user.id, plan);
    if (!allowed) {
      res.status(429).json({
        error: `Free plan allows ${FREE_DAILY_LIMIT} scans per day. Upgrade for unlimited scans.`,
        code: "RATE_LIMIT_EXCEEDED",
        upgrade: true,
        limit: FREE_DAILY_LIMIT,
        used,
        details: { upgrade: true, limit: FREE_DAILY_LIMIT, used },
        meta: buildMeta(),
      });
      return;
    }

    const result = analyzePromptSafety(text);

    const storedInput = redactInputForStorage(text);
    const storedIssues = result.issues.map(i => ({
      ...i,
      match: i.match.length > 30 ? i.match.substring(0, 12) + "***" + i.match.substring(i.match.length - 4) : "***",
    }));

    await db.execute(sql`
      INSERT INTO dev_scans (user_id, scan_type, input_text, risk_score, issues, created_at)
      VALUES (${req.user.id}, 'analyze', ${storedInput}, ${result.riskScore}, ${JSON.stringify(storedIssues)}, NOW())
    `);

    res.json({
      riskScore: result.riskScore,
      level: result.level,
      issues: result.issues,
      suggestions: result.suggestions,
      summary: result.summary,
      meta: buildMeta(),
    });
  } catch (err) {
    console.error("Dev analyze error:", err);
    res.status(500).json({ error: "Analysis failed", code: "ANALYSIS_FAILED", meta: buildMeta() });
  }
});

router.post("/sanitize", refreshPlanFromDB, async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED", meta: buildMeta() });
      return;
    }

    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required and must be a string", code: "INVALID_INPUT", meta: buildMeta() });
      return;
    }

    if (text.length > 10000) {
      res.status(400).json({ error: "Text must be 10,000 characters or fewer", code: "INPUT_TOO_LONG", meta: buildMeta() });
      return;
    }

    const plan = req.user.planType || "free";
    const { allowed, used } = await checkDailyLimit(req.user.id, plan);
    if (!allowed) {
      res.status(429).json({
        error: `Free plan allows ${FREE_DAILY_LIMIT} scans per day. Upgrade for unlimited scans.`,
        code: "RATE_LIMIT_EXCEEDED",
        upgrade: true,
        limit: FREE_DAILY_LIMIT,
        used,
        details: { upgrade: true, limit: FREE_DAILY_LIMIT, used },
        meta: buildMeta(),
      });
      return;
    }

    const result = sanitizeText(text);

    const storedInput = redactInputForStorage(text);
    const storedSanitized = redactInputForStorage(result.sanitized);

    await db.execute(sql`
      INSERT INTO dev_scans (user_id, scan_type, input_text, risk_score, issues, sanitized_text, created_at)
      VALUES (${req.user.id}, 'sanitize', ${storedInput}, ${0}, ${JSON.stringify([])}, ${storedSanitized}, NOW())
    `);

    res.json({
      sanitized: result.sanitized,
      changes: result.changes,
      changeCount: result.changes.length,
      meta: buildMeta(),
    });
  } catch (err) {
    console.error("Dev sanitize error:", err);
    res.status(500).json({ error: "Sanitization failed", code: "SANITIZATION_FAILED", meta: buildMeta() });
  }
});

router.get("/history", refreshPlanFromDB, async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED", meta: buildMeta() });
      return;
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 100));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const scans = await db.execute(sql`
      SELECT id, scan_type, input_text, risk_score, issues, sanitized_text, created_at
      FROM dev_scans
      WHERE user_id = ${req.user.id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT count(*)::int as count FROM dev_scans
      WHERE user_id = ${req.user.id}
    `);

    const todayUsed = await getDailyUsageCount(req.user.id);
    const plan = req.user.planType || "free";

    res.json({
      scans: scans.rows.map((s: Record<string, unknown>) => ({
        id: s.id,
        scanType: s.scan_type,
        inputText: (s.input_text as string).substring(0, 200) + ((s.input_text as string).length > 200 ? "..." : ""),
        riskScore: s.risk_score,
        issues: typeof s.issues === "string" ? JSON.parse(s.issues) : s.issues,
        sanitizedText: s.sanitized_text || null,
        createdAt: s.created_at,
      })),
      total: (countResult.rows[0] as Record<string, unknown>)?.count ?? 0,
      todayUsed,
      dailyLimit: plan === "free" ? FREE_DAILY_LIMIT : null,
      meta: buildMeta(),
    });
  } catch (err) {
    console.error("Dev history error:", err);
    res.status(500).json({ error: "Failed to fetch history", code: "HISTORY_FAILED", meta: buildMeta() });
  }
});

export default router;
