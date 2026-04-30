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

  globalThis.__eraseAISandboxExtractor = {
    extractDocxText,
    extractPdfText,
  };
})();
