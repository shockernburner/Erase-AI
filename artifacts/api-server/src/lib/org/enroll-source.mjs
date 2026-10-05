// Managed rollout (organization enrollment) rules.
//
// IT pushes an organization's enrollment token to managed Chrome browsers and
// Android phones through policy (Google Admin, Intune, any EMM). A browser
// then enrolls a person by their work email, and only emails on the
// organization's allowed domains can join. Pure helpers here are covered by
// `node --test`; routes/org-enroll.ts uses the same functions.
//
// Trust model: the token proves "this device belongs to the organization",
// not who is using it. So a browser enrolled by token gets a *managed* API
// key that may only run firewall checks (analyze, sanitize, outcome, ping):
// someone holding the token can at worst add checks under a colleague's
// name, never read anyone's history. Signed-in enrollment (the app or website,
// where the person proved their email) joins the organization normally.

import { createHash, randomBytes } from "node:crypto";
import { normalizeEmail } from "./org-source.mjs";

export const MAX_ALLOWED_DOMAINS = 10;
export const MAX_MANAGED_KEYS_PER_USER = 10;
export const ENROLLMENT_TOKEN_PREFIX = "eae_";
export const ENROLL_CLIENTS = new Set(["chrome", "android", "web"]);

// Paths (under /api/dev) a managed key may call.
export const MANAGED_KEY_PATHS = new Set(["/ping", "/analyze", "/sanitize", "/outcome"]);

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

// Accepts a comma/space/newline separated list or an array. Returns the
// normalized, de-duplicated list, or an error naming the first bad entry.
export function parseAllowedDomains(input) {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[\s,;]+/) : null;
  if (!raw) return { ok: false, error: "domains must be a list" };
  const out = [];
  for (const entry of raw) {
    if (typeof entry !== "string") return { ok: false, error: "domains must be text" };
    const d = entry.trim().toLowerCase().replace(/^@/, "").replace(/\.$/, "");
    if (!d) continue;
    if (!DOMAIN_RE.test(d)) return { ok: false, error: `"${entry.trim()}" is not a domain like company.com` };
    if (!out.includes(d)) out.push(d);
  }
  if (out.length > MAX_ALLOWED_DOMAINS) return { ok: false, error: `At most ${MAX_ALLOWED_DOMAINS} domains` };
  return { ok: true, domains: out };
}

export function splitStoredDomains(stored) {
  return typeof stored === "string" && stored ? stored.split(",").filter(Boolean) : [];
}

export function emailDomainAllowed(email, domains) {
  const e = normalizeEmail(email);
  if (!e || !Array.isArray(domains) || domains.length === 0) return false;
  const domain = e.slice(e.lastIndexOf("@") + 1);
  return domains.includes(domain);
}

export function generateEnrollmentToken() {
  const token = `${ENROLLMENT_TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { token, hash: hashEnrollmentToken(token), prefix: token.slice(0, 12) };
}

export function hashEnrollmentToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function looksLikeEnrollmentToken(token) {
  return typeof token === "string" && token.startsWith(ENROLLMENT_TOKEN_PREFIX) && token.length >= 20 && token.length <= 100;
}

// Decide how a person joins. Inputs:
//   org            { id, status, seatLimit, allowedDomains: string[] }
//   email          the person's email (verified for signed-in enrollment)
//   activeOrgId    id of the org they're already active in, or null
//   pendingInvite  their invited (not yet accepted) row in this org, or null
//   seatsUsed      active members + pending invites in this org
export function decideEnrollment({ org, email, activeOrgId, pendingInvite, seatsUsed }) {
  if (!org || org.status !== "active") {
    return { ok: false, status: 403, error: "This organization isn't active. Ask your IT team." };
  }
  if (!org.allowedDomains || org.allowedDomains.length === 0) {
    return { ok: false, status: 403, error: "Your organization hasn't set its email domains for automatic setup yet. Ask your IT team." };
  }
  const e = normalizeEmail(email);
  if (!e) return { ok: false, status: 400, error: "Enter your work email" };
  if (!emailDomainAllowed(e, org.allowedDomains)) {
    return { ok: false, status: 403, error: `Use your work email (${org.allowedDomains.map((d) => "@" + d).join(", ")}).` };
  }
  if (activeOrgId === org.id) return { ok: true, action: "already", email: e };
  if (activeOrgId) {
    return { ok: false, status: 409, error: "This account already belongs to another organization." };
  }
  // A pending invite already holds a seat.
  if (pendingInvite) return { ok: true, action: "activate", email: e };
  if (seatsUsed >= org.seatLimit) {
    return { ok: false, status: 409, error: "Your organization has no free seats. Ask your admin to add seats." };
  }
  return { ok: true, action: "create", email: e };
}

export function managedKeyAllows(path) {
  return MANAGED_KEY_PATHS.has(path);
}

// Ready-to-paste policy for IT. Chrome reads it from managed storage
// (Google Admin: Devices > Chrome > Apps & extensions > the extension >
// Policy for extensions); Android from managed configurations.
export function buildPolicySnippets({ token, chromeExtensionId, androidPackage }) {
  return {
    chrome: {
      extensionId: chromeExtensionId,
      policy: { enrollmentToken: { Value: token } },
      policyJson: JSON.stringify({ enrollmentToken: { Value: token } }, null, 2),
    },
    android: {
      packageName: androidPackage,
      managedConfiguration: { enrollment_token: token },
    },
  };
}
