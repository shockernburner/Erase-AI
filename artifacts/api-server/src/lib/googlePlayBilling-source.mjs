// Google Play subscription verification helpers for the Android billing rail.
// Web billing remains Stripe-only via routes/billing.ts.

export const GOOGLE_PLAY_ACTIVE_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
]);

export const GOOGLE_PLAY_TRIALING_STATES = new Set([
  "SUBSCRIPTION_STATE_PENDING",
]);

export function mapPlaySubscriptionState(subscriptionState) {
  if (!subscriptionState) return "active";
  if (GOOGLE_PLAY_ACTIVE_STATES.has(subscriptionState)) return "active";
  if (GOOGLE_PLAY_TRIALING_STATES.has(subscriptionState)) return "trialing";
  if (subscriptionState === "SUBSCRIPTION_STATE_CANCELED") return "cancelled";
  if (subscriptionState === "SUBSCRIPTION_STATE_EXPIRED") return "expired";
  if (String(subscriptionState).includes("ACTIVE") || String(subscriptionState).includes("GRACE")) return "active";
  return "active";
}

export function buildGooglePlaySubscriptionId(orderId, purchaseToken) {
  const tokenSuffix = purchaseToken.slice(-12);
  if (orderId && orderId.length > 0) return `gplay:${orderId}`;
  return `gplay:token:${tokenSuffix}`;
}

export function validatePlayVerifyInput(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid request body" };
  }
  const { productId, purchaseToken, packageName } = body;
  if (typeof productId !== "string" || !productId.trim()) {
    return { ok: false, status: 400, error: "productId is required" };
  }
  if (typeof purchaseToken !== "string" || purchaseToken.length < 10) {
    return { ok: false, status: 400, error: "purchaseToken is required" };
  }
  if (packageName != null && typeof packageName !== "string") {
    return { ok: false, status: 400, error: "packageName must be a string" };
  }
  return {
    productId: productId.trim(),
    purchaseToken: purchaseToken.trim(),
    packageName: typeof packageName === "string" ? packageName.trim() : undefined,
  };
}
