import { Router, type IRouter, type Request, type Response } from "express";
import { db, personalScansTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  buildMobileBillingUrls,
  buildMobileHealthPayload,
  mapPlanForMobile,
  mobileFeaturesForPlan,
  mobileStatusForPlan,
  scanLimitForPlan,
} from "../lib/mobileEntitlement";

const router: IRouter = Router();

const MAX_PROTECTED_APPS = 100;
const PACKAGE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/;

function getWebBaseUrl(): string {
  const configured = process.env.WEB_BASE_URL || process.env.PUBLIC_WEB_BASE_URL;
  if (configured) return configured;
  return "https://eraseai.ai";
}

router.get("/health", (_req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(buildMobileHealthPayload());
});

function requireMobileAuth(req: Request, res: Response): boolean {
  if (!req.user?.id) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
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
  return user;
}

router.get("/entitlement", async (req: Request, res: Response) => {
  if (!requireMobileAuth(req, res)) return;

  try {
    const user = await getFreshUser(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const plan = user.planType || "free";
    const billing = buildMobileBillingUrls(getWebBaseUrl());
    const scansUsed = await countPersonalScans(user.id);

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      plan: mapPlanForMobile(plan),
      status: mobileStatusForPlan(plan, user.subscriptionStatus, user.planEndDate),
      monthly_scan_limit: scanLimitForPlan(plan),
      monthly_scans_used: scansUsed,
      features: mobileFeaturesForPlan(plan),
      billing,
    });
  } catch (err) {
    console.error("Mobile entitlement error:", err);
    res.status(500).json({ error: "Failed to load mobile entitlement" });
  }
});

router.get("/billing-url", (req: Request, res: Response) => {
  if (!requireMobileAuth(req, res)) return;
  res.json(buildMobileBillingUrls(getWebBaseUrl()));
});

router.get("/protected-apps", async (req: Request, res: Response) => {
  if (!requireMobileAuth(req, res)) return;

  try {
    const result = await db.execute(sql`
      SELECT packages, firewall_enabled, updated_at
      FROM mobile_protected_apps
      WHERE user_id = ${req.user.id}
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
  if (!requireMobileAuth(req, res)) return;

  const packages = normalizeProtectedPackages(req.body?.packages);
  if (!packages) {
    res.status(400).json({ error: "packages must be an array of valid Android package names" });
    return;
  }

  const firewallEnabled = typeof req.body?.firewall_enabled === "boolean" ? req.body.firewall_enabled : true;

  try {
    const result = await db.execute(sql`
      INSERT INTO mobile_protected_apps (user_id, packages, firewall_enabled, updated_at)
      VALUES (${req.user.id}, ${JSON.stringify(packages)}::jsonb, ${firewallEnabled}, NOW())
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

export default router;
