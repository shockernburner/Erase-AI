package com.eraseai.firewall.guard

import com.eraseai.firewall.guard.GuardHealth.AccessibilityStatus
import com.eraseai.firewall.guard.GuardHealth.EgressStatus
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

  @Test
  fun `another vpn pauses the strict gate`() {
    assertEquals(
      EgressStatus.OTHER_VPN,
      GuardHealth.resolveEgress(strictEnabled = true, tunnelRunning = false, otherVpnActive = true, consentMissing = true),
    )
  }

  @Test
  fun `lost consent without another vpn is reported as permission lost`() {
    assertEquals(
      EgressStatus.PERMISSION_LOST,
      GuardHealth.resolveEgress(strictEnabled = true, tunnelRunning = false, otherVpnActive = false, consentMissing = true),
    )
  }

  @Test
  fun `our own running tunnel is never mistaken for a conflict`() {
    assertEquals(
      EgressStatus.READY,
      GuardHealth.resolveEgress(strictEnabled = true, tunnelRunning = true, otherVpnActive = true, consentMissing = false),
    )
    assertEquals(
      EgressStatus.OFF,
      GuardHealth.resolveEgress(strictEnabled = false, tunnelRunning = false, otherVpnActive = true, consentMissing = true),
    )
  }
}
