import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/lib/personalAnalyzer.ts", import.meta.url), "utf8");
const transformed = transformSync(source, {
  format: "esm",
  loader: "ts",
  sourcemap: false,
  target: "es2022",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`;
const { analyzeText } = await import(moduleUrl);

describe("personal analyzer sensitive data detection", () => {
  test("detects name, email, phone, and API key in the Android firewall sample prompt", () => {
    const prompt = "My client John Rahman's phone is +8801712345678, email john@example.com, and the API key is sk_live_test_123456789.";
    const result = analyzeText(prompt);
    const details = result.flags.map((flag) => flag.detail);

    assert.ok(details.includes("Person name detected"), details.join(" | "));
    assert.ok(details.includes("Email address detected"), details.join(" | "));
    assert.ok(details.includes("Phone number detected"), details.join(" | "));
    assert.ok(details.includes("API key detected"), details.join(" | "));
  });

  test("does not flag ordinary capitalized prose as a person name", () => {
    const result = analyzeText("Write a memo about Product Strategy for Monday morning.");
    assert.equal(result.flags.some((flag) => flag.detail === "Person name detected"), false);
  });
});