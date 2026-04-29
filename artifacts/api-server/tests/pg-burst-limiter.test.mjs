// Tests for the Postgres-backed burst limiter (task #131).
//
// The contract is the same as the in-memory `BurstLimiter` covered in
// `burst-limiter.test.mjs` — the whole point is that we can swap backends
// behind the same `{ hit, reset }` shape. These tests prove the Postgres
// implementation honours that contract AND adds the property that
// motivated the migration: counters survive being thrown away (a fresh
// limiter instance reads the same bucket out of the shared table, which
// is what "survives a restart" and "shared across multiple instances"
// means in practice).
//
// We use the live DATABASE_URL the api-server tests are already wired to.
// Each test scopes its rows under a unique `scope` so concurrent tests
// (and re-runs) don't stomp on each other.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { PostgresBurstLimiter } from "../src/lib/security/pg-burst-limiter.mjs";
import {
  createApiKeyBurstMiddleware,
  createIpBurstMiddleware,
} from "../src/lib/security/burst-limiter.mjs";

// We construct our own Drizzle instance from DATABASE_URL rather than
// importing `@workspace/db`, because that module pulls in a `./schema`
// directory import that raw Node ESM can't resolve at test time (the
// running api-server gets it via esbuild bundling). The PostgresBurstLimiter
// only needs a `db.execute(sql\`...\`)` shape, which the bare drizzle
// instance provides.
const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for pg-burst-limiter tests");
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

function fakeClock(start = new Date("2030-01-01T00:00:00Z").getTime()) {
  const state = { now: start };
  return {
    now: () => new Date(state.now),
    nowMs: () => state.now,
    advance: (ms) => {
      state.now += ms;
    },
  };
}

function mockRes() {
  const r = { headers: {}, statusCode: 200, body: undefined, ended: false };
  r.setHeader = (k, v) => {
    r.headers[k.toLowerCase()] = String(v);
  };
  r.status = (code) => {
    r.statusCode = code;
    return r;
  };
  r.json = (body) => {
    r.body = body;
    r.ended = true;
    return r;
  };
  r.end = () => {
    r.ended = true;
    return r;
  };
  return r;
}

// Each test gets a unique scope so the rows it writes can't collide with
// other tests or other runs of the same test. The scope column is
// VARCHAR(32) — short on purpose, since real scopes are categorical
// ("api-key", "ip"). We keep the prefix short and the suffix terse.
function uniqueScope(prefix) {
  // 5 chars rand + counter keeps us well under 32.
  uniqueScope.counter = (uniqueScope.counter || 0) + 1;
  const rand = Math.random().toString(36).slice(2, 7);
  const scope = `t-${prefix}-${rand}${uniqueScope.counter}`;
  if (scope.length > 32) {
    throw new Error(`uniqueScope ${scope} too long for VARCHAR(32)`);
  }
  return scope;
}

