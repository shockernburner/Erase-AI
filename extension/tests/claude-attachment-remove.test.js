// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://claude.ai/chat/abc"}
//
// Regression tests for the send hook swallowing attachment removal on Claude.
//
// Claude's send selectors ended with `fieldset button:last-of-type`, a
// structural wildcard that matches any button which is the last of its kind
// among its siblings. An attachment chip's X is exactly that, and chips render
// above the composer toolbar, so it also won the document-order race that
// querySelector decides. The X got the send hook, and clicking it ran a scan
// instead of detaching the file.
//
// The effect was worse than a stray scan: the only way to resolve a flagged
// attachment is to take it back out, and that was the single action the
// firewall blocked. These tests pin both halves of the fix — the tightened
// selector, and the dismiss-control guard that backs it up.

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

// Mirrors Claude's composer: a fieldset holding the chip row, the ProseMirror
// editor, and a toolbar whose last control is send.
function setUpComposer({ promptText, sendLabel } = {}) {
  document.body.innerHTML = "";
  const main = document.createElement("main");
  const form = document.createElement("form");
  const fieldset = document.createElement("fieldset");

  const chipRow = document.createElement("div");
  chipRow.id = "chip-row";
  fieldset.appendChild(chipRow);

  const editor = document.createElement("div");
  editor.setAttribute("contenteditable", "true");
  editor.className = "ProseMirror";
  editor.textContent = promptText;
  fieldset.appendChild(editor);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fieldset.appendChild(fileInput);

  const toolbar = document.createElement("div");
  const sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  if (sendLabel) sendBtn.setAttribute("aria-label", sendLabel);
  sendBtn.textContent = "Send";
  toolbar.appendChild(sendBtn);
  fieldset.appendChild(toolbar);

  form.appendChild(fieldset);
  main.appendChild(form);
  document.body.appendChild(main);
  return { chipRow, editor, fileInput, sendBtn };
}

// A chip whose X removes it, the way the host app does.
function addChip(chipRow, name, { label } = {}) {
  const chip = document.createElement("div");
  chip.dataset.chip = name;
  const text = document.createElement("span");
  text.textContent = name;
  chip.appendChild(text);
  const remove = document.createElement("button");
  if (label) remove.setAttribute("aria-label", label);
  remove.textContent = "x";
  remove.addEventListener("click", () => chip.remove());
  chip.appendChild(remove);
  chipRow.appendChild(chip);
  return remove;
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

// Returns false when a handler called preventDefault, matching dispatchEvent.
function clickIt(el) {
  return el.dispatchEvent(new window.MouseEvent("click", {
    bubbles: true, cancelable: true,
  }));
}

async function flushAsync(steps = 14) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("removing a flagged attachment on Claude", () => {
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

  it("lets the user take a blocked attachment back out after cancelling", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { chipRow, editor, fileInput } = setUpComposer({
      promptText: "summarize this",
      sendLabel: "Send message",
    });
    await flushAsync();

    const removeBtn = addChip(chipRow, "secrets.txt", { label: "Remove secrets.txt" });
    attachFile(fileInput, new File([SECRET_TEXT], "secrets.txt", { type: "text/plain" }));
    await flushAsync();
    pressEnter(editor);
    await flushAsync(20);

    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
    document.getElementById("eraseai-cancel").click();

    // The user now does the one thing that resolves the block.
    const before = stub.__analyzeMessages.length;
    const notPrevented = clickIt(removeBtn);
    await flushAsync(20);

    expect(notPrevented).toBe(true);
    expect(chipRow.querySelector('[data-chip="secrets.txt"]')).toBeNull();
    expect(stub.__analyzeMessages.length).toBe(before);
  });

  it("does not hook a chip button that carries no accessible name", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { chipRow, sendBtn } = setUpComposer({
      promptText: "summarize this",
      sendLabel: "Send message",
    });
    await flushAsync();

    // No label, so the dismiss guard cannot recognise it. The selector is what
    // has to keep it out — this is the half that fails if the wildcard returns.
    const removeBtn = addChip(chipRow, "secrets.txt");
    await flushAsync();

    expect(removeBtn.dataset.eraseaiHooked).toBeUndefined();
    expect(sendBtn.dataset.eraseaiHooked).toBe("true");

    const notPrevented = clickIt(removeBtn);
    await flushAsync(20);
    expect(notPrevented).toBe(true);
    expect(stub.__analyzeMessages.length).toBe(0);
  });

  it("still gates send when the button is identified only by its submit type", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    // Claude has renamed this control before ("Send Message" -> "Send message"),
    // so the type-scoped selector has to stand on its own.
    const { sendBtn } = setUpComposer({ promptText: "here is my AWS key AKIAIOSFODNN7EXAMPLE" });
    await flushAsync();

    expect(sendBtn.dataset.eraseaiHooked).toBe("true");
    const notPrevented = clickIt(sendBtn);
    await flushAsync(20);

    expect(notPrevented).toBe(false);
    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });
});
