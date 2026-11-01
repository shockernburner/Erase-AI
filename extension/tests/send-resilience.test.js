// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// "All clear" must always end in a sent message.
//
// Field report (ChatGPT, Claude and Gemini): from the second message of a thread the panel said
// "All clear" and the message was never sent. The send used to be one programmatic click, aimed at
// a button chosen 50 ms earlier, with no check that the host reacted. A host that re-draws its
// composer in that window, or ignores one synthetic click, left the user staring at a message that
// never left. These tests pin the behaviour that replaces it:
//
//   - the Send button is looked up again at the moment of the click;
//   - if the draft is still there afterwards, the send is retried (click, form submit, Enter);
//   - if nothing works the user is told, and their own next press goes through;
//   - a bypass that was armed but never used cannot wave through a later, unchecked send;
//   - an extension that was updated under an open tab, or a stuck check, cannot swallow sends.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "src");
const CONFIG_SRC = fs.readFileSync(path.join(SRC, "concurrency-config.js"), "utf8");
const CONTENT_SRC = fs.readFileSync(path.join(SRC, "content.js"), "utf8");

const SAFE = { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" };

function makePort(result) {
  const l = { message: [], disconnect: [] };
  let done = false;
  const port = {
    name: "analyze",
    postMessage: vi.fn((msg) => {
      if (msg && msg.type === "ANALYZE") {
        queueMicrotask(() => {
          for (const fn of l.message.slice()) fn({ type: "ANALYZE_RESULT", result });
          port.disconnect();
        });
      }
    }),
    disconnect: vi.fn(() => {
      if (done) return;
      done = true;
      for (const fn of l.disconnect.slice()) fn();
    }),
    onMessage: { addListener: vi.fn((fn) => l.message.push(fn)) },
    onDisconnect: { addListener: vi.fn((fn) => l.disconnect.push(fn)) },
  };
  return port;
}

function makeChrome({ sendMessage } = {}) {
  const base = vi.fn((msg, cb) => {
    if (msg.type === "BEGIN_CHECK") return queueMicrotask(() => cb({ allowed: true, paid: true }));
    if (msg.type === "GET_CONFIG") return queueMicrotask(() => cb({ apiKey: "eak_test", enabled: true }));
    if (typeof cb === "function") queueMicrotask(() => cb({ ok: true }));
  });
  return {
    runtime: {
      lastError: undefined,
      connect: vi.fn(() => makePort(SAFE)),
      sendMessage: sendMessage ? vi.fn(sendMessage(base)) : base,
    },
    storage: {
      local: { get: vi.fn((k, cb) => queueMicrotask(() => cb({ enabled: true }))), set: vi.fn(() => Promise.resolve()) },
      onChanged: { addListener: vi.fn() },
    },
  };
}

function load(chromeStub) {
  globalThis.chrome = chromeStub;
  if (!document.execCommand) document.execCommand = () => true;
  (0, eval)(CONFIG_SRC);
  (0, eval)(CONTENT_SRC);
}

const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };
const enter = (el) => el.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
const advance = async (ms) => { await vi.advanceTimersByTimeAsync(ms); await flush(); };

/**
 * A chat host. `sent` collects messages. Options choose which ways of sending the host honours:
 *   click   - the Send button's click handler sends
 *   submit  - the form's submit event sends
 *   enter   - Enter in the textarea sends
 * A sent message clears the textarea, like every real host.
 */
function buildHost({ click = true, submit = false, enter: honourEnter = false, text = "How do clouds form?", ignoreClicks = 0 } = {}) {
  document.body.innerHTML = "";
  const sent = [];
  const form = document.createElement("form");
  const textarea = document.createElement("textarea");
  textarea.id = "prompt-textarea";
  textarea.value = text;
  form.appendChild(textarea);
  const doSend = () => {
    if (!textarea.value.trim()) return;
    sent.push(textarea.value);
    textarea.value = "";
  };
  function makeButton() {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-testid", "send-button");
    b.textContent = "Send";
    return b;
  }
  // Delegated, like React: a click only reaches the handler while the button is attached to the page.
  let toIgnore = ignoreClicks;
  document.addEventListener("click", (e) => {
    if (!click || !e.target.closest || !e.target.closest('[data-testid="send-button"]')) return;
    if (toIgnore > 0) { toIgnore -= 1; return; }
    doSend();
  });
  let button = makeButton();
  form.appendChild(button);
  if (submit) form.addEventListener("submit", (e) => { e.preventDefault(); doSend(); });
  else form.addEventListener("submit", (e) => e.preventDefault());
  if (honourEnter) textarea.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } });
  document.body.appendChild(form);
  return {
    form, textarea, sent,
    get button() { return button; },
    /** The host starts honouring clicks (a real user click after a transient problem). */
    enableClicks() { click = true; toIgnore = 0; },
    /** Replace the Send button with a fresh node, as a framework re-render does. */
    redrawButton() {
      const next = makeButton();
      button.replaceWith(next);
      button = next;
    },
  };
}

