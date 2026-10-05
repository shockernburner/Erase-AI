const API_URL = "https://eraseai.ai";

if (typeof importScripts === "function") {
  importScripts("growth.js", "local-scanner.js", "allowance.js");
}

// --- On-device fallback -----------------------------------------------------
//
// local-scanner.js is generated from the api-server's own rules
// (scripts/src/build-extension-local-scanner.mjs), so a prompt is checked the
// same way whether or not the server can be reached. The server stays
// authoritative whenever it answers; the local result is used when there is no
// key yet, the key or trial is rejected, or the API is unreachable — cases that
// previously left the user with no protection at all.

const LOCAL_NOTES = {
  no_key: "Checked on this device. Add your EraseAI API key in the extension for full scanning and history.",
  invalid_key: "Checked on this device because your API key was rejected. Check it in the extension popup.",
  trial_ended: "Checked on this device. Your EraseAI trial has ended; upgrade for full scanning and history.",
  unavailable: "Checked on this device because EraseAI could not be reached.",
};

function localReasonFor(status, code) {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 429 && code === "RATE_LIMIT_EXCEEDED") return "trial_ended";
  return "unavailable";
}

function localAnalyze(text, reason, serverError) {
  const result = self.EraseAILocalScanner.analyzePromptSafety(String(text || ""));
  return {
    ...result,
    summary: `${result.summary} ${LOCAL_NOTES[reason]}`,
    local: true,
    localReason: reason,
    ...(serverError ? { serverError: serverError.error, code: serverError.code } : {}),
  };
}

function localSanitize(text, reason, serverError) {
  const result = self.EraseAILocalScanner.sanitizeText(String(text || ""));
  return {
    ...result,
    changeCount: result.changes.length,
    local: true,
    localReason: reason,
    ...(serverError ? { serverError: serverError.error, code: serverError.code } : {}),
  };
}

// --- Install hooks and review prompt (see growth.js) -----------------------

async function loadGrowth(now = Date.now()) {
  const G = self.EraseAIGrowth;
  const stored = await chrome.storage.local.get([G.STORAGE_KEY]);
  return G.normalizeState(stored[G.STORAGE_KEY], now);
}

async function saveGrowth(state) {
  await chrome.storage.local.set({ [self.EraseAIGrowth.STORAGE_KEY]: state });
}

function extensionVersion() {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "";
  }
}

async function handleInstalled(details) {
  const G = self.EraseAIGrowth;
  const version = extensionVersion();
  if (chrome.runtime.setUninstallURL) {
    try {
      await chrome.runtime.setUninstallURL(G.urls.uninstall(version));
    } catch {
      // Best effort: a bad URL must never break install.
    }
  }
  if (details && details.reason === "install") {
    await saveGrowth(G.emptyState(Date.now()));
    try {
      await chrome.tabs.create({ url: G.urls.welcome(version) });
    } catch {
      // No window to open into (e.g. installed by policy); skip the welcome tab.
    }
  } else {
    // Updates keep their history; users who predate these counters start the
    // review clock now instead of being asked on the first protected send.
    await saveGrowth(await loadGrowth());
  }
}

/**
 * Counts a protective outcome and reports whether this is the moment to ask
 * for a review. Marks the prompt as shown before answering, so it is offered
 * exactly once even if several tabs report outcomes at the same time.
 */
async function trackOutcomeForReview(outcome) {
  const G = self.EraseAIGrowth;
  const now = Date.now();
  const state = G.recordOutcome(await loadGrowth(now), outcome);
  const prompt = G.shouldPromptReview(state, now);
  await saveGrowth(prompt ? { ...state, review: "shown" } : state);
  return prompt;
}

async function setReviewState(review) {
  const state = await loadGrowth();
  await saveGrowth({ ...state, review });
}

// --- Free-check allowance (see allowance.js) -------------------------------

async function loadAllowance() {
  const A = self.EraseAIAllowance;
  const stored = await chrome.storage.local.get([A.STORAGE_KEY]);
  return A.normalizeState(stored[A.STORAGE_KEY]);
}

async function saveAllowance(state) {
  await chrome.storage.local.set({ [self.EraseAIAllowance.STORAGE_KEY]: state });
}

