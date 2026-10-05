// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Regression tests for stale attachments surviving a blocked send.
//
// The file cache holds File objects because their bytes are unreachable from
// the DOM, and it is only cleared when a send actually goes through. Cancel
// deliberately keeps it — the file is still sitting in the composer, so
// dropping it would let the next Enter ship an unscanned attachment.
//
// The bug that caused this suite: nothing ever noticed the user *removing* a
// chip. Once a risky file had been attached, every later send in that tab
// re-scanned it and stayed blocked, and only a page reload cleared it.
//
// The fix evicts on positive evidence only — a file must have been seen in
// the composer and then be gone. The second test pins the fail-closed half:
// when the host never renders a filename we cannot tell "removed" from
// "selector broke", so the file keeps getting scanned.

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
const SAFE_TEXT = "just a friendly note";

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
      connect: vi.fn((opts) => {
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (!msg || msg.type !== "ANALYZE") return;
            analyzeMessages.push(msg);
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
              p.__deliverAnalyzeResult(result);
              p.disconnect();
            });
          },
        });
        port.name = (opts && opts.name) || "analyze";
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
  const chipRow = document.createElement("div");
  chipRow.id = "chip-row";
  form.appendChild(chipRow);
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
  return { form, chipRow, textarea, fileInput };
}

// Mirrors how the host apps surface an attachment: a chip inside the
// composer whose text is the filename.
function addChip(chipRow, name) {
  const chip = document.createElement("div");
  chip.dataset.chip = name;
  chip.textContent = name;
  chipRow.appendChild(chip);
}

function removeChip(chipRow, name) {
  const chip = chipRow.querySelector(`[data-chip="${name}"]`);
  if (chip) chip.remove();
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

async function flushAsync(steps = 14) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

function scannedTexts(stub) {
  return stub.__analyzeMessages.map((m) => m.text);
}

describe("stale attachments after a blocked send", () => {
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

  it("stops scanning a blocked file once the user removes its chip", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { chipRow, textarea, fileInput } = setUpComposer("summarize this");
    await flushAsync();

    addChip(chipRow, "secrets.txt");
    attachFile(fileInput, new File([SECRET_TEXT], "secrets.txt", { type: "text/plain" }));
    await flushAsync();
    pressEnter(textarea);
    await flushAsync(20);

    expect(scannedTexts(stub).some((t) => t.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
    const cancelBtn = document.getElementById("eraseai-cancel");
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    // The user clears the flagged attachment in the host UI and picks a
    // clean one — the whole point of cancelling.
    const before = stub.__analyzeMessages.length;
    removeChip(chipRow, "secrets.txt");
    addChip(chipRow, "notes.txt");
    attachFile(fileInput, new File([SAFE_TEXT], "notes.txt", { type: "text/plain" }));
    await flushAsync();
    pressEnter(textarea);
    await flushAsync(20);

    const second = scannedTexts(stub).slice(before);
    expect(second.some((t) => t.includes(SAFE_TEXT))).toBe(true);
    expect(second.some((t) => t.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(false);
  });

  it("keeps scanning a file the host never renders a chip for (fails closed)", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { textarea, fileInput } = setUpComposer("summarize this");
    await flushAsync();

    // No chip is ever added, so we have no evidence the file left the
    // composer. Dropping it here would be a silent bypass.
    attachFile(fileInput, new File([SECRET_TEXT], "secrets.txt", { type: "text/plain" }));
    await flushAsync();
    pressEnter(textarea);
    await flushAsync(20);

    document.getElementById("eraseai-cancel").click();

    const before = stub.__analyzeMessages.length;
    attachFile(fileInput, new File([SAFE_TEXT], "notes.txt", { type: "text/plain" }));
    await flushAsync();
    pressEnter(textarea);
    await flushAsync(20);

    const second = scannedTexts(stub).slice(before);
    expect(second.some((t) => t.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });
});
