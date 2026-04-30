// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Settings-driven concurrency cap (#146): content.js's ANALYZE_CONCURRENCY
// is no longer hard-coded — the cap defaults to 4 but is overridable via
// chrome.storage.local.analyzeConcurrency, with the popup exposing it as
// an Advanced setting bounded to [1, 16].
//
// This file exercises every observable axis of that override:
//   * a higher stored value (8) actually loosens the in-flight cap above
//     the default-4 ceiling
//   * absurdly high values (999) get clamped to MAX (16) so a corrupted
//     storage write can never fan out hundreds of ports
//   * non-numeric or below-MIN values (0, "abc") fall back safely so the
//     scanner never stalls
//   * a runtime change posted via chrome.storage.onChanged is picked up
//     by the in-memory cap without requiring a page reload
//
// Each it() runs in its OWN file (one test per file) because the shared
// jsdom realm in this folder leaks document-level keydown listeners
// across loadEraseAI() calls — see the trailing NOTE in
// file-cache.test.js. Putting these in a sibling file gets us a fresh
// realm per case via Vitest's per-file isolation.
//
// All cases reuse the same chrome stub shape as analyze-throttle.test.js;
// the only structural addition is a `storedValues` map that respects the
// keys argument to chrome.storage.local.get and an onChanged listener
// registry so we can simulate the popup writing a new cap.

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

function makeChromeStub({
  enabled = true,
  apiKey = "eak_test",
  analyzeConcurrency,
  reply,
  delayMs = 0,
} = {}) {
  const ports = [];
  const analyzeMessages = [];
  const onChangedListeners = [];
  const storedValues = { enabled };
  if (typeof analyzeConcurrency !== "undefined") {
    storedValues.analyzeConcurrency = analyzeConcurrency;
  }
  return {
    __ports: ports,
    __analyzeMessages: analyzeMessages,
    __onChangedListeners: onChangedListeners,
    __storedValues: storedValues,
    runtime: {
      lastError: undefined,
      connect: vi.fn((opts) => {
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (msg && msg.type === "ANALYZE") {
              analyzeMessages.push(msg);
              const r = reply(msg, analyzeMessages.length - 1);
              const dispatch = () => {
                p.__deliverAnalyzeResult(r);
                p.disconnect();
              };
              if (delayMs > 0) {
                setTimeout(dispatch, delayMs);
              } else {
                queueMicrotask(dispatch);
              }
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
        get: vi.fn((keys, cb) => {
          queueMicrotask(() => {
            const out = {};
            const list = Array.isArray(keys) ? keys : [keys];
            for (const k of list) {
              if (k in storedValues) out[k] = storedValues[k];
            }
            cb(out);
          });
        }),
        set: vi.fn((obj, cb) => {
          Object.assign(storedValues, obj);
          if (cb) queueMicrotask(cb);
        }),
      },
      onChanged: {
        addListener: vi.fn((fn) => onChangedListeners.push(fn)),
      },
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

// Synchronous fan-out (with delayMs > 0 so workers actually overlap in
// time long enough for us to sample the cap rather than just see "1
// open, 1 close, 1 open, …"). Returns the highest concurrent analyze
// port count observed plus the total analyze messages dispatched, so a
// caller can both pin the cap AND verify no piece was dropped.
async function runScanAndMeasureConcurrency(chromeStub) {
  let activePorts = 0;
  let maxActivePorts = 0;
  const realConnect = chromeStub.runtime.connect;
  chromeStub.runtime.connect = vi.fn((opts) => {
    const port = realConnect(opts);
    if (opts && opts.name === "analyze") {
      activePorts += 1;
      if (activePorts > maxActivePorts) maxActivePorts = activePorts;
      const realDisconnect = port.disconnect;
      port.disconnect = vi.fn(() => {
        activePorts -= 1;
        return realDisconnect();
      });
    }
    return port;
  });

  loadEraseAI(chromeStub);
  await flushAsync();

  // ANALYZE_MAX_CHARS in content.js is 10000. A 510,000-char prompt
  // splits into ⌈510000/10000⌉ = 51 prompt pieces — comfortably past
  // every reasonable cap we want to test.
  const longPrompt = "a".repeat(510000);
  const { textarea } = setUpChatGPTComposer({ promptText: longPrompt });
  await flushAsync();

  dispatchEnterOn(textarea);
  await flushAsync(200);

  return { maxActivePorts, totalMessages: chromeStub.__analyzeMessages.length };
}

describe("analyze-port throttle — configurable cap (#146)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
  });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("respects a higher analyzeConcurrency value from chrome.storage.local", async () => {
    // analyzeConcurrency: 8 in storage + a small reply delay so workers
    // genuinely overlap. The cap should ramp up to 8 simultaneously
    // open ports for a 51-piece scan. We require the observed maximum
    // to actually cross the default-4 ceiling, which is what proves the
    // setting loosened the cap (rather than the test just seeing the
    // hardcoded default).
    const chromeStub = makeChromeStub({
      analyzeConcurrency: 8,
      delayMs: 10,
      reply: () => ({
        riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear",
      }),
    });

    const { maxActivePorts, totalMessages } = await runScanAndMeasureConcurrency(chromeStub);

    expect(totalMessages).toBe(51);
    expect(maxActivePorts).toBeGreaterThan(4);
    expect(maxActivePorts).toBeLessThanOrEqual(8);
  });
});
