// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Settings-driven concurrency cap (#146) — runtime updates.
// The popup writes chrome.storage.local.analyzeConcurrency on save;
// content.js's onChanged listener must pick that up and apply the new
// (clamped) cap to the very next scan WITHOUT requiring a page reload.
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

function makeChromeStub({ enabled = true, apiKey = "eak_test", reply, delayMs = 10 } = {}) {
  const analyzeMessages = [];
  const onChangedListeners = [];
  const storedValues = { enabled };
  return {
    __analyzeMessages: analyzeMessages,
    __onChangedListeners: onChangedListeners,
    runtime: {
      lastError: undefined,
      connect: vi.fn((opts) => {
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (msg && msg.type === "ANALYZE") {
              analyzeMessages.push(msg);
              const r = reply(msg);
              const dispatch = () => { p.__deliverAnalyzeResult(r); p.disconnect(); };
              if (delayMs > 0) setTimeout(dispatch, delayMs);
              else queueMicrotask(dispatch);
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
      onChanged: { addListener: vi.fn((fn) => onChangedListeners.push(fn)) },
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

describe("analyze-port throttle — picks up onChanged updates without reload (#146)", () => {
  beforeEach(() => { document.body.innerHTML = ""; delete globalThis.__eraseAIExtractor; });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("applies a popup-driven analyzeConcurrency change to the next scan", async () => {
    let activePorts = 0;
    let maxActivePorts = 0;
    const chromeStub = makeChromeStub({
      delayMs: 10,
      reply: () => ({ riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "" }),
    });
    const realConnect = chromeStub.runtime.connect;
    chromeStub.runtime.connect = vi.fn((opts) => {
      const port = realConnect(opts);
      if (opts && opts.name === "analyze") {
        activePorts += 1;
        if (activePorts > maxActivePorts) maxActivePorts = activePorts;
        const realDisconnect = port.disconnect;
        port.disconnect = vi.fn(() => { activePorts -= 1; return realDisconnect(); });
      }
      return port;
    });

    loadEraseAI(chromeStub);
    await flushAsync();

    // Storage starts empty (cap = default 4). The popup save handler
    // writes analyzeConcurrency: 12 and chrome.storage fires onChanged
    // with the new value. content.js must coerce + apply that to its
    // in-memory cap without requiring a page reload.
    expect(chromeStub.__onChangedListeners.length).toBeGreaterThan(0);
    for (const fn of chromeStub.__onChangedListeners) {
      fn({ analyzeConcurrency: { oldValue: 4, newValue: 12 } });
    }

    const { textarea } = setUpComposer({ promptText: "a".repeat(510000) });
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(200);

    expect(chromeStub.__analyzeMessages.length).toBe(51);
    // The runtime change took effect: the cap is now well above 4.
    expect(maxActivePorts).toBeGreaterThan(4);
    expect(maxActivePorts).toBeLessThanOrEqual(12);
  });
});
