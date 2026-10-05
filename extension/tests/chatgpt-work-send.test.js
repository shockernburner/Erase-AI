// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// ChatGPT Work mode uses #composer-submit-button and often hides the editable
// from our legacy selectors. These tests pin the document-level send catcher
// and attachment-only interception that demo failures depended on.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const CONFIG_SRC = fs.readFileSync(path.join(SRC_DIR, "concurrency-config.js"), "utf8");
const EXTRACTOR_SRC = fs.readFileSync(path.join(SRC_DIR, "file-extractor.js"), "utf8");
const CONTENT_SRC = fs.readFileSync(path.join(SRC_DIR, "content.js"), "utf8");

const SECRET_TEXT = "AWS key AKIAIOSFODNN7EXAMPLE";

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

function makeChromeStub() {
  const analyzeMessages = [];
  return {
    __analyzeMessages: analyzeMessages,
    runtime: {
      lastError: undefined,
      connect: vi.fn(() => {
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (!msg || msg.type !== "ANALYZE") return;
            analyzeMessages.push(msg);
            const risky = msg.text.includes("AKIAIOSFODNN7EXAMPLE")
              || (msg.attachments && msg.attachments.length);
            queueMicrotask(() => {
              p.__deliverAnalyzeResult(risky
                ? {
                  riskScore: 10,
                  level: "danger",
                  issues: [{ severity: "critical", category: "secret", text: "AWS key" }],
                  suggestions: [],
                  summary: "Secret detected",
                }
                : { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" });
              p.disconnect();
            });
          },
        });
        return port;
      }),
      sendMessage: vi.fn((msg, cb) => {
        if (msg.type === "BEGIN_CHECK") { queueMicrotask(() => cb({ allowed: true, paid: true })); return; }
        if (msg.type === "GET_CONFIG") {
          queueMicrotask(() => cb({ apiKey: "eak_test", enabled: true }));
          return;
        }
        if (cb) queueMicrotask(() => cb({ ok: true }));
      }),
      openOptionsPage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn((keys, cb) => queueMicrotask(() => cb({ enabled: true }))),
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

function setUpWorkComposer({ promptText, hookSendButton } = {}) {
  document.body.innerHTML = "";
  const footer = document.createElement("footer");
  const form = document.createElement("form");
  form.setAttribute("aria-label", "Chat input form");

  const chipRow = document.createElement("div");
  chipRow.id = "chip-row";
  form.appendChild(chipRow);

  if (promptText != null) {
    const ta = document.createElement("textarea");
    ta.id = "composer-input-hidden";
    ta.value = promptText;
    form.appendChild(ta);
  }

  const send = document.createElement("button");
  send.id = "composer-submit-button";
  send.type = "button";
  if (hookSendButton) send.dataset.eraseaiHooked = "true";
  form.appendChild(send);

  footer.appendChild(form);
  document.body.appendChild(footer);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  document.body.appendChild(fileInput);

  return { chipRow, send, fileInput, textarea: form.querySelector("textarea") };
}

function clickIt(el) {
  return el.dispatchEvent(new window.MouseEvent("click", {
    bubbles: true, cancelable: true,
  }));
}

async function flushAsync(steps = 16) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("ChatGPT Work send interception", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
  });

  afterEach(() => {
    if (typeof globalThis.__eraseAIContentTeardown === "function") {
      globalThis.__eraseAIContentTeardown();
    }
    delete globalThis.__eraseAIContentTeardown;
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("gates #composer-submit-button via the document send catcher", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { send } = setUpWorkComposer({ promptText: SECRET_TEXT, hookSendButton: false });
    await flushAsync();

    const notPrevented = clickIt(send);
    await flushAsync(24);

    expect(notPrevented).toBe(false);
    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });

  it("gates an attachment-only send when the editable is not found", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { chipRow, send, fileInput } = setUpWorkComposer({ hookSendButton: false });
    chipRow.textContent = "03-danger-engineering-secrets.txt";
    Object.defineProperty(fileInput, "files", {
      value: [new File([SECRET_TEXT], "03-danger-engineering-secrets.txt", { type: "text/plain" })],
      configurable: true,
    });
    fileInput.dispatchEvent(new window.Event("change", { bubbles: true }));
    await flushAsync();
    clickIt(send);
    await flushAsync(24);

    expect(stub.__analyzeMessages.length).toBeGreaterThan(0);
  });
});
