(() => {
  if (globalThis.__eraseAIExtractor) return;

  const MAX_EXTRACTED_BYTES = 50 * 1024;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  const PLAIN_TEXT_EXT = new Set([
    "txt", "md", "markdown", "csv", "tsv", "json", "log", "xml", "html",
    "htm", "yaml", "yml", "ini", "conf", "rtf", "tex", "sql",
  ]);
  const PDF_EXT = new Set(["pdf"]);
  const DOCX_EXT = new Set(["docx"]);
  const XLSX_EXT = new Set(["xlsx", "xls"]);
  const PPTX_EXT = new Set(["pptx", "ppt"]);
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
    pdfNotYetSupported: "couldn't read the PDF — review manually",
    docxNotYetSupported: "couldn't read the Word document — review manually",
    xlsxNotYetSupported: "couldn't read the spreadsheet — review manually",
    pptxNotYetSupported: "couldn't read the slide deck — review manually",
    image: "image — visual content not scanned, review manually",
    archive: "archive — contents not scanned, review manually",
    unsupported: "file type not supported, review manually",
    empty: "file is empty",
    readError: "couldn't read the file",
  };

  const SANDBOX_PATH = "src/sandbox.html";
  const SANDBOX_REQUEST_TIMEOUT_MS = 15000;
  const SANDBOX_LOAD_TIMEOUT_MS = 5000;

  let sandboxBridge = null;
  let sandboxState = null;

  function newRequestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "r-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
  }

  function ensureSandbox() {
    if (sandboxState) return sandboxState;
    if (typeof chrome === "undefined" || !chrome.runtime || typeof chrome.runtime.getURL !== "function") {
      return null;
    }
    if (typeof document === "undefined" || !document.body) return null;
    let url;
    try {
      url = chrome.runtime.getURL(SANDBOX_PATH);
    } catch {
      return null;
    }
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:absolute;width:1px;height:1px;border:0;left:-9999px;top:-9999px;visibility:hidden;";

    let markReady;
    const ready = new Promise((resolve, reject) => {
      const loadTimer = setTimeout(() => reject(new Error("sandbox iframe load timeout")), SANDBOX_LOAD_TIMEOUT_MS);
      markReady = () => { clearTimeout(loadTimer); resolve(); };
      iframe.addEventListener("load", () => { setTimeout(() => markReady(), 0); }, { once: true });
      iframe.addEventListener("error", () => reject(new Error("sandbox iframe failed to load")), { once: true });
    });

    const readyListener = (event) => {
      if (event.source !== iframe.contentWindow) return;
      if (event.data && event.data.type === "ERASEAI_SANDBOX_READY" && markReady) markReady();
    };
    window.addEventListener("message", readyListener, false);

    document.body.appendChild(iframe);
    sandboxState = { iframe, ready, readyListener };
    return sandboxState;
  }

  async function sandboxExtract(kind, arrayBuffer) {
    if (sandboxBridge) return sandboxBridge(kind, arrayBuffer);
    const state = ensureSandbox();
    if (!state) return { ok: false, error: "sandbox unavailable" };
    try {
      await state.ready;
    } catch (err) {
      return { ok: false, error: (err && err.message) || "sandbox not ready" };
    }
    const id = newRequestId();
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { channel.port1.close(); } catch { /* ignore */ }
        resolve(value);
      };
      const timer = setTimeout(
        () => finish({ ok: false, error: "sandbox request timed out" }),
        SANDBOX_REQUEST_TIMEOUT_MS,
      );
      channel.port1.onmessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== "object" || data.id !== id) return;
        finish(data);
      };
      try {
        state.iframe.contentWindow.postMessage(
          { type: "ERASEAI_EXTRACT", id, kind, bytes: arrayBuffer },
          "*",
          [channel.port2, arrayBuffer],
        );
      } catch (err) {
        finish({ ok: false, error: (err && err.message) || "postMessage failed" });
      }
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const value = reader.result instanceof ArrayBuffer ? reader.result : null;
          resolve({ ok: !!value, bytes: value });
        };
        reader.onerror = () => resolve({ ok: false });
        reader.onabort = () => resolve({ ok: false });
        reader.readAsArrayBuffer(file);
      } catch {
        resolve({ ok: false });
      }
    });
  }

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
    if (PPTX_EXT.has(ext) ||
      file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.type === "application/vnd.ms-powerpoint"
    ) return "pptx";
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
        reader.readAsText(file);
      } catch {
        resolve({ ok: false });
      }
    });
  }

  function truncateUtf8(text, maxBytes) {
    if (!text) return { text: "", truncated: false };
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
    if (kind === "pdf" || kind === "docx" || kind === "xlsx" || kind === "pptx") {
      return extractViaSandbox(file, kind, sizeBytes);
    }
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

  async function extractViaSandbox(file, kind, sizeBytes) {
    let fallbackReason;
    if (kind === "pdf") fallbackReason = SKIP_REASONS.pdfNotYetSupported;
    else if (kind === "docx") fallbackReason = SKIP_REASONS.docxNotYetSupported;
    else if (kind === "xlsx") fallbackReason = SKIP_REASONS.xlsxNotYetSupported;
    else fallbackReason = SKIP_REASONS.pptxNotYetSupported;
    const buf = await readAsArrayBuffer(file);
    if (!buf.ok || !buf.bytes) return makeSkipResult(file, SKIP_REASONS.readError);
    let result;
    try {
      result = await sandboxExtract(kind, buf.bytes);
    } catch {
      return makeSkipResult(file, fallbackReason);
    }
    if (!result || !result.ok || typeof result.text !== "string") {
      return makeSkipResult(file, fallbackReason);
    }
    const stripped = result.text.replace(/\s+/g, " ").trim();
    if (!stripped) return makeSkipResult(file, fallbackReason);
    const { text, truncated } = truncateUtf8(stripped, MAX_EXTRACTED_BYTES);
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
    setSandboxBridge(fn) {
      sandboxBridge = typeof fn === "function" ? fn : null;
    },
  };
})();
