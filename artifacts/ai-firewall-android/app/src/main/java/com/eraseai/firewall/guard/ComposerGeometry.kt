package com.eraseai.firewall.guard

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Screen-geometry helpers for submit-band blocking that do not depend on locating a send button.
 */
object ComposerGeometry {
  /** Bottom fraction of the display used when send control cannot be resolved. */
  const val GEOMETRY_BAND_FRACTION = 0.18f

  const val MIN_BAND_HEIGHT_PX = 120

  fun bandHeightPx(screenHeight: Int): Int =
    (screenHeight * GEOMETRY_BAND_FRACTION)
      .toInt()
      .coerceAtLeast(MIN_BAND_HEIGHT_PX)
      .coerceAtMost(screenHeight.coerceAtLeast(1))

  fun submitZoneMode(sendResolved: Boolean): String = if (sendResolved) "resolved" else "geometry"

  /**
   * Full-width band anchored to the bottom of the screen. Used when per-app send heuristics miss.
   */
  fun geometrySubmitZone(screenWidth: Int, screenHeight: Int, editableBounds: Rect): Rect {
    val bandHeight = bandHeightPx(screenHeight)
    val top = (screenHeight - bandHeight).coerceAtLeast(0)
    // If the composer sits above the band, extend upward to include its action row neighborhood.
    val adjustedTop = if (!editableBounds.isEmpty && editableBounds.bottom > top) {
      minOf(top, editableBounds.top.coerceAtLeast(0))
    } else {
      top
    }
    return Rect(0, adjustedTop, screenWidth.coerceAtLeast(1), screenHeight)
  }

  /**
   * Prefer a resolved send-node band; fall back to [geometrySubmitZone] when the node is missing.
   */
  fun submitZone(
    row: Rect,
    sendNode: AccessibilityNodeInfo?,
    screenWidth: Int,
    screenHeight: Int,
    editableBounds: Rect,
  ): Pair<Rect, String> {
    val send = sendNode?.let { node -> Rect().also { node.getBoundsInScreen(it) } }
    if (send == null || send.isEmpty) {
      return geometrySubmitZone(screenWidth, screenHeight, editableBounds) to submitZoneMode(false)
    }
    val top = send.top.coerceIn(row.top, row.bottom)
    var zone = Rect(row.left, top, row.right, row.bottom)
    if (zone.height() < send.height() / 2) zone = Rect(row)
    if (zone.width() < screenWidth / 4 || zone.height() < MIN_BAND_HEIGHT_PX / 2) {
      val fallback = geometrySubmitZone(screenWidth, screenHeight, editableBounds)
      zone.union(fallback)
      return zone to submitZoneMode(false)
    }
    return zone to submitZoneMode(true)
  }
}
