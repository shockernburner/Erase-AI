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
    ["deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
    ["legacy.ppt", "application/vnd.ms-powerpoint", "pptx"],
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

  it("falls back to skipReason for PDFs when no sandbox bridge is available", async () => {
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("resume.pdf", "%PDF-1.7 dummy", "application/pdf"),
    );
    expect(out.skipReason).toBe(
      globalThis.__eraseAIExtractor.SKIP_REASONS.pdfNotYetSupported,
    );
    expect(out.text).toBe("");
    expect(out.name).toBe("resume.pdf");
  });

  it("falls back to skipReason for Word documents when the bridge fails", async () => {
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({
      ok: false,
      error: "boom",
    }));
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "letter.docx",
        "PK",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );
    expect(out.skipReason).toBe(
      globalThis.__eraseAIExtractor.SKIP_REASONS.docxNotYetSupported,
    );
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("extracts PDF text via the sandbox bridge and returns no skipReason", async () => {
    let lastKind = null;
    let lastBytes = null;
    globalThis.__eraseAIExtractor.setSandboxBridge(async (kind, bytes) => {
      lastKind = kind;
      lastBytes = bytes;
      return { ok: true, text: "REDACTED resume — phone 555-867-5309" };
    });
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("resume.pdf", "%PDF-1.7 placeholder bytes", "application/pdf"),
    );
    expect(lastKind).toBe("pdf");
    expect(lastBytes instanceof ArrayBuffer).toBe(true);
    expect(out.skipReason).toBeUndefined();
    expect(out.text).toContain("555-867-5309");
    expect(out.truncated).toBe(false);
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("extracts DOCX text via the sandbox bridge and returns no skipReason", async () => {
    globalThis.__eraseAIExtractor.setSandboxBridge(async (kind) => {
      expect(kind).toBe("docx");
      return { ok: true, text: "Employee SSN: 123-45-6789" };
    });
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "hr.docx",
        "PK\u0003\u0004",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );
    expect(out.skipReason).toBeUndefined();
    expect(out.text).toContain("123-45-6789");
    expect(out.name).toBe("hr.docx");
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("extracts XLSX text via the sandbox bridge and returns no skipReason", async () => {
    let lastKind = null;
    let lastBytes = null;
    globalThis.__eraseAIExtractor.setSandboxBridge(async (kind, bytes) => {
      lastKind = kind;
      lastBytes = bytes;
      return { ok: true, text: "Employee SSN 123-45-6789 in cell A1" };
    });
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "payroll.xlsx",
        "PK\u0003\u0004 placeholder bytes",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    );
    expect(lastKind).toBe("xlsx");
    expect(lastBytes instanceof ArrayBuffer).toBe(true);
    expect(out.skipReason).toBeUndefined();
    expect(out.text).toContain("123-45-6789");
    expect(out.name).toBe("payroll.xlsx");
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("extracts PPTX text via the sandbox bridge and returns no skipReason", async () => {
    let lastKind = null;
    let lastBytes = null;
    globalThis.__eraseAIExtractor.setSandboxBridge(async (kind, bytes) => {
      lastKind = kind;
      lastBytes = bytes;
      return { ok: true, text: "Slide 1: Customer SSN 123-45-6789" };
    });
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "deck.pptx",
        "PK\u0003\u0004 placeholder bytes",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ),
    );
    expect(lastKind).toBe("pptx");
    expect(lastBytes instanceof ArrayBuffer).toBe(true);
    expect(out.skipReason).toBeUndefined();
    expect(out.text).toContain("123-45-6789");
    expect(out.name).toBe("deck.pptx");
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("falls back to skipReason for PPTX when the bridge fails (e.g. legacy .ppt or password-protected)", async () => {
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({
      ok: false,
      error: "not a PPTX (missing PK header)",
    }));
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "legacy.ppt",
        "\xD0\xCF\x11\xE0",
        "application/vnd.ms-powerpoint",
      ),
    );
    expect(out.skipReason).toBe(
      globalThis.__eraseAIExtractor.SKIP_REASONS.pptxNotYetSupported,
    );
    expect(out.text).toBe("");
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("truncates sandbox-extracted PPTX text at the 50 KB cap", async () => {
    const big = "a".repeat(60 * 1024);
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({ ok: true, text: big }));
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "huge.pptx",
        "PK\u0003\u0004",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ),
    );
    expect(out.skipReason).toBeUndefined();
    expect(out.truncated).toBe(true);
    expect(out.text.length).toBe(50 * 1024);
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("falls back to skipReason for XLSX when the bridge fails (e.g. legacy .xls or password-protected)", async () => {
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({
      ok: false,
      error: "not an XLSX (missing PK header)",
    }));
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "old.xls",
        "\xD0\xCF\x11\xE0",
        "application/vnd.ms-excel",
      ),
    );
    expect(out.skipReason).toBe(
      globalThis.__eraseAIExtractor.SKIP_REASONS.xlsxNotYetSupported,
    );
    expect(out.text).toBe("");
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("truncates sandbox-extracted XLSX text at the 50 KB cap", async () => {
    const big = "a".repeat(60 * 1024);
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({ ok: true, text: big }));
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile(
        "huge.xlsx",
        "PK\u0003\u0004",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    );
    expect(out.skipReason).toBeUndefined();
    expect(out.truncated).toBe(true);
    expect(out.text.length).toBe(50 * 1024);
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("treats an empty extraction result as a skipReason row (image-only PDF case)", async () => {
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({ ok: true, text: "   \n  " }));
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("scan.pdf", "%PDF-1.7", "application/pdf"),
    );
    expect(out.skipReason).toBe(
      globalThis.__eraseAIExtractor.SKIP_REASONS.pdfNotYetSupported,
    );
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
  });

  it("truncates sandbox-extracted text at the 50 KB cap (PDF path)", async () => {
    const big = "a".repeat(60 * 1024);
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({ ok: true, text: big }));
    const out = await globalThis.__eraseAIExtractor.extractText(
      makeFile("huge.pdf", "%PDF-1.7", "application/pdf"),
    );
    expect(out.skipReason).toBeUndefined();
    expect(out.truncated).toBe(true);
    expect(out.text.length).toBe(50 * 1024);
    globalThis.__eraseAIExtractor.setSandboxBridge(null);
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
