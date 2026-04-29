// Tests for the per-minute burst limiter introduced in task #130.
//
// The limiter is the brake that prevents a leaked Pro/Business API key (or
// an unauthenticated attacker hammering /dev/ping) from running an
// infinite loop against our infra. It's an in-memory sliding-window
// counter — the class is pure and clock-injectable, so we can step time
// forwards in tests without sleeping.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  BurstLimiter,
  hashIp,
  createApiKeyBurstMiddleware,
  createIpBurstMiddleware,
} from "../src/lib/security/burst-limiter.mjs";

function fakeClock(start = 1_700_000_000_000) {
  const state = { now: start };
  return {
    now: () => state.now,
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

function mockNext() {
  let count = 0;
  const fn = () => {
    count++;
  };
  fn.calls = () => count;
  return fn;
}

describe("BurstLimiter — sliding window", () => {
  test("allows up to maxHits in the window, then blocks the next", () => {
    const clock = fakeClock();
    const lim = new BurstLimiter({ windowMs: 60_000, maxHits: 3, now: clock.now });
    assert.equal(lim.hit("k").allowed, true);
    assert.equal(lim.hit("k").allowed, true);
    assert.equal(lim.hit("k").allowed, true);
    const blocked = lim.hit("k");
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterMs > 0, "retryAfterMs must be positive when blocked");
    assert.ok(blocked.retryAfterMs <= 60_000);
  });

  test("retryAfterMs counts down as the window slides", () => {
    const clock = fakeClock();
    const lim = new BurstLimiter({ windowMs: 60_000, maxHits: 1, now: clock.now });
    lim.hit("k");
    const r1 = lim.hit("k");
    assert.equal(r1.allowed, false);
    assert.equal(r1.retryAfterMs, 60_000, "exactly one window away from oldest hit");
    clock.advance(20_000);
    const r2 = lim.hit("k");
    assert.equal(r2.allowed, false);
    assert.equal(r2.retryAfterMs, 40_000, "20s later, 40s remain");
  });

  test("once the oldest hit ages out, the next request is allowed again", () => {
    const clock = fakeClock();
    const lim = new BurstLimiter({ windowMs: 60_000, maxHits: 2, now: clock.now });
    lim.hit("k");
    clock.advance(10_000);
    lim.hit("k");
    const blocked = lim.hit("k");
    assert.equal(blocked.allowed, false);
    // Advance past the oldest hit's window — the bucket should drain
    // enough to admit one more request.
    clock.advance(50_001);
    const ok = lim.hit("k");
    assert.equal(ok.allowed, true);
  });

  test("buckets are isolated per key (one user's burst doesn't punish another)", () => {
    const clock = fakeClock();
    const lim = new BurstLimiter({ windowMs: 60_000, maxHits: 2, now: clock.now });
    lim.hit("alice");
    lim.hit("alice");
    assert.equal(lim.hit("alice").allowed, false);
    assert.equal(lim.hit("bob").allowed, true, "bob is not affected by alice's overage");
  });

  test("reset() clears state — for a single key or globally", () => {
    const clock = fakeClock();
    const lim = new BurstLimiter({ windowMs: 60_000, maxHits: 1, now: clock.now });
    lim.hit("k");
    assert.equal(lim.hit("k").allowed, false);
    lim.reset("k");
    assert.equal(lim.hit("k").allowed, true);
    lim.hit("a");
    lim.hit("b");
    lim.reset();
    assert.equal(lim.size(), 0);
  });

  test("constructor rejects bad inputs (defensive)", () => {
    assert.throws(() => new BurstLimiter({ windowMs: 0, maxHits: 1 }));
    assert.throws(() => new BurstLimiter({ windowMs: 60_000, maxHits: 0 }));
    assert.throws(() => new BurstLimiter({ windowMs: -1, maxHits: 1 }));
  });
});

describe("hashIp", () => {
  test("returns a stable 16-char hex digest (privacy-preserving — no raw IPs in memory)", () => {
    const a = hashIp("1.2.3.4");
    const b = hashIp("1.2.3.4");
    const c = hashIp("4.3.2.1");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a, /^[0-9a-f]{16}$/);
  });
});

