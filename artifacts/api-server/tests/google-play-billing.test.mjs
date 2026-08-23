import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildGooglePlaySubscriptionId,
  mapPlaySubscriptionState,
  validatePlayVerifyInput,
} from "../src/lib/googlePlayBilling-source.mjs";

describe("google play billing helpers", () => {
  test("maps subscription states to internal statuses", () => {
    assert.equal(mapPlaySubscriptionState("SUBSCRIPTION_STATE_ACTIVE"), "active");
    assert.equal(mapPlaySubscriptionState("SUBSCRIPTION_STATE_IN_GRACE_PERIOD"), "active");
    assert.equal(mapPlaySubscriptionState("SUBSCRIPTION_STATE_CANCELED"), "cancelled");
    assert.equal(mapPlaySubscriptionState("SUBSCRIPTION_STATE_EXPIRED"), "expired");
  });

  test("builds stable google play subscription ids", () => {
    assert.equal(buildGooglePlaySubscriptionId("GPA.1234", "token-abc"), "gplay:GPA.1234");
    assert.match(buildGooglePlaySubscriptionId(null, "token-abcdefghijkl"), /^gplay:token:/);
  });

  test("validates verify payload", () => {
    assert.deepEqual(validatePlayVerifyInput({
      productId: "eraseai_personal_monthly",
      purchaseToken: "purchase-token-value",
    }), {
      productId: "eraseai_personal_monthly",
      purchaseToken: "purchase-token-value",
      packageName: undefined,
    });
    const invalid = validatePlayVerifyInput({});
    assert.equal(invalid.ok, false);
  });
});