async function ensureTable() {
  // The api-server's startup migration creates this table, but tests
  // don't boot the app — create it inline so this file can run on a
  // fresh DB. Mirrors `ensureBurstLimitHitsTable()` in src/migrations.ts.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS burst_limit_hits (
      id BIGSERIAL PRIMARY KEY,
      scope VARCHAR(32) NOT NULL,
      bucket_key VARCHAR(128) NOT NULL,
      hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_burst_limit_hits_lookup
      ON burst_limit_hits(scope, bucket_key, hit_at)
  `);
}

before(async () => {
  await ensureTable();
});

describe("PostgresBurstLimiter — sliding window over the burst_limit_hits table", () => {
  test("allows up to maxHits in the window, then blocks the next", async () => {
    const scope = uniqueScope("atb");
    const clock = fakeClock();
    const lim = new PostgresBurstLimiter({
      db,
      windowMs: 60_000,
      maxHits: 3,
      scope,
      now: clock.now,
    });
    try {
      assert.equal((await lim.hit("k")).allowed, true);
      assert.equal((await lim.hit("k")).allowed, true);
      assert.equal((await lim.hit("k")).allowed, true);
      const blocked = await lim.hit("k");
      assert.equal(blocked.allowed, false);
      assert.ok(blocked.retryAfterMs > 0, "retryAfterMs must be positive when blocked");
      assert.ok(blocked.retryAfterMs <= 60_000);
    } finally {
      await lim.reset();
    }
  });

  test("retryAfterMs counts down as the window slides", async () => {
    const scope = uniqueScope("cdn");
    const clock = fakeClock();
    const lim = new PostgresBurstLimiter({
      db,
      windowMs: 60_000,
      maxHits: 1,
      scope,
      now: clock.now,
    });
    try {
      await lim.hit("k");
      const r1 = await lim.hit("k");
      assert.equal(r1.allowed, false);
      assert.equal(r1.retryAfterMs, 60_000, "exactly one window away from oldest hit");
      clock.advance(20_000);
      const r2 = await lim.hit("k");
      assert.equal(r2.allowed, false);
      assert.equal(r2.retryAfterMs, 40_000, "20s later, 40s remain");
    } finally {
      await lim.reset();
    }
  });

  test("once the oldest hit ages out, the next request is allowed again", async () => {
    const scope = uniqueScope("age");
    const clock = fakeClock();
    const lim = new PostgresBurstLimiter({
      db,
      windowMs: 60_000,
      maxHits: 2,
      scope,
      now: clock.now,
    });
    try {
      await lim.hit("k");
      clock.advance(10_000);
      await lim.hit("k");
      const blocked = await lim.hit("k");
      assert.equal(blocked.allowed, false);
      clock.advance(50_001);
      const ok = await lim.hit("k");
      assert.equal(ok.allowed, true);
    } finally {
      await lim.reset();
    }
  });

  test("buckets are isolated per key (one user's burst doesn't punish another)", async () => {
    const scope = uniqueScope("iso");
    const clock = fakeClock();
    const lim = new PostgresBurstLimiter({
      db,
      windowMs: 60_000,
      maxHits: 2,
      scope,
      now: clock.now,
    });
    try {
      await lim.hit("alice");
      await lim.hit("alice");
      assert.equal((await lim.hit("alice")).allowed, false);
      assert.equal(
        (await lim.hit("bob")).allowed,
        true,
        "bob is not affected by alice's overage",
      );
    } finally {
      await lim.reset();
    }
  });

  test("buckets are isolated per scope (api-key vs ip don't share counters)", async () => {
    const scopeA = uniqueScope("sca");
    const scopeB = uniqueScope("scb");
    const clock = fakeClock();
    const limA = new PostgresBurstLimiter({
      db, windowMs: 60_000, maxHits: 1, scope: scopeA, now: clock.now,
    });
    const limB = new PostgresBurstLimiter({
      db, windowMs: 60_000, maxHits: 1, scope: scopeB, now: clock.now,
    });
    try {
      assert.equal((await limA.hit("same-key")).allowed, true);
      assert.equal((await limA.hit("same-key")).allowed, false, "scope A is now full");
      assert.equal(
        (await limB.hit("same-key")).allowed,
        true,
        "scope B has its own bucket — different limiter, different scope",
      );
    } finally {
      await limA.reset();
      await limB.reset();
    }
  });

  test("reset() clears state — for a single key or globally within scope", async () => {
    const scope = uniqueScope("rst");
    const clock = fakeClock();
    const lim = new PostgresBurstLimiter({
      db, windowMs: 60_000, maxHits: 1, scope, now: clock.now,
    });
    try {
      await lim.hit("k");
      assert.equal((await lim.hit("k")).allowed, false);
      await lim.reset("k");
      assert.equal((await lim.hit("k")).allowed, true, "reset(key) drained that key");
      await lim.hit("a");
      await lim.hit("b");
      await lim.reset();
      assert.equal(await lim.size(), 0, "reset() with no key drained the whole scope");
    } finally {
      await lim.reset();
    }
  });

  test("constructor rejects bad inputs (defensive)", () => {
    assert.throws(() => new PostgresBurstLimiter({ db, windowMs: 0, maxHits: 1, scope: "x" }));
    assert.throws(() => new PostgresBurstLimiter({ db, windowMs: 60_000, maxHits: 0, scope: "x" }));
    assert.throws(() => new PostgresBurstLimiter({ db, windowMs: -1, maxHits: 1, scope: "x" }));
    assert.throws(() => new PostgresBurstLimiter({ db, windowMs: 60_000, maxHits: 1, scope: "" }));
    assert.throws(() => new PostgresBurstLimiter({ windowMs: 60_000, maxHits: 1, scope: "x" }));
  });
});

describe("PostgresBurstLimiter — durability properties", () => {
  test("a fresh limiter instance reads the same bucket — survives a restart / shared between instances", async () => {
    // This is THE property task #131 added. With the in-memory limiter,
    // a new BurstLimiter() starts with empty Maps — leaked key gets a
    // free 60-req budget. With the Postgres backend, the second
    // instance must see the first instance's hits, because the bucket
    // lives in the shared table. We model both "restart" and "two
    // api-server instances behind the load balancer" as: construct a
    // second limiter against the same scope and confirm it picks up
    // mid-window.
    const scope = uniqueScope("dur");
    const clock = fakeClock();
    const instanceA = new PostgresBurstLimiter({
      db, windowMs: 60_000, maxHits: 2, scope, now: clock.now,
    });
    try {
      assert.equal((await instanceA.hit("leaked-key")).allowed, true);
      assert.equal((await instanceA.hit("leaked-key")).allowed, true);

      // Simulate either:
      //  (a) the api-server process restarting (instanceA goes away,
      //      a new process constructs instanceB), OR
      //  (b) a second api-server instance handling the next request.
      const instanceB = new PostgresBurstLimiter({
        db, windowMs: 60_000, maxHits: 2, scope, now: clock.now,
      });

      const r = await instanceB.hit("leaked-key");
      assert.equal(
        r.allowed,
        false,
        "instance B must see instance A's hits — that's the whole point of moving counters to Postgres",
      );
      assert.ok(r.retryAfterMs > 0);
    } finally {
      await instanceA.reset();
    }
  });
});

describe("createApiKeyBurstMiddleware — wired to PostgresBurstLimiter (async path)", () => {
  test("middleware awaits async limiter and returns 429 after maxHits", async () => {
    const scope = uniqueScope("mwa");
    const clock = fakeClock();
    const limiter = new PostgresBurstLimiter({
      db, windowMs: 60_000, maxHits: 2, scope, now: clock.now,
    });
    const mw = createApiKeyBurstMiddleware({ maxHits: 2, limiter });
    try {
      const req = { apiKeyId: "key-abc" };

      // The factory in burst-limiter.mjs detects an async limiter and
      // routes through .then(); we have to wait for the next-tick before
      // the middleware has actually called next() / sent the response.
      // We wrap the whole call in a promise that resolves when the
      // middleware completes.
      function run() {
        return new Promise((resolve) => {
          const res = mockRes();
          let resolved = false;
          // Override the two terminal points so we can resolve in
          // either branch (next() = pass, res.end() = blocked).
          const next = () => {
            if (!resolved) { resolved = true; resolve({ res, passed: true }); }
          };
          const realJson = res.json.bind(res);
          res.json = (body) => {
            const out = realJson(body);
            if (!resolved) { resolved = true; resolve({ res, passed: false }); }
            return out;
          };
          mw(req, res, next);
        });
      }

      const r1 = await run();
      assert.equal(r1.passed, true);
      const r2 = await run();
      assert.equal(r2.passed, true);
      const r3 = await run();
      assert.equal(r3.passed, false, "third call must be blocked once Postgres-backed bucket is full");
      assert.equal(r3.res.statusCode, 429);
      assert.equal(r3.res.body.code, "BURST_LIMIT_EXCEEDED");
      assert.ok(r3.res.headers["retry-after"], "Retry-After header is required by RFC 6585");
    } finally {
      await limiter.reset();
    }
  });

  test("middleware returns 503 + Retry-After (not 500, not free pass) when the limiter backend errors", async () => {
    // The fail-closed property: a transient Postgres outage must not
    // quietly admit unlimited traffic. The middleware should respond
    // with an explicit 503 + Retry-After so well-behaved clients back
    // off, instead of letting Express's default error handler convert
    // the rejection into a generic 500 with no retry hint.
    const broken = {
      windowMs: 60_000,
      maxHits: 60,
      hit() { return Promise.reject(new Error("simulated DB outage")); },
      async reset() {},
    };
    const mw = createApiKeyBurstMiddleware({ maxHits: 60, limiter: broken });
    const result = await new Promise((resolve) => {
      const res = mockRes();
      const realJson = res.json.bind(res);
      res.json = (body) => {
        const out = realJson(body);
        resolve({ res, passed: false });
        return out;
      };
      const next = () => resolve({ res, passed: true });
      mw({ apiKeyId: "any" }, res, next);
    });
    assert.equal(result.passed, false, "must NOT pass the request through on backend error");
    assert.equal(result.res.statusCode, 503);
    assert.equal(result.res.body.code, "RATE_LIMIT_BACKEND_UNAVAILABLE");
    assert.ok(result.res.headers["retry-after"], "Retry-After header tells clients to back off");
  });

  test("middleware passes through when there is no req.apiKeyId (does NOT touch the DB)", async () => {
    // If the caller has no API key (session-only dashboard caller), the
    // middleware should next() immediately. We confirm by passing a
    // limiter whose hit() throws — it should never be called.
    const exploding = {
      windowMs: 60_000,
      maxHits: 60,
      hit() { throw new Error("hit() should not be called for session callers"); },
      async reset() {},
    };
    const mw = createApiKeyBurstMiddleware({ maxHits: 60, limiter: exploding });
    let called = 0;
    mw({ apiKeyId: undefined }, mockRes(), () => { called++; });
    assert.equal(called, 1);
  });
});

describe("createIpBurstMiddleware — wired to PostgresBurstLimiter (async path)", () => {
  test("limits per IP, returns 429 + Retry-After once Postgres-backed bucket is full", async () => {
    const scope = uniqueScope("mwi");
    const clock = fakeClock();
    const limiter = new PostgresBurstLimiter({
      db, windowMs: 60_000, maxHits: 1, scope, now: clock.now,
    });
    const mw = createIpBurstMiddleware({ maxHits: 1, limiter });
    try {
      function run(ip) {
        return new Promise((resolve) => {
          const res = mockRes();
          let resolved = false;
          const next = () => {
            if (!resolved) { resolved = true; resolve({ res, passed: true }); }
          };
          const realJson = res.json.bind(res);
          res.json = (body) => {
            const out = realJson(body);
            if (!resolved) { resolved = true; resolve({ res, passed: false }); }
            return out;
          };
          mw({ ip, socket: {} }, res, next);
        });
      }

      const r1 = await run("9.9.9.9");
      assert.equal(r1.passed, true);
      const r2 = await run("9.9.9.9");
      assert.equal(r2.passed, false, "second hit from same IP is blocked");
      assert.equal(r2.res.statusCode, 429);
      assert.equal(r2.res.body.code, "IP_BURST_LIMIT_EXCEEDED");
      const r3 = await run("8.8.8.8");
      assert.equal(r3.passed, true, "different IP gets its own bucket");
    } finally {
      await limiter.reset();
    }
  });
});

after(async () => {
  // Best-effort cleanup of any rows left behind by aborted runs, scoped
  // to keys this file uses (the unique-scope prefixes start with these
  // labels). Won't touch other rows.
  try {
    await db.execute(sql`DELETE FROM burst_limit_hits WHERE scope LIKE 't-%'`);
  } catch {
    // ignore — table may not exist on a totally fresh DB, and the next
    // run's `before()` will recreate it.
  }
  await pool.end();
});
