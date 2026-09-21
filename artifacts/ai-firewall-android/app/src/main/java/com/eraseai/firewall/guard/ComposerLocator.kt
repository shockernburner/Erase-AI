package com.eraseai.firewall.guard

import android.accessibilityservice.AccessibilityService
import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Finds the AI app's composer across *all* interactive windows.
 *
 * `rootInActiveWindow` is not enough: Gemini renders its composer as a floating pill in a
 * separate window, so reading only the active window intermittently returns empty text and
 * makes the guard tear down its protection mid-typing.
 */
object ComposerLocator {

  data class ComposerTarget(
    val editable: AccessibilityNodeInfo,
    val root: AccessibilityNodeInfo,
    val sendNode: AccessibilityNodeInfo?,
    /** Bounds of the whole composer action row (send + mic + attach), not a single icon. */
    val actionRow: Rect,
    /**
     * The submit band only. Covering this instead of the whole row blocks every way to send
     * while leaving the text line tappable, so a user who cancels can still edit their draft.
     */
    val submitZone: Rect,
    val windowId: Int,
    val text: String,
  )

  fun locate(service: AccessibilityService, packageName: String): ComposerTarget? {
    val roots = candidateRoots(service, packageName)
    var fallback: ComposerTarget? = null

    roots.forEach { root ->
      val editable = AppSendAdapter.findComposerEditable(root) ?: return@forEach
      if (editable.isPassword) return@forEach
      val text = AppSendAdapter.composerText(root)
      val sendNode = AppSendAdapter.findSendButton(root, packageName)
      val row = actionRowBounds(editable, sendNode)
      val target = ComposerTarget(
        editable = editable,
        root = root,
        sendNode = sendNode,
        actionRow = row,
        submitZone = submitZoneBounds(row, sendNode),
        windowId = root.windowId,
        text = text,
      )
      // A window can expose an empty composer clone; prefer the one that actually has text.
      if (text.isNotEmpty()) {
        GuardLog.window(packageName, target.windowId, roots.size, found = true)
        return target
      }
      if (fallback == null) fallback = target
    }

    GuardLog.window(packageName, fallback?.windowId ?: -1, roots.size, found = fallback != null)
    return fallback
  }

  private fun candidateRoots(
    service: AccessibilityService,
    packageName: String,
  ): List<AccessibilityNodeInfo> {
    val roots = mutableListOf<AccessibilityNodeInfo>()
    // Active window first so the common case stays cheap.
    service.rootInActiveWindow
      ?.takeIf { it.packageName?.toString() == packageName }
      ?.let { roots.add(it) }

    runCatching {
      service.windows.forEach { window ->
        val root = window.root ?: return@forEach
        if (root.packageName?.toString() != packageName) return@forEach
        if (roots.none { it.windowId == root.windowId }) roots.add(root)
      }
    }
    return roots
  }

  /**
   * The action row is the composer's nearest ancestor that is meaningfully wider than the
   * editable itself — that container holds send, mic and attach. Covering the row is far more
   * robust than covering one icon whose bounds we can rarely resolve in Gemini or ChatGPT.
   */
  private fun actionRowBounds(
    editable: AccessibilityNodeInfo,
    sendNode: AccessibilityNodeInfo?,
  ): Rect {
    val editableBounds = Rect().also { editable.getBoundsInScreen(it) }
    val row = Rect(editableBounds)

    sendNode?.let { send ->
      val sendBounds = Rect().also { send.getBoundsInScreen(it) }
      if (!sendBounds.isEmpty) row.union(sendBounds)
    }

    var parent = editable.parent
    var depth = 0
    while (parent != null && depth < 4) {
      val bounds = Rect().also { parent!!.getBoundsInScreen(it) }
      val growsSideways = bounds.width() > row.width()
      val staysHorizontal = bounds.height() <= editableBounds.height() * 3
      if (!bounds.isEmpty && growsSideways && staysHorizontal) row.union(bounds)
      parent = parent.parent
      depth++
    }
    return row
  }

  /**
   * Everything from the top of the send control to the bottom of the row. Mic, attach and send
   * sit on that band together. When the send control cannot be resolved we cover the whole row,
   * because an unidentified submit affordance must not be left exposed.
   */
  private fun submitZoneBounds(row: Rect, sendNode: AccessibilityNodeInfo?): Rect {
    val send = sendNode?.let { node -> Rect().also { node.getBoundsInScreen(it) } }
    if (send == null || send.isEmpty) return Rect(row)
    val top = send.top.coerceIn(row.top, row.bottom)
    val zone = Rect(row.left, top, row.right, row.bottom)
    // A degenerate band would leave send reachable; fall back to the full row.
    return if (zone.height() < send.height() / 2) Rect(row) else zone
  }
}
