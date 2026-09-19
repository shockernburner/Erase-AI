package com.eraseai.firewall.guard

import android.os.Build
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Per-app heuristics for locating composer fields and send controls in native LLM apps.
 * Mirrors the extension's platform adapters (ChatGPT, Claude, Gemini first).
 */
object AppSendAdapter {
  fun isSendButton(node: AccessibilityNodeInfo, packageName: String): Boolean {
    // Prefer clickable controls; Gemini sometimes nests the label on a non-clickable child.
    val className = node.className?.toString().orEmpty()
    if (className.contains("EditText", ignoreCase = true)) return false
    if (node.isEditable) return false

    val haystack = nodeHaystack(node)
    if (haystack.isBlank()) return false

    packageHints(packageName).forEach { hint ->
      if (haystack.contains(hint)) return true
    }

    if (haystack.contains(" send ") || haystack.startsWith("send ") || haystack.endsWith(" send") || haystack == "send") {
      return !haystack.contains("sender")
    }
    if (haystack.contains("submit")) return true
    return false
  }

  /** True if [node] or any ancestor looks like a send control (Gemini icon taps). */
  fun isSendClick(node: AccessibilityNodeInfo?, packageName: String): Boolean {
    var current = node
    var depth = 0
    while (current != null && depth < 6) {
      if (isSendButton(current, packageName)) return true
      // Clickable container near composer often wraps an unlabeled arrow icon.
      if ((current.isClickable || current.isEnabled) && looksLikeSendIcon(current, packageName)) {
        return true
      }
      current = current.parent
      depth++
    }
    return false
  }

  fun findComposerEditable(root: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
    if (root == null) return null
    val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
    if (focused != null && focused.isEditable && !focused.isPassword) return focused
    return root.findEditableNode()
  }

  fun findSendButton(root: AccessibilityNodeInfo?, packageName: String): AccessibilityNodeInfo? {
    if (root == null) return null
    return root.findSendNode(packageName)
  }

  private fun looksLikeSendIcon(node: AccessibilityNodeInfo, packageName: String): Boolean {
    if (!isGeminiFamily(packageName) && packageName != "com.openai.chatgpt") return false
    if (!node.isClickable) return false
    val haystack = nodeHaystack(node)
    // Gemini/ChatGPT often use icon buttons labeled Send / Submit / arrow (not plain "Send" text).
    return haystack.contains("arrow") || haystack.contains("send") || haystack.contains("submit")
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
