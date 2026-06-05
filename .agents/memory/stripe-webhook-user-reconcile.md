---
name: Stripe webhook → users reconciliation (eraseai)
description: stripe-replit-sync webhooks only refresh the stripe.* mirror; user plan state must be reconciled separately, keyed on subscription metadata.
---

`stripe-replit-sync`'s `processWebhook(body, sig)` verifies the signature and
upserts into the `stripe.*` mirror tables ONLY. It never touches our `users`
table. So subscription lifecycle changes that arrive purely as webhooks —
renewals (advance `current_period_end`), Stripe-side cancellations, failed
payments — are invisible to the app unless we reconcile ourselves.

**Why:** Relying on the `/checkout-status` poll alone means the user is promoted
once (on return from Checkout) and never updated again; entitlement silently
drifts from real billing state. The completion code-review gate rejects the
migration without webhook-driven reconciliation.

**How to apply:**
- The reconciliation KEY is `stripe.subscriptions.metadata->>'user_id'` /
  `'plan'` / `'billing_period'`, which we stamp on `subscription_data.metadata`
  in `buildCheckoutSessionParams`. No price→product joins needed.
- Reconcile AFTER `processWebhook` (the mirror must be fresh first), and never
  let a reconcile failure 400 the webhook — the sync already succeeded and a 400
  just triggers pointless Stripe retries. Log and let the next event catch up.
- Bound the scan to `_last_synced_at > now() - interval` so work stays
  proportional to what changed, not the whole table.
- `current_period_end` is a unix-seconds integer column → `new Date(n * 1000)`.

Cancel-flow integrity (same domain): cancel in Stripe FIRST, only downgrade
locally once Stripe confirms (or returns `resource_missing`, meaning it's
already gone). Downgrading on a failed Stripe cancel leaves the user billed in
Stripe but shown as cancelled in-app.
