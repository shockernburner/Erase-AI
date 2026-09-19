package com.eraseai.firewall.guard

import android.os.Build
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Per-app heuristics for locating composer fields and send controls in native LLM apps.
 * Mirrors the extension's platform adapters (ChatGPT, Claude, Gemini first).
 */
object AppSendAdapter {
  fun isSendButton(node: AccessibilityNodeInfo, packageName: String): Boolean {
    val className = node.className?.toString().orEmpty()
    if (className.contains("EditText", ignoreCase = true)) return false
    if (node.isEditable) return false

    val haystack = nodeHaystack(node)
    if (haystack.isBlank()) return false
    if (isExcludedComposerChrome(haystack)) return false

    packageHints(packageName).forEach { hint ->
      if (haystack.contains(hint)) return true
    }

    if (haystack.contains(" send ") || haystack.startsWith("send ") || haystack.endsWith(" send") || haystack == "send") {
      return !haystack.contains("sender")
    }
    if (haystack.contains("submit")) return true
    return false
  }

  /**
   * True if this click should trigger the send gate.
   * Gemini often uses an unlabeled / waveform / arrow control once text is present.
   */
  fun isSendClick(
    node: AccessibilityNodeInfo?,
    packageName: String,
    composerHasSendableText: Boolean = false,
  ): Boolean {
    var current = node
    var depth = 0
    while (current != null && depth < 6) {
      if (isSendButton(current, packageName)) return true
      if ((current.isClickable || current.isEnabled) && looksLikeSendIcon(current, packageName)) {
        return true
      }
      current = current.parent
      depth++
    }

    if (composerHasSendableText && isGeminiFamily(packageName)) {
      return isGeminiPrimaryActionWhileTyping(node)
    }
    return false
  }

  fun findComposerEditable(root: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
    if (root == null) return null
    val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
    if (focused != null && focused.isEditable && !focused.isPassword) return focused
    return root.findEditableNode()
  }

  fun composerText(root: AccessibilityNodeInfo?): String {
    val node = findComposerEditable(root) ?: return ""
    val raw = node.text?.toString()?.trim().orEmpty()
    if (raw.isBlank()) return ""
    val hint = if (Build.VERSION.SDK_INT >= 26) {
      node.hintText?.toString()?.trim().orEmpty()
    } else {
      ""
    }
    // Gemini placeholder ("Ask Gemini") is often exposed as text before the user types.
    if (hint.isNotBlank() && raw.equals(hint, ignoreCase = true)) return ""
    if (raw.equals("Ask Gemini", ignoreCase = true) || raw.startsWith("Ask Gem", ignoreCase = true)) return ""
    return raw
  }

  fun findSendButton(root: AccessibilityNodeInfo?, packageName: String): AccessibilityNodeInfo? {
    if (root == null) return null
    return root.findSendNode(packageName)
  }

  private fun isGeminiPrimaryActionWhileTyping(node: AccessibilityNodeInfo?): Boolean {
    var current = node
    var depth = 0
    while (current != null && depth < 5) {
      if (current.isClickable) {
        val haystack = nodeHaystack(current)
        if (isExcludedComposerChrome(haystack)) return false
        val className = current.className?.toString().orEmpty()
        val looksLikeAction =
          className.contains("Button", ignoreCase = true) ||
            className.contains("ImageView", ignoreCase = true) ||
            className.contains("ImageButton", ignoreCase = true) ||
            haystack.contains("send") ||
            haystack.contains("submit") ||
            haystack.contains("arrow") ||
            // Gemini frequently exposes an unlabeled circular send control.
            (haystack.isBlank() && current.childCount <= 2)
        if (looksLikeAction) return true
      }
      current = current.parent
      depth++
    }
    return false
  }

  private fun looksLikeSendIcon(node: AccessibilityNodeInfo, packageName: String): Boolean {
    if (!isGeminiFamily(packageName) && packageName != "com.openai.chatgpt") return false
    if (!node.isClickable) return false
    val haystack = nodeHaystack(node)
    if (isExcludedComposerChrome(haystack)) return false
    return haystack.contains("arrow") || haystack.contains("send") || haystack.contains("submit")
  }

  private fun isExcludedComposerChrome(haystack: String): Boolean {
    // Do not treat unlabeled Gemini send (often blank / "Send") as chrome.
    if (haystack.isBlank() || haystack == "send" || haystack.contains("submit")) return false
    val excluded = listOf(
      "microphone", "mic", "speak", "camera", "photo", "image",
      "attach", "attachment", "gallery", "plus", "add", "new chat",
      "keyboard", "tools", "menu", "more", "share", "listen",
      "voice input", "voice mode",
    )
    return excluded.any { haystack.contains(it) }
  }

  private fun nodeHaystack(node: AccessibilityNodeInfo): String {
    val text = node.text?.toString().orEmpty()
    val description = node.contentDescription?.toString().orEmpty()
    val viewId = node.viewIdResourceName.orEmpty()
    val tooltip = if (Build.VERSION.SDK_INT >= 28) {
      node.tooltipText?.toString().orEmpty()
    } else {
      ""
    }
    val hint = if (Build.VERSION.SDK_INT >= 26) {
      node.hintText?.toString().orEmpty()
    } else {
      ""
    }
    return "$text $description $viewId $tooltip $hint".lowercase().trim()
  }

  private fun isGeminiFamily(packageName: String): Boolean =
    packageName == "com.google.android.apps.bard" ||
      packageName == "com.google.android.googlequicksearchbox"

  private fun packageHints(packageName: String): List<String> = when (packageName) {
    "com.openai.chatgpt" -> listOf(
      "send prompt",
      "send message",
      "send-button",
      "fruitjuice-send",
      "sendbutton",
    )
    "com.anthropic.claude" -> listOf("send message", "send")
    "com.google.android.apps.bard",
    "com.google.android.googlequicksearchbox" -> listOf(
      "send message",
      "send prompt",
      "submit",
      "send",
      "arrow",
    )
    "com.microsoft.copilot",
    "com.microsoft.bing" -> listOf("send", "submit")
    "com.replit.app" -> listOf("send")
    "com.perplexity.app" -> listOf("send", "submit")
    else -> listOf("send", "submit")
  }

  private fun AccessibilityNodeInfo.findEditableNode(): AccessibilityNodeInfo? {
    if (isEditable && !isPassword) return this
    for (index in 0 until childCount) {
      val child = getChild(index) ?: continue
      val found = child.findEditableNode()
      if (found != null) return found
    }
    return null
  }

  private fun AccessibilityNodeInfo.findSendNode(packageName: String): AccessibilityNodeInfo? {
    if (isSendButton(this, packageName) && (isClickable || isEnabled)) return this
    for (index in 0 until childCount) {
      val child = getChild(index) ?: continue
      val found = child.findSendNode(packageName)
      if (found != null) return found
    }
    return null
  }
}
