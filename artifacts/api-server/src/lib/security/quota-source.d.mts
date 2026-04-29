export const PLAN_REQUEST_LIMITS: Record<string, number>;

export type QuotaDecision =
  | { kind: "unlimited"; limit: -1 }
  | { kind: "no-access"; limit: 0 }
  | { kind: "exceeded"; limit: number; used: number }
  | { kind: "allowed"; limit: number; used: number; remaining: number };

export function evaluateMonthlyQuota(opts: {
  plan: string;
  used: number;
  planLimits?: Record<string, number>;
}): QuotaDecision;
