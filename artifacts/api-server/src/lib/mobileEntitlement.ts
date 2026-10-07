export type InternalPlan = "free" | "personal" | "pro" | "business" | "enterprise";
export type MobilePlan = "free" | "personal" | "developer" | "team" | "enterprise";
export type MobileBillingRail = "google_play" | "stripe";

export interface MobileFeatureFlags {
  android_firewall: boolean;
  manual_scan: boolean;
  accessibility_firewall: boolean;
  history: boolean;
  redaction: boolean;
}

export interface MobileHealthPayload {
  ok: true;
  service: "eraseai-mobile";
  version: string;
  features: {
    entitlement: true;
    analyze: true;
    rewrite: true;
    billing: true;
    protected_apps: true;
  };
}

export interface MobilePlayProduct {
  product_id: string;
  plan: InternalPlan;
  billing_period: "monthly" | "annual";
  name: string;
}

// Free = 7-day trial with a total budget of 25 scans (matches personal analyzer).
export const FREE_TRIAL_SCAN_LIMIT = 25;
export const MOBILE_SERVICE_VERSION = "1.0.0";
export const ANDROID_PACKAGE_NAME = "com.eraseai.firewall";

export const MOBILE_PLAY_PRODUCTS: MobilePlayProduct[] = [
  { product_id: "eraseai_personal_monthly", plan: "personal", billing_period: "monthly", name: "Personal Monthly" },
  { product_id: "eraseai_personal_annual", plan: "personal", billing_period: "annual", name: "Personal Annual" },
  { product_id: "eraseai_pro_monthly", plan: "pro", billing_period: "monthly", name: "Pro Monthly" },
  { product_id: "eraseai_pro_annual", plan: "pro", billing_period: "annual", name: "Pro Annual" },
];

/**
 * What the Android app offers for sale. Android sells Personal only (monthly
 * and annual); Developer products stay in MOBILE_PLAY_PRODUCTS so existing
 * purchases still verify, but are no longer offered.
 */
export const MOBILE_PLAY_OFFERED_PLANS: InternalPlan[] = ["personal"];

export function offeredPlayProducts(): MobilePlayProduct[] {
  return MOBILE_PLAY_PRODUCTS.filter((product) => MOBILE_PLAY_OFFERED_PLANS.includes(product.plan));
}

export function buildMobileHealthPayload(): MobileHealthPayload {
  return {
    ok: true,
    service: "eraseai-mobile",
    version: MOBILE_SERVICE_VERSION,
    features: {
      entitlement: true,
      analyze: true,
      rewrite: true,
      billing: true,
      protected_apps: true,
    },
  };
}

export function mapPlanForMobile(plan: string | null | undefined): MobilePlan {
  switch (plan) {
    case "personal":
      return "personal";
    case "pro":
      return "developer";
    case "business":
      return "team";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

export function mobileFeaturesForPlan(plan: string | null | undefined): MobileFeatureFlags {
  const paid = plan === "personal" || plan === "pro" || plan === "business" || plan === "enterprise";
  return {
    android_firewall: true,
    manual_scan: true,
    accessibility_firewall: true,
    history: true,
    redaction: paid,
  };
}

export function scanLimitForPlan(plan: string | null | undefined): number | null {
  return plan === "free" || !plan ? FREE_TRIAL_SCAN_LIMIT : null;
}

export function mobileStatusForPlan(plan: string | null | undefined, subscriptionStatus: string | null | undefined, planEndDate: Date | string | null | undefined): string {
  const endDate = typeof planEndDate === "string" ? new Date(planEndDate) : planEndDate;
  if ((plan === "free" || !plan) && endDate && endDate < new Date()) {
    return "expired";
  }
  if (subscriptionStatus === "trialing") {
    return "trialing";
  }
  if ((plan === "free" || !plan) && endDate && endDate >= new Date()) {
    return "trialing";
  }
  if (subscriptionStatus) {
    return subscriptionStatus;
  }
  return plan && plan !== "free" ? "active" : "free";
}

export function trialDaysRemaining(planEndDate: Date | string | null | undefined, now = new Date()): number | null {
  if (!planEndDate) return null;
  const endDate = typeof planEndDate === "string" ? new Date(planEndDate) : planEndDate;
  if (Number.isNaN(endDate.getTime())) return null;
  const ms = endDate.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isGooglePlaySubscription(subscriptionId: string | null | undefined): boolean {
  return typeof subscriptionId === "string" && subscriptionId.startsWith("gplay:");
}

export function resolvePlayProduct(productId: string): MobilePlayProduct | null {
  return MOBILE_PLAY_PRODUCTS.find((product) => product.product_id === productId) ?? null;
}

/** Web app billing (Stripe). Android Play builds must not use these checkout URLs. */
export function buildWebStripeBillingUrls(webBaseUrl: string) {
  const base = webBaseUrl.replace(/\/+$/, "");
  return {
    checkout_url: `${base}/billing`,
    manage_url: `${base}/billing`,
  };
}

/** Android Play Store billing rail (Google Play Billing + Play subscription management). */
export function buildMobilePlayBilling() {
  return {
    rail: "google_play" as const,
    package_name: ANDROID_PACKAGE_NAME,
    products: offeredPlayProducts(),
    manage_url: `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE_NAME}`,
  };
}

export function billingSourceForUser(subscriptionId: string | null | undefined): MobileBillingRail | "none" {
  if (isGooglePlaySubscription(subscriptionId)) return "google_play";
  if (subscriptionId?.startsWith("sub_")) return "stripe";
  return "none";
}
