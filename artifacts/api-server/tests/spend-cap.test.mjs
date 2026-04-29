// Tests for the per-plan monthly vendor spend cap on /api/v1/* (#132).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import {
  PLAN_SPEND_BUDGET_MICROS,
  PLAN_TOKEN_COST_MICROS_PER_TOKEN,
  estimateRequestCost,
  estimateTokensFromBytes,
  evaluateMonthlySpend,
  resolveSpendBudget,
  formatMicrosUsd,
} from "../src/lib/security/spend-source.mjs";
import { createApiSpendCapMiddleware } from "../src/lib/security/spend-middleware.mjs";

describe("PLAN_SPEND_BUDGET_MICROS", () => {
  test("Personal $5, Pro $50, Business $500, Enterprise unlimited", () => {
    assert.equal(PLAN_SPEND_BUDGET_MICROS.personal, 5_000_000);
    assert.equal(PLAN_SPEND_BUDGET_MICROS.pro, 50_000_000);
    assert.equal(PLAN_SPEND_BUDGET_MICROS.business, 500_000_000);
    assert.equal(PLAN_SPEND_BUDGET_MICROS.enterprise, -1);
  });

  test("free is intentionally absent (request-count gate 403s it first)", () => {
    assert.ok(!Object.prototype.hasOwnProperty.call(PLAN_SPEND_BUDGET_MICROS, "free"));
  });

  test("per-token pricing: personal cheaper than pro/business/enterprise", () => {
    assert.equal(PLAN_TOKEN_COST_MICROS_PER_TOKEN.personal, 1);
    assert.equal(PLAN_TOKEN_COST_MICROS_PER_TOKEN.pro, 5);
    assert.equal(PLAN_TOKEN_COST_MICROS_PER_TOKEN.business, 5);
    assert.equal(PLAN_TOKEN_COST_MICROS_PER_TOKEN.enterprise, 5);
  });
});

describe("estimateTokensFromBytes", () => {
  test("zero / negative / NaN bytes yield 0 tokens", () => {
    assert.equal(estimateTokensFromBytes(0), 0);
    assert.equal(estimateTokensFromBytes(-1), 0);
    assert.equal(estimateTokensFromBytes(NaN), 0);
  });

  test("rounds up — 1 byte still costs 1 token", () => {
    assert.equal(estimateTokensFromBytes(1), 1);
    assert.equal(estimateTokensFromBytes(3), 1);
    assert.equal(estimateTokensFromBytes(4), 1);
    assert.equal(estimateTokensFromBytes(5), 2);
  });

  test("scales linearly for larger payloads", () => {
    assert.equal(estimateTokensFromBytes(4_000), 1_000);
    assert.equal(estimateTokensFromBytes(40_000), 10_000);
  });
});

describe("estimateRequestCost", () => {
  test("Pro: 4kB request + 4kB response = 2k tokens × 5 micros = 10000", () => {
    const r = estimateRequestCost({ plan: "pro", requestBytes: 4_000, responseBytes: 4_000 });
    assert.equal(r.tokens, 2_000);
    assert.equal(r.costMicros, 10_000);
  });

  test("Personal pays 5x cheaper per token than Pro", () => {
    const personal = estimateRequestCost({ plan: "personal", requestBytes: 4_000, responseBytes: 4_000 });
    const pro = estimateRequestCost({ plan: "pro", requestBytes: 4_000, responseBytes: 4_000 });
    assert.equal(personal.tokens, pro.tokens);
    assert.equal(personal.costMicros * 5, pro.costMicros);
  });

  test("Unknown plan → cost 0, never throws", () => {
    const r = estimateRequestCost({ plan: "ghost", requestBytes: 4_000, responseBytes: 4_000 });
    assert.equal(r.tokens, 2_000);
    assert.equal(r.costMicros, 0);
  });
});

describe("resolveSpendBudget", () => {
  test("override null → plan default", () => {
    assert.equal(resolveSpendBudget({ plan: "pro", override: null }), 50_000_000);
  });
  test("override -1 → unlimited", () => {
    assert.equal(resolveSpendBudget({ plan: "pro", override: -1 }), -1);
  });
  test("explicit override widens or narrows the cap", () => {
    assert.equal(resolveSpendBudget({ plan: "pro", override: 100_000_000 }), 100_000_000);
    assert.equal(resolveSpendBudget({ plan: "pro", override: 1_000_000 }), 1_000_000);
  });
  test("Unknown plan + no override → 0 (no access)", () => {
    assert.equal(resolveSpendBudget({ plan: "ghost", override: null }), 0);
  });
});

