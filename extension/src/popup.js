const CANONICAL_KEYS_URL = "https://eraseai.ai/?view=developer";
const CANONICAL_DASHBOARD_URL = "https://eraseai.ai/ai-firewall";
const CANONICAL_PRICING_URL = "https://eraseai.ai/?view=pricing";
const CANONICAL_CONTACT_URL = "https://eraseai.ai/contact";

const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const keyStatus = document.getElementById("key-status");
const toggleEnabled = document.getElementById("toggle-enabled");
const scanSummary = document.getElementById("scan-summary");
const dashboardLink = document.getElementById("dashboard-link");

const diagCard = document.getElementById("diag-card");
const diagTitle = document.getElementById("diag-title");
const diagDetail = document.getElementById("diag-detail");
const diagActions = document.getElementById("diag-actions");

function showKeyStatus(msg, type) {
  keyStatus.textContent = msg;
  keyStatus.className = `status-text ${type}`;
  keyStatus.style.display = "block";
  setTimeout(() => { keyStatus.style.display = "none"; }, 4000);
}

function setDiagState(state) {
  diagCard.className = `diag ${state}`;
}

function clearDiagActions() {
  while (diagActions.firstChild) {
    diagActions.removeChild(diagActions.firstChild);
  }
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function renderDiagTitle(text, planLabel) {
  clearNode(diagTitle);
  diagTitle.appendChild(document.createTextNode(text));
  if (planLabel) {
    diagTitle.appendChild(document.createTextNode(" "));
    const pill = document.createElement("span");
    pill.className = "plan-pill";
    pill.textContent = planLabel;
    diagTitle.appendChild(pill);
  }
}

function addDiagButton(label, variant, handler) {
  const btn = document.createElement("button");
  btn.className = `btn btn-${variant} btn-tiny`;
  btn.textContent = label;
  btn.addEventListener("click", handler);
  diagActions.appendChild(btn);
  return btn;
}

function openCanonicalDashboard() {
  chrome.tabs.create({ url: CANONICAL_DASHBOARD_URL });
}

function openCanonicalKeysDashboard() {
  chrome.tabs.create({ url: CANONICAL_KEYS_URL });
}

function openCanonicalPricing() {
  chrome.tabs.create({ url: CANONICAL_PRICING_URL });
}

function openCanonicalContact() {
  chrome.tabs.create({ url: CANONICAL_CONTACT_URL });
}

function describeInvalidKey(code) {
  switch (code) {
    case "AUTH_INVALID_FORMAT":
    case "AUTH_INVALID_HEADER":
      return {
        title: "API key format looks wrong",
        detail: "The key you entered doesn't look like a valid EraseAI key (they start with eak_). Generate a fresh key from your dashboard and paste it below.",
        actionLabel: "Get a new key",
        actionHandler: openCanonicalKeysDashboard,
      };
    case "AUTH_REVOKED_KEY":
      return {
        title: "API key has been revoked",
        detail: "This key was revoked from your dashboard and can no longer be used. Generate a new key and paste it below.",
        actionLabel: "Generate a new key",
        actionHandler: openCanonicalKeysDashboard,
      };
    case "AUTH_EXPIRED_KEY":
      return {
        title: "Subscription expired",
        detail: "Your API key is no longer active because the subscription it belongs to has expired. Renew to start using the firewall again.",
        actionLabel: "Renew your subscription",
        actionHandler: openCanonicalPricing,
      };
    case "AUTH_USER_NOT_FOUND":
      return {
        title: "Account not found",
        detail: "The EraseAI account this key belongs to could not be found. Contact support so we can sort this out.",
        actionLabel: "Contact support",
        actionHandler: openCanonicalContact,
      };
    case "AUTH_INVALID_KEY":
      return {
        title: "API key not recognized",
        detail: "The server doesn't recognize this key. It may have been deleted or copied incorrectly. Generate a new key and paste it below.",
        actionLabel: "Get a new key",
        actionHandler: openCanonicalKeysDashboard,
      };
    default:
      return {
        title: "API key not accepted",
        detail: "The server rejected this key but didn't say why. Try generating a new key, or contact support if the problem continues.",
        actionLabel: "Contact support",
        actionHandler: openCanonicalContact,
        secondaryLabel: "Get a new key",
        secondaryHandler: openCanonicalKeysDashboard,
      };
  }
}

function renderDiagnosis(result) {
  clearDiagActions();

  if (result.state === "connected") {
    setDiagState("connected");
    const planLabel = typeof result.plan === "string" ? result.plan : "free";
    const planPretty = planLabel.charAt(0).toUpperCase() + planLabel.slice(1);
    renderDiagTitle("Connected", planPretty);
    const accountLine = "Your API key is valid and the firewall is active.";
    let quotaLine = "";
    if (typeof result.dailyRemaining === "number" && typeof result.dailyLimit === "number") {
      const r = Math.max(0, Math.floor(result.dailyRemaining));
      const l = Math.max(0, Math.floor(result.dailyLimit));
      quotaLine = ` ${r} of ${l} prompts left today.`;
    } else if (result.dailyLimit === null) {
      quotaLine = " Unlimited daily scans on this plan.";
    }
    diagDetail.textContent = accountLine + quotaLine;
  } else if (result.state === "no_key") {
    setDiagState("no_key");
    renderDiagTitle("Add your API key");
    diagDetail.textContent = "The EraseAI server is reachable. Enter an API key below, or grab one from your dashboard.";
    addDiagButton("Get my API key", "primary", openCanonicalKeysDashboard);
  } else if (result.state === "invalid_key") {
    setDiagState("invalid_key");
    const info = describeInvalidKey(result.code);
    renderDiagTitle(info.title);
    // Surface the raw server-supplied error alongside the canned guidance so
    // engineers can see *why* the key was rejected, while keeping the friendly
    // detail line for end users. Using textContent (not innerHTML) keeps this
    // XSS-safe even though result.error is server-controlled.
    let detailText = info.detail;
    if (typeof result.error === "string" && result.error) {
      detailText += ` (Server said: ${result.error})`;
    }
    diagDetail.textContent = detailText;
    addDiagButton(info.actionLabel, "primary", info.actionHandler);
    if (info.secondaryLabel && info.secondaryHandler) {
      addDiagButton(info.secondaryLabel, "secondary", info.secondaryHandler);
    }
  } else {
    // server_unreachable (default fallback)
    setDiagState("server_unreachable");
    renderDiagTitle("Server unreachable");
    diagDetail.textContent = result.error
      ? `Could not reach the EraseAI API: ${result.error}`
      : "Could not reach the EraseAI API.";
    addDiagButton("Open eraseai.ai", "primary", openCanonicalDashboard);
  }
}

function runDiagnosis() {
  return new Promise((resolve) => {
    setDiagState("checking");
    diagTitle.textContent = "Checking…";
    diagDetail.textContent = "Probing the EraseAI API.";
    clearDiagActions();
    chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, (response) => {
      const safe = response || { state: "server_unreachable", error: "No response" };
      renderDiagnosis(safe);
      resolve(safe);
    });
  });
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function renderLastScan(scan) {
  clearNode(scanSummary);
  if (!scan || scan.riskScore == null) {
    const empty = document.createElement("div");
    empty.className = "no-scans";
    empty.textContent = "No scans yet";
    scanSummary.appendChild(empty);
    return;
  }

  const riskScore = Number(scan.riskScore);
  const scoreClass = riskScore < 40 ? "danger" : riskScore <= 70 ? "caution" : "safe";
  const levelLabel = scan.level === "danger" ? "High Risk" : scan.level === "caution" ? "Medium Risk" : "Safe";
  const issueCount = Number(scan.issueCount != null ? scan.issueCount : (scan.issues ? scan.issues.length : 0));
  const timeAgo = scan.scannedAt ? formatTimeAgo(scan.scannedAt) : "";

  const row = document.createElement("div");
  row.className = "scan-row";

  const scoreEl = document.createElement("div");
  scoreEl.className = `scan-score ${scoreClass}`;
  scoreEl.textContent = String(riskScore);
  row.appendChild(scoreEl);

  const details = document.createElement("div");
  details.className = "scan-details";

  const labelEl = document.createElement("div");
  labelEl.className = "label";
  labelEl.textContent = levelLabel;
  details.appendChild(labelEl);

  const valueEl = document.createElement("div");
  valueEl.className = "value";
  valueEl.textContent = `${issueCount} issue${issueCount !== 1 ? "s" : ""} found`;
  details.appendChild(valueEl);

  row.appendChild(details);
  scanSummary.appendChild(row);

  if (timeAgo) {
    const timeEl = document.createElement("div");
    timeEl.className = "scan-time";
    timeEl.textContent = `Scanned ${timeAgo}`;
    scanSummary.appendChild(timeEl);
  }
}

async function loadState() {
  const data = await chrome.storage.local.get(["apiKey", "enabled", "lastScan"]);

  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
    apiKeyInput.type = "password";
  }

  toggleEnabled.checked = data.enabled !== false;
  renderLastScan(data.lastScan);

  // Footer link always points at the canonical dashboard.
  dashboardLink.href = CANONICAL_DASHBOARD_URL;
  dashboardLink.addEventListener("click", (e) => {
    e.preventDefault();
    openCanonicalDashboard();
  });

  await runDiagnosis();
}

saveKeyBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showKeyStatus("Please enter an API key", "error");
    return;
  }

  if (!key.startsWith("eak_")) {
    showKeyStatus("API key should start with eak_", "error");
    return;
  }

  saveKeyBtn.disabled = true;
  saveKeyBtn.textContent = "...";

  await chrome.storage.local.set({ apiKey: key });
  const result = await runDiagnosis();
  saveKeyBtn.disabled = false;
  saveKeyBtn.textContent = "Save";
  if (result.state === "connected") {
    showKeyStatus("Connected successfully!", "success");
  } else if (result.state === "invalid_key") {
    const info = describeInvalidKey(result.code);
    showKeyStatus(info.title, "error");
  } else if (result.state === "server_unreachable") {
    showKeyStatus("Server unreachable — try again in a moment", "error");
  }
});

toggleEnabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggleEnabled.checked });
});

loadState();
