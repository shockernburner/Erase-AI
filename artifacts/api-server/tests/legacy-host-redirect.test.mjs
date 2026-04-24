import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appTsPath = path.resolve(__dirname, "../src/app.ts");

// Extract the legacyHostRedirect function body from app.ts as plain JS so we
// can exercise its real source under node:test without booting the full
// Express app (which would require a DB connection and a test runner that
// understands TypeScript).  The function is intentionally written using only
// plain-JS syntax (no TypeScript-specific features inside the body) so this
// strip works.
async function loadLegacyHostRedirect() {
  const src = await readFile(appTsPath, "utf8");
  // Capture: export function legacyHostRedirect(req, res, next): void { ... }
  // The body must NOT contain any nested function declarations / braces
  // beyond what's currently there, otherwise this regex needs to be updated.
  const match = src.match(
    /export function legacyHostRedirect\([\s\S]*?\):\s*void\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(
    match,
    "legacyHostRedirect must be an exported, named function in app.ts so the redirect behavior is testable.",
  );
  const body = match[1];
  // Build a plain JS function with the same body. We strip the TypeScript
  // parameter type annotations from the signature; the body itself is plain
  // JS.
  const factory = `
    "use strict";
    return function legacyHostRedirect(req, res, next) {${body}};
  `;
  const ctx = {};
  vm.createContext(ctx);
  return vm.runInContext(`(function () { ${factory} })()`, ctx);
}

function makeReq({ host, originalUrl = "/api/extension/version", url }) {
  return {
    headers: { host },
    originalUrl,
    url: url ?? originalUrl,
  };
}

function makeRes() {
  return {
    statusCode: 0,
    location: null,
    redirect(status, location) {
      this.statusCode = status;
      this.location = location;
    },
  };
}

describe("legacyHostRedirect middleware (artifacts/api-server/src/app.ts)", () => {
  test("redirects eraseai.replit.app → eraseai.ai with 308 preserving the path+query", async () => {
    const mw = await loadLegacyHostRedirect();
    const req = makeReq({
      host: "eraseai.replit.app",
      originalUrl: "/api/extension/version?ref=popup",
    });
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(res.statusCode, 308);
    assert.equal(
      res.location,
      "https://eraseai.ai/api/extension/version?ref=popup",
    );
    assert.equal(nextCalled, false, "must not call next() after redirect");
  });

  test("redirects subdomain *.eraseai.replit.app → eraseai.ai", async () => {
    const mw = await loadLegacyHostRedirect();
    const req = makeReq({
      host: "preview.eraseai.replit.app",
      originalUrl: "/api/dev/ping",
    });
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(res.statusCode, 308);
    assert.equal(res.location, "https://eraseai.ai/api/dev/ping");
    assert.equal(nextCalled, false);
  });

  test("does NOT redirect requests to eraseai.ai itself — passes through to next()", async () => {
    const mw = await loadLegacyHostRedirect();
    const req = makeReq({ host: "eraseai.ai", originalUrl: "/api/dev/ping" });
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(res.statusCode, 0, "must not redirect");
    assert.equal(res.location, null);
    assert.equal(nextCalled, true);
  });

  test("does NOT redirect requests to a different replit.app project (only eraseai.replit.app and its subdomains)", async () => {
    const mw = await loadLegacyHostRedirect();
    const req = makeReq({
      host: "someoneelse.replit.app",
      originalUrl: "/api/dev/ping",
    });
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, "must pass through to next()");
    assert.equal(res.statusCode, 0);
  });

  test("ignores port suffix in Host header (e.g. eraseai.replit.app:443)", async () => {
    const mw = await loadLegacyHostRedirect();
    const req = makeReq({
      host: "eraseai.replit.app:443",
      originalUrl: "/health",
    });
    const res = makeRes();
    mw(req, res, () => {});
    assert.equal(res.statusCode, 308);
    assert.equal(res.location, "https://eraseai.ai/health");
  });

  test("falls back to req.url when req.originalUrl is missing", async () => {
    const mw = await loadLegacyHostRedirect();
    const req = {
      headers: { host: "eraseai.replit.app" },
      originalUrl: undefined,
      url: "/something",
    };
    const res = makeRes();
    mw(req, res, () => {});
    assert.equal(res.statusCode, 308);
    assert.equal(res.location, "https://eraseai.ai/something");
  });

  test("middleware is registered FIRST in the express app (before pino-http and CORS) so legacy-host requests short-circuit before any auth or logging side effects", async () => {
    const src = await readFile(appTsPath, "utf8");
    // Find the line index of `app.use(legacyHostRedirect)` and the line index
    // of the pinoHttp app.use(...) registration. The legacy-host registration
    // must come first.
    const legacyIdx = src.indexOf("app.use(legacyHostRedirect)");
    const pinoIdx = src.indexOf("pinoHttp(");
    const corsUseIdx = src.indexOf("app.use(cors(");
    const authUseIdx = src.indexOf("app.use(authMiddleware");
    const routerUseIdx = src.indexOf('app.use("/api", router)');
    assert.ok(legacyIdx > -1, "app.use(legacyHostRedirect) must be present");
    assert.ok(pinoIdx > -1, "pinoHttp must be present");
    assert.ok(legacyIdx < pinoIdx, "legacy host redirect must run before pino-http");
    if (corsUseIdx > -1) {
      assert.ok(legacyIdx < corsUseIdx, "legacy host redirect must run before CORS");
    }
    if (authUseIdx > -1) {
      assert.ok(
        legacyIdx < authUseIdx,
        "legacy host redirect must run before app.use(authMiddleware)",
      );
    }
    if (routerUseIdx > -1) {
      assert.ok(
        legacyIdx < routerUseIdx,
        "legacy host redirect must run before the /api router",
      );
    }
  });
});
