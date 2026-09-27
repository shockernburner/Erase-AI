// Install/uninstall hooks and the one-time review prompt.
//
// Shared by the background service worker (via importScripts) and the popup
// (via a <script> tag), so it only touches globals both have. Everything that
// decides *whether* to do something is a pure function so it can be tested
// without a browser.
//
// Review prompt policy: ask once, only after the extension has visibly done
// its job (a risky send the user sanitized or cancelled) several times and
// has been installed for a few days. Everyone is asked the same way, with a
// "Report a problem" path next to "Rate" and no incentive — the Chrome Web
// Store forbids manipulating ratings.
(function (root) {
  // Chrome Web Store ID of the published listing (not the pinned dev ID in
  // manifest.json's `key`, which the store build strips).
  const EXTENSION_ID = "hckhbadbpkihjpooeljdocgidelcampp";
  const STORE_URL = `https://chromewebstore.google.com/detail/eraseai-firewall/${EXTENSION_ID}`;
  const SITE = "https://eraseai.ai";

  const REVIEW_MIN_PROTECTED = 3;
  const REVIEW_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000;
  const STORAGE_KEY = "growth";

  // Levels the server uses for "nothing to worry about".
  const HARMLESS_LEVELS = new Set(["low", "safe", "info", "none"]);
  // A user choosing not to send what was flagged is the moment the firewall
  // earned its keep. "send-anyway" and "auto-send" are not.
  const PROTECTIVE_ACTIONS = new Set(["sanitize", "cancel"]);

  function withUtm(url, medium, version) {
    const u = new URL(url);
    u.searchParams.set("utm_source", "extension");
    u.searchParams.set("utm_medium", medium);
    if (version) u.searchParams.set("v", version);
    return u.toString();
  }

  const urls = {
    welcome: (version) => withUtm(`${SITE}/ai-firewall/welcome`, "install", version),
    // Only the version goes out: the survey must not identify the user.
    uninstall: (version) => withUtm(`${SITE}/ai-firewall/uninstalled`, "uninstall", version),
    review: () => withUtm(`${STORE_URL}/reviews`, "review_prompt"),
    listing: (medium) => withUtm(STORE_URL, medium || "popup"),
    support: () => withUtm(`${SITE}/contact`, "review_prompt"),
  };

  function emptyState(now) {
    return { installedAt: now, protectedCount: 0, review: "pending" };
  }

  function normalizeState(raw, now) {
    const base = emptyState(now);
    if (!raw || typeof raw !== "object") return base;
    return {
      installedAt: Number.isFinite(raw.installedAt) ? raw.installedAt : base.installedAt,
      protectedCount: Number.isFinite(raw.protectedCount) && raw.protectedCount >= 0 ? raw.protectedCount : 0,
      review: ["pending", "shown", "rated", "dismissed"].includes(raw.review) ? raw.review : "pending",
    };
  }

  function isProtectiveOutcome(outcome) {
    if (!outcome || typeof outcome !== "object") return false;
    const level = typeof outcome.level === "string" ? outcome.level.toLowerCase() : "";
    return PROTECTIVE_ACTIONS.has(outcome.action) && level !== "" && !HARMLESS_LEVELS.has(level);
  }

  function recordOutcome(state, outcome) {
    if (!isProtectiveOutcome(outcome)) return state;
    return { ...state, protectedCount: state.protectedCount + 1 };
  }

  function shouldPromptReview(state, now) {
    return (
      state.review === "pending" &&
      state.protectedCount >= REVIEW_MIN_PROTECTED &&
      now - state.installedAt >= REVIEW_MIN_AGE_MS
    );
  }

  root.EraseAIGrowth = {
    EXTENSION_ID,
    STORAGE_KEY,
    REVIEW_MIN_PROTECTED,
    REVIEW_MIN_AGE_MS,
    urls,
    emptyState,
    normalizeState,
    isProtectiveOutcome,
    recordOutcome,
    shouldPromptReview,
  };
})(typeof self !== "undefined" ? self : globalThis);