describe("an 'All clear' always ends in a sent message", () => {
  beforeEach(() => { document.body.innerHTML = ""; vi.useFakeTimers(); });
  afterEach(() => {
    if (typeof globalThis.__eraseAIContentTeardown === "function") globalThis.__eraseAIContentTeardown();
    delete globalThis.__eraseAIContentTeardown;
    vi.useRealTimers();
    delete globalThis.chrome;
    document.body.innerHTML = "";
  });

  async function startWith(hostOpts, chromeOpts) {
    load(makeChrome(chromeOpts));
    await flush();
    const host = buildHost(hostOpts);
    await flush();
    return host;
  }

  it("still sends when the host re-draws its Send button as the panel closes (stale-button regression)", async () => {
    const host = await startWith({ click: true });
    // React-style: the moment our overlay leaves the DOM the composer re-renders with a new button.
    const obs = new MutationObserver(() => {
      if (!document.getElementById("eraseai-overlay-backdrop") && host.button.isConnected && !host.__redrawn) {
        host.__redrawn = true;
        host.redrawButton();
      }
    });
    enter(host.textarea);
    await flush();
    expect(document.getElementById("eraseai-clear-cancel")).not.toBeNull();
    obs.observe(document.body, { childList: true, subtree: true });
    await advance(1300);
    await advance(2000);
    obs.disconnect();
    expect(host.__redrawn).toBe(true);
    expect(host.sent).toEqual(["How do clouds form?"]);
  });

  it("retries with a fresh click when the first synthetic click is ignored", async () => {
    // The first synthetic click does nothing (a disabled-looking moment); later clicks work.
    const host = await startWith({ click: true, ignoreClicks: 1 });
    enter(host.textarea);
    await flush();
    await advance(1300);
    expect(host.sent).toEqual([]);
    await advance(2500);
    expect(host.sent).toEqual(["How do clouds form?"]);
  });

  it("falls back to submitting the form when the Send button never responds", async () => {
    const host = await startWith({ click: false, submit: true });
    enter(host.textarea);
    await flush();
    await advance(1300);
    await advance(4000);
    expect(host.sent).toEqual(["How do clouds form?"]);
  });

  it("falls back to pressing Enter when neither the button nor the form responds", async () => {
    const host = await startWith({ click: false, submit: false, enter: true });
    // The user's own Enter is swallowed by the check; only the extension's replayed Enter reaches the host.
    enter(host.textarea);
    await flush();
    expect(host.sent).toEqual([]);
    await advance(1300);
    await advance(6000);
    expect(host.sent).toEqual(["How do clouds form?"]);
  });

  it("when nothing works, says so, and lets the user's own next press through without a second scan", async () => {
    const host = await startWith({ click: false, submit: false, enter: false });
    enter(host.textarea);
    await flush();
    await advance(1300);
    await advance(8000);
    const notice = document.getElementById("eraseai-notice");
    expect(notice).not.toBeNull();
    expect(notice.textContent).toMatch(/press send again/i);
    expect(host.sent).toEqual([]);
    // The host starts working (e.g. the user clicks the real button themselves). No new overlay.
    host.enableClicks();
    host.button.click();
    await flush();
    expect(document.getElementById("eraseai-overlay-backdrop")).toBeNull();
    expect(host.sent).toEqual(["How do clouds form?"]);
  });

  it("an unused bypass cannot wave a later, different message past the check", async () => {
    const host = await startWith({ click: false, submit: false, enter: false });
    enter(host.textarea);
    await flush();
    await advance(1300);
    await advance(8000);
    host.textarea.value = "My new message, never checked";
    enter(host.textarea);
    await flush();
    expect(document.getElementById("eraseai-overlay-backdrop")).not.toBeNull();
  });

  it("does not swallow sends after the extension was updated under an open tab", async () => {
    const dead = () => () => { throw new Error("Extension context invalidated."); };
    const host = await startWith({ click: true }, { sendMessage: dead });
    enter(host.textarea);
    await flush();
    await advance(500);
    expect(host.sent).toEqual(["How do clouds form?"]);
    expect(document.getElementById("eraseai-notice").textContent).toMatch(/reload/i);
    // and the next one is not stuck behind a half-finished check either
    host.textarea.value = "Second message";
    enter(host.textarea);
    await flush();
    await advance(500);
    expect(host.sent).toEqual(["How do clouds form?", "Second message"]);
  });

  it("recovers when a check never finishes (stuck 'checking' state)", async () => {
    let beginChecks = 0;
    const hang = (base) => (msg, cb) => {
      if (msg.type === "BEGIN_CHECK") {
        beginChecks += 1;
        if (beginChecks === 1) return; // never answers
      }
      return base(msg, cb);
    };
    const host = await startWith({ click: true }, { sendMessage: hang });
    enter(host.textarea);
    await flush();
    expect(document.getElementById("eraseai-overlay-backdrop")).toBeNull();
    await advance(6000);
    enter(host.textarea);
    await flush();
    expect(document.getElementById("eraseai-overlay-backdrop")).not.toBeNull();
    await advance(1300);
    await advance(1000);
    expect(host.sent).toEqual(["How do clouds form?"]);
  });
});
