// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Queued-progress hint test for #145. After #144 capped concurrent
// analyze ports at ANALYZE_CONCURRENCY (4), a 51-piece send drains in
// ~13 sequential waves; the static "Analyzing…" spinner over that
// 10s+ wall-clock window reads as "hung". #145 injects a small
// "Scanning X of N…" line under the spinner that ticks up as each
// piece completes whenever the total piece count exceeds the
// progress threshold (>5).
//
// Like analyze-throttle.test.js this file lives on its own because
// loadEraseAI() leaks keydown/change listeners into the jsdom realm
// — running multiple analyze-flow tests in one file would let
// stale closures process the synthetic Enter event.

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

function makeChromeStub({ enabled = true, apiKey = "eak_test" } = {}) {
  const ports = [];
  const analyzeMessages = [];
  const pendingDeliveries = [];
  return {
    __ports: ports,
    __analyzeMessages: analyzeMessages,
    __pendingDeliveries: pendingDeliveries,
    runtime: {
      lastError: undefined,
      // Override of connect: do NOT auto-deliver. The test releases
      // analyze ports in waves so it can observe the hint between
      // batches.
      connect: vi.fn((opts) => {
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (msg && msg.type === "ANALYZE") {
              analyzeMessages.push(msg);
              pendingDeliveries.push({ port: p });
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

describe("analyze queued-progress hint (#145)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
  });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("ticks 'Scanning X of N…' from 0 upward as a 51-piece scan drains", async () => {
    const chromeStub = makeChromeStub();
    loadEraseAI(chromeStub);
    await flushAsync();

    // ANALYZE_MAX_CHARS=10000 → 510,000 chars splits into 51 pieces.
    const longPrompt = "a".repeat(510000);
    const { textarea } = setUpChatGPTComposer({ promptText: longPrompt });
    await flushAsync();

    dispatchEnterOn(textarea);
    await flushAsync(20);

    // Initial state: hint is in the DOM with the 0-of-N copy. Only
    // ANALYZE_CONCURRENCY (4) ports are in flight thanks to the
    // bounded worker pool from #144 — confirms the hint reflects the
    // queued-vs-in-flight distinction the task asks for.
    let hint = document.querySelector(".eraseai-scan-progress");
    expect(hint).not.toBeNull();
    expect(hint.textContent).toMatch(/^Scanning 0 of 51/);
    expect(chromeStub.__pendingDeliveries.length).toBe(4);

    const drainAll = async () => {
      const drained = chromeStub.__pendingDeliveries.splice(
        0,
        chromeStub.__pendingDeliveries.length,
      );
      for (const { port } of drained) {
        port.__deliverAnalyzeResult({
          riskScore: 100,
          level: "safe",
          issues: [],
          suggestions: [],
          summary: "All clear",
        });
        port.disconnect();
      }
      await flushAsync(8);
    };

    // Wave 1: deliver the first 4 pieces. Progress should tick to
    // "Scanning 4 of 51…" and the worker pool should immediately
    // refill with the next 4 ports.
    await drainAll();
    hint = document.querySelector(".eraseai-scan-progress");
    expect(hint).not.toBeNull();
    expect(hint.textContent).toMatch(/^Scanning 4 of 51/);

    // Wave 2: another 4 pieces. Counter advances monotonically — the
    // user sees forward progress instead of a static spinner.
    await drainAll();
    hint = document.querySelector(".eraseai-scan-progress");
    expect(hint).not.toBeNull();
    expect(hint.textContent).toMatch(/^Scanning 8 of 51/);

    // Drain the remaining pieces and confirm the scan finishes
    // without dropping any work.
    let safety = 50;
    while (chromeStub.__analyzeMessages.length < 51 && safety > 0) {
      // eslint-disable-next-line no-await-in-loop
      await drainAll();
      safety -= 1;
    }
    expect(chromeStub.__analyzeMessages.length).toBe(51);
  });
});
