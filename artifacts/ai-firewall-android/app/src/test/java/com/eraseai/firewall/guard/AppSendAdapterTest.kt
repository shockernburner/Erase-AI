package com.eraseai.firewall.guard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppSendAdapterTest {

  @Test
  fun `treats Gemini and ChatGPT placeholders as empty`() {
    assertEquals("", AppSendAdapter.liveComposerText("Ask Gemini"))
    assertEquals("", AppSendAdapter.liveComposerText("Ask anything"))
    assertEquals("", AppSendAdapter.liveComposerText("Ask ChatGPT"))
    assertEquals("", AppSendAdapter.liveComposerText("Message ChatGPT"))
    assertEquals("", AppSendAdapter.liveComposerText("Ask Gemini", "Ask Gemini"))
    assertEquals("", AppSendAdapter.liveComposerText("typed", "typed"))
  }

  @Test
  fun `keeps a real prompt even when it mentions Ask ChatGPT`() {
    val prompt = "Ask ChatGPT how to rotate a screenshot"
    assertEquals(prompt, AppSendAdapter.liveComposerText(prompt))
  }

  @Test
  fun `keeps a pasted secret`() {
    val prompt = "deploy with AKIAIOSFODNN7EXAMPLE"
    assertEquals(prompt, AppSendAdapter.liveComposerText(prompt, "Ask anything"))
  }
}

class CurtainGeometryTest {

  @Test
  fun `rotation is a display change`() {
    assertTrue(CurtainGeometry.displayChanged(720, 1612, 1612, 720))
    assertFalse(CurtainGeometry.displayChanged(720, 1612, 720, 1612))
    assertFalse(CurtainGeometry.displayChanged(0, 0, 720, 1612))
  }
}
