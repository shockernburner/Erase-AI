import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionDir = path.resolve(repoRoot, "extension");
const apiServerDistDir = path.resolve(repoRoot, "artifacts/api-server/dist");

function loadBuildConfig(source) {
  // build-config.js runs inside a Chrome service worker, so it expects `self`
  // and the standard web globals (URL, etc.) to exist. Expose them on the
  // sandbox so the matcher under test sees the same environment it ships in.
  const ctx = { self: {}, URL };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return ctx.self;
}

function runProductionBuild() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "pnpm",
      ["--filter", "@workspace/api-server", "run", "build"],
      { cwd: repoRoot, stdio: "inherit" },
    );
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`api-server build exited with code ${code}`));
    });
  });
}

describe("dev allowlist (extension/src/build-config.js)", () => {
  let dev;

  before(async () => {
    const src = await readFile(
      path.join(extensionDir, "src/build-config.js"),
      "utf8",
    );
    dev = loadBuildConfig(src);
  });

  test("env reports development", () => {
    assert.equal(dev.ERASEAI_BUILD.env, "development");
  });

  test("dev allowlist contains *.replit.app (so engineers can point at staging)", () => {
    assert.ok(
      dev.ERASEAI_BUILD.allowedApiHosts.includes("*.replit.app"),
      "dev allowlist must keep *.replit.app — that's the whole point of the dev override",
    );
  });

  test("accepts https://eraseai.ai", () => {
    assert.equal(dev.eraseaiIsApiUrlAllowed("https://eraseai.ai/api/x"), true);
  });

  test("accepts subdomains of eraseai.ai", () => {
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("https://staging.eraseai.ai/api/x"),
      true,
    );
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("https://api.dev.eraseai.ai/api/x"),
      true,
    );
  });

  test("accepts subdomains of replit.app (dev only)", () => {
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("https://eraseai-staging.replit.app/api/x"),
      true,
    );
  });

  test("rejects suffix-attack hostnames", () => {
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("https://eraseai.ai.evil.com/api"),
      false,
      "eraseai.ai.evil.com must not be treated as an eraseai.ai host",
    );
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("https://my.replit.app.evil.com/api"),
      false,
      "*.replit.app.evil.com must not be treated as a replit.app host",
    );
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("https://evileraseai.ai/api"),
      false,
      "evileraseai.ai must not match *.eraseai.ai or eraseai.ai",
    );
  });

  test("rejects bare suffix matches that equal the wildcard pattern's tail", () => {
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("https://replit.app/api"),
      false,
      "*.replit.app must not match the bare host replit.app",
    );
  });

  test("rejects http:// URLs", () => {
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("http://eraseai.ai/api"),
      false,
    );
    assert.equal(
      dev.eraseaiIsApiUrlAllowed("http://my.eraseai.ai/api"),
      false,
    );
  });

  test("rejects non-string and malformed inputs", () => {
    assert.equal(dev.eraseaiIsApiUrlAllowed(""), false);
    assert.equal(dev.eraseaiIsApiUrlAllowed(null), false);
    assert.equal(dev.eraseaiIsApiUrlAllowed(undefined), false);
    assert.equal(dev.eraseaiIsApiUrlAllowed("not-a-url"), false);
    assert.equal(dev.eraseaiIsApiUrlAllowed(123), false);
  });
});

