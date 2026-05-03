// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Negative case for #145. Single-piece (and small ≤5-piece) sends
// must keep the original "Analyzing…" copy unchanged — the queued-
// progress hint is only useful when there's actually queueing
// happening, and showing "Scanning 1 of 1…" on every short prompt
// would be noise.
//
// Lives in its own file for the same listener-leak reason as
// analyze-throttle.test.js: each loadEraseAI() registers fresh
// keydown/change handlers in the shared jsdom realm.

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
  };
  return port;
}

function makeChromeStub({ enabled = true, apiKey = "eak_test", reply } = {}) {
  const ports = [];
  const analyzeMessages = [];
  return {
    __ports: ports,
    __analyzeMessages: analyzeMessages,
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

function dispatchEnterOn(el) {
  el.dispatchEvent(new window.KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  }));
}

async function flushAsync(steps = 12) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("analyze queued-progress hint — small scans (#145)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
  });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("does not inject the queued-progress hint for a single-piece send", async () => {
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 100,
        level: "safe",
        issues: [],
        suggestions: [],
        summary: "All clear",
      }),
    });

    // The scanning panel only lives in the DOM mid-scan — once
    // results render, panel.innerHTML is replaced. A MutationObserver
    // on document.body catches every node added during the scan so
    // we can assert the queued-hint never appears, even transiently,
    // for a single-piece send.
    let progressEverSeen = false;
    let scanningContainerSeen = false;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof window.HTMLElement)) continue;
          if (node.querySelector?.(".eraseai-scan-progress")) {
            progressEverSeen = true;
          }
          if (node.classList?.contains("eraseai-scan-progress")) {
            progressEverSeen = true;
          }
          if (node.querySelector?.(".eraseai-scanning")) {
            scanningContainerSeen = true;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    loadEraseAI(chromeStub);
    await flushAsync();

    const { textarea } = setUpChatGPTComposer({ promptText: "hello world" });
    await flushAsync();

    dispatchEnterOn(textarea);
    await flushAsync(20);

    observer.disconnect();

    expect(chromeStub.__analyzeMessages.length).toBe(1);
    // Sanity: the scanning overlay was definitely created — so the
    // negative assertion below isn't trivially true because we just
    // missed the whole flow.
    expect(scanningContainerSeen).toBe(true);
    // Original "Analyzing…" copy stays put — no queued-hint element
    // was ever injected for this small scan.
    expect(progressEverSeen).toBe(false);
  });
});
