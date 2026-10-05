// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// "Download clean copy" on a flagged attachment.
//
// The offer is deliberately narrow. It only appears for a file we read as
// plain text in full, because that is the only case where a sanitized
// rewrite is still the same file: the extract IS the bytes. Text recovered
// from a PDF, from OCR, from an archive member, or cut short at the size
// cap cannot be rebuilt into the original, and offering a download there
// would hand the user a file that quietly differs from what they attached.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const CONFIG_SRC = fs.readFileSync(path.join(SRC_DIR, "concurrency-config.js"), "utf8");
const EXTRACTOR_SRC = fs.readFileSync(path.join(SRC_DIR, "file-extractor.js"), "utf8");
const CONTENT_SRC = fs.readFileSync(path.join(SRC_DIR, "content.js"), "utf8");

const SECRET_CSV = "name,key\nAlice,AKIAIOSFODNN7EXAMPLE\n";
const REDACTED_CSV = "name,key\nAlice,[REDACTED]\n";

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
    __deliver(msg) {
      for (const fn of listeners.message.slice()) fn(msg);
    },
  };
  return port;
}

function makeChromeStub() {
  const sanitizeMessages = [];
  return {
    __sanitizeMessages: sanitizeMessages,
    runtime: {
      lastError: undefined,
      connect: vi.fn((opts) => {
        const name = (opts && opts.name) || "analyze";
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (msg && msg.type === "ANALYZE") {
              const risky = msg.text.includes("AKIAIOSFODNN7EXAMPLE");
              const result = risky
                ? {
                  riskScore: 10,
                  level: "danger",
                  issues: [{ severity: "critical", category: "secret", text: "AWS key" }],
                  suggestions: [],
                  summary: "Secret detected",
                }
                : { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" };
              queueMicrotask(() => {
                p.__deliver({ type: "ANALYZE_RESULT", result });
                p.disconnect();
              });
              return;
            }
            if (msg && msg.type === "SANITIZE") {
              sanitizeMessages.push(msg);
              queueMicrotask(() => {
                p.__deliver({
                  type: "SANITIZE_RESULT",
                  result: {
                    sanitized: msg.text.replace(/AKIAIOSFODNN7EXAMPLE/g, "[REDACTED]"),
                    changes: [],
                  },
                });
                p.disconnect();
              });
            }
          },
        });
        port.name = name;
        return port;
      }),
      sendMessage: vi.fn((msg, cb) => {
        if (msg.type === "BEGIN_CHECK") { queueMicrotask(() => cb({ allowed: true })); return; }
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

function setUpComposer(promptText) {
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
  return { textarea, fileInput };
}

function attachFile(input, file) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function pressEnter(el) {
  el.dispatchEvent(new window.KeyboardEvent("keydown", {
    key: "Enter", bubbles: true, cancelable: true,
  }));
}

async function flushAsync(steps = 20) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

// jsdom's Blob has no .text().
function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("blob read failed"));
    reader.readAsText(blob);
  });
}

// Capture what the anchor-click download would have produced.
function captureDownloads() {
  const captured = [];
  const blobs = new Map();
  let counter = 0;
  window.URL.createObjectURL = vi.fn((blob) => {
    const url = `blob:mock/${++counter}`;
    blobs.set(url, blob);
    return url;
  });
  window.URL.revokeObjectURL = vi.fn();
  const realClick = window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click = function patched() {
    if (this.download) {
      captured.push({ name: this.download, blob: blobs.get(this.href) });
      return;
    }
    if (realClick) realClick.call(this);
  };
  return {
    captured,
    restore() { window.HTMLAnchorElement.prototype.click = realClick; },
  };
}

describe("download clean copy", () => {
  let downloads;

  beforeEach(() => {
    document.body.innerHTML = "";
    delete globalThis.__eraseAIExtractor;
    downloads = captureDownloads();
  });

  afterEach(() => {
    downloads.restore();
    if (typeof globalThis.__eraseAIContentTeardown === "function") {
      globalThis.__eraseAIContentTeardown();
    }
    delete globalThis.__eraseAIContentTeardown;
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("sanitizes a flagged text file and downloads it in the same format", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { textarea, fileInput } = setUpComposer("summarize this");
    await flushAsync();

    attachFile(fileInput, new File([SECRET_CSV], "keys.csv", { type: "text/csv" }));
    await flushAsync();
    pressEnter(textarea);
    await flushAsync();

    const btn = document.querySelector('.eraseai-clean-copy[data-clean-file="keys.csv"]');
    expect(btn).not.toBeNull();

    btn.click();
    await flushAsync();

    // The whole file went to the sanitizer, not just the flagged line.
    expect(stub.__sanitizeMessages.length).toBe(1);
    expect(stub.__sanitizeMessages[0].text).toBe(SECRET_CSV);

    expect(downloads.captured.length).toBe(1);
    const [file] = downloads.captured;
    expect(file.name).toBe("keys-clean.csv");
    expect(file.blob.type).toBe("text/csv");
    await expect(readBlob(file.blob)).resolves.toBe(REDACTED_CSV);
    expect(btn.textContent).toBe("Downloaded");
  });

  it("does not offer a copy when the read was cut short at the size cap", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { textarea, fileInput } = setUpComposer("summarize this");
    await flushAsync();

    // Past MAX_EXTRACTED_BYTES, so the scan only saw the head of the file.
    // Sanitizing that and calling it the file would drop everything after.
    const cap = globalThis.__eraseAIExtractor.MAX_EXTRACTED_BYTES;
    const oversized = SECRET_CSV + "x".repeat(cap + 1000);
    attachFile(fileInput, new File([oversized], "big.csv", { type: "text/csv" }));
    await flushAsync();
    pressEnter(textarea);
    await flushAsync();

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel.textContent).toMatch(/big\.csv/);
    expect(document.querySelector(".eraseai-clean-copy")).toBeNull();
  });

  it("does not offer a copy of text recovered from a PDF", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    globalThis.__eraseAIExtractor.setSandboxBridge(async () => ({
      ok: true, text: SECRET_CSV,
    }));
    await flushAsync();
    const { textarea, fileInput } = setUpComposer("summarize this");
    await flushAsync();

    attachFile(fileInput, new File(["%PDF-1.7"], "keys.pdf", { type: "application/pdf" }));
    await flushAsync();
    pressEnter(textarea);
    await flushAsync();

    // The PDF is still scanned and still flagged...
    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel.textContent).toMatch(/keys\.pdf/);
    // ...but we cannot rebuild a PDF, so no download is offered.
    expect(document.querySelector(".eraseai-clean-copy")).toBeNull();
  });
});
