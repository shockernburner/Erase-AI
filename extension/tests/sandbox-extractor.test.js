// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANDBOX_EXTRACTOR_SRC = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "sandbox-extractor.js"),
  "utf8",
);

beforeAll(() => {
  // Small archive guards so the zip-bomb tests stay cheap and deterministic.
  // MAX_EXTRACTED_BYTES is kept at the production 200 KB so no existing test
  // changes behavior. The module captures this once at eval time.
  globalThis.EraseAILimits = Object.freeze({
    MAX_EXTRACTED_BYTES: 200 * 1024,
    OCR_REQUEST_TIMEOUT_MS: 30000,
    ARCHIVE_MAX_ENTRIES: 5,
    ARCHIVE_MAX_TOTAL_BYTES: 1024 * 1024,
    ARCHIVE_MAX_ENTRY_BYTES: 512 * 1024,
    ARCHIVE_MAX_DEPTH: 1,
  });
  // eslint-disable-next-line no-eval
  (0, eval)(SANDBOX_EXTRACTOR_SRC);
});

beforeEach(() => {
  delete globalThis.pdfjsLib;
  delete globalThis.mammoth;
  delete globalThis.Tesseract;
});

const PDF_HEADER = new TextEncoder().encode("%PDF-1.7\n");
const DOCX_HEADER = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

describe("sandbox-extractor — globals", () => {
  it("exposes the public API on globalThis", () => {
    expect(globalThis.__eraseAISandboxExtractor).toBeTruthy();
    expect(typeof globalThis.__eraseAISandboxExtractor.extractDocxText).toBe("function");
    expect(typeof globalThis.__eraseAISandboxExtractor.extractPdfText).toBe("function");
    expect(typeof globalThis.__eraseAISandboxExtractor.extractXlsxText).toBe("function");
    expect(typeof globalThis.__eraseAISandboxExtractor.extractPptxText).toBe("function");
  });
});

describe("sandbox-extractor — extractPdfText() wrapper", () => {
  it("rejects buffers that don't start with %PDF-", async () => {
    const not = new TextEncoder().encode("hello world, definitely not a PDF");
    await expect(
      globalThis.__eraseAISandboxExtractor.extractPdfText(not),
    ).rejects.toThrow(/PDF/);
  });

  it("rejects when pdfjsLib isn't loaded", async () => {
    await expect(
      globalThis.__eraseAISandboxExtractor.extractPdfText(PDF_HEADER),
    ).rejects.toThrow(/pdfjsLib/);
  });

  it("calls pdfjsLib.getDocument with the file bytes and concatenates page text", async () => {
    let receivedArg = null;
    globalThis.pdfjsLib = {
      getDocument(arg) {
        receivedArg = arg;
        return {
          promise: Promise.resolve({
            numPages: 2,
            getPage: (n) => Promise.resolve({
              getTextContent: () => Promise.resolve({
                items: [
                  { str: "Page", hasEOL: false },
                  { str: String(n), hasEOL: true },
                  { str: "content", hasEOL: false },
                ],
              }),
              cleanup() {},
            }),
            destroy: () => Promise.resolve(),
          }),
        };
      },
    };
    const text = await globalThis.__eraseAISandboxExtractor.extractPdfText(PDF_HEADER);
    expect(receivedArg).toBeTruthy();
    expect(receivedArg.data instanceof Uint8Array).toBe(true);
    expect(receivedArg.disableFontFace).toBe(true);
    expect(receivedArg.isEvalSupported).toBe(false);
    expect(text).toMatch(/Page\s+1\b/);
    expect(text).toMatch(/Page\s+2\b/);
    expect(text).toMatch(/content/);
    expect(text.indexOf("Page 1")).toBeLessThan(text.indexOf("Page 2"));
  });

  it("propagates pdf.js load errors", async () => {
    globalThis.pdfjsLib = {
      getDocument() {
        return { promise: Promise.reject(new Error("InvalidPDFException: Invalid PDF structure.")) };
      },
    };
    await expect(
      globalThis.__eraseAISandboxExtractor.extractPdfText(PDF_HEADER),
    ).rejects.toThrow(/Invalid PDF/);
  });
});

describe("sandbox-extractor — extractDocxText() wrapper", () => {
  it("rejects buffers without a PK header", async () => {
    const not = new TextEncoder().encode("definitely not a zip");
    await expect(
      globalThis.__eraseAISandboxExtractor.extractDocxText(not),
    ).rejects.toThrow(/DOCX/);
  });

  it("rejects when mammoth isn't loaded", async () => {
    await expect(
      globalThis.__eraseAISandboxExtractor.extractDocxText(DOCX_HEADER),
    ).rejects.toThrow(/mammoth/);
  });

  it("calls mammoth.extractRawText with an ArrayBuffer and returns its value", async () => {
    let received = null;
    globalThis.mammoth = {
      extractRawText(arg) {
        received = arg;
        return Promise.resolve({ value: "Employee SSN: 123-45-6789" });
      },
    };
    const text = await globalThis.__eraseAISandboxExtractor.extractDocxText(DOCX_HEADER);
    expect(received).toBeTruthy();
    expect(received.arrayBuffer instanceof ArrayBuffer).toBe(true);
    expect(text).toBe("Employee SSN: 123-45-6789");
  });
});

