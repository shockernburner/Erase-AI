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

function getServiceAccountJson():
  | { ok: true; credentials: Record<string, unknown> }
  | { ok: false; error: string; code: string }
  | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      code: "PLAY_BAD_CREDENTIALS",
      error: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON.",
    };
  }

  // Android OAuth client JSON (Download JSON on Credentials → OAuth 2.0 Client IDs)
  // is NOT usable for Play purchase verification.
  if (
    parsed.type !== "service_account" ||
    typeof parsed.private_key !== "string" ||
    typeof parsed.client_email !== "string"
  ) {
    const looksLikeOauthClient =
      "installed" in parsed ||
      "web" in parsed ||
      typeof parsed.client_id === "string" ||
      parsed.type === "authorized_user";
    return {
      ok: false,
      code: "PLAY_BAD_CREDENTIALS",
      error: looksLikeOauthClient
        ? "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON looks like an OAuth client file. Use a Service Account key instead: Cloud Console → IAM → Service accounts → EraseAI → Keys → Add key → JSON. Then invite that service account email in Play Console → Users and permissions."
        : "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be a service_account key with private_key and client_email (not an Android OAuth client ID).",
    };
  }

  return { ok: true, credentials: parsed };
}

function getPackageName(inputPackage?: string): string {
  return inputPackage || process.env.GOOGLE_PLAY_PACKAGE_NAME || ANDROID_PACKAGE_NAME;
}

async function getAndroidPublisherAccessToken(): Promise<string> {
  const credentialsResult = getServiceAccountJson();
  if (!credentialsResult) {
    throw Object.assign(new Error("Google Play billing verification is not configured on the server"), {
      code: "PLAY_NOT_CONFIGURED",
    });
  }
  if (!credentialsResult.ok) {
    throw Object.assign(new Error(credentialsResult.error), { code: credentialsResult.code });
  }
  try {
    const auth = new GoogleAuth({
      credentials: credentialsResult.credentials,
      scopes: [ANDROID_PUBLISHER_SCOPE],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      throw new Error("Service account returned an empty access token");
    }
    return token.token;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google Play auth failed";
    throw Object.assign(new Error(`Play service account could not sign in: ${message}`), {
      code: "PLAY_BAD_CREDENTIALS",
    });
  }
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
    const apiDisabled = /has not been used|is disabled|androidpublisher\.googleapis\.com/i.test(message);
    return {
      ok: false,
      status: response.status === 404 ? 404 : 502,
      error: apiDisabled
        ? "Google Play Android Developer API is disabled on the Cloud project used by EraseAI. Enable androidpublisher.googleapis.com for that project, wait a few minutes, then retry Subscribe."
        : message,
    };
  }
  return { ok: true, data };
}

export async function verifyGooglePlayPurchase(input: PlayVerifyInput): Promise<PlayVerifyResult> {
  const product = resolvePlayProduct(input.productId);
  if (!product) {
    return { ok: false, status: 400, error: "Unknown Google Play product id", code: "UNKNOWN_PRODUCT" };
  }

  let accessToken: string;
  try {
    accessToken = await getAndroidPublisherAccessToken();
  } catch (err) {
    const code = typeof err === "object" && err && "code" in err
      ? String((err as { code?: unknown }).code || "PLAY_NOT_CONFIGURED")
      : "PLAY_NOT_CONFIGURED";
    const message = err instanceof Error ? err.message : "Google Play billing verification is not configured on the server";
    return {
      ok: false,
      status: 503,
      error: message,
      code,
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

export { validatePlayVerifyInput } from "./googlePlayBilling-source.mjs";
export type { PlayVerifyDecision, PlayVerifyFailure, PlayVerifyInput, PlayVerifyResult };
