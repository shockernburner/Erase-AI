package com.eraseai.firewall.guard

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import com.eraseai.firewall.MainActivity
import com.eraseai.firewall.data.ApiClient
import com.eraseai.firewall.data.ApiError
import com.eraseai.firewall.data.MobileSessionStore
import com.eraseai.firewall.data.PieceScanSummary
import com.eraseai.firewall.data.ProtectedAppsStore
import com.eraseai.firewall.data.ScanApi
import com.eraseai.firewall.data.ScanFinding
import com.eraseai.firewall.data.ScanPiece
import com.eraseai.firewall.data.ScanResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.security.MessageDigest

class AiGuardAccessibilityService : AccessibilityService() {
  private lateinit var protectedAppsStore: ProtectedAppsStore
  private lateinit var scanApi: ScanApi
  private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private val handler = Handler(Looper.getMainLooper())
  private var previewRunnable: Runnable? = null
  private val lastTextHashByPackage = mutableMapOf<String, String>()
  private val lastScanAtByPackage = mutableMapOf<String, Long>()
  private var activeNode: AccessibilityNodeInfo? = null
  private var pendingSendNode: AccessibilityNodeInfo? = null
  private var overlayView: View? = null
  private var overlayText: String? = null
  private var overlayPackageName: String? = null
  private var overlayResult: ScanResult? = null
  private var overlayPieces: List<PieceScanSummary> = emptyList()
  private var gateInProgress = false
  private var sessionPromptShown = false
  private var safeAutoSendRunnable: Runnable? = null

  private val curtain by lazy { SendCurtain(this) }
  private var curtainPackage: String? = null

  /** Risky text found while typing, awaiting a user decision. */
  private data class PendingRisk(val text: String, val scan: LocalRiskScanner.LocalScan)

  private var pendingRisk: PendingRisk? = null

  /** High-risk text pulled out of the host composer so a send cannot transmit it. */
  private var heldText: String? = null

  /** Text the user explicitly approved for sending; re-gating it would trap them in a loop. */
  private var decidedText: String? = null

  /**
   * Set when the user cancels. The draft is handed back so they can edit it, and EraseAI stops
   * yanking it out of the composer — but the curtain stays armed, so cancelling is never a way
   * to get an unguarded send.
   */
  private var holdSuspended = false

  override fun onServiceConnected() {
    super.onServiceConnected()
    serviceInfo = serviceInfo.apply {
      eventTypes = AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
        AccessibilityEvent.TYPE_VIEW_FOCUSED or
        AccessibilityEvent.TYPE_VIEW_CLICKED or
        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
        AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
      flags = flags or
        AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS or
        AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
        AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
      notificationTimeout = 250
    }
  }

