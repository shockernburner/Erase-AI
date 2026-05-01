// Tests for the shared demo-key TTL + quota gate (task #158). The same
// factory is bound by apiKeyAuth (/api/v1/*) and sessionOrApiKeyAuth
// (/api/dev/*); these tests prove both surfaces reject expired and
// quota-exhausted demo keys identically. For demo keys the enforcer
// is the single writer of api_usage rows; trackApiUsage skips them
// to avoid double-counting (which would let abusers double their
// effective quota).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import {
  createApiKeyEnforcer,
  decideApiKeyEnforcement,
} from "../src/middlewares/api-key-enforcement-source.mjs";

describe("decideApiKeyEnforcement — boundaries", () => {
  test("normal user key (no expiresAt, no quota) is always allowed", () => {
    const r = decideApiKeyEnforcement(
      { id: "k", expiresAt: null, requestQuota: null },
      999_999,
      Date.now(),
    );
    assert.deepEqual(r, { ok: true });
  });

  test("one ms past expiry → 401 DEMO_KEY_EXPIRED", () => {
    const now = Date.now();
    const r = decideApiKeyEnforcement(
      { id: "k", expiresAt: new Date(now - 1), requestQuota: 50 },
      0,
      now,
    );
    assert.equal(r.status, 401);
    assert.equal(r.body.code, "DEMO_KEY_EXPIRED");
  });

  test("one ms before expiry is still valid", () => {
    const now = Date.now();
    const r = decideApiKeyEnforcement(
      { id: "k", expiresAt: new Date(now + 1), requestQuota: 50 },
      0,
      now,
    );
    assert.deepEqual(r, { ok: true });
  });

  test("expiry takes precedence over quota", () => {
    const now = Date.now();
    const r = decideApiKeyEnforcement(
      { id: "k", expiresAt: new Date(now - 1000), requestQuota: 50 },
      9999,
      now,
    );
    assert.equal(r.status, 401);
    assert.equal(r.body.code, "DEMO_KEY_EXPIRED");
  });

  test("at exactly the quota → 429 with limit/used", () => {
    const r = decideApiKeyEnforcement(
      { id: "k", expiresAt: null, requestQuota: 50 },
      50,
      Date.now(),
    );
    assert.equal(r.status, 429);
    assert.equal(r.body.code, "DEMO_KEY_QUOTA_EXCEEDED");
    assert.equal(r.body.limit, 50);
    assert.equal(r.body.used, 50);
  });

  test("one under the quota is allowed (the 50th request gets through)", () => {
    const r = decideApiKeyEnforcement(
      { id: "k", expiresAt: null, requestQuota: 50 },
      49,
      Date.now(),
    );
    assert.deepEqual(r, { ok: true });
  });
});

describe("createApiKeyEnforcer — factory contract", () => {
  test("refuses to construct without a complete store", () => {
    assert.throws(() => createApiKeyEnforcer(), /countUsage/);
    assert.throws(() => createApiKeyEnforcer({}), /countUsage/);
    assert.throws(
      () => createApiKeyEnforcer({ countUsage: async () => 0 }),
      /countUsage/,
    );
  });

  test("expired key short-circuits — does not call countUsage or insertUsage", async () => {
    let countCalls = 0;
    let insertCalls = 0;
    const enforce = createApiKeyEnforcer({
      countUsage: async () => {
        countCalls += 1;
        return 0;
      },
      insertUsage: async () => {
        insertCalls += 1;
      },
    });
    const r = await enforce(
      { id: "k", expiresAt: new Date(Date.now() - 1000), requestQuota: 50 },
      { method: "POST", path: "/x" },
    );
    assert.equal(r.body.code, "DEMO_KEY_EXPIRED");
    assert.equal(countCalls, 0);
    assert.equal(insertCalls, 0);
  });

  test("normal user key (no quota) skips both countUsage and insertUsage", async () => {
    let countCalls = 0;
    let insertCalls = 0;
    const enforce = createApiKeyEnforcer({
      countUsage: async () => {
        countCalls += 1;
        return 999_999;
      },
      insertUsage: async () => {
        insertCalls += 1;
      },
    });
    const r = await enforce(
      { id: "k", expiresAt: null, requestQuota: null },
      { method: "GET", path: "/y" },
    );
    assert.deepEqual(r, { ok: true });
    assert.equal(countCalls, 0);
    assert.equal(insertCalls, 0);
  });

  test("valid demo key writes exactly one usage row per call", async () => {
    let inserts = 0;
    const enforce = createApiKeyEnforcer({
      countUsage: async () => 0,
      insertUsage: async () => {
        inserts += 1;
      },
    });
    const r = await enforce(
      { id: "k", expiresAt: new Date(Date.now() + 60_000), requestQuota: 50 },
      { method: "POST", path: "/z" },
    );
    assert.deepEqual(r, { ok: true });
    assert.equal(inserts, 1);
  });

  test("at-quota demo key is rejected and does NOT write a new usage row", async () => {
    let inserts = 0;
    const enforce = createApiKeyEnforcer({
      countUsage: async () => 50,
      insertUsage: async () => {
        inserts += 1;
      },
    });
    const r = await enforce(
      { id: "k", expiresAt: new Date(Date.now() + 60_000), requestQuota: 50 },
      { method: "POST", path: "/z" },
    );
    assert.equal(r.body.code, "DEMO_KEY_QUOTA_EXCEEDED");
    assert.equal(inserts, 0);
  });
});

