// Type declarations for uninstall-feedback-source.mjs.
export const UNINSTALL_REASONS: readonly string[];
export const MAX_COMMENT_LENGTH: number;

export type ParsedUninstallFeedback =
  | { ok: true; value: { reason: string; comment: string | null; version: string | null } }
  | { ok: false; error: string };

export function parseUninstallFeedback(body: unknown): ParsedUninstallFeedback;