  override fun onCreate() {
    super.onCreate()
    val sessionStore = MobileSessionStore(this)
    protectedAppsStore = ProtectedAppsStore(this)
    scanApi = ScanApi(ApiClient(sessionStore))
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    val packageName = event?.packageName?.toString() ?: return
    if (shouldSkipSystemSurface(packageName)) return
    if (!protectedAppsStore.isProtected(packageName)) return
    if (!protectedAppsStore.isFirewallEnabled()) return

    when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_CLICKED -> {
        // Telemetry only. This event is delivered after the host app already submitted, so it
        // can never block a send — the curtain does that.
        val source = event.source
        if (source != null && AppSendAdapter.isSendClick(source, packageName)) {
          GuardLog.gate("host-send-observed", packageName, "curtain=${curtain.isShowing}")
        }
        scheduleComposerEvaluation(packageName)
      }
      AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED,
      AccessibilityEvent.TYPE_VIEW_FOCUSED,
      AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> scheduleComposerEvaluation(packageName)
    }
  }

  override fun onKeyEvent(event: KeyEvent): Boolean {
    if (event.action != KeyEvent.ACTION_DOWN) return false
    if (event.keyCode != KeyEvent.KEYCODE_ENTER && event.keyCode != KeyEvent.KEYCODE_NUMPAD_ENTER) return false
    if (gateInProgress) return true

    val packageName = curtainPackage ?: rootInActiveWindow?.packageName?.toString() ?: return false
    if (shouldSkipSystemSurface(packageName)) return false
    if (!protectedAppsStore.isProtected(packageName) || !protectedAppsStore.isFirewallEnabled()) return false

    val pending = pendingRisk ?: return false
    GuardLog.gate("hardware-enter", packageName, "level=${pending.scan.level}")
    openGate(packageName, pending.text, pending.scan)
    return true
  }

  override fun onInterrupt() {
    removeOverlay()
    releaseCurtain("service-interrupt")
  }

  override fun onDestroy() {
    removeOverlay()
    releaseCurtain("service-destroyed")
    handler.removeCallbacksAndMessages(null)
    activeNode = null
    pendingSendNode = null
    serviceScope.cancel()
    super.onDestroy()
  }

  private fun scheduleComposerEvaluation(packageName: String) {
    if (gateInProgress) return
    previewRunnable?.let { handler.removeCallbacks(it) }
    previewRunnable = Runnable { evaluateComposer(packageName) }
    handler.postDelayed(previewRunnable!!, PREVIEW_DEBOUNCE_MS)
  }

  /**
   * Single source of truth for protection state: locate the composer across all windows, scan
   * locally, then keep the curtain pinned to the live action row.
   */
  private fun evaluateComposer(packageName: String) {
    if (gateInProgress) return
    curtainPackage = packageName

    val target = ComposerLocator.locate(this, packageName)
    if (target == null) {
      // Only drop protection when nothing is in custody; a missing composer is often just a
      // transient relayout while the keyboard animates.
      if (heldText == null) releaseCurtain("composer-missing")
      return
    }

    activeNode = target.editable
    pendingSendNode = target.sendNode

    val pending = pendingRisk
    if (heldText != null && pending != null) {
      // Text is in EraseAI custody: the composer is empty by design, so keep the curtain up
      // and just track the row as the layout moves.
      curtain.show(target.submitZone, pending.scan.level, packageName) { openGateFromCurtain(packageName) }
      return
    }

    val text = target.text.take(MAX_SCAN_TEXT_LENGTH)
    if (text.length < MIN_SCAN_LENGTH) {
      releaseCurtain("composer-empty")
      return
    }
    if (text == decidedText) {
      releaseCurtain("user-decided")
      return
    }
    GuardLog.composer(packageName, text.length, target.actionRow, "locator")

    val local = LocalRiskScanner.scan(text)
    if (!local.shouldWarn) {
      releaseCurtain("no-findings")
      maybePreviewApiScan(packageName, text)
      return
    }

    pendingRisk = PendingRisk(text, local)
    protectedAppsStore.saveLastScanSummary(local.summary(), local.level)
    curtain.show(target.submitZone, local.level, packageName) { openGateFromCurtain(packageName) }

    // High risk only: take the text out of the app so no send path can transmit it, even if
    // the user reaches the send control before the curtain is repositioned. Once the user has
    // cancelled, the draft stays put for editing and the curtain alone blocks the send.
    if (local.level == "high" && !holdSuspended) holdText(packageName, target.editable, text)

    GuardLog.risk(packageName, local.level, local.riskScore, local.findings.size, held = heldText != null)
    maybePreviewApiScan(packageName, text)
  }

  private fun holdText(packageName: String, editable: AccessibilityNodeInfo, text: String) {
    if (heldText != null) return
    setComposerText(editable, "")
    heldText = text
    GuardLog.gate("hold", packageName, "len=${text.length}")
    // ACTION_SET_TEXT can report success while the host app repopulates its own draft, and an
    // immediate re-read returns stale content. Confirm once the UI has settled so the log
    // reflects what actually happened. Either way the curtain still covers every send control.
    handler.postDelayed({
      editable.refresh()
      if (!editable.text.isNullOrEmpty()) {
        GuardLog.warn("hold.repopulated", packageName, "composer refilled by host app")
      }
    }, HOLD_VERIFY_DELAY_MS)
  }

  private fun openGateFromCurtain(packageName: String) {
    val pending = pendingRisk ?: return
    GuardLog.gate("curtain-tapped", packageName, "level=${pending.scan.level}")
    openGate(packageName, pending.text, pending.scan)
  }

  private fun releaseCurtain(reason: String) {
    pendingRisk = null
    heldText = null
    // The composer is safe or empty again, so the next risky draft gets full protection.
    holdSuspended = false
    curtain.hide(curtainPackage, reason)
  }

  /** Silent background refinement: never writes history and never opens UI on its own. */
  private fun maybePreviewApiScan(packageName: String, text: String) {
    val hash = text.sha256()
    if (hash == lastTextHashByPackage[packageName]) return
    val now = System.currentTimeMillis()
    if (now - (lastScanAtByPackage[packageName] ?: 0L) < MIN_PREVIEW_INTERVAL_MS) return
    lastTextHashByPackage[packageName] = hash
    lastScanAtByPackage[packageName] = now
    serviceScope.launch {
      scanApi.scan(
        text = text,
        source = "android_accessibility_preview",
        targetPackage = packageName,
        targetName = packageName,
      ).onSuccess { result ->
        protectedAppsStore.saveLastScanSummary(result.summary(), result.diagnosticsType())
      }.onFailure { err ->
        protectedAppsStore.saveLastErrorCategory(err.errorCategory())
      }
    }
  }

  private fun openGate(packageName: String, text: String, local: LocalRiskScanner.LocalScan) {
    if (gateInProgress) return
    gateInProgress = true
    // The curtain deliberately stays mounted underneath the gate. The gate is a full-screen
    // modal so nothing shows through, and leaving it up means dismissing the gate with Cancel
    // cannot expose the send control even for an instant.
    handler.removeCallbacksAndMessages(null)

    val target = ComposerLocator.locate(this, packageName)
    target?.let {
      activeNode = it.editable
      pendingSendNode = it.sendNode
    }
    val attachments = target?.root?.let { AttachmentHints.extract(it) } ?: emptyList()
    if (attachments.isNotEmpty()) {
      GuardLog.gate("attachments", packageName, "labels=${attachments.joinToString("|") { it.label }}")
    }

    // Take custody now if the medium-risk path left the text in the composer.
    if (heldText == null) {
      activeNode?.let { setComposerText(it, "") }
      heldText = text
    }

    // One history row per decision — preview scans never write history.
    protectedAppsStore.appendLocalScan(text.ifBlank { "[attachment]" }, local.riskScore, local.level)
    protectedAppsStore.saveLastScanSummary(local.summary(), local.level)
    GuardLog.gate("open", packageName, "level=${local.level} findings=${local.findings.size}")

    overlayText = text.ifBlank { attachments.joinToString { it.label }.ifBlank { "[media]" } }
    showGateOverlay(
      text.ifBlank { "[attachment / media]" },
      packageName,
      local.toScanResult(text),
      emptyList(),
      attachments,
    )

    refineGateWithApi(packageName, text, attachments)
  }

  /** Upgrades the already-visible local verdict with the server result, if it arrives in time. */
  private fun refineGateWithApi(
    packageName: String,
    text: String,
    attachments: List<AttachmentHint>,
  ) {
    val pieces = buildPieces(text, attachments)
    serviceScope.launch {
      scanApi.scanPieces(
        pieces = pieces,
        source = "android_accessibility_send",
        targetPackage = packageName,
        targetName = packageName,
      ).onSuccess { multi ->
        if (!gateInProgress) return@onSuccess
        protectedAppsStore.saveLastScanSummary(multi.result.summary(), multi.result.diagnosticsType())
        overlayResult = multi.result
        overlayPieces = multi.pieces
        GuardLog.gate("api-refined", packageName, "level=${multi.result.level}")

        val serverSaysClear = multi.result.findings.isEmpty() &&
          !multi.result.hasAttachmentBlocker &&
          attachments.isEmpty() &&
          text.isNotBlank()
        if (serverSaysClear) {
          showSafeAutoSendOverlay(text, packageName, multi.result)
          return@onSuccess
        }
        showGateOverlay(
          text.ifBlank { "[attachment / media]" },
          packageName,
          multi.result,
          multi.pieces,
          attachments,
        )
      }.onFailure { err ->
        protectedAppsStore.saveLastErrorCategory(err.errorCategory())
        GuardLog.warn("api-scan.failed", packageName, "category=${err.errorCategory()}")
        // The local verdict stays on screen: a failed API call must never unblock a send.
        if (err is ApiError.Unauthorized && !sessionPromptShown) {
          sessionPromptShown = true
          Toast.makeText(
            this@AiGuardAccessibilityService,
            "Sign in to EraseAI for full scanning — local protection is still active",
            Toast.LENGTH_LONG,
          ).show()
        }
      }
    }
  }

  private fun setComposerText(node: AccessibilityNodeInfo, text: String): Boolean =
    node.performAction(
      AccessibilityNodeInfo.ACTION_SET_TEXT,
      Bundle().apply {
        putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
      },
    )

  private fun restoreComposerText(text: String) {
    val node = activeNode ?: return
    if (setComposerText(node, text)) {
      heldText = null
    } else {
      copyText(text)
      Toast.makeText(this, "Your prompt was copied — paste it to continue.", Toast.LENGTH_LONG).show()
    }
  }

  private fun buildPieces(promptText: String, attachments: List<AttachmentHint>): List<ScanPiece> {
    val pieces = mutableListOf<ScanPiece>()
    if (promptText.isNotBlank()) {
      chunkText(promptText, PIECE_CHUNK_SIZE).forEachIndexed { index, chunk ->
        pieces.add(
          ScanPiece(
            source = "prompt",
            label = if (index == 0) "Prompt text" else "Prompt text (part ${index + 1})",
            text = chunk,
          ),
        )
      }
    }
    // In-composer attachments are never readable via Accessibility — always skip.
    attachments.forEach { attachment ->
      pieces.add(
        ScanPiece(
          source = attachment.source,
          label = attachment.label,
          text = "",
          skipReason = attachment.skipReason
            ?: "Attachment \"${attachment.label}\" cannot be scanned inside the AI app.",
        ),
      )
    }
    if (pieces.isEmpty()) {
      pieces.add(
        ScanPiece(
          source = "prompt",
          label = "Prompt text",
          text = promptText.ifBlank { " " },
        ),
      )
    }
    return pieces
  }

  private fun showSafeAutoSendOverlay(originalText: String, packageName: String, result: ScanResult) {
    overlayText = originalText
    overlayPackageName = packageName
    overlayResult = result

    val container = buildOverlayContainer(
      title = "All clear",
      body = "No sensitive data detected. Sending…",
      originalText = originalText,
      packageName = packageName,
      result = result,
      pieces = overlayPieces,
      showCancel = true,
      showSanitize = false,
      showSendAnyway = false,
      blockSendAnyway = false,
    )

    mountOverlay(container, modal = true)
    safeAutoSendRunnable = Runnable {
      reportOutcome("auto-send")
      decidedText = originalText
      restoreComposerText(originalText)
      performApprovedSend()
    }
    handler.postDelayed(safeAutoSendRunnable!!, SAFE_AUTO_SEND_MS)
  }

  private fun showGateOverlay(
    originalText: String,
    packageName: String,
    result: ScanResult,
    pieces: List<PieceScanSummary>,
    attachments: List<AttachmentHint>,
  ) {
    overlayText = originalText
    overlayPackageName = packageName
    overlayResult = result
    overlayPieces = pieces

    val summary = result.findings
      .take(3)
      .joinToString { "${it.label} (${it.type})" }
      .ifBlank { "sensitive data" }

    val hasFileBlocker = result.hasAttachmentBlocker ||
      attachments.any { it.skipReason != null } ||
      pieces.any { it.skipReason != null }

    val harmBlock = result.isHarmBlock() || result.blockSend
    val blockSendAnyway = harmBlock || result.action == "block"

    val promptIsProblem = !harmBlock && (
      pieces.any { it.source == "prompt" && it.level in setOf("medium", "high") } ||
        (result.findings.isNotEmpty() && pieces.none { it.source.startsWith("file:") })
      )

    val title = when {
      harmBlock -> "Send blocked — safety risk"
      blockSendAnyway -> "High-risk content blocked"
      hasFileBlocker && result.findings.isEmpty() -> "Unscanned attachment"
      else -> "Sensitive data detected"
    }
    val body = when {
      harmBlock ->
        "EraseAI blocked this send. Justification: $summary. " +
          "Child-safety and attack-planning prompts cannot be sanitized and sent. Tap Cancel."
      blockSendAnyway ->
        "EraseAI blocked this send due to high-risk content: $summary. Cancel to stay safe."
      hasFileBlocker && result.findings.isEmpty() ->
        "An attachment was detected but cannot be scanned inside this AI app. " +
          "Remove the file, Cancel, or explicitly Send Anyway after you review the risk."
      hasFileBlocker ->
        "EraseAI found $summary. Attachments are unscanned — Sanitize only rewrites the prompt text."
      else -> "EraseAI found $summary before sending to AI."
    }

    val container = buildOverlayContainer(
      title = title,
      body = body,
      originalText = originalText,
      packageName = packageName,
      result = result,
      pieces = pieces,
      showCancel = true,
      // Never offer Sanitize & Send for harm-intent blocks — rewriting does not make them safe.
      showSanitize = promptIsProblem && result.findings.isNotEmpty() && !harmBlock,
      sanitizePromptOnly = hasFileBlocker,
      showSendAnyway = !blockSendAnyway,
      blockSendAnyway = blockSendAnyway,
    )

    mountOverlay(container, modal = true)
  }

  private fun buildOverlayContainer(
    title: String,
    body: String,
    originalText: String,
    packageName: String,
    result: ScanResult,
    pieces: List<PieceScanSummary>,
    showCancel: Boolean,
    showSanitize: Boolean,
    sanitizePromptOnly: Boolean = false,
    showSendAnyway: Boolean,
    blockSendAnyway: Boolean,
  ): LinearLayout {
    val density = resources.displayMetrics.density
    val radius = 20 * density
    val container = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(
        (22 * density).toInt(),
        (20 * density).toInt(),
        (22 * density).toInt(),
        (20 * density).toInt(),
      )
      background = GradientDrawable().apply {
        cornerRadius = radius
        setColor(0xFF0B1220.toInt())
        setStroke((1 * density).toInt(), 0xFF334155.toInt())
      }
      elevation = 24f
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply {
        val margin = (18 * density).toInt()
        setMargins(margin, margin, margin, margin)
      }
    }

    val riskColor = when (result.level.lowercase()) {
      "high" -> 0xFFEF4444.toInt()
      "medium" -> 0xFFF59E0B.toInt()
      else -> 0xFF38BDF8.toInt()
    }
    container.addView(TextView(this).apply {
      text = "ERASEAI · SEND GATE"
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
      setTextColor(riskColor)
      letterSpacing = 0.08f
    })
    container.addView(TextView(this).apply {
      text = title
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
      setTextColor(0xFFF8FAFC.toInt())
      setPadding(0, (8 * density).toInt(), 0, 0)
    })
    container.addView(TextView(this).apply {
      text = body
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
      setTextColor(0xFFCBD5E1.toInt())
      setPadding(0, (8 * density).toInt(), 0, (12 * density).toInt())
    })

    if (pieces.isNotEmpty()) {
      val pieceLines = pieces.joinToString("\n") { piece ->
        val status = piece.skipReason ?: piece.level
        "• ${piece.label}: $status"
      }
      container.addView(TextView(this).apply {
        text = pieceLines
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        setTextColor(0xFF94A3B8.toInt())
        setPadding(0, 0, 0, (12 * density).toInt())
      })
    }

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
    }

    if (showCancel) {
      actions.addView(gateButton("Cancel", filled = false) {
        reportOutcome("cancel")
        // Hand the draft back for editing but keep the send blocked: cancelling declines the
        // send, so it must not mark the text as approved the way Send Anyway does.
        holdSuspended = true
        restoreComposerText(originalText)
        dismissGateKeepingGuard(packageName)
      })
    }
    if (showSanitize) {
      val label = if (sanitizePromptOnly) "Sanitize Prompt" else "Sanitize & Send"
      actions.addView(gateButton(label, filled = true) {
        sanitizeAndMaybeSend(sanitizePromptOnly, result.findings)
      })
    }
    if (showSendAnyway && !blockSendAnyway) {
      val label = if (result.action == "block") "Send Anyway (Risky)" else "Send Anyway"
      actions.addView(gateButton(label, filled = false) {
        reportOutcome("send-anyway")
        decidedText = originalText
        restoreComposerText(originalText)
        performApprovedSend()
      })
    }

    container.addView(actions)
    container.addView(TextView(this).apply {
      text = "Open EraseAI"
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
      setTextColor(0xFF38BDF8.toInt())
      setPadding(0, (14 * density).toInt(), 0, 0)
      setOnClickListener { openDetails() }
    })

    return container
  }

  private fun gateButton(label: String, filled: Boolean, onClick: () -> Unit): Button {
    val density = resources.displayMetrics.density
    return Button(this).apply {
      text = label
      isAllCaps = false
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      setTextColor(if (filled) 0xFF0B1220.toInt() else 0xFFF8FAFC.toInt())
      background = GradientDrawable().apply {
        cornerRadius = 12 * density
        setColor(if (filled) 0xFF38BDF8.toInt() else 0xFF1E293B.toInt())
        if (!filled) setStroke((1 * density).toInt(), 0xFF475569.toInt())
      }
      setPadding(
        (16 * density).toInt(),
        (12 * density).toInt(),
        (16 * density).toInt(),
        (12 * density).toInt(),
      )
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      lp.topMargin = (8 * density).toInt()
      layoutParams = lp
      setOnClickListener { onClick() }
    }
  }

  private fun mountOverlay(container: LinearLayout, modal: Boolean) {
    // Only the window: the caller has just populated overlayText / overlayResult for the
    // buttons we are about to mount, and removeOverlay() would wipe them right back out.
    detachOverlayView()
    val scroll = ScrollView(this).apply {
      setBackgroundColor(if (modal) 0xCC070A13.toInt() else 0x00000000)
      addView(container)
    }
    val flags = if (modal) {
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_DIM_BEHIND
    } else {
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
    }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      if (modal) WindowManager.LayoutParams.MATCH_PARENT else WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      flags,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.CENTER
      if (modal) dimAmount = 0.55f
    }
    getSystemService(WindowManager::class.java).addView(scroll, params)
    overlayView = scroll
  }

  private fun sanitizeAndMaybeSend(promptOnly: Boolean, findings: List<ScanFinding>) {
    val originalText = overlayText ?: return
    serviceScope.launch {
      scanApi.rewrite(originalText, findings)
        .onSuccess { rewritten ->
          val replaced = activeNode?.let { setComposerText(it, rewritten) } ?: false
          if (replaced) {
            heldText = null
          } else {
            copyText(rewritten)
            Toast.makeText(this@AiGuardAccessibilityService, "Safe text copied. Paste it into the field.", Toast.LENGTH_LONG).show()
          }
          protectedAppsStore.saveLastScanSummary("Sanitized prompt", "redact")
          reportOutcome("sanitize")
          if (!promptOnly) {
            performApprovedSend()
          } else {
            finishGate()
          }
        }
        .onFailure {
          // Gate stays open on purpose: the prompt is still held, so the user can still
          // Cancel or Send Anyway rather than being silently released.
          val category = it.errorCategory()
          GuardLog.warn("sanitize.failed", overlayPackageName, "category=$category reason=${it.message ?: "unknown"}")
          protectedAppsStore.saveLastErrorCategory(category)
          // Blaming billing for what is usually an expired session sends people to the
          // upgrade screen when all they need is to sign in again.
          val message = when (category) {
            "auth" -> "Sign in to EraseAI again to sanitize this prompt"
            "entitlement" -> "Sanitization requires an active EraseAI plan"
            "network" -> "Couldn't reach EraseAI to sanitize — check your connection"
            else -> "Sanitization failed — the prompt is still blocked"
          }
          Toast.makeText(this@AiGuardAccessibilityService, message, Toast.LENGTH_LONG).show()
        }
    }
  }

  private fun performApprovedSend() {
    val sendNode = pendingSendNode
    var clicked = false
    if (sendNode != null) {
      sendNode.refresh()
      if (sendNode.isEnabled) {
        clicked = sendNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
      }
    }
    GuardLog.gate("approved-send", curtainPackage, "clicked=$clicked")
    if (!clicked) {
      Toast.makeText(this, "Your prompt is back in the composer — tap send to continue.", Toast.LENGTH_SHORT).show()
    }
    finishGate()
  }

  /**
   * Closes the gate without standing the guard down, for Cancel.
   *
   * finishGate() drops the curtain and clears pendingRisk, and the next evaluation is a
   * PREVIEW_DEBOUNCE_MS away — with the draft already restored, that gap is long enough to
   * tap send. Declining a send must leave the submit control covered, so the curtain and the
   * pending verdict both stay; the scheduled pass only re-pins the curtain to the new row.
   */
  private fun dismissGateKeepingGuard(packageName: String) {
    safeAutoSendRunnable?.let { handler.removeCallbacks(it) }
    safeAutoSendRunnable = null
    gateInProgress = false
    removeOverlay()
    scheduleComposerEvaluation(packageName)
  }

  private fun finishGate() {
    safeAutoSendRunnable?.let { handler.removeCallbacks(it) }
    safeAutoSendRunnable = null
    gateInProgress = false
    removeOverlay()
    pendingRisk = null
    heldText = null
    curtain.hide(curtainPackage, "gate-finished")
    // The restored draft would immediately re-trigger the curtain; let the user act first.
    lastTextHashByPackage.clear()
  }

  private fun reportOutcome(action: String) {
    val result = overlayResult ?: return
    serviceScope.launch {
      scanApi.recordOutcome(
        action = action,
        level = result.level,
        riskScore = result.riskScore,
        findingCount = result.findings.size,
        source = "android_accessibility",
      )
    }
  }

  private fun openDetails() {
    startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    finishGate()
  }

  private fun copyText(text: String) {
    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("EraseAI safe text", text))
  }

  /** Detaches the overlay window only. The gate's state outlives a remount. */
  private fun detachOverlayView() {
    safeAutoSendRunnable?.let { handler.removeCallbacks(it) }
    safeAutoSendRunnable = null
    overlayView?.let { overlay ->
      runCatching { getSystemService(WindowManager::class.java).removeView(overlay) }
    }
    overlayView = null
  }

  private fun removeOverlay() {
    detachOverlayView()
    overlayText = null
    overlayPackageName = null
    overlayResult = null
    overlayPieces = emptyList()
  }

  private fun shouldSkipSystemSurface(packageName: String): Boolean {
    return packageName == "com.android.systemui" || packageName == applicationContext.packageName
  }

  private fun chunkText(text: String, chunkSize: Int): List<String> {
    if (text.length <= chunkSize) return listOf(text)
    val chunks = mutableListOf<String>()
    var index = 0
    while (index < text.length) {
      chunks.add(text.substring(index, (index + chunkSize).coerceAtMost(text.length)))
      index += chunkSize
    }
    return chunks
  }

  private fun String.sha256(): String {
    val bytes = MessageDigest.getInstance("SHA-256").digest(toByteArray())
    return bytes.joinToString("") { "%02x".format(it) }
  }

  private fun Throwable.errorCategory(): String = when (this) {
    is ApiError.Unauthorized -> "auth"
    is ApiError.UpgradeRequired -> "entitlement"
    is ApiError.NotFound -> "not_found"
    is ApiError.Network -> "network"
    is ApiError.Server -> "server"
    else -> "unknown"
  }

  companion object {
    private const val PREVIEW_DEBOUNCE_MS = 450L
    private const val MIN_PREVIEW_INTERVAL_MS = 4000L
    private const val MIN_SCAN_LENGTH = 3
    private const val MAX_SCAN_TEXT_LENGTH = 5000
    private const val PIECE_CHUNK_SIZE = 4000
    private const val SAFE_AUTO_SEND_MS = 450L
    private const val HOLD_VERIFY_DELAY_MS = 300L
  }
}