// Wire the enforcer into two minimal Express apps shaped like the real
// /api/v1/* and /api/dev/* surfaces. The enforcer itself writes usage
// rows for demo keys; the simulated trackApiUsage after-hook only
// runs for non-quota keys (matching production's req.apiKeyHasQuota
// skip). This proves the cap holds on EVERY endpoint, including
// untracked ones like /datasets/upload.
function makeStore({ keys }) {
  const usage = new Map();
  for (const k of keys) usage.set(k.id, 0);
  return {
    lookupKey(token) {
      return keys.find((k) => k.token === token) ?? null;
    },
    async countUsage(apiKeyId) {
      return usage.get(apiKeyId) ?? 0;
    },
    async insertUsage({ apiKeyId }) {
      usage.set(apiKeyId, (usage.get(apiKeyId) ?? 0) + 1);
    },
    logUsageFromTracker(apiKeyId) {
      usage.set(apiKeyId, (usage.get(apiKeyId) ?? 0) + 1);
    },
    _setUsage(token, n) {
      const k = keys.find((x) => x.token === token);
      if (k) usage.set(k.id, n);
    },
    _peek(id) {
      return usage.get(id) ?? 0;
    },
  };
}

function buildSurface({ store, mountPath }) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  const enforce = createApiKeyEnforcer(store);
  app.use(mountPath, async (req, res, next) => {
    const token = req.headers["x-test-api-key"];
    if (!token || typeof token !== "string") {
      return res.status(401).json({ error: "missing test key" });
    }
    const row = store.lookupKey(token);
    if (!row) return res.status(401).json({ error: "unknown key" });
    const decision = await enforce(row, { method: req.method, path: req.path });
    if (!decision.ok) {
      return res.status(decision.status).json(decision.body);
    }
    req.apiKeyHasQuota = row.requestQuota != null;
    // Simulated trackApiUsage: production skips when apiKeyHasQuota is
    // true (the enforcer already counted). Mirror that here.
    if (!req.apiKeyHasQuota) {
      res.on("finish", () => {
        if (res.statusCode < 400) store.logUsageFromTracker(row.id);
      });
    }
    return next();
  });
  // Two route shapes: one tracked-in-prod (analyze) and one untracked-
  // in-prod (upload). The cap must hold on both.
  app.all(mountPath + "/*splat", (_req, res) => res.json({ ok: true }));
  return app;
}

async function startApp(app) {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return { server, port };
}

function send({ port, path, key }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        method: "POST",
        headers: { "X-Test-Api-Key": key, "Content-Type": "application/json", "Content-Length": "2" },
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
    req.write("{}");
    req.end();
  });
}

