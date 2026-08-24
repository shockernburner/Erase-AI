export type PlaySubscriptionStatus = "active" | "trialing" | "cancelled" | "expired";

export type PlayVerifyInput = {
  productId: string;
  purchaseToken: string;
  packageName?: string;
};

export type PlayVerifyDecision = {
  ok: true;
  plan: "personal" | "pro";
  subscriptionStatus: "active" | "trialing";
  subscriptionId: string;
  expiryTime: Date | null;
};

export type PlayVerifyFailure = {
  ok: false;
  status: number;
  error: string;
  code: string;
};

export type PlayVerifyResult = PlayVerifyDecision | PlayVerifyFailure;

export type PlayVerifyValidationFailure = {
  ok: false;
  status: 400;
  error: string;
};

export const GOOGLE_PLAY_ACTIVE_STATES: ReadonlySet<string>;
export const GOOGLE_PLAY_TRIALING_STATES: ReadonlySet<string>;

export function mapPlaySubscriptionState(
  subscriptionState: string | null | undefined,
): PlaySubscriptionStatus;

export function buildGooglePlaySubscriptionId(
  orderId: string | null | undefined,
  purchaseToken: string,
): string;

export function validatePlayVerifyInput(
  body: unknown,
): PlayVerifyInput | PlayVerifyValidationFailure;