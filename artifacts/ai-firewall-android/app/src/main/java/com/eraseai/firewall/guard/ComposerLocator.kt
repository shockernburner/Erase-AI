package com.eraseai.firewall.guard

import android.accessibilityservice.AccessibilityService
import android.graphics.Rect
import android.graphics.Region
import android.graphics.RegionIterator
import android.os.Build
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo

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
    /** `geometry` when the band uses screen geometry; `resolved` when anchored to a send node. */
    val submitZoneMode: String,
    val windowId: Int,
    val text: String,
  )

  /** Last keyboard top written to the log, so the log shows each change once. */
  private var lastLoggedImeTop: Int? = -1
  private var lastLoggedImePieces: String? = null

  fun locate(service: AccessibilityService, packageName: String): ComposerTarget? {
    val dm = service.resources.displayMetrics
    val roots = candidateRoots(service, packageName)
    val imeTop = imeWindowTop(service)
    if (imeTop != lastLoggedImeTop) {
      lastLoggedImeTop = imeTop
      GuardLog.event("ime.top", packageName, "top=${imeTop ?: "none"}")
    }
    var fallback: ComposerTarget? = null

    roots.forEach { root ->
      val editable = AppSendAdapter.findComposerEditable(root, dm.heightPixels) ?: return@forEach
      if (editable.isPassword) return@forEach
      // Cached node bounds go stale when the keyboard lifts the composer without the host
      // raising a content change; measuring the cache put the band where send used to be.
      editable.refresh()
      val text = AppSendAdapter.editableText(editable)
      val sendNode = AppSendAdapter.findSendButton(root, packageName)?.also { it.refresh() }
      val row = actionRowBounds(editable, sendNode)
      val editableBounds = Rect().also { editable.getBoundsInScreen(it) }
      val (measuredZone, submitZoneMode) = ComposerGeometry.submitZone(
        row = row,
        sendNode = sendNode,
        screenWidth = dm.widthPixels,
        screenHeight = dm.heightPixels,
        editableBounds = editableBounds,
      )
      val submitZone = ComposerGeometry.clampAboveIme(measuredZone, imeTop)
      val target = ComposerTarget(
        editable = editable,
        root = root,
        sendNode = sendNode,
        actionRow = row,
        submitZone = submitZone,
        submitZoneMode = submitZoneMode,
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

  /**
   * The composer card: the highest ancestor of [editable] that is still a bottom-sheet-sized
   * block rather than the whole conversation. Pending attachment chips live inside it; reply
   * bubbles do not, so scanning only this subtree keeps "screenshots" or "image" in the
   * assistant's answer from being reported as an unscanned attachment.
   */
  fun composerContainer(editable: AccessibilityNodeInfo, screenHeight: Int): AccessibilityNodeInfo {
    val maxHeight = (screenHeight * COMPOSER_CONTAINER_MAX_FRACTION).toInt()
    var best = editable
    var parent = editable.parent
    var depth = 0
    while (parent != null && depth < 8) {
      val bounds = Rect().also { parent!!.getBoundsInScreen(it) }
      if (bounds.isEmpty || bounds.height() > maxHeight) break
      best = parent
      parent = parent.parent
      depth++
    }
    return best
  }

  /**
   * Top edge of the visible keyboard, straight from the window manager. Unlike node bounds it
   * is never stale, so it is the one reliable signal for where the composer row must now sit.
   */
  /** Top of a docked keyboard from the window manager alone; never queries the host app. */
  fun dockedKeyboardTop(service: AccessibilityService): Int? = imeWindowTop(service)

  private fun imeWindowTop(service: AccessibilityService): Int? = runCatching {
    val dm = service.resources.displayMetrics
    val window = service.windows.firstOrNull { it.type == AccessibilityWindowInfo.TYPE_INPUT_METHOD }
      ?: return@runCatching null
    val pieces = imePieces(window)
    val signature = pieces.joinToString(";") { it.toShortString() }
    if (signature != lastLoggedImePieces) {
      lastLoggedImePieces = signature
      GuardLog.event("ime.pieces", null, signature)
    }
    ComposerGeometry.dockedImeTop(pieces, dm.widthPixels, dm.heightPixels)
  }.getOrNull()

  /**
   * The keyboard's touchable area as separate rectangles. Before Android 13 only the bounding
   * box is available; [ComposerGeometry.dockedImeTop] rejects the over-tall box a floating
   * keyboard produces there.
   */
  private fun imePieces(window: AccessibilityWindowInfo): List<Rect> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val region = Region().also { window.getRegionInScreen(it) }
      val pieces = mutableListOf<Rect>()
      val iterator = RegionIterator(region)
      val rect = Rect()
      while (iterator.next(rect)) pieces += Rect(rect)
      if (pieces.isNotEmpty()) return pieces
    }
    return listOf(Rect().also { window.getBoundsInScreen(it) })
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
      parent.refresh()
      val bounds = Rect().also { parent!!.getBoundsInScreen(it) }
      val growsSideways = bounds.width() > row.width()
      val staysHorizontal = bounds.height() <= editableBounds.height() * 3
      if (!bounds.isEmpty && growsSideways && staysHorizontal) row.union(bounds)
      parent = parent.parent
      depth++
    }
    return row
  }

  private const val COMPOSER_CONTAINER_MAX_FRACTION = 0.4f
}
