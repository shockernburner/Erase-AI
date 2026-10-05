import { Router, type IRouter, type Request, type Response } from "express";
import { db, personalScansTable, usersTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { analyzeText } from "../lib/personalAnalyzer";
import { calculateRiskScore } from "../lib/riskScorer";
import { refreshPlanFromDB, requireActivePlan } from "../middlewares/planMiddleware";
import {
  billingSourceForUser,
  buildMobilePlayBilling,
  buildMobileHealthPayload,
  buildWebStripeBillingUrls,
  isGooglePlaySubscription,
  mapPlanForMobile,
  mobileFeaturesForPlan,
  mobileStatusForPlan,
  scanLimitForPlan,
  trialDaysRemaining,
} from "../lib/mobileEntitlement";
import { validatePlayVerifyInput, verifyGooglePlayPurchase } from "../lib/googlePlayBilling";
import { resolveEffectivePlan } from "../lib/org";

const router: IRouter = Router();
router.use(refreshPlanFromDB);

const MAX_PROTECTED_APPS = 100;
const PACKAGE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/;
const FREE_TRIAL_SCAN_LIMIT = 25;
const MAX_PIECE_TEXT_LENGTH = 5000;
const MAX_PIECES = 12;

type MobilePieceInput = {
  source?: string;
  label?: string;
  text?: string;
  skip_reason?: string | null;
};

const LEVEL_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

/**
 * Background scans the guard runs while the user types. They must not be stored as history
 * rows (partial prompts) and must not consume the free-trial scan allowance, since the user
 * never asked for them.
 */
function isSilentPreviewScan(source: unknown): boolean {
  return typeof source === "string" && source.endsWith("_preview");
}

function getWebBaseUrl(): string {
  const configured = process.env.WEB_BASE_URL || process.env.PUBLIC_WEB_BASE_URL;
  if (configured) return configured;
  return "https://eraseai.ai";
}

router.get("/health", (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(buildMobileHealthPayload());
});

function requireMobileAuth(req: Request, res: Response): string | null {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

function normalizeProtectedPackages(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const packages = Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)));
  if (packages.length > MAX_PROTECTED_APPS) return null;
  if (packages.some((packageName) => packageName.length > 200 || !PACKAGE_NAME_PATTERN.test(packageName))) return null;
  return packages;
}

async function countPersonalScans(userId: string): Promise<number> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(personalScansTable)
    .where(eq(personalScansTable.userId, userId));
  return countResult?.count ?? 0;
}

async function getFreshUser(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return user;
  // Organization members get the organization's plan, and their status
  // follows the organization rather than any old personal subscription.
  const plan = await resolveEffectivePlan(user.id, user.planType);
  if (plan !== user.planType) {
    return { ...user, planType: plan, subscriptionStatus: "active", planEndDate: null };
  }
  return user;
}

router.get("/entitlement", async (req: Request, res: Response) => {
  const userId = requireMobileAuth(req, res);
  if (!userId) return;

  try {
    const user = await getFreshUser(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const plan = user.planType || "free";
    const billingSource = billingSourceForUser(user.subscriptionId);
    const playBilling = buildMobilePlayBilling();
    const scansUsed = await countPersonalScans(user.id);
    const status = mobileStatusForPlan(plan, user.subscriptionStatus, user.planEndDate);
    const planEndDate = user.planEndDate ? new Date(user.planEndDate).toISOString() : null;

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      plan: mapPlanForMobile(plan),
      status,
      plan_end_date: planEndDate,
      trial_days_remaining: status === "trialing" || status === "expired"
        ? trialDaysRemaining(user.planEndDate)
        : null,
      monthly_scan_limit: scanLimitForPlan(plan),
      monthly_scans_used: scansUsed,
      features: mobileFeaturesForPlan(plan),
      billing: {
        ...playBilling,
        web_stripe_urls: buildWebStripeBillingUrls(getWebBaseUrl()),
      },
      billing_source: billingSource,
      can_cancel: billingSource === "google_play" && plan !== "free",
      can_manage_in_play: billingSource === "google_play" && plan !== "free",
      can_manage_on_web: billingSource === "stripe" && plan !== "free",
    });
  } catch (err) {
    console.error("Mobile entitlement error:", err);
    res.status(500).json({ error: "Failed to load mobile entitlement" });
  }
});

router.get("/play/products", (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(buildMobilePlayBilling());
});

