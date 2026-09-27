import { describe, it, expect } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLocalScannerSource, OUTPUT_PATH } from "../../scripts/src/build-extension-local-scanner.mjs";
import { analyzePromptSafety } from "../../artifacts/api-server/src/lib/dev/safety-source.mjs";
import { sanitizeText } from "../../artifacts/api-server/src/lib/dev/sanitize-source.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadLocalScanner() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext("var self = globalThis;", sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "src", "local-scanner.js"), "utf8"), sandbox);
  return sandbox.EraseAILocalScanner;
}

const CORPUS = [
  "my AWS key is AKIAIOSFODNN7EXAMPLE",
  "email jane.doe@example.com or call 415-555-0132",
  "postgres://admin:hunter2@db.internal:5432/prod",
  "Bearer abc.def.ghi and sk-proj1234567890",
  "card 4111 1111 1111 1111, ssn 123-45-6789",
  "my password is correcthorsebattery",
  "function computePayroll() { return 42; } class TaxEngine {}",
  "What's the capital of France?",
  "",
];

describe("on-device scanner (extension/src/local-scanner.js)", () => {
  it("is regenerated from the current api-server rules", () => {
    // Fails when a server rule changed without running
    // node scripts/src/build-extension-local-scanner.mjs
    expect(fs.readFileSync(OUTPUT_PATH, "utf8")).toBe(buildLocalScannerSource());
  });

  it("gives exactly the server's analysis and sanitization for every corpus prompt", () => {
    const local = loadLocalScanner();
    for (const text of CORPUS) {
      expect(JSON.parse(JSON.stringify(local.analyzePromptSafety(text)))).toEqual(analyzePromptSafety(text));
      expect(JSON.parse(JSON.stringify(local.sanitizeText(text)))).toEqual(sanitizeText(text));
    }
  });
});
