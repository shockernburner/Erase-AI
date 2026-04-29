import type { Request, Response, NextFunction } from "express";

export type LookupMonthlySpend = (userId: string, monthStart: Date) => Promise<number>;
export type LookupSpendOverride = (userId: string) => Promise<number | null>;

export function createApiSpendCapMiddleware(opts: {
  lookupMonthlySpend: LookupMonthlySpend;
  lookupSpendOverride?: LookupSpendOverride;
  planLimits?: Record<string, number>;
  now?: () => Date;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
