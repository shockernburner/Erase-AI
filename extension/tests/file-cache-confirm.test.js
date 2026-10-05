// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Send-flow regression tests for task #142, split out into their own jsdom
// realm so the document-level listeners installed by previous loadEraseAI()
// calls in file-cache.test.js don't replay stale fileCache entries into
// these scenarios.
//
// Covers:
//   * Safe prompt + safe text attachment routes through the existing
//     "All clear" auto-dismiss confirmation card (NOT the manual warning
//     panel) and still shows the file row by name.
//   * Risky prompt + risky attachment shows the "Sanitize Prompt" button
//     (not "Sanitize & Send"), and clicking it renders an action-needed
//     notice instead of morphing "Send Anyway" into "Send Sanitized" —
//     because the attached file is still in the composer and would be
//     exfiltrated if the sanitize action implied a safe send.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const CONFIG_SRC = fs.readFileSync(path.join(SRC_DIR, "concurrency-config.js"), "utf8");
const EXTRACTOR_SRC = fs.readFileSync(path.join(SRC_DIR, "file-extractor.js"), "utf8");
const CONTENT_SRC = fs.readFileSync(path.join(SRC_DIR, "content.js"), "utf8");

function makeFakePort({ onPosted } = {}) {
  const listeners = { message: [], disconnect: [] };
  let disconnected = false;
  const port = {
    name: "analyze",
    postMessage: vi.fn((msg) => {
      if (typeof onPosted === "function") onPosted(msg, port);
    }),
    disconnect: vi.fn(() => {
      if (disconnected) return;
      disconnected = true;
      for (const fn of listeners.disconnect.slice()) fn();
    }),
    onMessage: { addListener: vi.fn((fn) => listeners.message.push(fn)) },
    onDisconnect: { addListener: vi.fn((fn) => listeners.disconnect.push(fn)) },
    __deliverAnalyzeResult(result) {
      for (const fn of listeners.message.slice()) fn({ type: "ANALYZE_RESULT", result });
    },
    __deliverSanitizeResult(result) {
      for (const fn of listeners.message.slice()) fn({ type: "SANITIZE_RESULT", result });
    },
  };
  return port;
}

function makeChromeStub({ enabled = true, apiKey = "eak_test", reply, sanitizeReply } = {}) {
  const ports = [];
  const analyzeMessages = [];
  const sanitizeMessages = [];
  const outcomes = [];
  return {
    __ports: ports,
    __analyzeMessages: analyzeMessages,
    __sanitizeMessages: sanitizeMessages,
    __outcomes: outcomes,
    runtime: {
      lastError: undefined,
      connect: vi.fn((opts) => {
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (msg && msg.type === "ANALYZE") {
              analyzeMessages.push(msg);
              const r = reply(msg, analyzeMessages.length - 1);
              queueMicrotask(() => {
                p.__deliverAnalyzeResult(r);
                p.disconnect();
              });
              return;
            }
            if (msg && msg.type === "SANITIZE") {
              sanitizeMessages.push(msg);
              const r = typeof sanitizeReply === "function"
                ? sanitizeReply(msg, sanitizeMessages.length - 1)
                : { sanitized: msg.text, changes: [] };
              queueMicrotask(() => {
                p.__deliverSanitizeResult(r);
                p.disconnect();
              });
            }
          },
        });
        port.name = (opts && opts.name) || "analyze";
        ports.push(port);
        return port;
      }),
      sendMessage: vi.fn((msg, cb) => {
        if (msg.type === "BEGIN_CHECK") { queueMicrotask(() => cb({ allowed: true })); return; }
        if (msg.type === "GET_CONFIG") {
          queueMicrotask(() => cb({ apiKey, enabled }));
          return;
        }
        if (msg.type === "OUTCOME") {
          outcomes.push(msg.outcome);
          if (cb) queueMicrotask(() => cb({ ok: true }));
          return;
        }
        if (cb) queueMicrotask(() => cb({}));
      }),
      openOptionsPage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn((keys, cb) => queueMicrotask(() => cb({ enabled }))),
        set: vi.fn((_obj, cb) => { if (cb) queueMicrotask(cb); }),
      },
      onChanged: { addListener: vi.fn() },
    },
  };
}

