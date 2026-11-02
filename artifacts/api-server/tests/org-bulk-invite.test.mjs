// Inviting a whole team at once: paste the emails however they come (a column from a spreadsheet,
// a comma list, "Name <email>" lines) and get a clean list back. routes/org.ts then invites each
// valid address through the same createInvite path as a single invite, so seat and role rules apply.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BULK_INVITE_MAX, parseEmailList } from "../src/lib/org/bulk-invite-source.mjs";

describe("parseEmailList", () => {
  test("splits on commas, semicolons, spaces and new lines", () => {
    const out = parseEmailList("a@x.com, b@x.com;c@x.com d@x.com\ne@x.com\r\nf@x.com");
    assert.deepEqual(out.valid, ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com", "f@x.com"]);
    assert.deepEqual(out.invalid, []);
  });

  test("lowercases and removes repeats, counting them", () => {
    const out = parseEmailList("Ana@Acme.com\nana@acme.com\nbo@acme.com");
    assert.deepEqual(out.valid, ["ana@acme.com", "bo@acme.com"]);
    assert.equal(out.duplicates, 1);
  });

  test("understands 'Name <email>' as pasted from a mail client", () => {
    const out = parseEmailList('Ana Reyes <ana@acme.com>, "Bo, Chen" <bo@acme.com>');
    assert.deepEqual(out.valid, ["ana@acme.com", "bo@acme.com"]);
  });

  test("addresses quoted the way a CSV export writes them are kept, without the quotes", () => {
    const out = parseEmailList('"ana@acme.com","bo@acme.com"\n\'cy@acme.com\'');
    assert.deepEqual(out.valid, ["ana@acme.com", "bo@acme.com", "cy@acme.com"]);
    assert.deepEqual(out.invalid, []);
  });

  test("reports what is not an email instead of dropping it silently", () => {
    const out = parseEmailList("ana@acme.com not-an-email @nope bo@acme");
    assert.deepEqual(out.valid, ["ana@acme.com"]);
    assert.deepEqual(out.invalid, ["not-an-email", "@nope", "bo@acme"]);
  });

  test("anything beyond the cap is reported as skipped, not invited", () => {
    const text = Array.from({ length: 5 }, (_, i) => `p${i}@x.com`).join("\n");
    const out = parseEmailList(text, { max: 3 });
    assert.deepEqual(out.valid, ["p0@x.com", "p1@x.com", "p2@x.com"]);
    assert.deepEqual(out.skipped, ["p3@x.com", "p4@x.com"]);
  });

  test("the default cap is 100", () => {
    assert.equal(BULK_INVITE_MAX, 100);
    const text = Array.from({ length: 120 }, (_, i) => `p${i}@x.com`).join(" ");
    const out = parseEmailList(text);
    assert.equal(out.valid.length, 100);
    assert.equal(out.skipped.length, 20);
  });

  test("empty and non-string input give an empty result", () => {
    for (const input of ["", "   \n ", null, undefined, 42, {}]) {
      assert.deepEqual(parseEmailList(input), { valid: [], invalid: [], skipped: [], duplicates: 0 });
    }
  });

  test("a huge paste is bounded", () => {
    const out = parseEmailList("x@y.com ".repeat(200000));
    assert.equal(out.valid.length, 1);
  });
});
