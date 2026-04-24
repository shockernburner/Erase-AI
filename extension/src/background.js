importScripts("./build-config.js");

const DEFAULT_API_URL = "https://eraseai.ai";

async function getConfig() {
  const result = await chrome.storage.local.get(["apiKey", "apiUrl", "enabled"]);
  let apiUrl = (result.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
  if (!apiUrl.startsWith("https://")) {
    apiUrl = DEFAULT_API_URL;
  }
  // Enforce the build-time allowlist. A custom URL that was acceptable in a
  // dev build (e.g. *.replit.app) but isn't on the production allowlist must
  // never actually be used as the API host — silently fall back to the
  // canonical default. The popup separately surfaces a clear error message
  // when a user tries to *save* a disallowed URL on a production build.
  if (!self.eraseaiIsApiUrlAllowed(apiUrl)) {
    apiUrl = DEFAULT_API_URL;
  }
  return {
    apiKey: result.apiKey || "",
    apiUrl,
    enabled: result.enabled !== false,
    isCustomUrl: apiUrl !== DEFAULT_API_URL,
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
    const response = await fetch(`${config.apiUrl}/api/dev/analyze`, {
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
    const response = await fetch(`${config.apiUrl}/api/dev/sanitize`, {
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

async function testConnection() {
  const config = await getConfig();

  let reachableServerVersion = null;
  try {
    const probe = await fetch(`${config.apiUrl}/api/dev/ping`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!probe.ok) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: config.apiUrl,
        isCustomUrl: config.isCustomUrl,
        error: `Server responded with HTTP ${probe.status}. Check the API URL.`,
      };
    }
    const contentType = probe.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: config.apiUrl,
        isCustomUrl: config.isCustomUrl,
        error: "Endpoint did not return JSON. This does not look like an EraseAI server.",
      };
    }
    const data = await probe.json().catch(() => null);
    if (!data || data.ok !== true || typeof data.version !== "string") {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: config.apiUrl,
        isCustomUrl: config.isCustomUrl,
        error: "Endpoint returned unexpected payload. This does not look like an EraseAI server.",
      };
    }
    reachableServerVersion = data.version;
  } catch (err) {
    return {
      connected: false,
      state: "server_unreachable",
      apiUrl: config.apiUrl,
      isCustomUrl: config.isCustomUrl,
      error: `Cannot reach ${config.apiUrl}: ${err.message}`,
    };
  }

  if (!config.apiKey) {
    return {
      connected: false,
      state: "no_key",
      apiUrl: config.apiUrl,
      isCustomUrl: config.isCustomUrl,
      serverVersion: reachableServerVersion,
    };
  }

  try {
    const auth = await fetch(`${config.apiUrl}/api/dev/ping`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${config.apiKey}` },
    });
    if (auth.status === 401) {
      const err = await auth.json().catch(() => ({}));
      return {
        connected: false,
        state: "invalid_key",
        apiUrl: config.apiUrl,
        isCustomUrl: config.isCustomUrl,
        serverVersion: reachableServerVersion,
        error: err.error || "Invalid API key",
        code: typeof err.code === "string" ? err.code : null,
      };
    }
    if (!auth.ok) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: config.apiUrl,
        isCustomUrl: config.isCustomUrl,
        error: `Authenticated probe failed: HTTP ${auth.status}`,
      };
    }
    const authContentType = auth.headers.get("content-type") || "";
    if (!authContentType.toLowerCase().includes("application/json")) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: config.apiUrl,
        isCustomUrl: config.isCustomUrl,
        error: "Authenticated endpoint did not return JSON.",
      };
    }
    const data = await auth.json().catch(() => null);
    if (!data || data.ok !== true) {
      return {
        connected: false,
        state: "server_unreachable",
        apiUrl: config.apiUrl,
        isCustomUrl: config.isCustomUrl,
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
      apiUrl: config.apiUrl,
      isCustomUrl: config.isCustomUrl,
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
      apiUrl: config.apiUrl,
      isCustomUrl: config.isCustomUrl,
      error: err.message,
    };
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
      sendResponse(result);
    }).catch(() => sendResponse({ error: "Analysis failed" }));
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

  if (message.type === "GET_CONFIG") {
    getConfig().then(sendResponse).catch(() => sendResponse({ apiKey: "", apiUrl: DEFAULT_API_URL, enabled: true, isCustomUrl: false }));
    return true;
  }

  if (message.type === "RESET_API_URL") {
    chrome.storage.local.remove("apiUrl").then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
});
