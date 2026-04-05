import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { analyzePromptSafety } from "../lib/dev/safety";
import { sanitizeText } from "../lib/dev/sanitize";
import { refreshPlanFromDB } from "../middlewares/planMiddleware";
import { maskSecret } from "../lib/dev/secrets";

const router = Router();

const API_VERSION = "1.0";

function buildMeta() {
  return {
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}

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
