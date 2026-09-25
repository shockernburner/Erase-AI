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

  fun findComposerEditable(root: AccessibilityNodeInfo?, screenHeight: Int = 0): AccessibilityNodeInfo? {
    if (root == null) return null
    // ChatGPT's Compose field takes input focus without isEditable=true. Requiring
    // isEditable here made locate() return null in a real conversation, which dropped
    // the curtain and looked exactly like the firewall having been switched off.
    val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
    if (focused != null && !focused.isPassword && focusedInComposerBand(focused, screenHeight)) {
      return focused
    }

    var best: AccessibilityNodeInfo? = null
    var bestScore = 0
    root.forEachNode { node ->
      val score = composerScore(node, screenHeight)
      if (score > bestScore) {
        bestScore = score
        best = node
      }
    }
    return best
  }

  /** Ignore search/history fields at the top when the real composer is in the lower half. */
  private fun focusedInComposerBand(node: AccessibilityNodeInfo, screenHeight: Int): Boolean {
    if (screenHeight <= 0) return true
    val bounds = Rect().also { node.getBoundsInScreen(it) }
    if (bounds.isEmpty) return true
    return bounds.bottom >= screenHeight * 0.45f
  }

  fun composerText(root: AccessibilityNodeInfo?): String {
    val node = findComposerEditable(root) ?: return ""
    return editableText(node)
  }

  /** Draft text of an already-located composer, with the host placeholder filtered out. */
  fun editableText(node: AccessibilityNodeInfo): String {
    val raw = node.text?.toString()?.trim().orEmpty()
    val hint = if (Build.VERSION.SDK_INT >= 26) {
      node.hintText?.toString()?.trim().orEmpty()
    } else {
      ""
    }
    return liveComposerText(raw, hint)
  }

  /**
   * The host's placeholder is often exposed as the node's text before anything is typed.
   * Scanning it would either false-positive or, more often, look like an empty composer
   * and stand the guard down.
   */
  fun liveComposerText(raw: String, hint: String = ""): String {
    val text = raw.trim()
    if (text.isEmpty()) return ""
    if (hint.isNotBlank() && text.equals(hint.trim(), ignoreCase = true)) return ""
    if (isComposerPlaceholder(text)) return ""
    return text
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

  private val COMPOSER_PLACEHOLDERS = listOf(
    "ask gemini",
    "ask gem",
    "ask anything",
    "ask chatgpt",
    "message chatgpt",
    "message claude",
    "ask claude",
    "chat with claude",
    "reply to claude",
    "reply to chatgpt",
    "ask copilot",
    "message",
  )

  private val COMPOSER_HINT_MARKERS = listOf(
    "ask gemini",
    "ask anything",
    "ask chatgpt",
    "message chatgpt",
    "prompt",
    "composer",
  )

  private fun composerScore(node: AccessibilityNodeInfo, screenHeight: Int = 0): Int {
    if (node.isPassword) return 0
    var score = 0
    if (node.isEditable) score += 20
    val className = node.className?.toString().orEmpty()
    if (className.contains("EditText", ignoreCase = true)) score += 16
    val haystack = nodeHaystack(node)
    if (COMPOSER_HINT_MARKERS.any { haystack.contains(it) }) score += 18
    if (node.isFocused) score += 12
    if (score == 0) return 0
    // Composer sits at the bottom of the conversation; search boxes sit at the top.
    val bounds = Rect().also { node.getBoundsInScreen(it) }
    if (!bounds.isEmpty) {
      score += bounds.bottom / 40
      if (screenHeight > 0 && bounds.bottom < screenHeight * 0.35f) score -= 40
    }
    return score
  }

  private fun isComposerPlaceholder(value: String): Boolean {
    // Hosts end placeholders with "…" or "..." ("Chat with Claude…", "Reply to ChatGPT").
    val normalized = value.trim().lowercase().trimEnd('…', '.').trim()
    if (normalized.isEmpty()) return true
    if (COMPOSER_PLACEHOLDERS.contains(normalized)) return true
    // Gemini sometimes truncates the placeholder in the accessibility tree.
    if (normalized.startsWith("ask gem") && normalized.length <= 12) return true
    return false
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
