// Smoke checks on extension/manifest.json. Lightweight guard against
// shipping a manifest that has lost the file-extractor entry or fallen
// behind on the changelog version (task #142).

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"),
);
const changelog = JSON.parse(
  fs.readFileSync(path.join(ROOT, "CHANGELOG.json"), "utf8"),
);

describe("manifest.json", () => {
  it("declares MV3 and the EraseAI Firewall identity", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("EraseAI Firewall");
    expect(typeof manifest.version).toBe("string");
  });

  it("loads file-extractor.js BEFORE content.js so the extractor is on globalThis when content.js runs", () => {
    const cs = manifest.content_scripts[0];
    expect(cs.js[0]).toBe("src/file-extractor.js");
    expect(cs.js).toContain("src/content.js");
    // file-extractor must come first so the extractor IIFE has run by
    // the time content.js queries globalThis.__eraseAIExtractor.
    expect(cs.js.indexOf("src/file-extractor.js"))
      .toBeLessThan(cs.js.indexOf("src/content.js"));
  });

  it("the file-extractor file actually exists at the path the manifest references", () => {
    const cs = manifest.content_scripts[0];
    for (const p of cs.js) {
      expect(fs.existsSync(path.join(ROOT, p))).toBe(true);
    }
  });

  it("the manifest version matches the latest CHANGELOG entry", () => {
    expect(changelog.entries[0].version).toBe(manifest.version);
  });
});
