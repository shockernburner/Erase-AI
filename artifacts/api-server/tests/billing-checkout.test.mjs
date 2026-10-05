// End-to-end-ish coverage for the subscription checkout flow (task #188):
//
//   POST /api/billing/checkout  -> create a Stripe Checkout Session
//   (browser redirects, pays in Stripe test mode, comes back)
//   GET  /api/billing/checkout-status -> activate the purchased plan
//   POST /api/stripe/webhook    -> stripe-replit-sync keeps our mirror fresh
//
// We can't drive a real hosted Stripe Checkout (a human pays in a browser)
// or boot the full app + Postgres inside `node --test`. So we exercise the
// SAME logic the production routes import — validateCheckoutRequest /
// buildCheckoutSessionParams / evaluateCheckoutStatus from
// ../src/lib/billing/billing-source.mjs and createStripeWebhookHandler from
// ../src/lib/billing/webhook-source.mjs — wired into minimal Express apps
// with a fake Stripe client + in-memory user store. The webhook test uses
// REAL Stripe signature crypto (generateTestHeaderString / constructEvent)
// to prove a signed test event flows through untouched.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import Stripe from "stripe";
import {
  ANNUAL_DISCOUNT,
  PLAN_PRICING,
  VALID_CHECKOUT_PLANS,
  annualPrice,
  isValidBillingPeriod,
  isValidCheckoutPlan,
  extendEndDate,
  validateCheckoutRequest,
  buildCheckoutSessionParams,
  resolveTargetPlan,
  evaluateCheckoutStatus,
} from "../src/lib/billing/billing-source.mjs";
import { createStripeWebhookHandler } from "../src/lib/billing/webhook-source.mjs";

// ---------------------------------------------------------------------------
// Pure-logic unit tests
// ---------------------------------------------------------------------------

describe("plan pricing + checkoutable plans", () => {
  test("only personal/pro are self-serve checkoutable (Team and Enterprise go through sales)", () => {
    assert.deepEqual([...VALID_CHECKOUT_PLANS], ["personal", "pro"]);
    assert.ok(!VALID_CHECKOUT_PLANS.includes("business"));
    assert.ok(!VALID_CHECKOUT_PLANS.includes("free"));
    assert.ok(!VALID_CHECKOUT_PLANS.includes("enterprise"));
  });

  test("annual price applies the 10% discount and rounds", () => {
    assert.equal(ANNUAL_DISCOUNT, 0.9);
    assert.equal(annualPrice(5), 54); // 5*12*0.9 = 54
    assert.equal(annualPrice(19), 205); // 19*12*0.9 = 205.2 -> 205
    assert.equal(annualPrice(99), 1069); // 99*12*0.9 = 1069.2 -> 1069 (helper only)
  });

  test("PLAN_PRICING has the expected monthly figures", () => {
    assert.equal(PLAN_PRICING.personal.monthly, 5);
    assert.equal(PLAN_PRICING.pro.monthly, 19);
    // Team: per person, $9 a month or $8 a month billed yearly, 3 to 10 people.
    assert.equal(PLAN_PRICING.business.monthly, 9);
    assert.equal(PLAN_PRICING.business.annual, 96);
    assert.equal(PLAN_PRICING.business.perSeat, true);
    assert.equal(PLAN_PRICING.business.minSeats, 3);
    assert.equal(PLAN_PRICING.business.maxSeats, 10);
  });

  test("isValidCheckoutPlan / isValidBillingPeriod guards", () => {
    assert.ok(isValidCheckoutPlan("pro"));
    assert.ok(!isValidCheckoutPlan("free"));
    assert.ok(!isValidCheckoutPlan(42));
    assert.ok(isValidBillingPeriod("monthly"));
    assert.ok(isValidBillingPeriod("annual"));
    assert.ok(!isValidBillingPeriod("weekly"));
  });
});