describe("production lockdown in store-upload zip", () => {
  let prod;
  let storeManifest;
  let storeZipPath;

  before(async () => {
    await runProductionBuild();

    const entries = await readdir(apiServerDistDir);
    const storeZipName = entries.find(
      (f) => f.startsWith("eraseai-firewall-store-") && f.endsWith(".zip"),
    );
    if (!storeZipName) {
      throw new Error(
        `[test] no store-upload zip found in ${apiServerDistDir} after running build — got: ${entries.join(", ")}`,
      );
    }
    storeZipPath = path.join(apiServerDistDir, storeZipName);

    const zip = new AdmZip(storeZipPath);

    const configEntry = zip.getEntry("src/build-config.js");
    if (!configEntry) {
      throw new Error(
        `[test] src/build-config.js missing from store zip ${storeZipPath}`,
      );
    }
    const configSource = configEntry.getData().toString("utf8");
    prod = loadBuildConfig(configSource);

    const manifestEntry = zip.getEntry("manifest.json");
    if (!manifestEntry) {
      throw new Error(
        `[test] manifest.json missing from store zip ${storeZipPath}`,
      );
    }
    storeManifest = JSON.parse(manifestEntry.getData().toString("utf8"));
  });

  test("in-zip build-config reports env: \"production\"", () => {
    assert.equal(prod.ERASEAI_BUILD.env, "production");
  });

  test("production allowlist excludes *.replit.app", () => {
    assert.ok(
      !prod.ERASEAI_BUILD.allowedApiHosts.includes("*.replit.app"),
      `production allowlist must NOT include *.replit.app — got ${JSON.stringify(prod.ERASEAI_BUILD.allowedApiHosts)}`,
    );
    assert.ok(
      !prod.ERASEAI_BUILD.allowedApiHosts.includes("replit.app"),
      `production allowlist must NOT include replit.app — got ${JSON.stringify(prod.ERASEAI_BUILD.allowedApiHosts)}`,
    );
  });

  test("production allowlist still accepts EraseAI hosts", () => {
    assert.ok(prod.ERASEAI_BUILD.allowedApiHosts.includes("eraseai.ai"));
    assert.ok(prod.ERASEAI_BUILD.allowedApiHosts.includes("*.eraseai.ai"));
    assert.equal(
      prod.eraseaiIsApiUrlAllowed("https://eraseai.ai/api/x"),
      true,
    );
    assert.equal(
      prod.eraseaiIsApiUrlAllowed("https://api.eraseai.ai/api/x"),
      true,
    );
  });

  test("production allowlist rejects every flavour of *.replit.app", () => {
    assert.equal(
      prod.eraseaiIsApiUrlAllowed("https://anything.replit.app/api"),
      false,
      "production must reject arbitrary *.replit.app hosts",
    );
    assert.equal(
      prod.eraseaiIsApiUrlAllowed("https://eraseai-staging.replit.app/api"),
      false,
      "production must reject even our own staging *.replit.app host",
    );
    assert.equal(
      prod.eraseaiIsApiUrlAllowed("https://replit.app/api"),
      false,
    );
  });

  test("production allowlist still rejects suffix attacks and http://", () => {
    assert.equal(
      prod.eraseaiIsApiUrlAllowed("https://eraseai.ai.evil.com/api"),
      false,
    );
    assert.equal(
      prod.eraseaiIsApiUrlAllowed("http://eraseai.ai/api"),
      false,
    );
  });

  test("in-zip manifest.json host_permissions excludes https://*.replit.app/*", () => {
    assert.ok(
      Array.isArray(storeManifest.host_permissions),
      "manifest.host_permissions must be an array",
    );
    assert.ok(
      !storeManifest.host_permissions.includes("https://*.replit.app/*"),
      `host_permissions must NOT include https://*.replit.app/* — got ${JSON.stringify(storeManifest.host_permissions)}`,
    );
    for (const entry of storeManifest.host_permissions) {
      assert.ok(
        !/replit\.app/.test(entry),
        `no host_permissions entry may reference replit.app — got ${entry}`,
      );
    }
  });

  test("in-zip manifest.json keeps EraseAI host permissions", () => {
    assert.ok(
      storeManifest.host_permissions.includes("https://eraseai.ai/*"),
      "manifest must still grant https://eraseai.ai/*",
    );
    assert.ok(
      storeManifest.host_permissions.includes("https://*.eraseai.ai/*"),
      "manifest must still grant https://*.eraseai.ai/*",
    );
  });

  // Regression guard for the "stale dashboard URL" demo break: an old build
  // shipped a popup whose "Open EraseAI dashboard" button pointed at
  // eraseai.replit.app instead of eraseai.ai. The fix added canonical URL
  // constants in extension/src/popup.js and unit tests assert they all
  // start with https://eraseai.ai/. That guards the dev source — but does
  // not guard the actual zip we hand to the Chrome Web Store. A regression
  // in the build pipeline (esbuild output, build-config.js generation,
  // anything else that bakes the old host back into the shipped JS) could
  // re-introduce the bug without any unit test catching it. Scan every
  // file inside every shipped extension zip for the dead host.
  //
  // We match URL-shaped occurrences only (preceded by `/`, `"`, `'`, or
  // backtick). This intentionally allows three legitimate prose mentions
  // of the bare hostname that ship inside the zip and are part of the
  // recovery story for affected users:
  //   - extension/CHANGELOG.json — release notes describing the fix
  //   - extension/src/background.js — comment in the auto-heal path
  //     explaining what the now-dead host was
  // Test fixtures under tests/ legitimately set the dead URL into mock
  // chrome.storage.local to verify the auto-heal migration removes it,
  // so we skip that directory too. Everything else — popup.js,
  // background.js code (not comments), options.js, content scripts,
  // manifest.json, html — is scanned.
  test("no shipped extension zip contains the stale eraseai.replit.app dashboard URL", async () => {
    const entries = await readdir(apiServerDistDir);
    const shippedZips = entries.filter(
      (f) => f.startsWith("eraseai-firewall-") && f.endsWith(".zip"),
    );
    assert.ok(
      shippedZips.length >= 2,
      `expected both manual-install and store-upload zips in ${apiServerDistDir} — got: ${entries.join(", ")}`,
    );

    // URL-shaped: a `/`, `"`, `'`, or backtick immediately before the
    // hostname. Catches `https://eraseai.replit.app/...`, `"eraseai.replit.app"`,
    // template strings, etc. Case-insensitive per the task spec.
    const URL_SHAPED_DEAD_HOST = /[/"'`]eraseai\.replit\.app/i;
    const isInTestsDir = (entryName) => /(^|\/)tests\//.test(entryName);

    const offences = [];
    for (const zipName of shippedZips) {
      const zip = new AdmZip(path.join(apiServerDistDir, zipName));
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        if (isInTestsDir(entry.entryName)) continue;
        const text = entry.getData().toString("utf8");
        if (URL_SHAPED_DEAD_HOST.test(text)) {
          offences.push(`${zipName} :: ${entry.entryName}`);
        }
      }
    }

    assert.deepEqual(
      offences,
      [],
      `shipped extension zip(s) still reference eraseai.replit.app as a URL — that is the stale dashboard URL the demo broke on. Offending entries:\n  ${offences.join("\n  ")}`,
    );
  });
});