describe("createApiKeyBurstMiddleware", () => {
  test("passes through when there is no req.apiKeyId (session-only callers)", () => {
    const mw = createApiKeyBurstMiddleware({ maxHits: 1 });
    const req = { apiKeyId: undefined };
    const res = mockRes();
    const next = mockNext();
    mw(req, res, next);
    mw(req, res, next);
    mw(req, res, next);
    assert.equal(next.calls(), 3, "session callers must not be rate-limited by this middleware");
    assert.equal(res.ended, false);
  });

  test("returns 429 + Retry-After header after maxHits, mentions the limit in the body", () => {
    const clock = fakeClock();
    const limiter = new BurstLimiter({ windowMs: 60_000, maxHits: 2, now: clock.now });
    const mw = createApiKeyBurstMiddleware({ maxHits: 2, limiter });

    const req = { apiKeyId: "key-123" };
    let next = mockNext();
    mw(req, mockRes(), next);
    mw(req, mockRes(), next);
    assert.equal(next.calls(), 2);

    const blockedRes = mockRes();
    next = mockNext();
    mw(req, blockedRes, next);
    assert.equal(next.calls(), 0, "third call must be blocked, not forwarded");
    assert.equal(blockedRes.statusCode, 429);
    assert.ok(blockedRes.headers["retry-after"], "Retry-After header is required by RFC 6585");
    assert.match(blockedRes.headers["retry-after"], /^\d+$/);
    assert.equal(blockedRes.body.code, "BURST_LIMIT_EXCEEDED");
    assert.equal(blockedRes.body.limit, 2);
    assert.match(blockedRes.body.error, /burst limit/i);
  });

  test("isolates buckets per API key", () => {
    const limiter = new BurstLimiter({ windowMs: 60_000, maxHits: 1 });
    const mw = createApiKeyBurstMiddleware({ maxHits: 1, limiter });

    const next1 = mockNext();
    mw({ apiKeyId: "k1" }, mockRes(), next1);
    mw({ apiKeyId: "k1" }, mockRes(), next1);
    assert.equal(next1.calls(), 1, "k1's second call is blocked");

    const next2 = mockNext();
    mw({ apiKeyId: "k2" }, mockRes(), next2);
    assert.equal(next2.calls(), 1, "k2's first call passes — buckets are independent");
  });
});

// Exercises the IP burst middleware under a real Express app with
// `trust proxy: 1`, to make sure the per-IP bucket actually sees per-client
// IPs in production (not the upstream-proxy IP, which would collapse
// everything to one global bucket and 429 the world after 30 pings — see
// the trust-proxy comment in app.ts for context).
describe("createIpBurstMiddleware — Express integration with trust proxy", () => {
  test("each X-Forwarded-For client gets its own bucket; limit fires per-client", async () => {
    const { default: express } = await import("express");
    const http = await import("node:http");
    const limiter = new BurstLimiter({ windowMs: 60_000, maxHits: 2 });
    const mw = createIpBurstMiddleware({ maxHits: 2, limiter });

    const app = express();
    app.set("trust proxy", 1);
    app.get("/probe", mw, (_req, res) => res.json({ ok: true }));

    const server = http.createServer(app);
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address();

    const send = (xff) =>
      new Promise((resolve, reject) => {
        const req = http.request(
          `http://127.0.0.1:${port}/probe`,
          { headers: { "X-Forwarded-For": xff } },
          (res) => {
            res.on("data", () => {});
            res.on("end", () => resolve(res.statusCode));
          },
        );
        req.on("error", reject);
        req.end();
      });

    try {
      // Client A burns its 2-hit budget.
      assert.equal(await send("203.0.113.10"), 200);
      assert.equal(await send("203.0.113.10"), 200);
      assert.equal(await send("203.0.113.10"), 429, "client A's third hit is blocked");
      // Client B is independent — must still get its own budget.
      assert.equal(
        await send("198.51.100.20"),
        200,
        "client B's bucket must be independent — proves trust proxy is honored",
      );
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});

describe("createIpBurstMiddleware", () => {
  test("limits the unauthenticated /dev/ping caller per IP, returning 429 + Retry-After", () => {
    const clock = fakeClock();
    const limiter = new BurstLimiter({ windowMs: 60_000, maxHits: 2, now: clock.now });
    const mw = createIpBurstMiddleware({ maxHits: 2, limiter });

    const reqA = { ip: "1.1.1.1", socket: {} };
    const next = mockNext();
    mw(reqA, mockRes(), next);
    mw(reqA, mockRes(), next);
    assert.equal(next.calls(), 2);

    const blocked = mockRes();
    mw(reqA, blocked, mockNext());
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.body.code, "IP_BURST_LIMIT_EXCEEDED");
    assert.ok(blocked.headers["retry-after"]);

    const reqB = { ip: "2.2.2.2", socket: {} };
    const nextB = mockNext();
    mw(reqB, mockRes(), nextB);
    assert.equal(nextB.calls(), 1, "different IP gets its own bucket");
  });

  test("falls back to socket.remoteAddress when req.ip is missing", () => {
    const limiter = new BurstLimiter({ windowMs: 60_000, maxHits: 1 });
    const mw = createIpBurstMiddleware({ maxHits: 1, limiter });

    const next = mockNext();
    mw({ socket: { remoteAddress: "10.0.0.1" } }, mockRes(), next);
    assert.equal(next.calls(), 1);
    const blocked = mockRes();
    mw({ socket: { remoteAddress: "10.0.0.1" } }, blocked, mockNext());
    assert.equal(blocked.statusCode, 429);
  });
});
