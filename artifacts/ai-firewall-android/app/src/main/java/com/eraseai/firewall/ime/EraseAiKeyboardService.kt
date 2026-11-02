package com.eraseai.firewall.ime

import android.content.res.Configuration
import android.inputmethodservice.InputMethodService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.ExtractedTextRequest
import android.view.inputmethod.InputConnection
import android.widget.LinearLayout
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.eraseai.firewall.data.ProtectedAppsStore
import com.eraseai.firewall.guard.GuardLog
import com.eraseai.firewall.guard.GuardStateStore
import com.eraseai.firewall.guard.LocalRiskScanner

/**
 * EraseAI Keyboard — input-layer firewall. Risky text is withheld before it reaches the host
 * composer's send path, so per-app send button layouts do not matter for typed prompts.
 */
class EraseAiKeyboardService : InputMethodService() {

  private lateinit var protectedAppsStore: ProtectedAppsStore
  private var rootLayout: LinearLayout? = null
  private var gateView: KeyboardGateView? = null
  private var keyboardView: QwertyKeyboardView? = null
  private var withheldText: String? = null
  private var targetPackage: String? = null
  private var editorInfo: EditorInfo? = null
  private val handler = Handler(Looper.getMainLooper())

  override fun onCreate() {
    super.onCreate()
    protectedAppsStore = ProtectedAppsStore(this)
    GuardStateStore.init(this)
  }

