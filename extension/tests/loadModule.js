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
