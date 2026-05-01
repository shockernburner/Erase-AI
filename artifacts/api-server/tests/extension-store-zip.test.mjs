// Tests for the Chrome Web Store packaging fix (task #157).
//
// The Chrome Web Store rejects any upload whose manifest.json carries a
// `key` field with the error "key field is not allowed in manifest". Our
// source manifest deliberately KEEPS `key` so the unpacked dev install
// always resolves to the pinned extension ID (see PUBLISHING.md § 0).
// The build pipeline produces two zips:
//
//   1. eraseai-firewall-<v>.zip          — manual install, source layout, key intact
//   2. eraseai-firewall-store-<v>.zip    — store upload, flat layout, key STRIPPED
//
// This test drives `packExtensionZip` against the real `extension/` source
// tree and verifies that contract end-to-end so we never ship a broken
// store package again.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import AdmZip from "adm-zip";
import { packExtensionZip } from "../build.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const extensionDir = path.resolve(repoRoot, "extension");

describe("packExtensionZip → store upload zip strips manifest.json `key`", () => {
  let tmpDistDir;
  let manifest;
  let storeZip;
  let manualZip;

  before(async () => {
    manifest = JSON.parse(
      await readFile(path.resolve(extensionDir, "manifest.json"), "utf8"),
    );
    // Sanity: the source manifest carries `key`. If this ever changes we
    // need a different strategy for the dev unpacked install — fail loudly.
    assert.ok(
      manifest.key,
      "extension/manifest.json no longer carries a `key` field — the dev unpacked extension ID is no longer pinned. Update PUBLISHING.md § 0 and the CORS allow-list before deleting this assertion.",
    );

    tmpDistDir = await mkdtemp(path.join(os.tmpdir(), "eraseai-store-zip-"));
    await packExtensionZip(tmpDistDir);

    const storePath = path.resolve(tmpDistDir, `eraseai-firewall-store-${manifest.version}.zip`);
    storeZip = new AdmZip(storePath);
    const manualPath = path.resolve(tmpDistDir, `eraseai-firewall-${manifest.version}.zip`);
    manualZip = new AdmZip(manualPath);
  });

  after(async () => {
    if (tmpDistDir) await rm(tmpDistDir, { recursive: true, force: true });
  });

  test("store zip has manifest.json at the root (flat layout, no `extension/` prefix)", () => {
    const entry = storeZip.getEntry("manifest.json");
    assert.ok(entry, "store zip is missing manifest.json at root");
    // And it must NOT be nested.
    assert.equal(storeZip.getEntry("extension/manifest.json"), null);
  });

  test("store zip's manifest.json has NO `key` field (Chrome Web Store requirement)", () => {
    const storeManifest = JSON.parse(storeZip.getEntry("manifest.json").getData().toString("utf8"));
    assert.equal(
      "key" in storeManifest,
      false,
      `store zip manifest.json still contains a "key" field — Chrome Web Store will reject the upload with "key field is not allowed in manifest".`,
    );
  });

  test("store zip's manifest.json keeps name + version + every other field intact", () => {
    const storeManifest = JSON.parse(storeZip.getEntry("manifest.json").getData().toString("utf8"));
    assert.equal(storeManifest.manifest_version, manifest.manifest_version);
    assert.equal(storeManifest.name, manifest.name);
    assert.equal(storeManifest.version, manifest.version);
    assert.equal(storeManifest.description, manifest.description);
    assert.equal(storeManifest.minimum_chrome_version, manifest.minimum_chrome_version);
    assert.deepEqual(storeManifest.permissions, manifest.permissions);
    assert.deepEqual(storeManifest.host_permissions, manifest.host_permissions);
    assert.deepEqual(storeManifest.content_scripts, manifest.content_scripts);
    assert.deepEqual(storeManifest.background, manifest.background);
    assert.deepEqual(storeManifest.sandbox, manifest.sandbox);
    assert.deepEqual(storeManifest.web_accessible_resources, manifest.web_accessible_resources);
    assert.deepEqual(storeManifest.icons, manifest.icons);
    // Same set of top-level keys minus `key`.
    const sourceKeys = Object.keys(manifest).filter((k) => k !== "key").sort();
    const storeKeys = Object.keys(storeManifest).sort();
    assert.deepEqual(storeKeys, sourceKeys);
  });

  test("store zip ships the trees the extension needs at runtime", () => {
    const names = storeZip.getEntries().map((e) => e.entryName);
    // Source.
    assert.ok(names.some((n) => n === "src/background.js"), "missing src/background.js");
    assert.ok(names.some((n) => n === "src/content.js"), "missing src/content.js");
    assert.ok(names.some((n) => n === "src/file-extractor.js"), "missing src/file-extractor.js");
    assert.ok(names.some((n) => n === "src/sandbox.html"), "missing src/sandbox.html");
    assert.ok(names.some((n) => n === "src/sandbox-extractor.js"), "missing src/sandbox-extractor.js");
    assert.ok(names.some((n) => n === "src/popup.html"), "missing src/popup.html");
    assert.ok(names.some((n) => n === "src/popup.js"), "missing src/popup.js");
    assert.ok(names.some((n) => n === "src/overlay.css"), "missing src/overlay.css");
    // Icons.
    assert.ok(names.some((n) => n === "icons/icon128.png"), "missing icons/icon128.png");
    // Vendored sandbox parsers.
    assert.ok(
      names.some((n) => n.startsWith("vendor/pdfjs/")),
      "store zip is missing the vendor/pdfjs/ tree — PDF scanning will be broken in production",
    );
    assert.ok(
      names.some((n) => n.startsWith("vendor/mammoth/")),
      "store zip is missing the vendor/mammoth/ tree — DOCX scanning will be broken in production",
    );
  });

  test("store zip excludes developer-facing files (PUBLISHING.md, .DS_Store, Thumbs.db)", () => {
    const names = storeZip.getEntries().map((e) => e.entryName);
    assert.equal(
      names.some((n) => /(^|\/)PUBLISHING\.md$/i.test(n)),
      false,
      "store zip should not include PUBLISHING.md (internal release runbook)",
    );
    assert.equal(names.some((n) => n.endsWith(".DS_Store")), false);
    assert.equal(names.some((n) => n.endsWith("Thumbs.db")), false);
  });

  test("manual-install zip KEEPS the `key` field (so dev unpacked still resolves to the pinned ID)", () => {
    const entry = manualZip.getEntry("extension/manifest.json");
    assert.ok(entry, "manual zip should nest manifest under extension/");
    const manualManifest = JSON.parse(entry.getData().toString("utf8"));
    assert.ok(
      manualManifest.key,
      "manual-install zip lost the `key` field — dev `Load unpacked` will no longer resolve to the pinned extension ID, breaking CORS to the api-server",
    );
    assert.equal(manualManifest.key, manifest.key);
  });
});
