const API_URL = "https://eraseai.ai";

async function getConfig() {
  const result = await chrome.storage.local.get(["apiKey", "enabled"]);
  return {
    apiKey: result.apiKey || "",
    enabled: result.enabled !== false,
    apiUrl: API_URL,
  };
}

async function analyzePrompt(text) {
  const config = await getConfig();
  if (!config.apiKey) {
    return { error: "No API key configured. Open the EraseAI extension popup to set your key." };
  }
  if (!config.enabled) {
    return { bypass: true };
  }

  try {
    const response = await fetch(`${API_URL}/api/dev/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || `API error: ${response.status}`, code: err.code };
    }

    return await response.json();
  } catch (err) {
    return { error: `Network error: ${err.message}` };
  }
}

async function sanitizePrompt(text) {
  const config = await getConfig();
  if (!config.apiKey) {
    return { error: "No API key configured." };
  }

  try {
    const response = await fetch(`${API_URL}/api/dev/sanitize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: err.error || `API error: ${response.status}`, code: err.code };
    }

    return await response.json();
  } catch (err) {
    return { error: `Network error: ${err.message}` };
  }
}

async function reportOutcome(payload) {
  const config = await getConfig();
  if (!config.apiKey) {
    return { ok: false, error: "no_api_key" };
  }
  if (!config.enabled) {
    return { ok: false, error: "disabled" };
  }

  const body = {
    level: payload && typeof payload.level === "string" ? payload.level : null,
    action: payload && typeof payload.action === "string" ? payload.action : null,
    riskScore:
      payload && typeof payload.riskScore === "number" && Number.isFinite(payload.riskScore)
        ? payload.riskScore
        : null,
    categories:
      payload && Array.isArray(payload.categories)
        ? payload.categories.filter((c) => typeof c === "string").slice(0, 32)
        : [],
  };

  if (!body.level || !body.action) {
    return { ok: false, error: "invalid_payload" };
  }

  try {
    const response = await fetch(`${API_URL}/api/dev/outcome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, error: err.error || `API error: ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }
}

async function probePing() {
  try {
    const probe = await fetch(`${API_URL}/api/dev/ping`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!probe.ok) {
      return { ok: false, error: `Server responded with HTTP ${probe.status}.` };
    }
    const contentType = probe.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return { ok: false, error: "Endpoint did not return JSON. This does not look like an EraseAI server." };
    }
    const data = await probe.json().catch(() => null);
    if (!data || data.ok !== true || typeof data.version !== "string") {
      return { ok: false, error: "Endpoint returned unexpected payload. This does not look like an EraseAI server." };
    }
    return { ok: true, version: data.version };
  } catch (err) {
    return { ok: false, error: `Cannot reach ${API_URL}: ${err.message}` };
  }
}

