import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function getUserPlan(req: Request): string {
  return req.user?.planType || "free";
}

export function isTrialExpired(user: Express.User | undefined): boolean {
  if (!user) return true;
  const plan = user.planType || "free";
  if (plan !== "free") return false;
  if (user.role === "admin") return false;
  if (!user.planEndDate) return false;
  return new Date(user.planEndDate) < new Date();
}

export function requireActivePlan() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isTrialExpired(req.user)) {
      res.status(403).json({
        error: "Your 7-day free trial has expired. Upgrade to continue using EraseAI.",
        trialExpired: true,
        upgrade: true,
      });
      return;
    }
    next();
  };
}

export function requirePro() {
  return (req: Request, res: Response, next: NextFunction) => {
    const plan = getUserPlan(req);
    if (plan !== "pro" && plan !== "business" && plan !== "enterprise") {
      res.status(403).json({
        error: "This feature requires a Pro, Business, or Enterprise plan",
        upgrade: true,
        message: "Upgrade to Pro to unlock this feature",
      });
      return;
    }
    next();
  };
}

export function requireBusiness() {
  return (req: Request, res: Response, next: NextFunction) => {
    const plan = getUserPlan(req);
    if (plan !== "business" && plan !== "enterprise") {
      res.status(403).json({
        error: "This feature requires a Business or Enterprise plan",
        upgrade: true,
        message: "Upgrade to Business to unlock this feature",
      });
      return;
    }
    next();
  };
}

export function requireEnterprise() {
  return (req: Request, res: Response, next: NextFunction) => {
    const plan = getUserPlan(req);
    if (plan !== "enterprise") {
      res.status(403).json({
        error: "This feature requires an Enterprise plan",
        upgrade: true,
        message: "Contact sales for Enterprise access",
      });
      return;
    }
    next();
  };
}

export async function refreshPlanFromDB(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.id) {
    try {
      const [freshUser] = await db
        .select({ planType: usersTable.planType, planEndDate: usersTable.planEndDate })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id));
      if (freshUser) {
        req.user.planType = (freshUser.planType || "free") as "free" | "pro" | "business" | "enterprise";
        if (freshUser.planEndDate) {
          req.user.planEndDate = freshUser.planEndDate.toISOString();
        }
      }
    } catch {
    }
  }
  next();
}

export const FREE_ROW_LIMIT = 100;
export const PRO_ROW_LIMIT = 1000;
export const BUSINESS_ROW_LIMIT = 10000;

const PLAN_ROW_LIMITS: Record<string, number> = {
  free: FREE_ROW_LIMIT,
  pro: PRO_ROW_LIMIT,
  business: BUSINESS_ROW_LIMIT,
};

export async function enforceRowLimit(req: Request, res: Response, next: NextFunction) {
  const plan = getUserPlan(req);
  const limit = PLAN_ROW_LIMITS[plan] ?? -1;

  if (limit > 0) {
    const file = req.file;
    if (file) {
      const content = file.buffer.toString("utf-8");
      let rowCount = 0;
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) rowCount = parsed.length;
      } catch {
        rowCount = content.split("\n").filter((l: string) => l.trim()).length - 1;
      }
      if (rowCount > limit) {
        const nextTier = plan === "free" ? "Pro" : plan === "pro" ? "Business" : "Enterprise";
        res.status(400).json({
          error: `Dataset has ${rowCount} rows, exceeding the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan limit of ${limit.toLocaleString()}. Upgrade to ${nextTier} for higher limits.`,
          upgrade: true,
          rowCount,
          limit,
        });
        return;
      }
    }
  }
  next();
}
