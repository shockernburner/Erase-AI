// Pure decision logic for mapping synced Stripe subscription rows back onto our
// users, extracted from reconcile.ts so it can be exercised by `node --test`
// without a database. reconcile.ts reads `stripe.subscriptions`, calls
// decideReconcileUpdates(), and applies the resulting updates with Drizzle.
//
// Stripe subscription statuses that mean the user is entitled to their plan.
export const ACTIVE_STATUSES = new Set(["active", "trialing"]);
// Statuses that mean the subscription is over and the user must drop to free.
export const TERMINAL_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
  "unpaid",
]);

function periodEndMs(currentPeriodEnd) {
  // `current_period_end` is a unix-seconds integer column.
  return typeof currentPeriodEnd === "number" ? currentPeriodEnd * 1000 : null;
}

// Given the recently-synced subscription rows (each carrying our
// metadata.user_id / metadata.plan), decide the authoritative set of user
// updates to apply. Pure: no DB, no clock except the injected `nowMs`.
//
// Returns a list of updates. `scope` tells the caller how to target the row:
//   - "user":         match by user id only (an authoritative active sub wins,
//                     so it may adopt a brand-new subscription id).
//   - "subscription": match by user id AND subscription id, so a stale event
//                     for an old subscription can never clobber a newer one.
export function decideReconcileUpdates(rows, nowMs = Date.now()) {
  const byUser = new Map();
  for (const row of rows) {
    if (!row || !row.user_id) continue;
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
    byUser.get(row.user_id).push(row);
  }

  const updates = [];
  for (const [userId, userRows] of byUser) {
    // If the user has any active/trialing subscription, the one renewing
    // furthest into the future is authoritative — it wins outright and we
    // ignore the user's other (older/terminal) rows. This prevents a stale or
    // secondary active row from overwriting the current subscription.
    const active = userRows
      .filter((row) => ACTIVE_STATUSES.has(row.status))
      .sort((a, b) => (periodEndMs(b.current_period_end) ?? 0) - (periodEndMs(a.current_period_end) ?? 0));

    if (active.length > 0) {
      const winner = active[0];
      const fields = {
        subscriptionId: winner.id,
        subscriptionStatus: winner.cancel_at_period_end
          ? "cancel_at_period_end"
          : "active",
      };
      if (winner.plan) fields.planType = winner.plan;
      const endMs = periodEndMs(winner.current_period_end);
      if (endMs != null) fields.planEndDateMs = endMs;
      updates.push({ userId, scope: "user", subscriptionId: winner.id, fields });
      continue;
    }

    // No active subscription: process each row, but always scoped to its own
    // subscription id so we only mutate the user when THIS is still their
    // recorded subscription.
    for (const row of userRows) {
      if (TERMINAL_STATUSES.has(row.status)) {
        updates.push({
          userId,
          scope: "subscription",
          subscriptionId: row.id,
          fields: {
            planType: "free",
            subscriptionStatus: "cancelled",
            planEndDateMs: periodEndMs(row.current_period_end) ?? nowMs,
          },
        });
      } else {
        // past_due / incomplete / paused: keep the plan, surface real status.
        updates.push({
          userId,
          scope: "subscription",
          subscriptionId: row.id,
          fields: { subscriptionStatus: row.status },
        });
      }
    }
  }

  return updates;
}
