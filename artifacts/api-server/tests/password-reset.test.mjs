// Coverage for the password reset rules routes/password-reset.ts applies.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  RESET_TOKEN_TTL_MS,
  buildResetEmail,
  buildResetUrl,
  canIssueReset,
  checkResetToken,
  generateResetToken,
  hashResetToken,
  validateNewPassword,
} from "../src/lib/password-reset-source.mjs";

const NOW = 1_780_000_000_000;

describe("reset tokens", () => {
  test("random token, sha256 hash, 30-minute expiry", () => {
    const t = generateResetToken(NOW);
    assert.ok(t.token.length >= 40);
    assert.equal(hashResetToken(t.token), t.hash);
    assert.match(t.hash, /^[0-9a-f]{64}$/);
    assert.equal(t.expiresAt.getTime(), NOW + RESET_TOKEN_TTL_MS);
    assert.notEqual(generateResetToken(NOW).token, t.token);
  });

  test("valid only while unused and unexpired", () => {
    assert.equal(checkResetToken({ expiresAt: new Date(NOW + 1000), usedAt: null }, NOW).ok, true);
    assert.equal(checkResetToken({ expiresAt: new Date(NOW - 1), usedAt: null }, NOW).ok, false);
    assert.equal(checkResetToken({ expiresAt: new Date(NOW + 1000), usedAt: new Date(NOW) }, NOW).ok, false);
    assert.equal(checkResetToken(null, NOW).ok, false);
    assert.equal(checkResetToken({ expiresAt: "garbage", usedAt: null }, NOW).ok, false);
  });
});

describe("limits and passwords", () => {
  test("three links per account per hour", () => {
    assert.equal(canIssueReset(0), true);
    assert.equal(canIssueReset(2), true);
    assert.equal(canIssueReset(3), false);
  });
  test("passwords need 8 to 200 characters", () => {
    assert.equal(validateNewPassword("short").ok, false);
    assert.equal(validateNewPassword(12345678).ok, false);
    assert.equal(validateNewPassword("longenough").ok, true);
    assert.equal(validateNewPassword("x".repeat(201)).ok, false);
  });
});

describe("reset link and email", () => {
  test("link uses the configured site, defaulting to eraseai.ai", () => {
    assert.equal(buildResetUrl("a b", undefined), "https://eraseai.ai/reset-password?token=a%20b");
    assert.equal(buildResetUrl("t", "https://example.com/"), "https://example.com/reset-password?token=t");
    assert.equal(buildResetUrl("t", "evil.com"), "https://eraseai.ai/reset-password?token=t");
  });
  test("email carries the link and escapes the name", () => {
    const m = buildResetEmail({ url: "https://eraseai.ai/reset-password?token=abc", firstName: "<b>Al</b>" });
    assert.match(m.subject, /Reset your EraseAI password/);
    assert.ok(m.text.includes("https://eraseai.ai/reset-password?token=abc"));
    assert.ok(m.html.includes("&lt;b&gt;Al&lt;/b&gt;"));
    assert.ok(!m.html.includes("<b>Al</b>"));
  });
});
