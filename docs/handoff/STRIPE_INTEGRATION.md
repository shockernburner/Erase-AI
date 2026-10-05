# Stripe Integration (Payments)

EraseAI uses **Stripe** for subscription billing via the Replit-native Stripe
connector and the `stripe-replit-sync` library. This replaced the previous
Airwallex integration (Task #186).

## Architecture

- **`artifacts/api-server/src/lib/stripe.ts`** — `getUncachableStripeClient()`
  and `getStripeSync()`. Credentials are fetched fresh from the Replit
  connection API (never cached; tokens rotate).
- **`artifacts/api-server/src/routes/billing.ts`** — the billing API:
  - `GET /api/billing/plan` — current user's plan/subscription details.
  - `GET /api/billing/pricing` — public pricing data.
  - `POST /api/billing/checkout` — creates a Stripe Checkout Session
    (subscription mode). Resolves the price id from the synced `stripe.*`
    schema by `metadata.plan` + `metadata.billing_period`. Returns
    `{ url, sessionId }`. The frontend stores `sessionId` and redirects to `url`.
  - `GET /api/billing/checkout-status?session_id=...` — verifies the session
    belongs to the user (via `metadata.user_id`) and activates the plan once
    the session is `complete` and paid.
  - `POST /api/billing/cancel` — cancels the Stripe subscription and downgrades
    the local plan.
- **`artifacts/api-server/src/app.ts`** — `POST /api/stripe/webhook` mounted
  with `express.raw` **before** `express.json()`. Delegates to
  `getStripeSync().processWebhook`.
- **`artifacts/api-server/src/index.ts`** — non-fatal `initStripe()` on startup:
  runs `stripe.*` schema migrations, registers the managed webhook, and kicks
  off a background `syncBackfill()`. If Stripe isn't connected yet, the rest of
  the API keeps serving.

## Catalog (products & prices)

Plans/prices are seeded into Stripe by
`scripts/src/seed-products.ts` (idempotent). Products are matched on
`metadata.plan`; prices on `metadata.billing_period` + amount + interval.

| Plan      | metadata.plan | Monthly | Annual  |
|-----------|---------------|---------|---------|
| Personal  | `personal`    | $5      | $54     |
| Developer | `pro`         | $19     | $205    |
| Team      | `business`    | $9 a person | $96 a person |

> Personal/Developer annual = round(monthly × 12 × 0.9). Team is per person:
> one subscription per organization with quantity = seats (3 to 10). Backend
> plan ids remain `personal` / `pro` / `business` (display names differ).
> The seed archives active prices that no longer match (e.g. the old $99 Team).

## Team (organization) billing

- `POST /api/billing/team/checkout` `{ orgName, seats, billingPeriod, returnUrl }`
  — Checkout with the per-seat price and `quantity = seats`. Metadata
  `kind=team`, `owner_user_id`, `org_name` (no `user_id`, so the per-user
  reconcile ignores it). A new Stripe customer is created per team.
- `GET /api/billing/checkout-status` creates the organization on payment
  (buyer = active owner); the webhook reconcile (`lib/billing/team.ts`) does
  the same if the buyer never returns, and keeps seats/status in step
  (canceled/unpaid → organization suspended).
- `GET /api/org/billing`, `PATCH /api/org/billing/seats` (owner; prorated),
  `POST /api/org/billing/portal` (owner; Stripe billing portal for invoices,
  card, cancel). **Save the portal settings once** in Stripe Dashboard →
  Settings → Billing → Customer portal, or the portal link fails.

Run the seed (after Stripe is connected):

```bash
pnpm --filter @workspace/scripts run seed-stripe
```

## Setup checklist

1. Connect **Stripe** in the Integrations tab (OAuth).
2. Restart `artifacts/api-server: api` so `initStripe()` provisions the schema
   and managed webhook.
3. Run the seed script to create products/prices.
4. Restart the api-server again so `syncBackfill()` pulls the catalog into the
   `stripe.*` schema (checkout reads price ids from there).

## Going live

Stripe starts in **test mode**. To accept real payments, add the live keys
(`pk_live_...` / `sk_live_...`) in the Publish/Deployment pane and re-run the
seed against live, then redeploy.
