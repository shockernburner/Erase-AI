// Unit tests for the firewall outcome telemetry pipeline added in task #114.
//
// We can't easily boot Express + the real DB inside the api-server's
// `node --test` harness, so the route's validation, normalization, and
// admin-stats counting are extracted into pure helpers in
// `../src/lib/dev/outcome-source.mjs`. These tests pin that contract so
// regressions in the helpers (which the route imports verbatim) are
// caught before they reach production.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateOutcomePayload,
  normaliseCategories,
  normaliseRiskScore,
  normalisePieces,
  aggregateFirewallOutcomes,
  VALID_OUTCOME_LEVELS,
  VALID_OUTCOME_ACTIONS,
  MAX_OUTCOME_CATEGORIES,
  MAX_CATEGORY_LENGTH,
  MAX_PIECES_FILE_LEVELS,
} from "../src/lib/dev/outcome-source.mjs";

describe("validateOutcomePayload — accepted shapes", () => {
  test("accepts a minimal valid payload and returns normalised values", () => {
    const r = validateOutcomePayload({ level: "danger", action: "cancel" });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, {
      level: "danger",
      action: "cancel",
      riskScore: null,
      categories: [],
      pieces: null,
    });
  });

  test("accepts a full payload with risk score + categories", () => {
    const r = validateOutcomePayload({
      level: "caution",
      action: "sanitize",
      riskScore: 42,
      categories: ["pii", "secrets"],
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, {
      level: "caution",
      action: "sanitize",
      riskScore: 42,
      categories: ["pii", "secrets"],
      pieces: null,
    });
  });

  test("accepts a payload with the 1.3.5 pieces telemetry summary", () => {
    const r = validateOutcomePayload({
      level: "caution",
      action: "send-anyway",
      riskScore: 70,
      categories: ["pii"],
      pieces: {
        promptPieces: 1,
        filePieces: 2,
        skippedFiles: 1,
        levels: { safe: 2, caution: 1 },
      },
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value.pieces, {
      promptPieces: 1,
      filePieces: 2,
      skippedFiles: 1,
      levels: { safe: 2, caution: 1 },
    });
  });

  test("accepts every documented level / action combination", () => {
    for (const level of VALID_OUTCOME_LEVELS) {
      for (const action of VALID_OUTCOME_ACTIONS) {
        const r = validateOutcomePayload({ level, action });
        assert.equal(r.ok, true, `level=${level} action=${action} should validate`);
      }
    }
  });
});

describe("validateOutcomePayload — rejected shapes", () => {
  test("rejects unknown levels with a level-specific error", () => {
    const r = validateOutcomePayload({ level: "danger-zone", action: "cancel" });
    assert.equal(r.ok, false);
    assert.match(r.error, /^level must be one of/);
  });

  test("rejects unknown actions with an action-specific error", () => {
    const r = validateOutcomePayload({ level: "danger", action: "explode" });
    assert.equal(r.ok, false);
    assert.match(r.error, /^action must be one of/);
  });

  test("rejects payload missing level entirely", () => {
    const r = validateOutcomePayload({ action: "cancel" });
    assert.equal(r.ok, false);
    assert.match(r.error, /^level must be one of/);
  });

  test("rejects payload missing action entirely", () => {
    const r = validateOutcomePayload({ level: "caution" });
    assert.equal(r.ok, false);
    assert.match(r.error, /^action must be one of/);
  });

  test("rejects null / non-object payloads", () => {
    for (const bad of [null, undefined, 5, "danger", []]) {
      const r = validateOutcomePayload(bad);
      assert.equal(r.ok, false, `${JSON.stringify(bad)} should be rejected`);
    }
  });
});

describe("normaliseRiskScore — bounding + coercion", () => {
  test("clamps to [0, 100] and rounds to an integer", () => {
    assert.equal(normaliseRiskScore(0), 0);
    assert.equal(normaliseRiskScore(100), 100);
    assert.equal(normaliseRiskScore(57.4), 57);
    assert.equal(normaliseRiskScore(57.6), 58);
    assert.equal(normaliseRiskScore(-12), 0);
    assert.equal(normaliseRiskScore(9999), 100);
  });

  test("returns null for non-finite or non-numeric input", () => {
    assert.equal(normaliseRiskScore(NaN), null);
    assert.equal(normaliseRiskScore(Infinity), null);
    assert.equal(normaliseRiskScore(-Infinity), null);
    assert.equal(normaliseRiskScore("42"), null);
    assert.equal(normaliseRiskScore(null), null);
    assert.equal(normaliseRiskScore(undefined), null);
  });
});

describe("normaliseCategories — bounded, deduped, string-only", () => {
  test("returns empty array for non-array input", () => {
    assert.deepEqual(normaliseCategories(null), []);
    assert.deepEqual(normaliseCategories("pii"), []);
    assert.deepEqual(normaliseCategories(undefined), []);
  });

  test("drops non-string entries while keeping order of strings", () => {
    assert.deepEqual(
      normaliseCategories(["pii", 42, null, "secrets", undefined, "pii_again"]),
      ["pii", "secrets", "pii_again"],
    );
  });

  test("trims whitespace and treats empty/whitespace-only entries as drops", () => {
    assert.deepEqual(
      normaliseCategories(["  pii  ", "", "   ", "secrets"]),
      ["pii", "secrets"],
    );
  });

  test("dedupes after trimming", () => {
    assert.deepEqual(
      normaliseCategories(["pii", " pii ", "PII"]),
      ["pii", "PII"],
    );
  });

  test(`caps category names at ${MAX_CATEGORY_LENGTH} characters`, () => {
    const long = "x".repeat(200);
    const out = normaliseCategories([long]);
    assert.equal(out.length, 1);
    assert.equal(out[0].length, MAX_CATEGORY_LENGTH);
  });

  test(`caps total categories at ${MAX_OUTCOME_CATEGORIES}`, () => {
    const tooMany = Array.from({ length: 100 }, (_, i) => `c${i}`);
    const out = normaliseCategories(tooMany);
    assert.equal(out.length, MAX_OUTCOME_CATEGORIES);
    assert.equal(out[0], "c0");
    assert.equal(out[MAX_OUTCOME_CATEGORIES - 1], `c${MAX_OUTCOME_CATEGORIES - 1}`);
  });
});

describe("normalisePieces — extension 1.3.5 attachment-scan telemetry", () => {
  test("returns null for missing / non-object input", () => {
    assert.equal(normalisePieces(null), null);
    assert.equal(normalisePieces(undefined), null);
    assert.equal(normalisePieces("nope"), null);
    assert.equal(normalisePieces(42), null);
  });

  test("returns null when every field is zero / empty (no signal worth storing)", () => {
    assert.equal(
      normalisePieces({ promptPieces: 0, filePieces: 0, skippedFiles: 0, levels: {} }),
      null,
    );
    // Same outcome when fields are simply absent.
    assert.equal(normalisePieces({}), null);
  });

  test("preserves a typical multi-piece payload", () => {
    const out = normalisePieces({
      promptPieces: 1,
      filePieces: 3,
      skippedFiles: 2,
      levels: { safe: 2, caution: 1, danger: 1 },
    });
    assert.deepEqual(out, {
      promptPieces: 1,
      filePieces: 3,
      skippedFiles: 2,
      levels: { safe: 2, caution: 1, danger: 1 },
    });
  });

  test("clamps wildly large counts to a fixed ceiling so a hostile client cannot grow the row", () => {
    const out = normalisePieces({
      promptPieces: 1e9,
      filePieces: 999_999,
      skippedFiles: 12345,
      levels: { safe: 1e9, caution: 1e9 },
    });
    assert.equal(out.promptPieces, 256);
    assert.equal(out.filePieces, 256);
    assert.equal(out.skippedFiles, 256);
    assert.equal(out.levels.safe, 256);
    assert.equal(out.levels.caution, 256);
  });

  test("coerces fractional / negative / non-numeric counts to safe non-negative integers", () => {
    const out = normalisePieces({
      promptPieces: 2.9,
      filePieces: -5,
      skippedFiles: "not a number",
      levels: { safe: 1.4, caution: -3, danger: NaN },
    });
    assert.equal(out.promptPieces, 2);
    assert.equal(out.filePieces, 0);
    assert.equal(out.skippedFiles, 0);
    assert.equal(out.levels.safe, 1);
    assert.equal(out.levels.caution, 0);
    assert.equal(out.levels.danger, 0);
  });

  test("caps the number of distinct level keys and trims long key names", () => {
    const levels = {};
    for (let i = 0; i < MAX_PIECES_FILE_LEVELS + 10; i += 1) {
      levels[`lvl${i}`] = i + 1;
    }
    levels["x".repeat(64)] = 1;
    const out = normalisePieces({ promptPieces: 1, levels });
    assert.ok(Object.keys(out.levels).length <= MAX_PIECES_FILE_LEVELS);
    for (const key of Object.keys(out.levels)) {
      assert.ok(key.length <= 16, `${key} should be trimmed to 16 chars`);
    }
  });

  test("drops empty / whitespace-only / non-string level keys", () => {
    const out = normalisePieces({
      promptPieces: 1,
      levels: { "": 5, "   ": 5, safe: 2 },
    });
    assert.deepEqual(Object.keys(out.levels).sort(), ["safe"]);
  });

  test("non-object levels field is treated as no levels (not a hard rejection)", () => {
    const out = normalisePieces({ promptPieces: 1, levels: "not-an-object" });
    assert.deepEqual(out, {
      promptPieces: 1,
      filePieces: 0,
      skippedFiles: 0,
      levels: {},
    });
  });
});

describe("aggregateFirewallOutcomes — admin stats counting rules", () => {
  test("returns zeros for empty input", () => {
    assert.deepEqual(aggregateFirewallOutcomes([]), {
      shown: 0,
      saved: 0,
      dismissed: 0,
    });
    assert.deepEqual(aggregateFirewallOutcomes(null), {
      shown: 0,
      saved: 0,
      dismissed: 0,
    });
  });

  test("ignores safe-level rows even if action is sanitize/cancel — those are not 'warnings shown'", () => {
    const r = aggregateFirewallOutcomes([
      { level: "safe", action: "auto-send" },
      { level: "safe", action: "cancel" },
      { level: "safe", action: "sanitize" },
    ]);
    assert.deepEqual(r, { shown: 0, saved: 0, dismissed: 0 });
  });

  test("counts cancel + sanitize on caution/danger as 'saved'", () => {
    const r = aggregateFirewallOutcomes([
      { level: "caution", action: "cancel" },
      { level: "danger", action: "sanitize" },
      { level: "caution", action: "sanitize" },
    ]);
    assert.deepEqual(r, { shown: 3, saved: 3, dismissed: 0 });
  });

  test("counts send-anyway on caution/danger as 'dismissed'", () => {
    const r = aggregateFirewallOutcomes([
      { level: "caution", action: "send-anyway" },
      { level: "danger", action: "send-anyway" },
    ]);
    assert.deepEqual(r, { shown: 2, saved: 0, dismissed: 2 });
  });

  test("mixed real-world batch produces the expected breakdown", () => {
    const r = aggregateFirewallOutcomes([
      { level: "danger", action: "cancel" },       // saved
      { level: "danger", action: "send-anyway" },  // dismissed
      { level: "caution", action: "sanitize" },    // saved
      { level: "caution", action: "cancel" },      // saved
      { level: "caution", action: "send-anyway" }, // dismissed
      { level: "safe", action: "auto-send" },      // ignored
      { level: "safe", action: "cancel" },         // ignored
      { level: "danger", action: "auto-send" },    // shown but neither saved nor dismissed
    ]);
    assert.deepEqual(r, { shown: 6, saved: 3, dismissed: 2 });
  });

  test("rows with caution/danger level always count as 'shown' even when action is missing or malformed — a warning was rendered, we just don't know the terminal action", () => {
    const r = aggregateFirewallOutcomes([
      { level: null, action: "cancel" },         // skipped: no warning level
      { action: "cancel" },                       // skipped: no warning level
      { level: "danger" },                        // shown, neither saved nor dismissed
      { level: "danger", action: null },          // shown, neither saved nor dismissed
      { level: "caution", action: "cancel" },     // shown + saved
    ]);
    assert.deepEqual(r, { shown: 3, saved: 1, dismissed: 0 });
  });
});
