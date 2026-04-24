// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadPopupHtml, loadPopupSource } from "./loadModule.js";

const DEFAULT_API_URL = "https://eraseai.ai";

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
      // Tests that need loadState() to complete should override
      // chrome.runtime.sendMessage to invoke the callback themselves.
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
  const wrapped = `${src}\n;return { renderDiagnosis, renderDiagMeta, renderDiagTitle, runDiagnosis, loadState, IS_PRODUCTION_BUILD };`;
  // eslint-disable-next-line no-new-func
  return new Function(wrapped)();
}

function installBuildOnWindow(build) {
  window.ERASEAI_BUILD = build;
  const patterns = build.allowedApiHosts || [];
  window.eraseaiIsApiUrlAllowed = function (url) {
    if (typeof url !== "string" || !url.startsWith("https://")) return false;
    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return false;
    }
    return patterns.some((p) => {
      if (p.startsWith("*.")) {
        const suffix = p.slice(1);
        return hostname.endsWith(suffix) && hostname.length > suffix.length;
      }
      return hostname === p;
    });
  };
}

function uninstallBuildOnWindow() {
  delete window.ERASEAI_BUILD;
  delete window.eraseaiIsApiUrlAllowed;
}

function flush() {
  return new Promise((r) => setTimeout(r, 0));
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
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
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
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
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
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
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
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
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

  it("renders server_unreachable state with only the canonical-dashboard action by default", () => {
    popup.renderDiagnosis({
      state: "server_unreachable",
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
      error: "Cannot reach https://eraseai.ai: ENOTFOUND",
    });

    const card = document.getElementById("diag-card");
    expect(card.className).toBe("diag server_unreachable");

    const title = document.getElementById("diag-title");
    expect(title.textContent).toBe("Server unreachable");

    const buttons = document.getElementById("diag-actions").querySelectorAll("button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("Open eraseai.ai");

    // Reset action only appears for custom URLs.
    const resetBtn = Array.from(buttons).find((b) => b.textContent.startsWith("Reset"));
    expect(resetBtn).toBeUndefined();
  });

  it("server_unreachable with custom URL also shows a 'Reset URL' action", () => {
    popup.renderDiagnosis({
      state: "server_unreachable",
      apiUrl: "https://staging.eraseai.ai",
      isCustomUrl: true,
      error: "timeout",
    });

    const buttons = document.getElementById("diag-actions").querySelectorAll("button");
    const labels = Array.from(buttons).map((b) => b.textContent);
    expect(labels).toContain("Reset URL to eraseai.ai");
    expect(labels).toContain("Open eraseai.ai");
  });

  it("falls back to server_unreachable on unknown state", () => {
    popup.renderDiagnosis({
      state: "totally_made_up",
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
    });

    const card = document.getElementById("diag-card");
    expect(card.className).toBe("diag server_unreachable");
  });

  it("always renders the API meta line with the apiUrl", () => {
    popup.renderDiagnosis({
      state: "connected",
      apiUrl: "https://my.eraseai.ai",
      isCustomUrl: true,
      plan: "free",
    });

    const meta = document.getElementById("diag-meta");
    expect(meta.style.display).not.toBe("none");
    expect(meta.textContent).toContain("API: https://my.eraseai.ai");
    // Custom URL → exposes the inline Reset link.
    expect(meta.querySelector("button.reset-link")).not.toBeNull();
  });

  it("default URL → no Reset link in meta", () => {
    popup.renderDiagnosis({
      state: "connected",
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
      plan: "free",
    });

    const meta = document.getElementById("diag-meta");
    expect(meta.querySelector("button.reset-link")).toBeNull();
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

  it("does not interpret HTML in apiUrl", () => {
    const malicious = "<script>window.__pwned=true</script>";
    popup.renderDiagnosis({
      state: "connected",
      apiUrl: malicious,
      isCustomUrl: false,
      plan: "free",
    });

    expectNoScriptInjection();
    const meta = document.getElementById("diag-meta");
    // The raw text must appear escaped in the textContent.
    expect(meta.textContent).toContain(malicious);
    // And nothing should have set the global.
    expect(globalThis.__pwned).toBeUndefined();
  });

  it("does not interpret HTML in result.error for invalid_key", () => {
    const malicious = '<img src=x onerror="window.__pwned2=true">';
    popup.renderDiagnosis({
      state: "invalid_key",
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
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
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
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
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
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
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
    });
    expect(document.getElementById("diag-actions").children.length).toBe(1);

    popup.renderDiagnosis({
      state: "connected",
      apiUrl: DEFAULT_API_URL,
      isCustomUrl: false,
      plan: "free",
    });
    expect(document.getElementById("diag-actions").children.length).toBe(0);
  });
});

describe("popup.loadState clears out-of-allowlist apiUrl on production builds", () => {
  afterEach(() => {
    uninstallBuildOnWindow();
  });

  function setUpLoadStateTest(build, initialStorage) {
    installBuildOnWindow(build);
    setUpDom();
    const stub = makeChromeStub(initialStorage);
    // Make runDiagnosis() resolve so loadState() can complete end-to-end.
    stub.runtime.sendMessage = vi.fn((_msg, cb) => {
      if (typeof cb === "function") {
        cb({ state: "no_key", apiUrl: DEFAULT_API_URL, isCustomUrl: false });
      }
    });
    globalThis.chrome = stub;
    chromeStub = stub;
    popup = loadPopup();
    return stub;
  }

  it("removes a leftover *.replit.app URL from storage and leaves the input blank (production)", async () => {
    const stub = setUpLoadStateTest(
      { env: "production", allowedApiHosts: ["eraseai.ai", "*.eraseai.ai"] },
      { apiUrl: "https://eraseai-staging.replit.app", apiKey: "eak_test", enabled: true },
    );

    expect(popup.IS_PRODUCTION_BUILD).toBe(true);

    await popup.loadState();

    expect(stub.storage.local.remove).toHaveBeenCalledWith("apiUrl");
    expect("apiUrl" in stub.__storage).toBe(false);

    const apiUrlInput = document.getElementById("api-url-input");
    expect(apiUrlInput.value).toBe("");
  });

  it("does not touch storage when the stored URL is on the allowlist (production)", async () => {
    const stub = setUpLoadStateTest(
      { env: "production", allowedApiHosts: ["eraseai.ai", "*.eraseai.ai"] },
      { apiUrl: "https://api.eraseai.ai", enabled: true },
    );

    await popup.loadState();

    expect(stub.storage.local.remove).not.toHaveBeenCalled();
    expect(stub.__storage.apiUrl).toBe("https://api.eraseai.ai");

    const apiUrlInput = document.getElementById("api-url-input");
    expect(apiUrlInput.value).toBe("https://api.eraseai.ai");
  });

  it("does not touch storage when the stored URL equals the canonical default (production)", async () => {
    const stub = setUpLoadStateTest(
      { env: "production", allowedApiHosts: ["eraseai.ai", "*.eraseai.ai"] },
      { apiUrl: DEFAULT_API_URL, enabled: true },
    );

    await popup.loadState();

    expect(stub.storage.local.remove).not.toHaveBeenCalled();
    expect(stub.__storage.apiUrl).toBe(DEFAULT_API_URL);

    // The default URL is not pre-filled in the custom-URL input.
    const apiUrlInput = document.getElementById("api-url-input");
    expect(apiUrlInput.value).toBe("");
  });

  it("preserves a leftover staging URL on dev builds (engineers don't lose it)", async () => {
    const stub = setUpLoadStateTest(
      { env: "development", allowedApiHosts: ["eraseai.ai", "*.eraseai.ai", "*.replit.app"] },
      { apiUrl: "https://eraseai-staging.replit.app", enabled: true },
    );

    expect(popup.IS_PRODUCTION_BUILD).toBe(false);

    await popup.loadState();

    expect(stub.storage.local.remove).not.toHaveBeenCalled();
    expect(stub.__storage.apiUrl).toBe("https://eraseai-staging.replit.app");

    const apiUrlInput = document.getElementById("api-url-input");
    expect(apiUrlInput.value).toBe("https://eraseai-staging.replit.app");
  });

  it("does no work when there is no apiUrl in storage (production)", async () => {
    const stub = setUpLoadStateTest(
      { env: "production", allowedApiHosts: ["eraseai.ai", "*.eraseai.ai"] },
      { enabled: true },
    );

    await popup.loadState();

    expect(stub.storage.local.remove).not.toHaveBeenCalled();
    expect("apiUrl" in stub.__storage).toBe(false);

    const apiUrlInput = document.getElementById("api-url-input");
    expect(apiUrlInput.value).toBe("");
  });
});