describe("evaluateMonthlySpend", () => {
  test("Enterprise → unlimited (DB sum short-circuited)", () => {
    const d = evaluateMonthlySpend({ plan: "enterprise", usedMicros: 999_999_999 });
    assert.equal(d.kind, "unlimited");
    assert.equal(d.limit, -1);
  });

  test("Free / unknown plans → no-access", () => {
    assert.equal(evaluateMonthlySpend({ plan: "free", usedMicros: 0 }).kind, "no-access");
    assert.equal(evaluateMonthlySpend({ plan: "ghost", usedMicros: 0 }).kind, "no-access");
  });

  test("Pro at exactly $50 → exceeded", () => {
    const atCap = evaluateMonthlySpend({ plan: "pro", usedMicros: 50_000_000 });
    assert.equal(atCap.kind, "exceeded");
    assert.equal(atCap.limit, 50_000_000);
    assert.equal(atCap.used, 50_000_000);
  });

  test("Pro one micro under cap → allowed with remaining", () => {
    const justUnder = evaluateMonthlySpend({ plan: "pro", usedMicros: 49_999_999 });
    assert.equal(justUnder.kind, "allowed");
    assert.equal(justUnder.remaining, 1);
  });

  test("Override widens Pro to $1,000 — request that would have been blocked is allowed", () => {
    const widened = evaluateMonthlySpend({
      plan: "pro",
      usedMicros: 75_000_000,
      override: 1_000_000_000,
    });
    assert.equal(widened.kind, "allowed");
    assert.equal(widened.limit, 1_000_000_000);
    assert.equal(widened.remaining, 925_000_000);
  });

  test("Override narrows Pro to $1 — already over, exceeded", () => {
    const narrowed = evaluateMonthlySpend({
      plan: "pro",
      usedMicros: 5_000_000,
      override: 1_000_000,
    });
    assert.equal(narrowed.kind, "exceeded");
    assert.equal(narrowed.limit, 1_000_000);
  });
});

describe("formatMicrosUsd", () => {
  test("scales precision with magnitude", () => {
    assert.equal(formatMicrosUsd(50_000_000), "$50.00");
    assert.equal(formatMicrosUsd(500_000_000), "$500");
    assert.equal(formatMicrosUsd(5_000), "$0.0050");
    assert.equal(formatMicrosUsd(0), "$0.0000");
  });
});

