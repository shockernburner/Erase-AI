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
  // eslint-disable-next-line no-eval
  (0, eval)(SANDBOX_EXTRACTOR_SRC);
});

beforeEach(() => {
  delete globalThis.pdfjsLib;
  delete globalThis.mammoth;
});

const PDF_HEADER = new TextEncoder().encode("%PDF-1.7\n");
const DOCX_HEADER = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

describe("sandbox-extractor — globals", () => {
  it("exposes the public API on globalThis", () => {
    expect(globalThis.__eraseAISandboxExtractor).toBeTruthy();
    expect(typeof globalThis.__eraseAISandboxExtractor.extractDocxText).toBe("function");
    expect(typeof globalThis.__eraseAISandboxExtractor.extractPdfText).toBe("function");
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