  override fun onCreateInputView(): View {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(0xFF0B1220.toInt())
    }
    val gate = KeyboardGateView(
      context = this,
      onRelease = { releaseWithheldText() },
      onDiscard = { discardWithheldText() },
      onSanitize = { sanitizeWithheldText() },
    )
    val keyboard = QwertyKeyboardView(
      context = this,
      onCharacter = { char -> commitCharacter(char) },
      onBackspace = { deleteCharacter() },
      onSpace = { commitCharacter(" ") },
      onSend = { onSendRequested() },
    )
    root.addView(gate)
    root.addView(keyboard)
    // Edge-to-edge IME windows draw under the navigation bar, whose keyboard-switcher button
    // then sat on top of the gate's "Insert anyway" action.
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      val navBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
      view.setPadding(view.paddingLeft, view.paddingTop, view.paddingRight, navBottom)
      insets
    }
    rootLayout = root
    gateView = gate
    keyboardView = keyboard
    return root
  }

  /**
   * With a physical keyboard attached (tablets, Chromebooks, DeX, Bluetooth keyboards) the
   * platform hides soft keyboards by default, and this one never appeared. The gate strip is
   * the only place a withheld prompt can be released or discarded — hidden, the text simply
   * vanished from the composer — so it is always shown; only the key rows collapse.
   */
  override fun onEvaluateInputViewShown(): Boolean {
    super.onEvaluateInputViewShown()
    return true
  }

  private fun hasHardwareKeyboard(): Boolean {
    val config = resources.configuration
    return config.keyboard != Configuration.KEYBOARD_NOKEYS &&
      config.hardKeyboardHidden == Configuration.HARDKEYBOARDHIDDEN_NO
  }

  override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
    super.onStartInputView(info, restarting)
    editorInfo = info
    targetPackage = info?.packageName
    withheldText = null
    keyboardView?.visibility = if (hasHardwareKeyboard()) View.GONE else View.VISIBLE
    keyboardView?.updateEditorInfo(info)
    gateView?.showIdle(protectionActive(info))
    clearGuardState()
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
    evaluateBuffer(commit = false)
  }

  /**
   * Physical keys reach the host directly unless the IME consumes them. While a prompt is held
   * the soft keys are already inert; without this, hardware typing kept landing in the
   * composer, and releasing the held text then spliced it in after whatever was typed since.
   */
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    if (withheldText != null && (event.isPrintingKey || keyCode == KeyEvent.KEYCODE_ENTER ||
        keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER || keyCode == KeyEvent.KEYCODE_SPACE)
    ) {
      return true
    }
    return super.onKeyDown(keyCode, event)
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

  private fun commitCharacter(char: String) {
    if (withheldText != null) return
    currentInputConnection?.commitText(char, 1)
    handler.post { evaluateBuffer(commit = false) }
  }

  private fun deleteCharacter() {
    if (withheldText != null) return
    currentInputConnection?.deleteSurroundingText(1, 0)
    handler.post { evaluateBuffer(commit = false) }
  }

  private fun onSendRequested() {
    if (withheldText != null) return
    evaluateBuffer(commit = true)
  }

  private fun evaluateBuffer(commit: Boolean) {
    val info = currentInputEditorInfo
    if (!protectionActive(info)) {
      clearGuardState()
      return
    }
    val connection = currentInputConnection ?: return

    val buffer = readComposerBuffer(connection)
    val before = connection.getTextBeforeCursor(MAX_BUFFER, 0)?.toString().orEmpty()
    val after = connection.getTextAfterCursor(MAX_BUFFER, 0)?.toString().orEmpty()
    if (buffer.length < MIN_BUFFER) {
      gateView?.showIdle(true)
      clearGuardState()
      if (commit) performEditorSend(connection)
      return
    }

    val scan = LocalRiskScanner.scan(buffer)
    GuardLog.ime(
      "scan",
      "pkg=${targetPackage ?: "-"} len=${buffer.length} level=${scan.level} commit=$commit",
    )

    when (ImeBufferPolicy.evaluate(scan, buffer.length, MIN_BUFFER, commit)) {
      ImeBufferPolicy.Action.WITHHOLD ->
        withholdText(connection, before.length, after.length, buffer, scan)
      ImeBufferPolicy.Action.SEND_SAFE -> {
        clearGuardState()
        gateView?.showIdle(true)
        performEditorSend(connection)
      }
      ImeBufferPolicy.Action.IDLE -> {
        clearGuardState()
        gateView?.showIdle(true)
      }
    }
  }

  private fun performEditorSend(connection: InputConnection) {
    if (withheldText != null) {
      GuardLog.ime("commit.blocked", "pkg=${targetPackage ?: "-"} reason=withheld")
      return
    }
    val hostAction = editorInfo?.imeOptions?.and(EditorInfo.IME_MASK_ACTION)
      ?: EditorInfo.IME_ACTION_UNSPECIFIED
    val actions = buildList {
      if (hostAction != EditorInfo.IME_ACTION_UNSPECIFIED) add(hostAction)
      if (!contains(EditorInfo.IME_ACTION_SEND)) add(EditorInfo.IME_ACTION_SEND)
      if (!contains(EditorInfo.IME_ACTION_DONE)) add(EditorInfo.IME_ACTION_DONE)
      add(EditorInfo.IME_ACTION_GO)
      add(EditorInfo.IME_ACTION_NEXT)
    }
    var handled = false
    var usedAction = hostAction
    for (action in actions) {
      if (connection.performEditorAction(action)) {
        handled = true
        usedAction = action
        break
      }
    }
    if (!handled) {
      connection.sendKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_ENTER))
      connection.sendKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_ENTER))
    }
    GuardLog.ime("commit", "pkg=${targetPackage ?: "-"} action=$usedAction handled=$handled")
  }

  private fun withholdText(
    connection: InputConnection,
    beforeLength: Int,
    afterLength: Int,
    buffer: String,
    scan: LocalRiskScanner.LocalScan,
  ) {
    val removed = removeComposerText(connection, beforeLength, afterLength, buffer.length)
    if (!removed) {
      GuardLog.ime("withhold.failed", "pkg=${targetPackage ?: "-"} len=${buffer.length}")
      GuardStateStore.setImeWithholdFailed(true)
      GuardStateStore.setArmed(targetPackage)
      gateView?.showWithheld(scan)
      return
    }
    withheldText = buffer
    GuardStateStore.setImeWithheld(true)
    GuardStateStore.setArmed(targetPackage)
    protectedAppsStore.appendLocalScan(buffer, scan.riskScore, scan.level)
    protectedAppsStore.saveLastScanSummary(scan.summary(), scan.level)
    gateView?.showWithheld(scan)
    GuardLog.ime("withhold", "pkg=${targetPackage ?: "-"} len=${buffer.length}")
  }

  private fun readComposerBuffer(connection: InputConnection): String {
    val request = ExtractedTextRequest().apply {
      flags = InputConnection.GET_TEXT_WITH_STYLES
      hintMaxLines = 100
      hintMaxChars = MAX_BUFFER
    }
    val extracted = connection.getExtractedText(request, 0)?.text?.toString()?.trim()
    if (!extracted.isNullOrBlank()) return extracted
    val before = connection.getTextBeforeCursor(MAX_BUFFER, 0)?.toString().orEmpty()
    val after = connection.getTextAfterCursor(MAX_BUFFER, 0)?.toString().orEmpty()
    return (before + after).trim()
  }

  private fun removeComposerText(
    connection: InputConnection,
    beforeLength: Int,
    afterLength: Int,
    bufferLength: Int,
  ): Boolean {
    connection.beginBatchEdit()
    var removed = connection.deleteSurroundingText(beforeLength, afterLength)
    if (!removed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      removed = connection.deleteSurroundingTextInCodePoints(beforeLength, afterLength)
    }
    if (!removed) {
      connection.setSelection(0, bufferLength)
      removed = connection.commitText("", 1)
    }
    connection.endBatchEdit()
    if (removed) {
      val remaining = connection.getTextBeforeCursor(MAX_BUFFER, 0)?.toString().orEmpty() +
        connection.getTextAfterCursor(MAX_BUFFER, 0)?.toString().orEmpty()
      if (remaining.trim().length >= MIN_BUFFER) {
        GuardLog.ime("withhold.partial", "pkg=${targetPackage ?: "-"} remaining=${remaining.trim().length}")
        return false
      }
    }
    return removed
  }

  private fun releaseWithheldText() {
    val text = withheldText ?: return
    currentInputConnection?.commitText(text, 1)
    withheldText = null
    clearGuardState()
    gateView?.showIdle(true)
    GuardLog.ime("release", "pkg=${targetPackage ?: "-"} len=${text.length}")
    performEditorSend(currentInputConnection ?: return)
  }

  private fun discardWithheldText() {
    withheldText ?: return
    withheldText = null
    clearGuardState()
    gateView?.showIdle(true)
    GuardLog.ime("discard", "pkg=${targetPackage ?: "-"}")
    Toast.makeText(this, "EraseAI discarded the risky text.", Toast.LENGTH_SHORT).show()
  }

  private fun sanitizeWithheldText() {
    val text = withheldText ?: return
    val redacted = LocalRiskScanner.redact(text)

    currentInputConnection?.commitText(redacted, 1)
    withheldText = null
    clearGuardState()
    protectedAppsStore.saveLastScanSummary("Sanitized prompt", "redact")
    gateView?.showIdle(true)
    GuardLog.ime("sanitize", "pkg=${targetPackage ?: "-"} len=${redacted.length}")
    performEditorSend(currentInputConnection ?: return)
  }

  private fun clearGuardState() {
    GuardStateStore.clearImeState()
    GuardStateStore.setArmed(null)
  }

  override fun onFinishInputView(finishingInput: Boolean) {
    super.onFinishInputView(finishingInput)
    withheldText = null
    clearGuardState()
  }

  override fun onDestroy() {
    rootLayout = null
    gateView = null
    keyboardView = null
    super.onDestroy()
  }

  private companion object {
    const val MAX_BUFFER = 5000
    const val MIN_BUFFER = 3
  }
}
