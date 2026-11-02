import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Chrome Web Store rejects Manifest V3 items that can load code from the
// internet ("Including remotely hosted code"), and its scan flags CDN URLs in
// the package even when they are only unused defaults. 1.6.0 was rejected for
// tesseract.js's jsDelivr defaults; vendor/tesseract is patched to local
// paths, and this keeps a library update from bringing them back.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SHIPPED = ["manifest.json", "src", "vendor"];
const CDN = /(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh|skypack\.dev|ajax\.googleapis\.com|raw\.githubusercontent\.com)/;

function files(p) {
  const full = path.join(ROOT, p);
  if (fs.statSync(full).isFile()) return [p];
  return fs.readdirSync(full).flatMap((name) => files(path.join(p, name)));
}

describe("no remotely hosted code", () => {
  const shipped = SHIPPED.flatMap(files).filter((f) => /\.(js|html|json)$/.test(f));

  it("ships no CDN URLs in any script, page or manifest", () => {
    const offenders = shipped.filter((f) => CDN.test(fs.readFileSync(path.join(ROOT, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("loads no <script> from the network", () => {
    const pages = shipped.filter((f) => f.endsWith(".html"));
    for (const page of pages) {
      const html = fs.readFileSync(path.join(ROOT, page), "utf8");
      expect(html).not.toMatch(/<script[^>]+src=["']?(https?:)?\/\//i);
    }
  });
});
