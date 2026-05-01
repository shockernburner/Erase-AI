// Express middleware factory for the per-plan monthly quota.
// The DB lookup is injected so this is unit-testable without booting
// Postgres — the TS wrapper in middlewares/rateLimitMiddleware.ts wires
// in the real Drizzle-backed lookup.

import {
  PLAN_REQUEST_LIMITS as DEFAULT_PLAN_LIMITS,
  evaluateMonthlyQuota,
} from "./quota-source.mjs";

function getMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getNextMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function createApiRateLimitMiddleware({
  lookupMonthlyUsage,
  planLimits = DEFAULT_PLAN_LIMITS,
  now = () => new Date(),
} = {}) {
  if (typeof lookupMonthlyUsage !== "function") {
    throw new TypeError(
      "createApiRateLimitMiddleware requires lookupMonthlyUsage(userId, monthStart) -> Promise<number>",
    );
  }
  return async function apiRateLimitMiddleware(req, res, next) {
    const apiKeyId = req.apiKeyId;
    if (!apiKeyId) {
      // Session-only callers (the dashboard) don't have an apiKeyId; the
      // monthly cap is for API-key traffic only, so we pass through.
      next();
      return;
    }

    // Demo keys (task #158) have their own per-key quota enforced by
    // the auth middleware. They are all bound to a shared
    // system-demo-user, so applying the per-user monthly cap here
    // would let any one visitor exhaust the shared pool and 429 the
    // rest. The auth middleware's per-key quota is the right cap.
    if (req.apiKeyHasQuota) {
      next();
      return;
    }

    const plan = req.user?.planType || "free";
    const reset = getNextMonthStart(now()).toISOString();

    // Fast path: skip the DB roundtrip for plans where the answer is
    // independent of usage (unlimited / no-access).
    const fast = evaluateMonthlyQuota({ plan, used: 0, planLimits });
    if (fast.kind === "unlimited") {
      res.setHeader("X-RateLimit-Limit", "unlimited");
      res.setHeader("X-RateLimit-Remaining", "unlimited");
      res.setHeader("X-RateLimit-Reset", reset);
      next();
      return;
    }
    if (fast.kind === "no-access") {
      res.status(403).json({ error: "API access not available on this plan" });
      return;
    }

    let used = 0;
    try {
      used = await lookupMonthlyUsage(req.user.id, getMonthStart(now()));
    } catch (err) {
      // Don't fail-open: if we can't tell whether they're over, refuse the
      // request rather than serve free traffic.
      // eslint-disable-next-line no-console
      console.error("Rate limit check error:", err);
      res.status(503).json({ error: "Unable to verify rate limit. Please try again shortly." });
      return;
    }

    const decision = evaluateMonthlyQuota({ plan, used, planLimits });
    if (decision.kind === "exceeded") {
      const limit = decision.limit;
      const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
      const resetDate = new Date(reset);
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", reset);
      res.status(429).json({
        error: `Monthly API rate limit exceeded. Your ${planLabel} plan allows ${limit.toLocaleString()} requests/month. Limit resets on ${resetDate.toLocaleDateString()}.`,
        limit,
        used: decision.used,
        resetDate: reset,
        upgrade: plan !== "enterprise",
      });
      return;
    }

    res.setHeader("X-RateLimit-Limit", String(decision.limit));
    res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
    res.setHeader("X-RateLimit-Reset", reset);
    next();
  };
}