describe("validateCheckoutRequest", () => {
  test("rejects self-serve Team checkout until organization billing exists", () => {
    const r = validateCheckoutRequest({
      plan: "business",
      billingPeriod: "monthly",
      returnUrl: "https://app.example.com/billing",
    });
    assert.equal(r.ok, false);
  });

  for (const plan of ["personal", "pro"]) {
    test(`accepts plan=${plan} with a valid returnUrl`, () => {
      const r = validateCheckoutRequest({
        plan,
        billingPeriod: "monthly",
        returnUrl: "https://app.example.com/billing",
      });
      assert.deepEqual(r, { ok: true, plan, period: "monthly" });
    });
  }

  test("defaults billing period to monthly when missing/invalid", () => {
    const r = validateCheckoutRequest({
      plan: "pro",
      billingPeriod: "weekly",
      returnUrl: "https://x.test/",
    });
    assert.equal(r.ok, true);
    assert.equal(r.period, "monthly");
  });

  test("honours annual billing period", () => {
    const r = validateCheckoutRequest({
      plan: "pro",
      billingPeriod: "annual",
      returnUrl: "https://x.test/",
    });
    assert.equal(r.ok, true);
    assert.equal(r.period, "annual");
  });

  test("rejects free/enterprise/unknown plans with 400", () => {
    for (const plan of ["free", "enterprise", "ghost", undefined, 5]) {
      const r = validateCheckoutRequest({ plan, returnUrl: "https://x.test/" });
      assert.equal(r.ok, false);
      assert.equal(r.status, 400);
      assert.match(r.error, /non-checkoutable plan/);
    }
  });

  test("rejects missing/non-http returnUrl with 400", () => {
    for (const returnUrl of [undefined, "", "ftp://x", "javascript:alert(1)", 123]) {
      const r = validateCheckoutRequest({ plan: "pro", returnUrl });
      assert.equal(r.ok, false);
      assert.equal(r.status, 400);
      assert.match(r.error, /returnUrl/);
    }
  });
});

