const DEFAULT_API_URL = "https://eraseai.ai";

const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const keyStatus = document.getElementById("key-status");
const connectionDot = document.getElementById("connection-dot");
const connectionText = document.getElementById("connection-text");
const toggleEnabled = document.getElementById("toggle-enabled");
const scanSummary = document.getElementById("scan-summary");
const urlToggle = document.getElementById("url-toggle");
const urlInputSection = document.getElementById("url-input-section");
const apiUrlInput = document.getElementById("api-url-input");
const saveUrlBtn = document.getElementById("save-url-btn");
const dashboardLink = document.getElementById("dashboard-link");

function showKeyStatus(msg, type) {
  keyStatus.textContent = msg;
  keyStatus.className = `status-text ${type}`;
  keyStatus.style.display = "block";
  setTimeout(() => { keyStatus.style.display = "none"; }, 4000);
}

function setConnectionStatus(status, text) {
  connectionDot.className = `status-dot ${status}`;
  connectionText.textContent = text;
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function renderLastScan(scan) {
  if (!scan || scan.riskScore == null) {
    scanSummary.innerHTML = '<div class="no-scans">No scans yet</div>';
    return;
  }

  const scoreClass = scan.riskScore < 40 ? "danger" : scan.riskScore <= 70 ? "caution" : "safe";
  const levelLabel = scan.level === "danger" ? "High Risk" : scan.level === "caution" ? "Medium Risk" : "Safe";
  const issueCount = scan.issueCount != null ? scan.issueCount : (scan.issues ? scan.issues.length : 0);
  const timeAgo = scan.scannedAt ? formatTimeAgo(scan.scannedAt) : "";

  scanSummary.innerHTML = `
    <div class="scan-row">
      <div class="scan-score ${scoreClass}">${scan.riskScore}</div>
      <div class="scan-details">
        <div class="label">${levelLabel}</div>
        <div class="value">${issueCount} issue${issueCount !== 1 ? "s" : ""} found</div>
      </div>
    </div>
    ${timeAgo ? `<div class="scan-time">Scanned ${timeAgo}</div>` : ""}
  `;
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

  const apiUrl = (data.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
  dashboardLink.href = apiUrl;
  dashboardLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: apiUrl });
  });

  if (data.apiKey) {
    setConnectionStatus("checking", "Testing connection...");
    chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, (response) => {
      if (response.connected) {
        setConnectionStatus("connected", "Connected");
      } else {
        setConnectionStatus("disconnected", response.error || "Disconnected");
      }
    });
  } else {
    setConnectionStatus("disconnected", "No API key");
  }
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

  setConnectionStatus("checking", "Testing...");
  chrome.runtime.sendMessage({ type: "TEST_CONNECTION" }, (response) => {
    saveKeyBtn.disabled = false;
    saveKeyBtn.textContent = "Save";

    if (response.connected) {
      showKeyStatus("Connected successfully!", "success");
      setConnectionStatus("connected", "Connected");
    } else {
      showKeyStatus(response.error || "Connection failed", "error");
      setConnectionStatus("disconnected", response.error || "Failed");
    }
  });
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
      showKeyStatus("Custom URL must be eraseai.ai or a *.replit.app domain", "error");
      return;
    }
  } catch {
    showKeyStatus("Invalid URL format", "error");
    return;
  }
  await chrome.storage.local.set({ apiUrl: url });

  const apiUrl = url.replace(/\/$/, "");
  dashboardLink.href = apiUrl;

  showKeyStatus("API URL updated", "success");
});

loadState();
