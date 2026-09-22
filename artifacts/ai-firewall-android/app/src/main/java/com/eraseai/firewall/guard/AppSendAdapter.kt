package com.eraseai.firewall.guard

import android.graphics.Rect
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
   * True if this click looks like a send. Used for telemetry only — accessibility click
   * events arrive after the host app already submitted, so this can never block a send.
   * Blocking is the [SendCurtain]'s job.
   */
  fun isSendClick(node: AccessibilityNodeInfo?, packageName: String): Boolean {
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
    root.findSendNode(packageName)?.let { return it }
    return findSendByGeometry(root, packageName)
  }

  /**
   * Last resort for send controls that carry no label at all.
   *
   * Gemini's send arrow exposes no text, no content description and no view id, so every
   * name-based rule misses it. Without a node there is nothing to click, which silently
   * breaks Sanitize & Send and Send Anyway. Icons sit in a trailing row beside the composer,
   * and send is conventionally the last of them, so take the right-most icon-sized clickable
   * that shares the composer's band and is not recognisable as mic or attach.
   */
  private fun findSendByGeometry(
    root: AccessibilityNodeInfo,
    packageName: String,
  ): AccessibilityNodeInfo? {
    val editable = findComposerEditable(root) ?: return null
    val editableBounds = Rect().also { editable.getBoundsInScreen(it) }
    if (editableBounds.isEmpty) return null

    val maxIconSide = editableBounds.height().coerceAtLeast(MIN_ICON_SIDE) * 2
    var best: AccessibilityNodeInfo? = null
    var bestRight = Int.MIN_VALUE

    root.forEachNode { node ->
      if (!node.isClickable || !node.isEnabled || node.isEditable) return@forEachNode
      if (isExcludedComposerChrome(nodeHaystack(node))) return@forEachNode
      val bounds = Rect().also { node.getBoundsInScreen(it) }
      if (bounds.isEmpty) return@forEachNode
      // Icon-sized and roughly square, so containers and the text line are ruled out.
      if (bounds.width() > maxIconSide || bounds.height() > maxIconSide) return@forEachNode
      if (bounds.width() < MIN_ICON_SIDE || bounds.height() < MIN_ICON_SIDE) return@forEachNode
      if (bounds.width() > bounds.height() * 2 || bounds.height() > bounds.width() * 2) return@forEachNode
      // On the composer's band, and at or past its trailing edge.
      if (bounds.centerY() < editableBounds.top || bounds.centerY() > editableBounds.bottom + maxIconSide) {
        return@forEachNode
      }
      if (bounds.centerX() <= editableBounds.centerX()) return@forEachNode
      if (bounds.right > bestRight) {
        bestRight = bounds.right
        best = node
      }
    }
    if (best != null) GuardLog.gate("send-node.geometry", packageName, "right=$bestRight")
    return best
  }

  private inline fun AccessibilityNodeInfo.forEachNode(action: (AccessibilityNodeInfo) -> Unit) {
    val queue = ArrayDeque<AccessibilityNodeInfo>()
    queue.add(this)
    var visited = 0
    while (queue.isNotEmpty() && visited < MAX_NODES_SCANNED) {
      val node = queue.removeFirst()
      visited++
      action(node)
      for (index in 0 until node.childCount) {
        queue.add(node.getChild(index) ?: continue)
      }
    }
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

  /** Smallest plausible icon touch target, in px; below this we are looking at a divider. */
  private const val MIN_ICON_SIDE = 48
  private const val MAX_NODES_SCANNED = 600
  private const val CLICKABLE_ANCESTOR_DEPTH = 4

  private fun AccessibilityNodeInfo.findSendNode(packageName: String): AccessibilityNodeInfo? {
    if (isSendButton(this, packageName)) {
      clickableSelfOrAncestor()?.let { return it }
    }
    for (index in 0 until childCount) {
      val child = getChild(index) ?: continue
      val found = child.findSendNode(packageName)
      if (found != null) return found
    }
    return null
  }

  /**
   * Resolves a label to the node that can actually take the click.
   *
   * Gemini's composer puts `content-desc="Send"` on an inner, non-clickable `View` and the
   * click handler on an unlabeled ancestor. Returning the labelled node looked like success
   * but every ACTION_CLICK against it failed, which is what broke Sanitize & Send and
   * Send Anyway while leaving no obvious symptom beyond "nothing happens".
   */
  private fun AccessibilityNodeInfo.clickableSelfOrAncestor(): AccessibilityNodeInfo? {
    var current: AccessibilityNodeInfo? = this
    var depth = 0
    while (current != null && depth < CLICKABLE_ANCESTOR_DEPTH) {
      if (current.isClickable && current.isEnabled) return current
      current = current.parent
      depth++
    }
    return null
  }
}
