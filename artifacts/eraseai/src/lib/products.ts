// What EraseAI offers, in one place, so the home page, pricing, the
// organization pages and the join page all say the same thing.

import type { PricingTierId } from "@/lib/pricingPlans";

export const ANDROID_PACKAGE = "com.eraseai.firewall";
export const ANDROID_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
/** Unpacked extension .zip for people who can't use the Chrome Web Store. */
export const EXTENSION_ZIP_URL = "/api/extension/download";

/**
 * How people in a paying organization or family (Teams/Family or Enterprise) get protected.
 * Shown on pricing, the Buy Team dialog, the organization page and the join page.
 */
export const ORG_COVERAGE_STEPS: string[] = [
  "The organization buys seats; the owner invites people by email (or IT rolls EraseAI out).",
  "Each person installs the Chrome extension and the Android app.",
  "They sign in with the email they were invited with (work email for companies). Chrome and Android are covered at once; they pay nothing themselves.",
];

export const ORG_COVERAGE_SUMMARY =
  "Paid by the organization: every member gets the Chrome extension and the Android app with full protection by signing in with their work email. Nobody buys a personal plan.";

// --- Pricing focus ---------------------------------------------------------
// A plan picked anywhere (home page, homepage pricing before sign-up, the
// extension's upgrade link) opens the pricing page at the comparison table
// with that plan selected. Kept in sessionStorage so it survives signing up.

const FOCUS_KEY = "eraseai.pricingFocus";
const FOCUSABLE: PricingTierId[] = ["free", "personal", "pro", "business", "enterprise"];

export function setPricingFocus(plan: PricingTierId) {
  try {
    sessionStorage.setItem(FOCUS_KEY, plan);
  } catch {}
}

export function peekPricingFocus(): PricingTierId | null {
  try {
    const v = sessionStorage.getItem(FOCUS_KEY);
    return v && (FOCUSABLE as string[]).includes(v) ? (v as PricingTierId) : null;
  } catch {
    return null;
  }
}

export function takePricingFocus(): PricingTierId | null {
  const v = peekPricingFocus();
  try {
    sessionStorage.removeItem(FOCUS_KEY);
  } catch {}
  return v;
}

/** Accepts the extension's and website's plan names ("team", "developer") too. */
export function planIdFromParam(value: string | null): PricingTierId | null {
  if (!value) return null;
  const v = value.toLowerCase();
  const map: Record<string, PricingTierId> = {
    free: "free",
    personal: "personal",
    pro: "pro",
    developer: "pro",
    api: "pro",
    business: "business",
    team: "business",
    enterprise: "enterprise",
  };
  return map[v] ?? null;
}