describe("buildCheckoutSessionParams", () => {
  test("produces a subscription-mode session with the resolved price + metadata", () => {
    const params = buildCheckoutSessionParams({
      priceId: "price_pro_monthly",
      customerId: "cus_123",
      returnUrl: "https://app.example.com/billing",
      userId: "u-1",
      plan: "pro",
      period: "monthly",
    });
    assert.equal(params.mode, "subscription");
    assert.equal(params.customer, "cus_123");
    assert.deepEqual(params.line_items, [{ price: "price_pro_monthly", quantity: 1 }]);
    assert.equal(params.allow_promotion_codes, true);
    assert.equal(
      params.success_url,
      "https://app.example.com/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assert.equal(params.cancel_url, "https://app.example.com/billing?checkout=cancel");
    assert.deepEqual(params.metadata, { user_id: "u-1", plan: "pro", billing_period: "monthly" });
    assert.deepEqual(params.subscription_data.metadata, {
      user_id: "u-1",
      plan: "pro",
      billing_period: "monthly",
    });
  });

  test("uses & as the separator when the returnUrl already has a query string", () => {
    const params = buildCheckoutSessionParams({
      priceId: "price_x",
      customerId: "cus_x",
      returnUrl: "https://app.example.com/billing?tab=plans",
      userId: "u-1",
      plan: "personal",
      period: "annual",
    });
    assert.equal(
      params.success_url,
      "https://app.example.com/billing?tab=plans&checkout=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assert.equal(
      params.cancel_url,
      "https://app.example.com/billing?tab=plans&checkout=cancel",
    );
  });
});

describe("resolveTargetPlan", () => {
  test("passes through the three checkoutable plans", () => {
    assert.equal(resolveTargetPlan("personal"), "personal");
    assert.equal(resolveTargetPlan("pro"), "pro");
    assert.equal(resolveTargetPlan("business"), "business");
  });
  test("falls back to pro for anything else", () => {
    assert.equal(resolveTargetPlan("free"), "pro");
    assert.equal(resolveTargetPlan(undefined), "pro");
    assert.equal(resolveTargetPlan("garbage"), "pro");
  });
});

describe("extendEndDate", () => {
  test("monthly adds one month", () => {
    const end = extendEndDate(new Date("2026-01-15T10:00:00Z"), "monthly");
    assert.equal(end.getMonth(), new Date("2026-02-15T10:00:00Z").getMonth());
  });
  test("annual adds twelve months", () => {
    const start = new Date("2026-03-10T00:00:00Z");
    const end = extendEndDate(start, "annual");
    assert.equal(end.getFullYear(), start.getFullYear() + 1);
  });
  test("clamps the day so Jan-31 monthly lands on the last day of Feb", () => {
    // Use local-time construction to avoid TZ surprises in the day clamp.
    const start = new Date(2026, 0, 31, 12, 0, 0);
    const end = extendEndDate(start, "monthly");
    assert.equal(end.getMonth(), 1); // February
    assert.equal(end.getDate(), 28); // 2026 is not a leap year
  });
});

describe("evaluateCheckoutStatus", () => {
  const userId = "u-42";
  const base = {
    metadata: { user_id: userId, plan: "pro", billing_period: "monthly" },
  };

  test("denies a session that belongs to a different user", () => {
    const d = evaluateCheckoutStatus(
      { metadata: { user_id: "someone-else", plan: "pro" } },
      userId,
    );
    assert.deepEqual(d, { kind: "denied" });
  });

  test("a completed + paid session promotes the user to the purchased plan", () => {
    const now = new Date("2026-06-05T00:00:00Z");
    const d = evaluateCheckoutStatus(
      {
        ...base,
        status: "complete",
        payment_status: "paid",
        customer: "cus_abc",
        subscription: { id: "sub_abc", current_period_end: 1781000000 },
      },
      userId,
      now,
    );
    assert.equal(d.kind, "succeeded");
    assert.equal(d.plan, "pro");
    assert.equal(d.period, "monthly");
    assert.equal(d.subscriptionId, "sub_abc");
    assert.equal(d.customerId, "cus_abc");
    assert.equal(d.endDate.getTime(), 1781000000 * 1000);
  });

  test("no_payment_required (100% coupon) also counts as paid", () => {
    const d = evaluateCheckoutStatus(
      {
        ...base,
        status: "complete",
        payment_status: "no_payment_required",
        subscription: "sub_str",
      },
      userId,
    );
    assert.equal(d.kind, "succeeded");
    assert.equal(d.subscriptionId, "sub_str");
  });

  test("falls back to extendEndDate when the subscription has no period end", () => {
    const now = new Date(2026, 5, 5, 12, 0, 0);
    const d = evaluateCheckoutStatus(
      { ...base, status: "complete", payment_status: "paid", subscription: "sub_x" },
      userId,
      now,
    );
    assert.equal(d.kind, "succeeded");
    assert.equal(d.endDate.getMonth(), 6); // July, one month on
  });

  test("each checkoutable plan promotes to the matching plan", () => {
    for (const plan of ["personal", "pro", "business"]) {
      const d = evaluateCheckoutStatus(
        {
          metadata: { user_id: userId, plan, billing_period: "annual" },
          status: "complete",
          payment_status: "paid",
          subscription: "sub_p",
        },
        userId,
      );
      assert.equal(d.kind, "succeeded");
      assert.equal(d.plan, plan);
      assert.equal(d.period, "annual");
    }
  });

  test("expired session reports expired", () => {
    const d = evaluateCheckoutStatus({ ...base, status: "expired" }, userId);
    assert.deepEqual(d, { kind: "expired" });
  });

  test("an open/unpaid session is still pending", () => {
    const d = evaluateCheckoutStatus(
      { ...base, status: "open", payment_status: "unpaid" },
      userId,
    );
    assert.deepEqual(d, { kind: "pending" });
  });
});

// ---------------------------------------------------------------------------
// Route-level harnesses: mount the real shared helpers behind Express the
// same way routes/billing.ts does, with a fake Stripe client + in-memory
// user store, and drive them over HTTP.
// ---------------------------------------------------------------------------

function makeFakeStripe({ priceMap, onSessionCreate }) {
  const created = [];
  return {
    created,
    customers: {
      async create({ email, metadata }) {
        return { id: `cus_${metadata.user_id}`, email };
      },
    },
    checkout: {
      sessions: {
        async create(params) {
          created.push(params);
          if (onSessionCreate) onSessionCreate(params);
          const id = `cs_test_${created.length}`;
          return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
        },
        async retrieve(id) {
          // The caller seeds the session to return via __sessions.
          const session = priceMap.__sessions?.[id];
          if (!session) throw new Error(`no such session ${id}`);
          return session;
        },
      },
    },
  };
}

// A minimal stand-in for routes/billing.ts that reuses the SAME exported
// helpers the production route imports.
function buildBillingApp({ stripe, store, findPriceId }) {
  const app = express();
  app.use(express.json());
  // Seed an authenticated user from a header (mirrors authMiddleware).
  app.use((req, _res, next) => {
    const seed = req.headers["x-test-user"];
    req.user = seed ? JSON.parse(seed) : null;
    next();
  });

  app.post("/api/billing/checkout", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const validated = validateCheckoutRequest(req.body);
    if (!validated.ok) return res.status(validated.status).json({ error: validated.error });
    const { plan, period } = validated;
    const user = store.get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const priceId = await findPriceId(plan, period);
    if (!priceId) {
      return res.status(503).json({ error: "unavailable", code: "PRICE_NOT_FOUND" });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
    }

    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams({
        priceId,
        customerId,
        returnUrl: req.body.returnUrl,
        userId: user.id,
        plan,
        period,
      }),
    );
    res.json({ url: session.url, sessionId: session.id });
  });

  app.get("/api/billing/checkout-status", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ error: "Missing session_id parameter" });
    const user = store.get(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const now = new Date();
    const decision = evaluateCheckoutStatus(session, req.user.id, now);

    if (decision.kind === "denied") return res.status(403).json({ error: "Access denied" });
    if (decision.kind === "succeeded") {
      user.planType = decision.plan;
      user.subscriptionId = decision.subscriptionId;
      user.stripeCustomerId = decision.customerId ?? user.stripeCustomerId;
      user.subscriptionStatus = "active";
      user.planStartDate = now;
      user.planEndDate = decision.endDate;
      return res.json({ status: "succeeded", planType: decision.plan, billingPeriod: decision.period });
    }
    if (decision.kind === "expired") return res.json({ status: "expired" });
    res.json({ status: "pending" });
  });

  return app;
}