function loadEraseAI(chromeStub) {
  globalThis.chrome = chromeStub;
  if (!document.execCommand) document.execCommand = () => true;
  // eslint-disable-next-line no-eval
  (0, eval)(CONFIG_SRC);
  // eslint-disable-next-line no-eval
  (0, eval)(EXTRACTOR_SRC);
  // eslint-disable-next-line no-eval
  (0, eval)(CONTENT_SRC);
}

function setUpChatGPTComposer({ promptText = "" } = {}) {
  document.body.innerHTML = "";
  const main = document.createElement("main");
  const form = document.createElement("form");
  const textarea = document.createElement("textarea");
  textarea.id = "prompt-textarea";
  textarea.value = promptText;
  form.appendChild(textarea);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  form.appendChild(fileInput);
  const sendBtn = document.createElement("button");
  sendBtn.setAttribute("data-testid", "send-button");
  sendBtn.type = "button";
  sendBtn.textContent = "Send";
  form.appendChild(sendBtn);
  main.appendChild(form);
  document.body.appendChild(main);
  return { main, form, textarea, fileInput, sendBtn };
}

function attachFile(input, file) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function dispatchEnterOn(el) {
  el.dispatchEvent(new window.KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  }));
}

function makeFile(name, contents, type = "") {
  return new File([contents], name, { type });
}

