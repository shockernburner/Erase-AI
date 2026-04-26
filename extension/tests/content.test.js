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
const CONTENT_SRC = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "content.js"),
  "utf8",
);

function makeChromeStub({
  enabled = true,
  apiKey = "eak_test",
  analyzeResult = { riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" },
  outcomes = [],
} = {}) {
  const listeners = { onChanged: [] };
  return {
    __listeners: listeners,
    __outcomes: outcomes,
    runtime: {
      lastError: undefined,
      sendMessage: vi.fn((msg, cb) => {
        if (msg.type === "GET_CONFIG") {
          // Simulate the async hop the real service worker takes.
          queueMicrotask(() => cb({ apiKey, enabled, apiUrl: "https://eraseai.ai" }));
          return;
        }
        if (msg.type === "ANALYZE") {
          queueMicrotask(() => cb(analyzeResult));
          return;
        }
        if (msg.type === "SANITIZE") {
          queueMicrotask(() => cb({ sanitized: msg.text, changes: [] }));
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
      return {
        __listeners: listeners,
        __storageSets: storageSets,
        runtime: {
          lastError: undefined,
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            // The whole point: ANALYZE never calls back. This simulates an
            // MV3 service worker that was suspended mid-fetch.
            if (msg.type === "ANALYZE") return;
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
      // Stash the cb the content script passed to sendMessage so we can fire
      // it manually AFTER the timeout has already promoted the overlay to
      // the error state. This is the exact race the production fix has to
      // win — a worker that finally wakes up and calls sendResponse must
      // not be allowed to clobber the user-visible error.
      const listeners = { onChanged: [] };
      const storageSets = [];
      let savedCb = null;
      const chromeStub = {
        __listeners: listeners,
        __storageSets: storageSets,
        runtime: {
          lastError: undefined,
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (msg.type === "ANALYZE") {
              savedCb = cb;
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

      // Now the suspended worker "wakes up" and finally answers.
      expect(typeof savedCb).toBe("function");
      savedCb({ riskScore: 100, level: "safe", issues: [], suggestions: [], summary: "All clear" });
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
          sendMessage: vi.fn((msg, cb) => {
            if (msg.type === "GET_CONFIG") {
              queueMicrotask(() =>
                cb({ apiKey: "eak_test", enabled: true, apiUrl: "https://eraseai.ai" }),
              );
              return;
            }
            if (msg.type === "ANALYZE") return; // hang
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
});
