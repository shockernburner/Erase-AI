export const TEAM_MIN_SEATS: number;
export const TEAM_MAX_SEATS: number;
export const TEAM_KIND: "team";
export const TEAM_SEAT_CENTS: { monthly: number; annual: number };

export type BillingPeriod = "monthly" | "annual";

export function isValidSeatCount(n: unknown): boolean;
export function validateTeamCheckout(input?: {
  orgName?: unknown;
  seats?: unknown;
  billingPeriod?: unknown;
  returnUrl?: unknown;
}):
  | { ok: true; value: { name: string; seats: number; period: BillingPeriod } }
  | { ok: false; status: number; error: string };
export function teamTotalCents(seats: number, period: BillingPeriod): number;
export function buildTeamCheckoutParams(input: {
  priceId: string;
  customerId: string;
  returnUrl: string;
  userId: string;
  orgName: string;
  seats: number;
  period: BillingPeriod;
}): any;
export function orgStatusForSubscription(status: string | null | undefined): "active" | "suspended" | null;
export function readSubscriptionSeats(sub: unknown): { seats: number | null; itemId: string | null; periodEndMs: number | null };
export function evaluateTeamCheckout(
  session: unknown,
  expectedUserId: string,
):
  | { kind: "denied" | "expired" | "pending" }
  | {
      kind: "succeeded";
      subscriptionId: string;
      customerId: string | null;
      name: string;
      seats: number;
      period: BillingPeriod;
      subscriptionStatus: string;
      periodEndMs: number | null;
    };

export interface TeamSubscriptionRow {
  id: string;
  status: string;
  quantity: number | null;
  owner_user_id: string | null;
  org_name: string | null;
  billing_period: string | null;
  current_period_end_ms: number | null;
}

export interface TeamOrgFields {
  subscriptionStatus: string;
  status?: "active" | "suspended";
  seatLimit?: number;
  currentPeriodEndMs?: number;
}

export function decideTeamReconcile(
  row: TeamSubscriptionRow | null | undefined,
  existingOrg: { id: string } | null | undefined,
):
  | { action: "none" }
  | { action: "update"; fields: TeamOrgFields }
  | { action: "create"; ownerUserId: string; name: string; period: BillingPeriod; fields: TeamOrgFields & { seatLimit: number } };

export function validateSeatChange(input: { seats: unknown; seatsUsed: number }):
  | { ok: true }
  | { ok: false; status: number; error: string };
