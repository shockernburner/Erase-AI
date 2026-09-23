package com.eraseai.firewall.guard

import android.graphics.Rect
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Pulls the fullest composer draft available from the accessibility tree and events.
 *
 * ChatGPT/Gemini often keep the real draft in a WebView where the focused node's [text]
 * lags behind or stays empty after paste. Pasted AWS keys were slipping through because
 * [AppSendAdapter.composerText] only read that one node.
 */
object ComposerTextExtractor {

  fun bestText(
    root: AccessibilityNodeInfo?,
    screenHeight: Int,
    event: AccessibilityEvent? = null,
  ): String {
    val fromEvent = textFromEvent(event)
    val fromTree = textFromTree(root, screenHeight)
    val fromFocused = root?.let { AppSendAdapter.composerText(it) }.orEmpty()
    return listOf(fromEvent, fromTree, fromFocused)
      .maxByOrNull { it.length }
      .orEmpty()
  }

  fun textFromEvent(event: AccessibilityEvent?): String {
    if (event == null) return ""
    val chunks = event.text?.mapNotNull { it?.toString()?.trim() }.orEmpty()
    val joined = chunks.joinToString("").trim()
    if (joined.isNotBlank()) {
      return AppSendAdapter.liveComposerText(joined)
    }
    val before = event.beforeText?.toString()?.trim().orEmpty()
    return AppSendAdapter.liveComposerText(before)
  }

  private fun textFromTree(root: AccessibilityNodeInfo?, screenHeight: Int): String {
    if (root == null || screenHeight <= 0) return ""
    val composerBandTop = (screenHeight * 0.35f).toInt()
    var best = ""
    root.forEachNode { node ->
      if (node.isPassword) return@forEachNode
      val bounds = Rect().also { node.getBoundsInScreen(it) }
      if (bounds.isEmpty || bounds.bottom < composerBandTop) return@forEachNode
      val candidates = buildList {
        node.text?.toString()?.trim()?.let { add(it) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          node.hintText?.toString()?.trim()?.let { add(it) }
        }
        node.contentDescription?.toString()?.trim()?.let { add(it) }
      }
      candidates.forEach { raw ->
        val live = AppSendAdapter.liveComposerText(raw)
        if (live.length > best.length) best = live
      }
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

  private const val MAX_NODES = 800
}
