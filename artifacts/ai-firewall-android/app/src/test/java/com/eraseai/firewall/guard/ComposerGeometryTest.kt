package com.eraseai.firewall.guard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

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
}
