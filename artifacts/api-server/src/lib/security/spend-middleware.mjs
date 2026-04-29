// Per-plan vendor spend cap on /api/v1/* (task #132). Layered on top of
// the per-plan request count quota. DB lookups are injected so the
// policy is unit-testable without booting Postgres.

import {
  PLAN_SPEND_BUDGET_MICROS as DEFAULT_PLAN_LIMITS,
  evaluateMonthlySpend,
  formatMicrosUsd,
} from "./spend-source.mjs";

function getMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getNextMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function createApiSpendCapMiddleware({
  lookupMonthlySpend,
  lookupSpendOverride = async () => null,
  planLimits = DEFAULT_PLAN_LIMITS,
  now = () => new Date(),
} = {}) {
  if (typeof lookupMonthlySpend !== "function") {
    throw new TypeError(
      "createApiSpendCapMiddleware requires lookupMonthlySpend(userId, monthStart) -> Promise<number>",
    );
  }
  if (typeof lookupSpendOverride !== "function") {
    throw new TypeError(
      "createApiSpendCapMiddleware requires lookupSpendOverride(userId) -> Promise<number|null>",
    );
  }

  return async function apiSpendCapMiddleware(req, res, next) {
    const apiKeyId = req.apiKeyId;
    if (!apiKeyId) {
      // Session-only callers (dashboard playground) bypass.
      next();
      return;
    }

    const plan = req.user?.planType || "free";
    const reset = getNextMonthStart(now()).toISOString();

    let override = null;
    try {
      override = await lookupSpendOverride(req.user.id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Spend-cap override lookup error:", err);
      res.status(503).json({ error: "Unable to verify spend cap. Please try again shortly." });
      return;
    }

    // Fast path: unlimited skips the SUM(cost_micros) query.
    const fast = evaluateMonthlySpend({ plan, usedMicros: 0, override, planLimits });
    if (fast.kind === "unlimited") {
      res.setHeader("X-SpendCap-Limit", "unlimited");
      res.setHeader("X-SpendCap-Remaining", "unlimited");
      res.setHeader("X-SpendCap-Reset", reset);
      next();
      return;
    }
    if (fast.kind === "no-access") {
      res.status(403).json({ error: "API access not available on this plan" });
      return;
    }

    let usedMicros = 0;
    try {
      usedMicros = await lookupMonthlySpend(req.user.id, getMonthStart(now()));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Spend-cap usage lookup error:", err);
      res.status(503).json({ error: "Unable to verify spend cap. Please try again shortly." });
      return;
    }

    const decision = evaluateMonthlySpend({ plan, usedMicros, override, planLimits });
    if (decision.kind === "exceeded") {
      const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
      const limitLabel = formatMicrosUsd(decision.limit);
      const usedLabel = formatMicrosUsd(decision.used);
      const resetDate = new Date(reset);
      res.setHeader("X-SpendCap-Limit", String(decision.limit));
      res.setHeader("X-SpendCap-Remaining", "0");
      res.setHeader("X-SpendCap-Reset", reset);
      res.status(429).json({
        error: `Monthly spend cap exceeded for this billing month. Your ${planLabel} plan is limited to ${limitLabel} of vendor spend per month (used ${usedLabel}). Cap resets on ${resetDate.toLocaleDateString()}.`,
        spendCapExceeded: true,
        limitMicros: decision.limit,
        usedMicros: decision.used,
        resetDate: reset,
        upgrade: plan !== "enterprise",
      });
      return;
    }

    res.setHeader("X-SpendCap-Limit", String(decision.limit));
    res.setHeader("X-SpendCap-Remaining", String(decision.remaining));
    res.setHeader("X-SpendCap-Reset", reset);
    next();
  };
}
