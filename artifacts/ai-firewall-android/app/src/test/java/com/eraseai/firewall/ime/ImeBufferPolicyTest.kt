package com.eraseai.firewall.ime

import com.eraseai.firewall.guard.LocalRiskScanner
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ImeBufferPolicyTest {

  @Test
  fun `withholds on medium risk while typing`() {
    val scan = LocalRiskScanner.scan("I want to buy a firearm for home defense")
    assertTrue(scan.shouldWarn)
    assertEquals(
      ImeBufferPolicy.Action.WITHHOLD,
      ImeBufferPolicy.evaluate(scan, bufferLength = 40, minBuffer = 3, commit = false),
    )
  }

  @Test
  fun `withholds on high risk at send time`() {
    val scan = LocalRiskScanner.scan("Here is my AWS key AKIAIOSFODNN7EXAMPLE")
    assertEquals(
      ImeBufferPolicy.Action.WITHHOLD,
      ImeBufferPolicy.evaluate(scan, bufferLength = 40, minBuffer = 3, commit = true),
    )
  }

  @Test
  fun `sends safe text on commit`() {
    val scan = LocalRiskScanner.scan("Summarise the quarterly roadmap")
    assertEquals(
      ImeBufferPolicy.Action.SEND_SAFE,
      ImeBufferPolicy.evaluate(scan, bufferLength = 30, minBuffer = 3, commit = true),
    )
  }

  @Test
  fun `idle on short buffer without commit`() {
    val scan = LocalRiskScanner.scan("hi")
    assertEquals(
      ImeBufferPolicy.Action.IDLE,
      ImeBufferPolicy.evaluate(scan, bufferLength = 2, minBuffer = 3, commit = false),
    )
  }
}