async function flushAsync(steps = 12) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("send-flow confirmation regressions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
  });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("auto-sends with the all-clear card when prompt + safe text attachment are both clean", async () => {
    const cleanCsv = "name,city\nAlice,Seattle\nBob,NYC\n";
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear",
      }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea, fileInput } = setUpChatGPTComposer({ promptText: "summarise this list" });
    await flushAsync();

    attachFile(fileInput, makeFile("contacts.csv", cleanCsv, "text/csv"));
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    // The all-clear confirmation card has eraseai-clear-send. The warning
    // panel has eraseai-send-anyway. Safe-prompt + safe-CSV must take the
    // auto-dismiss path, not the manual warning path.
    expect(panel.querySelector("#eraseai-clear-send")).toBeTruthy();
    expect(panel.querySelector("#eraseai-send-anyway")).toBeNull();
    // The clean CSV is still shown by name on the all-clear card so the
    // user knows the firewall actually scanned it.
    expect(panel.textContent).toMatch(/contacts\.csv/);
    // Both pieces (prompt + 1 file) reached the analyzer.
    expect(chromeStub.__analyzeMessages.length).toBe(2);
  });

  it("still scans files attached AFTER an SPA navigation (URL change must not silently drop the cache)", async () => {
    const csv = "ssn\n111-22-3333\n";
    const chromeStub = makeChromeStub({
      reply: (msg) => {
        if (/123-45-6789|111-22-3333/.test(msg.text)) {
          return {
            riskScore: 25, level: "danger",
            issues: [{ severity: "high", category: "ssn", text: "SSN detected" }],
            suggestions: [{ text: "Redact" }],
            summary: "SSN detected in attachment",
          };
        }
        return { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" };
      },
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea, fileInput } = setUpChatGPTComposer({ promptText: "look at this" });
    await flushAsync();

    // Simulate a SPA navigation BETWEEN extension load and file attachment.
    // The bug we're guarding against: the cache key was the URL captured
    // at IIFE init. After navigation, getCachedFiles() at send-time would
    // notice the URL had changed and clear the (just-attached) file out
    // of the cache, so the file would NEVER reach the analyzer.
    window.history.pushState({}, "", "/c/new-thread-12345");
    await flushAsync();

    attachFile(fileInput, makeFile("data.csv", csv, "text/csv"));
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    // The CSV must have reached the analyzer post-navigation.
    const analyzeTexts = chromeStub.__analyzeMessages.map((m) => m.text);
    expect(analyzeTexts.some((t) => t.includes("111-22-3333"))).toBe(true);
    // And the file row shows up by name in the panel — the firewall
    // didn't silently drop it.
    expect(panel.textContent).toMatch(/data\.csv/);
    // Worst level wins → warning panel, not the all-clear card.
    expect(panel.querySelector("#eraseai-send-anyway")).toBeTruthy();
    expect(panel.querySelector("#eraseai-clear-send")).toBeNull();
  });

  it("treats a skipped file (PDF) as a file blocker and hides the sanitize button when prompt is clean", async () => {
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear",
      }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea, fileInput } = setUpChatGPTComposer({ promptText: "summarise this" });
    await flushAsync();

    attachFile(fileInput, makeFile("scan.pdf", "%PDF-1.7", "application/pdf"));
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    // Prompt is safe but the PDF is a skipped-file blocker → panel must
    // appear (no auto-send) and Sanitize must NOT be offered (the prompt
    // has nothing to fix — the user must remove the PDF chip themselves).
    expect(panel.querySelector("#eraseai-send-anyway")).toBeTruthy();
    expect(panel.querySelector("#eraseai-clear-send")).toBeNull();
    expect(panel.querySelector("#eraseai-sanitize")).toBeNull();
    // The PDF row appears with the "review manually" wording. The
    // sandbox bridge isn't wired up in this test so extraction falls
    // back to the SKIP_REASONS.pdfNotYetSupported message.
    expect(panel.textContent).toMatch(/scan\.pdf/);
    expect(panel.textContent).toMatch(/couldn't read the PDF/);
  });

  it("labels sanitize as 'Sanitize Prompt' when a skipped file (PDF) accompanies a risky prompt", async () => {
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 30, level: "danger",
        issues: [{ severity: "high", category: "ssn", text: "SSN detected" }],
        suggestions: [{ text: "Redact" }],
        summary: "SSN detected",
      }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea, fileInput } = setUpChatGPTComposer({
      promptText: "my ssn is 111-22-3333 — extract from this pdf",
    });
    await flushAsync();

    attachFile(fileInput, makeFile("resume.pdf", "%PDF-1.7", "application/pdf"));
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    const sanitizeBtn = panel.querySelector("#eraseai-sanitize");
    expect(sanitizeBtn).toBeTruthy();
    // PDF is a file blocker even though it has level "skipped" not danger
    // — the sanitize button must NOT promise to send.
    expect(sanitizeBtn.textContent.trim()).toBe("Sanitize Prompt");
    expect(sanitizeBtn.dataset.fileBlocker).toBe("true");
  });

  it("does NOT morph 'Send Anyway' into 'Send Sanitized' when an attached file is also a blocker", async () => {
    const csv = "ssn\n111-22-3333\n";
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 25, level: "danger",
        issues: [{ severity: "high", category: "ssn", text: "SSN detected" }],
        suggestions: [{ text: "Redact" }],
        summary: "SSN detected",
      }),
      sanitizeReply: (msg) => ({
        sanitized: msg.text.replace(/\d{3}-\d{2}-\d{4}/g, "[REDACTED]"),
        changes: [{ category: "ssn", original: "111-22-3333", replacement: "[REDACTED]" }],
      }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea, fileInput } = setUpChatGPTComposer({
      promptText: "my ssn is 111-22-3333 please remember it",
    });
    await flushAsync();

    attachFile(fileInput, makeFile("data.csv", csv, "text/csv"));
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    const sanitizeBtn = panel.querySelector("#eraseai-sanitize");
    expect(sanitizeBtn).toBeTruthy();
    // Label is the file-blocker variant — does NOT promise to send.
    expect(sanitizeBtn.textContent.trim()).toBe("Sanitize Prompt");
    expect(sanitizeBtn.dataset.fileBlocker).toBe("true");

    const sendBtn = panel.querySelector("#eraseai-send-anyway");
    expect(sendBtn).toBeTruthy();
    const sendLabelBefore = sendBtn.textContent.trim();
    expect(sendLabelBefore).toMatch(/Send Anyway/);

    // Click sanitize → the SANITIZE port replies with a redacted prompt.
    sanitizeBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushAsync(20);

    // Notice appears.
    expect(panel.querySelector("#eraseai-sanitize-file-notice")).toBeTruthy();
    // Send button is NOT relabelled to "Send Sanitized" — the file is
    // still attached and known-risky, so a single click must not ship it
    // under a green guise.
    const sendBtnAfter = panel.querySelector("#eraseai-send-anyway");
    expect(sendBtnAfter.textContent.trim()).toBe(sendLabelBefore);
    expect(sendBtnAfter.textContent).not.toMatch(/Send Sanitized/);
    // Sanitize button has its terminal "Sanitized" state.
    expect(panel.querySelector("#eraseai-sanitize").textContent).toMatch(/Sanitized/);
  });
});
