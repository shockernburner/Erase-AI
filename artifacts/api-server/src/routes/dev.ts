import { Router, type Request, type Response, type NextFunction } from "express";
import { db, apiKeysTable, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import crypto from "crypto";
import { analyzePromptSafety } from "../lib/dev/safety";
import { sanitizeText } from "../lib/dev/sanitize";
import { refreshPlanFromDB, requireActivePlan } from "../middlewares/planMiddleware";
import { redactInputForStorage } from "../lib/dev/store-redact";
import { hashApiKey, enforceApiKeyTtlAndQuota } from "../middlewares/apiKeyMiddleware";
import { getSessionId, getSession } from "../lib/auth";
import { validateOutcomePayload } from "../lib/dev/outcome-source.mjs";
import { trackApiUsage, apiRateLimit } from "../middlewares/rateLimitMiddleware";
import { apiKeyBurstLimit, ipBurstLimit } from "../middlewares/burstLimitMiddleware";
import demoKeyRouter from "./demo-key";

const router = Router();

// Task #158 — public-visitor demo API key endpoint. Mounted BEFORE
// sessionOrApiKeyAuth so unauthenticated visitors on the developer
// preview page can mint a key.
router.use(demoKeyRouter);

async function sessionOrApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: "API key is empty", code: "AUTH_INVALID_FORMAT", meta: buildMeta() });
      return;
    }
    if (!isWellFormedApiKey(token)) {
      res.status(401).json({ error: "API key format is invalid. Expected an eak_… key.", code: "AUTH_INVALID_FORMAT", meta: buildMeta() });
      return;
    }

    const keyHash = hashApiKey(token);
    const [apiKey] = await db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.keyHash, keyHash));

    if (!apiKey) {
      res.status(401).json({ error: "API key not recognized", code: "AUTH_INVALID_KEY", meta: buildMeta() });
      return;
    }

    if (apiKey.revokedAt) {
      res.status(401).json({ error: "API key has been revoked", code: "AUTH_REVOKED_KEY", meta: buildMeta() });
      return;
    }

    // Task #158 — TTL + quota gate (shared with apiKeyAuth on /api/v1/*).
    const enforcement = await enforceApiKeyTtlAndQuota(apiKey, req);
    if (!enforcement.ok) {
      res.status(enforcement.status).json({ ...enforcement.body, meta: buildMeta() });
      return;
    }
    req.apiKeyHasQuota = apiKey.requestQuota != null;

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
      planType: user.planType,
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

function isWellFormedApiKey(token: string): boolean {
  return /^eak_[A-Za-z0-9_-]{8,}$/.test(token);
}

function buildMeta() {
  return {
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}

type PingAuth =
  | { kind: "anonymous" }
  | { kind: "user"; user: { id: string; email: string | null; planType: string | null } }
  | { kind: "error"; status: number; code: string; error: string };

async function resolvePingAuth(req: Request): Promise<PingAuth> {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
      return { kind: "error", status: 401, code: "AUTH_INVALID_HEADER", error: "Invalid Authorization header. Use: Bearer <API_KEY>" };
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return { kind: "error", status: 401, code: "AUTH_INVALID_FORMAT", error: "API key is empty" };
    }
    if (!isWellFormedApiKey(token)) {
      return { kind: "error", status: 401, code: "AUTH_INVALID_FORMAT", error: "API key format is invalid. Expected an eak_… key." };
    }
    const keyHash = hashApiKey(token);
    const [apiKey] = await db
      .select()
      .from(apiKeysTable)
      .where(eq(apiKeysTable.keyHash, keyHash));
    if (!apiKey) {
      return { kind: "error", status: 401, code: "AUTH_INVALID_KEY", error: "API key not recognized" };
    }
    if (apiKey.revokedAt) {
      return { kind: "error", status: 401, code: "AUTH_REVOKED_KEY", error: "API key has been revoked" };
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, apiKey.userId));
    if (!user) {
      return { kind: "error", status: 401, code: "AUTH_USER_NOT_FOUND", error: "API key owner not found" };
    }
    return { kind: "user", user: { id: user.id, email: user.email, planType: user.planType ?? null } };
  }
  const sid = getSessionId(req);
  if (sid) {
    try {
      const session = await getSession(sid);
      if (session?.user?.id) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.user.id));
        if (user) {
          return { kind: "user", user: { id: user.id, email: user.email, planType: user.planType ?? null } };
        }
      }
    } catch {
      /* fall through */
    }
  }
  return { kind: "anonymous" };
}

async function buildAuthedPingPayload(
  user: { id: string; planType: string | null },
  meta: ReturnType<typeof buildMeta>,
) {
  const planType = (user.planType || "free") as string;
  let dailyLimit: number | null = null;
  let dailyUsed = 0;
  let dailyRemaining: number | null = null;
  if (planType === "free") {
    try {
      dailyUsed = await getTrialUsageCount(user.id);
    } catch {
      dailyUsed = 0;
    }
    dailyLimit = FREE_TRIAL_SCAN_LIMIT;
    dailyRemaining = Math.max(0, FREE_TRIAL_SCAN_LIMIT - dailyUsed);
  }
  return {
    ok: true,
    version: API_VERSION,
    timestamp: meta.timestamp,
    plan: planType,
    dailyLimit,
    dailyUsed,
    dailyRemaining,
    meta,
  };
}

