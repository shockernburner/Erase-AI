// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Field report: "I attached a file with risky content, removed it, and a new safe message still
// shows the file's risk and will not send."
//
// The cache of attached files is cleared only on positive evidence that the host removed the chip
// (the file's name was seen in the composer and is now gone). That fails closed on purpose, but it
// left users stuck whenever the evidence could not be gathered:
//
//   1. the host shows the name only in an attribute (a thumbnail with an aria-label or title);
//   2. the page has another element matching a composer selector (an inline edit form, a second
//      composer) and the old lookup measured the wrong one, so the real chip was never seen;
//   3. the host never shows the name at all.
//
// 1 and 2 are now recognised. 3 cannot be told apart from "the selector broke", so the panel gives the
// user an explicit way out for each listed file ("I already removed this file"), which re-checks the
// message without it. The first test file pins that fail-closed behaviour; this one pins the way out.

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
const SAFE_PROMPT = "please summarise the attached notes";

function makePort(onPosted) {
  const l = { message: [], disconnect: [] };
  let done = false;
  const port = {
    name: "analyze",
    postMessage: vi.fn((msg) => onPosted && onPosted(msg, port)),
    disconnect: vi.fn(() => {
      if (done) return;
      done = true;
      for (const fn of l.disconnect.slice()) fn();
    }),
    onMessage: { addListener: vi.fn((fn) => l.message.push(fn)) },
    onDisconnect: { addListener: vi.fn((fn) => l.disconnect.push(fn)) },
    __deliver(result) {
      for (const fn of l.message.slice()) fn({ type: "ANALYZE_RESULT", result });
    },
  };
  return port;
}

function makeChrome() {
  const analyzed = [];
  return {
    __analyzed: analyzed,
    runtime: {
      lastError: undefined,
      connect: vi.fn((opts) => {
        const port = makePort((msg, p) => {
          if (!msg || msg.type !== "ANALYZE") return;
          analyzed.push(msg.text);
          const risky = msg.text.includes("AKIAIOSFODNN7EXAMPLE");
          const result = risky
            ? { riskScore: 10, level: "danger", issues: [{ severity: "critical", category: "secret", text: "AWS key" }], suggestions: [], summary: "Secret detected" }
            : { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" };
          queueMicrotask(() => { p.__deliver(result); p.disconnect(); });
        });
        port.name = (opts && opts.name) || "analyze";
        return port;
      }),
      sendMessage: vi.fn((msg, cb) => {
        if (msg.type === "BEGIN_CHECK") return queueMicrotask(() => cb({ allowed: true, paid: true }));
        if (msg.type === "GET_CONFIG") return queueMicrotask(() => cb({ apiKey: "eak_test", enabled: true }));
        if (cb) queueMicrotask(() => cb({ ok: true }));
      }),
      openOptionsPage: vi.fn(),
    },
    storage: {
      local: { get: vi.fn((k, cb) => queueMicrotask(() => cb({ enabled: true }))), set: vi.fn((o, cb) => { if (cb) queueMicrotask(cb); }) },
      onChanged: { addListener: vi.fn() },
    },
  };
}

function load(stub) {
  globalThis.chrome = stub;
  if (!document.execCommand) document.execCommand = () => true;
  (0, eval)(CONFIG_SRC);
  (0, eval)(EXTRACTOR_SRC);
  (0, eval)(CONTENT_SRC);
}

/** A composer: form > chip row, textarea, file input, Send button. `decoy` puts an unrelated form first. */
function buildComposer({ decoy = false } = {}) {
  document.body.innerHTML = "";
  const main = document.createElement("main");
  if (decoy) {
    // e.g. an inline "edit message" composer earlier in the page that matches the same selector
    const other = document.createElement("form");
    other.setAttribute("aria-label", "Chat input form");
    other.textContent = "Edit message";
    main.appendChild(other);
  }
  const form = document.createElement("form");
  const chipRow = document.createElement("div");
  form.appendChild(chipRow);
  const textarea = document.createElement("textarea");
  textarea.id = "prompt-textarea";
  textarea.value = SAFE_PROMPT;
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
  const sent = [];
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest('[data-testid="send-button"]') && textarea.value.trim()) {
      sent.push(textarea.value);
      textarea.value = "";
    }
  });
  return { form, chipRow, textarea, fileInput, sendBtn, sent };
}

