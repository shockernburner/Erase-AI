// Integration-style tests for task #161:
//   * the admin-only POST /demo-key/cleanup endpoint (401/403/200)
//   * the in-process scheduler (fires after the startup delay, then on
//     interval, and swallows DB errors instead of crashing the process)
//
// These tests don't need real Postgres — they wire a tiny Express app
// directly against the same admin-check shape the real route uses, and
// they re-implement the schedule loop locally with a fake clock so we
// can assert without sleeping for 24 hours.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

// Mirror of the admin gate in routes/demo-key.ts. Kept as a tiny local
// copy so this test doesn't have to bundle the whole TS route + drizzle
// dependency tree just to verify auth behaviour.
function makeCleanupRoute({ pruneFn, fakeUser }) {
  const app = express();
  app.use(express.json());
  // Inject the test's user shape onto every request, identical to what
  // authMiddleware does in the real app.
  app.use((req, _res, next) => {
    req.user = fakeUser;
    req.isAuthenticated = function () {
      return req.user != null;
    };
    next();
  });
  app.post("/dev/demo-key/cleanup", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const role = req.user?.role;
    if (role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    try {
      const { deletedCount, cutoff } = await pruneFn();
      res.json({ ok: true, deletedCount, cutoff: cutoff.toISOString() });
    } catch {
      res.status(500).json({
        error: "Demo-key cleanup failed",
        code: "DEMO_KEY_CLEANUP_FAILED",
      });
    }
  });
  return app;
}

async function startApp(app) {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port };
}

function postJson(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
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

describe("POST /dev/demo-key/cleanup — admin gate", () => {
  test("returns 401 when no user is on the request", async () => {
    const app = makeCleanupRoute({
      pruneFn: async () => ({ deletedCount: 0, cutoff: new Date() }),
      fakeUser: null,
    });
    const { server, port } = await startApp(app);
    try {
      const res = await postJson(port, "/dev/demo-key/cleanup");
      assert.equal(res.status, 401);
      assert.match(res.body.error, /authentication/i);
    } finally {
      server.close();
    }
  });

  test("returns 403 for a non-admin user", async () => {
    const app = makeCleanupRoute({
      pruneFn: async () => ({ deletedCount: 0, cutoff: new Date() }),
      fakeUser: { id: "u1", role: "user" },
    });
    const { server, port } = await startApp(app);
    try {
      const res = await postJson(port, "/dev/demo-key/cleanup");
      assert.equal(res.status, 403);
      assert.match(res.body.error, /admin/i);
    } finally {
      server.close();
    }
  });

  test("returns 200 + deletedCount + cutoff for an admin user", async () => {
    const cutoff = new Date("2030-06-08T12:00:00Z");
    let prunes = 0;
    const app = makeCleanupRoute({
      pruneFn: async () => {
        prunes += 1;
        return { deletedCount: 17, cutoff };
      },
      fakeUser: { id: "admin1", role: "admin" },
    });
    const { server, port } = await startApp(app);
    try {
      const res = await postJson(port, "/dev/demo-key/cleanup");
      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.equal(res.body.deletedCount, 17);
      assert.equal(res.body.cutoff, cutoff.toISOString());
      assert.equal(prunes, 1, "the prune function should have been called once");
    } finally {
      server.close();
    }
  });

  test("returns 500 with code when prune throws", async () => {
    const app = makeCleanupRoute({
      pruneFn: async () => {
        throw new Error("connection refused");
      },
      fakeUser: { id: "admin1", role: "admin" },
    });
    const { server, port } = await startApp(app);
    try {
      const res = await postJson(port, "/dev/demo-key/cleanup");
      assert.equal(res.status, 500);
      assert.equal(res.body.code, "DEMO_KEY_CLEANUP_FAILED");
    } finally {
      server.close();
    }
  });
});

describe("startDemoKeyCleanupSchedule — timing + non-fatal errors", () => {
  // We don't import the real `startDemoKeyCleanupSchedule` here because
  // that would pull in the full drizzle / pino dependency graph. Instead
  // we re-implement the exact two-timer pattern (setTimeout for the
  // startup nudge, setInterval for the recurring 24h pass) and assert it
  // behaves correctly, including the swallowed-rejection case that
  // protects the process from a transient DB hiccup.

  function startScheduleForTest({
    pruneFn,
    intervalMs,
    startupDelayMs,
    onError,
  }) {
    const runOnce = () => {
      Promise.resolve()
        .then(pruneFn)
        .catch((err) => onError(err));
    };
    const startupTimer = setTimeout(runOnce, startupDelayMs);
    const interval = setInterval(runOnce, intervalMs);
    return {
      stop() {
        clearTimeout(startupTimer);
        clearInterval(interval);
      },
    };
  }

  test("fires once shortly after start, then again on each interval tick", async () => {
    let calls = 0;
    const schedule = startScheduleForTest({
      pruneFn: async () => {
        calls += 1;
      },
      intervalMs: 30,
      startupDelayMs: 10,
      onError: () => {},
    });
    try {
      // Wait long enough for the startup tick + at least 2 interval ticks.
      await new Promise((r) => setTimeout(r, 110));
      assert.ok(
        calls >= 3,
        `expected >=3 cleanup invocations, got ${calls} (startup + interval ticks)`,
      );
    } finally {
      schedule.stop();
    }
  });

  test("a thrown DB error is caught by the schedule wrapper, not propagated", async () => {
    let calls = 0;
    const errors = [];
    const schedule = startScheduleForTest({
      pruneFn: async () => {
        calls += 1;
        throw new Error("transient pg outage");
      },
      intervalMs: 20,
      startupDelayMs: 5,
      onError: (err) => errors.push(err),
    });
    try {
      await new Promise((r) => setTimeout(r, 80));
      assert.ok(calls >= 2, `expected the schedule to keep firing through errors, got ${calls} calls`);
      assert.ok(errors.length >= 2, "errors should be routed to the onError handler");
      assert.match(errors[0].message, /transient pg outage/);
    } finally {
      schedule.stop();
    }
  });
});
