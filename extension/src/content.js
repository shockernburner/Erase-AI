(() => {
  const PLATFORMS = {
    chatgpt: {
      hostPatterns: ["chat.openai.com", "chatgpt.com"],
      name: "ChatGPT",
      inputSelectors: [
        "#prompt-textarea",
        'div[contenteditable="true"][id="prompt-textarea"]',
        "textarea[data-id]",
        "form textarea",
      ],
      sendButtonSelectors: [
        'button[data-testid="send-button"]',
        'button[data-testid="fruitjuice-send-button"]',
        'form button[type="submit"]',
        'button[aria-label="Send prompt"]',
      ],
      getInputText(el) {
        if (el.tagName === "TEXTAREA") return el.value;
        return el.innerText || el.textContent || "";
      },
      setInputText(el, text) {
        if (el.tagName === "TEXTAREA") {
          el.value = text;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          el.focus();
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, text);
        }
      },
    },
    claude: {
      hostPatterns: ["claude.ai"],
      name: "Claude",
      inputSelectors: [
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][data-placeholder]',
        'fieldset div[contenteditable="true"]',
      ],
      sendButtonSelectors: [
        'button[aria-label="Send Message"]',
        'button[aria-label="Send message"]',
        'fieldset button:last-of-type',
      ],
      getInputText(el) {
        return el.innerText || el.textContent || "";
      },
      setInputText(el, text) {
        el.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, text);
      },
    },
    gemini: {
      hostPatterns: ["gemini.google.com"],
      name: "Gemini",
      inputSelectors: [
        '.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'rich-textarea div[contenteditable="true"]',
      ],
      sendButtonSelectors: [
        'button[aria-label="Send message"]',
        "button.send-button",
        ".input-area button[mat-icon-button]",
      ],
      getInputText(el) {
        return el.innerText || el.textContent || "";
      },
      setInputText(el, text) {
        el.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, text);
      },
    },
    replit: {
      hostPatterns: ["replit.com"],
      name: "Replit",
      inputSelectors: [
        'textarea[placeholder*="Ask"]',
        'div[contenteditable="true"][role="textbox"]',
        '.cm-content[contenteditable="true"]',
      ],
      sendButtonSelectors: [
        'button[aria-label="Send"]',
        'button[data-cy="send-btn"]',
      ],
      getInputText(el) {
        if (el.tagName === "TEXTAREA") return el.value;
        return el.innerText || el.textContent || "";
      },
      setInputText(el, text) {
        if (el.tagName === "TEXTAREA") {
          el.value = text;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          el.focus();
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, text);
        }
      },
    },
  };

  let platform = null;
  let isIntercepting = false;
  let bypassNext = false;
  let listenersAttached = false;
  let observer = null;

  function detectPlatform() {
    const host = window.location.hostname;
    for (const [key, p] of Object.entries(PLATFORMS)) {
      if (p.hostPatterns.some((h) => host.includes(h))) {
        return { key, ...p };
      }
    }
    return null;
  }

  function findElement(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function createOverlayBackdrop() {
    removeOverlay();
    const backdrop = document.createElement("div");
    backdrop.id = "eraseai-overlay-backdrop";
    const panel = document.createElement("div");
    panel.id = "eraseai-overlay-panel";
    panel.innerHTML = `
      <div class="eraseai-header">
        <div class="eraseai-logo">E</div>
        <div class="eraseai-header-text">
          <h2>EraseAI Firewall</h2>
          <p>Analyzing your prompt for privacy risks...</p>
        </div>
      </div>
      <div class="eraseai-scanning">
        <div class="eraseai-spinner"></div>
        <p>Scanning prompt...</p>
      </div>
    `;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    return { backdrop, panel };
  }

  function removeOverlay() {
    const el = document.getElementById("eraseai-overlay-backdrop");
    if (el) el.remove();
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function getScoreColor(score) {
    if (score < 40) return "#ef4444";
    if (score <= 70) return "#f59e0b";
    return "#22c55e";
  }

  function getLevelLabel(level) {
    if (level === "danger") return "High Risk \u2014 Blocked";
    if (level === "caution") return "Medium Risk \u2014 Warning";
    return "Low Risk \u2014 Safe";
  }

  function getLevelClass(level) {
    if (level === "danger") return "eraseai-level-danger";
    if (level === "caution") return "eraseai-level-caution";
    return "eraseai-level-safe";
  }

  function getSeverityBadgeClass(severity) {
    const s = String(severity).toLowerCase();
    if (s === "critical" || s === "high") return "eraseai-badge-high";
    if (s === "medium") return "eraseai-badge-medium";
    return "eraseai-badge-low";
  }

  function formatIssueText(issue) {
    return escapeHtml(issue.detail || issue.description || issue.category || issue.type || "Unknown issue");
  }

  function formatSuggestion(s) {
    if (typeof s === "string") return escapeHtml(s);
    if (s && typeof s === "object") {
      const action = s.action ? escapeHtml(s.action) : "";
      const detail = s.detail ? escapeHtml(s.detail) : "";
      if (action && detail) return `<strong>${action}:</strong> ${detail}`;
      return action || detail || escapeHtml(JSON.stringify(s));
    }
    return escapeHtml(String(s));
  }

  function renderResults(panel, result, inputEl) {
    const { riskScore, level, issues, suggestions, summary } = result;
    const color = getScoreColor(riskScore);
    const circumference = 2 * Math.PI * 26;
    const dashOffset = circumference * (1 - riskScore / 100);

    let issuesHtml = "";
    if (issues && issues.length > 0) {
      const items = issues.map((issue) => {
        const badgeCls = getSeverityBadgeClass(issue.severity);
        return `
          <div class="eraseai-issue-item">
            <span class="eraseai-issue-badge ${badgeCls}">${escapeHtml(issue.severity)}</span>
            <span>${formatIssueText(issue)}</span>
          </div>`;
      }).join("");
      issuesHtml = `<div class="eraseai-issues"><h4>Issues Found (${issues.length})</h4>${items}</div>`;
    }

    let suggestionsHtml = "";
    if (suggestions && suggestions.length > 0) {
      const items = suggestions.map((s) => `
        <div class="eraseai-suggestion-item">
          <span class="eraseai-suggestion-icon">\u2192</span>
          <span>${formatSuggestion(s)}</span>
        </div>`).join("");
      suggestionsHtml = `<div class="eraseai-suggestions"><h4>Suggestions</h4>${items}</div>`;
    }

    const isDanger = level === "danger";

    panel.innerHTML = `
      <div class="eraseai-header">
        <div class="eraseai-logo">E</div>
        <div class="eraseai-header-text">
          <h2>EraseAI Firewall</h2>
          <p>Prompt analysis complete</p>
        </div>
      </div>
      <div class="eraseai-score-section ${getLevelClass(level)}">
        <div class="eraseai-score-ring">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke="${color}" stroke-width="4"
              stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" stroke-linecap="round"/>
          </svg>
          <span class="score-value">${riskScore}</span>
        </div>
        <div class="eraseai-score-info">
          <h3>${getLevelLabel(level)}</h3>
          <p>${escapeHtml(summary)}</p>
        </div>
      </div>
      ${issuesHtml}
      ${suggestionsHtml}
      <div class="eraseai-actions">
        <button class="eraseai-btn eraseai-btn-cancel" id="eraseai-cancel">Cancel</button>
        <button class="eraseai-btn eraseai-btn-sanitize" id="eraseai-sanitize">Sanitize & Send</button>
        <button class="eraseai-btn eraseai-btn-send" id="eraseai-send-anyway">${isDanger ? "Send Anyway (Risky)" : "Send Anyway"}</button>
      </div>
    `;

    panel.querySelector("#eraseai-cancel").addEventListener("click", () => {
      removeOverlay();
      isIntercepting = false;
    });

    panel.querySelector("#eraseai-send-anyway").addEventListener("click", () => {
      removeOverlay();
      bypassNext = true;
      isIntercepting = false;
      triggerSend();
    });

    panel.querySelector("#eraseai-sanitize").addEventListener("click", () => {
      const btn = panel.querySelector("#eraseai-sanitize");
      btn.disabled = true;
      btn.textContent = "Sanitizing...";

      const originalText = platform.getInputText(inputEl);
      chrome.runtime.sendMessage({ type: "SANITIZE", text: originalText }, (response) => {
        if (chrome.runtime.lastError) {
          btn.textContent = "Failed";
          btn.disabled = false;
          return;
        }
        if (!response || response.error) {
          btn.textContent = "Failed";
          btn.disabled = false;
          return;
        }

        platform.setInputText(inputEl, response.sanitized);

        if (response.changes && response.changes.length > 0) {
          const changeItems = response.changes.map((c) => `
            <div class="eraseai-issue-item">
              <span class="eraseai-issue-badge eraseai-badge-medium">${escapeHtml(c.category || c.type || "redacted")}</span>
              <span><s style="color:#71717a">${escapeHtml(c.original)}</s> \u2192 ${escapeHtml(c.replacement)}</span>
            </div>`).join("");

          const actionsDiv = panel.querySelector(".eraseai-actions");
          if (actionsDiv) {
            actionsDiv.insertAdjacentHTML("beforebegin", `
              <div class="eraseai-issues">
                <h4>Changes Applied (${response.changes.length})</h4>
                ${changeItems}
              </div>
            `);
          }
        }

        btn.textContent = "\u2713 Sanitized";

        const sendBtn = panel.querySelector("#eraseai-send-anyway");
        if (sendBtn) {
          sendBtn.textContent = "Send Sanitized";
          sendBtn.className = "eraseai-btn eraseai-btn-sanitize";
        }
      });
    });
  }

  function renderError(panel, errorMsg) {
    panel.innerHTML = `
      <div class="eraseai-header">
        <div class="eraseai-logo">E</div>
        <div class="eraseai-header-text">
          <h2>EraseAI Firewall</h2>
          <p>Analysis failed</p>
        </div>
      </div>
      <div class="eraseai-error-msg">${escapeHtml(errorMsg)}</div>
      <div class="eraseai-actions">
        <button class="eraseai-btn eraseai-btn-cancel" id="eraseai-cancel">Close</button>
        <button class="eraseai-btn eraseai-btn-send" id="eraseai-send-anyway">Send Anyway</button>
      </div>
    `;
    panel.querySelector("#eraseai-cancel").addEventListener("click", () => {
      removeOverlay();
      isIntercepting = false;
    });
    panel.querySelector("#eraseai-send-anyway").addEventListener("click", () => {
      removeOverlay();
      bypassNext = true;
      isIntercepting = false;
      triggerSend();
    });
  }

  function triggerSend() {
    if (!platform) return;
    const sendBtn = findElement(platform.sendButtonSelectors);
    if (sendBtn) {
      setTimeout(() => sendBtn.click(), 50);
    }
  }

  function interceptSubmission(e) {
    if (bypassNext) {
      bypassNext = false;
      return;
    }

    if (isIntercepting) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    const inputEl = findElement(platform.inputSelectors);
    if (!inputEl) return;

    const text = platform.getInputText(inputEl).trim();
    if (!text || text.length < 3) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    isIntercepting = true;

    chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (configResult) => {
      if (chrome.runtime.lastError || !configResult) {
        isIntercepting = false;
        bypassNext = true;
        triggerSend();
        return;
      }

      if (!configResult.enabled || !configResult.apiKey) {
        isIntercepting = false;
        bypassNext = true;
        triggerSend();
        return;
      }

      const { panel } = createOverlayBackdrop();

      chrome.runtime.sendMessage({ type: "ANALYZE", text }, (result) => {
        if (chrome.runtime.lastError || !result) {
          renderError(panel, "Failed to connect to EraseAI service.");
          isIntercepting = false;
          return;
        }

        if (result.bypass) {
          removeOverlay();
          bypassNext = true;
          isIntercepting = false;
          triggerSend();
          return;
        }

        if (result.error) {
          renderError(panel, result.error);
          isIntercepting = false;
          return;
        }

        if (result.riskScore > 70) {
          removeOverlay();
          bypassNext = true;
          isIntercepting = false;
          triggerSend();
          return;
        }

        renderResults(panel, result, inputEl);
        isIntercepting = false;
      });
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      const inputEl = findElement(platform.inputSelectors);
      if (inputEl && (inputEl === e.target || inputEl.contains(e.target))) {
        interceptSubmission(e);
      }
    }
  }

  function hookSendButtons() {
    const sendBtns = platform.sendButtonSelectors
      .map((s) => document.querySelector(s))
      .filter(Boolean);

    sendBtns.forEach((btn) => {
      if (!btn.dataset.eraseaiHooked) {
        btn.dataset.eraseaiHooked = "true";
        btn.addEventListener("click", interceptSubmission, true);
      }
    });
  }

  function attachListeners() {
    if (listenersAttached) return;
    listenersAttached = true;

    document.addEventListener("keydown", handleKeyDown, true);

    hookSendButtons();

    observer = new MutationObserver(() => {
      hookSendButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function detachListeners() {
    if (!listenersAttached) return;
    listenersAttached = false;

    document.removeEventListener("keydown", handleKeyDown, true);

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    document.querySelectorAll("[data-eraseai-hooked]").forEach((el) => {
      el.removeEventListener("click", interceptSubmission, true);
      delete el.dataset.eraseaiHooked;
    });
  }

  function init() {
    platform = detectPlatform();
    if (!platform) return;

    chrome.storage.local.get(["enabled"], (result) => {
      if (chrome.runtime.lastError) return;
      if (result.enabled === false) return;
      attachListeners();
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        if (changes.enabled.newValue === false) {
          detachListeners();
        } else {
          attachListeners();
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
