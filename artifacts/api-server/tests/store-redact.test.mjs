// Regression tests for redactInputForStorage() — task #173.
//
// Task #172 added detection for casually-typed credential disclosures
// like "my api key is hunter2", but the storage-side redactor used by
// /api/dev/{analyze,sanitize} was written before those rules existed.
// Without a value-masking step the disclosed secret still landed in
// dev_scans.input_text in plain text inside the surrounding sentence,
// even though the matched issue's `match` field was masked separately.
//
// These tests pin the value-masking behaviour for every casual
// credential noun phrase that CASUAL_SECRET_PATTERNS covers, and
// confirm the rest of the redactor (length cap, db url, jwt, prefix
// secret, prose passthrough) still behaves the way the dev route
// expects.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { redactInputForStorage } from "../src/lib/dev/store-redact-source.mjs";
import { maskCasualSecretsInText } from "../src/lib/dev/safety-source.mjs";

describe("redactInputForStorage — casual credential value masking", () => {
  test("'my api key is hunter2' stores the value as ***", () => {
    const out = redactInputForStorage("my api key is hunter2");
    assert.equal(out, "my api key is ***");
    assert.ok(!out.includes("hunter2"), `value leaked: ${out}`);
  });

  test("masks every casual credential noun phrase the firewall detects", () => {
    const cases = [
      ["my secret is hunter2", "my secret is ***"],
      ["the token is abcd1234", "the token is ***"],
      ["credentials: admin_pw99", "credentials: ***"],
      ["bearer token = sk_test_abcdef", "bearer token = ***"],
      ["refresh_token: rt_9f8a7b6c", "refresh_token: ***"],
      ["auth token is GoCubsGo!", "auth token is ***"],
      ["access key = AKIA_FAKE_1234", "access key = ***"],
      ["client secret: cs_live_xyz789", "client secret: ***"],
      ["secret_key=topsecret42", "secret_key=***"],
    ];
    for (const [input, expected] of cases) {
      assert.equal(
        redactInputForStorage(input),
        expected,
        `input "${input}" did not redact correctly`,
      );
    }
  });

  test("masks values embedded mid-sentence, leaving surrounding prose intact", () => {
    const input = "hi team, the api key is hunter2 and please rotate it";
    const out = redactInputForStorage(input);
    assert.equal(
      out,
      "hi team, the api key is *** and please rotate it",
    );
    assert.ok(!out.includes("hunter2"));
  });

  test("masks multiple disclosures in the same input", () => {
    const input = "api key is hunter2, secret is opensesame";
    const out = redactInputForStorage(input);
    assert.ok(!out.includes("hunter2"), `value leaked: ${out}`);
    assert.ok(!out.includes("opensesame"), `value leaked: ${out}`);
    assert.match(out, /api key is \*\*\*/);
    assert.match(out, /secret is \*\*\*/);
  });

  test("does not mask prose where the value is a denylisted word", () => {
    // "the api key is required" / "the token is valid" must stay clean
    // — the entropy guard in CASUAL_SECRET_PATTERNS rejects these, and
    // the storage redactor must agree (otherwise we'd corrupt benign
    // prose into "the api key is ***").
    const inputs = [
      "the api key is required for this endpoint",
      "the token is valid until tomorrow",
      "credentials are configured in env",
    ];
    for (const input of inputs) {
      assert.equal(
        redactInputForStorage(input),
        input,
        `prose was incorrectly masked: ${input}`,
      );
    }
  });
});

describe("redactInputForStorage — pre-existing redaction rules still hold", () => {
  test("clean prose round-trips unchanged", () => {
    const input = "how do I make a peanut butter sandwich?";
    assert.equal(redactInputForStorage(input), input);
  });

  test("postgres URLs are replaced with [DB_URL_REDACTED]", () => {
    const out = redactInputForStorage("connect to postgres://u:p@host/db please");
    assert.match(out, /\[DB_URL_REDACTED\]/);
    assert.ok(!out.includes("u:p@host"));
  });

  test("openai-style prefixed key is partially masked, not echoed", () => {
    const out = redactInputForStorage("here is sk-abcdefghijklmnop for you");
    assert.ok(!out.includes("sk-abcdefghijklmnop"), `key leaked: ${out}`);
  });

  test("input over 500 chars is truncated with an ellipsis", () => {
    const input = "a".repeat(600);
    const out = redactInputForStorage(input);
    assert.equal(out.length, 503);
    assert.ok(out.endsWith("..."));
  });
});

describe("maskCasualSecretsInText — direct unit coverage", () => {
  test("preserves leading/trailing context exactly", () => {
    assert.equal(
      maskCasualSecretsInText("> my api key is hunter2 <"),
      "> my api key is *** <",
    );
  });

  test("no-ops when there are no casual credential disclosures", () => {
    const input = "the weather is nice today";
    assert.equal(maskCasualSecretsInText(input), input);
  });
});