router.get("/history", async (req: Request, res: Response) => {
  const userId = requireMobileAuth(req, res);
  if (!userId) return;

  try {
    const limit = Math.max(1, Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 100));
    const scans = await db
      .select()
      .from(personalScansTable)
      .where(eq(personalScansTable.userId, userId))
      .orderBy(desc(personalScansTable.createdAt))
      .limit(limit);

    res.json({
      scans: scans.map((s) => ({
        id: s.id,
        content: s.content.substring(0, 200) + (s.content.length > 200 ? "..." : ""),
        riskScore: s.riskScore,
        level: s.level,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error("Mobile history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.post("/analyze", requireActivePlan(), async (req: Request, res: Response) => {
  const userId = requireMobileAuth(req, res);
  if (!userId) return;

  const text = typeof req.body?.text === "string"
    ? req.body.text
    : typeof req.body?.content === "string"
      ? req.body.content
      : "";
  if (!text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  if (text.length > MAX_PIECE_TEXT_LENGTH) {
    res.status(400).json({ error: `Text must be ${MAX_PIECE_TEXT_LENGTH} characters or fewer` });
    return;
  }

  const user = await getFreshUser(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const silentPreview = isSilentPreviewScan(req.body?.source);
  const plan = user.planType || "free";
  if (plan === "free" && !silentPreview) {
    const scansUsed = await countPersonalScans(userId);
    if (scansUsed >= FREE_TRIAL_SCAN_LIMIT) {
      res.status(429).json({
        error: `Your free trial includes ${FREE_TRIAL_SCAN_LIMIT} scans. Subscribe to Personal for unlimited scans.`,
        upgrade: true,
        limit: FREE_TRIAL_SCAN_LIMIT,
        used: scansUsed,
      });
      return;
    }
  }

  try {
    const analysis = analyzeText(text);
    const risk = calculateRiskScore(analysis.flags);
    const storedContent = text.length > 500 ? `${text.substring(0, 500)}...` : text;

    const scan = silentPreview
      ? undefined
      : (
        await db
          .insert(personalScansTable)
          .values({
            userId,
            content: storedContent,
            riskScore: risk.score,
            level: risk.level,
            flags: JSON.stringify(analysis.flags ?? []),
            suggestions: JSON.stringify(analysis.suggestions ?? []),
          })
          .returning()
      )[0];

    res.json({
      id: scan?.id,
      riskScore: risk.score,
      level: risk.level,
      block_send: risk.blockSend,
      flags: analysis.flags,
      suggestions: analysis.suggestions,
      createdAt: scan?.createdAt,
      recorded: !silentPreview,
    });
  } catch (err) {
    console.error("Mobile analyze error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.post("/play/verify", async (req: Request, res: Response) => {
  const userId = requireMobileAuth(req, res);
  if (!userId) return;

  const validated = validatePlayVerifyInput(req.body);
  if ("ok" in validated) {
    const failure = validated as { ok: false; status: number; error: string; code?: string };
    res.status(failure.status).json({ error: failure.error, code: failure.code });
    return;
  }

  try {
    const decision = await verifyGooglePlayPurchase(validated);
    if (!decision.ok) {
      res.status(decision.status).json({ error: decision.error, code: decision.code });
      return;
    }

    const now = new Date();
    await db.update(usersTable).set({
      planType: decision.plan,
      subscriptionId: decision.subscriptionId,
      subscriptionStatus: decision.subscriptionStatus,
      planStartDate: now,
      planEndDate: decision.expiryTime,
    }).where(eq(usersTable.id, userId));

    res.json({
      status: "verified",
      planType: decision.plan,
      subscriptionStatus: decision.subscriptionStatus,
      billing_source: "google_play",
    });
  } catch (err) {
    console.error("Google Play verify error:", err);
    const raw = err instanceof Error ? err.message : "Failed to verify Google Play purchase";
    const safe = raw.replace(/ya29\.[A-Za-z0-9._-]+/g, "[token]").slice(0, 280);
    res.status(500).json({
      error: safe || "Failed to verify Google Play purchase",
      code: "PLAY_VERIFY_FAILED",
    });
  }
});

router.get("/billing-url", (req: Request, res: Response) => {
  if (!requireMobileAuth(req, res)) return;
  res.json(buildMobilePlayBilling());
});

router.get("/protected-apps", async (req: Request, res: Response) => {
  const userId = requireMobileAuth(req, res);
  if (!userId) return;

  try {
    const result = await db.execute(sql`
      SELECT packages, firewall_enabled, updated_at
      FROM mobile_protected_apps
      WHERE user_id = ${userId}
      LIMIT 1
    `);
    const row = result.rows[0] as { packages?: unknown; firewall_enabled?: boolean; updated_at?: Date } | undefined;

    res.json({
      packages: Array.isArray(row?.packages) ? row.packages : [],
      firewall_enabled: row?.firewall_enabled ?? true,
      updated_at: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
    });
  } catch (err) {
    console.error("Mobile protected-apps fetch error:", err);
    res.status(500).json({ error: "Failed to load protected apps" });
  }
});

router.post("/protected-apps", async (req: Request, res: Response) => {
  const userId = requireMobileAuth(req, res);
  if (!userId) return;

  const packages = normalizeProtectedPackages(req.body?.packages);
  if (!packages) {
    res.status(400).json({ error: "packages must be an array of valid Android package names" });
    return;
  }

  const firewallEnabled = typeof req.body?.firewall_enabled === "boolean" ? req.body.firewall_enabled : true;

  try {
    const result = await db.execute(sql`
      INSERT INTO mobile_protected_apps (user_id, packages, firewall_enabled, updated_at)
      VALUES (${userId}, ${JSON.stringify(packages)}::jsonb, ${firewallEnabled}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET packages = EXCLUDED.packages, firewall_enabled = EXCLUDED.firewall_enabled, updated_at = NOW()
      RETURNING packages, firewall_enabled, updated_at
    `);
    const row = result.rows[0] as { packages?: unknown; firewall_enabled?: boolean; updated_at?: Date } | undefined;

    res.json({
      packages: Array.isArray(row?.packages) ? row.packages : packages,
      firewall_enabled: row?.firewall_enabled ?? firewallEnabled,
      updated_at: row?.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    });
  } catch (err) {
    console.error("Mobile protected-apps save error:", err);
    res.status(500).json({ error: "Failed to save protected apps" });
  }
});

router.post("/analyze-pieces", requireActivePlan(), async (req: Request, res: Response) => {
  const userId = requireMobileAuth(req, res);
  if (!userId) return;

  const rawPieces = req.body?.pieces;
  if (!Array.isArray(rawPieces) || rawPieces.length === 0) {
    res.status(400).json({ error: "pieces must be a non-empty array" });
    return;
  }
  if (rawPieces.length > MAX_PIECES) {
    res.status(400).json({ error: `At most ${MAX_PIECES} pieces are allowed per scan` });
    return;
  }

  const user = await getFreshUser(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const plan = user.planType || "free";
  if (plan === "free") {
    const scansUsed = await countPersonalScans(userId);
    if (scansUsed >= FREE_TRIAL_SCAN_LIMIT) {
      res.status(429).json({
        error: `Your free trial includes ${FREE_TRIAL_SCAN_LIMIT} scans. Subscribe to Personal for unlimited scans.`,
        upgrade: true,
        limit: FREE_TRIAL_SCAN_LIMIT,
        used: scansUsed,
      });
      return;
    }
  }

  let worstLevel = "low";
  let worstScore = 100;
  const allFlags: Array<Record<string, unknown>> = [];
  const pieceSummaries: Array<Record<string, unknown>> = [];
  let hasAttachmentBlocker = false;
  let blockSend = false;
  let primaryText = "";

  for (const raw of rawPieces as MobilePieceInput[]) {
    const source = typeof raw.source === "string" ? raw.source : "prompt";
    const label = typeof raw.label === "string" ? raw.label : source;
    const skipReason = typeof raw.skip_reason === "string" ? raw.skip_reason : null;
    const text = typeof raw.text === "string" ? raw.text : "";

    if (skipReason) {
      hasAttachmentBlocker = true;
      pieceSummaries.push({
        source,
        label,
        level: "skipped",
        issue_count: 0,
        skip_reason: skipReason,
      });
      if (LEVEL_RANK[worstLevel] < LEVEL_RANK.medium) worstLevel = "medium";
      continue;
    }

    if (!text.trim()) continue;
    if (text.length > MAX_PIECE_TEXT_LENGTH) {
      res.status(400).json({ error: `Each piece must be ${MAX_PIECE_TEXT_LENGTH} characters or fewer` });
      return;
    }
    if (source === "prompt" && !primaryText) primaryText = text;

    const analysis = analyzeText(text);
    const risk = calculateRiskScore(analysis.flags);
    if (risk.blockSend) blockSend = true;
    if ((LEVEL_RANK[risk.level] ?? 0) > (LEVEL_RANK[worstLevel] ?? 0)) {
      worstLevel = risk.level;
      worstScore = risk.score;
    } else if (risk.level === worstLevel && risk.score < worstScore) {
      worstScore = risk.score;
    }

    for (const flag of analysis.flags) {
      allFlags.push({
        ...flag,
        detail: `[${label}] ${flag.detail || flag.type}`,
      });
    }

    pieceSummaries.push({
      source,
      label,
      level: risk.level,
      issue_count: analysis.flags.length,
      block_send: risk.blockSend,
    });
  }

  if (blockSend) {
    worstLevel = "high";
    worstScore = Math.min(worstScore, 30);
  }

  const storedContent = (primaryText || "multi-piece scan").substring(0, 200);
  const [scan] = await db
    .insert(personalScansTable)
    .values({
      userId,
      content: storedContent,
      riskScore: worstScore,
      flags: JSON.stringify(allFlags.slice(0, 50)),
      suggestions: JSON.stringify([]),
      level: worstLevel,
    })
    .returning();

  res.json({
    id: scan.id,
    riskScore: worstScore,
    level: worstLevel,
    block_send: blockSend,
    flags: allFlags,
    pieces: pieceSummaries,
    has_attachment_blocker: hasAttachmentBlocker,
  });
});

router.post("/outcome", async (req: Request, res: Response) => {
  if (!requireMobileAuth(req, res)) return;
  const action = typeof req.body?.action === "string" ? req.body.action : "unknown";
  const level = typeof req.body?.level === "string" ? req.body.level : "low";
  const source = typeof req.body?.source === "string" ? req.body.source : "android";
  res.json({ recorded: true, action, level, source });
});

export { isGooglePlaySubscription };
export default router;
