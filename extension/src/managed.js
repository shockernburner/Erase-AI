// Managed rollout: an organization's IT team force-installs the extension and
// sets its policy (Google Admin, Intune or any tool that writes Chrome
// extension policy) with the organization's enrollment token, and optionally
// the person's work email. The extension then enrolls itself at
// POST /api/org/enroll and stores the check-only key it gets back, so nobody
// has to paste an API key. Policy schema: managed_schema.json.
//
// Pure functions only, so tests can load this file on its own (see
// tests/managed.test.js); background.js does the storage and network I/O.
(function (root) {
  "use strict";

  const STORAGE_KEY = "managed";
  const TOKEN_PREFIX = "eae_";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function cleanEmail(value) {
    if (typeof value !== "string") return null;
    const e = value.trim().toLowerCase();
    return EMAIL_RE.test(e) && e.length <= 320 ? e : null;
  }

  /** The policy IT set, or null when the browser isn't managed by EraseAI policy. */
  function readPolicy(raw) {
    const p = raw && typeof raw === "object" ? raw : {};
    const token = typeof p.enrollmentToken === "string" ? p.enrollmentToken.trim() : "";
    if (!token.startsWith(TOKEN_PREFIX) || token.length < 20) return null;
    return { token, email: cleanEmail(p.userEmail) };
  }

  /** A short, non-secret tag that changes when IT replaces the token. */
  function tokenTag(token) {
    return typeof token === "string" ? token.slice(0, 12) : null;
  }

  function normalizeState(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    return {
      tokenTag: typeof s.tokenTag === "string" ? s.tokenTag : null,
      email: cleanEmail(s.email),
      orgName: typeof s.orgName === "string" ? s.orgName : null,
      enrolledAt: Number.isFinite(s.enrolledAt) ? s.enrolledAt : 0,
      needEmail: s.needEmail === true,
      error: typeof s.error === "string" ? s.error : null,
    };
  }

  /**
   * What to do now. `pendingEmail` is an email the person just typed in the
   * popup (used when the policy doesn't carry one).
   *   none        nothing to do (not managed, or already enrolled with this token)
   *   release     policy was removed: stop showing the browser as managed
   *   need_email  ask the person for their work email
   *   enroll      call the server with { email }
   */
  function decide(policy, state, { apiKey, pendingEmail } = {}) {
    if (!policy) return { action: state.tokenTag || state.needEmail ? "release" : "none" };
    const tag = tokenTag(policy.token);
    if (state.enrolledAt && state.tokenTag === tag && apiKey) return { action: "none" };
    const email = policy.email || cleanEmail(pendingEmail) || state.email;
    if (!email) return { action: "need_email" };
    return { action: "enroll", email, tag };
  }

  /** The API key belongs to the organization: hide the field. */
  function isLocked(state) {
    return Boolean(state && state.enrolledAt && state.tokenTag);
  }

  root.EraseAIManaged = {
    STORAGE_KEY,
    cleanEmail,
    readPolicy,
    tokenTag,
    normalizeState,
    decide,
    isLocked,
  };
})(typeof self !== "undefined" ? self : globalThis);
