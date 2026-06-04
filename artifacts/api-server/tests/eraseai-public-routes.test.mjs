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
  // The contract: each path renders <PreviewRoute mode="..."/> with the
  // mode below. We assert the literal `<Route path="X">` is followed
  // (within a small window) by the right PreviewRoute mode.
  const expected = [
    { path: "/personal", mode: "personal" },
    { path: "/developer", mode: "developer" },
    { path: "/dev", mode: "developer" },
    { path: "/dataset-sanitizer", mode: "dataset-sanitizer" },
    { path: "/enterprise", mode: "enterprise" },
    { path: "/business", mode: "enterprise" },
  ];

  for (const { path: routePath, mode } of expected) {
    test(`<Route path="${routePath}"> renders <PreviewRoute mode="${mode}" />`, () => {
      const re = new RegExp(
        `<Route\\s+path="${routePath.replace(/\//g, "\\/")}">[\\s\\S]{0,200}?<PreviewRoute\\s+mode="${mode}"\\s*/?\\s*>`,
      );
      assert.match(
        APP_TSX,
        re,
        `Expected App.tsx to wire ${routePath} → PreviewRoute mode="${mode}"`,
      );
    });
  }

  test("PreviewRoute helper returns a <PreviewPage /> with onBack pushing /", () => {
    assert.match(APP_TSX, /function PreviewRoute\(\{ mode \}/);
    assert.match(
      APP_TSX,
      /window\.history\.pushState\([^)]*,\s*"",\s*"\/"\)/,
      "PreviewRoute should pushState back to '/' so the URL stays clean",
    );
  });

  test("All 6 deep-link routes are declared before the AuthGate catch-all", () => {
    // Routes must be declared before the AuthGate catch-all.
    //
    //
    const authGateIdx = APP_TSX.indexOf("<AuthGate />");
    assert.ok(authGateIdx > 0, "expected to find <AuthGate /> in App.tsx");
    for (const { path: routePath } of [
      { path: "/personal" },
      { path: "/developer" },
      { path: "/dev" },
      { path: "/dataset-sanitizer" },
      { path: "/enterprise" },
      { path: "/business" },
    ]) {
      const idx = APP_TSX.indexOf(`<Route path="${routePath}">`);
      assert.ok(
        idx > 0 && idx < authGateIdx,
        `<Route path="${routePath}"> must appear before <AuthGate />`,
      );
    }
  });
});

describe("App.tsx — Enterprise/Business card → Dataset Sanitizer", () => {
  test('PreviewPage renders <DatasetSanitizer previewMode /> for mode="enterprise"', () => {
    assert.match(
      APP_TSX,
      /mode === "enterprise"[\s\S]{0,200}DatasetSanitizer/,
      "Enterprise mode must render DatasetSanitizer (not AnalyticsDashboard)",
    );
    assert.match(
      APP_TSX,
      /mode === "dataset-sanitizer"[\s\S]{0,200}DatasetSanitizer/,
      "dataset-sanitizer mode must render DatasetSanitizer",
    );
  });

  test("PreviewPage no longer renders AnalyticsDashboard in any preview mode", () => {
    const previewPageStart = APP_TSX.indexOf("function PreviewPage(");
    assert.ok(previewPageStart > 0, "expected PreviewPage component to exist");
    const nextFn = APP_TSX.indexOf("\nfunction ", previewPageStart + 1);
    const previewBody = APP_TSX.slice(
      previewPageStart,
      nextFn === -1 ? APP_TSX.length : nextFn,
    );
    assert.ok(
      !previewBody.includes("<AnalyticsDashboard"),
      "AnalyticsDashboard must not be rendered inside PreviewPage anymore",
    );
  });

  test("PreviewMode type accepts 'enterprise' and 'dataset-sanitizer'", () => {
    assert.match(
      APP_TSX,
      /type PreviewMode = [^;]*"enterprise"/,
      "PreviewMode type must list 'enterprise'",
    );
    assert.match(
      APP_TSX,
      /type PreviewMode = [^;]*"dataset-sanitizer"/,
      "PreviewMode type must list 'dataset-sanitizer'",
    );
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
