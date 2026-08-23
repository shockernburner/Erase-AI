package com.eraseai.firewall.guard

import android.view.accessibility.AccessibilityNodeInfo

/**
 * Per-app heuristics for locating composer fields and send controls in native LLM apps.
 * Mirrors the extension's platform adapters (ChatGPT, Claude, Gemini first).
 */
object AppSendAdapter {
  fun isSendButton(node: AccessibilityNodeInfo, packageName: String): Boolean {
    if (!node.isClickable && !node.isEnabled) return false
    val className = node.className?.toString().orEmpty()
    if (className.contains("EditText", ignoreCase = true)) return false

    val text = node.text?.toString().orEmpty().trim()
    val description = node.contentDescription?.toString().orEmpty().trim()
    val viewId = node.viewIdResourceName.orEmpty().lowercase()
    val haystack = "$text $description $viewId".lowercase()

    packageHints(packageName).forEach { hint ->
      if (haystack.contains(hint)) return true
    }

    if (text.equals("send", ignoreCase = true)) return true
    if (description.contains("send", ignoreCase = true) && !description.contains("sender", ignoreCase = true)) {
      return true
    }
    if (viewId.contains("send") && !viewId.contains("sender")) return true
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

  private fun packageHints(packageName: String): List<String> = when (packageName) {
    "com.openai.chatgpt" -> listOf("send prompt", "send message", "send-button", "fruitjuice-send")
    "com.anthropic.claude" -> listOf("send message")
    "com.google.android.apps.bard",
    "com.google.android.googlequicksearchbox" -> listOf("send message", "send prompt")
    "com.microsoft.copilot",
    "com.microsoft.bing" -> listOf("send", "submit")
    "com.replit.app" -> listOf("send")
    "com.perplexity.app" -> listOf("send", "submit")
    else -> emptyList()
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
    if (isSendButton(this, packageName)) return this
    for (index in 0 until childCount) {
      val child = getChild(index) ?: continue
      val found = child.findSendNode(packageName)
      if (found != null) return found
    }
    return null
  }
}
