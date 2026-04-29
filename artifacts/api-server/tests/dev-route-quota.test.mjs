// Tests for the monthly per-plan quota policy that now applies on the
// dev routes (/api/dev/analyze|sanitize|outcome) thanks to task #130.
//
// Two layers of coverage:
//   1. Pure decision logic in `evaluateMonthlyQuota` (no I/O).
//   2. Assembled Express middleware behaviour with the DB lookup
//      injected — proves a Pro user at 1,001 monthly requests gets
//      a 429 with the right body, headers, and Retry-After-shaped
//      X-RateLimit-Reset, without standing up Postgres.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import {
  PLAN_REQUEST_LIMITS,
  evaluateMonthlyQuota,
} from "../src/lib/security/quota-source.mjs";
import { createApiRateLimitMiddleware } from "../src/lib/security/quota-middleware.mjs";

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

// Exercise the assembled `apiRateLimit()` middleware as the dev routes
// will use it in production. This is the route-level wiring test the
// architect specifically asked for: mount the middleware on a POST
// handler that mimics /api/dev/analyze, simulate an over-quota Pro
// user, and confirm we get a 429 with the customer-facing body shape
// and the documented X-RateLimit-* headers.
async function startApp(handlerChain) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  // Stand-in for sessionOrApiKeyAuth — tests inject req.user/apiKeyId
  // directly so we don't have to seed the DB for this layer.
  app.use((req, _res, next) => {
    const seed = req.headers["x-test-seed"];
    if (typeof seed === "string") {
      const parsed = JSON.parse(seed);
      req.user = parsed.user;
      req.apiKeyId = parsed.apiKeyId;
    }
    next();
  });
  app.post("/dev/analyze", ...handlerChain, (_req, res) => {
    res.json({ ok: true, ran: "analyze" });
  });

  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return { server, port };
}

function send({ port, seed, body = {} }) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = http.request(
      `http://127.0.0.1:${port}/dev/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          "X-Test-Seed": JSON.stringify(seed),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body: chunks ? JSON.parse(chunks) : null }),
        );
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

describe("apiRateLimit() middleware — dev-route wiring with mocked usage", () => {
  test("Pro user 1 over the cap → 429 with limit/used body and X-RateLimit headers", async () => {
    const calls = [];
    const middleware = createApiRateLimitMiddleware({
      lookupMonthlyUsage: async (userId) => {
        calls.push(userId);
        return 1001; // over the Pro cap of 1000
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 429, "Pro user over cap must be blocked");
      assert.equal(res.headers["x-ratelimit-limit"], "1000");
      assert.equal(res.headers["x-ratelimit-remaining"], "0");
      assert.match(
        res.headers["x-ratelimit-reset"],
        /^\d{4}-\d{2}-\d{2}T/,
        "reset header should be an ISO timestamp",
      );
      assert.equal(res.body.limit, 1000);
      assert.equal(res.body.used, 1001);
      assert.equal(res.body.upgrade, true, "Pro should see the upgrade CTA flag");
      assert.match(res.body.error, /Monthly API rate limit exceeded/);
      assert.match(res.body.error, /Pro plan/, "error message should name the plan");
      assert.deepEqual(calls, ["u-pro"], "lookup should be invoked exactly once with the user id");
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Pro user 999 of 1000 → request passes through, X-RateLimit-Remaining=0 (this is the last allowed)", async () => {
    const middleware = createApiRateLimitMiddleware({
      lookupMonthlyUsage: async () => 999,
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.ran, "analyze");
      assert.equal(res.headers["x-ratelimit-limit"], "1000");
      assert.equal(res.headers["x-ratelimit-remaining"], "0");
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Enterprise short-circuits the lookup entirely (no DB query made)", async () => {
    let lookupCalls = 0;
    const middleware = createApiRateLimitMiddleware({
      lookupMonthlyUsage: async () => {
        lookupCalls++;
        return 0;
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-ent", planType: "enterprise" }, apiKeyId: "k-ent" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers["x-ratelimit-limit"], "unlimited");
      assert.equal(res.headers["x-ratelimit-remaining"], "unlimited");
      assert.equal(lookupCalls, 0, "enterprise must not trigger the DB lookup");
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Free plan API-key user → 403 (paid-only access), no DB lookup", async () => {
    let lookupCalls = 0;
    const middleware = createApiRateLimitMiddleware({
      lookupMonthlyUsage: async () => {
        lookupCalls++;
        return 0;
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-free", planType: "free" }, apiKeyId: "k-free" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 403);
      assert.match(res.body.error, /not available on this plan/);
      assert.equal(lookupCalls, 0);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Session-only caller (no apiKeyId) bypasses the quota entirely — dashboard usage is unconstrained here", async () => {
    let lookupCalls = 0;
    const middleware = createApiRateLimitMiddleware({
      lookupMonthlyUsage: async () => {
        lookupCalls++;
        return 999_999;
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        // No apiKeyId — this is what the dashboard playground sends.
        seed: { user: { id: "u-dash", planType: "pro" }, apiKeyId: undefined },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200, "dashboard session caller must pass through");
      assert.equal(lookupCalls, 0, "no DB roundtrip for session-only callers");
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("DB lookup throws → 503, never fail-open to free traffic", async () => {
    const middleware = createApiRateLimitMiddleware({
      lookupMonthlyUsage: async () => {
        throw new Error("connection refused");
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 503, "must NOT fail-open if we can't tell whether they're over the cap");
      assert.match(res.body.error, /Unable to verify rate limit/);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("createApiRateLimitMiddleware refuses to construct without a lookup — dev-time misuse should crash, not silently fail-open", () => {
    assert.throws(() => createApiRateLimitMiddleware({}), /lookupMonthlyUsage/);
    assert.throws(() => createApiRateLimitMiddleware(), /lookupMonthlyUsage/);
  });
});
