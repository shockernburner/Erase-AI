// Tests for the public-visitor demo API key endpoint (task #158):
// happy-path mint, per-IP 24h rate limit, and row-shape assertions.
// Uses the pure JS handler factory with in-memory mocks so we don't
// need Postgres.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import {
  createDemoKeyHandler,
  createDemoKeyStatusHandler,
  DEMO_USER_ID,
  DEMO_KEY_TTL_MS,
  DEMO_KEY_REQUEST_QUOTA,
  DEMO_KEY_MINT_WINDOW_MS,
} from "../src/routes/demo-key-source.mjs";

function makeFakeStore() {
  const rows = [];
  return {
    rows,
    async findRecentMintCreatedAt({ ipHash, since }) {
      const matching = rows
        .filter((r) => r.ipHash === ipHash && r.createdAt >= since)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return matching.length > 0 ? matching[0].createdAt : null;
    },
    async insertApiKey(row) {
      rows.push({ ...row, createdAt: new Date() });
    },
  };
}

let nextKeySerial = 0;
function fakeGenerateApiKey() {
  nextKeySerial += 1;
  const raw = `eak_${nextKeySerial.toString().padStart(64, "0")}`;
  return { raw, hash: `hash-${nextKeySerial}`, prefix: raw.slice(0, 8) };
}

function fakeHashIp(ip) {
  return `iphash-${ip.replace(/[^0-9a-z]/gi, "_")}`.slice(0, 32);
}

async function startApp({ handler }) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.post("/dev/demo-key", handler);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

