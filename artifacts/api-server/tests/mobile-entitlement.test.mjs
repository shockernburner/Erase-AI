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
  buildMobileBillingUrls,
  mapPlanForMobile,
  mobileFeaturesForPlan,
  mobileStatusForPlan,
  scanLimitForPlan,
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

  test("reports the real enforced free lifetime scan limit", () => {
    assert.equal(scanLimitForPlan("free"), 10);
    assert.equal(scanLimitForPlan("personal"), null);
  });

  test("normalizes mobile billing urls", () => {
    assert.deepEqual(buildMobileBillingUrls("https://eraseai.ai/"), {
      checkout_url: "https://eraseai.ai/billing",
      manage_url: "https://eraseai.ai/billing",
    });
  });

  test("reports expired free trials without changing active paid status", () => {
    assert.equal(mobileStatusForPlan("free", null, "2020-01-01T00:00:00Z"), "expired");
    assert.equal(mobileStatusForPlan("personal", "active", "2020-01-01T00:00:00Z"), "active");
  });
});