describe("sandbox-extractor — pdf.js integration with a redacted-sample PDF", () => {
  let pdfjsLib;
  beforeAll(async () => {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
  });
  beforeEach(() => {
    globalThis.pdfjsLib = pdfjsLib;
  });

  it("extracts literal-string text from a real PDF", async () => {
    const stream =
      "BT\n/F1 12 Tf\n72 700 Td\n" +
      "(REDACTED SAMPLE \\(employee record\\)) Tj\n" +
      "0 -14 Td\n" +
      "(SSN: 555-12-3456 phone 555-867-5309) Tj\n" +
      "ET\n";
    const bytes = buildPdfBytes(stream);
    const text = await globalThis.__eraseAISandboxExtractor.extractPdfText(bytes);
    expect(text).toMatch(/REDACTED SAMPLE/);
    expect(text).toMatch(/555-12-3456/);
    expect(text).toMatch(/555-867-5309/);
  });

  it("extracts text from a hex-string PDF", async () => {
    const stream =
      "BT\n/F1 12 Tf\n72 700 Td\n" +
      "<48656c6c6f20776f726c64> Tj\n" +
      "ET\n";
    const bytes = buildPdfBytes(stream);
    const text = await globalThis.__eraseAISandboxExtractor.extractPdfText(bytes);
    expect(text).toMatch(/Hello world/i);
  });

  it("extracts text from a TJ kern array", async () => {
    const stream =
      "BT\n/F1 12 Tf\n72 700 Td\n" +
      "[(Hel) -120 (lo) 0 ( wor) -50 (ld)] TJ\n" +
      "ET\n";
    const bytes = buildPdfBytes(stream);
    const text = await globalThis.__eraseAISandboxExtractor.extractPdfText(bytes);
    expect(text.replace(/\s+/g, "")).toMatch(/Helloworld/);
  });

  it("decompresses a FlateDecode content stream", async () => {
    const stream =
      "BT\n/F1 12 Tf\n72 700 Td\n" +
      "(Confidential SSN 444-22-1111 inside flate stream) Tj\n" +
      "ET\n";
    const bytes = await buildPdfBytes(stream, { compressed: true });
    const text = await globalThis.__eraseAISandboxExtractor.extractPdfText(bytes);
    expect(text).toMatch(/Confidential/);
    expect(text).toMatch(/444-22-1111/);
  });

  it("returns an empty string for a content stream with no text-show ops", async () => {
    const stream = "q\n100 0 0 100 0 0 cm\nQ\n";
    const bytes = buildPdfBytes(stream);
    const text = await globalThis.__eraseAISandboxExtractor.extractPdfText(bytes);
    expect(text).toBe("");
  });
});

