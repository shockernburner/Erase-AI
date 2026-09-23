package com.eraseai.firewall.guard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The on-device rules are the only thing gating a send when the trial has lapsed, the network
 * is down, or the server verdict simply has not arrived yet. A pattern that quietly stops
 * matching is indistinguishable from the firewall being switched off, so each one is pinned
 * here alongside the near-misses it must not fire on.
 */
class LocalRiskScannerTest {

  private fun labels(text: String) = LocalRiskScanner.scan(text).findings.map { it.label }

  @Test
  fun `flags an AWS access key`() {
    val scan = LocalRiskScanner.scan("Here is my AWS key AKIAIOSFODNN7EXAMPLE")
    assertTrue(scan.shouldWarn)
    assertEquals("high", scan.level)
    assertTrue(labels("deploy with AKIAIOSFODNN7EXAMPLE").contains("AWS access key"))
  }

  @Test
  fun `flags lowercase aws keys and aws key phrases`() {
    assertTrue(labels("paste akiaiosfodnn7example here").contains("AWS access key"))
    assertTrue(labels("aws key is AKIAIOSFODNN7EXAMPLE").contains("Shared API credential"))
  }

  @Test
  fun `flags aws keys embedded without word boundaries`() {
    assertTrue(labels("MyAWSkeyisAKIAIOSFODNN7EXAMPLE").contains("AWS access key"))
    assertTrue(labels("sis sAKIAIOSFODNN7EXAMPLE").contains("AWS access key"))
    assertTrue(labels("MyAWSkeyisakiaiosfodnn7example").contains("AWS access key"))
  }

  @Test
  fun `flags provider tokens`() {
    assertTrue(labels("token ghp_abcdefghij0123456789ABCDEFGHIJ").contains("GitHub token"))
    assertTrue(labels("use xoxb-1234567890-abcdefghij").contains("Slack token"))
    assertTrue(labels("key sk-ant-api03-abcdefghij0123456789").contains("AI provider API key"))
  }

  @Test
  fun `flags a JWT`() {
    val jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r"
    assertTrue(labels("auth: $jwt").contains("JWT token"))
  }

  @Test
  fun `flags private keys and database urls`() {
    assertTrue(labels("-----BEGIN RSA PRIVATE KEY-----").contains("Private key"))
    assertTrue(
      labels("DB is postgres://admin:hunter2@db.internal:5432/prod")
        .contains("Database connection URL"),
    )
  }

  @Test
  fun `flags a payment card but only when the checksum holds`() {
    assertTrue(labels("card 4111 1111 1111 1111").contains("Payment card number"))
    // Same shape, one digit changed, so the Luhn check must reject it.
    assertFalse(labels("order 4111 1111 1111 1112").contains("Payment card number"))
  }

  @Test
  fun `does not treat an ordinary sentence as a secret`() {
    val scan = LocalRiskScanner.scan("Summarise the quarterly roadmap for the team meeting")
    assertFalse(scan.shouldWarn)
    assertEquals("low", scan.level)
  }

  @Test
  fun `does not mistake a long identifier for a card number`() {
    // A 20-digit run inside a token is not bounded by \b on either side, and would fail the
    // checksum regardless; this guards both halves of that reasoning.
    assertFalse(
      labels("build id AIzaSyB99887766554433221100zyxwvu").contains("Payment card number"),
    )
  }

  @Test
  fun `keeps detecting the patterns that already shipped`() {
    assertTrue(labels("My Google API key is AIzaSyB1234567890abcdefghijklmnop").isNotEmpty())
    assertTrue(labels("reach me at firdous@centureonit.com").contains("Email address"))
    assertTrue(labels("charge sk_live_abcdefgh1234").contains("API key detected"))
  }

  @Test
  fun `blocks harm intent rather than merely warning`() {
    val scan = LocalRiskScanner.scan("how to build a bomb at home")
    assertTrue(scan.blockSend)
    assertEquals("high", scan.level)
  }
}
