// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://gemini.google.com/app"}
//
// Regression tests for Gemini prompts sending unscanned.
//
// Two independent ways the send hook could miss Gemini's arrow:
//
//  1. hookSendButtons used querySelector, so exactly one element per selector
//     was ever hooked. Gemini keeps other composers in the page (inline message
//     edits), and whichever came first in document order took the hook — not
//     necessarily the one the user is typing in.
//
//  2. Of the three selectors, only the English aria-label actually matched
//     current Gemini: the arrow is a bare <button> inside a gem-icon-button
//     host that carries the .send-button class, so `button.send-button` never
//     matched, and the mat-icon-button attribute is gone from the built output.
//     A translated UI left nothing at all to hook.
//
// Both failures are silent — no overlay, no history entry, the prompt simply
// goes to the model — so they are pinned here rather than left to manual QA.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");
const CONFIG_SRC = fs.readFileSync(path.join(SRC_DIR, "concurrency-config.js"), "utf8");
const EXTRACTOR_SRC = fs.readFileSync(path.join(SRC_DIR, "file-extractor.js"), "utf8");
const CONTENT_SRC = fs.readFileSync(path.join(SRC_DIR, "content.js"), "utf8");

const SECRET_PROMPT = "here is my AWS key AKIAIOSFODNN7EXAMPLE";

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
            queueMicrotask(() => {
              p.__deliverAnalyzeResult({
                riskScore: 10,
                level: "danger",
                issues: [{ severity: "critical", category: "secret", text: "AWS key" }],
                suggestions: [],
                summary: "Secret detected",
              });
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

// Gemini's real shape: the class sits on the gem-icon-button host and the
// clickable <button> is its child, with the icon the user actually hits nested
// one level deeper again.
function makeSendButton(ariaLabel) {
  const host = document.createElement("gem-icon-button");
  host.className = "send-button submit";
  const button = document.createElement("button");
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  const icon = document.createElement("mat-icon");
  icon.textContent = "send";
  button.appendChild(icon);
  host.appendChild(button);
  return { host, button, icon };
}

function makeEditor(text) {
  const rich = document.createElement("rich-textarea");
  const editor = document.createElement("div");
  editor.className = "ql-editor";
  editor.setAttribute("contenteditable", "true");
  editor.setAttribute("role", "textbox");
  editor.textContent = text;
  rich.appendChild(editor);
  return { rich, editor };
}

function setUpComposer({ promptText, sendLabel, decoyLabel, staleEditors = 0 } = {}) {
  document.body.innerHTML = "";
  const main = document.createElement("main");
  const container = document.createElement("div");
  container.className = "input-area-container";
  const area = document.createElement("div");
  area.className = "input-area";

  // Gemini gives every already-sent message an inline-edit editor of its own,
  // and they sit above the live composer in document order.
  for (let i = 0; i < staleEditors; i += 1) {
    main.appendChild(makeEditor("").rich);
  }

  // A stale composer's send button, sitting earlier in document order than the
  // live one. This is what querySelector used to pick.
  let decoy = null;
  if (decoyLabel) {
    decoy = makeSendButton(decoyLabel);
    area.appendChild(decoy.host);
  }

  const { rich, editor } = makeEditor(promptText);
  area.appendChild(rich);

  const send = makeSendButton(sendLabel);
  area.appendChild(send.host);

  container.appendChild(area);
  main.appendChild(container);
  document.body.appendChild(main);
  return { editor, send, decoy };
}

function clickIt(el) {
  return el.dispatchEvent(new window.MouseEvent("click", {
    bubbles: true, cancelable: true,
  }));
}

function pressEnter(el) {
  return el.dispatchEvent(new window.KeyboardEvent("keydown", {
    key: "Enter", bubbles: true, cancelable: true,
  }));
}

async function flushAsync(steps = 14) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
}

describe("Gemini send interception", () => {
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

  it("gates the live composer even when another send button precedes it", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { send, decoy } = setUpComposer({
      promptText: SECRET_PROMPT,
      sendLabel: "Send message",
      decoyLabel: "Send message",
    });
    await flushAsync();

    expect(decoy.button.dataset.eraseaiHooked).toBe("true");
    expect(send.button.dataset.eraseaiHooked).toBe("true");

    const notPrevented = clickIt(send.icon);
    await flushAsync(20);

    expect(notPrevented).toBe(false);
    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });

  it("gates a send button whose label is not in English", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { send } = setUpComposer({
      promptText: SECRET_PROMPT,
      sendLabel: "Verzend bericht",
    });
    await flushAsync();

    expect(send.button.dataset.eraseaiHooked).toBe("true");

    // The click lands on the icon, so the hook has to catch it on the way down.
    const notPrevented = clickIt(send.icon);
    await flushAsync(20);

    expect(notPrevented).toBe(false);
    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });

  it("reads the live composer, not an empty inline-edit box from an earlier turn", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { send } = setUpComposer({
      promptText: SECRET_PROMPT,
      sendLabel: "Send message",
      staleEditors: 2,
    });
    await flushAsync();

    const notPrevented = clickIt(send.icon);
    await flushAsync(20);

    // Reading the first .ql-editor finds it empty, and an empty prompt with no
    // attachments is waved through — the prompt reaches the model unscanned.
    expect(notPrevented).toBe(false);
    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });

  it("gates Enter pressed in the live composer alongside stale editors", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { editor } = setUpComposer({
      promptText: SECRET_PROMPT,
      sendLabel: "Send message",
      staleEditors: 2,
    });
    await flushAsync();

    const notPrevented = pressEnter(editor);
    await flushAsync(20);

    expect(notPrevented).toBe(false);
    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });

  it("gates a send button that only appears once the user has typed", async () => {
    const stub = makeChromeStub();
    loadEraseAI(stub);
    await flushAsync();
    const { editor } = setUpComposer({ promptText: "" });
    document.querySelector("gem-icon-button").remove();
    await flushAsync();

    // Gemini renders the arrow with *ngIf, so at rest there is nothing to hook.
    editor.textContent = SECRET_PROMPT;
    const send = makeSendButton("Send message");
    document.querySelector(".input-area").appendChild(send.host);
    await flushAsync();

    expect(send.button.dataset.eraseaiHooked).toBe("true");
    const notPrevented = clickIt(send.icon);
    await flushAsync(20);

    expect(notPrevented).toBe(false);
    expect(stub.__analyzeMessages.some((m) => m.text.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
  });
});