async function startApp(handlerChain) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use((req, _res, next) => {
    const seed = req.headers["x-test-seed"];
    if (typeof seed === "string") {
      const parsed = JSON.parse(seed);
      req.user = parsed.user;
      req.apiKeyId = parsed.apiKeyId;
    }
    next();
  });
  app.post("/v1/datasets/upload", ...handlerChain, (_req, res) => {
    res.json({ ok: true, ran: "upload" });
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
      `http://127.0.0.1:${port}/v1/datasets/upload`,
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

describe("v1 router wiring — spend cap + telemetry only on vendor-invoking routes", () => {
  test("apiSpendCap() and trackApiUsage() are scoped to /datasets/:id/analyze, NOT mounted at the router root", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(new URL("../src/routes/v1.ts", import.meta.url), "utf8");
    assert.ok(
      !/router\.use\(apiSpendCap\(\)\)/.test(src),
      "apiSpendCap() must not be mounted globally — non-vendor routes (upload/download/list) would bill spend on traffic that didn't call any vendor",
    );
    assert.ok(
      !/router\.use\(trackApiUsage\(\)\)/.test(src),
      "trackApiUsage() must not be mounted globally — see above",
    );
    assert.match(
      src,
      /router\.post\(\s*["']\/datasets\/:id\/analyze["'],\s*apiSpendCap\(\),\s*trackApiUsage\(\)/,
      "spend cap + telemetry must run inline on the analyze route, with apiSpendCap before trackApiUsage so a 429-blocked request isn't billed",
    );
  });
});

describe("apiSpendCap() middleware — assembled with mocked DB lookups", () => {
  test("Pro user $0.01 over $50 cap → 429 with spend body and X-SpendCap headers", async () => {
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => 50_000_001,
      lookupSpendOverride: async () => null,
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 429);
      assert.equal(res.headers["x-spendcap-limit"], "50000000");
      assert.equal(res.headers["x-spendcap-remaining"], "0");
      assert.match(res.headers["x-spendcap-reset"], /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(res.body.spendCapExceeded, true);
      assert.equal(res.body.limitMicros, 50_000_000);
      assert.equal(res.body.usedMicros, 50_000_001);
      assert.equal(res.body.upgrade, true);
      assert.match(res.body.error, /spend cap exceeded/i);
      assert.match(res.body.error, /Pro plan/);
      assert.match(res.body.error, /\$50/);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Pro under cap → 200 with X-SpendCap headers", async () => {
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => 10_000_000,
      lookupSpendOverride: async () => null,
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.ran, "upload");
      assert.equal(res.headers["x-spendcap-limit"], "50000000");
      assert.equal(res.headers["x-spendcap-remaining"], "40000000");
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Override widens cap — Pro past plan default but under override is allowed", async () => {
    let overrideCalls = 0;
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => 75_000_000,
      lookupSpendOverride: async () => {
        overrideCalls++;
        return 1_000_000_000;
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro-override", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers["x-spendcap-limit"], "1000000000");
      assert.equal(res.headers["x-spendcap-remaining"], "925000000");
      assert.equal(overrideCalls, 1);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Override -1 (unlimited) short-circuits the spend lookup", async () => {
    let spendLookups = 0;
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => {
        spendLookups++;
        return 999_999_999_999;
      },
      lookupSpendOverride: async () => -1,
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-vip", planType: "pro" }, apiKeyId: "k-vip" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers["x-spendcap-limit"], "unlimited");
      assert.equal(spendLookups, 0);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Enterprise plan short-circuits the spend lookup", async () => {
    let spendLookups = 0;
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => {
        spendLookups++;
        return 0;
      },
      lookupSpendOverride: async () => null,
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-ent", planType: "enterprise" }, apiKeyId: "k-ent" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers["x-spendcap-limit"], "unlimited");
      assert.equal(res.headers["x-spendcap-remaining"], "unlimited");
      assert.equal(spendLookups, 0);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Session-only caller (no apiKeyId) bypasses entirely", async () => {
    let calls = 0;
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => {
        calls++;
        return 999_999_999_999;
      },
      lookupSpendOverride: async () => {
        calls++;
        return null;
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-dash", planType: "pro" }, apiKeyId: undefined },
        body: { text: "hello" },
      });
      assert.equal(res.status, 200);
      assert.equal(calls, 0);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Spend lookup throws → 503, never fail-open", async () => {
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => {
        throw new Error("connection refused");
      },
      lookupSpendOverride: async () => null,
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 503);
      assert.match(res.body.error, /Unable to verify spend cap/);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("Override lookup throws → 503 (must verify override before querying spend)", async () => {
    let spendLookups = 0;
    const middleware = createApiSpendCapMiddleware({
      lookupMonthlySpend: async () => {
        spendLookups++;
        return 0;
      },
      lookupSpendOverride: async () => {
        throw new Error("db down");
      },
    });
    const { server, port } = await startApp([middleware]);
    try {
      const res = await send({
        port,
        seed: { user: { id: "u-pro", planType: "pro" }, apiKeyId: "k-pro" },
        body: { text: "hello" },
      });
      assert.equal(res.status, 503);
      assert.equal(spendLookups, 0);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  test("createApiSpendCapMiddleware refuses to construct without lookups", () => {
    assert.throws(() => createApiSpendCapMiddleware({}), /lookupMonthlySpend/);
    assert.throws(() => createApiSpendCapMiddleware(), /lookupMonthlySpend/);
    assert.throws(
      () => createApiSpendCapMiddleware({ lookupMonthlySpend: async () => 0, lookupSpendOverride: 123 }),
      /lookupSpendOverride/,
    );
  });
});