describe("sandbox-extractor — extractXlsxText() with stored-mode fixtures", () => {
  it("rejects buffers without a PK header", async () => {
    const not = new TextEncoder().encode("definitely not a zip");
    await expect(
      globalThis.__eraseAISandboxExtractor.extractXlsxText(not),
    ).rejects.toThrow(/XLSX/);
  });

  it("extracts an SSN from a sharedStrings entry", async () => {
    const bytes = await buildXlsxBytes({
      sharedStrings: ["Employee SSN", "123-45-6789", "unrelated header"],
      sheets: [
        // Sheet1 references the shared strings — the cell tags themselves
        // hold no plaintext, so extraction must read sharedStrings.xml.
        [
          [{ t: "s", v: 0 }, { t: "s", v: 1 }],
          [{ t: "s", v: 2 }, { v: 42 }],
        ],
      ],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractXlsxText(bytes);
    expect(text).toMatch(/Employee SSN/);
    expect(text).toMatch(/123-45-6789/);
    expect(text).toMatch(/unrelated header/);
  });

  it("extracts inline strings from a sheet (no sharedStrings.xml)", async () => {
    const bytes = await buildXlsxBytes({
      sharedStrings: null,
      sheets: [
        [
          [{ inline: "Customer email" }, { inline: "carol@example.com" }],
          [{ inline: "Phone" }, { inline: "555-867-5309" }],
        ],
      ],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractXlsxText(bytes);
    expect(text).toMatch(/Customer email/);
    expect(text).toMatch(/carol@example\.com/);
    expect(text).toMatch(/555-867-5309/);
  });

  it("decodes XML entities and preserves whitespace inside <t>", async () => {
    const bytes = await buildXlsxBytes({
      sharedStrings: ["A &amp; B Co.", "  spaced  "],
      sheets: [[[{ t: "s", v: 0 }, { t: "s", v: 1 }]]],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractXlsxText(bytes);
    expect(text).toMatch(/A & B Co\./);
    expect(text).toMatch(/spaced/);
  });

  it("walks every sheet in workbook order", async () => {
    const bytes = await buildXlsxBytes({
      sharedStrings: null,
      sheets: [
        [[{ inline: "first-sheet-marker" }]],
        [[{ inline: "second-sheet-marker" }]],
        [[{ inline: "third-sheet-marker" }]],
      ],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractXlsxText(bytes);
    expect(text).toMatch(/first-sheet-marker/);
    expect(text).toMatch(/second-sheet-marker/);
    expect(text).toMatch(/third-sheet-marker/);
    expect(text.indexOf("first-sheet-marker"))
      .toBeLessThan(text.indexOf("second-sheet-marker"));
    expect(text.indexOf("second-sheet-marker"))
      .toBeLessThan(text.indexOf("third-sheet-marker"));
  });
});

describe("sandbox-extractor — extractXlsxText() with DEFLATE-compressed entries", () => {
  it("decompresses sharedStrings.xml and sheet1.xml that were deflated", async () => {
    const bytes = await buildXlsxBytes({
      sharedStrings: ["Confidential SSN 444-22-1111 inside flate stream"],
      sheets: [[[{ t: "s", v: 0 }]]],
      compressed: true,
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractXlsxText(bytes);
    expect(text).toMatch(/Confidential/);
    expect(text).toMatch(/444-22-1111/);
  });
});

describe("sandbox-extractor — extractPptxText() with stored-mode fixtures", () => {
  it("rejects buffers without a PK header", async () => {
    const not = new TextEncoder().encode("definitely not a zip");
    await expect(
      globalThis.__eraseAISandboxExtractor.extractPptxText(not),
    ).rejects.toThrow(/PPTX/);
  });

  it("extracts an SSN from a slide body", async () => {
    const bytes = await buildPptxBytes({
      slides: [
        ["Quarterly Review", "Employee SSN 123-45-6789 in slide body"],
      ],
      notes: [],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractPptxText(bytes);
    expect(text).toMatch(/Quarterly Review/);
    expect(text).toMatch(/123-45-6789/);
  });

  it("extracts an SSN from speaker notes", async () => {
    const bytes = await buildPptxBytes({
      slides: [["Title only"]],
      notes: [["Reminder: customer SSN 555-12-3456 — do not share"]],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractPptxText(bytes);
    expect(text).toMatch(/555-12-3456/);
  });

  it("walks every slide in deck order and includes notes after slides", async () => {
    const bytes = await buildPptxBytes({
      slides: [
        ["first-slide-marker"],
        ["second-slide-marker"],
        ["third-slide-marker"],
      ],
      notes: [["notes-marker-A"], ["notes-marker-B"], ["notes-marker-C"]],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractPptxText(bytes);
    expect(text).toMatch(/first-slide-marker/);
    expect(text).toMatch(/second-slide-marker/);
    expect(text).toMatch(/third-slide-marker/);
    expect(text).toMatch(/notes-marker-A/);
    expect(text.indexOf("first-slide-marker"))
      .toBeLessThan(text.indexOf("second-slide-marker"));
    expect(text.indexOf("second-slide-marker"))
      .toBeLessThan(text.indexOf("third-slide-marker"));
    expect(text.indexOf("third-slide-marker"))
      .toBeLessThan(text.indexOf("notes-marker-A"));
  });

  it("decodes XML entities inside <a:t>", async () => {
    const bytes = await buildPptxBytes({
      slides: [["A &amp; B Co. — quarterly &lt;draft&gt;"]],
      notes: [],
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractPptxText(bytes);
    expect(text).toMatch(/A & B Co\./);
    expect(text).toMatch(/<draft>/);
  });

  it("ignores plain <t> tags from non-DrawingML namespaces", async () => {
    // Only `<a:t>` (DrawingML) should be picked up — bare `<t>` runs in pptx
    // metadata files would just be noise.
    const slideXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"` +
      ` xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<p:cSld><p:spTree>` +
      `<p:sp><p:txBody><a:p><a:r><a:t>Real slide text 444-22-1111</a:t></a:r></a:p></p:txBody></p:sp>` +
      `</p:spTree></p:cSld>` +
      `<extras><t>Should not be picked up</t></extras>` +
      `</p:sld>`;
    const bytes = await buildZip([
      { name: "ppt/slides/slide1.xml", data: slideXml },
    ]);
    const text = await globalThis.__eraseAISandboxExtractor.extractPptxText(bytes);
    expect(text).toMatch(/Real slide text/);
    expect(text).toMatch(/444-22-1111/);
    expect(text).not.toMatch(/Should not be picked up/);
  });

  it("decompresses DEFLATE-compressed slide entries", async () => {
    const bytes = await buildPptxBytes({
      slides: [["Confidential SSN 444-22-1111 inside flate slide"]],
      notes: [],
      compressed: true,
    });
    const text = await globalThis.__eraseAISandboxExtractor.extractPptxText(bytes);
    expect(text).toMatch(/Confidential/);
    expect(text).toMatch(/444-22-1111/);
  });
});

describe("sandbox-extractor — mammoth integration with a real DOCX (SSN)", () => {
  let mammothShim;
  beforeAll(async () => {
    const m = await import("mammoth");
    const real = m.default || m;
    mammothShim = {
      extractRawText: ({ arrayBuffer }) =>
        real.extractRawText({ buffer: Buffer.from(arrayBuffer) }),
    };
  });
  beforeEach(() => {
    globalThis.mammoth = mammothShim;
  });

  it("extracts an SSN out of a single-paragraph .docx", async () => {
    const bytes = buildDocxBytes("Employee SSN: 123-45-6789");
    const text = await globalThis.__eraseAISandboxExtractor.extractDocxText(bytes);
    expect(text).toMatch(/Employee SSN: 123-45-6789/);
  });

  it("preserves paragraph order across multiple <w:p> blocks", async () => {
    const bytes = buildDocxBytes(
      "Employee Name: Alice Example\n" +
      "Address: 123 Main St, Springfield\n" +
      "SSN: 555-12-3456",
    );
    const text = await globalThis.__eraseAISandboxExtractor.extractDocxText(bytes);
    expect(text).toMatch(/Alice Example/);
    expect(text).toMatch(/Springfield/);
    expect(text).toMatch(/555-12-3456/);
    expect(text.indexOf("Alice Example")).toBeLessThan(text.indexOf("555-12-3456"));
  });
});

function crc32(bytes) {
  let table = crc32._table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c >>> 0;
    }
    crc32._table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildStoredZip(files) {
  const enc = new TextEncoder();
  const localChunks = [];
  const cdChunks = [];
  let offset = 0;
  let totalLocal = 0;
  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const data = file.data instanceof Uint8Array ? file.data : enc.encode(file.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const dvL = new DataView(local.buffer);
    dvL.setUint32(0, 0x04034b50, true);
    dvL.setUint16(4, 20, true);
    dvL.setUint16(6, 0, true);
    dvL.setUint16(8, 0, true);
    dvL.setUint16(10, 0, true);
    dvL.setUint16(12, 0, true);
    dvL.setUint32(14, crc, true);
    dvL.setUint32(18, data.length, true);
    dvL.setUint32(22, data.length, true);
    dvL.setUint16(26, nameBytes.length, true);
    dvL.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    localChunks.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const dvC = new DataView(central.buffer);
    dvC.setUint32(0, 0x02014b50, true);
    dvC.setUint16(4, 20, true);
    dvC.setUint16(6, 20, true);
    dvC.setUint16(8, 0, true);
    dvC.setUint16(10, 0, true);
    dvC.setUint16(12, 0, true);
    dvC.setUint16(14, 0, true);
    dvC.setUint32(16, crc, true);
    dvC.setUint32(20, data.length, true);
    dvC.setUint32(24, data.length, true);
    dvC.setUint16(28, nameBytes.length, true);
    dvC.setUint16(30, 0, true);
    dvC.setUint16(32, 0, true);
    dvC.setUint16(34, 0, true);
    dvC.setUint16(36, 0, true);
    dvC.setUint32(38, 0, true);
    dvC.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    cdChunks.push(central);

    offset += local.length;
    totalLocal += local.length;
  }

  const cdSize = cdChunks.reduce((a, c) => a + c.length, 0);
  const eocd = new Uint8Array(22);
  const dvE = new DataView(eocd.buffer);
  dvE.setUint32(0, 0x06054b50, true);
  dvE.setUint16(4, 0, true);
  dvE.setUint16(6, 0, true);
  dvE.setUint16(8, files.length, true);
  dvE.setUint16(10, files.length, true);
  dvE.setUint32(12, cdSize, true);
  dvE.setUint32(16, totalLocal, true);
  dvE.setUint16(20, 0, true);

  const total = totalLocal + cdSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of localChunks) { out.set(c, p); p += c.length; }
  for (const c of cdChunks) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}

async function deflateRaw(bytes) {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function buildZip(files, { compressed = false } = {}) {
  const enc = new TextEncoder();
  const localChunks = [];
  const cdChunks = [];
  let offset = 0;
  let totalLocal = 0;
  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const raw = file.data instanceof Uint8Array ? file.data : enc.encode(file.data);
    const crc = crc32(raw);
    const useDeflate = compressed && raw.length > 0;
    const stored = useDeflate ? await deflateRaw(raw) : raw;
    const method = useDeflate ? 8 : 0;

    const local = new Uint8Array(30 + nameBytes.length + stored.length);
    const dvL = new DataView(local.buffer);
    dvL.setUint32(0, 0x04034b50, true);
    dvL.setUint16(4, 20, true);
    dvL.setUint16(6, 0, true);
    dvL.setUint16(8, method, true);
    dvL.setUint16(10, 0, true);
    dvL.setUint16(12, 0, true);
    dvL.setUint32(14, crc, true);
    dvL.setUint32(18, stored.length, true);
    dvL.setUint32(22, raw.length, true);
    dvL.setUint16(26, nameBytes.length, true);
    dvL.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(stored, 30 + nameBytes.length);
    localChunks.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const dvC = new DataView(central.buffer);
    dvC.setUint32(0, 0x02014b50, true);
    dvC.setUint16(4, 20, true);
    dvC.setUint16(6, 20, true);
    dvC.setUint16(8, 0, true);
    dvC.setUint16(10, method, true);
    dvC.setUint16(12, 0, true);
    dvC.setUint16(14, 0, true);
    dvC.setUint32(16, crc, true);
    dvC.setUint32(20, stored.length, true);
    dvC.setUint32(24, raw.length, true);
    dvC.setUint16(28, nameBytes.length, true);
    dvC.setUint16(30, 0, true);
    dvC.setUint16(32, 0, true);
    dvC.setUint16(34, 0, true);
    dvC.setUint16(36, 0, true);
    dvC.setUint32(38, 0, true);
    dvC.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    cdChunks.push(central);

    offset += local.length;
    totalLocal += local.length;
  }

  const cdSize = cdChunks.reduce((a, c) => a + c.length, 0);
  const eocd = new Uint8Array(22);
  const dvE = new DataView(eocd.buffer);
  dvE.setUint32(0, 0x06054b50, true);
  dvE.setUint16(4, 0, true);
  dvE.setUint16(6, 0, true);
  dvE.setUint16(8, files.length, true);
  dvE.setUint16(10, files.length, true);
  dvE.setUint32(12, cdSize, true);
  dvE.setUint32(16, totalLocal, true);
  dvE.setUint16(20, 0, true);

  const total = totalLocal + cdSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of localChunks) { out.set(c, p); p += c.length; }
  for (const c of cdChunks) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}

function escapeXml(s) {
  return String(s)
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildSheetXml(rows) {
  const rowsXml = rows.map((cells, rIdx) => {
    const cellsXml = cells.map((cell, cIdx) => {
      const ref = colLetter(cIdx) + (rIdx + 1);
      if (cell.inline !== undefined) {
        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.inline)}</t></is></c>`;
      }
      if (cell.t === "s") {
        return `<c r="${ref}" t="s"><v>${cell.v}</v></c>`;
      }
      return `<c r="${ref}"><v>${cell.v}</v></c>`;
    }).join("");
    return `<row r="${rIdx + 1}">${cellsXml}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${rowsXml}</sheetData></worksheet>`;
}

function colLetter(i) {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildSharedStringsXml(strings) {
  const items = strings.map((s) => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `count="${strings.length}" uniqueCount="${strings.length}">${items}</sst>`;
}

function buildSlideXml(textRuns) {
  const runs = textRuns.map((t) =>
    `<a:p><a:r><a:t xml:space="preserve">${escapeXml(t)}</a:t></a:r></a:p>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"` +
    ` xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<p:cSld><p:spTree><p:sp><p:txBody>${runs}</p:txBody></p:sp></p:spTree></p:cSld>` +
    `</p:sld>`;
}

function buildNotesSlideXml(textRuns) {
  const runs = textRuns.map((t) =>
    `<a:p><a:r><a:t xml:space="preserve">${escapeXml(t)}</a:t></a:r></a:p>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"` +
    ` xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<p:cSld><p:spTree><p:sp><p:txBody>${runs}</p:txBody></p:sp></p:spTree></p:cSld>` +
    `</p:notes>`;
}

async function buildPptxBytes({ slides, notes, compressed = false }) {
  const files = [];
  slides.forEach((runs, idx) => {
    files.push({ name: `ppt/slides/slide${idx + 1}.xml`, data: buildSlideXml(runs) });
  });
  (notes || []).forEach((runs, idx) => {
    files.push({ name: `ppt/notesSlides/notesSlide${idx + 1}.xml`, data: buildNotesSlideXml(runs) });
  });
  return buildZip(files, { compressed });
}

async function buildXlsxBytes({ sharedStrings, sheets, compressed = false }) {
  const files = [];
  if (sharedStrings && sharedStrings.length) {
    files.push({ name: "xl/sharedStrings.xml", data: buildSharedStringsXml(sharedStrings) });
  }
  sheets.forEach((rows, idx) => {
    files.push({ name: `xl/worksheets/sheet${idx + 1}.xml`, data: buildSheetXml(rows) });
  });
  return buildZip(files, { compressed });
}

function buildDocxBytes(plainBodyText) {
  const lines = plainBodyText.split("\n");
  const paragraphs = lines.map((line) => {
    const escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
  }).join("");
  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${paragraphs}</w:body></w:document>`;
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`;
  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;
  return buildStoredZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/document.xml", data: xml },
  ]);
}

function buildPdfBytes(contentStream, { compressed = false } = {}) {
  const enc = new TextEncoder();
  const buildWithStream = (streamBytes, lengthValue, filterValue) => {
    const offsets = [];
    let buf = "";
    function startObj(n) { offsets[n] = enc.encode(buf).length; }
    function append(s) { buf += s; }

    append("%PDF-1.4\n");
    startObj(1);
    append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    startObj(2);
    append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    startObj(3);
    append(
      "3 0 obj\n" +
      "<< /Type /Page /Parent 2 0 R /Resources << >> " +
      "/MediaBox [0 0 612 792] /Contents 4 0 R >>\n" +
      "endobj\n",
    );
    startObj(4);
    append("4 0 obj\n");
    append("<< /Length " + lengthValue);
    if (filterValue) append(" /Filter " + filterValue);
    append(" >>\nstream\n");
    const prefixBytes = enc.encode(buf);
    buf = "";
    append("\nendstream\nendobj\n");
    const suffixHead = enc.encode(buf);
    buf = "";
    const beforeXref = prefixBytes.length + streamBytes.length + suffixHead.length;
    const xrefOffset = beforeXref;
    append("xref\n0 5\n");
    append("0000000000 65535 f \n");
    for (let i = 1; i <= 4; i += 1) {
      append(offsets[i].toString().padStart(10, "0") + " 00000 n \n");
    }
    append("trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n");
    const tail = enc.encode(buf);

    const out = new Uint8Array(beforeXref + tail.length);
    out.set(prefixBytes, 0);
    out.set(streamBytes, prefixBytes.length);
    out.set(suffixHead, prefixBytes.length + streamBytes.length);
    out.set(tail, beforeXref);
    return out;
  };

  if (!compressed) {
    const streamBytes = enc.encode(contentStream);
    return buildWithStream(streamBytes, streamBytes.length, null);
  }

  return (async () => {
    const cs = new CompressionStream("deflate");
    const writer = cs.writable.getWriter();
    writer.write(enc.encode(contentStream));
    writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    const compressedBytes = new Uint8Array(buf);
    return buildWithStream(compressedBytes, compressedBytes.length, "/FlateDecode");
  })();
}

// ---------------------------------------------------------------------------
// Tar / gzip fixture builders (the zip builders above are reused as-is).
// ---------------------------------------------------------------------------

function octalField(n, len) {
  // POSIX numeric tar fields: octal digits, zero-padded, NUL-terminated.
  const s = n.toString(8);
  return s.padStart(len - 1, "0") + "\0";
}

function buildTar(files) {
  const enc = new TextEncoder();
  const blocks = [];
  for (const f of files) {
    const data = f.data instanceof Uint8Array ? f.data : enc.encode(f.data);
    const header = new Uint8Array(512);
    header.set(enc.encode(f.name).subarray(0, 100), 0);
    header.set(enc.encode("0000644\0"), 100); // mode
    header.set(enc.encode("0000000\0"), 108); // uid
    header.set(enc.encode("0000000\0"), 116); // gid
    header.set(enc.encode(octalField(data.length, 12)), 124); // size
    header.set(enc.encode("00000000000\0"), 136); // mtime
    header[156] = 0x30; // typeflag '0' (regular file)
    header.set(enc.encode("ustar\0"), 257); // magic
    header.set(enc.encode("00"), 263); // version
    // checksum: spaces, then octal of the byte sum (parser ignores it, but
    // keep it well-formed).
    for (let i = 148; i < 156; i += 1) header[i] = 0x20;
    let sum = 0;
    for (let i = 0; i < 512; i += 1) sum += header[i];
    header.set(enc.encode(sum.toString(8).padStart(6, "0") + "\0 "), 148);
    blocks.push(header);
    const padded = new Uint8Array(Math.ceil(data.length / 512) * 512);
    padded.set(data, 0);
    blocks.push(padded);
  }
  blocks.push(new Uint8Array(512));
  blocks.push(new Uint8Array(512));
  const total = blocks.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const b of blocks) { out.set(b, p); p += b.length; }
  return out;
}

async function gzip(bytes) {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes));
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

// Builds a ZIP where each entry may carry adversarial overrides:
//   compressed: DEFLATE the data (method 8)
//   fakeUncompressedSize: value written to the local + central size fields,
//     decoupled from the real data length, to simulate a lying directory
//   gpFlag: general-purpose bit flag (bit 0 set => encrypted)
async function buildAdversarialZip(files) {
  const enc = new TextEncoder();
  const localChunks = [];
  const cdChunks = [];
  let offset = 0;
  let totalLocal = 0;
  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const raw = file.data instanceof Uint8Array ? file.data : enc.encode(file.data);
    const useDeflate = file.compressed && raw.length > 0;
    const stored = useDeflate ? await deflateRaw(raw) : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);
    const gpFlag = file.gpFlag || 0;
    const declared = typeof file.fakeUncompressedSize === "number"
      ? file.fakeUncompressedSize
      : raw.length;

    const local = new Uint8Array(30 + nameBytes.length + stored.length);
    const dvL = new DataView(local.buffer);
    dvL.setUint32(0, 0x04034b50, true);
    dvL.setUint16(4, 20, true);
    dvL.setUint16(6, gpFlag, true);
    dvL.setUint16(8, method, true);
    dvL.setUint32(14, crc, true);
    dvL.setUint32(18, stored.length, true);
    dvL.setUint32(22, declared, true);
    dvL.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(stored, 30 + nameBytes.length);
    localChunks.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const dvC = new DataView(central.buffer);
    dvC.setUint32(0, 0x02014b50, true);
    dvC.setUint16(4, 20, true);
    dvC.setUint16(6, 20, true);
    dvC.setUint16(8, gpFlag, true);
    dvC.setUint16(10, method, true);
    dvC.setUint32(16, crc, true);
    dvC.setUint32(20, stored.length, true);
    dvC.setUint32(24, declared, true);
    dvC.setUint16(28, nameBytes.length, true);
    dvC.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    cdChunks.push(central);

    offset += local.length;
    totalLocal += local.length;
  }

  const cdSize = cdChunks.reduce((a, c) => a + c.length, 0);
  const eocd = new Uint8Array(22);
  const dvE = new DataView(eocd.buffer);
  dvE.setUint32(0, 0x06054b50, true);
  dvE.setUint16(8, files.length, true);
  dvE.setUint16(10, files.length, true);
  dvE.setUint32(12, cdSize, true);
  dvE.setUint32(16, totalLocal, true);

  const total = totalLocal + cdSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of localChunks) { out.set(c, p); p += c.length; }
  for (const c of cdChunks) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}

function byName(entries, name) {
  return entries.find((e) => e.name === name);
}

describe("sandbox-extractor — extractImageText() OCR", () => {
  it("rejects buffers that are too short to be an image", async () => {
    await expect(
      globalThis.__eraseAISandboxExtractor.extractImageText(new Uint8Array([1, 2, 3])),
    ).rejects.toThrow(/image/);
  });

  it("rejects when Tesseract isn't loaded", async () => {
    const bytes = new Uint8Array(16);
    await expect(
      globalThis.__eraseAISandboxExtractor.extractImageText(bytes),
    ).rejects.toThrow(/Tesseract/);
  });

  it("passes the image to Tesseract.recognize and returns normalized text", async () => {
    let recognizeCalled = false;
    globalThis.Tesseract = {
      recognize: async () => {
        recognizeCalled = true;
        return { data: { text: "  Customer  SSN\n123-45-6789  \n" } };
      },
    };
    const bytes = new Uint8Array(32);
    const text = await globalThis.__eraseAISandboxExtractor.extractImageText(bytes);
    expect(recognizeCalled).toBe(true);
    expect(text).toBe("Customer SSN 123-45-6789");
  });
});

describe("sandbox-extractor — extractArchive() ZIP enumeration", () => {
  it("returns one entry per inner file with extracted text", async () => {
    const zip = await buildZip([
      { name: "q2/payroll.csv", data: "name,ssn\nAlice,123-45-6789\n" },
      { name: "readme.txt", data: "internal — do not share" },
    ]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "bundle.zip");
    expect(entries).toHaveLength(2);
    const csv = byName(entries, "q2/payroll.csv");
    expect(csv.text).toMatch(/123-45-6789/);
    expect(csv.skipReason).toBeUndefined();
    expect(byName(entries, "readme.txt").text).toMatch(/do not share/);
  });

  it("OCRs an image stored inside the archive", async () => {
    globalThis.Tesseract = {
      recognize: async () => ({ data: { text: "Screenshot SSN 555-12-3456" } }),
    };
    const png = new Uint8Array(32);
    png.set([0x89, 0x50, 0x4e, 0x47], 0);
    const zip = await buildZip([{ name: "screenshot.png", data: png }]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "shots.zip");
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("screenshot.png");
    expect(entries[0].text).toMatch(/555-12-3456/);
  });

  it("skips junk entries (directories, __MACOSX, .DS_Store)", async () => {
    const zip = await buildZip([
      { name: "docs/", data: "" },
      { name: "__MACOSX/x", data: "junk" },
      { name: ".DS_Store", data: "junk" },
      { name: "real.txt", data: "ssn 123-45-6789" },
    ]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "msgs.zip");
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("real.txt");
  });

  it("marks unsupported inner file types with entryUnsupported", async () => {
    const zip = await buildZip([{ name: "weird.xyz", data: "mystery bytes" }]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "x.zip");
    expect(entries).toHaveLength(1);
    expect(entries[0].skipReason).toMatch(/not supported/);
  });

  it("reports entryNoText for an inner file with only whitespace", async () => {
    const zip = await buildZip([{ name: "blank.txt", data: "   \n   " }]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "blank.zip");
    expect(entries[0].skipReason).toMatch(/no readable text/);
  });
});

describe("sandbox-extractor — extractArchive() TAR and GZIP", () => {
  it("enumerates a tar's members by magic-byte detection", async () => {
    const tar = buildTar([
      { name: "a.csv", data: "ssn 123-45-6789" },
      { name: "b.txt", data: "hello world" },
    ]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(tar, "bundle.tar");
    expect(entries).toHaveLength(2);
    expect(byName(entries, "a.csv").text).toMatch(/123-45-6789/);
    expect(byName(entries, "b.txt").text).toMatch(/hello world/);
  });

  it("decompresses a .tar.gz and enumerates its members", async () => {
    const tar = buildTar([{ name: "secret.csv", data: "ssn 444-22-1111" }]);
    const gz = await gzip(tar);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(gz, "bundle.tar.gz");
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("secret.csv");
    expect(entries[0].text).toMatch(/444-22-1111/);
  });

  it("treats a single-file gzip as one member named after the archive", async () => {
    const gz = await gzip("ssn 555-12-3456 in a plain gzip");
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(gz, "notes.txt.gz");
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("notes.txt");
    expect(entries[0].text).toMatch(/555-12-3456/);
  });
});

describe("sandbox-extractor — extractArchive() zip-bomb guards", () => {
  it("flags .7z/.rar/encrypted archives as unsupported", async () => {
    const sevenZ = new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0, 0]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(sevenZ, "secret.7z");
    expect(entries).toHaveLength(1);
    expect(entries[0].skipReason).toMatch(/not supported/);
  });

  it("stops after ARCHIVE_MAX_ENTRIES and appends a tooManyFiles row", async () => {
    const files = [];
    for (let i = 0; i < 6; i += 1) files.push({ name: `f${i}.txt`, data: `value ${i}` });
    const zip = await buildZip(files);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "many.zip");
    expect(entries.some((e) => e.skipReason && /too many files/.test(e.skipReason))).toBe(true);
    expect(entries.filter((e) => !e.skipReason)).toHaveLength(5);
  });

  it("flags an inner file over ARCHIVE_MAX_ENTRY_BYTES as entryTooLarge", async () => {
    const big = "a".repeat(600 * 1024); // > 512 KB
    const zip = await buildZip([{ name: "huge.txt", data: big }]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "huge.zip");
    expect(entries).toHaveLength(1);
    expect(entries[0].skipReason).toMatch(/too large/);
  });

  it("stops once the cumulative size exceeds ARCHIVE_MAX_TOTAL_BYTES", async () => {
    const chunk = "a".repeat(400 * 1024); // 3 × 400 KB = 1.2 MB > 1 MB cap
    const zip = await buildZip([
      { name: "one.txt", data: chunk },
      { name: "two.txt", data: chunk },
      { name: "three.txt", data: chunk },
    ]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "total.zip");
    expect(entries.some((e) => e.skipReason && /scan size limit/.test(e.skipReason))).toBe(true);
  });

  it("flags nested archives deeper than ARCHIVE_MAX_DEPTH as tooDeep", async () => {
    // depth cap is 1 in tests: outer → mid.zip (depth 1, ok) → deep.zip (depth 2, blocked).
    const deep = await buildZip([{ name: "leaf.csv", data: "ssn 123-45-6789" }]);
    const mid = await buildZip([{ name: "deep.zip", data: deep }]);
    const outer = await buildZip([{ name: "mid.zip", data: mid }]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(outer, "outer.zip");
    expect(entries.some((e) => e.skipReason && /too deep/.test(e.skipReason))).toBe(true);
  });

  it("expands a one-level nested archive and prefixes inner names", async () => {
    const inner = await buildZip([{ name: "secret.csv", data: "ssn 444-22-1111" }]);
    const outer = await buildZip([{ name: "inner.zip", data: inner }]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(outer, "outer.zip");
    const leaf = entries.find((e) => /secret\.csv/.test(e.name));
    expect(leaf).toBeTruthy();
    expect(leaf.name).toBe("inner.zip → secret.csv");
    expect(leaf.text).toMatch(/444-22-1111/);
  });
});

describe("sandbox-extractor — adversarial decompression hardening", () => {
  it("aborts a DEFLATE entry whose real inflate blows past the entry cap even when the central directory lies about its size", async () => {
    // Declared size is a tiny 10 bytes, but the entry actually inflates to
    // 600 KB (> the 512 KB entry cap). The guard must trust the actual stream,
    // not the metadata, and stop the inflate.
    const bomb = "a".repeat(600 * 1024);
    const zip = await buildAdversarialZip([
      { name: "lies.txt", data: bomb, compressed: true, fakeUncompressedSize: 10 },
    ]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "lies.zip");
    expect(entries).toHaveLength(1);
    expect(entries[0].skipReason).toMatch(/too large/);
    expect(entries[0].text).toBeUndefined();
  });

  it("aborts a gzip bomb that would inflate past the total cap instead of materializing it", async () => {
    // 2 MB of repetitive bytes compress to a tiny .gz but inflate past the
    // 1 MB total cap; gunzip must abort mid-stream rather than allocate it all.
    const bomb = await gzip("a".repeat(2 * 1024 * 1024));
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(bomb, "bomb.gz");
    expect(entries).toHaveLength(1);
    expect(entries[0].skipReason).toBeTruthy();
    expect(entries[0].text).toBeUndefined();
  });

  it("flags an encrypted ZIP entry as unsupported via the general-purpose bit flag", async () => {
    const zip = await buildAdversarialZip([
      { name: "secret.csv", data: "ssn 123-45-6789", gpFlag: 0x0001 },
    ]);
    const entries = await globalThis.__eraseAISandboxExtractor.extractArchive(zip, "enc.zip");
    expect(entries).toHaveLength(1);
    expect(entries[0].skipReason).toMatch(/not supported/);
    expect(entries[0].text).toBeUndefined();
  });
});
