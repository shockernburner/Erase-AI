package com.eraseai.firewall.guard

import android.graphics.Rect
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ComposerGeometryTest {

  @Test
  fun `band height respects fraction and minimum`() {
    val small = ComposerGeometry.bandHeightPx(600)
    assertTrue(small >= ComposerGeometry.MIN_BAND_HEIGHT_PX)
    val tall = ComposerGeometry.bandHeightPx(2400)
    assertEquals((2400 * ComposerGeometry.GEOMETRY_BAND_FRACTION).toInt().coerceAtLeast(ComposerGeometry.MIN_BAND_HEIGHT_PX), tall)
  }

  @Test
  fun `submit zone mode is geometry without send node`() {
    assertEquals("geometry", ComposerGeometry.submitZoneMode(sendResolved = false))
    assertEquals("resolved", ComposerGeometry.submitZoneMode(sendResolved = true))
  }

  @Test
  fun `geometry submit zone anchors to composer row when keyboard is open`() {
    val screenHeight = 1612
    val composerRow = Rect(0, 1180, 720, 1280)
    val zone = ComposerGeometry.geometrySubmitZone(720, screenHeight, composerRow, composerRow)
    assertTrue(zone.top >= 1100)
    assertTrue(zone.bottom <= 1350)
    assertTrue(zone.bottom < screenHeight - 200)
  }

  @Test
  fun `clamp submit overlay does not snap composer band to screen bottom when ime open`() {
    val screenHeight = 1612
    val sendRow = Rect(0, 1200, 720, 1270)
    val clamped = ComposerGeometry.clampSubmitOverlay(sendRow, 720, screenHeight, minHeightPx = 96)
    assertEquals(0, clamped.left)
    assertEquals(720, clamped.right)
    assertTrue(clamped.bottom < screenHeight - 100)
    assertTrue(clamped.top > 1000)
  }

  @Test
  fun `zone overlapping the keyboard is lifted to sit on the ime top`() {
    // Stale keyboard-closed measurement: band at the screen bottom while Gboard is up at 1500.
    val stale = Rect(0, 1968, 1080, 2400)
    val lifted = ComposerGeometry.clampAboveIme(stale, imeTop = 1500)
    assertEquals(1500, lifted.bottom)
    assertEquals(stale.height(), lifted.height())
  }

  @Test
  fun `zone above the keyboard or with no keyboard is untouched`() {
    val zone = Rect(0, 1359, 1080, 1485)
    assertEquals(zone, ComposerGeometry.clampAboveIme(zone, imeTop = 1500))
    assertEquals(zone, ComposerGeometry.clampAboveIme(zone, imeTop = null))
  }

  @Test
  fun `keyboard closed band covers the send row down to the bottom but not the text line`() {
    // ChatGPT on a 1080x2400 screen, keyboard closed: text line ends at 2197, send row 2211..2305.
    val sendRow = Rect(32, 2211, 1048, 2305)
    val clamped = ComposerGeometry.clampSubmitOverlay(sendRow, 1080, 2400, minHeightPx = 126)
    assertEquals(2400, clamped.bottom)
    assertEquals(2211, clamped.top)
  }

  @Test
  fun `only a keyboard docked across the bottom counts`() {
    assertTrue(ComposerGeometry.isDockedIme(Rect(0, 1500, 1080, 2400), 1080, 2400))
    // Gboard floating pill: narrow and mid-screen.
    assertFalse(ComposerGeometry.isDockedIme(Rect(20, 860, 170, 1550), 1080, 2400))
    assertFalse(ComposerGeometry.isDockedIme(Rect(), 1080, 2400))
  }

  @Test
  fun `floating keyboard pieces are not a docked keyboard`() {
    // Emulator, 1080x2400, floating keyboard toolbar: the IME window's touchable area is the
    // pill plus a strip along the bottom edge. Their bounding box (0,863)-(1080,2400) looked
    // docked and parked the band at y=737..863 while send sat at 2179..2305.
    val pieces = listOf(Rect(21, 863, 169, 1553), Rect(0, 2337, 1080, 2400))
    assertNull(ComposerGeometry.dockedImeTop(pieces, 1080, 2400))
    // Pre-Android 13 only the bounding box is known; it is too tall to be one keyboard.
    assertNull(ComposerGeometry.dockedImeTop(listOf(Rect(0, 863, 1080, 2400)), 1080, 2400))

    val sendRow = Rect(32, 2179, 1048, 2305)
    val imeTop = ComposerGeometry.dockedImeTop(pieces, 1080, 2400)
    assertEquals(sendRow, ComposerGeometry.clampAboveIme(sendRow, imeTop))
  }

  @Test
  fun `docked keyboard piece gives its top edge`() {
    assertEquals(1500, ComposerGeometry.dockedImeTop(listOf(Rect(0, 1500, 1080, 2400)), 1080, 2400))
    // An IME that claims the whole screen is not evidence of where the composer sits.
    assertNull(ComposerGeometry.dockedImeTop(listOf(Rect(0, 0, 1080, 2400)), 1080, 2400))
    assertNull(ComposerGeometry.dockedImeTop(emptyList(), 1080, 2400))
  }

  @Test
  fun `keyboard transition covers the whole path send can travel`() {
    // Claude, docked keyboard: send row above the keyboard at 1344..1470. After Cancel the
    // keyboard returns and send travels up from the bottom band (2164..2400) to that row.
    val raised = Rect(0, 1344, 1080, 1470)
    val bottom = Rect(0, 2164, 1080, 2400)
    assertEquals(
      Rect(0, 1344, 1080, 2400),
      CurtainGeometry.transitionSpan(bottom, raised, 1080, 2400, inTransition = true),
    )
    // Outside a transition the measured band is used as is, so typing is not blocked.
    assertEquals(bottom, CurtainGeometry.transitionSpan(bottom, raised, 1080, 2400, inTransition = false))
    // No raised band seen yet: still runs to the bottom from the measured top.
    assertEquals(
      Rect(0, 1344, 1080, 2400),
      CurtainGeometry.transitionSpan(raised, Rect(), 1080, 2400, inTransition = true),
    )
  }

  @Test
  fun `anchor box waits where send lands when the keyboard changes state`() {
    val band = Rect(0, 1344, 1080, 1470)
    // Claude on 1080x2400, keyboard open, send at 940..1010 x 1360..1450.
    val raisedSend = Rect(940, 1360, 1010, 1450)
    val closedSend = Rect(940, 2190, 1010, 2260)

    // Closed position already seen: park over it.
    assertEquals(
      Rect(932, 2182, 1018, 2268),
      CurtainGeometry.anchorBox(true, raisedSend, closedSend, Rect(), band, 1080, 2400, padPx = 8),
    )
    // Not seen yet: send's footprint dropped to the bottom, clear of letters and backspace.
    val estimated = CurtainGeometry.anchorBox(true, raisedSend, Rect(), Rect(), band, 1080, 2400, padPx = 8)!!
    assertEquals(2400, estimated.bottom)
    assertTrue(estimated.top > 2100)
    assertTrue(estimated.left > 900)

    // Keyboard closed: park over the last above-keyboard position, never a guess.
    val bottomBand = Rect(0, 2164, 1080, 2400)
    assertEquals(
      Rect(932, 1352, 1018, 1458),
      CurtainGeometry.anchorBox(false, closedSend, closedSend, raisedSend, bottomBand, 1080, 2400, padPx = 8),
    )
    assertNull(CurtainGeometry.anchorBox(false, closedSend, closedSend, Rect(), bottomBand, 1080, 2400, padPx = 8))
    // Already under the band (floating keyboard, send never moves): no second box.
    assertNull(CurtainGeometry.anchorBox(false, closedSend, closedSend, Rect(940, 2190, 1010, 2260), bottomBand, 1080, 2400, padPx = 8))
  }
}