/** The account's plan for this API key, or null if it could not be read. */
async function fetchPlan(apiKey) {
  try {
    const res = await fetch(`${API_URL}/api/dev/ping`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return res.status === 401 ? "invalid" : null;
    const data = await res.json().catch(() => null);
    return data && data.ok === true && typeof data.plan === "string" ? data.plan : null;
  } catch {
    return null;
  }
}

/** Re-reads the plan and stores it without touching the check count. */
async function refreshPlan(apiKey, now = Date.now()) {
  const plan = await fetchPlan(apiKey);
  if (plan == null) return loadAllowance(); // unreachable: keep what we knew
  const latest = await loadAllowance();
  const next = self.EraseAIAllowance.withPlan(latest, plan, now);
  await saveAllowance(next);
  return next;
}

/**
 * Called once per send before anything is checked. Free users spend one of
 * their free checks; paid plans are unlimited; once the free checks are gone
 * the send is let through unchecked and the page shows a subscribe notice.
 */
async function beginCheck() {
  const A = self.EraseAIAllowance;
  const config = await getConfig();
  if (!config.enabled) return { bypass: true };
  const now = Date.now();
  const hasKey = Boolean(config.apiKey);
  let state = await loadAllowance();
  if (hasKey && !A.planIsFresh(state, now)) {
    if (state.used >= A.FREE_CHECKS) {
      // The answer depends on it (they may have just subscribed): wait for it.
      state = await refreshPlan(config.apiKey, now);
    } else {
      // Plenty of free checks left: refresh in the background, never delay the send.
      refreshPlan(config.apiKey, now).catch(() => {});
    }
  }
  const result = A.decide(state, { hasKey });
  if (result.state !== state) await saveAllowance(result.state);
  if (result.decision === "paused") {
    return {
      paused: true,
      used: result.used,
      limit: result.limit,
      subscribeUrl: A.subscribeUrl(extensionVersion()),
      hasKey,
    };
  }
  return { allowed: true, decision: result.decision, used: result.used, remaining: result.remaining };
}

async function allowanceSummary() {
  const A = self.EraseAIAllowance;
  const config = await getConfig();
  const state = await loadAllowance();
  const paid = Boolean(config.apiKey) && A.isPaidPlan(state.plan);
  return {
    used: Math.min(state.used, A.FREE_CHECKS),
    limit: A.FREE_CHECKS,
    plan: state.plan,
    paid,
    paused: !paid && state.used >= A.FREE_CHECKS,
    subscribeUrl: A.subscribeUrl(extensionVersion()),
  };
}

if (chrome.storage && chrome.storage.onChanged) {
  // A different key may belong to a different account: forget its plan.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.apiKey) return;
    loadAllowance()
      .then((state) => saveAllowance({ ...state, plan: null, planCheckedAt: 0 }))
      .catch(() => {});
  });
}

if (chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener((details) => {
    handleInstalled(details).catch(() => {});
  });
}

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
  if (!config.enabled) {
    return { bypass: true };
  }
  if (!config.apiKey) {
    return localAnalyze(text, "no_key");
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
      const serverError = { error: err.error || `API error: ${response.status}`, code: err.code };
      return localAnalyze(text, localReasonFor(response.status, err.code), serverError);
    }

    return await response.json();
  } catch (err) {
    return localAnalyze(text, "unavailable", { error: `Network error: ${err.message}` });
  }
}

