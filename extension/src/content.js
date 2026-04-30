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
      // Composer scope used by the file-attachment cache to ignore
      // file inputs and drops that happen anywhere else on the page
      // (avatar pickers, profile uploads, etc.). Wide enough to cover
      // the prompt textarea, the toolbar with the paperclip, and the
      // attachment chip row that ChatGPT renders above the textarea.
      composerSelectors: [
        'form:has(#prompt-textarea)',
        'form:has(textarea[data-id])',
        'main form',
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
      composerSelectors: [
        'fieldset',
        'form:has(div[contenteditable="true"].ProseMirror)',
        'main',
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
      composerSelectors: [
        '.input-area-container',
        '.input-area',
        'rich-textarea',
        'main',
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

  // Hard ceiling on how long to wait for the background ANALYZE response.
  // MV3 service workers can be suspended mid-fetch and never call back;
  // this timer guarantees the overlay reaches a terminal state.
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

  // ---- File-attachment cache -------------------------------------------
  //
  // The firewall must scan the contents of files the user attached to the
  // chat composer (CSV, PDF, etc.) before they leave the browser. Sites
  // mount the attached file in their own UI long before the user clicks
  // Send, so we shadow-track every file the user attaches to the composer
  // (via paperclip-button file pickers, drag-drop into the composer, or
  // paste of a file from the clipboard) and pull the cache when Send fires.
  //
  // Rules:
  //   * Only files attached *inside the composer scope* (per-platform
  //     selectors) are cached — keeps avatar/profile uploads out.
  //   * Files are de-duplicated by name+size+lastModified so a paperclip
  //     change re-firing for the same file doesn't double-scan.
  //   * Cache is cleared after a successful send AND on URL change.
  //   * 15 MB combined ceiling — see #142 task plan; oversize files are
  //     still recorded so the panel can surface them with an explicit
  //     "review manually" warning, but their text is not extracted.
  const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;
  // Hard ceilings on file fanout so a hostile/buggy page can't pin the tab
  // by attaching thousands of files. Anything beyond MAX_ATTACHED_FILES is
  // recorded as skipped without being read; FileReader concurrency is also
  // bounded so we never have more than EXTRACT_CONCURRENCY readers running
  // at once. Both numbers are deliberately generous for real users.
  const MAX_ATTACHED_FILES = 16;
  const EXTRACT_CONCURRENCY = 4;
  // Bounded fan-out for analyze ports. With attachments enabled, a single
  // send can decompose into many short pieces (one port per chunk). The
  // api-server's per-key burst limit is 60 req/min, so firing 100+ ports
  // in parallel would trip rate limiting and surface as confusing
  // "service unavailable" errors mid-scan. ANALYZE_CONCURRENCY caps how
  // many analyze ports may be in flight at once; the rest queue up and
  // start as earlier ones settle.
  const ANALYZE_CONCURRENCY = 4;
  const fileCache = new Map(); // key -> File
  let fileCacheUrl = typeof window !== "undefined" ? window.location.href : "";
  // Maximum text length we send to /api/dev/analyze in a single call.
  // Anything bigger is sliced into ~PIECE_CHUNK_SIZE chunks per piece.
  const ANALYZE_MAX_CHARS = 10000;
  const PIECE_CHUNK_SIZE = 8000;
  // Worst-level beats best-level when aggregating multi-piece results.
  const LEVEL_RANK = { safe: 0, caution: 1, danger: 2 };

  function fileCacheKey(file) {
    if (!file || typeof file.name !== "string") return null;
    return [
      file.name,
      typeof file.size === "number" ? file.size : -1,
      typeof file.lastModified === "number" ? file.lastModified : 0,
    ].join("\u0000");
  }

  function maybeResetCacheForUrl() {
    if (typeof window === "undefined") return;
    if (window.location.href !== fileCacheUrl) {
      fileCache.clear();
      fileCacheUrl = window.location.href;
    }
  }

  function clearFileCache() {
    fileCache.clear();
  }

  function getCachedFiles() {
    maybeResetCacheForUrl();
    return Array.from(fileCache.values());
  }

  function targetIsInComposer(target) {
    if (!platform || !platform.composerSelectors || !target) return false;
    if (typeof target.closest !== "function") return false;
    for (const sel of platform.composerSelectors) {
      try {
        const match = target.closest(sel);
        if (match) return true;
      } catch {
        // :has() on older browsers / jsdom may throw on parse — treat
        // as a non-match and try the next selector.
      }
    }
    return false;
  }

  function addFilesFromList(list) {
    if (!list || typeof list.length !== "number") return;
    // Reset BEFORE adding so a SPA navigation followed by an attachment
    // doesn't drop the new file. Without this, getCachedFiles() would
    // notice the URL change at send-time and clear the (just-added)
    // file out of the cache, bypassing the entire scan pipeline.
    maybeResetCacheForUrl();
    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      if (!file || typeof file.name !== "string") continue;
      const key = fileCacheKey(file);
      if (!key) continue;
      fileCache.set(key, file);
    }
  }

  function handleFileInputChange(e) {
    const target = e && e.target ? e.target : null;
    if (!target || target.tagName !== "INPUT" || target.type !== "file") return;
    if (!targetIsInComposer(target)) return;
    addFilesFromList(target.files);
  }

  function handleComposerDrop(e) {
    if (!e || !e.dataTransfer) return;
    if (!targetIsInComposer(e.target)) return;
    const files = e.dataTransfer.files;
    if (files && files.length) addFilesFromList(files);
  }

  function handleComposerPaste(e) {
    if (!e || !e.clipboardData) return;
    if (!targetIsInComposer(e.target)) return;
    const files = e.clipboardData.files;
    if (files && files.length) addFilesFromList(files);
  }
  // ---- end file-attachment cache --------------------------------------

  // ---- Multi-piece analyze pipeline -----------------------------------
  //
  // A "piece" is one self-contained chunk of text we send to the analyze
  // endpoint, tagged with a source so the result panel can name what
  // tripped which rule. Today's pieces are the prompt itself and one
  // entry per attached file (chunked for files larger than the 10 KB
  // analyze cap). Each piece is sent over its own short-lived port; the
  // worst result determines the panel level.
  function chunkText(text, chunkSize) {
    if (!text || text.length <= chunkSize) return [text || ""];
    const out = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      out.push(text.slice(i, i + chunkSize));
    }
    return out;
  }

  function buildPieces(promptText, extractedFiles) {
    const pieces = [];
    if (promptText && promptText.trim().length >= 3) {
      // Prompts under the analyze cap stay as a single piece — the most
      // common case by far.
      const slices = chunkText(promptText, ANALYZE_MAX_CHARS);
      slices.forEach((s, i) => {
        pieces.push({
          source: "prompt",
          label: "Prompt text",
          chunkIndex: slices.length > 1 ? i : null,
          chunkCount: slices.length,
          text: s,
        });
      });
    }
    for (const f of extractedFiles) {
      if (f.skipReason || !f.text) continue;
      // Even though file-extractor.js caps the extracted text at 50 KB,
      // we still chunk on the analyzer's per-request limit. A 50 KB CSV
      // becomes ~7 chunks; the per-key 60 req/min burst limit absorbs
      // this even with several files attached at once.
      const slices = chunkText(f.text, PIECE_CHUNK_SIZE);
      slices.forEach((s, i) => {
        pieces.push({
          source: `file:${f.name}`,
          label: f.name,
          fileName: f.name,
          chunkIndex: slices.length > 1 ? i : null,
          chunkCount: slices.length,
          text: s,
        });
      });
    }
    return pieces;
  }

  function analyzePieceViaPort(piece, attemptId) {
    return new Promise((resolve) => {
      let port;
      let resolved = false;
      // `__transportFailureReason` is an internal hint to runMultiPieceAnalyze:
      // when present, the failure came from the port plumbing itself
      // (worker died, connect threw, disconnected before delivering a
      // result) rather than from the analyze HTTP call. Those failures
      // need to be reflected in chrome.storage.local.lastAttempt so the
      // popup's "Last attempt" line stays accurate even when the
      // background never got a chance to call recordLastAttempt itself.
      const settle = (result) => {
        if (resolved) return;
        resolved = true;
        resolve({ piece, result: result || { error: "No response" } });
      };
      try {
        port = chrome.runtime.connect({ name: "analyze" });
      } catch {
        settle({
          error: "Failed to connect to EraseAI service.",
          __transportFailureReason: "Could not open analyze port (extension context invalidated?)",
        });
        return;
      }
      if (!port) {
        settle({
          error: "Failed to connect to EraseAI service.",
          __transportFailureReason: "chrome.runtime.connect returned no port",
        });
        return;
      }
      port.onMessage.addListener((msg) => {
        if (!msg || msg.type !== "ANALYZE_RESULT") return;
        settle(msg.result);
      });
      port.onDisconnect.addListener(() => {
        if (!resolved) settle({
          error: "Failed to connect to EraseAI service.",
          __transportFailureReason: "Background disconnected the analyze port before delivering a result",
        });
      });
      try {
        port.postMessage({ type: "ANALYZE", text: piece.text, attemptId });
      } catch {
        settle({
          error: "Failed to connect to EraseAI service.",
          __transportFailureReason: "Could not post ANALYZE message over the port",
        });
      }
    });
  }

  // Aggregate per-piece results into one render-ready model. Returns the
  // worst level seen, the union of categories, and a per-piece summary
  // the panel uses to draw one row per piece. If any piece returned a
  // bypass (firewall disabled mid-flight), that wins — the user wanted
  // the prompt to go through.
  function aggregatePieceResults(pieceResults, extractedFiles) {
    let worstLevel = "safe";
    let worstScore = 100;
    let worstResult = null;
    let firstError = null;
    let bypass = false;
    const allCategories = new Set();
    const perPiece = [];

    for (const { piece, result } of pieceResults) {
      if (result && result.bypass) bypass = true;
      if (result && result.error && !firstError) {
        firstError = {
          error: result.error,
          code: result.code,
          piece,
          transportFailureReason: result.__transportFailureReason || null,
        };
        perPiece.push({
          source: piece.source,
          label: piece.label,
          chunkIndex: piece.chunkIndex,
          level: "error",
          riskScore: null,
          issueCount: 0,
          summary: String(result.error),
        });
        continue;
      }
      const level = typeof result.level === "string" ? result.level : "safe";
      const rank = LEVEL_RANK[level] != null ? LEVEL_RANK[level] : 0;
      if (rank > LEVEL_RANK[worstLevel]) {
        worstLevel = level;
        worstScore = typeof result.riskScore === "number" ? result.riskScore : worstScore;
        worstResult = result;
      } else if (rank === LEVEL_RANK[worstLevel] && typeof result.riskScore === "number") {
        if (result.riskScore < worstScore) {
          worstScore = result.riskScore;
          worstResult = result;
        }
      }
      const categories = extractCategories(result);
      for (const c of categories) allCategories.add(c);
      perPiece.push({
        source: piece.source,
        label: piece.label,
        chunkIndex: piece.chunkIndex,
        level,
        riskScore: typeof result.riskScore === "number" ? result.riskScore : null,
        issueCount: Array.isArray(result.issues) ? result.issues.length : 0,
        summary: typeof result.summary === "string" ? result.summary : "",
        issues: Array.isArray(result.issues) ? result.issues.slice(0, 8) : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 8) : [],
      });
    }

    // Add rows for files that were detected but skipped (PDF, oversize,
    // image, archive, etc.) so the user sees them in the panel and is
    // forced to make an explicit Send Anyway / Cancel decision.
    for (const f of extractedFiles) {
      if (!f.skipReason) continue;
      perPiece.push({
        source: `file:${f.name}`,
        label: f.name,
        chunkIndex: null,
        level: "skipped",
        riskScore: null,
        issueCount: 0,
        summary: f.skipReason,
        skipReason: f.skipReason,
      });
      // A skipped file is treated as a blocker — the user must opt in
      // before sending. Bump the aggregate level to caution unless we
      // already have danger.
      if (worstLevel === "safe") worstLevel = "caution";
    }

    // Surface partial-scan files: a file whose extracted text was
    // truncated at the 50 KB cap could hide sensitive content past that
    // boundary. Tag the file's analyzed pieces with `partialNotice` so
    // the panel renders a "only first 50 KB scanned" warning, and bump
    // the worst level to caution if everything else looked safe — the
    // user must make an explicit Send Anyway decision in that case.
    const truncatedNames = new Set(
      (extractedFiles || []).filter((f) => f.truncated && !f.skipReason).map((f) => f.name),
    );
    if (truncatedNames.size) {
      for (const row of perPiece) {
        if (typeof row.source === "string" && row.source.startsWith("file:")) {
          const name = row.source.slice("file:".length);
          if (truncatedNames.has(name)) {
            row.partialNotice =
              "only the first 50 KB was scanned — review the rest manually";
          }
        }
      }
      if (worstLevel === "safe") worstLevel = "caution";
    }

    return {
      level: worstLevel,
      riskScore: worstResult ? worstScore : 100,
      bypass,
      firstError,
      categories: Array.from(allCategories),
      perPiece,
      worstResult,
    };
  }
  // ---- end multi-piece analyze pipeline -------------------------------

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
    // Build a content-free summary of the pieces we scanned. We deliberately
    // do not include any actual prompt or file text in the outcome event —
    // only counts and per-piece levels — so the firewall_outcomes table
    // never holds user data.
    let piecesSummary = null;
    if (lastAggregated && Array.isArray(lastAggregated.perPiece) && lastAggregated.perPiece.length > 0) {
      const counts = { prompt: 0, file: 0 };
      const levels = {};
      let skippedFiles = 0;
      for (const p of lastAggregated.perPiece) {
        if (p.source === "prompt") counts.prompt += 1;
        else counts.file += 1;
        const lv = p.level || "info";
        levels[lv] = (levels[lv] || 0) + 1;
        if (p.skipReason) skippedFiles += 1;
      }
      piecesSummary = {
        promptPieces: counts.prompt,
        filePieces: counts.file,
        skippedFiles,
        levels,
      };
    }
    try {
      chrome.runtime.sendMessage(
        {
          type: "OUTCOME",
          outcome: {
            level: lastAnalysis.level,
            action,
            riskScore: typeof lastAnalysis.riskScore === "number" ? lastAnalysis.riskScore : null,
            categories: lastAnalysis.categories || [],
            ...(piecesSummary ? { pieces: piecesSummary } : {}),
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
      // best-effort
    }
  }

  function newAttemptId() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch {
      // fall through
    }
    return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function showOpenPopupFallback(panel) {
    // Inline recovery hint shown on the error panel itself when we cannot
    // programmatically open the popup. Also copies the popup URL to the
    // clipboard so the user can paste it into a new tab.
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

    if (url && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  function openExtensionPopup(panel) {
    let messageReturned = false;
    try {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" }, (response) => {
        messageReturned = true;
        if (chrome.runtime.lastError || !response || response.ok === false) {
          showOpenPopupFallback(panel);
        }
      });
    } catch {
      messageReturned = true;
      showOpenPopupFallback(panel);
      return;
    }
    // Grace window for the case where sendMessage's callback never fires
    // (e.g. service worker port closed immediately).
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

  function renderPiecesBlock(perPiece) {
    if (!Array.isArray(perPiece) || perPiece.length === 0) return "";
    // Show the per-piece block whenever there are multiple rows OR even a
    // single row that comes from a file — single-file scenarios still need
    // the file name + truncation notice surfaced. We hide it only for the
    // pure prompt-only case where the score ring at the top already says
    // everything there is to say.
    const hasFileRow = perPiece.some(
      (p) => typeof p.source === "string" && p.source.startsWith("file:"),
    );
    if (perPiece.length <= 1 && !hasFileRow) return "";
    const rows = perPiece.map((p) => {
      const levelClass = `eraseai-piece-${p.level || "info"}`;
      const labelText = p.label || p.source || "piece";
      let detail = "";
      if (p.skipReason) {
        detail = `<span class="eraseai-piece-detail">${escapeHtml(p.skipReason)}</span>`;
      } else if (p.level === "error") {
        detail = `<span class="eraseai-piece-detail">${escapeHtml(p.summary || "scan failed")}</span>`;
      } else {
        const issueText = p.issueCount === 1 ? "1 issue" : `${p.issueCount || 0} issues`;
        const score = typeof p.riskScore === "number" ? ` &middot; score ${p.riskScore}` : "";
        detail = `<span class="eraseai-piece-detail">${issueText}${score}</span>`;
      }
      const partial = p.partialNotice
        ? `<span class="eraseai-piece-partial">${escapeHtml(p.partialNotice)}</span>`
        : "";
      const badge = (p.level || "info").toUpperCase();
      const chunkSuffix = p.chunkIndex != null ? ` <span class="eraseai-piece-chunk">part ${p.chunkIndex + 1}</span>` : "";
      return `
        <div class="eraseai-piece-row ${levelClass}">
          <span class="eraseai-piece-badge">${escapeHtml(badge)}</span>
          <span class="eraseai-piece-label">${escapeHtml(labelText)}${chunkSuffix}</span>
          ${detail}
          ${partial}
        </div>`;
    }).join("");
    return `<div class="eraseai-pieces"><h4>What we scanned (${perPiece.length})</h4>${rows}</div>`;
  }

  function renderResults(panel, result, inputEl) {
    const { riskScore, level, issues, suggestions, summary, perPiece } = result;
    const color = getScoreColor(riskScore);
    const circumference = 2 * Math.PI * 26;
    const dashOffset = circumference * (1 - riskScore / 100);

    const piecesHtml = renderPiecesBlock(perPiece);

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
    // Sanitize is a text-only operation — it rewrites the prompt textarea
    // and does NOT touch attached file chips. Two distinct cases:
    //
    //   * `showSanitize`  — show the button at all. We only show it when
    //     the prompt itself has a problem to sanitize. When the panel
    //     only fired because of attached files, sanitizing the prompt
    //     would be misleading and is hidden entirely.
    //
    //   * `hasFileBlocker` — at least one attached file is caution/danger
    //     /skipped/truncated. In that case the sanitize button is
    //     "Sanitize Prompt" (terminal — does NOT morph into "Send
    //     Sanitized") and the user must still deal with the file via
    //     Cancel or Send Anyway. This prevents the UX bug where one
    //     "Sanitize & Send" click would ship a known-risk file because
    //     the sanitizer can only redact the prompt textarea.
    // Sanitize only makes sense when at least one prompt piece is itself
    // caution/danger. We use .some() (not .find()) so a long chunked
    // prompt where chunk 0 looks safe but chunk 3 is risky still offers
    // sanitize. If there's NO prompt row at all (empty prompt + just
    // attachments) we hide sanitize — the user attached files, there's
    // nothing in the prompt to rewrite.
    // Pre-perPiece (no perPiece array) keeps legacy "show sanitize"
    // behavior so older single-piece flows don't change.
    const promptIsProblem = !Array.isArray(perPiece)
      ? true
      : perPiece.some((p) => p.source === "prompt"
        && LEVEL_RANK[p.level || "safe"] >= LEVEL_RANK.caution);
    // A file row is a blocker if EITHER:
    //   * its level is caution/danger (analyzed risky content), OR
    //   * it was skipped entirely (PDF/DOCX/oversize/unsupported — level
    //     "skipped" is not in LEVEL_RANK), OR
    //   * it carries a partialNotice (>50 KB truncated — the file's tail
    //     was never scanned).
    // Any of these means the file the firewall did NOT clear is still in
    // the composer, so a sanitize-prompt action must not promise to send.
    const hasFileBlocker = Array.isArray(perPiece)
      && perPiece.some((p) => typeof p.source === "string"
        && p.source.startsWith("file:")
        && (
          LEVEL_RANK[p.level || "safe"] >= LEVEL_RANK.caution
          || p.skipReason
          || p.partialNotice
        ));
    const showSanitize = promptIsProblem;
    const sanitizeLabel = hasFileBlocker
      ? "Sanitize Prompt" : "Sanitize &amp; Send";

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
      ${piecesHtml}
      ${issuesHtml}
      ${suggestionsHtml}
      <div class="eraseai-actions">
        <button class="eraseai-btn eraseai-btn-cancel" id="eraseai-cancel">Cancel</button>
        ${showSanitize ? `<button class="eraseai-btn eraseai-btn-sanitize" id="eraseai-sanitize" data-file-blocker="${hasFileBlocker ? "true" : "false"}">${sanitizeLabel}</button>` : ""}
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
      // Clear cached files now so the next prompt starts fresh — even if
      // the host page hasn't yet visibly removed the attachment chips.
      clearFileCache();
      triggerSend();
    });

    const sanitizeBtn = panel.querySelector("#eraseai-sanitize");
    if (sanitizeBtn) sanitizeBtn.addEventListener("click", () => {
      const btn = panel.querySelector("#eraseai-sanitize");
      btn.disabled = true;
      btn.textContent = "Sanitizing...";

      const originalText = platform.getInputText(inputEl);

      // Long-lived port transport, mirroring the ANALYZE flow (task #124).
      // chrome.runtime.sendMessage lets the MV3 service worker be
      // suspended mid-fetch, which leaves this button stuck on
      // "Sanitizing..." with no callback. The port keeps the worker
      // alive for the duration of the sanitize fetch; the background
      // posts back a single { type: "SANITIZE_RESULT", result } message
      // and disconnects.
      let sanitizeResponded = false;

      const finalizeSanitizeResult = (response) => {
        if (sanitizeResponded) return;
        sanitizeResponded = true;

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
        // If a file is also a blocker, do NOT morph Send Anyway into
        // "Send Sanitized" — the file the firewall flagged is still in
        // the composer, so a single click would exfiltrate it. Surface
        // a notice instead and leave the user with Cancel / Send Anyway
        // (still labelled as "Send Anyway (Risky)" / "Send Anyway").
        if (btn.dataset.fileBlocker === "true") {
          const actionsDiv = panel.querySelector(".eraseai-actions");
          if (actionsDiv && !panel.querySelector("#eraseai-sanitize-file-notice")) {
            actionsDiv.insertAdjacentHTML("beforebegin", `
              <div class="eraseai-issues" id="eraseai-sanitize-file-notice">
                <h4>Prompt sanitized — attached file still flagged</h4>
                <div class="eraseai-issue-item">
                  <span class="eraseai-issue-badge eraseai-badge-medium">action needed</span>
                  <span>Remove the attached file from the composer before sending. Sanitize only rewrites the prompt text.</span>
                </div>
              </div>
            `);
          }
        } else if (sendBtn) {
          sendBtn.textContent = "Send Sanitized";
          sendBtn.className = "eraseai-btn eraseai-btn-sanitize";
        }
      };

      const finalizeSanitizeFailure = () => {
        if (sanitizeResponded) return;
        sanitizeResponded = true;
        btn.textContent = "Failed";
        btn.disabled = false;
      };

      let sanitizePort = null;
      try {
        sanitizePort = chrome.runtime.connect({ name: "sanitize" });
      } catch {
        finalizeSanitizeFailure();
        return;
      }
      if (!sanitizePort) {
        finalizeSanitizeFailure();
        return;
      }

      sanitizePort.onMessage.addListener((msg) => {
        if (!msg || msg.type !== "SANITIZE_RESULT") return;
        finalizeSanitizeResult(msg.result);
      });

      sanitizePort.onDisconnect.addListener(() => {
        // Normal teardown after the background posted a result is fine.
        // Otherwise something killed the port before delivering — flip
        // the button to a terminal Failed state so the user isn't stuck
        // on a "Sanitizing..." spinner forever.
        if (sanitizeResponded) return;
        finalizeSanitizeFailure();
      });

      try {
        sanitizePort.postMessage({ type: "SANITIZE", text: originalText });
      } catch {
        finalizeSanitizeFailure();
      }
    });
  }

  function renderClearConfirmation(panel, result, inputEl, perPiece) {
    const { riskScore, summary } = result;
    const score = typeof riskScore === "number" ? riskScore : 100;
    const headline = (summary && String(summary).trim()) ||
      "No issues detected. Your prompt looks safe.";
    // Render the per-piece block on the all-clear card too so users still
    // see which files were scanned (and that they came back clean).
    const piecesHtml = renderPiecesBlock(perPiece);

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
          <p>${escapeHtml(headline)}</p>
          <p id="eraseai-clear-countdown" style="margin-top:6px;font-size:12px;color:#71717a;">Sending automatically in a moment\u2026</p>
        </div>
      </div>
      ${piecesHtml}
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
      clearFileCache();
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
      clearFileCache();
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

  // Cache of the most recent aggregated render model so terminal action
  // handlers (Cancel / Send Anyway) can re-derive the displayed perPiece
  // rows when reporting the outcome telemetry.
  let lastAggregated = null;

  // Run the full multi-piece analyze flow. Pulled out of interceptSubmission
  // so the prompt-only path and the prompt-plus-attachments path share a
  // single implementation: a list of pieces is built, each is sent over its
  // own short-lived port, and the worst level wins. With no attachments the
  // pieces array is just [prompt] so behaviour is identical to the previous
  // single-port flow (and the existing test suite passes unchanged).
  async function runMultiPieceAnalyze({ promptText, files, panel, inputEl, attemptId }) {
    let analyzeResponded = false;

    const finishWithError = (errorMsg, persistReason) => {
      if (analyzeResponded) return;
      analyzeResponded = true;
      if (analyzeTimer != null) {
        clearTimeout(analyzeTimer);
        analyzeTimer = null;
      }
      if (persistReason) {
        persistLastAttempt({
          status: "error",
          reason: persistReason,
          at: Date.now(),
          attemptId,
        });
      }
      renderError(panel, errorMsg, { kind: "network", showOpenPopup: true });
      isIntercepting = false;
    };

    analyzeTimer = setTimeout(() => {
      if (analyzeResponded) return;
      analyzeResponded = true;
      analyzeTimer = null;
      persistLastAttempt({
        status: "timeout",
        reason: `No response from background within ${Math.round(ANALYZE_TIMEOUT_MS / 1000)}s`,
        at: Date.now(),
        attemptId,
      });
      renderError(
        panel,
        "Couldn't reach the EraseAI service in time. Check your API key and connection in the extension popup.",
        { kind: "timeout", showOpenPopup: true },
      );
      isIntercepting = false;
    }, ANALYZE_TIMEOUT_MS);

    // Pre-extract attached files (best-effort; extractor errors come back as
    // skipReason rows so the user always sees something for every file).
    //
    // Safety pass first — decide who is in/out BEFORE we open any FileReader,
    // otherwise a page that attaches 1000 files (or 50×3MB files) would
    // happily kick off thousands of concurrent reads and pin the tab. We
    // skip in two passes:
    //   * any file beyond MAX_ATTACHED_FILES (preserve the user's order so
    //     the first N are scanned).
    //   * any file whose cumulative size pushes total bytes above
    //     MAX_TOTAL_ATTACHMENT_BYTES, walking smallest→largest so a single
    //     huge file doesn't starve out a batch of small ones.
    const extractor = globalThis.__eraseAIExtractor;
    let extractedFiles = [];
    if (files && files.length) {
      const planned = files.map((f) => ({
        file: f,
        name: (f && f.name) || "(unnamed)",
        mimeType: (f && f.type) || "",
        sizeBytes: (f && f.size) || 0,
        skipReason: null,
      }));

      // Pass 1: file-count ceiling.
      for (let i = MAX_ATTACHED_FILES; i < planned.length; i += 1) {
        planned[i].skipReason =
          `skipped — only the first ${MAX_ATTACHED_FILES} attachments are scanned per send, review manually`;
      }

      // Pass 2: combined-bytes ceiling among the still-unskipped files.
      const eligible = planned.filter((p) => !p.skipReason);
      const sorted = [...eligible].sort((a, b) => a.sizeBytes - b.sizeBytes);
      let running = 0;
      for (const p of sorted) {
        if (running + p.sizeBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
          p.skipReason =
            "skipped — combined attachment size exceeds 15 MB cap, review manually";
        } else {
          running += p.sizeBytes;
        }
      }

      // Bounded-concurrency extraction. Each entry in `planned` either
      // already has a skipReason (no read) or gets handed to the extractor
      // through a small worker pool.
      const results = new Array(planned.length);
      const canExtract = extractor && typeof extractor.extractText === "function";
      let cursor = 0;
      async function worker() {
        while (cursor < planned.length) {
          const idx = cursor;
          cursor += 1;
          const p = planned[idx];
          if (p.skipReason || !canExtract) {
            results[idx] = {
              name: p.name,
              mimeType: p.mimeType,
              sizeBytes: p.sizeBytes,
              text: "",
              truncated: false,
              skipReason: p.skipReason || "extractor unavailable — review manually",
            };
            continue;
          }
          try {
            results[idx] = await extractor.extractText(p.file);
          } catch {
            // A truly thrown extractor error (extractText is supposed to
            // resolve, never reject) — surface as a skipped row so the
            // user sees the file in the panel.
            results[idx] = {
              name: p.name,
              mimeType: p.mimeType,
              sizeBytes: p.sizeBytes,
              text: "",
              truncated: false,
              skipReason: "extractor crashed — review manually",
            };
          }
        }
      }
      const workerCount = Math.min(EXTRACT_CONCURRENCY, planned.length) || 1;
      const workers = [];
      for (let i = 0; i < workerCount; i += 1) workers.push(worker());
      await Promise.all(workers);
      extractedFiles = results;
    }

    const pieces = buildPieces(promptText, extractedFiles);

    // Pathological case: no analyzable pieces at all (empty prompt + only
    // skipped files). Treat as a forced-block warning panel so the user
    // sees the "review manually" rows and explicitly chooses what to do.
    if (pieces.length === 0) {
      if (analyzeTimer != null) {
        clearTimeout(analyzeTimer);
        analyzeTimer = null;
      }
      analyzeResponded = true;
      const aggregated = aggregatePieceResults([], extractedFiles);
      // No analyzed pieces means level was bumped to "caution" only by
      // the presence of skip rows. Make that explicit for the panel.
      if (aggregated.level === "safe") aggregated.level = "caution";
      lastAnalysis = {
        level: aggregated.level,
        riskScore: aggregated.riskScore,
        categories: aggregated.categories,
      };
      lastAggregated = aggregated;
      renderResults(panel, buildRenderModel(aggregated), inputEl);
      isIntercepting = false;
      return;
    }

    let pieceResults;
    try {
      // Bounded fan-out: never more than ANALYZE_CONCURRENCY analyze
      // ports in flight at once. A small worker pool walks the `pieces`
      // array via a shared cursor and writes each result back at the
      // same index, preserving order so aggregatePieceResults still
      // sees pieces in the order buildPieces produced them. This keeps
      // a 50-chunk send well under the api-server's per-key burst
      // ceiling instead of opening 50 ports simultaneously.
      pieceResults = new Array(pieces.length);
      let pieceCursor = 0;
      const analyzeWorker = async () => {
        while (pieceCursor < pieces.length) {
          const idx = pieceCursor;
          pieceCursor += 1;
          // analyzePieceViaPort is hand-built to always resolve (never
          // reject), so an awaited call here can't escape the worker
          // and crash the Promise.all below — port-level transport
          // failures come back as { error, __transportFailureReason }.
          // eslint-disable-next-line no-await-in-loop
          pieceResults[idx] = await analyzePieceViaPort(pieces[idx], attemptId);
        }
      };
      const analyzeWorkerCount = Math.min(ANALYZE_CONCURRENCY, pieces.length) || 1;
      const analyzeWorkers = [];
      for (let i = 0; i < analyzeWorkerCount; i += 1) analyzeWorkers.push(analyzeWorker());
      await Promise.all(analyzeWorkers);
    } catch {
      finishWithError(
        "Failed to connect to EraseAI service.",
        "Multi-piece analyze rejected unexpectedly",
      );
      return;
    }

    if (analyzeResponded) return; // timed out / cancelled mid-flight
    analyzeResponded = true;
    if (analyzeTimer != null) {
      clearTimeout(analyzeTimer);
      analyzeTimer = null;
    }

    const aggregated = aggregatePieceResults(pieceResults, extractedFiles);

    if (aggregated.bypass) {
      removeOverlay();
      bypassNext = true;
      isIntercepting = false;
      clearFileCache();
      triggerSend();
      return;
    }

    if (aggregated.firstError) {
      const err = aggregated.firstError.error;
      const code = aggregated.firstError.code;
      const transportReason = aggregated.firstError.transportFailureReason;
      // Transport-level failures (port plumbing died before any HTTP
      // call) need to be reflected in chrome.storage.local.lastAttempt
      // so the popup's "Last attempt" line stays accurate even when
      // the background never got a chance to call recordLastAttempt
      // itself. Mirrors the persistLastAttempt() block that lived in
      // the old single-port interceptSubmission.
      if (transportReason) {
        persistLastAttempt({
          status: "error",
          reason: transportReason,
          at: Date.now(),
          attemptId,
        });
      }
      const isAuth =
        /api key|unauthor|invalid|revoked|expired/i.test(String(err)) ||
        (typeof code === "string" && code.startsWith("AUTH_"));
      renderError(panel, err, {
        kind: transportReason ? "network" : (isAuth ? "auth" : "server"),
        showOpenPopup: true,
      });
      isIntercepting = false;
      return;
    }

    lastAnalysis = {
      level: aggregated.level,
      riskScore: aggregated.riskScore,
      categories: aggregated.categories,
    };
    lastAggregated = aggregated;

    // Auto-send fires whenever EVERY scanned piece — prompt and each
    // attached file — comes back safe. Skipped files (PDF/DOCX/oversize)
    // and truncated extracts are already bumped off "safe" inside
    // aggregatePieceResults, so a green aggregated.level means there is
    // nothing in the composer the firewall couldn't fully clear.
    if (aggregated.level === "safe") {
      renderClearConfirmation(
        panel,
        aggregated.worstResult || { riskScore: 100, summary: "All clear" },
        inputEl,
        aggregated.perPiece,
      );
      isIntercepting = false;
      return;
    }

    renderResults(panel, buildRenderModel(aggregated), inputEl);
    isIntercepting = false;
  }

  function buildRenderModel(aggregated) {
    // Rebuild a server-result-shaped object from the worst piece so the
    // existing renderResults DOM (score ring, issues block, suggestions
    // block) keeps working. Attach the aggregated.perPiece array as a
    // sibling field; renderResults uses it to draw the per-file table.
    const worst = aggregated.worstResult || {};
    return {
      riskScore: typeof aggregated.riskScore === "number" ? aggregated.riskScore : 100,
      level: aggregated.level,
      issues: Array.isArray(worst.issues) ? worst.issues : [],
      suggestions: Array.isArray(worst.suggestions) ? worst.suggestions : [],
      summary: typeof worst.summary === "string" && worst.summary
        ? worst.summary
        : (aggregated.level === "safe" ? "All clear" : "Issues detected in prompt or attachments"),
      perPiece: aggregated.perPiece,
    };
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
    const cachedFiles = getCachedFiles();

    // Allow submission to proceed when there's truly nothing to scan —
    // empty prompt with no attachments. If there ARE attached files we
    // intercept even with an empty prompt so the firewall can read them
    // (this is the demo failure mode we're fixing in #142).
    if ((!text || text.length < 3) && cachedFiles.length === 0) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    isIntercepting = true;
    // Reset the per-submission outcome state so each new prompt produces at
    // most one outcome event tied to its own analysis result.
    lastAnalysis = null;
    outcomeReported = false;
    lastAggregated = null;

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
      const attemptId = newAttemptId();

      runMultiPieceAnalyze({
        promptText: text,
        files: cachedFiles,
        panel,
        inputEl,
        attemptId,
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
    // File-attachment capture: composer-scoped paperclip clicks fire a
    // change event on a hidden <input type="file">; drag-drop and pasted
    // files surface via drop and paste on the composer container. Use
    // capture-phase listeners on document so we see the event regardless
    // of which descendant of the composer it actually targeted.
    document.addEventListener("change", handleFileInputChange, true);
    document.addEventListener("drop", handleComposerDrop, true);
    document.addEventListener("paste", handleComposerPaste, true);

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
    document.removeEventListener("change", handleFileInputChange, true);
    document.removeEventListener("drop", handleComposerDrop, true);
    document.removeEventListener("paste", handleComposerPaste, true);

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    document.querySelectorAll("[data-eraseai-hooked='true']").forEach((el) => {
      el.removeEventListener("click", interceptSubmission, true);
      delete el.dataset.eraseaiHooked;
    });
    clearFileCache();
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
