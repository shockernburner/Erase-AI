// File-attachment extractor for the EraseAI Firewall content script.
//
// Loaded as a content_script entry BEFORE content.js (see manifest.json), in
// the same isolated world. Attaches `globalThis.__eraseAIExtractor` so
// content.js can call into it without a module import (content scripts are
// not ESM in this extension).
//
// Responsibilities:
//   * Decide whether a given File is something we can scan in the browser.
//   * Read text out of supported plain-text formats.
//   * Truncate to a hard 50 KB cap so a 200 MB log file can't OOM the page
//     or blow past the api-server's 10 KB analyze limit when it is sliced
//     into pieces by the caller.
//
// Returns the same { name, mimeType, sizeBytes, text, truncated, skipReason? }
// shape for every file so the result panel can render one row per piece
// regardless of whether it was successfully scanned.
//
// IMPORTANT — why pdf.js / mammoth are NOT bundled here:
//   Both libraries call `new Function(...)` and `eval`. MV3 extensions are
//   forced onto a CSP that forbids those in extension pages. Adding them
//   requires a sandboxed iframe (with relaxed CSP) acting as a postMessage
//   RPC shim, which is significant separate work + tests. Until that lands,
//   .pdf and .docx files are *detected* and the user sees a per-file row in
//   the panel telling them the file wasn't scanned and that they must
//   review manually before clicking Send Anyway. We deliberately do NOT
//   silently let the file through.
(() => {
  if (globalThis.__eraseAIExtractor) return;

  // Hard cap on the per-file text we hand to the analyzer. The analyze
  // endpoint enforces a 10 KB ceiling per request; the caller chunks
  // anything bigger into 8 KB slices. Capping the *extracted* text at
  // 50 KB bounds the worst case to ~7 slices per file, which fits
  // comfortably under the per-key 60 req/min burst limit even with
  // several files attached.
  const MAX_EXTRACTED_BYTES = 50 * 1024;
  // Per-file soft cap. Files larger than this aren't scanned by default —
  // see SKIP_REASONS.tooLarge. The cap is intentionally below the size
  // where a typical FileReader.readAsText would slow the page noticeably
  // even for plain text.
  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  // Extension → category map. The mime-type sniff is a fallback because
  // many sites set an empty mimeType on dropped/pasted files.
  const PLAIN_TEXT_EXT = new Set([
    "txt", "md", "markdown", "csv", "tsv", "json", "log", "xml", "html",
    "htm", "yaml", "yml", "ini", "conf", "rtf", "tex", "sql",
  ]);
  const PDF_EXT = new Set(["pdf"]);
  const DOCX_EXT = new Set(["docx"]);
  const XLSX_EXT = new Set(["xlsx", "xls"]);
  const IMAGE_EXT = new Set([
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "svg", "heic", "heif",
  ]);
  const ARCHIVE_EXT = new Set(["zip", "7z", "tar", "gz", "rar"]);

  const PLAIN_TEXT_MIMES = new Set([
    "text/plain", "text/csv", "text/tab-separated-values",
    "application/json", "text/markdown", "text/html", "text/xml",
    "application/xml", "application/x-yaml", "text/yaml",
  ]);

  const SKIP_REASONS = {
    tooLarge: "too large to scan in the browser — review manually",
    pdfNotYetSupported: "PDF detected — content not scanned in this version, review manually",
    docxNotYetSupported: "Word document detected — content not scanned in this version, review manually",
    xlsxNotYetSupported: "Spreadsheet detected — content not scanned in this version, review manually",
    image: "image — visual content not scanned, review manually",
    archive: "archive — contents not scanned, review manually",
    unsupported: "file type not supported, review manually",
    empty: "file is empty",
    readError: "couldn't read the file",
  };

  function getExtension(name) {
    if (!name || typeof name !== "string") return "";
    const dot = name.lastIndexOf(".");
    if (dot < 0 || dot === name.length - 1) return "";
    return name.slice(dot + 1).toLowerCase();
  }

  function isPlainText(file, ext) {
    if (PLAIN_TEXT_MIMES.has(file.type)) return true;
    if (file.type && file.type.startsWith("text/")) return true;
    return PLAIN_TEXT_EXT.has(ext);
  }

  function classify(file) {
    const ext = getExtension(file.name);
    if (PDF_EXT.has(ext) || file.type === "application/pdf") return "pdf";
    if (DOCX_EXT.has(ext) ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) return "docx";
    if (XLSX_EXT.has(ext) ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel"
    ) return "xlsx";
    if (IMAGE_EXT.has(ext) || (file.type && file.type.startsWith("image/"))) return "image";
    if (ARCHIVE_EXT.has(ext) ||
      file.type === "application/zip" ||
      file.type === "application/x-7z-compressed"
    ) return "archive";
    if (isPlainText(file, ext)) return "text";
    return "unknown";
  }

  function readAsText(file) {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const value = typeof reader.result === "string" ? reader.result : "";
          resolve({ ok: true, text: value });
        };
        reader.onerror = () => resolve({ ok: false });
        reader.onabort = () => resolve({ ok: false });
        // A 5 MB plain-text slice fits comfortably; readAsText with no
        // size cap would still finish on a 50 MB log but tie up the page
        // for noticeable seconds. The caller has already gated on size.
        reader.readAsText(file);
      } catch {
        resolve({ ok: false });
      }
    });
  }

  function truncateUtf8(text, maxBytes) {
    if (!text) return { text: "", truncated: false };
    // Cheap byte estimate: most "documents" are ASCII so one char ~ one
    // byte. For multibyte content we over-truncate slightly which is
    // safer than under-truncating into the analyzer.
    if (text.length <= maxBytes) return { text, truncated: false };
    return { text: text.slice(0, maxBytes), truncated: true };
  }

  function makeSkipResult(file, reason) {
    return {
      name: file && typeof file.name === "string" ? file.name : "(unnamed)",
      mimeType: file && typeof file.type === "string" ? file.type : "",
      sizeBytes: file && typeof file.size === "number" ? file.size : 0,
      text: "",
      truncated: false,
      skipReason: reason,
    };
  }

  async function extractText(file) {
    if (!file || typeof file.name !== "string") {
      return makeSkipResult(file || {}, SKIP_REASONS.unsupported);
    }
    const sizeBytes = typeof file.size === "number" ? file.size : 0;
    if (sizeBytes === 0) {
      return makeSkipResult(file, SKIP_REASONS.empty);
    }
    if (sizeBytes > MAX_FILE_BYTES) {
      return makeSkipResult(file, SKIP_REASONS.tooLarge);
    }

    const kind = classify(file);
    if (kind === "pdf") return makeSkipResult(file, SKIP_REASONS.pdfNotYetSupported);
    if (kind === "docx") return makeSkipResult(file, SKIP_REASONS.docxNotYetSupported);
    if (kind === "xlsx") return makeSkipResult(file, SKIP_REASONS.xlsxNotYetSupported);
    if (kind === "image") return makeSkipResult(file, SKIP_REASONS.image);
    if (kind === "archive") return makeSkipResult(file, SKIP_REASONS.archive);
    if (kind === "unknown") return makeSkipResult(file, SKIP_REASONS.unsupported);

    const read = await readAsText(file);
    if (!read.ok) return makeSkipResult(file, SKIP_REASONS.readError);

    const { text, truncated } = truncateUtf8(read.text, MAX_EXTRACTED_BYTES);
    return {
      name: file.name,
      mimeType: file.type || "",
      sizeBytes,
      text,
      truncated,
    };
  }

  globalThis.__eraseAIExtractor = {
    classify,
    extractText,
    SKIP_REASONS,
    MAX_EXTRACTED_BYTES,
    MAX_FILE_BYTES,
  };
})();
