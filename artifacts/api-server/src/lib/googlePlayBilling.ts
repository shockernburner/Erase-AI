import { GoogleAuth } from "google-auth-library";
import {
  buildGooglePlaySubscriptionId,
  mapPlaySubscriptionState,
  type PlayVerifyDecision,
  type PlayVerifyFailure,
  type PlayVerifyInput,
  type PlayVerifyResult,
} from "./googlePlayBilling-source.mjs";
import { resolvePlayProduct, ANDROID_PACKAGE_NAME } from "./mobileEntitlement";

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";

function getServiceAccountJson(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getPackageName(inputPackage?: string): string {
  return inputPackage || process.env.GOOGLE_PLAY_PACKAGE_NAME || ANDROID_PACKAGE_NAME;
}

async function getAndroidPublisherAccessToken(): Promise<string | null> {
  const credentials = getServiceAccountJson();
  if (!credentials) return null;
  const auth = new GoogleAuth({
    credentials,
    scopes: [ANDROID_PUBLISHER_SCOPE],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token ?? null;
}

async function fetchSubscriptionV2(
  packageName: string,
  purchaseToken: string,
  accessToken: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const message = typeof data.error === "object" && data.error && typeof (data.error as { message?: string }).message === "string"
      ? (data.error as { message: string }).message
      : `Google Play verification failed (${response.status})`;
    return { ok: false, status: response.status === 404 ? 404 : 502, error: message };
  }
  return { ok: true, data };
}

export async function verifyGooglePlayPurchase(input: PlayVerifyInput): Promise<PlayVerifyResult> {
  const product = resolvePlayProduct(input.productId);
  if (!product) {
    return { ok: false, status: 400, error: "Unknown Google Play product id", code: "UNKNOWN_PRODUCT" };
  }

  const accessToken = await getAndroidPublisherAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      status: 503,
      error: "Google Play billing verification is not configured on the server",
      code: "PLAY_NOT_CONFIGURED",
    };
  }

  const packageName = getPackageName(input.packageName);
  const subscription = await fetchSubscriptionV2(packageName, input.purchaseToken, accessToken);
  if (!subscription.ok) {
    return { ok: false, status: subscription.status, error: subscription.error, code: "PLAY_VERIFY_FAILED" };
  }

  const lineItems = Array.isArray(subscription.data.lineItems) ? subscription.data.lineItems as Array<Record<string, unknown>> : [];
  const matchedLine = lineItems.find((item) => item.productId === input.productId) ?? lineItems[0];
  const subscriptionState = typeof subscription.data.subscriptionState === "string"
    ? subscription.data.subscriptionState
    : null;
  const mappedStatus = mapPlaySubscriptionState(subscriptionState);
  if (mappedStatus === "expired" || mappedStatus === "cancelled") {
    return { ok: false, status: 403, error: "Google Play subscription is not active", code: "SUBSCRIPTION_INACTIVE" };
  }

  const expiryRaw = matchedLine?.expiryTime;
  const expiryTime = typeof expiryRaw === "string" ? new Date(expiryRaw) : null;
  const latestOrderId = typeof subscription.data.latestOrderId === "string" ? subscription.data.latestOrderId : null;

  const decision: PlayVerifyDecision = {
    ok: true,
    plan: product.plan === "pro" ? "pro" : "personal",
    subscriptionStatus: mappedStatus === "trialing" ? "trialing" : "active",
    subscriptionId: buildGooglePlaySubscriptionId(latestOrderId, input.purchaseToken),
    expiryTime: expiryTime && !Number.isNaN(expiryTime.getTime()) ? expiryTime : null,
  };
  return decision;
}

export type { PlayVerifyDecision, PlayVerifyFailure, PlayVerifyInput, PlayVerifyResult };
