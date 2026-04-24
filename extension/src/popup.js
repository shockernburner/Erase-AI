// Hard-coded "Get my API key" target. We deliberately do NOT use the user's
// stored apiUrl here — the whole point is that if they typed a wrong URL into
// the custom-API-URL field they would never reach the dashboard from the
// popup. Always send them to the canonical production site.
const DEFAULT_API_URL = "https://eraseai.ai";
const CANONICAL_DASHBOARD_URL = "https://eraseai.ai/ai-firewall";

const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const keyStatus = document.getElementById("key-status");
const toggleEnabled = document.getElementById("toggle-enabled");
const scanSummary = document.getElementById("scan-summary");
const urlToggle = document.getElementById("url-toggle");
const urlInputSection = document.getElementById("url-input-section");
const apiUrlInput = document.getElementById("api-url-input");
const saveUrlBtn = document.getElementById("save-url-btn");
const dashboardLink = document.getElementById("dashboard-link");

const diagCard = document.getElementById("diag-card");
const diagTitle = document.getElementById("diag-title");
const diagDetail = document.getElementById("diag-detail");
const diagActions = document.getElementById("diag-actions");
const diagMeta = document.getElementById("diag-meta");

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

// Build "API: <url> [Reset]" into diagMeta safely (no innerHTML).
// onReset is called when the Reset button is clicked.
function renderDiagMeta(apiUrl, onReset) {
  clearNode(diagMeta);
  diagMeta.style.display = "block";
  const label = document.createTextNode(`API: ${apiUrl}`);
  diagMeta.appendChild(label);
  if (typeof onReset === "function") {
    diagMeta.appendChild(document.createTextNode(" "));
    const btn = document.createElement("button");
    btn.className = "reset-link";
    btn.type = "button";
    btn.textContent = "Reset";
    btn.addEventListener("click", onReset);
    diagMeta.appendChild(btn);
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

async function resetApiUrlAndRecheck() {
  await chrome.storage.local.remove("apiUrl");
  apiUrlInput.value = "";
  showKeyStatus("API URL reset to default", "success");
  await runDiagnosis();
}

function renderDiagnosis(result) {
  clearDiagActions();
  diagMeta.style.display = "none";
  clearNode(diagMeta);

  const apiUrl = typeof result.apiUrl === "string" ? result.apiUrl : DEFAULT_API_URL;
  const isCustom = !!result.isCustomUrl;

  if (result.state === "connected") {
    setDiagState("connected");
    const planLabel = typeof result.plan === "string" ? result.plan : "free";
    const planPretty = planLabel.charAt(0).toUpperCase() + planLabel.slice(1);
    renderDiagTitle("Connected", planPretty);
    diagDetail.textContent = result.email
      ? `Authenticated as ${result.email}.`
      : "Your API key is valid and the firewall is active.";
    if (isCustom) {
      renderDiagMeta(apiUrl, resetApiUrlAndRecheck);
    }
    return;
  }

  if (result.state === "no_key") {
    setDiagState("no_key");
    renderDiagTitle("Add your API key");
    diagDetail.textContent = "The EraseAI server is reachable. Enter an API key below, or grab one from your dashboard.";
    addDiagButton("Get my API key", "primary", openCanonicalDashboard);
    if (isCustom) {
      renderDiagMeta(apiUrl, resetApiUrlAndRecheck);
    }
    return;
  }

  if (result.state === "invalid_key") {
    setDiagState("invalid_key");
    renderDiagTitle("API key not accepted");
    diagDetail.textContent = result.error
      ? `${result.error}. Generate a new key from your dashboard and paste it below.`
      : "Generate a new key from your dashboard and paste it below.";
    addDiagButton("Get a new key", "primary", openCanonicalDashboard);
    if (isCustom) {
      renderDiagMeta(apiUrl, resetApiUrlAndRecheck);
    }
    return;
  }

  // server_unreachable (default fallback)
  setDiagState("server_unreachable");
  renderDiagTitle("Server unreachable");
  diagDetail.textContent = result.error
    ? `Could not reach the EraseAI API: ${result.error}`
    : "Could not reach the EraseAI API.";
  if (isCustom) {
    addDiagButton("Reset URL to eraseai.ai", "secondary", resetApiUrlAndRecheck);
  }
  addDiagButton("Open eraseai.ai", "primary", openCanonicalDashboard);
  renderDiagMeta(apiUrl);
}

function runDiagnosis() {
  return new Promise((resolve) => {
    setDiagState("checking");
    diagTitle.textContent = "Checking…";
    diagDetail.textContent = "Probing the EraseAI API.";
    clearDiagActions();
    diagMeta.style.display = "none";
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
  const data = await chrome.storage.local.get(["apiKey", "apiUrl", "enabled", "lastScan"]);

  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
    apiKeyInput.type = "password";
  }

  if (data.apiUrl && data.apiUrl !== DEFAULT_API_URL) {
    apiUrlInput.value = data.apiUrl;
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
    showKeyStatus(result.error || "API key not accepted", "error");
  } else if (result.state === "server_unreachable") {
    showKeyStatus("Server unreachable — check the API URL", "error");
  }
});

toggleEnabled.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggleEnabled.checked });
});

urlToggle.addEventListener("click", () => {
  urlInputSection.classList.toggle("visible");
});

saveUrlBtn.addEventListener("click", async () => {
  const url = apiUrlInput.value.trim() || DEFAULT_API_URL;
  if (!url.startsWith("https://")) {
    showKeyStatus("API URL must use HTTPS", "error");
    return;
  }
  try {
    const hostname = new URL(url).hostname;
    const allowed = hostname === "eraseai.ai" || hostname.endsWith(".eraseai.ai") || hostname.endsWith(".replit.app");
    if (!allowed) {
      showKeyStatus("Custom URL must be eraseai.ai, a *.eraseai.ai subdomain, or a *.replit.app domain", "error");
      return;
    }
  } catch {
    showKeyStatus("Invalid URL format", "error");
    return;
  }
  await chrome.storage.local.set({ apiUrl: url });
  showKeyStatus("API URL updated", "success");
  await runDiagnosis();
});

loadState();
