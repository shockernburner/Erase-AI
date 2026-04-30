(() => {
  if (globalThis.__eraseAISandboxExtractor) return;

  const PDFJS_TIMEOUT_MS = 15000;

  function asUint8(buf) {
    if (buf instanceof Uint8Array) return buf;
    if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
    if (buf && typeof buf.byteLength === "number" && buf.buffer) {
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    throw new Error("expected ArrayBuffer or typed array");
  }

  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms);
      promise.then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); reject(e); },
      );
    });
  }

  function getPdfjsLib() {
    const lib = globalThis.pdfjsLib;
    if (!lib || typeof lib.getDocument !== "function") {
      throw new Error("pdfjsLib not loaded");
    }
    return lib;
  }

  function getMammoth() {
    const m = globalThis.mammoth;
    if (!m || typeof m.extractRawText !== "function") {
      throw new Error("mammoth not loaded");
    }
    return m;
  }

  async function extractPdfText(input) {
    const data = asUint8(input);
    if (data.length < 5) throw new Error("not a PDF (too short)");
    const head = String.fromCharCode(...data.subarray(0, 5));
    if (head !== "%PDF-") throw new Error("not a PDF (missing %PDF- header)");

    const pdfjsLib = getPdfjsLib();
    const task = pdfjsLib.getDocument({
      data,
      disableFontFace: true,
      isEvalSupported: false,
      useSystemFonts: false,
    });
    const pdf = await withTimeout(task.promise, PDFJS_TIMEOUT_MS, "pdf.js load");
    try {
      const out = [];
      const numPages = pdf.numPages;
      for (let i = 1; i <= numPages; i += 1) {
        const page = await pdf.getPage(i);
        try {
          const content = await page.getTextContent();
          const items = Array.isArray(content && content.items) ? content.items : [];
          const parts = [];
          for (const it of items) {
            if (it && typeof it.str === "string") parts.push(it.str);
            if (it && it.hasEOL) parts.push("\n");
          }
          if (parts.length) out.push(parts.join(" "));
        } finally {
          if (typeof page.cleanup === "function") page.cleanup();
        }
      }
      return out.join("\n").trim();
    } finally {
      try { await pdf.destroy(); } catch { /* ignore */ }
    }
  }

  async function extractDocxText(input) {
    const data = asUint8(input);
    if (data.length < 4) throw new Error("not a DOCX (too short)");
    if (data[0] !== 0x50 || data[1] !== 0x4b) throw new Error("not a DOCX (missing PK header)");

    const mammoth = getMammoth();
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return typeof result.value === "string" ? result.value : "";
  }

  function findEocd(data) {
    const minPos = Math.max(0, data.length - 22 - 65535);
    for (let i = data.length - 22; i >= minPos; i -= 1) {
      if (
        data[i] === 0x50 && data[i + 1] === 0x4b &&
        data[i + 2] === 0x05 && data[i + 3] === 0x06
      ) return i;
    }
    throw new Error("ZIP end-of-central-directory not found");
  }

  function parseZipCentralDirectory(data) {
    const eocd = findEocd(data);
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const totalEntries = dv.getUint16(eocd + 10, true);
    const cdOffset = dv.getUint32(eocd + 16, true);
    const entries = [];
    let p = cdOffset;
    const decoder = new TextDecoder();
    for (let i = 0; i < totalEntries; i += 1) {
      if (dv.getUint32(p, true) !== 0x02014b50) {
        throw new Error("bad ZIP central-directory signature");
      }
      const method = dv.getUint16(p + 10, true);
      const compressedSize = dv.getUint32(p + 20, true);
      const uncompressedSize = dv.getUint32(p + 24, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const localHeaderOffset = dv.getUint32(p + 42, true);
      const name = decoder.decode(data.subarray(p + 46, p + 46 + nameLen));
      entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  async function readZipEntry(data, entry) {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const lh = entry.localHeaderOffset;
    if (dv.getUint32(lh, true) !== 0x04034b50) {
      throw new Error("bad ZIP local-header signature");
    }
    const nameLen = dv.getUint16(lh + 26, true);
    const extraLen = dv.getUint16(lh + 28, true);
    const dataOffset = lh + 30 + nameLen + extraLen;
    const compressed = data.subarray(dataOffset, dataOffset + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method === 8) {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("DecompressionStream unavailable for DEFLATE entry");
      }
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(compressed);
      writer.close();
      const buf = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(buf);
    }
    throw new Error("unsupported ZIP compression method " + entry.method);
  }

  function decodeXmlEntities(s) {
    return s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
      .replace(/&amp;/g, "&");
  }

  function extractTContent(xml) {
    const out = [];
    const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const txt = decodeXmlEntities(m[1]);
      if (txt.length) out.push(txt);
    }
    return out.join(" ");
  }

  async function extractXlsxText(input) {
    const data = asUint8(input);
    if (data.length < 4) throw new Error("not an XLSX (too short)");
    if (data[0] !== 0x50 || data[1] !== 0x4b) throw new Error("not an XLSX (missing PK header)");

    const entries = parseZipCentralDirectory(data);
    const sharedEntry = entries.find((e) => e.name === "xl/sharedStrings.xml");
    const sheetEntries = entries
      .filter((e) => /^xl\/worksheets\/sheet[^/]+\.xml$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const decoder = new TextDecoder();
    const parts = [];

    if (sharedEntry) {
      const bytes = await readZipEntry(data, sharedEntry);
      const text = extractTContent(decoder.decode(bytes));
      if (text) parts.push(text);
    }

    for (const sheet of sheetEntries) {
      const bytes = await readZipEntry(data, sheet);
      const text = extractTContent(decoder.decode(bytes));
      if (text) parts.push(text);
    }

    return parts.join("\n").trim();
  }

  globalThis.__eraseAISandboxExtractor = {
    extractDocxText,
    extractPdfText,
    extractXlsxText,
  };
})();
