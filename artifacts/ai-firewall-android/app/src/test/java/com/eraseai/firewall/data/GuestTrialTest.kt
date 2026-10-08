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
  fun `active for the offered days then expired`() {
    val days = GuestTrial.DAYS
    assertTrue(GuestTrial.isActive(start, start))
    assertEquals(days, GuestTrial.daysLeft(start, start))
    assertEquals(days, GuestTrial.daysLeft(start, start + hour))
    assertEquals(days - 1, GuestTrial.daysLeft(start, start + day))
    assertEquals(1, GuestTrial.daysLeft(start, start + days * day - hour))
    assertTrue(GuestTrial.isActive(start, start + days * day - 1))

    assertFalse(GuestTrial.isActive(start, start + days * day))
    assertTrue(GuestTrial.isExpired(start, start + days * day))
    assertEquals(0, GuestTrial.daysLeft(start, start + (days + 9) * day))
  }

  @Test
  fun `a trial keeps the length it started with`() {
    // Started under a 21-day offer; a later release offering 7 days must not end it on day 8.
    assertTrue(GuestTrial.isActive(start, start + 8 * day, days = 21))
    assertEquals(13, GuestTrial.daysLeft(start, start + 8 * day, days = 21))
    assertTrue(GuestTrial.isExpired(start, start + 8 * day, days = 7))
  }

  @Test
  fun `clock set backwards keeps the trial active without adding days`() {
    assertTrue(GuestTrial.isActive(start, start - day))
    assertFalse(GuestTrial.isExpired(start, start - day))
    assertEquals(GuestTrial.DAYS, GuestTrial.daysLeft(start, start - day))
  }

  @Test
  fun `message limit ends the trial when set, and 0 means no limit`() {
    assertFalse(GuestTrial.sendsExhausted(used = 24, limit = 25))
    assertTrue(GuestTrial.sendsExhausted(used = 25, limit = 25))
    assertFalse(GuestTrial.sendsExhausted(used = 10_000, limit = 0))
  }

  @Test
  fun `production build settings are 7 days and 25 messages`() {
    assertEquals(7, GuestTrial.DAYS)
    assertEquals(25, GuestTrial.SENDS)
  }
}
