package com.eraseai.firewall.guard

import android.graphics.Rect
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Pulls the fullest composer draft available from the accessibility tree and events.
 *
 * ChatGPT/Gemini often keep the real draft in a WebView where the focused node's [text]
 * lags behind or stays empty after paste, so the editable's own descendants and the
 * TEXT_CHANGED payload are read as well.
 *
 * Every candidate is confined to the located composer. An earlier version took the longest
 * text anywhere in the lower screen, which is the assistant's reply bubble in any real
 * conversation: a key typed under a long answer was never scanned, and a reply that quoted an
 * email address held the curtain over every later send.
 */
object ComposerTextExtractor {

  fun bestText(
    editable: AccessibilityNodeInfo,
    editableText: String,
    event: AccessibilityEvent? = null,
  ): String {
    val composerBounds = Rect().also { editable.getBoundsInScreen(it) }
    val fromEvent = if (isComposerTextEvent(event, composerBounds)) textFromEvent(event) else ""
    val fromTree = textWithin(editable)
    return pickDraft(listOf(fromEvent, fromTree, editableText))
  }

  /** All candidates already belong to the composer, so the fullest one is the live draft. */
  internal fun pickDraft(candidates: List<String>): String =
    candidates.maxByOrNull { it.length }.orEmpty()

  /** Only a text change raised by the composer itself carries the draft. */
  private fun isComposerTextEvent(event: AccessibilityEvent?, composerBounds: Rect): Boolean {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) return false
    if (composerBounds.isEmpty) return false
    val source = event.source ?: return false
    val sourceBounds = Rect().also { source.getBoundsInScreen(it) }
    return !sourceBounds.isEmpty && Rect.intersects(sourceBounds, composerBounds)
  }

  private fun textFromEvent(event: AccessibilityEvent?): String {
    if (event == null) return ""
    val chunks = event.text?.mapNotNull { it?.toString()?.trim() }.orEmpty()
    val joined = chunks.joinToString("").trim()
    if (joined.isNotBlank()) {
      return AppSendAdapter.liveComposerText(joined)
    }
    val before = event.beforeText?.toString()?.trim().orEmpty()
    return AppSendAdapter.liveComposerText(before)
  }

  /** Longest non-placeholder text on the editable or any of its descendants. */
  private fun textWithin(editable: AccessibilityNodeInfo): String {
    var best = ""
    editable.forEachNode { node ->
      if (node.isPassword) return@forEachNode
      val live = AppSendAdapter.liveComposerText(node.text?.toString().orEmpty())
      if (live.length > best.length) best = live
    }
    return best
  }

  private inline fun AccessibilityNodeInfo.forEachNode(action: (AccessibilityNodeInfo) -> Unit) {
    val queue = ArrayDeque<AccessibilityNodeInfo>()
    queue.add(this)
    var visited = 0
    while (queue.isNotEmpty() && visited < MAX_NODES) {
      val node = queue.removeFirst()
      visited++
      action(node)
      for (index in 0 until node.childCount) {
        queue.add(node.getChild(index) ?: continue)
      }
    }
  }

  private const val MAX_NODES = 200
}
