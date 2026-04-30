// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadPopupHtml, loadPopupSource } from "./loadModule.js";

const API_URL = "https://eraseai.ai";

function setUpDom() {
  const html = loadPopupHtml();
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : "";
  const sanitized = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, "");
  document.body.innerHTML = sanitized;
}

function makeChromeStub(initialStorage = {}) {
  const storage = { ...initialStorage };
  return {
    __storage: storage,
    storage: {
      local: {
        get: vi.fn(async (keys) => {
          if (Array.isArray(keys)) {
            const out = {};
            for (const k of keys) {
              if (k in storage) out[k] = storage[k];
            }
            return out;
          }
          return { ...storage };
        }),
        set: vi.fn(async (obj) => {
          Object.assign(storage, obj);
        }),
        remove: vi.fn(async (key) => {
          if (Array.isArray(key)) {
            for (const k of key) delete storage[k];
          } else {
            delete storage[key];
          }
        }),
      },
    },
    runtime: {
      // sendMessage callbacks are intentionally never invoked by default, so
      // renderDiagnosis is only driven by direct calls within the tests.
      sendMessage: vi.fn(),
    },
    tabs: {
      create: vi.fn(),
    },
  };
}

function loadPopup() {
  const src = loadPopupSource();
  // Wrap source so we can capture the otherwise-private functions for testing,
  // without altering production popup.js semantics.
  const wrapped = `${src}\n;return { renderDiagnosis, renderDiagTitle, runDiagnosis };`;
  // eslint-disable-next-line no-new-func
  return new Function(wrapped)();
}

let popup;
let chromeStub;

beforeEach(() => {
  setUpDom();
  chromeStub = makeChromeStub();
  globalThis.chrome = chromeStub;
  popup = loadPopup();
});