describe("/api/v1/* and /api/dev/* enforce demo-key TTL+quota identically", () => {
  const expiredKey = {
    id: "k-expired",
    token: "eak_expired",
    expiresAt: new Date(Date.now() - 60_000),
    requestQuota: 50,
  };
  const exhaustedKey = {
    id: "k-exhausted",
    token: "eak_exhausted",
    expiresAt: new Date(Date.now() + 60_000),
    requestQuota: 50,
  };
  const validDemoKey = {
    id: "k-valid",
    token: "eak_valid",
    expiresAt: new Date(Date.now() + 60_000),
    requestQuota: 50,
  };
  const normalUserKey = {
    id: "k-user",
    token: "eak_user",
    expiresAt: null,
    requestQuota: null,
  };
  const allKeys = [expiredKey, exhaustedKey, validDemoKey, normalUserKey];

  for (const surface of [
    { name: "/api/v1/*", mount: "/api/v1" },
    { name: "/api/dev/*", mount: "/api/dev" },
  ]) {
    test(`${surface.name} rejects expired demo key → 401 DEMO_KEY_EXPIRED`, async () => {
      const store = makeStore({ keys: allKeys });
      const { server, port } = await startApp(buildSurface({ store, mountPath: surface.mount }));
      try {
        const r = await send({ port, path: `${surface.mount}/datasets`, key: expiredKey.token });
        assert.equal(r.status, 401);
        assert.equal(r.body.code, "DEMO_KEY_EXPIRED");
      } finally {
        await new Promise((r) => server.close(r));
      }
    });

    test(`${surface.name} rejects exhausted demo key → 429 DEMO_KEY_QUOTA_EXCEEDED`, async () => {
      const store = makeStore({ keys: allKeys });
      store._setUsage(exhaustedKey.token, 50);
      const { server, port } = await startApp(buildSurface({ store, mountPath: surface.mount }));
      try {
        const r = await send({ port, path: `${surface.mount}/analyze`, key: exhaustedKey.token });
        assert.equal(r.status, 429);
        assert.equal(r.body.code, "DEMO_KEY_QUOTA_EXCEEDED");
        assert.equal(r.body.limit, 50);
        assert.equal(r.body.used, 50);
      } finally {
        await new Promise((r) => server.close(r));
      }
    });

    test(`${surface.name} valid demo key → 200, exactly one usage row per request (no double-count)`, async () => {
      const store = makeStore({ keys: allKeys });
      const { server, port } = await startApp(buildSurface({ store, mountPath: surface.mount }));
      try {
        const r = await send({ port, path: `${surface.mount}/datasets`, key: validDemoKey.token });
        assert.equal(r.status, 200);
        assert.equal(store._peek(validDemoKey.id), 1);
      } finally {
        await new Promise((r) => server.close(r));
      }
    });

    test(`${surface.name} normal user key (no expiry, no quota) passes through`, async () => {
      const store = makeStore({ keys: allKeys });
      const { server, port } = await startApp(buildSurface({ store, mountPath: surface.mount }));
      try {
        const r = await send({ port, path: `${surface.mount}/datasets`, key: normalUserKey.token });
        assert.equal(r.status, 200);
      } finally {
        await new Promise((r) => server.close(r));
      }
    });

    test(`${surface.name} burn-down on tracked endpoint: exactly 50 succeed, 51st fails 429`, async () => {
      const store = makeStore({ keys: allKeys });
      const { server, port } = await startApp(buildSurface({ store, mountPath: surface.mount }));
      try {
        for (let i = 0; i < 50; i++) {
          const r = await send({ port, path: `${surface.mount}/analyze`, key: validDemoKey.token });
          assert.equal(r.status, 200, `request #${i + 1} should succeed`);
        }
        const overflow = await send({
          port,
          path: `${surface.mount}/analyze`,
          key: validDemoKey.token,
        });
        assert.equal(overflow.status, 429);
        assert.equal(overflow.body.code, "DEMO_KEY_QUOTA_EXCEEDED");
        assert.equal(overflow.body.used, 50);
      } finally {
        await new Promise((r) => server.close(r));
      }
    });

    // Regression for the reviewer's blocking finding: in production
    // trackApiUsage is mounted on a SUBSET of routes (e.g. analyze,
    // not upload/list/result/download). The cap MUST still hold on
    // those untracked endpoints because the enforcer is the writer
    // for demo keys.
    test(`${surface.name} burn-down on UNTRACKED endpoint (e.g. upload) also caps at 50`, async () => {
      const store = makeStore({ keys: allKeys });
      const { server, port } = await startApp(buildSurface({ store, mountPath: surface.mount }));
      try {
        for (let i = 0; i < 50; i++) {
          const r = await send({
            port,
            path: `${surface.mount}/datasets/upload`,
            key: validDemoKey.token,
          });
          assert.equal(r.status, 200, `upload #${i + 1} should succeed`);
        }
        const overflow = await send({
          port,
          path: `${surface.mount}/datasets/upload`,
          key: validDemoKey.token,
        });
        assert.equal(overflow.status, 429);
        assert.equal(overflow.body.code, "DEMO_KEY_QUOTA_EXCEEDED");
      } finally {
        await new Promise((r) => server.close(r));
      }
    });

    // Mixed-endpoint burn-down: the demo-quota counter must be a
    // single global pool across all endpoints — calling 25 to a
    // tracked route + 25 to an untracked route MUST exhaust the cap.
    test(`${surface.name} mixed tracked+untracked endpoints share a single 50-call pool`, async () => {
      const store = makeStore({ keys: allKeys });
      const { server, port } = await startApp(buildSurface({ store, mountPath: surface.mount }));
      try {
        for (let i = 0; i < 25; i++) {
          const r = await send({ port, path: `${surface.mount}/analyze`, key: validDemoKey.token });
          assert.equal(r.status, 200);
        }
        for (let i = 0; i < 25; i++) {
          const r = await send({
            port,
            path: `${surface.mount}/datasets/upload`,
            key: validDemoKey.token,
          });
          assert.equal(r.status, 200);
        }
        const overflow = await send({
          port,
          path: `${surface.mount}/datasets/upload`,
          key: validDemoKey.token,
        });
        assert.equal(overflow.status, 429);
        assert.equal(overflow.body.code, "DEMO_KEY_QUOTA_EXCEEDED");
      } finally {
        await new Promise((r) => server.close(r));
      }
    });
  }
});
