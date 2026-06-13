package com.eraseai.firewall.guard

import android.accessibilityservice.AccessibilityService
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.eraseai.firewall.MainActivity
import com.eraseai.firewall.data.ApiClient
import com.eraseai.firewall.data.ApiError
import com.eraseai.firewall.data.MobileSessionStore
import com.eraseai.firewall.data.ProtectedAppsStore
import com.eraseai.firewall.data.ScanApi
import com.eraseai.firewall.data.ScanFinding
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
  private var pendingRunnable: Runnable? = null
  private val lastTextHashByPackage = mutableMapOf<String, String>()
  private val ignoredOnceHashes = mutableSetOf<String>()
  private val lastScanAtByPackage = mutableMapOf<String, Long>()
  private var activeNode: AccessibilityNodeInfo? = null
  private var overlayView: View? = null
  private var overlayText: String? = null
  private var overlayPackageName: String? = null
  private var sessionPromptShown = false

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

    val eventType = event.eventType
    if (eventType !in setOf(
        AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED,
        AccessibilityEvent.TYPE_VIEW_FOCUSED,
        AccessibilityEvent.TYPE_VIEW_CLICKED,
        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
        AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED,
      )
    ) return

    val node = rootInActiveWindow?.findEditableNode() ?: return
    if (node.isPassword || node.text.isNullOrBlank()) return
    val text = node.text.toString().trim().take(MAX_SCAN_TEXT_LENGTH)
    if (text.length < MIN_SCAN_LENGTH) return

    activeNode = node
    scheduleScan(text, packageName)
  }

  override fun onInterrupt() {
    removeOverlay()
  }

  override fun onDestroy() {
    removeOverlay()
    handler.removeCallbacksAndMessages(null)
    activeNode = null
    overlayText = null
    serviceScope.cancel()
    super.onDestroy()
  }

  private fun scheduleScan(text: String, packageName: String) {
    pendingRunnable?.let { handler.removeCallbacks(it) }
    pendingRunnable = Runnable {
      val hash = text.sha256()
      val hashKey = "$packageName:$hash"
      if (ignoredOnceHashes.remove(hashKey)) return@Runnable
      if (hash == lastTextHashByPackage[packageName]) return@Runnable
      val now = System.currentTimeMillis()
      if (now - (lastScanAtByPackage[packageName] ?: 0L) < MIN_SCAN_INTERVAL_MS) return@Runnable
      lastTextHashByPackage[packageName] = hash
      lastScanAtByPackage[packageName] = now
      serviceScope.launch {
        scanApi.scan(
          text = text,
          source = "android_accessibility",
          targetPackage = packageName,
          targetName = packageName,
        ).onSuccess { result ->
          protectedAppsStore.saveLastScanSummary(result.summary(), result.diagnosticsType())
          if (result.findings.isNotEmpty()) {
            showOverlay(originalText = text, packageName = packageName, textHash = hash, result = result)
          }
        }.onFailure { err ->
          protectedAppsStore.saveLastErrorCategory(err.errorCategory())
          if (err is ApiError.Unauthorized) {
            if (!sessionPromptShown) {
              sessionPromptShown = true
              Toast.makeText(this@AiGuardAccessibilityService, "Sign in to EraseAI to keep firewall scanning active", Toast.LENGTH_LONG).show()
            }
          } else {
            Toast.makeText(this@AiGuardAccessibilityService, "EraseAI scan unavailable", Toast.LENGTH_SHORT).show()
          }
        }
      }
    }
    handler.postDelayed(pendingRunnable!!, SCAN_DEBOUNCE_MS)
  }

  private fun showOverlay(originalText: String, packageName: String, textHash: String, result: ScanResult) {
    removeOverlay()
    overlayText = originalText
    overlayPackageName = packageName

    val summary = result.findings
      .take(3)
      .joinToString { "${it.label} (${it.type})" }
      .ifBlank { "sensitive data" }

    val container = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(28, 24, 28, 24)
      setBackgroundColor(0xFDF8FAFC.toInt())
      elevation = 12f
    }

    val title = TextView(this).apply {
      text = "Sensitive data detected"
      textSize = 18f
      setTextColor(0xFF0F172A.toInt())
    }
    val body = TextView(this).apply {
      text = "EraseAI found $summary in this prompt."
      textSize = 14f
      setTextColor(0xFF334155.toInt())
      setPadding(0, 8, 0, 12)
    }

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.END
    }

    actions.addView(Button(this).apply {
      text = "Redact"
      setOnClickListener { redactAndReplace(result.findings) }
    })
    actions.addView(Button(this).apply {
      text = "Copy Safe Text"
      setOnClickListener { redactAndCopy(result.findings) }
    })
    actions.addView(Button(this).apply {
      text = "Ignore Once"
      setOnClickListener {
        ignoredOnceHashes.add("$packageName:$textHash")
        removeOverlay()
      }
    })
    actions.addView(Button(this).apply {
      text = "Open Details"
      setOnClickListener { openDetails() }
    })

    container.addView(title)
    container.addView(body)
    container.addView(actions)

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
      y = 80
      width = WindowManager.LayoutParams.MATCH_PARENT
    }

    getSystemService(WindowManager::class.java).addView(container, params)
    overlayView = container
  }

  private fun redactAndReplace(findings: List<ScanFinding>) {
    val originalText = overlayText ?: return
    serviceScope.launch {
      scanApi.rewrite(originalText, findings)
        .onSuccess { rewritten ->
          val node = activeNode
          val replaced = node?.performAction(
            AccessibilityNodeInfo.ACTION_SET_TEXT,
            Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, rewritten) },
          ) ?: false
          if (!replaced) {
            copyText(rewritten)
            Toast.makeText(this@AiGuardAccessibilityService, "Safe text copied. Paste it into the field.", Toast.LENGTH_LONG).show()
          }
          protectedAppsStore.saveLastScanSummary("Redacted sensitive prompt", "redact")
          removeOverlay()
        }
        .onFailure {
          protectedAppsStore.saveLastErrorCategory("entitlement")
          Toast.makeText(this@AiGuardAccessibilityService, "Redaction requires an active EraseAI plan", Toast.LENGTH_LONG).show()
        }
    }
  }

  private fun redactAndCopy(findings: List<ScanFinding>) {
    val originalText = overlayText ?: return
    serviceScope.launch {
      scanApi.rewrite(originalText, findings)
        .onSuccess { rewritten ->
          copyText(rewritten)
          protectedAppsStore.saveLastScanSummary("Copied safe text", "redact")
          Toast.makeText(this@AiGuardAccessibilityService, "Safe text copied", Toast.LENGTH_SHORT).show()
          removeOverlay()
        }
        .onFailure {
          protectedAppsStore.saveLastErrorCategory("entitlement")
          Toast.makeText(this@AiGuardAccessibilityService, "Safe copy requires an active EraseAI plan", Toast.LENGTH_LONG).show()
        }
    }
  }

  private fun copyText(text: String) {
    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("EraseAI safe text", text))
  }

  private fun openDetails() {
    val intent = Intent(this, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    startActivity(intent)
    removeOverlay()
  }

  private fun removeOverlay() {
    overlayView?.let { overlay ->
      runCatching { getSystemService(WindowManager::class.java).removeView(overlay) }
    }
    overlayView = null
    overlayText = null
    overlayPackageName = null
    activeNode = null
  }

  private fun shouldSkipSystemSurface(packageName: String): Boolean {
    // Privacy boundary: the service only scans user-selected app text entry. It
    // never acts on Android system surfaces such as lock screen or notification
    // shade, and banking/browser/password-manager packages are not in the
    // default protected set. Users must explicitly select any non-default app.
    return packageName == "com.android.systemui" || packageName == applicationContext.packageName
  }

  private fun AccessibilityNodeInfo.findEditableNode(): AccessibilityNodeInfo? {
    if (isEditable && !isPassword && !text.isNullOrBlank()) return this
    for (index in 0 until childCount) {
      val child = getChild(index) ?: continue
      val found = child.findEditableNode()
      if (found != null) return found
    }
    return null
  }

  private fun String.sha256(): String {
    val bytes = MessageDigest.getInstance("SHA-256").digest(toByteArray())
    return bytes.joinToString("") { "%02x".format(it) }
  }

  private fun ScanResult.summary(): String = when {
    findings.isEmpty() -> "Allowed"
    action == "block" -> "Blocked sensitive prompt"
    action == "redact" -> "Redaction recommended"
    else -> "Warning shown"
  }

  private fun ScanResult.diagnosticsType(): String = when {
    findings.isEmpty() -> "allow"
    action == "block" -> "block"
    action == "redact" -> "redact"
    else -> "warn"
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
    private const val SCAN_DEBOUNCE_MS = 900L
    private const val MIN_SCAN_INTERVAL_MS = 2500L
    private const val MIN_SCAN_LENGTH = 8
    private const val MAX_SCAN_TEXT_LENGTH = 5000
  }
}
