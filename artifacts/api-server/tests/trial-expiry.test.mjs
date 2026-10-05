import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

// planMiddleware.ts imports @workspace/db and drizzle-orm at module scope for
// refreshPlanFromDB, which we are not testing here. Stub those imports so the
// pure trial-expiry logic can be loaded in isolation, exactly as it ships.
const source = readFileSync(new URL("../src/middlewares/planMiddleware.ts", import.meta.url), "utf8")
  .replace('import { db, usersTable } from "@workspace/db";', "const db = null, usersTable = null;")
  .replace('import { eq } from "drizzle-orm";', "const eq = null;");

const transformed = transformSync(source, {
  format: "esm",
  loader: "ts",
  sourcemap: false,
  target: "es2022",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`;
const { isTrialExpired, requireActivePlan } = await import(moduleUrl);

const DAY = 24 * 60 * 60 * 1000;
const past = new Date(Date.now() - DAY).toISOString();
const future = new Date(Date.now() + DAY).toISOString();

function runMiddleware(user) {
  let statusCode = null;
  let body = null;
  let nextCalled = false;
  const req = { user };
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return this; },
  };
  requireActivePlan()(req, res, () => { nextCalled = true; });
  return { statusCode, body, nextCalled };
}

describe("7-day free trial expiry", () => {
  test("free user past planEndDate is expired", () => {
    assert.equal(isTrialExpired({ planType: "free", planEndDate: past }), true);
  });

  test("free user within the trial window is not expired", () => {
    assert.equal(isTrialExpired({ planType: "free", planEndDate: future }), false);
  });

  test("free user without a planEndDate is not expired (legacy accounts)", () => {
    assert.equal(isTrialExpired({ planType: "free" }), false);
  });

  test("paid plans never expire via the trial gate, even past planEndDate", () => {
    for (const planType of ["personal", "pro", "business", "enterprise"]) {
      assert.equal(isTrialExpired({ planType, planEndDate: past }), false, planType);
    }
  });

  test("admins are exempt from trial expiry", () => {
    assert.equal(isTrialExpired({ planType: "free", role: "admin", planEndDate: past }), false);
  });

  test("requireActivePlan blocks an expired free user with 403 + upgrade flags", () => {
    const { statusCode, body, nextCalled } = runMiddleware({ planType: "free", planEndDate: past });
    assert.equal(nextCalled, false);
    assert.equal(statusCode, 403);
    assert.equal(body.trialExpired, true);
    assert.equal(body.upgrade, true);
    assert.match(body.error, /7-day free trial has expired/);
  });

  test("requireActivePlan lets an active free-trial user through", () => {
    const { statusCode, nextCalled } = runMiddleware({ planType: "free", planEndDate: future });
    assert.equal(nextCalled, true);
    assert.equal(statusCode, null);
  });

  test("requireActivePlan lets paid users through regardless of planEndDate", () => {
    const { nextCalled } = runMiddleware({ planType: "personal", planEndDate: past });
    assert.equal(nextCalled, true);
  });
});

describe("free scan routes are gated by requireActivePlan", () => {
  const devSource = readFileSync(new URL("../src/routes/dev.ts", import.meta.url), "utf8");
  const personalSource = readFileSync(new URL("../src/routes/personal.ts", import.meta.url), "utf8");

  test("dev /analyze and /sanitize apply requireActivePlan()", () => {
    assert.match(devSource, /router\.post\("\/analyze",[^)]*requireActivePlan\(\)/);
    assert.match(devSource, /router\.post\("\/sanitize",[^)]*requireActivePlan\(\)/);
  });

  test("personal /analyze applies requireActivePlan()", () => {
    assert.match(personalSource, /router\.post\("\/personal\/analyze",[^)]*requireActivePlan\(\)/);
  });
});

describe("extension routes are not capped by the monthly API quota", () => {
  const devSource = readFileSync(new URL("../src/routes/dev.ts", import.meta.url), "utf8");

  test("dev quota chain only tracks usage; Personal is unlimited in the extension", () => {
    assert.match(devSource, /const quotaChain = \[trackApiUsage\(\)\];/);
  });
});
