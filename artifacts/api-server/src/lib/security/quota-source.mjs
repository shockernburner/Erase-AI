// Pure decision logic for the per-plan monthly quota that
// `apiRateLimit()` enforces. Extracted so we can unit-test the policy
// (which plans get blocked, which get unlimited, what the response shape
// looks like at the cap) without booting Express + Postgres.

export const PLAN_REQUEST_LIMITS = {
  personal: 200,
  pro: 1000,
  business: 10000,
  enterprise: -1,
};

export function evaluateMonthlyQuota({ plan, used, planLimits = PLAN_REQUEST_LIMITS } = {}) {
  const limit = planLimits[plan] ?? 0;
  if (limit === -1) {
    return { kind: "unlimited", limit: -1 };
  }
  if (limit === 0) {
    return { kind: "no-access", limit: 0 };
  }
  if (used >= limit) {
    return { kind: "exceeded", limit, used };
  }
  const remaining = Math.max(0, limit - used - 1);
  return { kind: "allowed", limit, used, remaining };
}
