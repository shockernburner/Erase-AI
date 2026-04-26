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

async function recordLastAttempt(record) {
  // Best-effort write; never let a storage failure mask the analyze result.
  // We do a read-modify-write so a late background response (a worker that
  // finally woke up and answered) cannot silently overwrite a fresh
  // `timeout` record that the content script wrote moments earlier — that
  // would blur the diagnostic signal the popup is supposed to surface.
  try {
    const data = await chrome.storage.local.get("lastAttempt");
    const existing = data && data.lastAttempt;
    if (
      existing &&
      existing.status === "timeout" &&
      typeof existing.at === "number" &&
      // Within the same analyze round-trip window (15s timeout + generous
      // slack for a slow late wake-up). Outside this window the new
      // record is genuinely a fresh attempt and may overwrite.
      Date.now() - existing.at < 30000
    ) {
      return;
    }
    await chrome.storage.local.set({ lastAttempt: record });
  } catch {
    // ignore
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE") {
    analyzePrompt(message.text).then((result) => {
      if (result.riskScore != null) {
        chrome.storage.local.set({
          lastScan: {
            riskScore: result.riskScore,
            level: result.level,
            issueCount: result.issues ? result.issues.length : 0,
            scannedAt: Date.now(),
          },
        });
      }
      // Mid-demo self-check: the popup reads `lastAttempt` to render a
      // single-line "Last attempt: …" status under the connection card so
      // the founder can open the popup during a live call and immediately
      // see whether the previous analyze hit the API or hung.
      if (result.error) {
        recordLastAttempt({
          status: "error",
          reason: String(result.error).slice(0, 200),
          at: Date.now(),
        });
      } else if (result.bypass) {
        recordLastAttempt({
          status: "success",
          reason: "firewall disabled (bypass)",
          at: Date.now(),
        });
      } else {
        recordLastAttempt({ status: "success", at: Date.now() });
      }
      sendResponse(result);
    }).catch(() => {
      recordLastAttempt({ status: "error", reason: "Analysis failed", at: Date.now() });
      sendResponse({ error: "Analysis failed" });
    });
    return true;
  }

  if (message.type === "OPEN_POPUP") {
    // The content script's "Open Extension Popup" button on the error panel
    // routes through here. chrome.action.openPopup() is only available in
    // very recent Chrome and only from a user gesture inside a privileged
    // context, so we fall back to opening popup.html as a regular tab —
    // chrome-extension:// URLs CAN be opened by the background via tabs.create.
    //
    // We respond ONLY after the open attempt has actually settled, so the
    // content script's fallback (inline toast + clipboard) reliably fires
    // when neither path succeeds. Anything else risks a "ghost success"
    // where the user sees nothing happen and gets no recovery hint.
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
