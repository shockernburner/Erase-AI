export const VALID_OUTCOME_LEVELS: ReadonlySet<string>;
export const VALID_OUTCOME_ACTIONS: ReadonlySet<string>;
export const MAX_OUTCOME_CATEGORIES: number;
export const MAX_CATEGORY_LENGTH: number;

export function normaliseCategories(input: unknown): string[];
export function normaliseRiskScore(input: unknown): number | null;

export interface OutcomePayload {
  level: string;
  action: string;
  riskScore: number | null;
  categories: string[];
}

export type ValidateOutcomeResult =
  | { ok: true; value: OutcomePayload }
  | { ok: false; error: string };

export function validateOutcomePayload(payload: unknown): ValidateOutcomeResult;

export interface FirewallOutcomeRow {
  level?: string | null;
  action?: string | null;
}

export interface FirewallOutcomeAggregate {
  shown: number;
  saved: number;
  dismissed: number;
}

export function aggregateFirewallOutcomes(
  rows: FirewallOutcomeRow[],
): FirewallOutcomeAggregate;