router.get("/ping", ipBurstLimit(), async (req, res) => {
  const meta = buildMeta();
  const auth = await resolvePingAuth(req);
  if (auth.kind === "error") {
    res.status(auth.status).json({ error: auth.error, code: auth.code, meta });
    return;
  }
  if (auth.kind === "user") {
    res.json(await buildAuthedPingPayload(auth.user, meta));
    return;
  }
  res.json({ ok: true, version: API_VERSION, timestamp: meta.timestamp, meta });
});

router.use(sessionOrApiKeyAuth);

// Per-API-key burst limiter (60 req/min) — applies to all plans, including
// enterprise. No session-based caller (the dashboard) is constrained here;
// the bucket is keyed by req.apiKeyId, so session callers pass through.
const burstChain = [apiKeyBurstLimit()];
// Monthly per-plan quota + audit-log of every API-key request. Both are
// no-ops when there's no req.apiKeyId (i.e. session-based dashboard calls).
const quotaChain = [trackApiUsage(), apiRateLimit()];

// Free = 7-day trial with a total budget of 25 scans (not a daily reset).
const FREE_TRIAL_SCAN_LIMIT = 25;

async function getTrialUsageCount(userId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int as count FROM dev_scans
    WHERE user_id = ${userId}
  `);

  return (result.rows[0] as Record<string, unknown>)?.count as number || 0;
}

async function checkTrialLimit(userId: string, plan: string): Promise<{ allowed: boolean; used: number }> {
  if (plan !== "free") return { allowed: true, used: 0 };
  const used = await getTrialUsageCount(userId);
  return { allowed: used < FREE_TRIAL_SCAN_LIMIT, used };
}

router.post("/analyze", ...burstChain, ...quotaChain, refreshPlanFromDB, requireActivePlan(), async (req, res) => {
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
    const { allowed, used } = await checkTrialLimit(req.user.id, plan);
    if (!allowed) {
      res.status(429).json({
        error: `Your free trial includes ${FREE_TRIAL_SCAN_LIMIT} scans. Upgrade for unlimited scans.`,
        code: "RATE_LIMIT_EXCEEDED",
        upgrade: true,
        limit: FREE_TRIAL_SCAN_LIMIT,
        used,
        details: { upgrade: true, limit: FREE_TRIAL_SCAN_LIMIT, used },
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

router.post("/sanitize", ...burstChain, ...quotaChain, refreshPlanFromDB, requireActivePlan(), async (req, res) => {
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
    const { allowed, used } = await checkTrialLimit(req.user.id, plan);
    if (!allowed) {
      res.status(429).json({
        error: `Your free trial includes ${FREE_TRIAL_SCAN_LIMIT} scans. Upgrade for unlimited scans.`,
        code: "RATE_LIMIT_EXCEEDED",
        upgrade: true,
        limit: FREE_TRIAL_SCAN_LIMIT,
        used,
        details: { upgrade: true, limit: FREE_TRIAL_SCAN_LIMIT, used },
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

router.post("/outcome", ...burstChain, ...quotaChain, async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED", meta: buildMeta() });
      return;
    }

    const validated = validateOutcomePayload(req.body);
    if (!validated.ok) {
      res.status(400).json({
        error: validated.error,
        code: "INVALID_INPUT",
        meta: buildMeta(),
      });
      return;
    }

    const { level, action, riskScore, categories, pieces } = validated.value;

    // pieces is a content-free per-submission summary attached by the
    // 1.3.5 extension (task #142). NULL means the client didn't send it
    // (older versions, or no attachments scanned).
    const piecesJson = pieces ? JSON.stringify(pieces) : null;
    await db.execute(sql`
      INSERT INTO firewall_outcomes (user_id, api_key_id, level, action, risk_score, categories, pieces, created_at)
      VALUES (${req.user.id}, ${req.apiKeyId ?? null}, ${level}, ${action}, ${riskScore}, ${JSON.stringify(categories)}, ${piecesJson}, NOW())
    `);

    res.json({ ok: true, meta: buildMeta() });
  } catch (err) {
    console.error("Dev outcome error:", err);
    res.status(500).json({ error: "Failed to record outcome", code: "OUTCOME_FAILED", meta: buildMeta() });
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

    const todayUsed = await getTrialUsageCount(req.user.id);
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
      dailyLimit: plan === "free" ? FREE_TRIAL_SCAN_LIMIT : null,
      meta: buildMeta(),
    });
  } catch (err) {
    console.error("Dev history error:", err);
    res.status(500).json({ error: "Failed to fetch history", code: "HISTORY_FAILED", meta: buildMeta() });
  }
});

export default router;