function send({ port, ip = "203.0.113.7" }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${port}/dev/demo-key`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // trust proxy=1 makes Express read X-Forwarded-For for req.ip,
          // which lets these tests vary the IP without binding to one.
          "X-Forwarded-For": ip,
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: chunks ? JSON.parse(chunks) : null,
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("POST /dev/demo-key — happy path", () => {
  test("anonymous mint returns an eak_ key, 24h expiresAt, 50-request quota, and curl example", async () => {
    const store = makeFakeStore();
    const handler = createDemoKeyHandler({
      ...store,
      generateApiKey: fakeGenerateApiKey,
      hashIp: fakeHashIp,
      now: () => new Date("2030-06-01T12:00:00Z").getTime(),
    });
    const { server, port } = await startApp({ handler });
    try {
      const res = await send({ port, ip: "198.51.100.10" });
      assert.equal(res.status, 200);
      assert.match(res.body.key, /^eak_[0-9a-f]+$/i);
      assert.equal(res.body.quota, DEMO_KEY_REQUEST_QUOTA);
      assert.equal(res.body.quota, 50, "quota constant must be 50");
      assert.equal(res.body.quotaRemaining, DEMO_KEY_REQUEST_QUOTA);
      assert.equal(
        new Date(res.body.expiresAt).getTime() -
          new Date("2030-06-01T12:00:00Z").getTime(),
        DEMO_KEY_TTL_MS,
        "expiresAt must be exactly 24h after now",
      );
      assert.ok(
        res.body.curlExample.includes(`Bearer ${res.body.key}`),
        "curl example must embed the issued key",
      );
      assert.ok(
        res.body.curlExample.includes("/api/v1/datasets/upload"),
        "curl example should target the upload endpoint",
      );
    } finally {
      server.close();
    }
  });

  test("the inserted api_keys row is bound to the shared demo user with the right limits", async () => {
    const store = makeFakeStore();
    const handler = createDemoKeyHandler({
      ...store,
      generateApiKey: fakeGenerateApiKey,
      hashIp: fakeHashIp,
    });
    const { server, port } = await startApp({ handler });
    try {
      await send({ port, ip: "198.51.100.20" });
      assert.equal(store.rows.length, 1);
      const row = store.rows[0];
      assert.equal(row.userId, DEMO_USER_ID);
      assert.equal(row.requestQuota, DEMO_KEY_REQUEST_QUOTA);
      assert.ok(row.expiresAt instanceof Date, "expiresAt is a Date");
      assert.ok(
        row.expiresAt.getTime() > Date.now(),
        "expiresAt is in the future",
      );
      assert.equal(row.ipHash, fakeHashIp("198.51.100.20"));
      assert.match(row.keyPrefix, /^eak_/);
      assert.match(row.name, /^demo-/);
    } finally {
      server.close();
    }
  });
});

describe("POST /dev/demo-key — per-IP rate limit (1/24h)", () => {
  test("a second mint from the same IP within 24h is rejected with 429 + Retry-After + retryAt", async () => {
    const store = makeFakeStore();
    // Pin the clock so the 24h boundary is deterministic.
    let nowMs = new Date("2030-06-01T12:00:00Z").getTime();
    const handler = createDemoKeyHandler({
      ...store,
      generateApiKey: fakeGenerateApiKey,
      hashIp: fakeHashIp,
      now: () => nowMs,
    });
    const { server, port } = await startApp({ handler });
    try {
      // First call mints successfully and seeds the store. We have to
      // stamp createdAt manually because makeFakeStore uses real `new
      // Date()` and we want it tied to our fake clock.
      const first = await send({ port, ip: "198.51.100.30" });
      assert.equal(first.status, 200);
      // Pin the seeded row's createdAt to our fake clock so the 24h
      // window calc lines up with what real Postgres would store.
      store.rows[0].createdAt = new Date(nowMs);

      // Advance 1 hour — well inside the 24h window.
      nowMs += 60 * 60 * 1000;

      const second = await send({ port, ip: "198.51.100.30" });
      assert.equal(second.status, 429);
      assert.equal(second.body.code, "DEMO_KEY_IP_RATE_LIMITED");
      assert.match(
        second.body.retryAt,
        /^\d{4}-\d{2}-\d{2}T/,
        "retryAt should be an ISO timestamp",
      );
      assert.equal(
        new Date(second.body.retryAt).getTime(),
        store.rows[0].createdAt.getTime() + DEMO_KEY_MINT_WINDOW_MS,
        "retryAt = first-mint createdAt + 24h",
      );
      const retryAfter = Number(second.headers["retry-after"]);
      assert.ok(
        retryAfter > 0 && retryAfter <= 24 * 60 * 60,
        `Retry-After should be a positive number of seconds within 24h, got ${second.headers["retry-after"]}`,
      );
      assert.equal(
        store.rows.length,
        1,
        "no second row should be inserted while rate-limited",
      );
    } finally {
      server.close();
    }
  });

  test("a different IP can still mint — the limit is per-IP, not global", async () => {
    const store = makeFakeStore();
    const handler = createDemoKeyHandler({
      ...store,
      generateApiKey: fakeGenerateApiKey,
      hashIp: fakeHashIp,
    });
    const { server, port } = await startApp({ handler });
    try {
      const a = await send({ port, ip: "198.51.100.40" });
      const b = await send({ port, ip: "198.51.100.41" });
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      assert.notEqual(a.body.key, b.body.key, "each IP gets its own key");
      assert.equal(store.rows.length, 2);
    } finally {
      server.close();
    }
  });

  test("after the 24h window elapses the same IP can mint again", async () => {
    const store = makeFakeStore();
    let nowMs = new Date("2030-06-01T12:00:00Z").getTime();
    const handler = createDemoKeyHandler({
      ...store,
      generateApiKey: fakeGenerateApiKey,
      hashIp: fakeHashIp,
      now: () => nowMs,
    });
    const { server, port } = await startApp({ handler });
    try {
      const first = await send({ port, ip: "198.51.100.50" });
      assert.equal(first.status, 200);
      store.rows[0].createdAt = new Date(nowMs);

      // Advance just past 24h.
      nowMs += DEMO_KEY_MINT_WINDOW_MS + 1000;

      const second = await send({ port, ip: "198.51.100.50" });
      assert.equal(second.status, 200, "should be allowed once window elapses");
      assert.notEqual(first.body.key, second.body.key);
    } finally {
      server.close();
    }
  });
});

// Task #160 — non-mutating live status read for a demo key.
async function startStatusApp({ handler }) {
  const app = express();
  app.set("trust proxy", 1);
  app.get("/dev/demo-key/status", handler);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

function getStatus({ port, authorization }) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (authorization !== undefined) headers["Authorization"] = authorization;
    const req = http.request(
      `http://127.0.0.1:${port}/dev/demo-key/status`,
      { method: "GET", headers },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: chunks ? JSON.parse(chunks) : null,
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function fakeHashApiKey(token) {
  // Same shape the real hashApiKey produces; tests only need a stable map.
  return `sha-${token}`;
}

const VALID_DEMO_TOKEN = "eak_" + "a".repeat(64);

describe("GET /dev/demo-key/status — happy path", () => {
  test("returns live quotaRemaining and DEMO_KEY_OK without consuming quota", async () => {
    const apiKeyRow = {
      id: "key-1",
      revokedAt: null,
      expiresAt: new Date("2030-06-02T12:00:00Z"),
      requestQuota: DEMO_KEY_REQUEST_QUOTA,
    };
    let usedCount = 7;
    let countCalls = 0;
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash(keyHash) {
        return keyHash === fakeHashApiKey(VALID_DEMO_TOKEN) ? apiKeyRow : null;
      },
      async countUsage(id) {
        countCalls += 1;
        assert.equal(id, "key-1");
        return usedCount;
      },
      now: () => new Date("2030-06-01T12:00:00Z").getTime(),
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port, authorization: `Bearer ${VALID_DEMO_TOKEN}` });
      assert.equal(res.status, 200);
      assert.equal(res.body.code, "DEMO_KEY_OK");
      assert.equal(res.body.quota, DEMO_KEY_REQUEST_QUOTA);
      assert.equal(res.body.used, 7);
      assert.equal(res.body.quotaRemaining, DEMO_KEY_REQUEST_QUOTA - 7);
      assert.equal(res.body.expired, false);
      assert.equal(res.body.exhausted, false);
      assert.equal(res.body.expiresAt, "2030-06-02T12:00:00.000Z");
      assert.equal(countCalls, 1, "countUsage is read but never written from status");
    } finally {
      server.close();
    }
  });
});

