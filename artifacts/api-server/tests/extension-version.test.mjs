import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveExtensionVersionPayload } from "../src/routes/extension-version-source.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

describe("/api/extension/version reports the live CHANGELOG version", () => {
  let changelog;
  let manifest;

  before(async () => {
    changelog = JSON.parse(
      await readFile(path.resolve(repoRoot, "extension/CHANGELOG.json"), "utf8"),
    );
    manifest = JSON.parse(
      await readFile(path.resolve(repoRoot, "extension/manifest.json"), "utf8"),
    );
  });

  test("CHANGELOG.json has at least one entry with a version", () => {
    assert.ok(Array.isArray(changelog.entries), "entries must be an array");
    assert.ok(
      changelog.entries.length > 0,
      "CHANGELOG.json must have at least one entry — the public status page reads from it",
    );
    assert.equal(typeof changelog.entries[0].version, "string");
  });

  test("API-reported version matches the latest CHANGELOG entry's version", async () => {
    const payload = await resolveExtensionVersionPayload();
    assert.ok(
      payload,
      "resolveExtensionVersionPayload returned null — neither extension/CHANGELOG.json nor the dist sidecar were readable",
    );
    assert.equal(
      payload.version,
      changelog.entries[0].version,
      `expected /api/extension/version to report ${changelog.entries[0].version} (the latest CHANGELOG entry), got ${payload.version}. The public /status page reads this exact field, so a mismatch means sales/support sees a stale version.`,
    );
  });

  test("API payload exposes the full changelog so the status page can render release notes", async () => {
    const payload = await resolveExtensionVersionPayload();
    assert.ok(payload);
    assert.ok(Array.isArray(payload.changelog));
    assert.equal(payload.changelog.length, changelog.entries.length);
    assert.equal(payload.changelog[0].version, changelog.entries[0].version);
  });

  test("manifest.json version stays in lockstep with CHANGELOG.json (single source of truth)", () => {
    assert.equal(
      manifest.version,
      changelog.entries[0].version,
      "extension/manifest.json `version` must equal extension/CHANGELOG.json `entries[0].version` — bumping one without the other will desync the public status page from the actually-shipping extension.",
    );
  });
});
