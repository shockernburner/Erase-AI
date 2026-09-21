package com.eraseai.firewall.ime

import android.inputmethodservice.InputMethodService
import android.text.InputType
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.widget.Toast
import com.eraseai.firewall.data.ProtectedAppsStore
import com.eraseai.firewall.guard.GuardLog
import com.eraseai.firewall.guard.LocalRiskScanner

/**
 * EraseAI Keyboard.
 *
 * The accessibility guard can only react to text that already reached the host app. An IME sits
 * one layer earlier: it owns the composing buffer, so high-risk text can be withheld and never
 * committed into the AI app's composer at all. If the text is not in the composer, no send path
 * — button, Enter, or voice — can transmit it.
 *
 * This is a gate, not a full keyboard layout: it delegates character entry to the user's normal
 * typing surface and only interposes on commit.
 */
class EraseAiKeyboardService : InputMethodService() {

  private lateinit var protectedAppsStore: ProtectedAppsStore

  /**
   * Null until the system asks for an input view, and again after it is torn down.
   * `onUpdateSelection` can arrive outside that window, so every use must be null-safe —
   * an exception here kills the whole process, taking the accessibility guard down with it.
   */
  private var gateView: KeyboardGateView? = null

  /** Text withheld from the host app, awaiting a user decision. */
  private var withheldText: String? = null
  private var targetPackage: String? = null

  override fun onCreate() {
    super.onCreate()
    protectedAppsStore = ProtectedAppsStore(this)
  }

  override fun onCreateInputView(): View {
    val view = KeyboardGateView(
      context = this,
      onRelease = { releaseWithheldText() },
      onDiscard = { discardWithheldText() },
      onSanitize = { sanitizeWithheldText() },
    )
    gateView = view
    return view
  }

  override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
    super.onStartInputView(info, restarting)
    targetPackage = info?.packageName
    withheldText = null
    gateView?.showIdle(protectionActive(info))
    GuardLog.ime("start", "pkg=${targetPackage ?: "-"} protected=${protectionActive(info)}")
  }

  override fun onUpdateSelection(
    oldSelStart: Int,
    oldSelEnd: Int,
    newSelStart: Int,
    newSelEnd: Int,
    candidatesStart: Int,
    candidatesEnd: Int,
  ) {
    super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd, candidatesStart, candidatesEnd)
    if (withheldText != null) return
    evaluateBuffer()
  }

  private fun protectionActive(info: EditorInfo?): Boolean {
    val pkg = info?.packageName ?: return false
    if (isSensitiveField(info)) return false
    return protectedAppsStore.isFirewallEnabled() && protectedAppsStore.isProtected(pkg)
  }

  private fun isSensitiveField(info: EditorInfo): Boolean {
    val variation = info.inputType and InputType.TYPE_MASK_VARIATION
    return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
      variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
      variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD ||
      variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
  }

  /**
   * Reads what the host composer currently holds and, on a high-risk finding, takes it into
   * EraseAI custody so nothing risky is left in the app.
   */
  private fun evaluateBuffer() {
    val info = currentInputEditorInfo
    if (!protectionActive(info)) return
    val connection = currentInputConnection ?: return

    val before = connection.getTextBeforeCursor(MAX_BUFFER, 0)?.toString().orEmpty()
    val after = connection.getTextAfterCursor(MAX_BUFFER, 0)?.toString().orEmpty()
    val buffer = (before + after).trim()
    if (buffer.length < MIN_BUFFER) {
      gateView?.showIdle(true)
      return
    }

    val scan = LocalRiskScanner.scan(buffer)
    GuardLog.ime(
      "scan",
      "pkg=${targetPackage ?: "-"} len=${buffer.length} level=${scan.level} findings=${scan.findings.size}",
    )

    when {
      scan.level == "high" -> withholdText(connection, before.length, after.length, buffer, scan)
      scan.shouldWarn -> gateView?.showWarning(scan)
      else -> gateView?.showIdle(true)
    }
  }

  private fun withholdText(
    connection: InputConnection,
    beforeLength: Int,
    afterLength: Int,
    buffer: String,
    scan: LocalRiskScanner.LocalScan,
  ) {
    connection.beginBatchEdit()
    val removed = connection.deleteSurroundingText(beforeLength, afterLength)
    connection.endBatchEdit()
    if (!removed) {
      GuardLog.ime("withhold.failed", "pkg=${targetPackage ?: "-"} len=${buffer.length}")
      gateView?.showWarning(scan)
      return
    }
    withheldText = buffer
    protectedAppsStore.appendLocalScan(buffer, scan.riskScore, scan.level)
    protectedAppsStore.saveLastScanSummary(scan.summary(), scan.level)
    gateView?.showWithheld(scan)
    GuardLog.ime("withhold", "pkg=${targetPackage ?: "-"} len=${buffer.length}")
  }

  private fun releaseWithheldText() {
    val text = withheldText ?: return
    currentInputConnection?.commitText(text, 1)
    withheldText = null
    gateView?.showIdle(true)
    GuardLog.ime("release", "pkg=${targetPackage ?: "-"} len=${text.length}")
  }

  private fun discardWithheldText() {
    val text = withheldText ?: return
    withheldText = null
    gateView?.showIdle(true)
    GuardLog.ime("discard", "pkg=${targetPackage ?: "-"} len=${text.length}")
    Toast.makeText(this, "EraseAI discarded the risky text.", Toast.LENGTH_SHORT).show()
  }

  /** Local-only redaction so the keyboard keeps working without a network round trip. */
  private fun sanitizeWithheldText() {
    val text = withheldText ?: return
    val scan = LocalRiskScanner.scan(text)
    val redacted = scan.findings
      .sortedByDescending { it.start }
      .fold(StringBuilder(text)) { acc, finding ->
        val start = finding.start.coerceIn(0, acc.length)
        val end = finding.end.coerceIn(start, acc.length)
        acc.replace(start, end, "[${finding.type}]")
      }
      .toString()

    currentInputConnection?.commitText(redacted, 1)
    withheldText = null
    protectedAppsStore.saveLastScanSummary("Sanitized prompt", "redact")
    gateView?.showIdle(true)
    GuardLog.ime("sanitize", "pkg=${targetPackage ?: "-"} len=${redacted.length}")
  }

  override fun onFinishInputView(finishingInput: Boolean) {
    super.onFinishInputView(finishingInput)
    withheldText = null
  }

  override fun onDestroy() {
    gateView = null
    super.onDestroy()
  }

  private companion object {
    const val MAX_BUFFER = 5000
    const val MIN_BUFFER = 3
  }
}
