export const MAX_ALLOWED_DOMAINS: number;
export const MAX_MANAGED_KEYS_PER_USER: number;
export const ENROLLMENT_TOKEN_PREFIX: string;
export const ENROLL_CLIENTS: ReadonlySet<string>;
export const MANAGED_KEY_PATHS: ReadonlySet<string>;

export function parseAllowedDomains(input: unknown): { ok: true; domains: string[] } | { ok: false; error: string };
export function splitStoredDomains(stored: string | null | undefined): string[];
export function emailDomainAllowed(email: unknown, domains: string[]): boolean;
export function generateEnrollmentToken(): { token: string; hash: string; prefix: string };
export function hashEnrollmentToken(token: string): string;
export function looksLikeEnrollmentToken(token: unknown): token is string;
export function decideEnrollment(input: {
  org: { id: string; status: string; seatLimit: number; allowedDomains: string[] } | null | undefined;
  email: unknown;
  activeOrgId: string | null;
  pendingInvite: { id: string } | null;
  seatsUsed: number;
}):
  | { ok: true; action: "already" | "activate" | "create"; email: string }
  | { ok: false; status: number; error: string };
export function managedKeyAllows(path: string): boolean;
export function buildPolicySnippets(input: { token: string; chromeExtensionId: string; androidPackage: string }): {
  chrome: { extensionId: string; policy: Record<string, unknown>; policyJson: string };
  android: { packageName: string; managedConfiguration: Record<string, string> };
};
