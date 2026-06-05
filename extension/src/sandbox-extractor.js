(() => {
  if (globalThis.__eraseAISandboxExtractor) return;

  // Caps + archive guards. limits-config.js loads this onto globalThis in the
  // real sandbox page; the unit tests eval this file in isolation, so fall
  // back to a local copy that MUST mirror src/limits-config.js.
  const LIMITS = globalThis.EraseAILimits || {
    MAX_EXTRACTED_BYTES: 200 * 1024,
    OCR_REQUEST_TIMEOUT_MS: 30000,
    ARCHIVE_MAX_ENTRIES: 200,
    ARCHIVE_MAX_TOTAL_BYTES: 50 * 1024 * 1024,
    ARCHIVE_MAX_ENTRY_BYTES: 10 * 1024 * 1024,
    ARCHIVE_MAX_DEPTH: 2,
  };

  const PDFJS_TIMEOUT_MS = 15000;
  const OCR_TIMEOUT_MS = LIMITS.OCR_REQUEST_TIMEOUT_MS || 30000;
  const MAX_EXTRACTED_BYTES = LIMITS.MAX_EXTRACTED_BYTES || 200 * 1024;

  // Reasons surfaced for individual entries inside an archive. They mirror the
  // "review manually" voice of file-extractor.js's SKIP_REASONS and are passed
  // straight through to the panel.
  const REASONS = {
    archiveUnsupported: "archive type not supported (.7z/.rar/encrypted) — review manually",
    archiveUnreadable: "couldn't open the archive — review manually",
    tooDeep: "nested archive too deep to scan — review manually",
    tooLarge: "archive contents exceed the scan size limit — review manually",
    tooManyFiles: "archive has too many files to scan — review manually",
    entryTooLarge: "a file inside the archive is too large to scan — review manually",
    entryUnsupported: "file type not supported — review manually",
    entryUnreadable: "couldn't read this file — review manually",
    entryNoText: "no readable text found — review manually",
  };

  const TEXT_EXT = new Set([
    "txt", "md", "markdown", "csv", "tsv", "json", "log", "xml", "html",
    "htm", "yaml", "yml", "ini", "conf", "rtf", "tex", "sql",
  ]);
  const PDF_EXT = new Set(["pdf"]);
  const DOCX_EXT = new Set(["docx"]);
  const XLSX_EXT = new Set(["xlsx"]);
  const PPTX_EXT = new Set(["pptx"]);
  const IMAGE_EXT = new Set([
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif",
  ]);
  const ARCHIVE_EXT = new Set(["zip", "tar", "gz", "tgz"]);

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

  function getExtension(name) {
    if (!name || typeof name !== "string") return "";
    const clean = name.split("/").pop();
    const dot = clean.lastIndexOf(".");
    if (dot < 0 || dot === clean.length - 1) return "";
    return clean.slice(dot + 1).toLowerCase();
  }

  function classifyName(name) {
    const ext = getExtension(name);
    if (PDF_EXT.has(ext)) return "pdf";
    if (DOCX_EXT.has(ext)) return "docx";
    if (XLSX_EXT.has(ext)) return "xlsx";
    if (PPTX_EXT.has(ext)) return "pptx";
    if (IMAGE_EXT.has(ext)) return "image";
    if (ARCHIVE_EXT.has(ext)) return "archive";
    if (TEXT_EXT.has(ext)) return "text";
    return "unknown";
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

  function getTesseract() {
    const T = globalThis.Tesseract;
    if (!T || typeof T.recognize !== "function") {
      throw new Error("Tesseract not loaded");
    }
    return T;
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

  // OCR an image's bytes with tesseract.js. The worker, wasm core, and
  // language data paths come from EraseAITesseractConfig (set in sandbox.html);
  // when absent (tests) tesseract.js falls back to its own defaults — but the
  // tests mock globalThis.Tesseract so the real worker never runs.
  async function extractImageText(input) {
    const data = asUint8(input);
    if (data.length < 8) throw new Error("not an image (too short)");
    const T = getTesseract();
    const cfg = globalThis.EraseAITesseractConfig || {};
    const blob = typeof Blob !== "undefined" ? new Blob([data]) : data;
    const result = await withTimeout(
      T.recognize(blob, cfg.lang || "eng", {
        workerPath: cfg.workerPath,
        corePath: cfg.corePath,
        langPath: cfg.langPath,
        gzip: cfg.gzip,
      }),
      OCR_TIMEOUT_MS,
      "OCR",
    );
    const text = result && result.data && typeof result.data.text === "string"
      ? result.data.text
      : "";
    return text.replace(/\s+/g, " ").trim();
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

  // Stream a DecompressionStream's output, aborting the moment the running
  // total exceeds `maxBytes`. This is the zip-bomb guard: a small compressed
  // payload that inflates to gigabytes is stopped mid-stream instead of being
  // fully materialized via Response().arrayBuffer(). Declared sizes from the
  // archive's metadata are NOT trusted — only the actual decompressed bytes.
  // The "decompressed size exceeds limit" message is recognized by callers so
  // the entry can be surfaced as entryTooLarge rather than a generic error.
  async function decompressBounded(compressed, format, maxBytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("DecompressionStream unavailable for " + format);
    }
    const cap = typeof maxBytes === "number" && maxBytes >= 0 ? maxBytes : Infinity;
    const ds = new DecompressionStream(format);
    const writer = ds.writable.getWriter();
    // Don't await these: when we abort by cancelling the reader below, the
    // pending write/close settle as rejections. Swallow them so they don't
    // surface as unhandled promise rejections.
    writer.write(compressed).catch(() => { /* aborted */ });
    writer.close().catch(() => { /* aborted */ });
    const reader = ds.readable.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > cap) {
        try { await reader.cancel(); } catch { /* ignore */ }
        throw new Error("decompressed size exceeds limit");
      }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let p = 0;
    for (const c of chunks) { out.set(c, p); p += c.length; }
    return out;
  }

  // `maxBytes` bounds decompression for the recursive archive path (where the
  // central-directory sizes are attacker-controlled). The office-document
  // extractors call without a bound to preserve their prior behavior.
  async function readZipEntry(data, entry, maxBytes) {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const lh = entry.localHeaderOffset;
    if (dv.getUint32(lh, true) !== 0x04034b50) {
      throw new Error("bad ZIP local-header signature");
    }
    // General-purpose bit-flag bit 0 set → entry is encrypted; we can't read it.
    if (dv.getUint16(lh + 6, true) & 0x0001) {
      throw new Error("encrypted ZIP entry unsupported");
    }
    const nameLen = dv.getUint16(lh + 26, true);
    const extraLen = dv.getUint16(lh + 28, true);
    const dataOffset = lh + 30 + nameLen + extraLen;
    const compressed = data.subarray(dataOffset, dataOffset + entry.compressedSize);
    if (entry.method === 0) {
      if (typeof maxBytes === "number" && compressed.length > maxBytes) {
        throw new Error("decompressed size exceeds limit");
      }
      return compressed;
    }
    if (entry.method === 8) {
      return decompressBounded(compressed, "deflate-raw", maxBytes);
    }
    throw new Error("unsupported ZIP compression method " + entry.method);
  }

  async function gunzip(data, maxBytes) {
    return decompressBounded(data, "gzip", maxBytes);
  }

  // Minimal POSIX/ustar tar reader: 512-byte headers, octal sizes, regular
  // files only (typeflag '0' or NUL). GNU/pax long-name extensions are not
  // handled — those entries simply surface under their truncated header name.
  function parseTar(data) {
    const entries = [];
    const dec = new TextDecoder();
    let off = 0;
    while (off + 512 <= data.length) {
      const block = data.subarray(off, off + 512);
      let allZero = true;
      for (let i = 0; i < 512; i += 1) { if (block[i] !== 0) { allZero = false; break; } }
      if (allZero) break;
      const name = dec.decode(block.subarray(0, 100)).replace(/\0.*$/, "");
      const prefix = dec.decode(block.subarray(345, 500)).replace(/\0.*$/, "");
      const sizeStr = dec.decode(block.subarray(124, 136)).replace(/[^0-7]/g, "");
      const size = sizeStr ? parseInt(sizeStr, 8) : 0;
      const typeflag = String.fromCharCode(block[156]);
      const full = prefix ? prefix + "/" + name : name;
      off += 512;
      if ((typeflag === "0" || typeflag === "\0" || typeflag === "") && name) {
        entries.push({ name: full, data: data.subarray(off, off + size) });
      }
      off += Math.ceil(size / 512) * 512;
    }
    return entries;
  }

  function isZip(data) {
    return data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b &&
      (data[2] === 0x03 || data[2] === 0x05 || data[2] === 0x07);
  }
  function isGzip(data) {
    return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
  }
  function isTar(data) {
    // "ustar" magic at byte 257.
    return data.length >= 263 &&
      data[257] === 0x75 && data[258] === 0x73 && data[259] === 0x74 &&
      data[260] === 0x61 && data[261] === 0x72;
  }
  function is7zOrRar(data) {
    // 7z: 37 7A BC AF 27 1C ; rar: 52 61 72 21 1A 07
    if (data.length >= 6 && data[0] === 0x37 && data[1] === 0x7a &&
      data[2] === 0xbc && data[3] === 0xaf && data[4] === 0x27 && data[5] === 0x1c) return true;
    if (data.length >= 4 && data[0] === 0x52 && data[1] === 0x61 &&
      data[2] === 0x72 && data[3] === 0x21) return true;
    return false;
  }

  function detectArchiveType(data, name) {
    if (is7zOrRar(data)) return "unsupported";
    if (isZip(data)) return "zip";
    if (isGzip(data)) return "gzip";
    if (isTar(data)) return "tar";
    const ext = getExtension(name);
    if (ext === "7z" || ext === "rar") return "unsupported";
    if (ext === "zip") return "zip";
    if (ext === "gz" || ext === "tgz") return "gzip";
    if (ext === "tar") return "tar";
    return "unknown";
  }

  function stripGzExt(name) {
    if (/\.tgz$/i.test(name)) return name.replace(/\.tgz$/i, ".tar");
    return name.replace(/\.gz$/i, "");
  }

  function isJunkEntry(name) {
    if (!name) return true;
    if (name.endsWith("/")) return true; // directory
    if (name.startsWith("__MACOSX/")) return true;
    const base = name.split("/").pop();
    if (base === ".DS_Store" || base === "" || base === "Thumbs.db") return true;
    return false;
  }

  function truncate(text) {
    if (!text) return { text: "", truncated: false };
    if (text.length <= MAX_EXTRACTED_BYTES) return { text, truncated: false };
    return { text: text.slice(0, MAX_EXTRACTED_BYTES), truncated: true };
  }

  // Extract readable text from a single in-archive member's bytes. Returns
  // { text, truncated } on success or { skipReason } when the member can't be
  // read or holds no text.
  async function extractMemberText(name, bytes) {
    const kind = classifyName(name);
    try {
      let raw = "";
      if (kind === "text") {
        raw = new TextDecoder().decode(bytes);
      } else if (kind === "pdf") {
        raw = await extractPdfText(bytes);
      } else if (kind === "docx") {
        raw = await extractDocxText(bytes);
      } else if (kind === "xlsx") {
        raw = await extractXlsxText(bytes);
      } else if (kind === "pptx") {
        raw = await extractPptxText(bytes);
      } else if (kind === "image") {
        raw = await extractImageText(bytes);
      } else {
        return { skipReason: REASONS.entryUnsupported };
      }
      const clean = typeof raw === "string" ? raw : "";
      if (!clean.trim()) return { skipReason: REASONS.entryNoText };
      return truncate(clean);
    } catch {
      return { skipReason: REASONS.entryUnreadable };
    }
  }

  // Recursively expand an archive's bytes, pushing one entry per contained
  // file onto `out`. `state` carries the cross-archive budget so nested
  // archives can't bypass the totals. `prefix` is the running label path.
  async function expandArchive(data, prefix, depth, state, out, archiveName) {
    const type = detectArchiveType(data, archiveName || prefix || "archive");
    if (type === "unsupported") {
      out.push({ name: prefix || "(archive)", skipReason: REASONS.archiveUnsupported });
      return;
    }

    let members;
    try {
      if (type === "zip") {
        const entries = parseZipCentralDirectory(data);
        members = entries.map((e) => ({
          name: e.name,
          size: e.uncompressedSize,
          read: () => readZipEntry(data, e, LIMITS.ARCHIVE_MAX_ENTRY_BYTES),
        }));
      } else if (type === "tar") {
        members = parseTar(data).map((e) => ({
          name: e.name, size: e.data.length, read: async () => e.data,
        }));
      } else if (type === "gzip") {
        const inner = await gunzip(data, LIMITS.ARCHIVE_MAX_TOTAL_BYTES);
        if (isTar(inner)) {
          members = parseTar(inner).map((e) => ({
            name: e.name, size: e.data.length, read: async () => e.data,
          }));
        } else {
          const gzName = stripGzExt(archiveName || prefix || "archive.gz").split("/").pop();
          members = [{ name: gzName || "archive", size: inner.length, read: async () => inner }];
        }
      } else {
        out.push({ name: prefix || "(archive)", skipReason: REASONS.archiveUnreadable });
        return;
      }
    } catch {
      out.push({ name: prefix || "(archive)", skipReason: REASONS.archiveUnreadable });
      return;
    }

    for (const member of members) {
      if (isJunkEntry(member.name)) continue;
      const label = prefix ? prefix + " → " + member.name : member.name;

      if (state.entryCount >= LIMITS.ARCHIVE_MAX_ENTRIES) {
        out.push({ name: prefix || "(archive)", skipReason: REASONS.tooManyFiles });
        return;
      }
      state.entryCount += 1;

      // Declared size is untrusted metadata; use it only as a fast pre-reject
      // for entries that already admit to being over the per-entry ceiling.
      const declared = typeof member.size === "number" ? member.size : 0;
      if (declared > LIMITS.ARCHIVE_MAX_ENTRY_BYTES) {
        out.push({ name: label, size: declared, skipReason: REASONS.entryTooLarge });
        continue;
      }

      const kind = classifyName(member.name);
      if (kind === "archive" && depth + 1 > LIMITS.ARCHIVE_MAX_DEPTH) {
        out.push({ name: label, size: declared, skipReason: REASONS.tooDeep });
        continue;
      }

      // Read the member's actual bytes. member.read() bounds decompression to
      // the per-entry ceiling, so a lying central-directory size cannot trigger
      // an unbounded inflate; an over-limit inflate throws "exceeds limit".
      let bytes;
      try {
        bytes = await member.read();
      } catch (e) {
        const msg = e ? String(e.message) : "";
        let reason = REASONS.entryUnreadable;
        if (/exceeds limit/.test(msg)) reason = REASONS.entryTooLarge;
        else if (/encrypted/.test(msg)) reason = REASONS.archiveUnsupported;
        out.push({ name: label, size: declared, skipReason: reason });
        continue;
      }

      // Authoritative checks against the ACTUAL decompressed byte count.
      const actual = bytes.length;
      if (actual > LIMITS.ARCHIVE_MAX_ENTRY_BYTES) {
        out.push({ name: label, size: actual, skipReason: REASONS.entryTooLarge });
        continue;
      }
      if (state.totalBytes + actual > LIMITS.ARCHIVE_MAX_TOTAL_BYTES) {
        out.push({ name: prefix || "(archive)", skipReason: REASONS.tooLarge });
        return;
      }
      state.totalBytes += actual;

      if (kind === "archive") {
        await expandArchive(bytes, label, depth + 1, state, out, member.name);
        continue;
      }

      const res = await extractMemberText(member.name, bytes);
      if (res.skipReason) {
        out.push({ name: label, size: actual, skipReason: res.skipReason });
      } else {
        out.push({ name: label, size: actual, text: res.text, truncated: res.truncated });
      }
    }
  }

  async function extractArchive(input, name) {
    const data = asUint8(input);
    const out = [];
    const state = { entryCount: 0, totalBytes: 0 };
    await expandArchive(data, "", 0, state, out, name || "archive");
    return out;
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

  function extractTagContent(xml, tagName) {
    const out = [];
    const re = new RegExp("<" + tagName + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tagName + ">", "g");
    let m;
    while ((m = re.exec(xml)) !== null) {
      const txt = decodeXmlEntities(m[1]);
      if (txt.length) out.push(txt);
    }
    return out.join(" ");
  }

  function extractTContent(xml) {
    return extractTagContent(xml, "t");
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

  async function extractPptxText(input) {
    const data = asUint8(input);
    if (data.length < 4) throw new Error("not a PPTX (too short)");
    if (data[0] !== 0x50 || data[1] !== 0x4b) throw new Error("not a PPTX (missing PK header)");

    const entries = parseZipCentralDirectory(data);
    const slideEntries = entries
      .filter((e) => /^ppt\/slides\/slide[^/]+\.xml$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const notesEntries = entries
      .filter((e) => /^ppt\/notesSlides\/notesSlide[^/]+\.xml$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const decoder = new TextDecoder();
    const parts = [];

    for (const slide of slideEntries) {
      const bytes = await readZipEntry(data, slide);
      const text = extractTagContent(decoder.decode(bytes), "a:t");
      if (text) parts.push(text);
    }

    for (const note of notesEntries) {
      const bytes = await readZipEntry(data, note);
      const text = extractTagContent(decoder.decode(bytes), "a:t");
      if (text) parts.push(text);
    }

    return parts.join("\n").trim();
  }

  globalThis.__eraseAISandboxExtractor = {
    extractDocxText,
    extractPdfText,
    extractXlsxText,
    extractPptxText,
    extractImageText,
    extractArchive,
    REASONS,
  };
})();