async function testConnection() {
  const config = await getConfig();

  const pingResult = await probePing();
  if (!pingResult.ok) {
    return {
      connected: false,
      state: "server_unreachable",
      apiUrl: API_URL,
      error: pingResult.error,
    };
  }

  const reachableServerVersion = pingResult.version;

  if (!config.apiKey) {
    return {
      connected: false,
      state: "no_key",
      apiUrl: API_URL,
      serverVersion: reachableServerVersion,
    };
  }

  try {
    const auth = await fetch(`${API_URL}/api/dev/ping`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${config.apiKey}` },
    });
    if (auth.status === 401) {
      const err = await auth.json().catch(() => ({}));
      return {
        connected: false,
        state: "invalid_key",
        apiUrl: API_URL,
        serverVersion: reachableServerVersion,
        error: err.error || "Invalid API key",
        code: typeof err.code === "string" ? err.code : null,
      };
    }
    if (!auth.ok) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: API_URL,
        error: `Authenticated probe failed: HTTP ${auth.status}`,
      };
    }
    const authContentType = auth.headers.get("content-type") || "";
    if (!authContentType.toLowerCase().includes("application/json")) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: API_URL,
        error: "Authenticated endpoint did not return JSON.",
      };
    }
    const data = await auth.json().catch(() => null);
    if (!data || data.ok !== true) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: API_URL,
        error: "Authenticated endpoint returned unexpected payload.",
      };
    }
    const allowedPlans = new Set(["free", "personal", "pro", "business", "enterprise"]);
    const plan = typeof data.plan === "string" && allowedPlans.has(data.plan) ? data.plan : "free";
    const dailyLimit = typeof data.dailyLimit === "number" ? data.dailyLimit : null;
    const dailyRemaining = typeof data.dailyRemaining === "number" ? data.dailyRemaining : null;
    const dailyUsed = typeof data.dailyUsed === "number" ? data.dailyUsed : null;
    return {
      connected: true,
      state: "connected",
      apiUrl: API_URL,
      serverVersion: typeof data.version === "string" ? data.version : reachableServerVersion,
      plan,
      dailyLimit,
      dailyRemaining,
      dailyUsed,
    };
  } catch (err) {
    return {
      connected: false,
      state: "server_unreachable",
      apiUrl: API_URL,
      error: err.message,
    };
  }
}

// Shared body of the ANALYZE flow used by BOTH transports:
//   1. the legacy `chrome.runtime.sendMessage` one-shot listener (kept for
//      back-compat with anything that still expects sendMessage), and
//   2. the long-lived `chrome.runtime.connect` port introduced to keep the
//      MV3 service worker alive for the duration of an in-flight fetch.
//
// Returns the analyze result object (server JSON, {error}, or {bypass}).
// Side-effects:
//   - persists `lastScan` when the result has a numeric riskScore
//   - persists `lastAttempt` so the popup's "Last attempt" line is accurate
async function processAnalyzeRequest(text, attemptId) {
  let result;
  try {
    result = await analyzePrompt(text);
  } catch {
    await recordLastAttempt({
      status: "error",
      reason: "Analysis failed",
      at: Date.now(),
      attemptId,
    });
    return { error: "Analysis failed" };
  }

  if (result && result.riskScore != null) {
    try {
      chrome.storage.local.set({
        lastScan: {
          riskScore: result.riskScore,
          level: result.level,
          issueCount: result.issues ? result.issues.length : 0,
          scannedAt: Date.now(),
        },
      });
    } catch {
      // best-effort
    }
  }

  if (result && result.error) {
    await recordLastAttempt({
      status: "error",
      reason: String(result.error).slice(0, 200),
      at: Date.now(),
      attemptId,
    });
  } else if (result && result.bypass) {
    await recordLastAttempt({
      status: "success",
      reason: "firewall disabled (bypass)",
      at: Date.now(),
      attemptId,
    });
  } else {
    await recordLastAttempt({ status: "success", at: Date.now(), attemptId });
  }

  return result;
}

async function recordLastAttempt(record) {
  // Best-effort write. Suppress only when this write is a stale late
  // response from the SAME attempt that the content script already
  // recorded as a timeout — matched by attemptId. A new attempt (different
  // attemptId, or no attemptId echoed back) always overwrites.
  try {
    const data = await chrome.storage.local.get("lastAttempt");
    const existing = data && data.lastAttempt;
    if (
      existing &&
      existing.status === "timeout" &&
      existing.attemptId &&
      record.attemptId &&
      existing.attemptId === record.attemptId
    ) {
      return;
    }
    await chrome.storage.local.set({ lastAttempt: record });
  } catch {
    // ignore
  }
}

// Long-lived port transport for ANALYZE.
//
// Why a port instead of `chrome.runtime.sendMessage`:
// In MV3 the extension's background context is a service worker that Chrome
// is free to suspend after ~30s of idle, and — critically — also free to
// suspend WHILE a one-shot sendMessage handler is awaiting an in-flight
// `fetch`. When that happens the content script's sendMessage callback
// never fires, the spinner appears to hang forever, and (since task #122)
// the 15s client-side timeout flips the overlay to a fake "failure" for an
// analyze that the backend would otherwise have answered.
//
// Per the MV3 lifecycle docs, the service worker is kept alive as long as
// at least one port is connected. The content script opens a port for each
// analyze, the worker stays awake for the duration of the fetch, and the
// port is closed (releasing the keep-alive) as soon as we post the result
// back. This eliminates the suspension window root-cause; the 15s timeout
// in content.js becomes a true safety net, never expected to fire under
// normal demo conditions.
chrome.runtime.onConnect.addListener((port) => {
  if (!port || port.name !== "analyze") return;

  port.onMessage.addListener((message) => {
    if (!message || message.type !== "ANALYZE") return;
    const attemptId = typeof message.attemptId === "string" ? message.attemptId : null;
    processAnalyzeRequest(message.text, attemptId)
      .then((result) => {
        try {
          port.postMessage({ type: "ANALYZE_RESULT", result });
        } catch {
          // port was closed (e.g. content script tab navigated away);
          // nothing the user can see, drop silently.
        }
        try {
          port.disconnect();
        } catch {
          // already disconnected
        }
      })
      .catch(() => {
        try {
          port.postMessage({ type: "ANALYZE_RESULT", result: { error: "Analysis failed" } });
        } catch {
          // ignore
        }
        try {
          port.disconnect();
        } catch {
          // ignore
        }
      });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE") {
    // Legacy one-shot transport kept for back-compat. New code paths in
    // content.js use the long-lived `analyze` port (see onConnect above)
    // because that is what keeps the MV3 service worker alive across the
    // analyze fetch.
    const attemptId = typeof message.attemptId === "string" ? message.attemptId : null;
    processAnalyzeRequest(message.text, attemptId)
      .then(sendResponse)
      .catch(() => sendResponse({ error: "Analysis failed" }));
    return true;
  }

  if (message.type === "OPEN_POPUP") {
    // Try chrome.action.openPopup() first, fall back to opening popup.html
    // as a tab. Respond only after the attempt actually settles so the
    // content script's clipboard fallback reliably fires on failure.
    const openAsTab = () =>
      new Promise((resolve) => {
        try {
          chrome.tabs.create(
            { url: chrome.runtime.getURL("src/popup.html") },
            (tab) => {
              if (chrome.runtime.lastError || !tab) {
                resolve({ ok: false, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : "tabs_create_failed" });
              } else {
                resolve({ ok: true });
              }
            },
          );
        } catch (err) {
          resolve({ ok: false, error: err && err.message ? err.message : "tabs_create_threw" });
        }
      });

    (async () => {
      try {
        if (chrome.action && typeof chrome.action.openPopup === "function") {
          try {
            await chrome.action.openPopup();
            sendResponse({ ok: true });
            return;
          } catch {
            // openPopup() failed (no active window, no user gesture, …);
            // fall through to the new-tab fallback.
          }
        }
        const tabResult = await openAsTab();
        sendResponse(tabResult);
      } catch (err) {
        sendResponse({ ok: false, error: err && err.message ? err.message : "open_popup_failed" });
      }
    })();
    return true;
  }

  if (message.type === "SANITIZE") {
    sanitizePrompt(message.text).then(sendResponse).catch(() => sendResponse({ error: "Sanitization failed" }));
    return true;
  }

  if (message.type === "TEST_CONNECTION") {
    testConnection().then(sendResponse).catch((err) => sendResponse({
      connected: false,
      state: "server_unreachable",
      error: err && err.message ? err.message : "Test failed",
    }));
    return true;
  }

  if (message.type === "OUTCOME") {
    reportOutcome(message.outcome).then(sendResponse).catch((err) => sendResponse({ ok: false, error: err && err.message ? err.message : "Outcome failed" }));
    return true;
  }

  if (message.type === "GET_CONFIG") {
    getConfig().then(sendResponse).catch(() => sendResponse({ apiKey: "", apiUrl: API_URL, enabled: true }));
    return true;
  }
});
