export const ANNUAL_DISCOUNT: number;

export function annualPrice(monthly: number): number;

export interface PlanPricing {
  monthly: number;
  annual: number;
  currency: string;
  /** Priced per person (Team); monthly/annual are per person. */
  perSeat?: boolean;
  minSeats?: number;
  maxSeats?: number;
}

export const PLAN_PRICING: Record<string, PlanPricing>;

export const VALID_CHECKOUT_PLANS: readonly string[];

export const PROMOTABLE_PLANS: readonly string[];

export type BillingPeriod = "monthly" | "annual";

export function isValidBillingPeriod(value: unknown): value is BillingPeriod;

export function isValidCheckoutPlan(value: unknown): value is string;

export function extendEndDate(start: Date, period: BillingPeriod): Date;

export type ValidateCheckoutResult =
  | { ok: true; plan: string; period: BillingPeriod }
  | { ok: false; status: number; error: string };

export function validateCheckoutRequest(body: {
  plan?: unknown;
  billingPeriod?: unknown;
  returnUrl?: unknown;
}): ValidateCheckoutResult;

export function buildCheckoutSessionParams(opts: {
  priceId: string;
  customerId: string;
  returnUrl: string;
  userId: string;
  plan: string;
  period: BillingPeriod;
}): {
  mode: "subscription";
  customer: string;
  line_items: Array<{ price: string; quantity: number }>;
  success_url: string;
  cancel_url: string;
  allow_promotion_codes: boolean;
  metadata: { user_id: string; plan: string; billing_period: BillingPeriod };
  subscription_data: {
    metadata: { user_id: string; plan: string; billing_period: BillingPeriod };
  };
};

export function resolveTargetPlan(
  rawPlan: unknown,
): "personal" | "pro" | "business";

export interface CheckoutSessionLike {
  metadata?: { user_id?: string; plan?: string; billing_period?: string } | null;
  status?: string | null;
  payment_status?: string | null;
  subscription?: string | { id: string; current_period_end?: number } | null;
  customer?: string | { id: string } | null;
}

export type CheckoutStatusDecision =
  | { kind: "denied" }
  | {
      kind: "succeeded";
      plan: "personal" | "pro" | "business";
      period: BillingPeriod;
      subscriptionId: string | null;
      customerId: string | null;
      endDate: Date;
    }
  | { kind: "expired" }
  | { kind: "pending" };

export function evaluateCheckoutStatus(
  session: CheckoutSessionLike,
  expectedUserId: string,
  now?: Date,
): CheckoutStatusDecision;
