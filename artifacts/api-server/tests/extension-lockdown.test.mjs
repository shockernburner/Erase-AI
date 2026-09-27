import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionDir = path.resolve(repoRoot, "extension");
const apiServerDistDir = path.resolve(repoRoot, "artifacts/api-server/dist");

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

describe("packed store-upload zip", () => {
  let storeManifest;
  let storeZipPath;
  let sourceVersion;

  before(async () => {
    sourceVersion = JSON.parse(
      await readFile(path.join(extensionDir, "manifest.json"), "utf8"),
    ).version;

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
    const manifestEntry = zip.getEntry("manifest.json");
    if (!manifestEntry) {
      throw new Error(
        `[test] manifest.json missing from store zip ${storeZipPath}`,
      );
    }
    storeManifest = JSON.parse(manifestEntry.getData().toString("utf8"));
  });

  test("manifest.json sits at the zip root with the source version", () => {
    assert.equal(storeManifest.version, sourceVersion);
    // The store title carries a descriptive suffix (extension/STORE_LISTING.md);
    // the brand stays first and short_name is the bare brand.
    assert.ok(storeManifest.name.startsWith("EraseAI Firewall"), storeManifest.name);
    assert.equal(storeManifest.short_name, "EraseAI Firewall");
  });

  test("packed extension contains the runtime files the manifest references", () => {
    const zip = new AdmZip(storeZipPath);
    const names = new Set(zip.getEntries().map((e) => e.entryName));
    for (const required of [
      "manifest.json",
      "src/background.js",
      "src/popup.html",
      "src/popup.js",
      "src/content.js",
      "src/overlay.css",
    ]) {
      assert.ok(names.has(required), `store zip is missing ${required}`);
    }
  });

  test("host_permissions only references eraseai.ai and the AI chat sites — no replit.app or other third-party API hosts", () => {
    assert.ok(
      Array.isArray(storeManifest.host_permissions),
      "manifest.host_permissions must be an array",
    );
    for (const entry of storeManifest.host_permissions) {
      assert.ok(
        !/replit\.app/.test(entry),
        `no host_permissions entry may reference replit.app — got ${entry}`,
      );
    }
    assert.ok(
      storeManifest.host_permissions.includes("https://eraseai.ai/*"),
      "manifest must still grant https://eraseai.ai/*",
    );
  });

  test("manual-install zip is also produced alongside the store zip", async () => {
    const entries = await readdir(apiServerDistDir);
    const manualZipName = entries.find(
      (f) =>
        f.startsWith("eraseai-firewall-") &&
        !f.startsWith("eraseai-firewall-store-") &&
        f.endsWith(".zip"),
    );
    assert.ok(
      manualZipName,
      `manual-install zip is missing from ${apiServerDistDir}; got: ${entries.join(", ")}`,
    );
    assert.ok(
      manualZipName.includes(sourceVersion),
      `manual-install zip filename must include the source version ${sourceVersion}; got ${manualZipName}`,
    );
    // Manual-install zip wraps everything under an extension/ folder.
    const manualZip = new AdmZip(path.join(apiServerDistDir, manualZipName));
    const names = new Set(manualZip.getEntries().map((e) => e.entryName));
    assert.ok(
      names.has("extension/manifest.json"),
      "manual-install zip must wrap files under extension/ — manifest.json should be at extension/manifest.json",
    );
  });

  test("packed extension does NOT ship the internal PUBLISHING doc", () => {
    const zip = new AdmZip(storeZipPath);
    const names = new Set(zip.getEntries().map((e) => e.entryName));
    assert.ok(
      !names.has("PUBLISHING.md"),
      "PUBLISHING.md is internal-only and must be excluded from the store zip",
    );
  });
});
