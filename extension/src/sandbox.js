(() => {
  const REQ_TYPE = "ERASEAI_EXTRACT";

  const KINDS = new Set(["pdf", "docx", "xlsx", "pptx", "image", "archive"]);

  function isRequest(data) {
    return (
      data &&
      typeof data === "object" &&
      data.type === REQ_TYPE &&
      typeof data.id === "string" &&
      KINDS.has(data.kind) &&
      (data.bytes instanceof ArrayBuffer || ArrayBuffer.isView(data.bytes))
    );
  }

  async function handle(req) {
    const ext = globalThis.__eraseAISandboxExtractor;
    if (!ext) return { ok: false, error: "sandbox extractor not loaded" };
    try {
      // Archives expand into many inner files, so they answer with an
      // `entries` array rather than a single text blob.
      if (req.kind === "archive") {
        const entries = await ext.extractArchive(req.bytes, req.name);
        return { ok: true, entries: Array.isArray(entries) ? entries : [] };
      }
      let text;
      if (req.kind === "pdf") text = await ext.extractPdfText(req.bytes);
      else if (req.kind === "docx") text = await ext.extractDocxText(req.bytes);
      else if (req.kind === "xlsx") text = await ext.extractXlsxText(req.bytes);
      else if (req.kind === "pptx") text = await ext.extractPptxText(req.bytes);
      else text = await ext.extractImageText(req.bytes);
      return { ok: true, text: typeof text === "string" ? text : "" };
    } catch (err) {
      return { ok: false, error: (err && err.message) || String(err) };
    }
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!isRequest(data)) return;
    const port = event.ports && event.ports[0];
    if (!port) return;
    const result = await handle(data);
    try {
      port.postMessage({ id: data.id, ...result });
    } finally {
      try { port.close(); } catch { /* ignore */ }
    }
  });

  if (globalThis.__eraseAISandboxExtractor && window.parent !== window) {
    try {
      window.parent.postMessage({ type: "ERASEAI_SANDBOX_READY" }, "*");
    } catch { /* ignore */ }
  }
})();
