// Generates extension/src/local-scanner.js from the api-server's detection
// rules so the browser extension can scan on-device with *exactly* the same
// patterns the server uses — no hand-maintained copy to drift.
//
//   node scripts/src/build-extension-local-scanner.mjs          # write
//   node scripts/src/build-extension-local-scanner.mjs --check  # exit 1 if stale
//
// extension/tests/local-scanner.test.js runs the same check, so changing a
// server rule without regenerating fails the extension test suite.
//
// Each source module is wrapped in its own function scope; its `import`
// lines become parameters fed from the modules it depends on, and its
// `export`ed names become that scope's return value.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_DIR = path.join(repoRoot, "artifacts/api-server/src/lib/dev");
export const OUTPUT_PATH = path.join(repoRoot, "extension/src/local-scanner.js");

// Dependency order: each module may only import from ones listed before it.
const MODULES = ["secrets-source.mjs", "safety-source.mjs", "sanitize-source.mjs"];
const PUBLIC_API = ["analyzePromptSafety", "sanitizeText"];

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*["']\.\/([\w.-]+)["'];?\s*$/;
const EXPORT_RE = /^export\s+(?:async\s+)?(function|const|let|class)\s+([A-Za-z_$][\w$]*)/;

function wrapModule(file) {
  const src = readFileSync(path.join(SOURCE_DIR, file), "utf8");
  const deps = [];
  const exported = [];
  const body = src.split("\n").map((line) => {
    const imp = line.match(IMPORT_RE);
    if (imp) {
      if (!MODULES.includes(imp[2])) throw new Error(`${file} imports ${imp[2]}, which is not bundled`);
      deps.push({ from: imp[2], names: imp[1].split(",").map((n) => n.trim()).filter(Boolean) });
      return "";
    }
    if (/^import\s/.test(line)) throw new Error(`${file}: unsupported import form: ${line}`);
    const exp = line.match(EXPORT_RE);
    if (exp) {
      exported.push(exp[2]);
      return line.replace(/^export\s+/, "");
    }
    if (/^export\s/.test(line)) throw new Error(`${file}: unsupported export form: ${line}`);
    return line;
  });
  const params = deps.map((d) => `{ ${d.names.join(", ")} }`).join(", ");
  const args = deps.map((d) => `modules[${JSON.stringify(d.from)}]`).join(", ");
  return `  modules[${JSON.stringify(file)}] = (function (${params}) {
${body.map((l) => (l ? `    ${l}` : "")).join("\n")}
    return { ${exported.join(", ")} };
  })(${args});
`;
}

export function buildLocalScannerSource() {
  const wrapped = MODULES.map(wrapModule).join("\n");
  const api = PUBLIC_API.map((name) => {
    const exportsName = new RegExp(`^export\\s+(?:async\\s+)?function\\s+${name}\\b`, "m");
    const owner = MODULES.find((m) => exportsName.test(readFileSync(path.join(SOURCE_DIR, m), "utf8")));
    if (!owner) throw new Error(`public API ${name} is not exported by any bundled module`);
    return `    ${name}: modules[${JSON.stringify(owner)}].${name},`;
  }).join("\n");
  return `// GENERATED FILE — do not edit.
// Built from artifacts/api-server/src/lib/dev/{${MODULES.join(",")}}
// by scripts/src/build-extension-local-scanner.mjs. Regenerate after changing
// any server detection rule; the extension tests fail while this is stale.
//
// On-device copy of the server's prompt checks, exposed as
// globalThis.EraseAILocalScanner for the service worker (importScripts).
(function (root) {
  "use strict";
  const modules = {};
${wrapped}
  root.EraseAILocalScanner = {
${api}
  };
})(typeof self !== "undefined" ? self : globalThis);
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const next = buildLocalScannerSource();
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(OUTPUT_PATH, "utf8");
    } catch {
      // missing counts as stale
    }
    if (current !== next) {
      console.error(`${path.relative(repoRoot, OUTPUT_PATH)} is stale — run node scripts/src/build-extension-local-scanner.mjs`);
      process.exit(1);
    }
    console.log("local-scanner.js is up to date");
  } else {
    writeFileSync(OUTPUT_PATH, next);
    console.log(`wrote ${path.relative(repoRoot, OUTPUT_PATH)}`);
  }
}
