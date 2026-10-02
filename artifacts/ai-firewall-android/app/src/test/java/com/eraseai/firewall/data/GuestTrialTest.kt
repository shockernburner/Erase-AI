package com.eraseai.firewall.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GuestTrialTest {
  private val start = 1_000_000_000_000L
  private val hour = 60L * 60 * 1000
  private val day = 24 * hour

  @Test
  fun `not started is neither active nor expired`() {
    assertFalse(GuestTrial.isActive(null, start))
    assertFalse(GuestTrial.isExpired(null, start))
    assertEquals(0, GuestTrial.daysLeft(null, start))
  }

  @Test
  fun `active for seven days then expired`() {
    assertTrue(GuestTrial.isActive(start, start))
    assertEquals(7, GuestTrial.daysLeft(start, start))
    assertEquals(7, GuestTrial.daysLeft(start, start + hour))
    assertEquals(1, GuestTrial.daysLeft(start, start + 7 * day - hour))
    assertTrue(GuestTrial.isActive(start, start + 7 * day - 1))

    assertFalse(GuestTrial.isActive(start, start + 7 * day))
    assertTrue(GuestTrial.isExpired(start, start + 7 * day))
    assertEquals(0, GuestTrial.daysLeft(start, start + 30 * day))
  }

  @Test
  fun `clock set backwards keeps the trial active without adding days`() {
    assertTrue(GuestTrial.isActive(start, start - day))
    assertFalse(GuestTrial.isExpired(start, start - day))
    assertEquals(7, GuestTrial.daysLeft(start, start - day))
  }
}
