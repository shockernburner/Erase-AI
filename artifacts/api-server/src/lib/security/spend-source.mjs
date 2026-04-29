// Per-plan monthly vendor spend cap (task #132). Layered on top of the
// per-plan request count cap. All amounts in micro-USD (1 = $0.000001)
// so we sum them as plain integers in SQL.

// -1 = unlimited. `free` is intentionally absent (request-count
// middleware already 403s free plans before this runs).
export const PLAN_SPEND_BUDGET_MICROS = {
  personal: 5_000_000,
  pro: 50_000_000,
  business: 500_000_000,
  enterprise: -1,
};

// Per-plan vendor cost in micro-USD per token.
export const PLAN_TOKEN_COST_MICROS_PER_TOKEN = {
  personal: 1,
  pro: 5,
  business: 5,
  enterprise: 5,
};

// ~4 bytes per token (industry rule of thumb). Round up so the cap
// brakes earlier rather than later for a leaked key.
export function estimateTokensFromBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n / 4));
}

// Both request and response bytes count (prompt + completion).
export function estimateRequestCost({
  plan,
  requestBytes = 0,
  responseBytes = 0,
  pricing = PLAN_TOKEN_COST_MICROS_PER_TOKEN,
} = {}) {
  const tokens = estimateTokensFromBytes(requestBytes) + estimateTokensFromBytes(responseBytes);
  const ratePerToken = pricing[plan] ?? 0;
  return { tokens, costMicros: tokens * ratePerToken };
}

// null/undefined override → plan default. -1 anywhere → unlimited.
export function resolveSpendBudget({
  plan,
  override = null,
  planLimits = PLAN_SPEND_BUDGET_MICROS,
} = {}) {
  if (override !== null && override !== undefined) return override;
  if (Object.prototype.hasOwnProperty.call(planLimits, plan)) return planLimits[plan];
  return 0;
}

// Decision shape mirrors evaluateMonthlyQuota() so the 429 body matches
// the existing rate-limit 429.
export function evaluateMonthlySpend({
  plan,
  usedMicros,
  override = null,
  planLimits = PLAN_SPEND_BUDGET_MICROS,
} = {}) {
  const limit = resolveSpendBudget({ plan, override, planLimits });
  if (limit === -1) return { kind: "unlimited", limit: -1 };
  if (limit === 0) return { kind: "no-access", limit: 0 };
  const used = Number(usedMicros) || 0;
  if (used >= limit) return { kind: "exceeded", limit, used };
  return { kind: "allowed", limit, used, remaining: Math.max(0, limit - used) };
}

export function formatMicrosUsd(micros) {
  const dollars = (Number(micros) || 0) / 1_000_000;
  if (dollars >= 100) return `$${dollars.toFixed(0)}`;
  if (dollars >= 1) return `$${dollars.toFixed(2)}`;
  return `$${dollars.toFixed(4)}`;
}
