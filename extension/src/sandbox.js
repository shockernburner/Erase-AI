(() => {
  const REQ_TYPE = "ERASEAI_EXTRACT";

  function isRequest(data) {
    return (
      data &&
      typeof data === "object" &&
      data.type === REQ_TYPE &&
      typeof data.id === "string" &&
      (data.kind === "pdf" || data.kind === "docx") &&
      (data.bytes instanceof ArrayBuffer || ArrayBuffer.isView(data.bytes))
    );
  }

  async function handle(req) {
    const ext = globalThis.__eraseAISandboxExtractor;
    if (!ext) return { ok: false, error: "sandbox extractor not loaded" };
    try {
      const text = req.kind === "pdf"
        ? await ext.extractPdfText(req.bytes)
        : await ext.extractDocxText(req.bytes);
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
