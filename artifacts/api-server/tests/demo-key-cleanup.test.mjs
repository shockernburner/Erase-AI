// Tests for the nightly demo-key cleanup (task #161). Uses the pure
// JS factory with an in-memory fake store so we don't need Postgres.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createDemoKeyCleanup,
  DEMO_USER_ID,
  DEMO_KEY_CLEANUP_GRACE_MS,
  DEMO_KEY_CLEANUP_INTERVAL_MS,
} from "../src/lib/demo-key-cleanup-source.mjs";

function makeFakeStore(initialRows = []) {
  const rows = initialRows.map((r) => ({ ...r }));
  return {
    rows,
    async deleteRows({ demoUserId, cutoff }) {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        const r = rows[i];
        if (
          r.userId === demoUserId &&
          r.expiresAt instanceof Date &&
          r.expiresAt < cutoff
        ) {
          rows.splice(i, 1);
        }
      }
      return before - rows.length;
    },
  };
}

describe("demo-key cleanup constants", () => {
  test("the 7-day grace and 24h schedule constants match the task spec", () => {
    assert.equal(
      DEMO_KEY_CLEANUP_GRACE_MS,
      7 * 24 * 60 * 60 * 1000,
      "grace should be exactly 7 days",
    );
    assert.equal(
      DEMO_KEY_CLEANUP_INTERVAL_MS,
      24 * 60 * 60 * 1000,
      "schedule should be once per 24h (nightly)",
    );
    assert.equal(DEMO_USER_ID, "system-demo-user");
  });
});

describe("createDemoKeyCleanup — guard rails", () => {
  test("only deletes rows owned by the demo user", async () => {
    const oldExpiry = new Date("2030-05-01T00:00:00Z");
    const store = makeFakeStore([
      { id: "demo-1", userId: DEMO_USER_ID, expiresAt: oldExpiry },
      { id: "user-1", userId: "real-user-42", expiresAt: oldExpiry },
      { id: "user-2", userId: "real-user-99", expiresAt: oldExpiry },
    ]);
    const prune = createDemoKeyCleanup({
      deleteRows: store.deleteRows,
      now: () => new Date("2030-06-01T00:00:00Z").getTime(),
    });
    const { deletedCount } = await prune();
    assert.equal(deletedCount, 1);
    const remainingIds = store.rows.map((r) => r.id).sort();
    assert.deepEqual(
      remainingIds,
      ["user-1", "user-2"],
      "hand-issued user keys must never be touched, even if expired",
    );
  });

  test("preserves the 7-day grace period — only deletes rows expired > 7 days ago", async () => {
    const now = new Date("2030-06-15T12:00:00Z").getTime();
    const justUnder7Days = new Date(now - (7 * 24 * 60 * 60 * 1000 - 60 * 1000));
    const exactly7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const justOver7Days = new Date(now - (7 * 24 * 60 * 60 * 1000 + 60 * 1000));
    const wayPastGrace = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const store = makeFakeStore([
      { id: "fresh", userId: DEMO_USER_ID, expiresAt: justUnder7Days },
      { id: "edge", userId: DEMO_USER_ID, expiresAt: exactly7Days },
      { id: "stale", userId: DEMO_USER_ID, expiresAt: justOver7Days },
      { id: "ancient", userId: DEMO_USER_ID, expiresAt: wayPastGrace },
    ]);

    const prune = createDemoKeyCleanup({
      deleteRows: store.deleteRows,
      now: () => now,
    });
    const { deletedCount, cutoff } = await prune();

    assert.equal(
      cutoff.getTime(),
      now - DEMO_KEY_CLEANUP_GRACE_MS,
      "cutoff = now - 7d",
    );
    assert.equal(deletedCount, 2, "stale + ancient should both be deleted");
    const remainingIds = store.rows.map((r) => r.id).sort();
    assert.deepEqual(
      remainingIds,
      ["edge", "fresh"],
      "rows expired within 7 days (or right at the boundary) are kept",
    );
  });

  test("ignores demo rows that have not expired yet", async () => {
    const now = new Date("2030-06-15T12:00:00Z").getTime();
    const stillValid = new Date(now + 60 * 60 * 1000);
    const store = makeFakeStore([
      { id: "alive", userId: DEMO_USER_ID, expiresAt: stillValid },
    ]);
    const prune = createDemoKeyCleanup({
      deleteRows: store.deleteRows,
      now: () => now,
    });
    const { deletedCount } = await prune();
    assert.equal(deletedCount, 0);
    assert.equal(store.rows.length, 1);
  });

  test("doesn't touch demo rows with NULL expiresAt (legacy rows)", async () => {
    const store = makeFakeStore([
      { id: "legacy", userId: DEMO_USER_ID, expiresAt: null },
    ]);
    const prune = createDemoKeyCleanup({
      deleteRows: store.deleteRows,
    });
    const { deletedCount } = await prune();
    assert.equal(deletedCount, 0);
    assert.equal(store.rows.length, 1);
  });

  test("returns 0 with no error when the table is empty", async () => {
    const store = makeFakeStore([]);
    const prune = createDemoKeyCleanup({ deleteRows: store.deleteRows });
    const { deletedCount } = await prune();
    assert.equal(deletedCount, 0);
  });
});

describe("createDemoKeyCleanup — error handling and logging", () => {
  test("propagates DB errors and logs them", async () => {
    const dbErr = new Error("connection refused");
    const logged = [];
    const prune = createDemoKeyCleanup({
      deleteRows: async () => {
        throw dbErr;
      },
      logger: {
        info: () => {},
        error: (...args) => logged.push(args),
      },
    });
    await assert.rejects(prune, /connection refused/);
    assert.equal(logged.length, 1, "the error must be logged exactly once");
  });

  test("only logs an info line when at least one row was deleted", async () => {
    const infoCalls = [];
    const logger = {
      info: (...args) => infoCalls.push(args),
      error: () => {},
    };

    // No-op pass: count = 0 → no info log (avoids nightly noise).
    const noopPrune = createDemoKeyCleanup({
      deleteRows: async () => 0,
      logger,
    });
    await noopPrune();
    assert.equal(infoCalls.length, 0, "no log when nothing was deleted");

    // Productive pass: count > 0 → exactly one info log.
    const realPrune = createDemoKeyCleanup({
      deleteRows: async () => 5,
      logger,
    });
    await realPrune();
    assert.equal(infoCalls.length, 1, "one log when rows were deleted");
    const [meta, msg] = infoCalls[0];
    assert.equal(meta.deletedCount, 5);
    assert.equal(meta.demoUserId, DEMO_USER_ID);
    assert.match(msg, /pruned/i);
  });
});

describe("createDemoKeyCleanup — input validation", () => {
  test("throws if deleteRows is missing", () => {
    assert.throws(
      // @ts-expect-error intentional bad call
      () => createDemoKeyCleanup({}),
      /deleteRows must be a function/,
    );
  });

  test("throws if graceMs is negative", () => {
    assert.throws(
      () => createDemoKeyCleanup({ deleteRows: async () => 0, graceMs: -1 }),
      /graceMs must be a non-negative number/,
    );
  });
});
