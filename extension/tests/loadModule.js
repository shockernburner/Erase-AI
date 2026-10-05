import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "..", "src");

export function loadBackgroundModule({ chrome, fetch }) {
  const src = fs.readFileSync(path.join(SRC_DIR, "background.js"), "utf8");
  const sandbox = {
    chrome,
    fetch,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    URL,
    Set,
    Map,
    Date,
    Error,
    Symbol,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    RegExp,
  };
  vm.createContext(sandbox);
  // Service-worker globals: `self` is the worker's global scope. background.js
  // does not currently call importScripts, but we expose a stub so the test
  // harness keeps mirroring the real service-worker environment.
  vm.runInContext("var self = globalThis;", sandbox);
  sandbox.importScripts = (...files) => {
    for (const file of files) {
      const fullPath = path.resolve(SRC_DIR, file);
      const code = fs.readFileSync(fullPath, "utf8");
      vm.runInContext(code, sandbox, { filename: file });
    }
  };
  vm.runInContext(src, sandbox, { filename: "background.js" });
  return vm.runInContext(
    "({ getConfig, analyzePrompt, sanitizePrompt, testConnection, reportOutcome, handleInstalled, trackOutcomeForReview, loadGrowth, beginCheck, planSummary, syncManaged })",
    sandbox,
  );
}

// concurrency-config.js exposes `globalThis.EraseAIConcurrency`. Both
// content.js and popup.js consume it, so any test that evaluates either
// of those sources must load this first. Returning the raw source lets
// each test prepend it inside its own evaluation context (vm.Sandbox,
// `new Function`, jsdom `eval`, etc) without us having to know which.
export function loadConcurrencyConfigSource() {
  return fs.readFileSync(path.join(SRC_DIR, "concurrency-config.js"), "utf8");
}

export function loadPopupSource() {
  // Prepend the shared concurrency config so popup.js's references to
  // globalThis.EraseAIConcurrency resolve. The IIFE inside the config
  // file is idempotent (guarded by `if (globalThis.EraseAIConcurrency)
  // return`), so re-loading across tests is safe.
  const config = loadConcurrencyConfigSource();
  const popup = fs.readFileSync(path.join(SRC_DIR, "popup.js"), "utf8");
  // Trailing newline + semicolon on its OWN line keeps popup.js's first
  // line at column 0 so existing regex sweeps anchored with /^const …/m
  // (e.g. the CANONICAL_*_URL audit) keep matching.
  return `${config}\n;\n${popup}`;
}

export function loadPopupHtml() {
  return fs.readFileSync(path.join(SRC_DIR, "popup.html"), "utf8");
}
