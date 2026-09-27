import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseUninstallFeedback,
  UNINSTALL_REASONS,
  MAX_COMMENT_LENGTH,
} from "../src/routes/uninstall-feedback-source.mjs";

describe("uninstall survey validation", () => {
  test("accepts a listed reason with optional comment and version", () => {
    const r = parseUninstallFeedback({ reason: "too_many_warnings", comment: "  flags every email  ", version: "1.4.4" });
    assert.deepEqual(r, { ok: true, value: { reason: "too_many_warnings", comment: "flags every email", version: "1.4.4" } });
  });

  test("rejects reasons outside the fixed list", () => {
    assert.equal(parseUninstallFeedback({ reason: "<script>" }).ok, false);
    assert.equal(parseUninstallFeedback({}).ok, false);
    assert.equal(parseUninstallFeedback(null).ok, false);
  });

  test("caps the comment and drops empty ones", () => {
    assert.equal(parseUninstallFeedback({ reason: "other", comment: "x".repeat(MAX_COMMENT_LENGTH + 1) }).ok, false);
    assert.equal(parseUninstallFeedback({ reason: "other", comment: "   " }).value.comment, null);
  });

  test("keeps only well-formed versions", () => {
    assert.equal(parseUninstallFeedback({ reason: "other", version: "1.4.4" }).value.version, "1.4.4");
    assert.equal(parseUninstallFeedback({ reason: "other", version: "drop table" }).value.version, null);
  });

  test("every reason fits the VARCHAR(32) column", () => {
    for (const reason of UNINSTALL_REASONS) assert.ok(reason.length <= 32);
  });
});
