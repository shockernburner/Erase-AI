// Password reset rules.
//
// Pure helpers for /api/auth/forgot-password and /api/auth/reset-password,
// kept in an .mjs module so `node --test` can cover them without Express or a
// database. routes/auth.ts imports the same functions.

import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
// Links issued per account per hour, so the form can't be used to flood
// someone's inbox.
export const MAX_RESETS_PER_HOUR = 3;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;
export const DEFAULT_WEB_BASE_URL = "https://eraseai.ai";

export function generateResetToken(nowMs = Date.now()) {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResetToken(token), expiresAt: new Date(nowMs + RESET_TOKEN_TTL_MS) };
}

export function hashResetToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function canIssueReset(recentCount) {
  return recentCount < MAX_RESETS_PER_HOUR;
}

export function validateNewPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }
  return { ok: true };
}

// `row` is the stored token ({ expiresAt, usedAt }) found by hash, or null.
export function checkResetToken(row, nowMs = Date.now()) {
  const invalid = { ok: false, error: "This reset link is not valid or has expired. Ask for a new one." };
  if (!row || row.usedAt) return invalid;
  const expires = new Date(row.expiresAt).getTime();
  if (!Number.isFinite(expires) || expires <= nowMs) return invalid;
  return { ok: true };
}

// The emailed link always uses the configured site address, never the
// request's Host header, so a forged Host can't redirect the token elsewhere.
export function buildResetUrl(token, baseUrl) {
  const base = (typeof baseUrl === "string" && /^https?:\/\//.test(baseUrl) ? baseUrl : DEFAULT_WEB_BASE_URL).replace(/\/+$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function buildResetEmail({ url, firstName }) {
  const hello = firstName ? `Hi ${firstName},` : "Hi,";
  const text = [
    hello,
    "",
    "Someone asked to reset the password for your EraseAI account. Open this link to choose a new one:",
    url,
    "",
    "The link works once and expires in 30 minutes. If you didn't ask for this, ignore this email; your password stays the same.",
    "",
    "EraseAI",
  ].join("\n");
  const html = `<p>${escapeHtml(hello)}</p>
<p>Someone asked to reset the password for your EraseAI account. Choose a new one here:</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 18px;background:#06b6d4;color:#000;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
<p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(url)}</p>
<p style="color:#666;font-size:13px">The link works once and expires in 30 minutes. If you didn't ask for this, ignore this email; your password stays the same.</p>
<p>EraseAI</p>`;
  return { subject: "Reset your EraseAI password", text, html };
}
