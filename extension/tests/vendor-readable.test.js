// Chrome Web Store rejected 1.6.1 under "Code Readability Requirements": the reviewer flagged the
// minified pdf.js bundle (vendor/pdfjs/pdf.min.js) as obfuscated code. The PDF libraries ship as the
// readable builds instead. This guard keeps a minified PDF bundle from coming back.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "vendor", "pdfjs");

describe("vendored pdf.js is the readable build", () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));

  it("has no *.min.js file", () => {
    expect(files.filter((f) => f.includes(".min."))).toEqual([]);
  });

  it("has the library and its worker", () => {
    expect(files).toContain("pdf.js");
    expect(files).toContain("pdf.worker.js");
  });

  it("is ordinary multi-line source, not a minified bundle (average line length is short)", () => {
    for (const f of files) {
      const lines = fs.readFileSync(path.join(dir, f), "utf8").split("\n");
      const avg = lines.reduce((n, l) => n + l.length, 0) / lines.length;
      expect(lines.length, `${f} has ${lines.length} lines`).toBeGreaterThan(5000);
      expect(avg, `${f} averages ${Math.round(avg)} characters a line`).toBeLessThan(100);
    }
  });

  it("the sandbox page loads the readable files", () => {
    const html = fs.readFileSync(path.resolve(dir, "..", "..", "src", "sandbox.html"), "utf8");
    expect(html).toContain("vendor/pdfjs/pdf.js");
    expect(html).toContain("vendor/pdfjs/pdf.worker.js");
    expect(html).not.toContain("pdf.min.js");
    expect(html).not.toContain("pdf.worker.min.js");
  });
});

describe("vendored mammoth (Word reader) is the readable build", () => {
  const mdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "vendor", "mammoth");
  it("ships mammoth.browser.js, not the .min.js", () => {
    const files = fs.readdirSync(mdir).filter((f) => f.endsWith(".js"));
    expect(files).toEqual(["mammoth.browser.js"]);
  });
  it("the sandbox page loads it", () => {
    const html = fs.readFileSync(path.resolve(mdir, "..", "..", "src", "sandbox.html"), "utf8");
    expect(html).toContain("vendor/mammoth/mammoth.browser.js");
    expect(html).not.toContain("mammoth.browser.min.js");
  });
  it("is ordinary multi-line source", () => {
    const lines = fs.readFileSync(path.join(mdir, "mammoth.browser.js"), "utf8").split("\n");
    expect(lines.length).toBeGreaterThan(5000);
    expect(lines.reduce((n, l) => n + l.length, 0) / lines.length).toBeLessThan(100);
  });
});
