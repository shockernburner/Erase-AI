// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Concurrency cap test for #144. With the 1.3.5 attachment-scanning
// release, a single send can decompose into many small analyze pieces
// (one chrome.runtime.connect("analyze") port per chunk). Without a
// bounded queue, a long prompt or several files can trip the
// api-server's per-key 60 req/min burst limit and surface mid-scan
// "service unavailable" errors. content.js wraps analyzePieceViaPort
// in a small worker pool capped at ANALYZE_CONCURRENCY (4); this test
// asserts that 51 pieces never produce more than 4 in-flight ports at
// once.
//
// This file deliberately lives outside file-cache.test.js because that
// suite shares a jsdom realm across tests and each loadEraseAI() leaks
// keydown/change listeners from previous closures (see the trailing
// NOTE in file-cache.test.js). A throttling assertion needs a clean
// realm so only one closure is processing the synthetic Enter event.

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

describe("analyze-port throttle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
  });
  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("caps concurrent analyze ports when 50+ chunks are sent at once", async () => {
    // ANALYZE_MAX_CHARS in content.js is 10000. A 510,000-char prompt
    // splits into ⌈510000/10000⌉ = 51 prompt pieces — comfortably past
    // both the 4-worker pool and the api-server's 60 req/min burst
    // limit. With the bounded queue in place, no more than 4 analyze
    // ports should ever be open simultaneously regardless of how many
    // chunks the page produces.
    let activePorts = 0;
    let maxActivePorts = 0;
    const chromeStub = makeChromeStub({
      reply: () => ({
        riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear",
      }),
    });
    // Wrap chrome.runtime.connect so we can observe the lifecycle of
    // every analyze port. Sanitize ports use the same connect path
    // but get filtered out by name so a post-scan sanitize call
    // can't pollute the active-port count.
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

    const longPrompt = "a".repeat(510000);
    const { textarea } = setUpChatGPTComposer({ promptText: longPrompt });
    await flushAsync();

    dispatchEnterOn(textarea);
    await flushAsync(120);

    // Every chunk got analyzed — the queue throttled but never dropped
    // any work.
    expect(chromeStub.__analyzeMessages.length).toBe(51);
    // Concurrency cap held: at least one port was opened, and at no
    // point were more than ANALYZE_CONCURRENCY (4) in flight.
    expect(maxActivePorts).toBeGreaterThan(0);
    expect(maxActivePorts).toBeLessThanOrEqual(4);
    // No leaked ports.
    expect(activePorts).toBe(0);
  });
});
