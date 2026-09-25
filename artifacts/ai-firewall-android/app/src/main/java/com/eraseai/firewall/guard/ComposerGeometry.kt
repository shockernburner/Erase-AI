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

  /** Typical IME + nav inset as a fraction of display height (OPPO 720×1612 ≈ 330px). */
  private const val KEYBOARD_INSET_FRACTION = 0.20f
  private const val MIN_KEYBOARD_INSET_PX = 260

  fun bandHeightPx(screenHeight: Int): Int =
    (screenHeight * GEOMETRY_BAND_FRACTION)
      .toInt()
      .coerceAtLeast(MIN_BAND_HEIGHT_PX)
      .coerceAtMost(screenHeight.coerceAtLeast(1))

  fun submitZoneMode(sendResolved: Boolean): String = if (sendResolved) "resolved" else "geometry"

  fun keyboardLikelyOpen(screenHeight: Int, anchorBottom: Int): Boolean {
    if (screenHeight <= 0 || anchorBottom <= 0) return false
    val inset = (screenHeight * KEYBOARD_INSET_FRACTION).toInt().coerceAtLeast(MIN_KEYBOARD_INSET_PX)
    return anchorBottom < screenHeight - inset
  }

  /**
   * Full-width submit band. When the IME is open the composer row sits above the keyboard —
   * anchoring to the screen bottom covers Gboard instead of ChatGPT's send arrow.
   */
  fun geometrySubmitZone(
    screenWidth: Int,
    screenHeight: Int,
    editableBounds: Rect,
    actionRow: Rect = editableBounds,
  ): Rect {
    val bandHeight = bandHeightPx(screenHeight)
    val row = if (!actionRow.isEmpty) actionRow else editableBounds
    if (!row.isEmpty && keyboardLikelyOpen(screenHeight, row.bottom)) {
      val top = (row.top - (bandHeight / 4)).coerceAtLeast(0)
      val bottom = (row.bottom + (bandHeight / 6)).coerceAtMost(screenHeight)
      return Rect(0, top, screenWidth.coerceAtLeast(1), bottom.coerceAtLeast(top + 1))
    }
    val top = (screenHeight - bandHeight).coerceAtLeast(0)
    val adjustedTop = if (!editableBounds.isEmpty && editableBounds.bottom > top) {
      minOf(top, editableBounds.top.coerceAtLeast(0))
    } else {
      top
    }
    return Rect(0, adjustedTop, screenWidth.coerceAtLeast(1), screenHeight)
  }

  /**
   * Only a keyboard docked across the bottom pushes the composer up. A floating or split
   * keyboard (Gboard's floating mode, tablets, foldables) sits over the app without moving it;
   * lifting the band above one parked it mid-screen and left send uncovered.
   */
  fun isDockedIme(bounds: Rect, screenWidth: Int, screenHeight: Int): Boolean =
    !bounds.isEmpty &&
      bounds.width() >= screenWidth * 0.9f &&
      bounds.bottom >= screenHeight * 0.9f

  /**
   * A composer can never sit under a visible keyboard. When the measured zone overlaps the IME
   * window the measurement is stale, so lift the zone to rest directly on the keyboard's top.
   */
  fun clampAboveIme(zone: Rect, imeTop: Int?): Rect {
    if (imeTop == null || imeTop <= 0 || zone.isEmpty || zone.bottom <= imeTop) return zone
    val height = zone.height()
    val bottom = imeTop
    val top = (bottom - height).coerceAtLeast(0)
    return Rect(zone.left, top, zone.right, bottom)
  }

  /**
   * Expands [seed] to a full-width touch target without relocating a composer-row band onto
   * the keyboard when the IME is open.
   */
  fun clampSubmitOverlay(seed: Rect, screenWidth: Int, screenHeight: Int, minHeightPx: Int): Rect {
    val bandHeight = bandHeightPx(screenHeight)
    val rect = Rect(seed)
    if (rect.isEmpty) {
      return geometrySubmitZone(screenWidth, screenHeight, Rect())
    }
    rect.left = 0
    rect.right = screenWidth.coerceAtLeast(1)
    if (keyboardLikelyOpen(screenHeight, rect.bottom)) {
      if (rect.height() < minHeightPx) {
        val pad = (minHeightPx - rect.height()) / 2
        rect.top -= pad
        rect.bottom += pad
      }
      if (rect.height() > bandHeight) {
        rect.top = rect.bottom - bandHeight
      }
      rect.top = rect.top.coerceAtLeast(0)
      rect.bottom = rect.bottom.coerceAtMost(screenHeight)
      return rect
    }
    // Keyboard closed: run to the physical bottom so a composer that drops further cannot slide
    // send out from under the band, but start no higher than the send row. A full-height band
    // also covered the text line, so after Cancel the user could not tap in to fix the draft.
    rect.bottom = screenHeight
    val bandTop = screenHeight - bandHeight
    rect.top = if (seed.top > bandTop) seed.top else bandTop
    if (rect.height() < minHeightPx) rect.top = (screenHeight - minHeightPx).coerceAtLeast(0)
    return rect
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
      return geometrySubmitZone(screenWidth, screenHeight, editableBounds, row) to submitZoneMode(false)
    }
    val top = send.top.coerceIn(row.top, row.bottom)
    var zone = Rect(row.left, top, row.right, row.bottom)
    if (zone.height() < send.height() / 2) zone = Rect(row)
    if (zone.width() < screenWidth / 4 || zone.height() < MIN_BAND_HEIGHT_PX / 2) {
      val fallback = geometrySubmitZone(screenWidth, screenHeight, editableBounds, row)
      zone.union(fallback)
      return zone to submitZoneMode(false)
    }
    return zone to submitZoneMode(true)
  }
}