const attachFile = (input, file) => {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
};
const pressEnter = (el) => el.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
const flush = async (n = 16) => { for (let i = 0; i < n; i += 1) await new Promise((r) => setTimeout(r, 0)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const secretFile = () => new File([SECRET_TEXT], "refunds.csv", { type: "text/csv" });

describe("removing a risky attachment lets the next safe message through", () => {
  beforeEach(() => { document.body.innerHTML = ""; delete globalThis.__eraseAIExtractor; });
  afterEach(() => {
    if (typeof globalThis.__eraseAIContentTeardown === "function") globalThis.__eraseAIContentTeardown();
    delete globalThis.__eraseAIContentTeardown;
    delete globalThis.chrome;
    delete globalThis.__eraseAIExtractor;
    document.body.innerHTML = "";
  });

  it("recognises a chip whose file name is only in an aria-label or title", async () => {
    const stub = makeChrome();
    load(stub);
    await flush();
    const { chipRow, textarea, fileInput } = buildComposer();
    await flush();

    const chip = document.createElement("div");
    chip.setAttribute("aria-label", "refunds.csv");
    chip.innerHTML = "<svg></svg>"; // thumbnail only: no text at all
    chipRow.appendChild(chip);
    attachFile(fileInput, secretFile());
    await wait(800); // the host has had time to draw the chip
    pressEnter(textarea);
    await flush(20);
    expect(stub.__analyzed.some((t) => t.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(true);
    document.getElementById("eraseai-cancel").click();

    chip.remove(); // the user removes the attachment
    const before = stub.__analyzed.length;
    pressEnter(textarea);
    await flush(20);
    const after = stub.__analyzed.slice(before);
    expect(after.some((t) => t.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(false);
    expect(after.some((t) => t.includes(SAFE_PROMPT))).toBe(true);
  });

  it("measures the composer that holds the input, not the first element that matches a composer selector", async () => {
    const stub = makeChrome();
    load(stub);
    await flush();
    const { chipRow, textarea, fileInput } = buildComposer({ decoy: true });
    await flush();

    const chip = document.createElement("div");
    chip.textContent = "refunds.csv";
    chipRow.appendChild(chip);
    attachFile(fileInput, secretFile());
    await wait(800);
    pressEnter(textarea);
    await flush(20);
    document.getElementById("eraseai-cancel").click();

    chip.remove();
    const before = stub.__analyzed.length;
    pressEnter(textarea);
    await flush(20);
    const after = stub.__analyzed.slice(before);
    expect(after.some((t) => t.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(false);
  });

  it("offers 'I already removed this file' when the host never shows the file name, and then sends", async () => {
    const stub = makeChrome();
    load(stub);
    await flush();
    const { textarea, fileInput, sent } = buildComposer();
    await flush();

    attachFile(fileInput, secretFile()); // no chip of any kind is ever drawn
    await flush();
    pressEnter(textarea);
    await flush(20);

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel.textContent).toContain("refunds.csv");
    const forget = panel.querySelector(".eraseai-forget-file");
    expect(forget).not.toBeNull();
    expect(forget.textContent).toMatch(/already removed/i);

    const before = stub.__analyzed.length;
    forget.click();
    await wait(200); // the re-press of Send fires after a short delay
    await flush(20);
    // the message is checked again, without the file
    const rechecked = stub.__analyzed.slice(before);
    expect(rechecked.some((t) => t.includes("AKIAIOSFODNN7EXAMPLE"))).toBe(false);
    expect(rechecked.some((t) => t.includes(SAFE_PROMPT))).toBe(true);
    // and, being safe, it goes out after the usual "All clear" moment
    await wait(1500);
    expect(sent).toEqual([SAFE_PROMPT]);
  });

  it("does not offer the way out for a file that was never listed", async () => {
    const stub = makeChrome();
    load(stub);
    await flush();
    const { textarea } = buildComposer();
    textarea.value = "My key is AKIAIOSFODNN7EXAMPLE";
    await flush();
    pressEnter(textarea);
    await flush(20);
    expect(document.querySelector(".eraseai-forget-file")).toBeNull();
  });
});
