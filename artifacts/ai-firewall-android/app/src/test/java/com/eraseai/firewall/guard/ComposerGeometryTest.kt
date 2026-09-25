package com.eraseai.firewall.guard

import android.graphics.Rect
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
}