describe("popup.renderDiagnosis state machine", () => {
  it("renders connected state with plan pill and quota line", () => {
    popup.renderDiagnosis({
      state: "connected",
      apiUrl: API_URL,
      plan: "pro",
      dailyLimit: 1000,
      dailyRemaining: 750,
      dailyUsed: 250,
    });

    const card = document.getElementById("diag-card");
    expect(card.className).toBe("diag connected");

    const title = document.getElementById("diag-title");
    expect(title.textContent).toContain("Connected");

    const pill = title.querySelector(".plan-pill");
    expect(pill).not.toBeNull();
    expect(pill.textContent).toBe("Pro");

    const detail = document.getElementById("diag-detail");
    expect(detail.textContent).toContain("750 of 1000 prompts left today");

    // No action buttons on connected state.
    const actions = document.getElementById("diag-actions");
    expect(actions.children.length).toBe(0);
  });

  it("shows 'Unlimited' line when dailyLimit is null", () => {
    popup.renderDiagnosis({
      state: "connected",
      apiUrl: API_URL,
      plan: "enterprise",
      dailyLimit: null,
      dailyRemaining: null,
      dailyUsed: null,
    });

    const detail = document.getElementById("diag-detail");
    expect(detail.textContent).toContain("Unlimited");
  });

  it("renders no_key state with 'Get my API key' action", () => {
    popup.renderDiagnosis({
      state: "no_key",
      apiUrl: API_URL,
    });

    const card = document.getElementById("diag-card");
    expect(card.className).toBe("diag no_key");

    const title = document.getElementById("diag-title");
    expect(title.textContent).toBe("Add your API key");
    expect(title.querySelector(".plan-pill")).toBeNull();

    const actions = document.getElementById("diag-actions");
    const buttons = actions.querySelectorAll("button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("Get my API key");

    // Clicking it should open the canonical keys dashboard.
    buttons[0].click();
    expect(chromeStub.tabs.create).toHaveBeenCalledWith({
      url: "https://eraseai.ai/?view=developer",
    });
  });

  it("renders invalid_key state with the canned guidance for the code and includes the server error in the detail", () => {
    popup.renderDiagnosis({
      state: "invalid_key",
      apiUrl: API_URL,
      code: "AUTH_INVALID_KEY",
      error: "Invalid API key",
    });

    const card = document.getElementById("diag-card");
    expect(card.className).toBe("diag invalid_key");

    const title = document.getElementById("diag-title");
    expect(title.textContent).toBe("API key not recognized");

    const detail = document.getElementById("diag-detail");
    // The renderer must show both the canned, user-friendly explanation for
    // the AUTH_INVALID_KEY code and the raw server-supplied error string.
    expect(detail.textContent).toContain("The server doesn't recognize this key");
    expect(detail.textContent).toContain("Invalid API key");

    const buttons = document.getElementById("diag-actions").querySelectorAll("button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("Get a new key");
  });

  describe("invalid_key code → message mapping", () => {
    const KEYS_URL = "https://eraseai.ai/?view=developer";
    const PRICING_URL = "https://eraseai.ai/?view=pricing";
    const CONTACT_URL = "https://eraseai.ai/contact";

    const cases = [
      {
        code: "AUTH_INVALID_FORMAT",
        title: "API key format looks wrong",
        detail:
          "The key you entered doesn't look like a valid EraseAI key (they start with eak_). Generate a fresh key from your dashboard and paste it below.",
        actionLabel: "Get a new key",
        actionUrl: KEYS_URL,
      },
      {
        code: "AUTH_INVALID_HEADER",
        title: "API key format looks wrong",
        detail:
          "The key you entered doesn't look like a valid EraseAI key (they start with eak_). Generate a fresh key from your dashboard and paste it below.",
        actionLabel: "Get a new key",
        actionUrl: KEYS_URL,
      },
      {
        code: "AUTH_REVOKED_KEY",
        title: "API key has been revoked",
        detail:
          "This key was revoked from your dashboard and can no longer be used. Generate a new key and paste it below.",
        actionLabel: "Generate a new key",
        actionUrl: KEYS_URL,
      },
      {
        code: "AUTH_EXPIRED_KEY",
        title: "Subscription expired",
        detail:
          "Your API key is no longer active because the subscription it belongs to has expired. Renew to start using the firewall again.",
        actionLabel: "Renew your subscription",
        actionUrl: PRICING_URL,
      },
      {
        code: "AUTH_USER_NOT_FOUND",
        title: "Account not found",
        detail:
          "The EraseAI account this key belongs to could not be found. Contact support so we can sort this out.",
        actionLabel: "Contact support",
        actionUrl: CONTACT_URL,
      },
      {
        code: "AUTH_INVALID_KEY",
        title: "API key not recognized",
        detail:
          "The server doesn't recognize this key. It may have been deleted or copied incorrectly. Generate a new key and paste it below.",
        actionLabel: "Get a new key",
        actionUrl: KEYS_URL,
      },
    ];

    it.each(cases)(
      "renders the canned title, detail, and primary action for $code",
      ({ code, title, detail: expectedDetail, actionLabel, actionUrl }) => {
        popup.renderDiagnosis({
          state: "invalid_key",
          apiUrl: API_URL,
          code,
        });

        const card = document.getElementById("diag-card");
        expect(card.className).toBe("diag invalid_key");

        const titleEl = document.getElementById("diag-title");
        expect(titleEl.textContent).toBe(title);

        // Exact full-string match (no result.error provided here) so any
        // wording drift in the canned copy fails the test.
        const detail = document.getElementById("diag-detail");
        expect(detail.textContent).toBe(expectedDetail);

        const buttons = document
          .getElementById("diag-actions")
          .querySelectorAll("button");
        expect(buttons.length).toBe(1);
        expect(buttons[0].textContent).toBe(actionLabel);

        buttons[0].click();
        expect(chromeStub.tabs.create).toHaveBeenCalledWith({ url: actionUrl });
      },
    );

    it("renders the unknown-code default with a primary 'Contact support' and a secondary 'Get a new key'", () => {
      popup.renderDiagnosis({
        state: "invalid_key",
        apiUrl: API_URL,
        code: "AUTH_SOMETHING_WE_DONT_KNOW_YET",
      });

      const card = document.getElementById("diag-card");
      expect(card.className).toBe("diag invalid_key");

      const titleEl = document.getElementById("diag-title");
      expect(titleEl.textContent).toBe("API key not accepted");

      const detail = document.getElementById("diag-detail");
      expect(detail.textContent).toBe(
        "The server rejected this key but didn't say why. Try generating a new key, or contact support if the problem continues.",
      );

      const buttons = document
        .getElementById("diag-actions")
        .querySelectorAll("button");
      expect(buttons.length).toBe(2);

      const [primary, secondary] = buttons;
      expect(primary.textContent).toBe("Contact support");
      expect(secondary.textContent).toBe("Get a new key");

      primary.click();
      expect(chromeStub.tabs.create).toHaveBeenCalledWith({ url: CONTACT_URL });

      secondary.click();
      expect(chromeStub.tabs.create).toHaveBeenCalledWith({ url: KEYS_URL });
    });
  });

  it("renders server_unreachable state with only the canonical-dashboard action", () => {
    popup.renderDiagnosis({
      state: "server_unreachable",
      apiUrl: API_URL,
      error: "Cannot reach https://eraseai.ai: ENOTFOUND",
    });

    const card = document.getElementById("diag-card");
    expect(card.className).toBe("diag server_unreachable");

    const title = document.getElementById("diag-title");
    expect(title.textContent).toBe("Server unreachable");

    const buttons = document.getElementById("diag-actions").querySelectorAll("button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("Open eraseai.ai");
  });

  it("falls back to server_unreachable on unknown state", () => {
    popup.renderDiagnosis({
      state: "totally_made_up",
      apiUrl: API_URL,
    });

    const card = document.getElementById("diag-card");
    expect(card.className).toBe("diag server_unreachable");
  });
});

describe("popup canonical URL constants", () => {
  it("every CANONICAL_*_URL constant is anchored to https://eraseai.ai", () => {
    const src = loadPopupSource();
    const matches = Array.from(src.matchAll(/^const\s+(CANONICAL_[A-Z_]*URL)\s*=\s*"([^"]+)";/gm));
    // Sanity: we must have actually picked up the constants we care about.
    expect(matches.length).toBeGreaterThanOrEqual(4);
    const names = matches.map((m) => m[1]);
    for (const required of [
      "CANONICAL_KEYS_URL",
      "CANONICAL_DASHBOARD_URL",
      "CANONICAL_PRICING_URL",
      "CANONICAL_CONTACT_URL",
    ]) {
      expect(names).toContain(required);
    }
    for (const [, name, value] of matches) {
      expect(value, `${name} must point at the canonical eraseai.ai host`).toMatch(
        /^https:\/\/eraseai\.ai(\/|\?|$)/,
      );
    }
  });

  it("popup.js source contains no hardcoded URL outside of the canonical eraseai.ai constants", () => {
    const src = loadPopupSource();
    // Find every https://... literal and confirm each is anchored to eraseai.ai.
    const urlMatches = src.match(/https:\/\/[A-Za-z0-9.\-]+/g) || [];
    expect(urlMatches.length).toBeGreaterThan(0);
    for (const url of urlMatches) {
      expect(url).toMatch(/^https:\/\/eraseai\.ai$/);
    }
  });
});

describe("popup.renderDiagnosis is XSS-safe", () => {
  function expectNoScriptInjection() {
    // No new <script>, <img>, or <iframe> elements should ever be added by
    // the popup renderer.
    expect(document.querySelectorAll("script").length).toBe(0);
    expect(document.querySelectorAll("img").length).toBe(0);
    expect(document.querySelectorAll("iframe").length).toBe(0);
    expect(document.querySelectorAll("svg").length).toBe(0);
  }

  it("does not interpret HTML in result.error for invalid_key", () => {
    const malicious = '<img src=x onerror="window.__pwned2=true">';
    popup.renderDiagnosis({
      state: "invalid_key",
      apiUrl: API_URL,
      error: malicious,
    });

    expectNoScriptInjection();
    const detail = document.getElementById("diag-detail");
    expect(detail.textContent).toContain(malicious);
    expect(globalThis.__pwned2).toBeUndefined();
  });

  it("does not interpret HTML in result.error for server_unreachable", () => {
    const malicious = '<iframe src="javascript:window.__pwned3=true"></iframe>';
    popup.renderDiagnosis({
      state: "server_unreachable",
      apiUrl: API_URL,
      error: malicious,
    });

    expectNoScriptInjection();
    const detail = document.getElementById("diag-detail");
    expect(detail.textContent).toContain(malicious);
    expect(globalThis.__pwned3).toBeUndefined();
  });

  it("does not interpret HTML in plan label", () => {
    const malicious = "<script>window.__pwned4=true</script>";
    popup.renderDiagnosis({
      state: "connected",
      apiUrl: API_URL,
      plan: malicious,
    });

    expectNoScriptInjection();
    const pill = document.querySelector(".plan-pill");
    // The pill text simply gets capitalised verbatim.
    expect(pill).not.toBeNull();
    expect(pill.textContent.toLowerCase()).toContain(malicious.toLowerCase());
    expect(globalThis.__pwned4).toBeUndefined();
  });

  it("popup.js never uses .innerHTML for user-controlled content", () => {
    const src = loadPopupSource();
    // We allow .innerHTML in the source only if it's static (e.g., empty
    // string assignments) — there shouldn't be any. This is a guard rail
    // against future regressions.
    const matches = src.match(/\.innerHTML\s*=/g) || [];
    expect(matches.length).toBe(0);

    // Same for outerHTML / insertAdjacentHTML / document.write.
    expect(src).not.toMatch(/\.outerHTML\s*=/);
    expect(src).not.toMatch(/insertAdjacentHTML/);
    expect(src).not.toMatch(/document\.write/);
  });

  it("re-rendering clears stale buttons (no leak across renders)", () => {
    popup.renderDiagnosis({
      state: "no_key",
      apiUrl: API_URL,
    });
    expect(document.getElementById("diag-actions").children.length).toBe(1);

    popup.renderDiagnosis({
      state: "connected",
      apiUrl: API_URL,
      plan: "free",
    });
    expect(document.getElementById("diag-actions").children.length).toBe(0);
  });
});

describe("popup analyze-concurrency Advanced setting (#146)", () => {
  // The Advanced section lets the user override
  // chrome.storage.local.analyzeConcurrency. The save handler must
  // validate, clamp, and persist — the popup.html input has min=1,
  // max=16 hardcoded but a user typing into a number input can still
  // submit out-of-range or non-numeric values, so the JS must defend.

  it("loads the stored analyzeConcurrency value into the input on open", async () => {
    // Re-seed storage with a non-default value and reload the popup so
    // loadState() picks it up. The default beforeEach wires up an empty
    // chrome storage, so we rebuild the world here for this case.
    setUpDom();
    chromeStub = makeChromeStub({ analyzeConcurrency: 12 });
    globalThis.chrome = chromeStub;
    popup = loadPopup();
    // loadState() awaits chrome.storage.local.get; flush microtasks so
    // the input reads from storage before we assert.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById("analyze-concurrency-input");
    expect(input).not.toBeNull();
    expect(input.value).toBe("12");
  });

  it("falls back to default 4 in the input when no value is stored", async () => {
    // Storage starts empty (the default chromeStub used by beforeEach).
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById("analyze-concurrency-input");
    expect(input).not.toBeNull();
    expect(input.value).toBe("4");
  });

  it("persists a valid value to chrome.storage.local on Save", async () => {
    const input = document.getElementById("analyze-concurrency-input");
    const saveBtn = document.getElementById("save-concurrency-btn");
    input.value = "8";
    saveBtn.click();
    // Flush the async save handler (it awaits chrome.storage.local.set).
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeStub.storage.local.set).toHaveBeenCalledWith({ analyzeConcurrency: 8 });
    expect(chromeStub.__storage.analyzeConcurrency).toBe(8);
  });

  it("clamps an above-MAX value down to 16 before saving", async () => {
    const input = document.getElementById("analyze-concurrency-input");
    const saveBtn = document.getElementById("save-concurrency-btn");
    input.value = "999";
    saveBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    // Out-of-range values surface an error status — they're rejected
    // BEFORE the storage write so a user can see what went wrong rather
    // than silently getting their value snapped to the cap.
    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    const status = document.getElementById("concurrency-status");
    expect(status.style.display).toBe("block");
    expect(status.className).toContain("error");
  });

  it("rejects below-MIN values with an error status", async () => {
    const input = document.getElementById("analyze-concurrency-input");
    const saveBtn = document.getElementById("save-concurrency-btn");
    input.value = "0";
    saveBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    const status = document.getElementById("concurrency-status");
    expect(status.className).toContain("error");
  });

  it("rejects non-integer / non-numeric values with an error status", async () => {
    const input = document.getElementById("analyze-concurrency-input");
    const saveBtn = document.getElementById("save-concurrency-btn");
    input.value = "abc";
    saveBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
    const status = document.getElementById("concurrency-status");
    expect(status.className).toContain("error");

    // A fractional value (3.5) should also be rejected — the cap is a
    // worker count, not a fraction.
    chromeStub.storage.local.set.mockClear();
    input.value = "3.5";
    saveBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
  });
});

describe("popup.renderLastAttempt — last-attempt status line (task #122)", () => {
  // Frozen wall-clock so the relative-time renderer ("4s ago", "10s ago", …)
  // is bit-for-bit deterministic regardless of how loaded the test runner is.
  const NOW = 1_700_000_000_000;

  function loadPopupForLastAttempt() {
    const src = loadPopupSource();
    const wrapped = `${src}\n;return { renderLastAttempt };`;
    // eslint-disable-next-line no-new-func
    return new Function(wrapped)();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  // Reset to real timers after each test so other suites in this file are
  // unaffected by the fake-timer setup.
  function teardownTimers() {
    vi.useRealTimers();
  }

  it("renders the empty state when no lastAttempt has been recorded", () => {
    const { renderLastAttempt } = loadPopupForLastAttempt();
    renderLastAttempt(undefined);

    const line = document.getElementById("last-attempt-line");
    expect(line).not.toBeNull();
    expect(line.className).toContain("empty");
    expect(line.textContent).toMatch(/none yet/i);
    // Status sub-element absent for the empty state.
    expect(line.querySelector(".last-attempt-status")).toBeNull();
    teardownTimers();
  });

  it("renders the success state with elapsed seconds", () => {
    const { renderLastAttempt } = loadPopupForLastAttempt();
    renderLastAttempt({ status: "success", at: NOW - 4000 });

    const line = document.getElementById("last-attempt-line");
    expect(line.className).toContain("success");
    expect(line.querySelector(".last-attempt-status").textContent).toBe("succeeded");
    expect(line.textContent).toMatch(/4s ago/);
    teardownTimers();
  });

  it("renders the failed state with reason", () => {
    const { renderLastAttempt } = loadPopupForLastAttempt();
    renderLastAttempt({
      status: "error",
      reason: "Invalid API key",
      at: NOW - 10000,
    });

    const line = document.getElementById("last-attempt-line");
    expect(line.className).toContain("error");
    expect(line.querySelector(".last-attempt-status").textContent).toBe("failed");
    expect(line.textContent).toMatch(/Invalid API key/);
    expect(line.textContent).toMatch(/10s ago/);
    teardownTimers();
  });

  it("renders the timeout state with the no-response label", () => {
    const { renderLastAttempt } = loadPopupForLastAttempt();
    renderLastAttempt({
      status: "timeout",
      reason: "No response from background within 15s",
      at: NOW - 5000,
    });

    const line = document.getElementById("last-attempt-line");
    expect(line.className).toContain("timeout");
    expect(line.querySelector(".last-attempt-status").textContent).toBe("no response");
    expect(line.textContent).toMatch(/No response from background within 15s/);
    expect(line.textContent).toMatch(/5s ago/);
    teardownTimers();
  });

  it("re-rendering with a fresh attempt replaces stale content (no leak)", () => {
    const { renderLastAttempt } = loadPopupForLastAttempt();
    renderLastAttempt({ status: "error", reason: "first error", at: NOW - 1000 });
    renderLastAttempt({ status: "success", at: NOW - 1000 });

    const line = document.getElementById("last-attempt-line");
    expect(line.textContent).not.toMatch(/first error/);
    expect(line.querySelector(".last-attempt-status").textContent).toBe("succeeded");
    expect(line.className).toContain("success");
    expect(line.className).not.toContain("error");
    teardownTimers();
  });
});
