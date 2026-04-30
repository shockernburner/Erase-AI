// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Settings-driven concurrency cap (#146) — clamping below MIN.
// Storage corruption or a manual edit setting analyzeConcurrency to 0
// (or a non-numeric value) must NOT stall the scanner — the [MIN=1,
// MAX=16] clamp in content.js falls back so at least one analyze port
// is always allowed in flight and every piece still gets analyzed.
// Lives in its own file because the analyze-throttle suites all leak
// document-level keydown listeners between loadEraseAI() calls.

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
    postMessage: vi.fn((msg) => { if (typeof onPosted === "function") onPosted(msg, port); }),
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

function makeChromeStub({
  enabled = true, apiKey = "eak_test", analyzeConcurrency, reply,
} = {}) {
  const analyzeMessages = [];
  const storedValues = { enabled };
  if (typeof analyzeConcurrency !== "undefined") storedValues.analyzeConcurrency = analyzeConcurrency;
  return {
    __analyzeMessages: analyzeMessages,
    runtime: {
      lastError: undefined,
      connect: vi.fn((opts) => {
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (msg && msg.type === "ANALYZE") {
              analyzeMessages.push(msg);
              const r = reply(msg);
              queueMicrotask(() => { p.__deliverAnalyzeResult(r); p.disconnect(); });
            }
          },
        });
        port.name = (opts && opts.name) || "analyze";
        return port;
      }),
      sendMessage: vi.fn((msg, cb) => {
        if (msg.type === "GET_CONFIG") { queueMicrotask(() => cb({ apiKey, enabled })); return; }
        if (msg.type === "OUTCOME") { if (cb) queueMicrotask(() => cb({ ok: true })); return; }
        if (cb) queueMicrotask(() => cb({}));
      }),
      openOptionsPage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn((keys, cb) => queueMicrotask(() => {
          const out = {};
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) if (k in storedValues) out[k] = storedValues[k];
          cb(out);
        })),
        set: vi.fn((obj, cb) => { Object.assign(storedValues, obj); if (cb) queueMicrotask(cb); }),
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

function setUpComposer({ promptText = "" } = {}) {
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
  main.appendChild(form);
  document.body.appendChild(main);
  return { textarea };
}

function dispatchEnterOn(el) {
  el.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
}

async function flushAsync(steps = 12) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("analyze-port throttle — clamps too-low / non-numeric stored value to >= MIN (#146)", () => {
  beforeEach(() => { document.body.innerHTML = ""; delete globalThis.__eraseAIExtractor; });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("falls back to MIN=1 when analyzeConcurrency is 0 (still analyzes every piece)", async () => {
    const chromeStub = makeChromeStub({
      analyzeConcurrency: 0,
      reply: () => ({ riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "" }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea } = setUpComposer({ promptText: "a".repeat(510000) });
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(150);

    // Even with a nonsensical stored cap of 0, every one of the 51
    // pieces must still get analyzed (workers are clamped to MIN=1, not
    // skipped to 0).
    expect(chromeStub.__analyzeMessages.length).toBe(51);
  });

  it("falls back to default when analyzeConcurrency is non-numeric ('abc')", async () => {
    const chromeStub = makeChromeStub({
      analyzeConcurrency: "abc",
      reply: () => ({ riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "" }),
    });
    loadEraseAI(chromeStub);
    await flushAsync();
    const { textarea } = setUpComposer({ promptText: "a".repeat(510000) });
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(150);

    // Garbage in storage must not break analysis — coerce returns the
    // default of 4 and the scan still completes for every piece.
    expect(chromeStub.__analyzeMessages.length).toBe(51);
  });
});
