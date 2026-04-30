// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Integration tests for the file-attachment scanning flow added in #142.
// Loads file-extractor.js + content.js into the same jsdom realm, attaches
// a fake ChatGPT-style composer with a hidden file input, drops a file in,
// hits Enter, and asserts that:
//
//   * The analyze port sees a piece for the prompt AND a piece for the file
//     contents.
//   * The result panel renders one row per piece in the "What we scanned"
//     block with the file name visible.
//   * Skipped files (PDF) force a panel even when the prompt is clean.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
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
  };
  return port;
}

// ChatGPT analyze-result programmer: returns a function that replies to the
// Nth ANALYZE message with the matching planned response. Each piece gets
// its own port (the multi-piece flow), so we accumulate them.
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
                for (const fn of p.onMessage.addListener.mock.calls.map(c => c[0])) {
                  fn({ type: "SANITIZE_RESULT", result: r });
                }
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
  (0, eval)(EXTRACTOR_SRC);
  // eslint-disable-next-line no-eval
  (0, eval)(CONTENT_SRC);
}

// Build a minimal ChatGPT-style composer in jsdom. The form wraps the
// prompt textarea AND a hidden file input — this matches the real DOM
// shape closely enough for our composer-scope check (`form:has(...)`)
// to succeed.
function setUpChatGPTComposer({ promptText = "" } = {}) {
  document.body.innerHTML = "";
  // Wrap in <main> so the `'main form'` composer-scope selector matches
  // even if jsdom's :has() support is incomplete; mirrors the real
  // ChatGPT DOM where the composer lives inside <main>.
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
  // jsdom doesn't let us set input.files directly, but we can dispatch
  // a synthetic 'change' event whose target.files we control via
  // Object.defineProperty.
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function dispatchEnterOn(el) {
  // Enter on the textarea routes through content.js's document-level
  // keydown listener; using this avoids depending on the MutationObserver
  // having hooked the send button (which is async in jsdom).
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
    // Microtask + macrotask drain. FileReader.readAsText in jsdom uses
    // setTimeout(0) under the hood, so we need both kinds of flushes.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("file-cache + multi-piece scan", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
  });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("scans both the prompt and an attached CSV when Enter is pressed", async () => {
    const csv = "name,ssn\nAlice,123-45-6789\n";
    const chromeStub = makeChromeStub({
      reply: (msg) => {
        // Treat the SSN-bearing piece as risky; the prompt-only piece as safe.
        if (/123-45-6789/.test(msg.text)) {
          return {
            riskScore: 30,
            level: "danger",
            issues: [{ severity: "high", category: "ssn", text: "SSN detected" }],
            suggestions: [{ text: "Redact" }],
            summary: "SSN found in attachment",
          };
        }
        return { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" };
      },
    });

    loadEraseAI(chromeStub);
    await flushAsync();

    const { textarea, fileInput, sendBtn } = setUpChatGPTComposer({
      promptText: "review this please",
    });
    // Wait for the MutationObserver in content.js to hook the send button.
    await flushAsync();

    attachFile(fileInput, makeFile("contacts.csv", csv, "text/csv"));
    await flushAsync();

    dispatchEnterOn(textarea);
    await flushAsync(20);

    // Two analyze ports = one for the prompt piece + one for the file piece.
    const analyzeTexts = chromeStub.__analyzeMessages.map((m) => m.text);
    expect(analyzeTexts.length).toBe(2);
    expect(analyzeTexts.some((t) => t.includes("review this please"))).toBe(true);
    expect(analyzeTexts.some((t) => t.includes("123-45-6789"))).toBe(true);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    // Per-piece block lists the file by name.
    expect(panel.textContent).toMatch(/What we scanned/);
    expect(panel.textContent).toMatch(/contacts\.csv/);
    // Worst-level wins → danger.
    expect(panel.querySelector(".eraseai-score-section").className).toMatch(/danger|caution/);
  });

  it("forces a warning panel for an attached PDF even when prompt is clean", async () => {
    const chromeStub = makeChromeStub({
      // Every analyzed piece looks safe; the PDF is never sent to analyze
      // (it's marked as a skipped piece by the extractor).
      reply: () => ({
        riskScore: 100,
        level: "safe",
        issues: [],
        suggestions: [],
        summary: "All clear",
      }),
    });

    loadEraseAI(chromeStub);
    await flushAsync();

    const { fileInput, sendBtn } = setUpChatGPTComposer({
      promptText: "summarise the attached document",
    });
    await flushAsync();

    attachFile(fileInput, makeFile("scan.pdf", "%PDF-1.7", "application/pdf"));
    await flushAsync();

    sendBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushAsync(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    // The PDF row should appear in the per-piece block with the
    // "review manually" wording from SKIP_REASONS.pdfNotYetSupported.
    expect(panel.textContent).toMatch(/scan\.pdf/);
    expect(panel.textContent).toMatch(/PDF detected/);
    // Send Anyway is the explicit override; the auto-send confirmation
    // path must NOT have fired.
    expect(panel.querySelector("#eraseai-send-anyway")).toBeTruthy();
    expect(panel.querySelector("#eraseai-clear-send")).toBeNull();
  });

  it("renders the per-piece block (file name + truncation notice) even with a single file attachment", async () => {
    const big = "name,note\n" + "Alice,abc\n".repeat(8000); // ~80 KB → triggers truncation
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear",
      }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea, fileInput } = setUpChatGPTComposer({ promptText: "look at this" });
    await flushAsync();

    attachFile(fileInput, makeFile("contacts.csv", big, "text/csv"));
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    // The file row shows up even though there's only one analyzed file.
    expect(panel.textContent).toMatch(/contacts\.csv/);
    // Truncation must be surfaced as a partial-scan notice and the
    // overall verdict bumped off "safe" so the user has to choose.
    expect(panel.textContent).toMatch(/only the first 50 KB was scanned/);
    expect(panel.querySelector("#eraseai-send-anyway")).toBeTruthy();
    expect(panel.querySelector("#eraseai-clear-send")).toBeNull();
  });

  it("auto-skips attachments past the 16-file cap without reading them", async () => {
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear",
      }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea, fileInput } = setUpChatGPTComposer({ promptText: "review these" });
    await flushAsync();

    // 20 small text files. The first 16 should be read and analyzed; the
    // last 4 should be marked skipped with a "first 16 attachments" reason.
    let lastChange;
    for (let i = 0; i < 20; i += 1) {
      const file = makeFile(`note-${i}.txt`, `payload ${i}`, "text/plain");
      Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
      lastChange = new window.Event("change", { bubbles: true });
      fileInput.dispatchEvent(lastChange);
    }
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(40);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).toBeTruthy();
    // The cap message must appear — that's the contract: anything past the
    // 16th attachment is surfaced as a skipped row, no read.
    expect(panel.textContent).toMatch(/only the first 16 attachments are scanned/);
    // At least one of the over-limit files (note-16..note-19) shows up by
    // name in the skipped-row list.
    expect(panel.textContent).toMatch(/note-1[6-9]\.txt/);
    // And we did scan something (prompt at minimum).
    expect(chromeStub.__analyzeMessages.length).toBeGreaterThanOrEqual(1);
  });

  // NOTE: empty-prompt-with-no-files fallthrough is covered by the
  // existing content.test.js suite. It can't be added here because
  // each `loadEraseAI()` re-evals the IIFE and installs another set of
  // document-level keydown/change listeners; the previous closures
  // (with their populated fileCache maps from earlier tests in this
  // file) keep firing and re-triggering interceptSubmission. The
  // jsdom realm is shared across tests inside one file, so there is
  // no clean teardown for those listeners.
});
