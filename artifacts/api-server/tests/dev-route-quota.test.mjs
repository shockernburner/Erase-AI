// Tests for the monthly per-plan quota policy that now applies on the
// dev routes (/api/dev/analyze|sanitize|outcome) thanks to task #130.
//
// The DB roundtrip in `apiRateLimit()` is hard to fake without booting
// Postgres, so the policy decision itself is extracted into a pure
// helper (`evaluateMonthlyQuota`) that the middleware now calls. Pinning
// that contract here is what makes "Pro user at 1,001 requests gets 429"
// a regression-tested invariant rather than a one-time manual check.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_REQUEST_LIMITS,
  evaluateMonthlyQuota,
} from "../src/lib/security/quota-source.mjs";

describe("evaluateMonthlyQuota — per-plan caps", () => {
  test("hard-coded plan limits match the customer-facing pricing page", () => {
    assert.equal(PLAN_REQUEST_LIMITS.personal, 200);
    assert.equal(PLAN_REQUEST_LIMITS.pro, 1000);
    assert.equal(PLAN_REQUEST_LIMITS.business, 10000);
    assert.equal(PLAN_REQUEST_LIMITS.enterprise, -1);
  });

  test("free / unknown plans return no-access (the dev routes still need a paid plan to use the API key)", () => {
    assert.equal(evaluateMonthlyQuota({ plan: "free", used: 0 }).kind, "no-access");
    assert.equal(evaluateMonthlyQuota({ plan: "ghost", used: 0 }).kind, "no-access");
  });

  test("enterprise is unlimited (limit === -1 short-circuits the DB count entirely)", () => {
    const d = evaluateMonthlyQuota({ plan: "enterprise", used: 999_999_999 });
    assert.equal(d.kind, "unlimited");
    assert.equal(d.limit, -1);
  });

  test("Pro plan: exactly at the cap, the next request is blocked with `exceeded`", () => {
    const atCap = evaluateMonthlyQuota({ plan: "pro", used: 1000 });
    assert.equal(atCap.kind, "exceeded");
    assert.equal(atCap.limit, 1000);
    assert.equal(atCap.used, 1000);
  });

  test("Pro plan: one under the cap is still `allowed`, with remaining counted from this request", () => {
    const justUnder = evaluateMonthlyQuota({ plan: "pro", used: 999 });
    assert.equal(justUnder.kind, "allowed");
    assert.equal(justUnder.limit, 1000);
    assert.equal(justUnder.remaining, 0, "1000 - 999 - 1 = 0 (this is the last allowed request)");
  });

  test("Personal plan: scales remaining proportionally", () => {
    const d = evaluateMonthlyQuota({ plan: "personal", used: 50 });
    assert.equal(d.kind, "allowed");
    assert.equal(d.limit, 200);
    assert.equal(d.remaining, 149);
  });

  test("Business plan: blocks at 10001 and reports the right limit/used in the 429 body", () => {
    const blocked = evaluateMonthlyQuota({ plan: "business", used: 10_001 });
    assert.equal(blocked.kind, "exceeded");
    assert.equal(blocked.limit, 10_000);
    assert.equal(blocked.used, 10_001);
  });

  test("custom planLimits override is honored (e.g. admin temporarily widens a customer's cap)", () => {
    const widened = evaluateMonthlyQuota({
      plan: "pro",
      used: 5000,
      planLimits: { ...PLAN_REQUEST_LIMITS, pro: 50_000 },
    });
    assert.equal(widened.kind, "allowed");
    assert.equal(widened.limit, 50_000);
  });
});
