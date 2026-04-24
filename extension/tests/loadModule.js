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
  // Service-worker globals: `self` is the worker's global scope, and
  // `importScripts(...paths)` synchronously loads and evaluates other scripts
  // into that scope. We approximate both: `self` aliases the sandbox global,
  // and `importScripts` resolves each path relative to extension/src and
  // evaluates the file in this same context so its top-level assignments
  // (e.g. `self.eraseaiIsApiUrlAllowed = ...`) become visible to background.js.
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
    "({ getConfig, analyzePrompt, sanitizePrompt, testConnection })",
    sandbox,
  );
}

export function loadPopupSource() {
  return fs.readFileSync(path.join(SRC_DIR, "popup.js"), "utf8");
}

export function loadPopupHtml() {
  return fs.readFileSync(path.join(SRC_DIR, "popup.html"), "utf8");
}
