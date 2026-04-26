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

  // Hard ceiling on how long the content script will wait for the background
  // service worker to respond to an ANALYZE message. MV3 service workers can
  // be suspended at any time; if that happens mid-fetch the sendMessage
  // callback never fires and the spinner would otherwise hang forever. 15s
  // is generous enough that a slow but healthy network (the API typically
  // returns in <2s, but mobile tethering / hotel wifi can spike to 8-10s)
  // never trips it, while still being short enough that no live-demo
  // viewer thinks the product is broken.
  const ANALYZE_TIMEOUT_MS = 15000;

  let platform = null;
  let isIntercepting = false;
  let bypassNext = false;
  let listenersAttached = false;
  let observer = null;
  // Module-scoped so removeOverlay() can cancel it when the overlay is
  // replaced before the safe-path auto-dismiss window elapses.
  let pendingSafeTimer = null;
  // Module-scoped so removeOverlay() can cancel it when the overlay is
  // dismissed before the analyze callback or the timeout fires.
  let analyzeTimer = null;
  // The last analyze result we showed to the user. We attach this to every
  // outcome event we report so the api-server can attribute the action
  // (sanitize / cancel / send-anyway / auto-send) to a specific risk level
  // and category set. Cleared after we report a terminal action so the next
  // submission cannot inherit a stale result.
  let lastAnalysis = null;
  let outcomeReported = false;

  function extractCategories(result) {
    if (!result || !Array.isArray(result.issues)) return [];
    const seen = new Set();
    const out = [];
    for (const issue of result.issues) {
      if (!issue || typeof issue !== "object") continue;
      const cat = typeof issue.category === "string" && issue.category
        ? issue.category
        : typeof issue.type === "string" && issue.type
          ? issue.type
          : null;
      if (!cat) continue;
      if (seen.has(cat)) continue;
      seen.add(cat);
      out.push(cat);
      if (out.length >= 32) break;
    }
    return out;
  }

  function reportOutcome(action) {
    if (outcomeReported) return;
    if (!lastAnalysis || !lastAnalysis.level) return;
    outcomeReported = true;
    try {
      chrome.runtime.sendMessage(
        {
          type: "OUTCOME",
          outcome: {
            level: lastAnalysis.level,
            action,
            riskScore: typeof lastAnalysis.riskScore === "number" ? lastAnalysis.riskScore : null,
            categories: lastAnalysis.categories || [],
          },
        },
        () => {
          if (chrome.runtime.lastError) {
            // Outcome reporting is best-effort; never surface a failure to
            // the user mid-flow.
          }
        },
      );
    } catch {
      // Ignore — the firewall must keep working even if the service worker
      // has been suspended.
    }
  }

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
    if (pendingSafeTimer != null) {
      clearTimeout(pendingSafeTimer);
      pendingSafeTimer = null;
    }
    if (analyzeTimer != null) {
      clearTimeout(analyzeTimer);
      analyzeTimer = null;
    }
    const el = document.getElementById("eraseai-overlay-backdrop");
    if (el) el.remove();
  }

  function persistLastAttempt(record) {
    try {
      chrome.storage.local.set({ lastAttempt: record });
    } catch {
      // Persistence is best-effort; never surface a failure to the user.
    }
  }

  function showOpenPopupFallback(panel) {
    // Display a small inline toast on the error panel itself when we can't
    // open the popup programmatically. We deliberately put the recovery
    // hint INSIDE the panel (not as a window-level toast) so a user already
    // looking at the error is guaranteed to see it.
    if (!panel) return;
    let toast = panel.querySelector(".eraseai-open-popup-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "eraseai-open-popup-toast";
      const actions = panel.querySelector(".eraseai-actions");
      if (actions && actions.parentNode) {
        actions.parentNode.insertBefore(toast, actions);
      } else {
        panel.appendChild(toast);
      }
    }
    let url = "";
    try {
      url = chrome.runtime.getURL("src/popup.html");
    } catch {
      url = "";
    }
    toast.textContent = url
      ? `Couldn't auto-open the popup. Click the EraseAI icon in your toolbar — or paste this into a new tab: ${url}`
      : "Couldn't auto-open the popup. Click the EraseAI icon in your toolbar.";

    // Best-effort: also copy the URL to the clipboard so the user can paste
    // it directly. Wrapped in try/catch because clipboard access can be
    // blocked by site permissions on chat.openai.com etc.
    if (url && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(url).catch(() => {
        // ignore — the toast already tells the user what to do
      });
    }
  }

  function openExtensionPopup(panel) {
    let messageReturned = false;
    try {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" }, (response) => {
        messageReturned = true;
        if (chrome.runtime.lastError || !response || response.ok === false) {
          // Background couldn't open it (worker dead, permission error, or
          // chrome.action.openPopup unavailable). Fall back to the inline
          // toast + clipboard so the user always has a recovery path.
          showOpenPopupFallback(panel);
        }
      });
    } catch {
      messageReturned = true;
      showOpenPopupFallback(panel);
      return;
    }
    // If sendMessage swallowed the call entirely (no callback ever runs —
    // can happen when the service worker port closes immediately), surface
    // the fallback after a short grace window so the user is never left
    // wondering whether the click did anything.
    setTimeout(() => {
      if (!messageReturned) showOpenPopupFallback(panel);
    }, 800);
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

    // Track whether the user successfully sanitized before sending. The
    // Sanitize button is not itself a terminal action — the user must still
    // click Send Sanitized afterwards. We attribute the final outcome based
    // on which path they actually committed to.
    let sanitizedApplied = false;

    panel.querySelector("#eraseai-cancel").addEventListener("click", () => {
      reportOutcome("cancel");
      removeOverlay();
      isIntercepting = false;
    });

    panel.querySelector("#eraseai-send-anyway").addEventListener("click", () => {
      reportOutcome(sanitizedApplied ? "sanitize" : "send-anyway");
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
        sanitizedApplied = true;

        const sendBtn = panel.querySelector("#eraseai-send-anyway");
        if (sendBtn) {
          sendBtn.textContent = "Send Sanitized";
          sendBtn.className = "eraseai-btn eraseai-btn-sanitize";
        }
      });
    });
  }

  function renderClearConfirmation(panel, result, inputEl) {
    const { riskScore, summary } = result;
    const score = typeof riskScore === "number" ? riskScore : 100;
    const message = (summary && String(summary).trim()) ||
      "No issues detected. Your prompt looks safe.";

    panel.innerHTML = `
      <div class="eraseai-header">
        <div class="eraseai-logo">E</div>
        <div class="eraseai-header-text">
          <h2>EraseAI Firewall</h2>
          <p>All clear &mdash; sending your prompt</p>
        </div>
      </div>
      <div class="eraseai-score-section eraseai-level-safe">
        <div class="eraseai-score-ring">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke="#22c55e" stroke-width="4"
              stroke-dasharray="${2 * Math.PI * 26}" stroke-dashoffset="0" stroke-linecap="round"/>
          </svg>
          <span class="score-value">${score}</span>
        </div>
        <div class="eraseai-score-info">
          <h3>Low Risk \u2014 Safe</h3>
          <p>${escapeHtml(message)}</p>
          <p id="eraseai-clear-countdown" style="margin-top:6px;font-size:12px;color:#71717a;">Sending automatically in a moment\u2026</p>
        </div>
      </div>
      <div class="eraseai-actions">
        <button class="eraseai-btn eraseai-btn-cancel" id="eraseai-clear-cancel">Cancel</button>
        <button class="eraseai-btn eraseai-btn-sanitize" id="eraseai-clear-send">Send now</button>
      </div>
    `;

    let cancelled = false;

    const fireSend = () => {
      if (cancelled) return;
      cancelled = true;
      if (pendingSafeTimer != null) {
        clearTimeout(pendingSafeTimer);
        pendingSafeTimer = null;
      }
      reportOutcome("auto-send");
      removeOverlay();
      bypassNext = true;
      isIntercepting = false;
      triggerSend();
    };

    const cancel = () => {
      if (cancelled) return;
      cancelled = true;
      if (pendingSafeTimer != null) {
        clearTimeout(pendingSafeTimer);
        pendingSafeTimer = null;
      }
      reportOutcome("cancel");
      removeOverlay();
      isIntercepting = false;
    };

    panel.querySelector("#eraseai-clear-cancel").addEventListener("click", cancel);
    panel.querySelector("#eraseai-clear-send").addEventListener("click", fireSend);

    if (pendingSafeTimer != null) clearTimeout(pendingSafeTimer);
    pendingSafeTimer = setTimeout(() => {
      pendingSafeTimer = null;
      fireSend();
    }, 1200);
  }

  function getErrorSubtitle(kind) {
    if (kind === "timeout") return "No response from the EraseAI service in time";
    if (kind === "auth") return "API key problem";
    if (kind === "network") return "Network problem";
    return "Couldn't reach the EraseAI service";
  }

  function renderError(panel, errorMsg, opts) {
    // The analyzing-state panel can be visually mistaken for the error panel
    // at a glance — both centred, both dark. Tag the panel with an
    // unmistakable error class (red-orange accent on the header bar, an
    // alert icon next to the title, distinct headline copy) so a user
    // glancing at the screen during a demo can tell at a glance which one
    // they're looking at. Always wipe the analyzing DOM (innerHTML reset)
    // so no orphaned spinner can survive into the error state.
    const options = opts || {};
    const kind = typeof options.kind === "string" ? options.kind : "server";
    const showOpenPopup = options.showOpenPopup !== false;
    const subtitle = options.subtitle || getErrorSubtitle(kind);

    panel.classList.add("eraseai-error-panel");
    panel.innerHTML = `
      <div class="eraseai-header eraseai-error-header">
        <div class="eraseai-error-icon" aria-hidden="true">!</div>
        <div class="eraseai-header-text">
          <h2>Couldn't analyze</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="eraseai-error-msg">${escapeHtml(errorMsg)}</div>
      <div class="eraseai-actions">
        <button class="eraseai-btn eraseai-btn-cancel" id="eraseai-cancel">Close</button>
        ${showOpenPopup ? '<button class="eraseai-btn eraseai-btn-open-popup" id="eraseai-open-popup">Open Extension Popup</button>' : ""}
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
    const openPopupBtn = panel.querySelector("#eraseai-open-popup");
    if (openPopupBtn) {
      openPopupBtn.addEventListener("click", () => {
        openExtensionPopup(panel);
      });
    }
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
    // Reset the per-submission outcome state so each new prompt produces at
    // most one outcome event tied to its own analysis result.
    lastAnalysis = null;
    outcomeReported = false;

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

      // Belt-and-braces hard timeout. The MV3 service worker that handles
      // ANALYZE can be suspended at any point — including AFTER it
      // dispatched the upstream fetch but BEFORE it called sendResponse.
      // chrome.runtime.lastError is set on some failure modes (port closed)
      // but NOT on this one (worker simply went idle), which is why the
      // pre-1.3.4 extension hangs forever on this path. The timer below
      // is the only thing that guarantees the user sees a terminal state.
      let analyzeResponded = false;
      analyzeTimer = setTimeout(() => {
        if (analyzeResponded) return;
        analyzeResponded = true;
        analyzeTimer = null;
        persistLastAttempt({
          status: "timeout",
          reason: `No response from background within ${Math.round(ANALYZE_TIMEOUT_MS / 1000)}s`,
          at: Date.now(),
        });
        renderError(
          panel,
          "Couldn't reach the EraseAI service in time. Check your API key and connection in the extension popup.",
          { kind: "timeout", showOpenPopup: true },
        );
        isIntercepting = false;
      }, ANALYZE_TIMEOUT_MS);

      chrome.runtime.sendMessage({ type: "ANALYZE", text }, (result) => {
        if (analyzeResponded) return;
        analyzeResponded = true;
        if (analyzeTimer != null) {
          clearTimeout(analyzeTimer);
          analyzeTimer = null;
        }

        if (chrome.runtime.lastError || !result) {
          renderError(
            panel,
            "Failed to connect to EraseAI service.",
            { kind: "network", showOpenPopup: true },
          );
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
          const isAuth =
            /api key|unauthor|invalid|revoked|expired/i.test(String(result.error)) ||
            (typeof result.code === "string" && result.code.startsWith("AUTH_"));
          renderError(panel, result.error, {
            kind: isAuth ? "auth" : "server",
            showOpenPopup: true,
          });
          isIntercepting = false;
          return;
        }

        // Capture the analysis result so terminal-action handlers can
        // attribute the outcome event back to the level/categories the user
        // actually saw.
        lastAnalysis = {
          level: typeof result.level === "string" ? result.level : null,
          riskScore: typeof result.riskScore === "number" ? result.riskScore : null,
          categories: extractCategories(result),
        };

        // Safe prompts get an "All clear" confirmation that auto-sends
        // after a short window; never a silent skip.
        if (result.level === "safe") {
          renderClearConfirmation(panel, result, inputEl);
          isIntercepting = false;
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

    document.querySelectorAll("[data-eraseai-hooked='true']").forEach((el) => {
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
