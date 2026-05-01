export type ApiKeyRow = {
  id: string;
  expiresAt: Date | null;
  requestQuota: number | null;
};

export type EnforcementResult =
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> };

export type EnforcementStore = {
  countUsage: (apiKeyId: string) => Promise<number>;
  insertUsage: (args: { apiKeyId: string; endpoint: string }) => Promise<void>;
};

export function decideApiKeyEnforcement(
  apiKey: ApiKeyRow,
  used: number,
  now: number,
): EnforcementResult;

export function createApiKeyEnforcer(
  store: EnforcementStore,
): (apiKey: ApiKeyRow, req: { method: string; path: string }) => Promise<EnforcementResult>;
