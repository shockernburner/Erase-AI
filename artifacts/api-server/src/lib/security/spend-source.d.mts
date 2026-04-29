export const PLAN_SPEND_BUDGET_MICROS: Record<string, number>;
export const PLAN_TOKEN_COST_MICROS_PER_TOKEN: Record<string, number>;

export function estimateTokensFromBytes(bytes: number): number;

export function estimateRequestCost(opts: {
  plan: string;
  requestBytes?: number;
  responseBytes?: number;
  pricing?: Record<string, number>;
}): { tokens: number; costMicros: number };

export function resolveSpendBudget(opts: {
  plan: string;
  override?: number | null;
  planLimits?: Record<string, number>;
}): number;

export type SpendDecision =
  | { kind: "unlimited"; limit: -1 }
  | { kind: "no-access"; limit: 0 }
  | { kind: "exceeded"; limit: number; used: number }
  | { kind: "allowed"; limit: number; used: number; remaining: number };

export function evaluateMonthlySpend(opts: {
  plan: string;
  usedMicros: number;
  override?: number | null;
  planLimits?: Record<string, number>;
}): SpendDecision;

export function formatMicrosUsd(micros: number): string;
