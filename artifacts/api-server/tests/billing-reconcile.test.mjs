// Coverage for webhook-driven subscription -> user reconciliation.
//
// reconcile.ts reads `stripe.subscriptions` and applies updates with Drizzle,
// which we can't do inside `node --test`. So we test the SAME pure decision
// logic the production path imports — decideReconcileUpdates from
// ../src/lib/billing/reconcile-source.mjs — which is where all the
// lifecycle/edge-case reasoning lives.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { decideReconcileUpdates } from "../src/lib/billing/reconcile-source.mjs";

const NOW = 1_780_000_000_000;

function sub(overrides = {}) {
  return {
    id: "sub_1",
    status: "active",
    current_period_end: 1_780_500_000, // unix seconds
    cancel_at_period_end: false,
    user_id: "user_1",
    plan: "pro",
    ...overrides,
  };
}

describe("decideReconcileUpdates — active subscriptions", () => {
  test("active subscription promotes the user (user-scoped, adopts sub id + period end)", () => {
    const updates = decideReconcileUpdates([sub()], NOW);
    assert.equal(updates.length, 1);
    const u = updates[0];
    assert.equal(u.userId, "user_1");
    assert.equal(u.scope, "user");
    assert.equal(u.fields.planType, "pro");
    assert.equal(u.fields.subscriptionId, "sub_1");
    assert.equal(u.fields.subscriptionStatus, "active");
    assert.equal(u.fields.planEndDateMs, 1_780_500_000 * 1000);
  });

  test("cancel_at_period_end surfaces a distinct status but keeps the plan", () => {
    const updates = decideReconcileUpdates([sub({ cancel_at_period_end: true })], NOW);
    assert.equal(updates[0].fields.subscriptionStatus, "cancel_at_period_end");
    assert.equal(updates[0].fields.planType, "pro");
  });

  test("trialing counts as active", () => {
    const updates = decideReconcileUpdates([sub({ status: "trialing" })], NOW);
    assert.equal(updates[0].scope, "user");
    assert.equal(updates[0].fields.subscriptionStatus, "active");
  });

  test("rows without our user_id metadata are ignored", () => {
    const updates = decideReconcileUpdates([sub({ user_id: null })], NOW);
    assert.equal(updates.length, 0);
  });
});

describe("decideReconcileUpdates — stale/parallel subscription edge case", () => {
  test("latest active subscription wins; older active row does NOT produce a clobbering update", () => {
    const older = sub({ id: "sub_old", current_period_end: 1_770_000_000, plan: "personal" });
    const newer = sub({ id: "sub_new", current_period_end: 1_790_000_000, plan: "pro" });
    const updates = decideReconcileUpdates([older, newer], NOW);
    // Exactly one update for the user, and it's the newer subscription.
    const forUser = updates.filter((u) => u.userId === "user_1");
    assert.equal(forUser.length, 1);
    assert.equal(forUser[0].fields.subscriptionId, "sub_new");
    assert.equal(forUser[0].fields.planType, "pro");
  });

  test("an active subscription wins over a terminal one for the same user", () => {
    const dead = sub({ id: "sub_dead", status: "canceled" });
    const live = sub({ id: "sub_live", status: "active" });
    const updates = decideReconcileUpdates([dead, live], NOW);
    const forUser = updates.filter((u) => u.userId === "user_1");
    assert.equal(forUser.length, 1);
    assert.equal(forUser[0].scope, "user");
    assert.equal(forUser[0].fields.subscriptionId, "sub_live");
  });
});

describe("decideReconcileUpdates — terminal + intermediate statuses", () => {
  for (const status of ["canceled", "incomplete_expired", "unpaid"]) {
    test(`${status} downgrades to free, scoped to its own subscription id`, () => {
      const updates = decideReconcileUpdates([sub({ status })], NOW);
      assert.equal(updates.length, 1);
      const u = updates[0];
      assert.equal(u.scope, "subscription");
      assert.equal(u.subscriptionId, "sub_1");
      assert.equal(u.fields.planType, "free");
      assert.equal(u.fields.subscriptionStatus, "cancelled");
    });
  }

  test("terminal status with no period end falls back to nowMs", () => {
    const updates = decideReconcileUpdates([sub({ status: "canceled", current_period_end: null })], NOW);
    assert.equal(updates[0].fields.planEndDateMs, NOW);
  });

  test("past_due keeps the plan but surfaces the status (subscription-scoped)", () => {
    const updates = decideReconcileUpdates([sub({ status: "past_due" })], NOW);
    assert.equal(updates.length, 1);
    const u = updates[0];
    assert.equal(u.scope, "subscription");
    assert.equal(u.fields.subscriptionStatus, "past_due");
    assert.equal(u.fields.planType, undefined);
  });
});
