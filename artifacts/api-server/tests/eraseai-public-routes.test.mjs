// Static smoke tests for task #158 frontend wiring: deep-link Wouter
// routes, Enterprise/Business → DatasetSanitizer mapping, and the
// developer demo-key panel UX.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

function read(relative) {
  return readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

const APP_TSX = read("artifacts/eraseai/src/App.tsx");
const PUBLIC_LANDING_TSX = read("artifacts/eraseai/src/pages/PublicLanding.tsx");

describe("App.tsx — explicit Wouter deep-link routes", () => {
  // Each plan path renders <AuthGate previewPlan="..."/>: signed-out visitors see the landing page on
  // that plan, signed-in users get the app. (This replaced the old PreviewRoute/PreviewPage screens.)
  const expected = [
    { path: "/personal", plan: "personal" },
    { path: "/developer", plan: "pro" },
    { path: "/dev", plan: "pro" },
    { path: "/dataset-sanitizer", plan: "business" },
    { path: "/enterprise", plan: "enterprise" },
    { path: "/business", plan: "business" },
  ];

  for (const { path: routePath, plan } of expected) {
    test(`<Route path="${routePath}"> renders <AuthGate previewPlan="${plan}" />`, () => {
      const re = new RegExp(
        `<Route\\s+path="${routePath.replace(/\//g, "\\/")}">[\\s\\S]{0,120}?<AuthGate\\s+previewPlan="${plan}"\\s*/?\\s*>`,
      );
      assert.match(APP_TSX, re, `Expected App.tsx to wire ${routePath} to AuthGate previewPlan="${plan}"`);
    });
  }

  test("All 6 deep-link routes are declared before the AuthGate catch-all", () => {
    const catchAll = APP_TSX.indexOf("<AuthGate />");
    assert.ok(catchAll > 0, "expected to find <AuthGate /> in App.tsx");
    for (const { path: routePath } of expected) {
      const idx = APP_TSX.indexOf(`<Route path="${routePath}">`);
      assert.ok(idx > 0 && idx < catchAll, `<Route path="${routePath}"> must appear before <AuthGate />`);
    }
  });
});

describe("DeveloperDashboard.tsx — demo-key panel UX (review fixes)", () => {
  const DEV_DASHBOARD_TSX = read("artifacts/eraseai/src/pages/DeveloperDashboard.tsx");

  test("preview mode no longer seeds fake era_demo / era_test keys", () => {
    assert.ok(
      !DEV_DASHBOARD_TSX.includes('"era_demo"'),
      "preview mock key 'era_demo' must be removed from DeveloperDashboard",
    );
    assert.ok(
      !DEV_DASHBOARD_TSX.includes('"era_test"'),
      "preview mock key 'era_test' must be removed from DeveloperDashboard",
    );
  });

  test("issued demo key has a copy button", () => {
    assert.match(
      DEV_DASHBOARD_TSX,
      /data-testid="demo-key-copy"/,
      "demo-key panel must expose a copy button",
    );
    assert.match(
      DEV_DASHBOARD_TSX,
      /const copyDemoKey = async/,
      "DeveloperDashboard must define copyDemoKey() handler",
    );
    assert.match(
      DEV_DASHBOARD_TSX,
      /navigator\.clipboard\.writeText\(demoKey\)/,
      "copyDemoKey must write the demo key to the clipboard",
    );
  });

  test("issued demo key surfaces its expiry to the user", () => {
    assert.match(
      DEV_DASHBOARD_TSX,
      /data-testid="demo-key-expiry"/,
      "demo-key panel must render the expiry timestamp",
    );
    assert.match(
      DEV_DASHBOARD_TSX,
      /formatDemoKeyExpiry\(demoKeyExpiresAt\)/,
      "expiry display must format demoKeyExpiresAt via formatDemoKeyExpiry helper",
    );
  });

  test("429 handler parses retryAt and shows time-remaining message", () => {
    assert.match(
      DEV_DASHBOARD_TSX,
      /data\?\.retryAt/,
      "429 branch must read retryAt from the response body",
    );
    assert.match(
      DEV_DASHBOARD_TSX,
      /demoKeyRateLimitedWithRetry/,
      "429 branch must use the retry-aware translation key with hours remaining",
    );
    assert.match(
      DEV_DASHBOARD_TSX,
      /setDemoKeyRetryAt/,
      "429 branch must persist retryAt into component state",
    );
  });
});

describe("PublicLanding.tsx — Enterprise card click handler", () => {
  test("Enterprise card routes to the contact/Book Demo flow", () => {
    assert.match(
      PUBLIC_LANDING_TSX,
      /window\.location\.href\s*=\s*`\$\{baseUrl\}contact`/,
      "PublicLanding Enterprise 'Book Demo' button must route to the contact page",
    );
  });
});
