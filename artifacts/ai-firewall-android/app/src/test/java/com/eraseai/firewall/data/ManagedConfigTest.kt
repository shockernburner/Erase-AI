package com.eraseai.firewall.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ManagedConfigTest {
  private val token = "eae_abcdefghijklmnopqrstuvwxyz0123"

  @Test
  fun readsEnrollmentTokenAndCleanEmail() {
    assertEquals(ManagedPolicy(token, "bob@acme.com"), ManagedConfig.parse(" $token ", " Bob@Acme.com "))
    assertEquals(ManagedPolicy(token, null), ManagedConfig.parse(token, "not an email"))
    assertEquals(ManagedPolicy(token, null), ManagedConfig.parse(token, null))
  }

  @Test
  fun ignoresAnythingThatIsNotAnEnrollmentToken() {
    assertNull(ManagedConfig.parse(null, "bob@acme.com"))
    assertNull(ManagedConfig.parse("", null))
    assertNull(ManagedConfig.parse("eak_abcdefghijklmnopqrstuvwxyz", null))
    assertNull(ManagedConfig.parse("eae_short", null))
  }

  @Test
  fun tagChangesWhenTheTokenIsReplaced() {
    assertEquals("eae_abcdefgh", ManagedConfig.tokenTag(ManagedPolicy(token, null)))
  }
}
