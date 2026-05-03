1,# Airwallex Payment Gateway — Integration Guide

A drop-in recipe for integrating **Airwallex Hosted Payment Page** (drop-in checkout via the Components SDK) into a TypeScript / Express + React app. This is the exact pattern that ships in production at eraseai.ai.

It covers:

1. Required environment variables
2. Server-side: token caching, payment-intent creation, status polling, webhook with HMAC verification
3. Client-side: Components SDK redirect-to-checkout
4. Database fields required on the user
5. Webhook setup in the Airwallex dashboard
6. Common gotchas (and why they bite)

The shape is **payment intents + redirect-to-checkout** (Airwallex hosts the card form). It is *not* the embedded card-element flow — that needs a different SDK call but the server side is identical.

---

## 1. Environment variables

Add these to your secrets manager (Replit Secrets, `.env`, etc.). **Never** commit them.

| Variable | Required | Notes |
|---|---|---|
| `AIRWALLEX_CLIENT_ID` | yes | From Airwallex dashboard → API → Get API key. |
| `AIRWALLEX_API_KEY` | yes | Same place. Treat like a password. |
| `AIRWALLEX_ENV` | no | `demo` (default) or `production`. Drives both API base URL and the SDK env. |
| `AIRWALLEX_WEBHOOK_SECRET` | yes (for webhooks) | From dashboard → Developer → Webhooks → your endpoint → "Show secret". |

The demo environment uses `https://api-demo.airwallex.com` and the SDK env `demo`. Production uses `https://api.airwallex.com` and SDK env `prod`.

---

## 2. Server-side library — `lib/airwallex.ts`

This file is framework-agnostic — it only uses `fetch`. Drop it in `src/lib/airwallex.ts` (or wherever your server code lives).

```ts
const AIRWALLEX_API_KEY = process.env.AIRWALLEX_API_KEY || "";
const AIRWALLEX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID || "";
const AIRWALLEX_ENV = process.env.AIRWALLEX_ENV || "demo";

const API_BASE =
  AIRWALLEX_ENV === "production"
    ? "https://api.airwallex.com"
    : "https://api-demo.airwallex.com";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

// Airwallex bearer tokens last ~30 minutes. Cache and refresh ~30s early.
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const res = await fetch(`${API_BASE}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": AIRWALLEX_CLIENT_ID,
      "x-api-key": AIRWALLEX_API_KEY,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airwallex auth failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { token: string; expires_at: string };
  cachedToken = data.token;
  tokenExpiresAt = new Date(data.expires_at).getTime();
  return cachedToken;
}

async function airwallexRequest<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Airwallex API error (${res.status} ${path}): ${errBody}`);
  }
  return res.json() as Promise<T>;
}

interface PaymentIntentResponse {
  id: string;
  client_secret: string;
  status: string;
  request_id: string;
  amount: number;
  currency: string;
  merchant_order_id: string;
  metadata: Record<string, string>;
}

export async function createCheckoutSession(params: {
  amount: number;          // in major units, e.g. 20 for $20.00
  currency: string;        // ISO-4217, e.g. "USD"
  userId: string;
  merchantOrderId: string; // your idempotency key — must be unique per attempt
  returnUrl: string;
  plan?: string;
  billingPeriod?: "monthly" | "annual";
}): Promise<{ intentId: string; clientSecret: string }> {
  const intent = await airwallexRequest<PaymentIntentResponse>(
    "POST",
    "/api/v1/pa/payment_intents/create",
    {
      amount: params.amount,
      currency: params.currency,
      merchant_order_id: params.merchantOrderId,
      // Metadata is echoed back in the webhook + GET intent — use it to
      // recover *which user* and *which plan* this payment was for.
      metadata: {
        user_id: params.userId,
        plan: params.plan || "pro",
        billing_period: params.billingPeriod || "monthly",
      },
      request_id: params.merchantOrderId,
      return_url: params.returnUrl,
    },
  );
  return { intentId: intent.id, clientSecret: intent.client_secret };
}

export async function getPaymentIntent(intentId: string) {
  return airwallexRequest<PaymentIntentResponse>(
    "GET",
    `/api/v1/pa/payment_intents/${intentId}`,
  );
}

export function isConfigured(): boolean {
  return !!(AIRWALLEX_API_KEY && AIRWALLEX_CLIENT_ID);
}

export function getSdkEnv(): "prod" | "demo" {
  return AIRWALLEX_ENV === "production" ? "prod" : "demo";
}
```

