// @vitest-environment jsdom
//
// Unit tests for extension/src/file-extractor.js (task #142). The extractor
// is loaded as a content_script entry that attaches `__eraseAIExtractor` to
// the isolated-world global; we mirror that here by eval'ing the source
// into the test realm.

import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTRACTOR_SRC = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "file-extractor.js"),
  "utf8",
);

beforeAll(() => {
  // eslint-disable-next-line no-eval
  (0, eval)(EXTRACTOR_SRC);
});

function makeFile(name, contents, type = "") {
  // jsdom's File constructor accepts the same args as Chrome's.
  return new File([contents], name, { type });
}

describe("file-extractor — globals", () => {
  it("attaches __eraseAIExtractor exactly once", () => {
    expect(globalThis.__eraseAIExtractor).toBeTruthy();
    expect(typeof globalThis.__eraseAIExtractor.extractText).toBe("function");
    expect(typeof globalThis.__eraseAIExtractor.classify).toBe("function");
    expect(globalThis.__eraseAIExtractor.SKIP_REASONS).toBeTruthy();
    // Re-eval'ing the source must not redefine — guards against
    // double-injection if the manifest list ever runs the script twice.
    const original = globalThis.__eraseAIExtractor;
    // eslint-disable-next-line no-eval
    (0, eval)(EXTRACTOR_SRC);
    expect(globalThis.__eraseAIExtractor).toBe(original);
  });
});

describe("file-extractor — classify()", () => {
  const cases = [
    ["report.csv", "", "text"],
    ["log.txt", "", "text"],
    ["data.json", "", "text"],
    ["doc.md", "", "text"],
    ["page.html", "", "text"],
    ["config.yaml", "", "text"],
    ["query.sql", "", "text"],
    ["resume.pdf", "application/pdf", "pdf"],
    ["letter.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
    ["pic.png", "image/png", "image"],
    ["pic.jpeg", "image/jpeg", "image"],
    ["bundle.zip", "application/zip", "archive"],
    ["mystery.xyz", "", "unknown"],
  ];
  for (const [name, type, expected] of cases) {
    it(`classifies ${name} as ${expected}`, () => {
      const f = makeFile(name, "x", type);
      expect(globalThis.__eraseAIExtractor.classify(f)).toBe(expected);
    });
  }

  it("falls back to extension when MIME is empty (real-world drop case)", () => {
    expect(globalThis.__eraseAIExtractor.classify(makeFile("data.csv", "x"))).toBe("text");
    expect(globalThis.__eraseAIExtractor.classify(makeFile("scan.pdf", "x"))).toBe("pdf");
  });
});

describe("file-extractor — extractText()", () => {
  it("extracts plain CSV content via FileReader", async () => {
    const csv = "name,email\nAlice,alice@example.com\nBob,bob@example.com\n";
    const file = makeFile("contacts.csv", csv, "text/csv");
    const out = await globalThis.__eraseAIExtractor.extractText(file);
    expect(out.skipReason).toBeUndefined();
    expect(out.name).toBe("contacts.csv");
    expect(out.text).toBe(csv);
    expect(out.truncated).toBe(false);
    expect(out.sizeBytes).toBe(csv.length);
  });

  it("extracts JSON content", async () => {
    const json = '{"user":"a@b.com","ssn":"123-45-6789"}';
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("payload.json", json, "application/json"),
    );
    expect(out.text).toBe(json);
  });

  it("returns pdfNotYetSupported skipReason for PDFs (no extraction)", async () => {
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("resume.pdf", "%PDF-1.7 dummy", "application/pdf"),
    );
    expect(out.skipReason).toBe(
      globalThis.__eraseAIExtractor.SKIP_REASONS.pdfNotYetSupported,
    );
    expect(out.text).toBe("");
    expect(out.name).toBe("resume.pdf");
  });

  it("returns docxNotYetSupported skipReason for Word documents", async () => {
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "letter.docx",
        "PK", // ZIP magic bytes — irrelevant, we never read it
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );
    expect(out.skipReason).toBe(
      globalThis.__eraseAIExtractor.SKIP_REASONS.docxNotYetSupported,
    );
  });

  it("returns image skipReason for image attachments", async () => {
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("screenshot.png", "x", "image/png"),
    );
    expect(out.skipReason).toBe(globalThis.__eraseAIExtractor.SKIP_REASONS.image);
  });

  it("returns archive skipReason for ZIPs", async () => {
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("bundle.zip", "PK\u0003\u0004", "application/zip"),
    );
    expect(out.skipReason).toBe(globalThis.__eraseAIExtractor.SKIP_REASONS.archive);
  });

  it("returns unsupported skipReason for unknown extensions", async () => {
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("weird.xyz", "x"),
    );
    expect(out.skipReason).toBe(globalThis.__eraseAIExtractor.SKIP_REASONS.unsupported);
  });

  it("returns empty skipReason for zero-byte files", async () => {
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("empty.txt", "", "text/plain"),
    );
    expect(out.skipReason).toBe(globalThis.__eraseAIExtractor.SKIP_REASONS.empty);
  });

  it("truncates extracted text at the 50 KB cap", async () => {
    const big = "a".repeat(60 * 1024);
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("huge.txt", big, "text/plain"),
    );
    expect(out.truncated).toBe(true);
    expect(out.text.length).toBe(50 * 1024);
    expect(out.sizeBytes).toBe(60 * 1024);
  });

  it("returns tooLarge skipReason for files above the 5 MB per-file cap", async () => {
    // Construct a File that reports a >5MB size without actually
    // allocating 5MB of test data.
    const file = makeFile("huge.csv", "tiny", "text/csv");
    Object.defineProperty(file, "size", { value: 6 * 1024 * 1024 });
    const out = await globalThis.__eraseAIExtractor.extractText(file);
    expect(out.skipReason).toBe(globalThis.__eraseAIExtractor.SKIP_REASONS.tooLarge);
  });
});
