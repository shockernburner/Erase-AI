---
name: stripe-replit-sync syncBackfill() silent no-op
description: Why syncBackfill() with no args syncs NOTHING and how that left prod products/prices empty.
---

# syncBackfill() must be called with `{ object: "all" }`

In `stripe-replit-sync@1.0.0`, `syncBackfill(params)` does:
`const { object } = params ?? { object: this.getSupportedEventTypes };`
`getSupportedEventTypes` is a **method**, referenced **without `()`**, so when you call
`syncBackfill()` with no args, `object` becomes a function reference, the internal
`switch (object)` matches no case, hits `default: break`, and **nothing is synced** —
no error, it still logs "complete".

**Why this bit us:** dev `stripe.products`/`stripe.prices` were populated by the
*managed webhook* capturing `product.created`/`price.created` events when we seeded the
TEST catalog while the dev webhook was already live. In production we seeded the LIVE
catalog *before* the prod webhook existed, so no webhook events — and the no-op backfill
left prod `stripe.products`/`stripe.prices` EMPTY. `findPriceId()` then returned null and
checkout 503'd with `PRICE_NOT_FOUND` / "This plan is not available for checkout right now."

**How to apply:** always call `stripeSync.syncBackfill({ object: "all" })` for a full
catalog/data backfill. Backfill is upsert/cursor-based and idempotent (keyed by Stripe
ids), so re-running is safe — dev does an incremental sync from a stored cursor.

**Related robustness rule:** keep managed-webhook setup in its own try/catch, separate
from the backfill call, so a webhook failure on one boot can't skip the backfill and
leave the catalog empty until the next restart.

**Verify prod actually populated:** query the prod read-replica
(`executeSql({ environment: "production" })`):
`SELECT count(*) FROM stripe.products` / `stripe.prices` — must be non-zero after a
deploy. Empty = backfill didn't run / didn't sync.