### Why this shape

* **Token cache** — the token endpoint is rate-limited and slow; cache aggressively, refresh 30 s before expiry.
* **`merchant_order_id` = `request_id`** — Airwallex uses `request_id` as an idempotency key; reusing the same one safely returns the same intent on retry.
* **Metadata is the lifeline** — webhook + GET-intent only contain what *you* put in `metadata`. Always stash `user_id`, `plan`, and `billing_period` there.

---

## 3. Express routes — `routes/billing.ts`

Mount this under `/api/billing`. Adjust auth/db imports for your stack.

```ts
import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import {
  createCheckoutSession,
  getPaymentIntent,
  isConfigured,
  getSdkEnv,
} from "../lib/airwallex";
// import your db + auth helpers
// import { db, usersTable } from "../db";
// import { eq } from "drizzle-orm";

const router = Router();

type BillingPeriod = "monthly" | "annual";
function isValidBillingPeriod(v: unknown): v is BillingPeriod {
  return v === "monthly" || v === "annual";
}

// Replace with your own pricing source of truth.
const PLAN_PRICING: Record<string, { monthly: number; annual: number; currency: string }> = {
  personal: { monthly: 5, annual: 54, currency: "USD" },
  pro:      { monthly: 20, annual: 216, currency: "USD" },
  business: { monthly: 99, annual: 1069, currency: "USD" },
};

function priceFor(plan: string, period: BillingPeriod): number | null {
  const tier = PLAN_PRICING[plan];
  if (!tier) return null;
  return period === "annual" ? tier.annual : tier.monthly;
}

const WEBHOOK_SECRET = process.env.AIRWALLEX_WEBHOOK_SECRET || "";

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated?.()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  POST /api/billing/checkout — create a payment intent              */
/* ------------------------------------------------------------------ */
router.post("/checkout", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { plan, returnUrl, billingPeriod } = req.body as {
    plan?: string; returnUrl?: string; billingPeriod?: string;
  };
  const period: BillingPeriod =
    isValidBillingPeriod(billingPeriod) ? billingPeriod : "monthly";

  if (!plan || !PLAN_PRICING[plan]) {
    res.status(400).json({ error: "Unknown plan" });
    return;
  }

  const amount = priceFor(plan, period);
  const currency = PLAN_PRICING[plan].currency;
  if (amount === null || amount <= 0) {
    res.status(400).json({ error: "Invalid plan/period" });
    return;
  }

  if (!isConfigured()) {
    res.status(503).json({ error: "Payment provider not configured" });
    return;
  }

  // Look up the user, refuse double-subscribing, etc. (omitted for brevity)

  const rand = crypto.randomBytes(4).toString("hex");
  const merchantOrderId = `ord_${plan}_${period}_${Date.now()}_${rand}`;

  // Constrain returnUrl to the same host to prevent open redirect.
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "";
  let successUrl = `${proto}://${host}/`;
  if (returnUrl) {
    try {
      const parsed = new URL(returnUrl);
      if (parsed.host === host) successUrl = returnUrl;
    } catch { /* ignore */ }
  }

  try {
    const result = await createCheckoutSession({
      amount, currency,
      userId: req.user!.id,
      merchantOrderId,
      returnUrl: successUrl,
      plan, billingPeriod: period,
    });

    // Persist the pending intent on the user so we can validate the
    // /checkout-status callback later.
    // await db.update(usersTable).set({
    //   subscriptionId: result.intentId,
    //   subscriptionStatus: "pending",
    // }).where(eq(usersTable.id, req.user!.id));

    res.json({
      intentId: result.intentId,
      clientSecret: result.clientSecret,
      provider: "airwallex",
      airwallexEnv: getSdkEnv(),
      amount, currency, plan, billingPeriod: period,
    });
  } catch (err) {
    console.error("Airwallex checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/billing/checkout-status — confirm after redirect back    */
/* ------------------------------------------------------------------ */
router.get("/checkout-status", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const intentId = req.query.intent_id as string | undefined;
  if (!intentId) {
    res.status(400).json({ error: "Missing intent_id" });
    return;
  }

  try {
    // Load user; reject if intent_id doesn't match the pending one we stored.
    // const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    // if (!user || user.subscriptionId !== intentId) {
    //   res.status(403).json({ error: "Intent does not belong to caller" });
    //   return;
    // }

    const intent = await getPaymentIntent(intentId);

    // Defence-in-depth: re-check the user_id metadata matches.
    if (intent.metadata?.user_id !== req.user!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (intent.status === "SUCCEEDED") {
      // Activate the subscription. Idempotent — webhook may also fire.
      // await db.update(...).set({ planType, subscriptionStatus: "active", ... });
      res.json({ status: "succeeded" });
    } else if (
      intent.status === "REQUIRES_PAYMENT_METHOD" ||
      intent.status === "REQUIRES_CUSTOMER_ACTION"
    ) {
      res.json({ status: "pending" });
    } else {
      res.json({ status: intent.status.toLowerCase() });
    }
  } catch (err) {
    console.error("Checkout status error:", err);
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/billing/webhook — Airwallex → us                        */
/* ------------------------------------------------------------------ */
function verifyWebhookSignature(req: Request): boolean {
  if (!WEBHOOK_SECRET) return false;

  const signature = req.headers["x-signature"] as string | undefined;
  const timestamp = req.headers["x-timestamp"] as string | undefined;
  if (!signature || !timestamp) return false;

  // Reject replays older than 5 minutes.
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (isNaN(age) || age > 300) return false;

  // CRITICAL: signature is over the *raw* request body string, not the
  // re-stringified JSON. See section 6 for the express.json() verify hook.
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const bodyStr = rawBody ? rawBody.toString("utf-8") : JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}${bodyStr}`)
    .digest("hex");

  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

router.post("/webhook", async (req: Request, res: Response) => {
  if (!verifyWebhookSignature(req)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.body as {
    name?: string;
    data?: { object?: {
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
      merchant_order_id?: string;
    }};
  };

  if (!event.name || !event.data?.object) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const intentData = event.data.object;
  const userId = intentData.metadata?.user_id;
  if (!userId) {
    // Intentionally 200 — Airwallex retries on non-2xx; we can't act on
    // events that aren't ours, but we don't want infinite retries either.
    res.status(200).json({ received: true, skipped: "no user_id" });
    return;
  }

  try {
    switch (event.name) {
      case "payment_intent.succeeded": {
        // Idempotent: only act if not already active for this intent.
        // Use the metadata to know which plan/period to provision.
        // ...db.update(...)
        break;
      }
      case "payment_intent.cancelled": {
        // Mark pending → failed if it matches.
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
    return;
  }

  res.json({ received: true });
});

export default router;
```

---

## 4. Express app wiring — capturing the raw body

The webhook signature is computed over the **raw bytes** of the request body. If `express.json()` parses first you've already lost them. Capture them with the `verify` callback:

```ts
// app.ts
import express from "express";
import billingRouter from "./routes/billing";

const app = express();

app.use(express.json({
  verify: (req, _res, buf) => {
    if (req.url?.includes("/billing/webhook")) {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    }
  },
}));

app.use("/api/billing", billingRouter);

export default app;
```

---

## 5. Client-side — React + Components SDK

Install the SDK in your frontend package:

```bash
pnpm add @airwallex/components-sdk
# or: npm install @airwallex/components-sdk
```

Then trigger checkout from a button:

```tsx
async function handleCheckout(plan: string) {
  const successUrl = window.location.origin + "/?checkout=success";

  // 1. Ask our backend to create the intent.
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ plan, billingPeriod: "monthly", returnUrl: successUrl }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Checkout failed");
    return;
  }

  // 2. Stash the intent id so we can confirm after the redirect back.
  sessionStorage.setItem("checkout_intent", data.intentId);

  // 3. Lazy-load the SDK and redirect to Airwallex's hosted page.
  const { init } = await import("@airwallex/components-sdk");
  const { payments } = await init({
    env: data.airwallexEnv,         // "prod" | "demo" — matches server
    enabledElements: ["payments"],
  });
  if (!payments) {
    alert("Payment SDK unavailable");
    return;
  }
  await payments.redirectToCheckout({
    intent_id: data.intentId,
    client_secret: data.clientSecret,
    currency: data.currency,
    country_code: "US",
    successUrl,
    failUrl: successUrl,
  });
}
```

When the user lands back on `successUrl`, read `?checkout=success` (and the stashed intent id) and call `GET /api/billing/checkout-status?intent_id=…` to confirm and refresh the user's plan in your UI. Don't rely on the redirect alone — the webhook is the source of truth and may arrive a second or two later, so poll status for ~10 seconds before showing an error.

---

## 6. Database fields (subscription state)

On your `users` table you need at minimum:

| Column | Type | Purpose |
|---|---|---|
| `plan_type` | text | `free` / `personal` / `pro` / `business` / … |
| `subscription_id` | text nullable | The Airwallex `payment_intent.id` — also used as the pending-intent guard |
| `subscription_status` | text nullable | `pending` / `active` / `cancelled` / `failed` |
| `plan_start_date` | timestamp | Set when activating |
| `plan_end_date` | timestamp | Set when activating; renewals extend it |

Both `/checkout-status` and the webhook write to these — they must be **idempotent**: only flip `pending → active` if the intent id matches the one you stored.

---

## 7. Webhook setup in the Airwallex dashboard

1. Dashboard → **Developer → Webhooks → Add endpoint**.
2. URL: `https://your-domain.com/api/billing/webhook`
3. Subscribe to (at minimum):
   - `payment_intent.succeeded`
   - `payment_intent.cancelled`
   - `payment_intent.requires_payment_method`
4. Copy the signing secret into `AIRWALLEX_WEBHOOK_SECRET`.
5. Hit **Send test event** — your server should respond `200 {received: true}`.

---

## 8. Common gotchas (the ones that actually bite)

1. **Raw body for webhook.** If you parse JSON first the HMAC will never match. Use the `verify` hook in `express.json()`.
2. **Timing-safe comparison.** Always `crypto.timingSafeEqual` on the signature; comparing strings with `===` leaks the secret over time.
3. **Replay guard.** Reject events older than 5 minutes — `Math.abs(Date.now()/1000 - x-timestamp) > 300`.
4. **Open-redirect protection on `returnUrl`.** Constrain to the same host as the request, never blindly trust whatever the client sent.
5. **Metadata is the only context you'll get back.** Always set `user_id`, `plan`, and `billing_period` in `metadata` at intent-creation time.
6. **`merchant_order_id == request_id`.** Same value → safe retries (Airwallex returns the existing intent instead of creating a new one).
7. **Status-check endpoint must verify ownership.** Compare `intent.metadata.user_id` with `req.user.id` *and* compare the `intent_id` against the `subscription_id` you stored when creating it. Without both checks any logged-in user can claim any intent.
8. **Idempotency on activation.** Both `/checkout-status` (sync) and `/webhook` (async) try to activate. Whichever wins, the other should no-op.
9. **`apiRateLimit` / quota middlewares.** If you have per-user rate limiting on `/api/*`, exempt `/billing/webhook` — it's called by Airwallex, not by your users, and there's no session to attribute it to.
10. **Demo vs prod env mismatch.** `AIRWALLEX_ENV` controls *both* the API base URL on the server *and* the SDK env on the client (returned in the `/checkout` response). Keep them in lockstep — a demo intent ID will not load in the prod SDK.
11. **Amount is in major units for `pa/payment_intents/create`.** `20` means $20.00 USD, not 20 cents. (This is the opposite of Stripe.) Check the Airwallex docs for currencies that have non-standard exponents.
12. **Don't hard-code `country_code: "US"`.** Pull it from the user profile or geo when you have one — some payment methods are gated on country.

---

## 9. Quick test plan

1. Set the three env vars in `demo` mode.
2. Visit `/pricing`, click **Subscribe**, get redirected to Airwallex's hosted page.
3. Pay with the test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. Land back at `successUrl?intent_id=…` → your `/checkout-status` endpoint flips the user to `active`.
5. Webhook fires within seconds → confirms idempotently (no duplicate state changes).
6. Try paying again with the **declined** test card `4000 0000 0000 0002` → status stays `pending`/`failed`, plan stays unchanged.

If step 5 fails with `401 Invalid webhook signature`, you forgot the raw-body capture in `express.json()`. That's gotcha #1 — it's the most common one.

---

That's the whole integration. Copy the two files (`lib/airwallex.ts`, `routes/billing.ts`), add the raw-body hook, wire the React snippet, set the env vars, and you're live.
