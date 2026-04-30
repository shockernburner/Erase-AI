// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://chatgpt.com/"}
//
// Tests the in-page firewall overlay (extension/src/content.js). Task #113
// kills the silent auto-bypass that previously dismissed the overlay and
// clicked Send when the analyzer returned a safe result, with no feedback to
// the user. The tests below assert:
//
//   1. The overlay ALWAYS renders a panel after analysis — no silent skip
//      ever, even on a clean prompt.
//   2. The new "All clear" panel auto-dismisses + sends after ~1.2s.
//   3. The Cancel button reachable during that window suppresses the send.
//   4. A cautionary analyzer result still renders the full warning panel
//      with Sanitize and Send Anyway buttons (no regression).
//
// content.js is wrapped in an IIFE so we evaluate its source in the jsdom
// `window` context after stubbing `chrome` — this matches how Chrome runs
// the file at document_idle.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// concurrency-config.js exposes globalThis.EraseAIConcurrency. content.js
// consumes it for its analyze fan-out cap and won't initialize without
// it loaded first, mirroring the manifest's content_scripts.js order.
const CONFIG_SRC = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "concurrency-config.js"),
  "utf8",
);
const CONTENT_SRC = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "content.js"),
  "utf8",
);

// Build a fake `chrome.runtime.Port` that captures the analyze message
// posted by content.js and lets the test deliver a result (or never deliver
// one, to simulate a worker suspension that the long-lived port should
// still survive).
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
      const payload = { type: "ANALYZE_RESULT", result };
      for (const fn of listeners.message.slice()) fn(payload);
    },
    __deliverSanitizeResult(result) {
      const payload = { type: "SANITIZE_RESULT", result };
      for (const fn of listeners.message.slice()) fn(payload);
    },
    // Back-compat shim for older tests that called __deliverResult before
    // the sanitize port existed; defaults to the analyze wrapper shape.
    __deliverResult(result) {
      port.__deliverAnalyzeResult(result);
    },
    __triggerDisconnect() {
      port.disconnect();
    },
    __isDisconnected() {
      return disconnected;
    },
  };
  return port;
}

