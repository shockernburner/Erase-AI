export const RESET_TOKEN_TTL_MS: number;
export const MAX_RESETS_PER_HOUR: number;
export const MIN_PASSWORD_LENGTH: number;
export const MAX_PASSWORD_LENGTH: number;
export const DEFAULT_WEB_BASE_URL: string;

export function generateResetToken(nowMs?: number): { token: string; hash: string; expiresAt: Date };
export function hashResetToken(token: string): string;
export function canIssueReset(recentCount: number): boolean;
export function validateNewPassword(password: unknown): { ok: true } | { ok: false; error: string };
export function checkResetToken(
  row: { expiresAt: Date | string; usedAt: Date | string | null } | null | undefined,
  nowMs?: number,
): { ok: true } | { ok: false; error: string };
export function buildResetUrl(token: string, baseUrl?: string | null): string;
export function buildResetEmail(input: { url: string; firstName?: string | null }): {
  subject: string;
  text: string;
  html: string;
};
