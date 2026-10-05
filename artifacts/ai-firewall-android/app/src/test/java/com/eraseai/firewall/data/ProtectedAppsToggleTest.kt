package com.eraseai.firewall.data

import org.junit.Assert.assertEquals
import org.junit.Test

class ProtectedAppsToggleTest {
  private val gemini = "com.google.android.apps.bard"
  private val google = "com.google.android.googlequicksearchbox"
  private val chatgpt = "com.openai.chatgpt"

  @Test
  fun `unchecking Google also unchecks Gemini, and the reverse`() {
    val all = setOf(gemini, google, chatgpt)
    assertEquals(setOf(chatgpt), ProtectedAppsStore.toggled(all, google))
    assertEquals(setOf(chatgpt), ProtectedAppsStore.toggled(all, gemini))
  }

  @Test
  fun `checking either Gemini package checks both`() {
    assertEquals(setOf(chatgpt, gemini, google), ProtectedAppsStore.toggled(setOf(chatgpt), google))
  }

  @Test
  fun `other apps toggle on their own`() {
    assertEquals(setOf(gemini, google), ProtectedAppsStore.toggled(setOf(gemini, google, chatgpt), chatgpt))
    assertEquals(setOf(chatgpt), ProtectedAppsStore.toggled(emptySet(), chatgpt))
  }
}