function makeChromeStub({
  enabled = true,
  apiKey = "eak_test",
  analyzeResult = { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" },
  sanitizeResult = null,
  outcomes = [],
  ports = [],
} = {}) {
  const listeners = { onChanged: [] };
  return {
    __listeners: listeners,
    __outcomes: outcomes,
    __ports: ports,
    runtime: {
      lastError: undefined,
      // Long-lived port transport for ANALYZE and SANITIZE — the
      // production code path since the MV3-suspension root-cause fix
      // (tasks #124 + #125).
      connect: vi.fn((info) => {
        const portName = info && info.name ? info.name : "analyze";
        const port = makeFakePort({
          onPosted: (msg, p) => {
            if (msg && msg.type === "ANALYZE") {
              // Mirror the background's behaviour: deliver the result via
              // the port and then disconnect.
              queueMicrotask(() => {
                p.__deliverAnalyzeResult(analyzeResult);
                p.disconnect();
              });
            } else if (msg && msg.type === "SANITIZE") {
              const result = sanitizeResult || { sanitized: msg.text, changes: [] };
              queueMicrotask(() => {
                p.__deliverSanitizeResult(result);
                p.disconnect();
              });
            }
          },
        });
        port.name = portName;
        ports.push(port);
        return port;
      }),
      sendMessage: vi.fn((msg, cb) => {
        if (msg.type === "GET_CONFIG") {
          // Simulate the async hop the real service worker takes.
          queueMicrotask(() => cb({ apiKey, enabled, apiUrl: "https://eraseai.ai" }));
          return;
        }
        if (msg.type === "OUTCOME") {
          outcomes.push(msg.outcome);
          if (typeof cb === "function") queueMicrotask(() => cb({ ok: true }));
          return;
        }
        if (typeof cb === "function") queueMicrotask(() => cb({}));
      }),
    },
    storage: {
      local: {
        get: vi.fn((keys, cb) => {
          if (typeof cb === "function") {
            queueMicrotask(() => cb({ enabled }));
          } else {
            return Promise.resolve({ enabled });
          }
        }),
        set: vi.fn(() => Promise.resolve()),
      },
      onChanged: {
        addListener: vi.fn((fn) => listeners.onChanged.push(fn)),
      },
    },
  };
}

function loadContentScriptInJsdom(chromeStub) {
  globalThis.chrome = chromeStub;
  // Some sites mock execCommand; jsdom doesn't implement contenteditable
  // commands, so stub it as a no-op to keep the sanitize flow harmless.
  if (!document.execCommand) document.execCommand = () => true;
  // The IIFE in content.js calls init() at the bottom which kicks off the
  // listener attachment via chrome.storage.local.get. eval-ing in the
  // current realm gives the script the same `document` and `window` we
  // assert against.
  // eslint-disable-next-line no-eval
  (0, eval)(CONFIG_SRC);
  // eslint-disable-next-line no-eval
  (0, eval)(CONTENT_SRC);
}

async function flushAsync() {
  // Two microtask flushes — GET_CONFIG callback, then ANALYZE callback.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function setUpChatGPTDom() {
  document.body.innerHTML = "";
  const textarea = document.createElement("textarea");
  textarea.id = "prompt-textarea";
  textarea.value = "tell me a fun fact about otters";
  document.body.appendChild(textarea);

  const sendBtn = document.createElement("button");
  sendBtn.setAttribute("data-testid", "send-button");
  sendBtn.type = "button";
  sendBtn.textContent = "Send";
  document.body.appendChild(sendBtn);

  return { textarea, sendBtn };
}

function dispatchEnterOn(el) {
  const evt = new window.KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(evt);
  return evt;
}

describe("content.js — always-show panel + auto-dismiss confirmation (task #113)", () => {
  let chromeStub;

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.chrome;
    document.body.innerHTML = "";
  });

  it("renders the 'All clear' confirmation panel for a safe analyzer result (no silent skip)", async () => {
    chromeStub = makeChromeStub({
      analyzeResult: {
        riskScore: 100,
        level: "safe",
        issues: [],
        suggestions: [],
        summary: "No issues detected. This prompt appears safe to send to AI systems.",
      },
    });
    loadContentScriptInJsdom(chromeStub);

    // Let init() run the chrome.storage.local.get callback that attaches
    // listeners.
    await flushAsync();

    const { textarea } = setUpChatGPTDom();
    // The MutationObserver in content.js hooks the send button when it
    // appears in the DOM. Run any pending microtasks so the hook is in
    // place before we dispatch the keypress.
    await flushAsync();

    dispatchEnterOn(textarea);
    await flushAsync();

    const backdrop = document.getElementById("eraseai-overlay-backdrop");
    expect(backdrop).not.toBeNull();
    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).not.toBeNull();

    // Headline copy must say all clear so the user can SEE the firewall ran.
    expect(panel.textContent).toMatch(/All clear/i);
    expect(panel.textContent).toMatch(/Low Risk|Safe/i);

    // Both Cancel and Send-now buttons are present during the auto-dismiss
    // window — the user can always abort.
    expect(document.getElementById("eraseai-clear-cancel")).not.toBeNull();
    expect(document.getElementById("eraseai-clear-send")).not.toBeNull();

    // Crucially: the Send Anyway / risky red button from the warning panel
    // must NOT be in the DOM for a safe result.
    expect(document.getElementById("eraseai-send-anyway")).toBeNull();
  });

  it("auto-dismisses + clicks the platform Send button after ~1.2s", async () => {
    chromeStub = makeChromeStub({
      analyzeResult: {
        riskScore: 95,
        level: "safe",
        issues: [],
        suggestions: [],
        summary: "All clear",
      },
    });
    loadContentScriptInJsdom(chromeStub);
    await flushAsync();

    const { textarea, sendBtn } = setUpChatGPTDom();
    const sendClickSpy = vi.fn();
    sendBtn.addEventListener("click", sendClickSpy);

    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync();

    expect(document.getElementById("eraseai-overlay-backdrop")).not.toBeNull();
    // Send button should NOT have been clicked yet — the overlay is still
    // showing its 1.2s confirmation window.
    expect(sendClickSpy).not.toHaveBeenCalled();

    // Advance the auto-dismiss timer + the small triggerSend setTimeout.
    await vi.advanceTimersByTimeAsync(1300);
    await flushAsync();

    expect(document.getElementById("eraseai-overlay-backdrop")).toBeNull();
    // The first click is from interceptSubmission's hook firing on the
    // dispatched keydown? No — keydown doesn't click the button. The only
    // click should come from triggerSend after the auto-dismiss timer.
    expect(sendClickSpy).toHaveBeenCalledTimes(1);
  });

  it("Cancel during the auto-dismiss window suppresses the auto-send", async () => {
    chromeStub = makeChromeStub({
      analyzeResult: {
        riskScore: 100,
        level: "safe",
        issues: [],
        suggestions: [],
        summary: "All clear",
      },
    });
    loadContentScriptInJsdom(chromeStub);
    await flushAsync();

    const { textarea, sendBtn } = setUpChatGPTDom();
    const sendClickSpy = vi.fn();
    sendBtn.addEventListener("click", sendClickSpy);

    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync();

    const cancelBtn = document.getElementById("eraseai-clear-cancel");
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();

    // Even after the auto-dismiss timer would fire, no send must happen.
    await vi.advanceTimersByTimeAsync(2000);
    await flushAsync();

    expect(document.getElementById("eraseai-overlay-backdrop")).toBeNull();
    expect(sendClickSpy).not.toHaveBeenCalled();
  });

  it("does not stale-fire the auto-send timer if the overlay is replaced before 1.2s (race regression)", async () => {
    chromeStub = makeChromeStub({
      analyzeResult: {
        riskScore: 100,
        level: "safe",
        issues: [],
        suggestions: [],
        summary: "All clear",
      },
    });
    loadContentScriptInJsdom(chromeStub);
    await flushAsync();

    const { textarea, sendBtn } = setUpChatGPTDom();
    const sendClickSpy = vi.fn();
    sendBtn.addEventListener("click", sendClickSpy);

    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync();

    // Sanity: the safe panel is up.
    expect(document.getElementById("eraseai-clear-cancel")).not.toBeNull();

    // Simulate a second submission BEFORE the 1.2s window elapses — the
    // most likely real-world way an overlay gets replaced (user types
    // another prompt and hits Enter again before the previous panel
    // auto-dismissed).
    await vi.advanceTimersByTimeAsync(400);
    expect(sendClickSpy).not.toHaveBeenCalled();

    const sentinelValue = "SECOND_PROMPT_SENTINEL_value";
    textarea.value = sentinelValue;
    // Capture the textarea value AT the moment the platform Send is clicked.
    // This proves the surviving send is tied to the second-submission flow
    // (the textarea hasn't been mutated since), not the stale first timer
    // happening to win and "look like" a single send.
    let textAtSendTime = null;
    sendBtn.addEventListener("click", () => {
      textAtSendTime = textarea.value;
    });
    dispatchEnterOn(textarea);
    await flushAsync();

    // Cross the deadline of the FIRST timer (originally 1200ms after first
    // submit; we are 400ms past that, so 800ms-from-second is when the
    // stale timer would fire if not cancelled). +50ms covers the small
    // triggerSend setTimeout. Nothing must have sent yet.
    await vi.advanceTimersByTimeAsync(850);
    await flushAsync();
    expect(
      sendClickSpy,
      "stale first-submission timer must have been cancelled when overlay was replaced",
    ).not.toHaveBeenCalled();

    // Now cross the SECOND timer's deadline (1200ms from second submit
    // + 50ms for triggerSend = 1250ms; we've already advanced 850ms past
    // second submit, so 450ms more is plenty).
    await vi.advanceTimersByTimeAsync(500);
    await flushAsync();

    // Exactly ONE send must have happened — and it must be tied to the
    // SECOND submission (the textarea contents at click time are the
    // sentinel from the second prompt).
    expect(sendClickSpy).toHaveBeenCalledTimes(1);
    expect(textAtSendTime).toBe(sentinelValue);
  });

  it("renders the full warning panel (Sanitize + Send Anyway) for cautionary results", async () => {
    chromeStub = makeChromeStub({
      analyzeResult: {
        riskScore: 55,
        level: "caution",
        issues: [
          { category: "pii", severity: "high", detail: "Email address found in prompt", match: "a@b.c", start: 0, end: 5 },
        ],
        suggestions: [
          { category: "pii", action: "Redact", detail: "Replace with placeholder values" },
        ],
        summary: "Found 1 issue: 1 pii.",
      },
    });
    loadContentScriptInJsdom(chromeStub);
    await flushAsync();

    const { textarea, sendBtn } = setUpChatGPTDom();
    const sendClickSpy = vi.fn();
    sendBtn.addEventListener("click", sendClickSpy);

    await flushAsync();
    dispatchEnterOn(textarea);
    await flushAsync();

    const panel = document.getElementById("eraseai-overlay-panel");
    expect(panel).not.toBeNull();
    expect(document.getElementById("eraseai-cancel")).not.toBeNull();
    expect(document.getElementById("eraseai-sanitize")).not.toBeNull();
    expect(document.getElementById("eraseai-send-anyway")).not.toBeNull();

    // The "All clear" auto-dismiss IDs must NOT be present for a cautionary
    // result — those belong to the safe-path confirmation panel only.
    expect(document.getElementById("eraseai-clear-cancel")).toBeNull();
    expect(document.getElementById("eraseai-clear-send")).toBeNull();

    // No auto-send: the cautionary panel must wait for an explicit user choice.
    await vi.advanceTimersByTimeAsync(3000);
    expect(sendClickSpy).not.toHaveBeenCalled();
  });

  describe("outcome reporting (task #114)", () => {
    it("auto-dismiss safe path posts an OUTCOME with action=auto-send and level=safe", async () => {
      chromeStub = makeChromeStub({
        analyzeResult: {
          riskScore: 95,
          level: "safe",
          issues: [],
          suggestions: [],
          summary: "All clear",
        },
      });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      await vi.advanceTimersByTimeAsync(1300);
      await flushAsync();

      expect(chromeStub.__outcomes).toHaveLength(1);
      const ev = chromeStub.__outcomes[0];
      expect(ev.action).toBe("auto-send");
      expect(ev.level).toBe("safe");
      expect(ev.riskScore).toBe(95);
      expect(Array.isArray(ev.categories)).toBe(true);
    });

    it("Cancel on the safe-path confirmation reports action=cancel exactly once", async () => {
      chromeStub = makeChromeStub({
        analyzeResult: {
          riskScore: 100,
          level: "safe",
          issues: [],
          suggestions: [],
          summary: "All clear",
        },
      });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      document.getElementById("eraseai-clear-cancel").click();
      await vi.advanceTimersByTimeAsync(2000);
      await flushAsync();

      const cancels = chromeStub.__outcomes.filter((o) => o.action === "cancel");
      expect(cancels).toHaveLength(1);
      expect(cancels[0].level).toBe("safe");
      // Auto-send must NOT also have fired.
      expect(chromeStub.__outcomes.some((o) => o.action === "auto-send")).toBe(false);
    });

    it("Cancel on a warning panel reports action=cancel with the warning level + categories", async () => {
      chromeStub = makeChromeStub({
        analyzeResult: {
          riskScore: 55,
          level: "caution",
          issues: [
            { category: "pii", severity: "high", detail: "Email address found", match: "a@b.c", start: 0, end: 5 },
            { category: "secrets", severity: "high", detail: "API key found", match: "sk_x", start: 6, end: 10 },
          ],
          suggestions: [],
          summary: "2 issues",
        },
      });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      document.getElementById("eraseai-cancel").click();
      await flushAsync();

      expect(chromeStub.__outcomes).toHaveLength(1);
      const ev = chromeStub.__outcomes[0];
      expect(ev.action).toBe("cancel");
      expect(ev.level).toBe("caution");
      expect(ev.riskScore).toBe(55);
      expect(ev.categories).toEqual(expect.arrayContaining(["pii", "secrets"]));
    });

    it("Send Anyway on a warning panel reports action=send-anyway when nothing was sanitized", async () => {
      chromeStub = makeChromeStub({
        analyzeResult: {
          riskScore: 30,
          level: "danger",
          issues: [
            { category: "secrets", severity: "high", detail: "API key", match: "sk_x", start: 0, end: 4 },
          ],
          suggestions: [],
          summary: "1 issue",
        },
      });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea, sendBtn } = setUpChatGPTDom();
      const sendClickSpy = vi.fn();
      sendBtn.addEventListener("click", sendClickSpy);
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      document.getElementById("eraseai-send-anyway").click();
      await vi.advanceTimersByTimeAsync(100);
      await flushAsync();

      expect(chromeStub.__outcomes).toHaveLength(1);
      const ev = chromeStub.__outcomes[0];
      expect(ev.action).toBe("send-anyway");
      expect(ev.level).toBe("danger");
    });
  });

  describe("analyze hard timeout (task #122 — firewall stuck on Analyzing…)", () => {
    function makeHangingChromeStub() {
      const listeners = { onChanged: [] };
      const storageSets = [];
      const ports = [];
      return {
        __listeners: listeners,
        __storageSets: storageSets,
        __ports: ports,
        runtime: {
          lastError: undefined,
          // The whole point: the analyze port is opened but the
          // background "never wakes up" to deliver a result. The port
          // stays connected for the entire test, so even with the
          // long-lived port transport in place, the 15s safety-net timer
          // is the thing that must promote the overlay to a terminal
          // error state.
          connect: vi.fn(() => {
            const port = makeFakePort();
            ports.push(port);
            return port;
          }),
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (typeof cb === "function") queueMicrotask(() => cb({}));
          }),
        },
        storage: {
          local: {
            get: vi.fn((keys, cb) => {
              if (typeof cb === "function") {
                queueMicrotask(() => cb({ enabled: true }));
              } else {
                return Promise.resolve({ enabled: true });
              }
            }),
            set: vi.fn((obj) => {
              storageSets.push(obj);
              return Promise.resolve();
            }),
          },
          onChanged: {
            addListener: vi.fn((fn) => listeners.onChanged.push(fn)),
          },
        },
      };
    }

    it("renders the error panel and persists lastAttempt=timeout when ANALYZE never responds within the 15s deadline", async () => {
      const chromeStub = makeHangingChromeStub();
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // Spinner panel is up, no error panel yet.
      let panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(false);

      // Just before the 15s deadline: still spinning, still no error panel.
      await vi.advanceTimersByTimeAsync(14000);
      await flushAsync();
      panel = document.getElementById("eraseai-overlay-panel");
      expect(panel.classList.contains("eraseai-error-panel")).toBe(false);

      // Cross the deadline.
      await vi.advanceTimersByTimeAsync(2000);
      await flushAsync();

      panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(true);
      // The "Couldn't analyze" headline must be present so a viewer at a
      // glance knows this is a terminal failure, not the analyzing state.
      expect(panel.textContent).toMatch(/Couldn't analyze/i);
      // The Open Extension Popup button must be present for timeout cases.
      expect(document.getElementById("eraseai-open-popup")).not.toBeNull();
      // Send Anyway and Close are still there.
      expect(document.getElementById("eraseai-send-anyway")).not.toBeNull();
      expect(document.getElementById("eraseai-cancel")).not.toBeNull();

      // lastAttempt timeout must have been persisted so the popup can show it.
      const lastAttemptWrites = chromeStub.__storageSets.filter((s) => "lastAttempt" in s);
      expect(lastAttemptWrites.length).toBeGreaterThanOrEqual(1);
      const tail = lastAttemptWrites[lastAttemptWrites.length - 1].lastAttempt;
      expect(tail.status).toBe("timeout");
      expect(typeof tail.at).toBe("number");
      expect(tail.reason).toMatch(/no response/i);
    });

    it("error panel wipes the analyzing-state DOM (no orphaned spinner element)", async () => {
      const chromeStub = makeHangingChromeStub();
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // Spinner is up.
      expect(document.querySelector(".eraseai-spinner")).not.toBeNull();

      await vi.advanceTimersByTimeAsync(16000);
      await flushAsync();

      // After timeout swap the spinner element AND the "Analyzing…" copy
      // MUST both be gone — otherwise the panel shows a confusing
      // half-error-half-spinner state.
      expect(document.querySelector(".eraseai-spinner")).toBeNull();
      const panel = document.getElementById("eraseai-overlay-panel");
      expect(panel.textContent).not.toMatch(/Analyzing your prompt/i);
    });

    it("late ANALYZE response after the timeout has fired does NOT flip the UI back to a result panel", async () => {
      // Stash the analyze port so we can deliver a late result over it
      // AFTER the safety-net timer has already promoted the overlay to
      // the error state. With the long-lived port transport this should
      // be even rarer than under sendMessage (because the port keep-alive
      // prevents the underlying suspension), but the rendering code must
      // still refuse to clobber the user-visible error if a late result
      // ever lands.
      const listeners = { onChanged: [] };
      const storageSets = [];
      let savedPort = null;
      const chromeStub = {
        __listeners: listeners,
        __storageSets: storageSets,
        runtime: {
          lastError: undefined,
          connect: vi.fn(() => {
            savedPort = makeFakePort();
            return savedPort;
          }),
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (typeof cb === "function") queueMicrotask(() => cb({}));
          }),
        },
        storage: {
          local: {
            get: vi.fn((keys, cb) => {
              if (typeof cb === "function") {
                queueMicrotask(() => cb({ enabled: true }));
              } else {
                return Promise.resolve({ enabled: true });
              }
            }),
            set: vi.fn((obj) => {
              storageSets.push(obj);
              return Promise.resolve();
            }),
          },
          onChanged: {
            addListener: vi.fn((fn) => listeners.onChanged.push(fn)),
          },
        },
      };

      loadContentScriptInJsdom(chromeStub);
      await flushAsync();
      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // Fire the timeout.
      await vi.advanceTimersByTimeAsync(16000);
      await flushAsync();

      const panel = document.getElementById("eraseai-overlay-panel");
      expect(panel.classList.contains("eraseai-error-panel")).toBe(true);
      const errorHtmlBefore = panel.innerHTML;

      // Now the suspended worker "wakes up" and finally answers via the
      // still-open port.
      expect(savedPort).not.toBeNull();
      savedPort.__deliverResult({
        riskScore: 100,
        level: "safe",
        issues: [],
        suggestions: [],
        summary: "All clear",
      });
      await flushAsync();

      // The error panel must NOT have been replaced by the safe-path
      // confirmation. The user already had a terminal state on screen and
      // clobbering it would be a worse UX than the original hang.
      const panelAfter = document.getElementById("eraseai-overlay-panel");
      expect(panelAfter).not.toBeNull();
      expect(panelAfter.classList.contains("eraseai-error-panel")).toBe(true);
      expect(panelAfter.innerHTML).toBe(errorHtmlBefore);
    });

    it("clicking Open Extension Popup falls back to an inline toast + clipboard URL when the background can't open the popup", async () => {
      // Build a stub where ANALYZE never responds (so we hit the timeout
      // path) AND OPEN_POPUP responds with ok:false (so we hit the fallback
      // path on the click). The fallback must surface a recovery hint
      // INSIDE the panel so a user already looking at the error sees it.
      const listeners = { onChanged: [] };
      const storageSets = [];
      const writeTextCalls = [];
      const chromeStub = {
        __listeners: listeners,
        __storageSets: storageSets,
        runtime: {
          lastError: undefined,
          getURL: vi.fn((p) => `chrome-extension://abcd1234/${p}`),
          // Hang the analyze port — the result message never arrives, so
          // the 15s safety-net timer must fire and promote the overlay
          // to its terminal error state.
          connect: vi.fn(() => makeFakePort()),
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (msg.type === "OPEN_POPUP") {
              queueMicrotask(() => cb({ ok: false, error: "openPopup unavailable" }));
              return;
            }
            if (typeof cb === "function") queueMicrotask(() => cb({}));
          }),
        },
        storage: {
          local: {
            get: vi.fn((keys, cb) => {
              if (typeof cb === "function") {
                queueMicrotask(() => cb({ enabled: true }));
              } else {
                return Promise.resolve({ enabled: true });
              }
            }),
            set: vi.fn((obj) => {
              storageSets.push(obj);
              return Promise.resolve();
            }),
          },
          onChanged: {
            addListener: vi.fn((fn) => listeners.onChanged.push(fn)),
          },
        },
      };

      // Stub clipboard so we can assert the URL was copied.
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: vi.fn((s) => {
            writeTextCalls.push(s);
            return Promise.resolve();
          }),
        },
      });

      loadContentScriptInJsdom(chromeStub);
      await flushAsync();
      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      await vi.advanceTimersByTimeAsync(16000);
      await flushAsync();

      const openPopupBtn = document.getElementById("eraseai-open-popup");
      expect(openPopupBtn).not.toBeNull();
      openPopupBtn.click();
      await flushAsync();

      const toast = document.querySelector(".eraseai-open-popup-toast");
      expect(toast).not.toBeNull();
      expect(toast.textContent).toMatch(/click the EraseAI icon|paste this/i);
      // The fallback URL should have made it to the toast AND the clipboard.
      expect(toast.textContent).toContain("chrome-extension://abcd1234/src/popup.html");
      expect(writeTextCalls).toContain("chrome-extension://abcd1234/src/popup.html");
    });

    it("clicking Close on the timeout error panel removes the overlay", async () => {
      const chromeStub = makeHangingChromeStub();
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      await vi.advanceTimersByTimeAsync(16000);
      await flushAsync();

      const closeBtn = document.getElementById("eraseai-cancel");
      expect(closeBtn).not.toBeNull();
      closeBtn.click();
      await flushAsync();

      expect(document.getElementById("eraseai-overlay-backdrop")).toBeNull();
    });
  });

  describe("ANALYZE long-lived port (task #124 — MV3 worker-suspension root-cause fix)", () => {
    it("opens a chrome.runtime.connect port named 'analyze' instead of using sendMessage", async () => {
      // The bug: chrome.runtime.sendMessage lets the MV3 service worker
      // be suspended mid-fetch. The fix: use a long-lived port, which
      // Chrome documents as a service-worker keep-alive for the life of
      // the connection.
      const chromeStub = makeChromeStub({
        analyzeResult: {
          riskScore: 100,
          level: "safe",
          issues: [],
          suggestions: [],
          summary: "All clear",
        },
      });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // The content script must have opened exactly one analyze port for
      // this submission, with the agreed-upon name.
      expect(chromeStub.runtime.connect).toHaveBeenCalledTimes(1);
      const connectArg = chromeStub.runtime.connect.mock.calls[0][0];
      expect(connectArg).toEqual({ name: "analyze" });
      expect(chromeStub.__ports).toHaveLength(1);

      // The ANALYZE request must have travelled OVER THE PORT, not via a
      // bare sendMessage — the latter would re-introduce the suspension
      // window the fix is meant to close.
      const analyzePort = chromeStub.__ports[0];
      expect(analyzePort.postMessage).toHaveBeenCalledTimes(1);
      const posted = analyzePort.postMessage.mock.calls[0][0];
      expect(posted.type).toBe("ANALYZE");
      expect(posted.text).toMatch(/otters/);
      expect(typeof posted.attemptId).toBe("string");
      expect(posted.attemptId.length).toBeGreaterThan(0);

      // No ANALYZE message should have been sent through the legacy
      // sendMessage transport — that path was the root cause and must
      // not be re-used by content.js.
      const sendMessageCalls = chromeStub.runtime.sendMessage.mock.calls.map((c) => c[0]);
      expect(sendMessageCalls.some((m) => m && m.type === "ANALYZE")).toBe(false);
    });

    it("renders the analyze result delivered over the port (the worker-stayed-alive happy path)", async () => {
      const chromeStub = makeChromeStub({
        analyzeResult: {
          riskScore: 60,
          level: "caution",
          issues: [
            { category: "pii", severity: "medium", detail: "Email address found", match: "a@b.c", start: 0, end: 5 },
          ],
          suggestions: [],
          summary: "1 issue",
        },
      });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // The warning panel must render — proving the result that came back
      // OVER THE PORT is processed by the same finalize logic as the old
      // sendMessage callback.
      const panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(document.getElementById("eraseai-sanitize")).not.toBeNull();
      expect(document.getElementById("eraseai-send-anyway")).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(false);
    });

    it("survives a simulated mid-fetch suspension window: result delivered over the port well past the old suspension cutoff still renders normally", async () => {
      // Build a stub where the analyze port is opened but the result is
      // NOT delivered immediately — we hold it for 8 seconds (well past
      // the ~30s idle suspension threshold scaled to test time, and a
      // realistic worst-case fetch duration). The port's keep-alive
      // contract is what makes this safe; the user must see a normal
      // result panel, NOT the safety-net error panel.
      const listeners = { onChanged: [] };
      const ports = [];
      const chromeStub = {
        __listeners: listeners,
        __ports: ports,
        runtime: {
          lastError: undefined,
          connect: vi.fn(() => {
            const port = makeFakePort();
            ports.push(port);
            return port;
          }),
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (typeof cb === "function") queueMicrotask(() => cb({}));
          }),
        },
        storage: {
          local: {
            get: vi.fn((keys, cb) => {
              if (typeof cb === "function") {
                queueMicrotask(() => cb({ enabled: true }));
              } else {
                return Promise.resolve({ enabled: true });
              }
            }),
            set: vi.fn(() => Promise.resolve()),
          },
          onChanged: { addListener: vi.fn((fn) => listeners.onChanged.push(fn)) },
        },
      };

      loadContentScriptInJsdom(chromeStub);
      await flushAsync();
      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // The spinner is up; the safety-net timer is armed but not fired.
      let panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(false);
      expect(document.querySelector(".eraseai-spinner")).not.toBeNull();

      // Burn ~8s of the 15s safety-net window. Under the OLD sendMessage
      // transport, this is precisely the slice during which the worker
      // could have been suspended and the callback never fired. Under
      // the port transport, the port keeps the worker alive and the
      // result is delivered through it.
      await vi.advanceTimersByTimeAsync(8000);
      await flushAsync();

      // Spinner must still be on screen — we are NOT in the error state.
      panel = document.getElementById("eraseai-overlay-panel");
      expect(panel.classList.contains("eraseai-error-panel")).toBe(false);

      // Now the background finally posts the analyze result through the
      // still-alive port. We use a caution-level result so the panel
      // stays on screen (safe auto-dismisses after 1.2s and would
      // confuse the assertion below).
      expect(ports).toHaveLength(1);
      ports[0].__deliverResult({
        riskScore: 55,
        level: "caution",
        issues: [
          { category: "pii", severity: "medium", detail: "Email", match: "a@b.c", start: 0, end: 5 },
        ],
        suggestions: [],
        summary: "1 issue",
      });
      ports[0].__triggerDisconnect();
      await flushAsync();

      // The user must see the normal warning panel — proving the
      // result rode the port to completion. The safety-net timer must
      // have been cancelled (otherwise it would still flip us to the
      // error panel below).
      panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(false);
      expect(document.getElementById("eraseai-sanitize")).not.toBeNull();
      expect(document.getElementById("eraseai-send-anyway")).not.toBeNull();

      // Push past the 15s safety-net deadline. The error panel must NOT
      // appear — the timer was cancelled when the port delivered.
      await vi.advanceTimersByTimeAsync(10000);
      await flushAsync();
      panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(false);
    });

    it("falls back to a network error panel AND persists lastAttempt=error when the analyze port is disconnected before any result arrives (e.g. background crash)", async () => {
      const listeners = { onChanged: [] };
      const ports = [];
      const storageSets = [];
      const chromeStub = {
        __listeners: listeners,
        __ports: ports,
        __storageSets: storageSets,
        runtime: {
          lastError: undefined,
          connect: vi.fn(() => {
            const port = makeFakePort();
            ports.push(port);
            return port;
          }),
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (typeof cb === "function") queueMicrotask(() => cb({}));
          }),
        },
        storage: {
          local: {
            get: vi.fn((keys, cb) => {
              if (typeof cb === "function") {
                queueMicrotask(() => cb({ enabled: true }));
              } else {
                return Promise.resolve({ enabled: true });
              }
            }),
            set: vi.fn((obj) => {
              storageSets.push(obj);
              return Promise.resolve();
            }),
          },
          onChanged: { addListener: vi.fn((fn) => listeners.onChanged.push(fn)) },
        },
      };

      loadContentScriptInJsdom(chromeStub);
      await flushAsync();
      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // Background tears down the port without sending a result. This is
      // the "worker crash" / "extension reloaded mid-flight" path. We
      // must NOT wait the full 15s for the safety-net timer — the
      // disconnect itself should promote the overlay to a terminal
      // network-error state immediately, so the user gets feedback
      // promptly instead of staring at a spinner.
      expect(ports).toHaveLength(1);
      ports[0].__triggerDisconnect();
      await flushAsync();

      const panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(true);
      expect(panel.textContent).toMatch(/Couldn't analyze/i);

      // The popup's "Last attempt" line must reflect this failure too —
      // background.js's recordLastAttempt() never runs in this branch
      // because the worker disconnected before processing the message,
      // so the content script has to persist it itself.
      const lastAttemptWrites = storageSets.filter((s) => "lastAttempt" in s);
      expect(lastAttemptWrites.length).toBeGreaterThanOrEqual(1);
      const tail = lastAttemptWrites[lastAttemptWrites.length - 1].lastAttempt;
      expect(tail.status).toBe("error");
      expect(tail.reason).toMatch(/disconnected|port/i);
      expect(typeof tail.at).toBe("number");
    });

    it("falls back to a network error panel AND persists lastAttempt=error when chrome.runtime.connect throws (no port at all)", async () => {
      const storageSets = [];
      const chromeStub = makeChromeStub({});
      // Override connect to throw synchronously — simulates the
      // pathological "extension context invalidated" branch.
      chromeStub.runtime.connect = vi.fn(() => {
        throw new Error("Extension context invalidated.");
      });
      // Capture every storage write so we can assert the lastAttempt
      // record made it through.
      chromeStub.storage.local.set = vi.fn((obj) => {
        storageSets.push(obj);
        return Promise.resolve();
      });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      const panel = document.getElementById("eraseai-overlay-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("eraseai-error-panel")).toBe(true);
      expect(panel.textContent).toMatch(/Couldn't analyze/i);

      const lastAttemptWrites = storageSets.filter((s) => "lastAttempt" in s);
      expect(lastAttemptWrites.length).toBeGreaterThanOrEqual(1);
      const tail = lastAttemptWrites[lastAttemptWrites.length - 1].lastAttempt;
      expect(tail.status).toBe("error");
      expect(tail.reason).toMatch(/port|connect/i);
    });
  });

  describe("SANITIZE long-lived port (task #125 — sanitize button stuck on Sanitizing…)", () => {
    // Build a chrome stub whose ANALYZE port resolves immediately with a
    // cautionary result (so the warning panel — and therefore the
    // Sanitize button — is on screen), but whose SANITIZE port we
    // control by hand. This lets us prove the Sanitize button now uses
    // the long-lived port transport and survives a simulated MV3
    // worker-suspension window mid-fetch.
    function makeStubWithControlledSanitizePort({ sanitizeBehaviour = "auto" } = {}) {
      const listeners = { onChanged: [] };
      const ports = [];
      const sanitizePosts = [];
      const sanitizePorts = [];
      const analyzeResult = {
        riskScore: 55,
        level: "caution",
        issues: [
          { category: "pii", severity: "medium", detail: "Email", match: "a@b.c", start: 0, end: 5 },
        ],
        suggestions: [],
        summary: "1 issue",
      };
      const stub = {
        __listeners: listeners,
        __ports: ports,
        __sanitizePorts: sanitizePorts,
        __sanitizePosts: sanitizePosts,
        runtime: {
          lastError: undefined,
          connect: vi.fn((info) => {
            const portName = info && info.name ? info.name : "analyze";
            if (portName === "analyze") {
              const port = makeFakePort({
                onPosted: (msg, p) => {
                  if (msg && msg.type === "ANALYZE") {
                    queueMicrotask(() => {
                      p.__deliverAnalyzeResult(analyzeResult);
                      p.disconnect();
                    });
                  }
                },
              });
              port.name = "analyze";
              ports.push(port);
              return port;
            }
            // SANITIZE port — caller-controlled.
            const port = makeFakePort({
              onPosted: (msg, p) => {
                if (msg && msg.type === "SANITIZE") {
                  sanitizePosts.push(msg);
                  if (sanitizeBehaviour === "auto") {
                    queueMicrotask(() => {
                      p.__deliverSanitizeResult({
                        sanitized: `redacted: ${msg.text}`,
                        changes: [{ category: "pii", original: "a@b.c", replacement: "[EMAIL]" }],
                      });
                      p.disconnect();
                    });
                  }
                  // sanitizeBehaviour === "hold": never auto-deliver; the
                  // test will drive it manually via sanitizePorts[0].
                }
              },
            });
            port.name = "sanitize";
            sanitizePorts.push(port);
            return port;
          }),
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (typeof cb === "function") queueMicrotask(() => cb({}));
          }),
        },
        storage: {
          local: {
            get: vi.fn((keys, cb) => {
              if (typeof cb === "function") {
                queueMicrotask(() => cb({ enabled: true }));
              } else {
                return Promise.resolve({ enabled: true });
              }
            }),
            set: vi.fn(() => Promise.resolve()),
          },
          onChanged: { addListener: vi.fn((fn) => listeners.onChanged.push(fn)) },
        },
      };
      return stub;
    }

    it("Sanitize button opens a chrome.runtime.connect port named 'sanitize' instead of using sendMessage", async () => {
      const chromeStub = makeStubWithControlledSanitizePort();
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      const sanitizeBtn = document.getElementById("eraseai-sanitize");
      expect(sanitizeBtn).not.toBeNull();
      sanitizeBtn.click();
      await flushAsync();

      // The Sanitize click must have opened a sanitize port, NOT used
      // the legacy sendMessage transport (which is the MV3
      // worker-suspension root cause this task closes).
      const connectArgs = chromeStub.runtime.connect.mock.calls.map((c) => c[0]);
      expect(connectArgs).toContainEqual({ name: "sanitize" });
      expect(chromeStub.__sanitizePorts).toHaveLength(1);

      // The SANITIZE request must have travelled OVER THE PORT, with
      // the original prompt text as payload.
      expect(chromeStub.__sanitizePosts).toHaveLength(1);
      expect(chromeStub.__sanitizePosts[0].type).toBe("SANITIZE");
      expect(typeof chromeStub.__sanitizePosts[0].text).toBe("string");

      // No SANITIZE message should have been sent through the legacy
      // sendMessage transport — that path is the suspension window
      // we're closing.
      const sendMessageCalls = chromeStub.runtime.sendMessage.mock.calls.map((c) => c[0]);
      expect(sendMessageCalls.some((m) => m && m.type === "SANITIZE")).toBe(false);
    });

    it("renders the Sanitized state when the result is delivered over the port (happy path)", async () => {
      const chromeStub = makeStubWithControlledSanitizePort();
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      const sanitizeBtn = document.getElementById("eraseai-sanitize");
      sanitizeBtn.click();
      await flushAsync();

      // The button must reach the terminal Sanitized state, the input
      // must be rewritten, and the Send Anyway button must flip to
      // "Send Sanitized" — proving the result rode the port to
      // completion.
      expect(sanitizeBtn.textContent).toMatch(/Sanitized/);
      expect(textarea.value).toMatch(/^redacted:/);
      const sendBtn = document.getElementById("eraseai-send-anyway");
      expect(sendBtn).not.toBeNull();
      expect(sendBtn.textContent).toBe("Send Sanitized");
    });

    it("survives a simulated mid-fetch suspension window: result delivered over the port well past the old suspension cutoff still renders the Sanitized state", async () => {
      // Hold the SANITIZE port open without delivering a result — this
      // is precisely the slice during which a one-shot sendMessage
      // callback would have been lost to MV3 worker suspension. Under
      // the long-lived port transport, the worker stays alive for as
      // long as the port is connected, so a late delivery must still
      // reach a terminal Sanitized state.
      const chromeStub = makeStubWithControlledSanitizePort({ sanitizeBehaviour: "hold" });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      const sanitizeBtn = document.getElementById("eraseai-sanitize");
      sanitizeBtn.click();
      await flushAsync();

      // Mid-flight: the button is "Sanitizing..." and the port is open
      // but no result has been delivered yet.
      expect(sanitizeBtn.textContent).toMatch(/Sanitizing/);
      expect(chromeStub.__sanitizePorts).toHaveLength(1);
      const sanitizePort = chromeStub.__sanitizePorts[0];
      expect(sanitizePort.__isDisconnected()).toBe(false);

      // Burn ~8s of wall time. Under the OLD sendMessage transport the
      // worker could have been suspended in this window and the
      // callback would never fire — leaving the button stuck on
      // "Sanitizing..." forever. Under the port transport the keep-alive
      // contract holds.
      await vi.advanceTimersByTimeAsync(8000);
      await flushAsync();
      expect(sanitizeBtn.textContent).toMatch(/Sanitizing/);

      // Now the background "wakes up" and finally answers.
      sanitizePort.__deliverSanitizeResult({
        sanitized: "redacted text",
        changes: [{ category: "pii", original: "a@b.c", replacement: "[EMAIL]" }],
      });
      sanitizePort.__triggerDisconnect();
      await flushAsync();

      // Terminal state reached — exactly what the user needs to see.
      expect(sanitizeBtn.textContent).toMatch(/Sanitized/);
      expect(textarea.value).toBe("redacted text");
      const sendBtn = document.getElementById("eraseai-send-anyway");
      expect(sendBtn.textContent).toBe("Send Sanitized");
    });

    it("flips the Sanitize button to a terminal Failed state when the sanitize port is disconnected before any result arrives", async () => {
      // Background tears down the port without sending a result. The
      // user must NOT be stuck on a "Sanitizing..." spinner forever —
      // the disconnect itself promotes the button to Failed.
      const chromeStub = makeStubWithControlledSanitizePort({ sanitizeBehaviour: "hold" });
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      const sanitizeBtn = document.getElementById("eraseai-sanitize");
      sanitizeBtn.click();
      await flushAsync();

      expect(chromeStub.__sanitizePorts).toHaveLength(1);
      chromeStub.__sanitizePorts[0].__triggerDisconnect();
      await flushAsync();

      expect(sanitizeBtn.textContent).toBe("Failed");
      expect(sanitizeBtn.disabled).toBe(false);
    });

    it("flips the Sanitize button to a terminal Failed state when chrome.runtime.connect throws (no port at all)", async () => {
      const chromeStub = makeStubWithControlledSanitizePort();
      loadContentScriptInJsdom(chromeStub);
      await flushAsync();

      const { textarea } = setUpChatGPTDom();
      await flushAsync();
      dispatchEnterOn(textarea);
      await flushAsync();

      // Now swap connect to throw — only the next (sanitize) connect
      // attempt is exercised by the click. The analyze port already
      // resolved during the keypress flow above.
      chromeStub.runtime.connect = vi.fn(() => {
        throw new Error("Extension context invalidated.");
      });

      const sanitizeBtn = document.getElementById("eraseai-sanitize");
      sanitizeBtn.click();
      await flushAsync();

      expect(sanitizeBtn.textContent).toBe("Failed");
      expect(sanitizeBtn.disabled).toBe(false);
    });
  });
});
