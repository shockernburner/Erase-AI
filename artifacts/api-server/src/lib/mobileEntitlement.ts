export type InternalPlan = "free" | "personal" | "pro" | "business" | "enterprise";
export type MobilePlan = "free" | "personal" | "developer" | "team" | "enterprise";

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

export const FREE_LIFETIME_SCAN_LIMIT = 10;
export const MOBILE_SERVICE_VERSION = "1.0.0";

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
  return plan === "free" || !plan ? FREE_LIFETIME_SCAN_LIMIT : null;
}

export function mobileStatusForPlan(plan: string | null | undefined, subscriptionStatus: string | null | undefined, planEndDate: Date | string | null | undefined): string {
  const endDate = typeof planEndDate === "string" ? new Date(planEndDate) : planEndDate;
  if ((plan === "free" || !plan) && endDate && endDate < new Date()) {
    return "expired";
  }
  if (subscriptionStatus) {
    return subscriptionStatus;
  }
  return plan && plan !== "free" ? "active" : "free";
}

export function buildMobileBillingUrls(webBaseUrl: string) {
  const base = webBaseUrl.replace(/\/+$/, "");
  return {
    checkout_url: `${base}/billing`,
    manage_url: `${base}/billing`,
  };
}
