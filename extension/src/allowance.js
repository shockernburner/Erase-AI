// Free-check allowance for the Chrome extension.
//
// Free users get FREE_CHECKS checks in total (one per send that EraseAI
// checks, however many file pieces it has). After that EraseAI pauses: sends
// go through unchecked and the user is asked to subscribe. Personal (or any
// paid plan) is unlimited. The count lives in chrome.storage.local, so it is
// per browser profile; reinstalling resets it, which is acceptable for a
// trial.
//
// Pure functions only, so tests can load this file on its own (see
// tests/allowance.test.js); background.js does the storage and network I/O.
(function (root) {
  "use strict";

  const FREE_CHECKS = 25;
  const STORAGE_KEY = "allowance";
  // How long a plan read from the server is trusted before re-checking.
  const PLAN_TTL_MS = 6 * 60 * 60 * 1000;
  const PAID_PLANS = new Set(["personal", "pro", "business", "enterprise"]);

  function isPaidPlan(plan) {
    return typeof plan === "string" && PAID_PLANS.has(plan);
  }

  function normalizeState(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    const used = Number.isFinite(s.used) && s.used > 0 ? Math.floor(s.used) : 0;
    const plan = typeof s.plan === "string" ? s.plan : null;
    const planCheckedAt = Number.isFinite(s.planCheckedAt) ? s.planCheckedAt : 0;
    return { used, plan, planCheckedAt };
  }

  function planIsFresh(state, now) {
    return state.plan != null && now - state.planCheckedAt < PLAN_TTL_MS;
  }

  function withPlan(state, plan, now) {
    return { ...state, plan: typeof plan === "string" ? plan : null, planCheckedAt: now };
  }

  /**
   * Decides one send. Returns the decision and the state to store:
   *   { decision: "paid" }             paid plan, nothing counted
   *   { decision: "allowed", used, remaining }   free check consumed
   *   { decision: "paused", used }     free checks used up
   */
  function decide(state, { hasKey }) {
    if (hasKey && isPaidPlan(state.plan)) {
      return { decision: "paid", state };
    }
    if (state.used >= FREE_CHECKS) {
      return { decision: "paused", used: state.used, limit: FREE_CHECKS, state };
    }
    const next = { ...state, used: state.used + 1 };
    return {
      decision: "allowed",
      used: next.used,
      remaining: FREE_CHECKS - next.used,
      limit: FREE_CHECKS,
      state: next,
    };
  }

  function subscribeUrl(version) {
    const url = new URL("https://eraseai.ai/pricing");
    url.searchParams.set("plan", "personal");
    url.searchParams.set("utm_source", "extension");
    url.searchParams.set("utm_medium", "free_limit");
    if (version) url.searchParams.set("v", version);
    return url.toString();
  }

  root.EraseAIAllowance = {
    FREE_CHECKS,
    STORAGE_KEY,
    PLAN_TTL_MS,
    isPaidPlan,
    normalizeState,
    planIsFresh,
    withPlan,
    decide,
    subscribeUrl,
  };
})(typeof self !== "undefined" ? self : globalThis);
