// The account's plan, as the extension sees it.
//
// Free (no account, or a free account): every prompt is checked on this
// device and warned about, with no limit. EraseAI Personal (or any paid plan)
// adds one-click Sanitize & Send, attachment and screenshot scanning, history
// and the Android app. The plan is read from the server with the user's API
// key and cached in chrome.storage.local.
//
// Pure functions only, so tests can load this file on its own (see
// tests/plan.test.js); background.js does the storage and network I/O.
(function (root) {
  "use strict";

  const STORAGE_KEY = "plan";
  // How long a plan read from the server is trusted before re-checking.
  const PLAN_TTL_MS = 6 * 60 * 60 * 1000;
  const PAID_PLANS = new Set(["personal", "pro", "business", "enterprise"]);

  function isPaidPlan(plan) {
    return typeof plan === "string" && PAID_PLANS.has(plan);
  }

  function normalizeState(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    const plan = typeof s.plan === "string" ? s.plan : null;
    const planCheckedAt = Number.isFinite(s.planCheckedAt) ? s.planCheckedAt : 0;
    return { plan, planCheckedAt };
  }

  function planIsFresh(state, now) {
    return state.plan != null && now - state.planCheckedAt < PLAN_TTL_MS;
  }

  function withPlan(state, plan, now) {
    return { ...state, plan: typeof plan === "string" ? plan : null, planCheckedAt: now };
  }

  /** Paid features need both a paid plan and the key it was read with. */
  function hasPaidFeatures(state, { hasKey }) {
    return Boolean(hasKey) && isPaidPlan(state.plan);
  }

  function subscribeUrl(version, medium = "upgrade") {
    const url = new URL("https://eraseai.ai/pricing");
    url.searchParams.set("plan", "personal");
    url.searchParams.set("utm_source", "extension");
    url.searchParams.set("utm_medium", medium);
    if (version) url.searchParams.set("v", version);
    return url.toString();
  }

  root.EraseAIPlan = {
    STORAGE_KEY,
    PLAN_TTL_MS,
    isPaidPlan,
    normalizeState,
    planIsFresh,
    withPlan,
    hasPaidFeatures,
    subscribeUrl,
  };
})(typeof self !== "undefined" ? self : globalThis);
