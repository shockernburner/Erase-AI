// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Settings-driven concurrency cap (#146) — clamping to MAX.
// A user (or a corrupted storage write) putting 999 in
// chrome.storage.local.analyzeConcurrency must NOT be able to fan out
// 999 ports — the [MIN=1, MAX=16] clamp in content.js should pin the
// effective cap at 16 even when there are plenty of pieces to schedule.
// Lives in its own file because the analyze-throttle suites all share
// jsdom realms across tests and document-level keydown listeners leak
// between loadEraseAI() calls (see file-cache.test.js NOTE).

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
  enabled = true, apiKey = "eak_test", analyzeConcurrency, reply, delayMs = 0,
} = {}) {
  const ports = [];
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
              const dispatch = () => { p.__deliverAnalyzeResult(r); p.disconnect(); };
              if (delayMs > 0) setTimeout(dispatch, delayMs);
              else queueMicrotask(dispatch);
            }
          },
        });
        port.name = (opts && opts.name) || "analyze";
        ports.push(port);
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
  const sendBtn = document.createElement("button");
  sendBtn.setAttribute("data-testid", "send-button");
  sendBtn.type = "button";
  form.appendChild(sendBtn);
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

describe("analyze-port throttle — clamps too-high stored value to MAX (#146)", () => {
  beforeEach(() => { document.body.innerHTML = ""; delete globalThis.__eraseAIExtractor; });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("clamps analyzeConcurrency=999 to MAX=16 even with 51 pieces queued", async () => {
    let activePorts = 0;
    let maxActivePorts = 0;
    const chromeStub = makeChromeStub({
      analyzeConcurrency: 999,
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
    const { textarea } = setUpComposer({ promptText: "a".repeat(510000) });
    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync(200);

    expect(chromeStub.__analyzeMessages.length).toBe(51);
    // The hard ceiling MUST hold regardless of the (corrupted) stored value.
    expect(maxActivePorts).toBeLessThanOrEqual(16);
    // And it MUST still be loosened past the default (otherwise the clamp
    // would be silently snapping to 4 and we wouldn't notice).
    expect(maxActivePorts).toBeGreaterThan(4);
  });
});
