package com.eraseai.firewall.guard

import com.eraseai.firewall.guard.GuardHealth.AccessibilityStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class GuardHealthTest {

  @Test
  fun `enabled in settings but unbound after the grace window is stalled, not active`() {
    // The on-device failure: settings said enabled, the service was marked crashed, no events.
    assertEquals(
      AccessibilityStatus.STALLED,
      GuardHealth.resolveAccessibility(enabledInSettings = true, running = false, processAgeMs = 60_000),
    )
  }

  @Test
  fun `enabled and unbound right after process start is still starting`() {
    assertEquals(
      AccessibilityStatus.STARTING,
      GuardHealth.resolveAccessibility(enabledInSettings = true, running = false, processAgeMs = 2_000),
    )
  }

  @Test
  fun `accessibility status follows settings and the live bind`() {
    assertEquals(
      AccessibilityStatus.ACTIVE,
      GuardHealth.resolveAccessibility(enabledInSettings = true, running = true, processAgeMs = 60_000),
    )
    assertEquals(
      AccessibilityStatus.OFF,
      GuardHealth.resolveAccessibility(enabledInSettings = false, running = false, processAgeMs = 60_000),
    )
  }
}
