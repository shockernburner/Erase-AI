import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function getUserPlan(req: Request): string {
  return req.user?.planType || "free";
}

export function requirePro() {
  return (req: Request, res: Response, next: NextFunction) => {
    const plan = getUserPlan(req);
    if (plan !== "pro" && plan !== "enterprise") {
      res.status(403).json({
        error: "This feature requires a Pro or Enterprise plan",
        upgrade: true,
        message: "Upgrade to Pro to unlock this feature",
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
        .select({ planType: usersTable.planType })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id));
      if (freshUser) {
        req.user.planType = (freshUser.planType || "free") as "free" | "pro" | "enterprise";
      }
    } catch {
    }
  }
  next();
}

export const FREE_ROW_LIMIT = 100;

export async function enforceRowLimit(req: Request, res: Response, next: NextFunction) {
  const plan = getUserPlan(req);
  if (plan === "free") {
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
      if (rowCount > FREE_ROW_LIMIT) {
        res.status(400).json({
          error: `Dataset has ${rowCount} rows, exceeding the Free plan limit of ${FREE_ROW_LIMIT}. Upgrade to Pro for unlimited rows.`,
          upgrade: true,
          rowCount,
          limit: FREE_ROW_LIMIT,
        });
        return;
      }
    }
  }
  next();
}
