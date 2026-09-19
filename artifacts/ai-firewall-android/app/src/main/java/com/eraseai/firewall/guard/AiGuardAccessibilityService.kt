package com.eraseai.firewall.guard

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Bundle
import android.os.Handler
import android.os.Looper
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
import com.eraseai.firewall.data.MultiScanResult
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
  /** Gemini often clears the composer before our click handler runs — keep last typed draft. */
  private val lastDraftByPackage = mutableMapOf<String, String>()
  private var activeNode: AccessibilityNodeInfo? = null
  private var pendingSendNode: AccessibilityNodeInfo? = null
  private var overlayView: View? = null
  private var overlayText: String? = null
  private var overlayPackageName: String? = null
  private var overlayResult: ScanResult? = null
  private var overlayPieces: List<PieceScanSummary> = emptyList()
  private var bypassNextSend = false
  private var gateInProgress = false
  private var sessionPromptShown = false
  private var safeAutoSendRunnable: Runnable? = null

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
        val source = event.source ?: return
        val root = rootInActiveWindow
        val liveDraft = AppSendAdapter.composerText(root)
        if (liveDraft.length >= MIN_SCAN_LENGTH) {
          lastDraftByPackage[packageName] = liveDraft.take(MAX_SCAN_TEXT_LENGTH)
        }
        val draft = resolveDraftText(packageName, liveDraft)
        val hasAttachments = AttachmentHints.extract(root).isNotEmpty()
        val hasSendable = draft.length >= MIN_SCAN_LENGTH || hasAttachments
        if (AppSendAdapter.isSendClick(source, packageName, composerHasSendableText = hasSendable)) {
          handleSendGate(packageName, source)
        }
      }
      AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED,
      AccessibilityEvent.TYPE_VIEW_FOCUSED,
      AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
        val liveDraft = AppSendAdapter.composerText(rootInActiveWindow)
        if (liveDraft.length >= MIN_SCAN_LENGTH) {
          lastDraftByPackage[packageName] = liveDraft.take(MAX_SCAN_TEXT_LENGTH)
        }
        schedulePreviewScan(packageName)
      }
    }
  }

  override fun onKeyEvent(event: KeyEvent): Boolean {
    if (event.action != KeyEvent.ACTION_DOWN) return false
    if (event.keyCode != KeyEvent.KEYCODE_ENTER && event.keyCode != KeyEvent.KEYCODE_NUMPAD_ENTER) return false

    val root = rootInActiveWindow ?: return false
    val packageName = root.packageName?.toString() ?: return false
    if (shouldSkipSystemSurface(packageName)) return false
    if (!protectedAppsStore.isProtected(packageName) || !protectedAppsStore.isFirewallEnabled()) return false

    val draft = resolveDraftText(packageName, AppSendAdapter.composerText(root))
    val hasAttachments = AttachmentHints.extract(root).isNotEmpty()
    if (draft.length < MIN_SCAN_LENGTH && !hasAttachments) return false
    val sendNode = AppSendAdapter.findSendButton(root, packageName)
    handleSendGate(packageName, sendNode)
    return gateInProgress
  }

  override fun onInterrupt() {
    removeOverlay()
  }

  override fun onDestroy() {
    removeOverlay()
    handler.removeCallbacksAndMessages(null)
    activeNode = null
    pendingSendNode = null
    serviceScope.cancel()
    super.onDestroy()
  }

  private fun handleSendGate(packageName: String, sendNode: AccessibilityNodeInfo?) {
    if (bypassNextSend) {
      bypassNextSend = false
      return
    }
    if (gateInProgress) return

    val root = rootInActiveWindow ?: return
    val editable = AppSendAdapter.findComposerEditable(root)
    val liveText = AppSendAdapter.composerText(root).take(MAX_SCAN_TEXT_LENGTH)
    val text = resolveDraftText(packageName, liveText).take(MAX_SCAN_TEXT_LENGTH)
    val attachments = AttachmentHints.extract(root)
    if (text.length < MIN_SCAN_LENGTH && attachments.isEmpty()) return

    activeNode = editable
    pendingSendNode = sendNode?.takeIf { it.isClickable }
      ?: AppSendAdapter.findSendButton(root, packageName)
      ?: sendNode
    gateInProgress = true
    removeOverlay()
    lastDraftByPackage.remove(packageName)

    // Race the host app: clear composer so the original tap cannot deliver the prompt.
    editable?.performAction(
      AccessibilityNodeInfo.ACTION_SET_TEXT,
      Bundle().apply {
        putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, "")
      },
    )
    overlayText = text.ifBlank { attachments.joinToString { it.label }.ifBlank { "[media]" } }

    val pieces = buildPieces(text, attachments)

    serviceScope.launch {
      scanApi.scanPieces(
        pieces = pieces,
        source = "android_accessibility_send",
        targetPackage = packageName,
        targetName = packageName,
      ).onSuccess { multi ->
        protectedAppsStore.saveLastScanSummary(multi.result.summary(), multi.result.diagnosticsType())
        overlayResult = multi.result
        overlayPieces = multi.pieces
        val safeToAutoSend = multi.result.findings.isEmpty() &&
          !multi.result.hasAttachmentBlocker &&
          attachments.isEmpty() &&
          text.isNotBlank()
        if (safeToAutoSend) {
          showSafeAutoSendOverlay(text, packageName, multi.result)
        } else {
          showGateOverlay(
            text.ifBlank { "[attachment / media]" },
            packageName,
            multi.result,
            multi.pieces,
            attachments,
          )
        }
      }.onFailure { err ->
        restoreComposerText(text)
        gateInProgress = false
        protectedAppsStore.saveLastErrorCategory(err.errorCategory())
        if (err is ApiError.Unauthorized) {
          if (!sessionPromptShown) {
            sessionPromptShown = true
            Toast.makeText(this@AiGuardAccessibilityService, "Sign in to EraseAI to keep firewall scanning active", Toast.LENGTH_LONG).show()
          }
        } else {
          Toast.makeText(this@AiGuardAccessibilityService, "EraseAI scan unavailable — message held. Try again.", Toast.LENGTH_SHORT).show()
        }
      }
    }
  }

  private fun restoreComposerText(text: String) {
    val node = activeNode ?: return
    node.performAction(
      AccessibilityNodeInfo.ACTION_SET_TEXT,
      Bundle().apply {
        putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
      },
    )
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

  private fun schedulePreviewScan(packageName: String) {
    if (gateInProgress) return
    val root = rootInActiveWindow ?: return
    val node = AppSendAdapter.findComposerEditable(root) ?: return
    if (node.isPassword) return
    val text = AppSendAdapter.composerText(root).take(MAX_SCAN_TEXT_LENGTH)
    if (text.length < MIN_SCAN_LENGTH) return

    activeNode = node
    previewRunnable?.let { handler.removeCallbacks(it) }
    previewRunnable = Runnable {
      val hash = text.sha256()
      if (hash == lastTextHashByPackage[packageName]) return@Runnable
      val now = System.currentTimeMillis()
      if (now - (lastScanAtByPackage[packageName] ?: 0L) < MIN_PREVIEW_INTERVAL_MS) return@Runnable
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
          if (result.findings.isNotEmpty() || result.level == "medium" || result.level == "high") {
            val tip = result.findings.firstOrNull()?.label ?: "Sensitive content"
            Toast.makeText(
              this@AiGuardAccessibilityService,
              "EraseAI: $tip — review before Send",
              Toast.LENGTH_LONG,
            ).show()
          }
        }.onFailure { err ->
          protectedAppsStore.saveLastErrorCategory(err.errorCategory())
        }
      }
    }
    handler.postDelayed(previewRunnable!!, PREVIEW_DEBOUNCE_MS)
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
    val container = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(28, 24, 28, 24)
      setBackgroundColor(0xFDF8FAFC.toInt())
      elevation = 16f
    }

    container.addView(TextView(this).apply {
      text = title
      textSize = 18f
      setTextColor(0xFF0F172A.toInt())
    })
    container.addView(TextView(this).apply {
      text = body
      textSize = 14f
      setTextColor(0xFF334155.toInt())
      setPadding(0, 8, 0, 8)
    })

    if (pieces.isNotEmpty()) {
      val pieceLines = pieces.joinToString("\n") { piece ->
        val status = piece.skipReason ?: piece.level
        "• ${piece.label}: $status"
      }
      container.addView(TextView(this).apply {
        text = pieceLines
        textSize = 12f
        setTextColor(0xFF64748B.toInt())
        setPadding(0, 0, 0, 12)
      })
    }

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.END
    }

    if (showCancel) {
      actions.addView(outlinedButton("Cancel") {
        reportOutcome("cancel")
        // Keep the draft in the composer so the user can edit instead of losing it.
        restoreComposerText(originalText)
        finishGate()
      })
    }
    if (showSanitize) {
      val label = if (sanitizePromptOnly) "Sanitize Prompt" else "Sanitize & Send"
      actions.addView(primaryButton(label) {
        sanitizeAndMaybeSend(sanitizePromptOnly, result.findings)
      })
    }
    if (showSendAnyway && !blockSendAnyway) {
      val label = if (result.action == "block") "Send Anyway (Risky)" else "Send Anyway"
      actions.addView(outlinedButton(label) {
        reportOutcome("send-anyway")
        restoreComposerText(originalText)
        performApprovedSend()
      })
    }

    container.addView(actions)
    container.addView(TextView(this).apply {
      text = "Open EraseAI"
      textSize = 13f
      setTextColor(0xFF2563EB.toInt())
      setPadding(0, 12, 0, 0)
      setOnClickListener { openDetails() }
    })

    return container
  }

  private fun outlinedButton(label: String, onClick: () -> Unit): Button =
    Button(this).apply {
      text = label
      setOnClickListener { onClick() }
    }

  private fun primaryButton(label: String, onClick: () -> Unit): Button =
    Button(this).apply {
      text = label
      setOnClickListener { onClick() }
    }

  private fun mountOverlay(container: LinearLayout, modal: Boolean) {
    removeOverlay()
    val scroll = ScrollView(this).apply { addView(container) }
    val flags = if (modal) {
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
    } else {
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
    }
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      flags,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.CENTER
      width = (resources.displayMetrics.widthPixels * 0.92f).toInt()
    }
    getSystemService(WindowManager::class.java).addView(scroll, params)
    overlayView = scroll
  }

  private fun sanitizeAndMaybeSend(promptOnly: Boolean, findings: List<ScanFinding>) {
    val originalText = overlayText ?: return
    serviceScope.launch {
      scanApi.rewrite(originalText, findings)
        .onSuccess { rewritten ->
          val node = activeNode
          val replaced = node?.performAction(
            AccessibilityNodeInfo.ACTION_SET_TEXT,
            Bundle().apply {
              putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, rewritten)
            },
          ) ?: false
          if (!replaced) {
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
          protectedAppsStore.saveLastErrorCategory("entitlement")
          Toast.makeText(this@AiGuardAccessibilityService, "Sanitization requires an active EraseAI plan", Toast.LENGTH_LONG).show()
        }
    }
  }

  private fun performApprovedSend() {
    bypassNextSend = true
    val sendNode = pendingSendNode
    if (sendNode != null) {
      sendNode.refresh()
      if (sendNode.isEnabled) {
        sendNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
      }
    }
    finishGate()
  }

  private fun finishGate() {
    safeAutoSendRunnable?.let { handler.removeCallbacks(it) }
    safeAutoSendRunnable = null
    gateInProgress = false
    removeOverlay()
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

  private fun removeOverlay() {
    safeAutoSendRunnable?.let { handler.removeCallbacks(it) }
    safeAutoSendRunnable = null
    overlayView?.let { overlay ->
      runCatching { getSystemService(WindowManager::class.java).removeView(overlay) }
    }
    overlayView = null
    overlayText = null
    overlayPackageName = null
    overlayResult = null
    overlayPieces = emptyList()
  }

  private fun shouldSkipSystemSurface(packageName: String): Boolean {
    return packageName == "com.android.systemui" || packageName == applicationContext.packageName
  }

  private fun resolveDraftText(packageName: String, liveText: String): String {
    val cached = lastDraftByPackage[packageName].orEmpty()
    return when {
      liveText.length >= MIN_SCAN_LENGTH -> liveText
      cached.length >= MIN_SCAN_LENGTH -> cached
      liveText.isNotBlank() -> liveText
      else -> cached
    }
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
    private const val PREVIEW_DEBOUNCE_MS = 1200L
    private const val MIN_PREVIEW_INTERVAL_MS = 4000L
    private const val MIN_SCAN_LENGTH = 3
    private const val MAX_SCAN_TEXT_LENGTH = 5000
    private const val PIECE_CHUNK_SIZE = 4000
    private const val SAFE_AUTO_SEND_MS = 450L
  }
}
