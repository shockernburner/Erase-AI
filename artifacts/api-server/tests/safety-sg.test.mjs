// Singapore NRIC/FIN and phone numbers (design:
// docs/superpowers/specs/2026-11-26-sg-pii-rules-design.md).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { analyzePromptSafety } from "../src/lib/dev/safety-source.mjs";

const NRIC = "Singapore NRIC/FIN number found";
const PHONE = "Singapore phone number found";

// Reference check-letter algorithm (ICA, S/T/F/G series), kept in the test so
// the expected letters are computed, not copied from somewhere unverified.
function checkLetter(prefix, digits) {
  const w = [2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(digits[i]) * w[i];
  if (prefix === "T" || prefix === "G") sum += 4;
  const r = sum % 11;
  return (prefix === "S" || prefix === "T" ? "JZIHGFEDCBA" : "XWUTRQPNMLK")[r];
}

const hits = (text, detail) => analyzePromptSafety(text).issues.filter((i) => i.detail === detail);

describe("Singapore NRIC/FIN", () => {
  test("reference algorithm matches the well-known sample S1234567D", () => {
    assert.equal(checkLetter("S", "1234567"), "D");
  });

  for (const [p, d] of [["S", "1234567"], ["T", "0123456"], ["F", "1234567"], ["G", "7654321"]]) {
    const id = `${p}${d}${checkLetter(p, d)}`;
    test(`flags ${id} (valid check letter)`, () => {
      const r = analyzePromptSafety(`Client ${id} needs his filing done`);
      assert.equal(hits(`Client ${id} needs his filing done`, NRIC).length, 1);
      assert.notEqual(r.level, "safe");
    });
  }

  test("flags lowercase with a valid check letter", () => {
    assert.equal(hits("his ic is s1234567d", NRIC).length, 1);
  });

  test("flags any letter when a context word is near (M-series, typos)", () => {
    assert.equal(hits("FIN: G1234567A", NRIC).length, 1);
    assert.equal(hits("NRIC M1234567K", NRIC).length, 1);
  });

  test("does not flag a wrong check letter with no context word", () => {
    assert.equal(hits("ref S1234567A attached", NRIC).length, 0);
  });

  test("does not flag a masked NRIC", () => {
    assert.equal(hits("NRIC SXXXX567D", NRIC).length, 0);
  });

  test("does not flag inside a longer token", () => {
    assert.equal(hits("code S1234567DX", NRIC).length, 0);
    assert.equal(hits("code ABS1234567D", NRIC).length, 0);
  });
});

describe("Singapore phone numbers", () => {
  for (const t of [
    "+65 9123 4567",
    "+6591234567",
    "+65-9123-4567",
    "(+65) 9123 4567",
    "mobile: 9123 4567",
    "call me at 81234567",
    "Tel 6123 4567",
  ]) {
    test(`flags "${t}"`, () => {
      assert.equal(hits(t, PHONE).length, 1);
      assert.notEqual(analyzePromptSafety(t).level, "safe");
    });
  }

  for (const t of ["order 91234567", "invoice 81234567", "+65 1234 5678", "ref 98765432 total"]) {
    test(`does not flag "${t}"`, () => {
      assert.equal(hits(t, PHONE).length, 0);
    });
  }
});

describe("sanitize, Singapore", () => {
  test("replaces NRIC and phone numbers and the result re-checks clean", async () => {
    const { sanitizeText } = await import("../src/lib/dev/sanitize-source.mjs");
    const { sanitized } = sanitizeText("NRIC S1234567D, +65 9123 4567, mobile 8123 4567", []);
    assert.equal(sanitized.split("[NRIC_REDACTED]").length - 1, 1);
    assert.equal(sanitized.split("[PHONE_REDACTED]").length - 1, 2);
    assert.match(sanitized, /mobile/);
    const sg = analyzePromptSafety(sanitized).issues.filter((i) => i.detail === NRIC || i.detail === PHONE);
    assert.equal(sg.length, 0);
  });
});
