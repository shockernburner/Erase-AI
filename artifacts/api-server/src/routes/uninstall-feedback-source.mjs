// Validation for the anonymous extension uninstall survey
// (POST /api/extension/uninstall-feedback). The extension's uninstall URL
// carries only the version, and the survey page sends back one reason from a
// fixed list plus an optional short comment — nothing that identifies the
// person. Kept in plain JS so node:test can exercise it without Express.

export const UNINSTALL_REASONS = Object.freeze([
  "no_account",
  "too_many_warnings",
  "missed_something",
  "broke_site",
  "privacy_concern",
  "too_expensive",
  "not_needed",
  "other",
]);

export const MAX_COMMENT_LENGTH = 500;
const VERSION_PATTERN = /^\d{1,3}(\.\d{1,4}){1,3}$/;

export function parseUninstallFeedback(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "invalid_body" };
  const { reason, comment, version } = body;
  if (typeof reason !== "string" || !UNINSTALL_REASONS.includes(reason)) {
    return { ok: false, error: "invalid_reason" };
  }
  let cleanComment = null;
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== "string") return { ok: false, error: "invalid_comment" };
    const trimmed = comment.trim();
    if (trimmed.length > MAX_COMMENT_LENGTH) return { ok: false, error: "comment_too_long" };
    cleanComment = trimmed.length > 0 ? trimmed : null;
  }
  const cleanVersion = typeof version === "string" && VERSION_PATTERN.test(version) ? version : null;
  return { ok: true, value: { reason, comment: cleanComment, version: cleanVersion } };
}
