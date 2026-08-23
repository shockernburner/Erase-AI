import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/lib/mobileEntitlement.ts", import.meta.url), "utf8");
const transformed = transformSync(source, {
  format: "esm",
  loader: "ts",
  sourcemap: false,
  target: "es2022",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`;
const {
  buildMobilePlayBilling,
  buildWebStripeBillingUrls,
  billingSourceForUser,
  isGooglePlaySubscription,
  mapPlanForMobile,
  mobileFeaturesForPlan,
  mobileStatusForPlan,
  scanLimitForPlan,
  trialDaysRemaining,
} = await import(moduleUrl);

describe("mobile entitlement helpers", () => {
  test("maps backend plan names to mobile-facing plan names", () => {
    assert.equal(mapPlanForMobile("free"), "free");
    assert.equal(mapPlanForMobile("personal"), "personal");
    assert.equal(mapPlanForMobile("pro"), "developer");
    assert.equal(mapPlanForMobile("business"), "team");
    assert.equal(mapPlanForMobile("enterprise"), "enterprise");
    assert.equal(mapPlanForMobile("unknown"), "free");
  });

  test("keeps redaction paid while preserving scan features for free users", () => {
    assert.deepEqual(mobileFeaturesForPlan("free"), {
      android_firewall: true,
      manual_scan: true,
      accessibility_firewall: true,
      history: true,
      redaction: false,
    });
    assert.equal(mobileFeaturesForPlan("personal").redaction, true);
  });

  test("reports the real enforced free trial scan limit", () => {
    assert.equal(scanLimitForPlan("free"), 25);
    assert.equal(scanLimitForPlan("personal"), null);
  });

  test("exposes dual billing rails for Android vs web", () => {
    assert.equal(buildMobilePlayBilling().rail, "google_play");
    assert.match(buildMobilePlayBilling().manage_url, /play\.google\.com/);
    assert.deepEqual(buildWebStripeBillingUrls("https://eraseai.ai/"), {
      checkout_url: "https://eraseai.ai/billing",
      manage_url: "https://eraseai.ai/billing",
    });
  });

  test("detects google play vs stripe subscription ids", () => {
    assert.equal(isGooglePlaySubscription("gplay:GPA.1234"), true);
    assert.equal(isGooglePlaySubscription("sub_123"), false);
    assert.equal(billingSourceForUser("gplay:GPA.1234"), "google_play");
    assert.equal(billingSourceForUser("sub_123"), "stripe");
    assert.equal(billingSourceForUser(null), "none");
  });

  test("reports expired free trials without changing active paid status", () => {
    assert.equal(mobileStatusForPlan("free", null, "2020-01-01T00:00:00Z"), "expired");
    assert.equal(mobileStatusForPlan("free", null, "2099-01-01T00:00:00Z"), "trialing");
    assert.equal(mobileStatusForPlan("personal", "active", "2020-01-01T00:00:00Z"), "active");
  });

  test("computes remaining trial days", () => {
    const now = new Date("2026-08-23T12:00:00Z");
    assert.equal(trialDaysRemaining("2026-08-25T12:00:00Z", now), 2);
    assert.equal(trialDaysRemaining("2026-08-20T12:00:00Z", now), 0);
    assert.equal(trialDaysRemaining(null, now), null);
  });
});