async function sanitizePrompt(text) {
  const config = await getConfig();
  if (!config.apiKey) {
    return localSanitize(text, "no_key");
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
      const serverError = { error: err.error || `API error: ${response.status}`, code: err.code };
      return localSanitize(text, localReasonFor(response.status, err.code), serverError);
    }

    return await response.json();
  } catch (err) {
    return localSanitize(text, "unavailable", { error: `Network error: ${err.message}` });
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

  // Forward the optional content-free pieces summary so the api-server can
  // record per-submission attachment counts. The shape is validated on the
  // server side; here we only forward fields we know about and keep numeric
  // fields finite to avoid wire-encoding NaN.
  if (payload && payload.pieces && typeof payload.pieces === "object") {
    const p = payload.pieces;
    const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    const levels = p.levels && typeof p.levels === "object" ? p.levels : {};
    const cleanLevels = {};
    for (const k of Object.keys(levels)) {
      if (typeof k === "string" && k.length <= 16) {
        cleanLevels[k] = num(levels[k]);
      }
    }
    body.pieces = {
      promptPieces: num(p.promptPieces),
      filePieces: num(p.filePieces),
      skippedFiles: num(p.skippedFiles),
      levels: cleanLevels,
    };
  }

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
    try {
      const latest = await loadAllowance();
      await saveAllowance(self.EraseAIAllowance.withPlan(latest, plan, Date.now()));
    } catch {
      // best-effort cache
    }
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
  } else if (result && result.local && result.serverError) {
    // The prompt was still checked, but the server refused or was unreachable;
    // keep that visible in the popup so a bad key or lapsed trial gets fixed.
    await recordLastAttempt({
      status: "error",
      reason: `${String(result.serverError).slice(0, 160)} (checked on this device)`,
      at: Date.now(),
      attemptId,
    });
  } else if (result && result.local) {
    await recordLastAttempt({
      status: "success",
      reason: "checked on this device (no API key)",
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
  if (!port) return;

  if (port.name === "analyze") {
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
    return;
  }

  // Long-lived port transport for SANITIZE — same MV3 worker-suspension
  // root-cause as the ANALYZE flow (task #124). The sanitize fetch can
  // outlive the worker's idle window, so we keep the worker alive for
  // the duration by holding a port open. The content script's Sanitize
  // button uses chrome.runtime.connect({ name: "sanitize" }) and waits
  // for a single { type: "SANITIZE_RESULT", result } message before the
  // port is torn down.
  if (port.name === "sanitize") {
    port.onMessage.addListener((message) => {
      if (!message || message.type !== "SANITIZE") return;
      sanitizePrompt(message.text)
        .then((result) => {
          try {
            port.postMessage({ type: "SANITIZE_RESULT", result });
          } catch {
            // port was closed (tab navigated away); drop silently.
          }
          try {
            port.disconnect();
          } catch {
            // already disconnected
          }
        })
        .catch(() => {
          try {
            port.postMessage({ type: "SANITIZE_RESULT", result: { error: "Sanitization failed" } });
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
    return;
  }
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
    // Legacy one-shot transport kept for back-compat. New code paths in
    // content.js use the long-lived `sanitize` port (see onConnect above)
    // because that is what keeps the MV3 service worker alive across the
    // sanitize fetch.
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
    (async () => {
      // Growth counters are local and must not depend on the API call succeeding.
      const reviewPrompt = await trackOutcomeForReview(message.outcome).catch(() => false);
      const result = await reportOutcome(message.outcome).catch((err) => ({
        ok: false,
        error: err && err.message ? err.message : "Outcome failed",
      }));
      sendResponse({ ...result, reviewPrompt });
    })();
    return true;
  }

  if (message.type === "GET_GROWTH") {
    loadGrowth()
      .then((state) => sendResponse({
        ...state,
        eligible: self.EraseAIGrowth.shouldPromptReview(state, Date.now()) || state.review === "shown",
      }))
      .catch(() => sendResponse(null));
    return true;
  }

  if (message.type === "REVIEW_RESPONSE") {
    // "rate" and "problem" open a page; any answer ends the prompt for good.
    const G = self.EraseAIGrowth;
    const choice = message.choice;
    const url = choice === "rate" ? G.urls.review() : choice === "problem" ? G.urls.support() : null;
    setReviewState(choice === "rate" ? "rated" : "dismissed")
      .then(() => (url ? chrome.tabs.create({ url }) : null))
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "BEGIN_CHECK") {
    beginCheck()
      .then(sendResponse)
      // Never leave a send hanging: if the allowance cannot be read, check it.
      .catch(() => sendResponse({ allowed: true, decision: "error" }));
    return true;
  }

  if (message.type === "GET_ALLOWANCE") {
    allowanceSummary().then(sendResponse).catch(() => sendResponse(null));
    return true;
  }

  if (message.type === "GET_CONFIG") {
    getConfig().then(sendResponse).catch(() => sendResponse({ apiKey: "", apiUrl: API_URL, enabled: true }));
    return true;
  }
});
