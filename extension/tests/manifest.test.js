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
    // The store title carries a descriptive suffix; the brand stays first and short_name is what
    // Chrome shows where space is tight (toolbar, extensions menu).
    expect(manifest.name.startsWith("EraseAI Firewall")).toBe(true);
    expect(manifest.short_name).toBe("EraseAI Firewall");
    // Chrome Web Store limits: title 75 chars, summary 132 chars.
    expect(manifest.name.length).toBeLessThanOrEqual(75);
    expect(manifest.description.length).toBeLessThanOrEqual(132);
    expect(typeof manifest.version).toBe("string");
  });

  it("loads file-extractor.js and concurrency-config.js before content.js", () => {
    const cs = manifest.content_scripts[0];
    expect(cs.js).toContain("src/file-extractor.js");
    expect(cs.js).toContain("src/content.js");
    expect(cs.js).toContain("src/concurrency-config.js");
    expect(cs.js.indexOf("src/file-extractor.js"))
      .toBeLessThan(cs.js.indexOf("src/content.js"));
    expect(cs.js.indexOf("src/concurrency-config.js"))
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

  it("declares the sandbox page used for PDF/DOCX extraction", () => {
    expect(manifest.sandbox).toBeTruthy();
    expect(Array.isArray(manifest.sandbox.pages)).toBe(true);
    expect(manifest.sandbox.pages).toContain("src/sandbox.html");
    expect(fs.existsSync(path.join(ROOT, "src", "sandbox.html"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "src", "sandbox.js"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "src", "sandbox-extractor.js"))).toBe(true);
  });

  it("exposes the sandbox files via web_accessible_resources", () => {
    expect(Array.isArray(manifest.web_accessible_resources)).toBe(true);
    const flatResources = manifest.web_accessible_resources.flatMap((r) => r.resources || []);
    expect(flatResources).toContain("src/sandbox.html");
    expect(flatResources).toContain("src/sandbox.js");
    expect(flatResources).toContain("src/sandbox-extractor.js");
  });
});
