// What the server keeps of a message in scan history. The product promise is that checks happen at the
// Send button and nothing is kept that the user did not choose to keep: personal data and secrets are
// replaced with labels before anything is stored, and a "no retention" setting stores no text at all.
// Before this, Android and personal scans stored up to 500 raw characters (routes/mobile.ts, personal.ts).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { excerptForStorage, flagsForStorage, suggestionsForStorage, STORED_EXCERPT_MAX, NOT_STORED } from "../src/lib/dev/store-excerpt-source.mjs";

describe("excerptForStorage", () => {
  test("keeps ordinary text so history stays readable", () => {
    assert.equal(excerptForStorage("Summarise the attached meeting notes"), "Summarise the attached meeting notes");
  });

  test("replaces personal data with labels", () => {
    const out = excerptForStorage("Email jordan.lee@example.com, card 4111 1111 1111 1111, phone 415-555-0132");
    assert.ok(!out.includes("jordan.lee"), out);
    assert.ok(!out.includes("4111"), out);
    assert.ok(!out.includes("555-0132"), out);
    assert.match(out, /EMAIL/);
    assert.match(out, /CARD/);
  });

  test("masks Singapore and Hong Kong phone numbers and national ID numbers", () => {
    const out = excerptForStorage("call +65 8123 4567 or 9123 4567, HK +852 9123 4567, NRIC S1234567D");
    assert.ok(!/8123|9123|4567|1234567/.test(out), out);
  });

  test("masks keys, tokens, passwords and database addresses", () => {
    const out = excerptForStorage("key AKIAIOSFODNN7EXAMPLE and postgres://admin:hunter2@db.internal/app, my password is hunter2");
    assert.ok(!out.includes("AKIAIOSFODNN7EXAMPLE"), out);
    assert.ok(!out.includes("hunter2"), out);
    assert.ok(!out.includes("db.internal"), out);
  });

  test("never stores more than the cap, and says so", () => {
    const out = excerptForStorage("a ".repeat(400));
    assert.ok(out.length <= STORED_EXCERPT_MAX + 3, String(out.length));
    assert.ok(out.endsWith("..."));
    assert.equal(STORED_EXCERPT_MAX, 200);
  });

  test("a value that straddles the cut is masked first, so no fragment is kept", () => {
    const text = "x".repeat(185) + " jordan.lee@example.com please";
    const out = excerptForStorage(text);
    assert.ok(!out.includes("jordan"), out);
    assert.ok(!out.includes("example.com"), out);
  });

  test("no-retention mode stores no message text at all", () => {
    const out = excerptForStorage("my card is 4111 1111 1111 1111, Jordan Lee", { zeroRetention: true });
    assert.equal(out, NOT_STORED);
    assert.ok(!out.includes("Jordan"));
  });

  test("tolerates empty and non-string input", () => {
    assert.equal(excerptForStorage(""), "");
    assert.equal(excerptForStorage(undefined), "");
    assert.equal(excerptForStorage(null), "");
  });
});

describe("stored flags and suggestions carry no matched values", () => {
  test("flags keep type, severity, detail and position, not the matched text", () => {
    const out = flagsForStorage([{ type: "secret", severity: "high", detail: "AWS key", matchedText: "AKIAIOSFODNN7EXAMPLE", position: { start: 3, end: 23 } }]);
    assert.deepEqual(out, [{ type: "secret", severity: "high", detail: "AWS key", matchedText: "[REDACTED]", position: { start: 3, end: 23 } }]);
  });
  test("suggestions lose the original value", () => {
    const out = suggestionsForStorage([{ original: "jordan.lee@example.com", replacement: "[EMAIL]", reason: "pii" }]);
    assert.equal(out[0].original, "[REDACTED]");
    assert.equal(out[0].replacement, "[EMAIL]");
  });
  test("tolerates missing lists", () => {
    assert.deepEqual(flagsForStorage(undefined), []);
    assert.deepEqual(suggestionsForStorage(null), []);
  });
});

describe("routes use the helper and never store raw text", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const read = (f) => readFileSync(path.join(here, "..", "src", "routes", f), "utf8");

  test("mobile.ts and personal.ts store only excerptForStorage output", () => {
    for (const f of ["mobile.ts", "personal.ts"]) {
      const src = read(f);
      assert.match(src, /excerptForStorage/, `${f} should import excerptForStorage`);
    }
    const mobile = read("mobile.ts");
    assert.ok(!/text\.substring\(0, 500\)/.test(mobile), "mobile.ts must not store the first 500 raw characters");
    assert.ok(!/\(primaryText \|\| "multi-piece scan"\)\.substring\(0, 200\)/.test(mobile), "mobile.ts must not store raw multi-piece text");
    assert.match(mobile, /flagsForStorage/, "mobile.ts must not store raw matched values in flags");
    assert.ok(!/JSON\.stringify\(analysis\.flags \?\? \[\]\)/.test(mobile), "mobile.ts must not store analysis.flags as they are");
    const personal = read("personal.ts");
    assert.ok(!/text\.substring\(0, 8\) \+ "\*\*\*"/.test(personal), "personal.ts must not keep the first and last characters of a matched value");
    assert.ok(!/content\.substring\(0, MAX_STORED_CONTENT_LENGTH\)/.test(personal), "personal.ts must not store raw content");
  });

  test("the developer API stores the same masked excerpt", () => {
    const dev = read("dev.ts");
    assert.match(dev, /excerptForStorage/);
    assert.ok(!/redactInputForStorage\(text\)/.test(dev), "dev.ts should use excerptForStorage for input");
  });
});