function start(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function request({ port, method, path, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(typeof body === "string" ? body : JSON.stringify(body)) : null;
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        method,
        headers: {
          ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}),
          ...headers,
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }),
        );
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("POST /api/billing/checkout — over HTTP", () => {
  // Deterministic price ids keyed by (plan, period), shaped like real
  // Stripe price ids resolved from the synced stripe.* schema.
  const PRICE_IDS = {
    personal: { monthly: "price_personal_m", annual: "price_personal_a" },
    pro: { monthly: "price_pro_m", annual: "price_pro_a" },
    business: { monthly: "price_business_m", annual: "price_business_a" },
  };
  const findPriceId = async (plan, period) => PRICE_IDS[plan]?.[period] ?? null;

  for (const plan of ["personal", "pro"]) {
    test(`plan=${plan} returns a session URL and uses the matching price id`, async () => {
      const priceMap = {};
      const stripe = makeFakeStripe({ priceMap });
      const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
      const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
      try {
        const r = await request({
          port,
          method: "POST",
          path: "/api/billing/checkout",
          headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
          body: { plan, billingPeriod: "monthly", returnUrl: "https://app.example.com/billing" },
        });
        assert.equal(r.status, 200);
        assert.match(r.body.url, /^https:\/\/checkout\.stripe\.com\/c\/pay\//);
        assert.ok(typeof r.body.sessionId === "string" && r.body.sessionId.length > 0);
        // The created session carried a valid, plan-matched price id.
        assert.equal(stripe.created.length, 1);
        assert.equal(stripe.created[0].mode, "subscription");
        assert.equal(stripe.created[0].line_items[0].price, PRICE_IDS[plan].monthly);
        assert.equal(stripe.created[0].metadata.plan, plan);
      } finally {
        await new Promise((res) => server.close(res));
      }
    });
  }

  test("creates a Stripe customer on first checkout and reuses it after", async () => {
    const stripe = makeFakeStripe({ priceMap: {} });
    const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
    const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
    try {
      await request({
        port,
        method: "POST",
        path: "/api/billing/checkout",
        headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
        body: { plan: "pro", returnUrl: "https://app.example.com/billing" },
      });
      assert.equal(store.get("u-1").stripeCustomerId, "cus_u-1");
      assert.equal(stripe.created[0].customer, "cus_u-1");
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("rejects a non-checkoutable plan with 400 before touching Stripe", async () => {
    const stripe = makeFakeStripe({ priceMap: {} });
    const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
    const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
    try {
      const r = await request({
        port,
        method: "POST",
        path: "/api/billing/checkout",
        headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
        body: { plan: "enterprise", returnUrl: "https://app.example.com/billing" },
      });
      assert.equal(r.status, 400);
      assert.equal(stripe.created.length, 0);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("503 PRICE_NOT_FOUND when no price exists for the plan/period", async () => {
    const stripe = makeFakeStripe({ priceMap: {} });
    const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
    const { server, port } = await start(
      buildBillingApp({ stripe, store, findPriceId: async () => null }),
    );
    try {
      const r = await request({
        port,
        method: "POST",
        path: "/api/billing/checkout",
        headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
        body: { plan: "pro", returnUrl: "https://app.example.com/billing" },
      });
      assert.equal(r.status, 503);
      assert.equal(r.body.code, "PRICE_NOT_FOUND");
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("unauthenticated checkout is 401", async () => {
    const stripe = makeFakeStripe({ priceMap: {} });
    const store = new Map();
    const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
    try {
      const r = await request({
        port,
        method: "POST",
        path: "/api/billing/checkout",
        body: { plan: "pro", returnUrl: "https://app.example.com/billing" },
      });
      assert.equal(r.status, 401);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });
});

describe("GET /api/billing/checkout-status — simulated completed test-mode checkout", () => {
  const findPriceId = async () => "price_pro_m";

  test("a completed paid session promotes the caller to the purchased plan", async () => {
    const priceMap = {
      __sessions: {
        cs_done: {
          metadata: { user_id: "u-1", plan: "business", billing_period: "annual" },
          status: "complete",
          payment_status: "paid",
          customer: "cus_u-1",
          subscription: { id: "sub_done", current_period_end: 1800000000 },
        },
      },
    };
    const stripe = makeFakeStripe({ priceMap });
    const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
    const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
    try {
      const r = await request({
        port,
        method: "GET",
        path: "/api/billing/checkout-status?session_id=cs_done",
        headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
      });
      assert.equal(r.status, 200);
      assert.deepEqual(r.body, { status: "succeeded", planType: "business", billingPeriod: "annual" });
      const user = store.get("u-1");
      assert.equal(user.planType, "business");
      assert.equal(user.subscriptionId, "sub_done");
      assert.equal(user.subscriptionStatus, "active");
      assert.equal(user.planEndDate.getTime(), 1800000000 * 1000);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("a session for another user is rejected 403 and does not change the plan", async () => {
    const priceMap = {
      __sessions: {
        cs_other: {
          metadata: { user_id: "someone-else", plan: "pro" },
          status: "complete",
          payment_status: "paid",
          subscription: "sub_x",
        },
      },
    };
    const stripe = makeFakeStripe({ priceMap });
    const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
    const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
    try {
      const r = await request({
        port,
        method: "GET",
        path: "/api/billing/checkout-status?session_id=cs_other",
        headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
      });
      assert.equal(r.status, 403);
      assert.equal(store.get("u-1").planType, "free");
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("a still-open session reports pending and leaves the plan untouched", async () => {
    const priceMap = {
      __sessions: {
        cs_open: {
          metadata: { user_id: "u-1", plan: "pro", billing_period: "monthly" },
          status: "open",
          payment_status: "unpaid",
        },
      },
    };
    const stripe = makeFakeStripe({ priceMap });
    const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
    const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
    try {
      const r = await request({
        port,
        method: "GET",
        path: "/api/billing/checkout-status?session_id=cs_open",
        headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
      });
      assert.equal(r.status, 200);
      assert.deepEqual(r.body, { status: "pending" });
      assert.equal(store.get("u-1").planType, "free");
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("missing session_id is a 400", async () => {
    const stripe = makeFakeStripe({ priceMap: {} });
    const store = new Map([["u-1", { id: "u-1", email: "a@b.test", planType: "free" }]]);
    const { server, port } = await start(buildBillingApp({ stripe, store, findPriceId }));
    try {
      const r = await request({
        port,
        method: "GET",
        path: "/api/billing/checkout-status",
        headers: { "X-Test-User": JSON.stringify({ id: "u-1" }) },
      });
      assert.equal(r.status, 400);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });
});

// ---------------------------------------------------------------------------
// Webhook: POST /api/stripe/webhook with a REAL signed Stripe test event.
// ---------------------------------------------------------------------------

describe("POST /api/stripe/webhook", () => {
  // Stripe's webhook signing/verification is pure crypto (no network), so we
  // can sign a payload and have the fake sync verify it with the same secret.
  const stripe = new Stripe("sk_test_dummy", { apiVersion: "2025-11-17.clover" });
  const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests";

  function buildWebhookApp({ getSync }) {
    const app = express();
    app.post(
      "/api/stripe/webhook",
      express.raw({ type: "application/json" }),
      createStripeWebhookHandler({ getSync, logger: { error() {} } }),
    );
    return app;
  }

  function signedEvent(eventBody) {
    const payload = JSON.stringify(eventBody);
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });
    return { payload, header };
  }

  test("a correctly signed event is verified, processed, and acked 200", async () => {
    const processed = [];
    const sync = {
      async processWebhook(buf, sig) {
        // This is exactly what stripe-replit-sync does internally: verify the
        // signature against the raw body. If express.json() had touched the
        // body, or the signature were wrong, this throws.
        const event = stripe.webhooks.constructEvent(buf, sig, WEBHOOK_SECRET);
        processed.push(event);
      },
    };
    const app = buildWebhookApp({ getSync: async () => sync });
    const { server, port } = await start(app);
    try {
      const { payload, header } = signedEvent({
        id: "evt_test_1",
        type: "checkout.session.completed",
        data: { object: { id: "cs_test_1", metadata: { user_id: "u-1", plan: "pro" } } },
      });
      const r = await request({
        port,
        method: "POST",
        path: "/api/stripe/webhook",
        headers: { "Stripe-Signature": header },
        body: payload,
      });
      assert.equal(r.status, 200);
      assert.deepEqual(r.body, { received: true });
      assert.equal(processed.length, 1);
      assert.equal(processed[0].type, "checkout.session.completed");
      assert.equal(processed[0].data.object.metadata.user_id, "u-1");
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("a missing Stripe-Signature header is rejected 400 without calling sync", async () => {
    let calls = 0;
    const sync = { async processWebhook() { calls++; } };
    const app = buildWebhookApp({ getSync: async () => sync });
    const { server, port } = await start(app);
    try {
      const r = await request({
        port,
        method: "POST",
        path: "/api/stripe/webhook",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "evt", type: "x" }),
      });
      assert.equal(r.status, 400);
      assert.equal(calls, 0);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("a tampered body fails signature verification → 400", async () => {
    const sync = {
      async processWebhook(buf, sig) {
        stripe.webhooks.constructEvent(buf, sig, WEBHOOK_SECRET);
      },
    };
    const app = buildWebhookApp({ getSync: async () => sync });
    const { server, port } = await start(app);
    try {
      const { header } = signedEvent({ id: "evt_test_2", type: "customer.subscription.deleted" });
      // Send a DIFFERENT body than the one that was signed.
      const r = await request({
        port,
        method: "POST",
        path: "/api/stripe/webhook",
        headers: { "Stripe-Signature": header },
        body: JSON.stringify({ id: "evt_tampered", type: "customer.subscription.deleted" }),
      });
      assert.equal(r.status, 400);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("processWebhook throwing surfaces as a 400 (Stripe will retry)", async () => {
    const sync = {
      async processWebhook() {
        throw new Error("db down");
      },
    };
    const app = buildWebhookApp({ getSync: async () => sync });
    const { server, port } = await start(app);
    try {
      const { payload, header } = signedEvent({ id: "evt_test_3", type: "invoice.paid" });
      const r = await request({
        port,
        method: "POST",
        path: "/api/stripe/webhook",
        headers: { "Stripe-Signature": header },
        body: payload,
      });
      assert.equal(r.status, 400);
    } finally {
      await new Promise((res) => server.close(res));
    }
  });

  test("createStripeWebhookHandler refuses to construct without getSync", () => {
    assert.throws(() => createStripeWebhookHandler({}), /getSync/);
    assert.throws(() => createStripeWebhookHandler(), /getSync/);
  });
});