describe("GET /dev/demo-key/status — exhausted / expired", () => {
  test("flags DEMO_KEY_QUOTA_EXCEEDED when used >= quota", async () => {
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash() {
        return {
          id: "key-2",
          revokedAt: null,
          expiresAt: new Date("2030-06-02T12:00:00Z"),
          requestQuota: DEMO_KEY_REQUEST_QUOTA,
        };
      },
      async countUsage() {
        return DEMO_KEY_REQUEST_QUOTA;
      },
      now: () => new Date("2030-06-01T12:00:00Z").getTime(),
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port, authorization: `Bearer ${VALID_DEMO_TOKEN}` });
      assert.equal(res.status, 200);
      assert.equal(res.body.code, "DEMO_KEY_QUOTA_EXCEEDED");
      assert.equal(res.body.exhausted, true);
      assert.equal(res.body.expired, false);
      assert.equal(res.body.quotaRemaining, 0);
    } finally {
      server.close();
    }
  });

  test("flags DEMO_KEY_EXPIRED once expiresAt is in the past, even with quota left", async () => {
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash() {
        return {
          id: "key-3",
          revokedAt: null,
          expiresAt: new Date("2030-06-01T11:00:00Z"),
          requestQuota: DEMO_KEY_REQUEST_QUOTA,
        };
      },
      async countUsage() {
        return 3;
      },
      now: () => new Date("2030-06-01T12:00:00Z").getTime(),
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port, authorization: `Bearer ${VALID_DEMO_TOKEN}` });
      assert.equal(res.status, 200);
      assert.equal(res.body.code, "DEMO_KEY_EXPIRED");
      assert.equal(res.body.expired, true);
      assert.equal(res.body.exhausted, false, "expired wins over exhausted");
    } finally {
      server.close();
    }
  });
});

describe("GET /dev/demo-key/status — auth + shape errors", () => {
  test("missing Authorization → 401 AUTH_REQUIRED", async () => {
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash() { return null; },
      async countUsage() { return 0; },
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, "AUTH_REQUIRED");
    } finally {
      server.close();
    }
  });

  test("malformed bearer (not eak_…) → 401 AUTH_INVALID_FORMAT", async () => {
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash() { return null; },
      async countUsage() { return 0; },
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port, authorization: "Bearer not-a-key" });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, "AUTH_INVALID_FORMAT");
    } finally {
      server.close();
    }
  });

  test("unknown hash → 401 AUTH_INVALID_KEY", async () => {
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash() { return null; },
      async countUsage() { return 0; },
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port, authorization: `Bearer ${VALID_DEMO_TOKEN}` });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, "AUTH_INVALID_KEY");
    } finally {
      server.close();
    }
  });

  test("revoked key → 401 AUTH_REVOKED_KEY", async () => {
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash() {
        return {
          id: "key-r",
          revokedAt: new Date("2030-05-31T10:00:00Z"),
          expiresAt: new Date("2030-06-02T12:00:00Z"),
          requestQuota: DEMO_KEY_REQUEST_QUOTA,
        };
      },
      async countUsage() { return 0; },
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port, authorization: `Bearer ${VALID_DEMO_TOKEN}` });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, "AUTH_REVOKED_KEY");
    } finally {
      server.close();
    }
  });

  test("real (non-demo) key with no requestQuota → 400 NOT_A_DEMO_KEY", async () => {
    const handler = createDemoKeyStatusHandler({
      hashApiKey: fakeHashApiKey,
      async findApiKeyByHash() {
        return {
          id: "key-real",
          revokedAt: null,
          expiresAt: null,
          requestQuota: null,
        };
      },
      async countUsage() { return 0; },
    });
    const { server, port } = await startStatusApp({ handler });
    try {
      const res = await getStatus({ port, authorization: `Bearer ${VALID_DEMO_TOKEN}` });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "NOT_A_DEMO_KEY");
    } finally {
      server.close();
    }
  });
});
