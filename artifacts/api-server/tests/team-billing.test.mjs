// Coverage for self-serve Team billing rules (team-source.mjs), which
// routes/team-billing.ts, /billing/checkout-status and the webhook reconcile use.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  TEAM_SEAT_CENTS,
  buildTeamCheckoutParams,
  decideTeamReconcile,
  evaluateTeamCheckout,
  orgStatusForSubscription,
  readSubscriptionSeats,
  teamTotalCents,
  validateSeatChange,
  validateTeamCheckout,
} from "../src/lib/billing/team-source.mjs";
import { decideReconcileUpdates } from "../src/lib/billing/reconcile-source.mjs";

describe("prices", () => {
  test("$9 a person a month, $96 a person a year", () => {
    assert.deepEqual(TEAM_SEAT_CENTS, { monthly: 900, annual: 9600 });
    assert.equal(teamTotalCents(5, "monthly"), 4500);
    assert.equal(teamTotalCents(3, "annual"), 28800);
  });
});

describe("validateTeamCheckout", () => {
  const ok = { orgName: " Acme ", seats: 5, billingPeriod: "annual", returnUrl: "https://eraseai.ai/" };
  test("accepts 3 to 10 seats and trims the name", () => {
    assert.deepEqual(validateTeamCheckout(ok), { ok: true, value: { name: "Acme", seats: 5, period: "annual" } });
    assert.equal(validateTeamCheckout({ ...ok, seats: 3 }).ok, true);
    assert.equal(validateTeamCheckout({ ...ok, seats: 10 }).ok, true);
  });
  test("rejects seats out of range, fractional seats, no name, bad return URL", () => {
    assert.equal(validateTeamCheckout({ ...ok, seats: 2 }).ok, false);
    assert.equal(validateTeamCheckout({ ...ok, seats: 11 }).ok, false);
    assert.equal(validateTeamCheckout({ ...ok, seats: 4.5 }).ok, false);
    assert.equal(validateTeamCheckout({ ...ok, orgName: "  " }).ok, false);
    assert.equal(validateTeamCheckout({ ...ok, returnUrl: "javascript:x" }).ok, false);
  });
  test("defaults to monthly", () => {
    assert.equal(validateTeamCheckout({ ...ok, billingPeriod: "weekly" }).value.period, "monthly");
  });
});

describe("buildTeamCheckoutParams", () => {
  const params = buildTeamCheckoutParams({
    priceId: "price_seat", customerId: "cus_1", returnUrl: "https://eraseai.ai/?x=1",
    userId: "u1", orgName: "Acme", seats: 4, period: "monthly",
  });
  test("quantity is the seat count", () => {
    assert.deepEqual(params.line_items, [{ price: "price_seat", quantity: 4 }]);
    assert.equal(params.mode, "subscription");
    assert.equal(params.success_url, "https://eraseai.ai/?x=1&checkout=success&session_id={CHECKOUT_SESSION_ID}");
    assert.equal(params.payment_method_collection, "if_required");
    assert.equal(params.allow_promotion_codes, true);
  });
  test("team metadata, and no user_id so the personal reconcile ignores it", () => {
    assert.equal(params.subscription_data.metadata.kind, "team");
    assert.equal(params.subscription_data.metadata.owner_user_id, "u1");
    assert.equal(params.subscription_data.metadata.user_id, undefined);
    assert.deepEqual(decideReconcileUpdates([{ id: "sub_1", status: "active", user_id: null, plan: "business" }]), []);
  });
});

describe("subscription status -> organization", () => {
  test("paid or in grace keeps it active; ended suspends; unpaid-yet is null", () => {
    assert.equal(orgStatusForSubscription("active"), "active");
    assert.equal(orgStatusForSubscription("trialing"), "active");
    assert.equal(orgStatusForSubscription("past_due"), "active");
    assert.equal(orgStatusForSubscription("canceled"), "suspended");
    assert.equal(orgStatusForSubscription("unpaid"), "suspended");
    assert.equal(orgStatusForSubscription("incomplete"), null);
  });
  test("reads seats and renewal from the item when the subscription lacks it", () => {
    assert.deepEqual(
      readSubscriptionSeats({ items: { data: [{ id: "si_1", quantity: 6, current_period_end: 1_800_000_000 }] } }),
      { seats: 6, itemId: "si_1", periodEndMs: 1_800_000_000_000 },
    );
  });
});

describe("evaluateTeamCheckout", () => {
  const session = {
    status: "complete",
    payment_status: "paid",
    customer: "cus_9",
    metadata: { kind: "team", owner_user_id: "u1", org_name: "Acme", seats: "4", billing_period: "annual" },
    subscription: { id: "sub_9", status: "active", items: { data: [{ id: "si", quantity: 5, current_period_end: 1_800_000_000 }] } },
  };
  test("paid: org details, seats from Stripe over metadata", () => {
    const r = evaluateTeamCheckout(session, "u1");
    assert.equal(r.kind, "succeeded");
    assert.equal(r.subscriptionId, "sub_9");
    assert.equal(r.customerId, "cus_9");
    assert.equal(r.name, "Acme");
    assert.equal(r.seats, 5);
    assert.equal(r.period, "annual");
    assert.equal(r.periodEndMs, 1_800_000_000_000);
  });
  test("someone else's session or a non-team session is denied", () => {
    assert.equal(evaluateTeamCheckout(session, "u2").kind, "denied");
    assert.equal(evaluateTeamCheckout({ ...session, metadata: { user_id: "u1" } }, "u1").kind, "denied");
  });
  test("unpaid is pending; expired is expired", () => {
    assert.equal(evaluateTeamCheckout({ ...session, status: "open", payment_status: "unpaid" }, "u1").kind, "pending");
    assert.equal(evaluateTeamCheckout({ ...session, status: "expired", payment_status: "unpaid" }, "u1").kind, "expired");
  });
});

describe("decideTeamReconcile", () => {
  const row = { id: "sub_1", status: "active", quantity: 7, owner_user_id: "u1", org_name: "Acme", billing_period: "monthly", current_period_end_ms: 5 };
  test("creates the organization when payment arrives before the buyer returns", () => {
    const d = decideTeamReconcile(row, null);
    assert.equal(d.action, "create");
    assert.equal(d.ownerUserId, "u1");
    assert.equal(d.fields.seatLimit, 7);
  });
  test("updates seats and status on the linked organization", () => {
    assert.deepEqual(decideTeamReconcile(row, { id: "o1" }), {
      action: "update",
      fields: { subscriptionStatus: "active", status: "active", seatLimit: 7, currentPeriodEndMs: 5 },
    });
    assert.equal(decideTeamReconcile({ ...row, status: "canceled" }, { id: "o1" }).fields.status, "suspended");
  });
  test("never creates an organization for an unpaid or ended subscription", () => {
    assert.equal(decideTeamReconcile({ ...row, status: "incomplete" }, null).action, "none");
    assert.equal(decideTeamReconcile({ ...row, status: "canceled" }, null).action, "none");
    assert.equal(decideTeamReconcile({ ...row, owner_user_id: null }, null).action, "none");
  });
});

describe("validateSeatChange", () => {
  test("3 to 10, and not below seats in use", () => {
    assert.equal(validateSeatChange({ seats: 6, seatsUsed: 4 }).ok, true);
    assert.equal(validateSeatChange({ seats: 4, seatsUsed: 4 }).ok, true);
    assert.equal(validateSeatChange({ seats: 3, seatsUsed: 4 }).status, 409);
    assert.equal(validateSeatChange({ seats: 11, seatsUsed: 1 }).status, 400);
  });
});
