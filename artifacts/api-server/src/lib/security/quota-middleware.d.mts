import type { Request, Response, NextFunction } from "express";

export type LookupMonthlyUsage = (userId: string, monthStart: Date) => Promise<number>;

export function createApiRateLimitMiddleware(opts: {
  lookupMonthlyUsage: LookupMonthlyUsage;
  planLimits?: Record<string, number>;
  now?: () => Date;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
