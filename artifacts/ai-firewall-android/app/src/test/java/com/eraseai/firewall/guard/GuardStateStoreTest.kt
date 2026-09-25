package com.eraseai.firewall.guard

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class GuardStateStoreTest {

  private lateinit var context: Context

  @Before
  fun setUp() {
    context = ApplicationProvider.getApplicationContext()
    context.getSharedPreferences("eraseai_firewall_prefs", Context.MODE_PRIVATE)
      .edit()
      .clear()
      .apply()
    GuardStateStore.init(context)
  }

  @Test
  fun `ime withheld clears withhold failed`() {
    GuardStateStore.setImeWithholdFailed(true)
    assertTrue(GuardStateStore.isImeWithholdFailed())

    GuardStateStore.setImeWithheld(true)
    assertTrue(GuardStateStore.isImeWithheld())
    assertFalse(GuardStateStore.isImeWithholdFailed())
  }

  @Test
  fun `clearImeState resets both flags`() {
    GuardStateStore.setImeWithheld(true)
    GuardStateStore.setArmed("com.openai.chatgpt")

    GuardStateStore.clearImeState()
    GuardStateStore.setArmed(null)

    assertFalse(GuardStateStore.isImeWithheld())
    assertFalse(GuardStateStore.isImeWithholdFailed())
    assertFalse(GuardStateStore.isArmed())
  }

  @Test
  fun `withhold failed clears withheld flag`() {
    GuardStateStore.setImeWithheld(true)
    GuardStateStore.setImeWithholdFailed(true)

    assertTrue(GuardStateStore.isImeWithholdFailed())
    assertFalse(GuardStateStore.isImeWithheld())
  }

  @Test
  fun `egress blocked when strict mode armed`() {
    GuardStateStore.setStrictEgressEnabled(true)
    GuardStateStore.setArmed("com.openai.chatgpt")

    assertTrue(GuardStateStore.isEgressBlocked())
    assertEquals("com.openai.chatgpt", GuardStateStore.getArmedPackage())
  }

  @Test
  fun `egress not blocked when strict mode off`() {
    GuardStateStore.setStrictEgressEnabled(false)
    GuardStateStore.setArmed("com.openai.chatgpt")

    assertFalse(GuardStateStore.isEgressBlocked())
  }
}
