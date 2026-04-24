const DEFAULT_API_URL = "https://eraseai.ai";

async function getConfig() {
  const result = await chrome.storage.local.get(["apiKey", "apiUrl", "enabled"]);
  let apiUrl = (result.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
  if (!apiUrl.startsWith("https://")) {
    apiUrl = DEFAULT_API_URL;
  }
  return {
    apiKey: result.apiKey || "",
    apiUrl,
    enabled: result.enabled !== false,
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
  if (!config.apiKey) {
    return { connected: false, error: "No API key configured" };
  }

  try {
    const response = await fetch(`${config.apiUrl}/api/dev/ping`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
      },
    });

    if (response.ok) {
      return { connected: true };
    }

    const err = await response.json().catch(() => ({}));
    return { connected: false, error: err.error || `HTTP ${response.status}` };
  } catch (err) {
    return { connected: false, error: err.message };
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
    testConnection().then(sendResponse).catch(() => sendResponse({ connected: false, error: "Test failed" }));
    return true;
  }

  if (message.type === "GET_CONFIG") {
    getConfig().then(sendResponse).catch(() => sendResponse({ apiKey: "", apiUrl: DEFAULT_API_URL, enabled: true }));
    return true;
  }
});
