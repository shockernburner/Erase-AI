import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// `extension/CHANGELOG.json` is the source of truth for the shipping
// extension version. esbuild inlines this module into the api-server
// bundle, so `import.meta.url` (and therefore `moduleDir`) ends up at one
// of two different locations depending on how the server is run. We probe
// both, plus a deployed-environment fallback:
//
//   (a) Tests import this file directly without bundling, so `moduleDir`
//       is `<repo>/artifacts/api-server/src/routes`. From there, the
//       workspace root is FOUR levels up (`../../../../`) and the CHANGELOG
//       sits at `<repo>/extension/CHANGELOG.json`.
//
//   (b) Production runs the bundled output, so `moduleDir` is
//       `<repo>/artifacts/api-server/dist`. From there, the workspace root
//       is THREE levels up (`../../../`) and the CHANGELOG sits at the
//       same `<repo>/extension/CHANGELOG.json`.
//
//   (c) Deployed environments that ship only the `dist/` directory (no
//       source `extension/` folder alongside it) read from
//       `extension-changelog.json` next to the bundle. `build.mjs` copies
//       `extension/CHANGELOG.json` into dist for exactly this case.
//
// All three candidates are required — (a) and (b) target the SAME source
// file from different parent layouts, not the same layout twice.
const CHANGELOG_CANDIDATES = [
  path.resolve(moduleDir, "../../../../extension/CHANGELOG.json"), // (a) src/routes/ layout (tests)
  path.resolve(moduleDir, "../../../extension/CHANGELOG.json"),    // (b) dist/ layout (production)
  path.resolve(moduleDir, "extension-changelog.json"),             // (c) deployed-bundle fallback
];

// Build-time metadata sidecar (filename + size of the packed zip). This is
// always next to the bundled output in dist/.
const METADATA_PATH = path.resolve(moduleDir, "extension-metadata.json");

export async function readChangelog() {
  for (const candidate of CHANGELOG_CANDIDATES) {
    try {
      const raw = await readFile(candidate, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
        return parsed;
      }
    } catch {
      // not at this path — try the next candidate
    }
  }
  return null;
}

export async function readMetadata() {
  try {
    const raw = await readFile(METADATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function resolveExtensionVersionPayload() {
  const [changelog, metadata] = await Promise.all([
    readChangelog(),
    readMetadata(),
  ]);
  if (!changelog && !metadata) return null;

  // Prefer the live CHANGELOG entry — bumping the manifest + CHANGELOG must
  // automatically bump the version reported on the public status page even
  // if the dist sidecar happens to be stale.
  const latestEntry = changelog?.entries?.[0] ?? null;
  const version = latestEntry?.version ?? metadata?.version ?? null;
  if (!version) return null;

  return {
    version,
    filename: metadata?.filename ?? null,
    sizeBytes: typeof metadata?.sizeBytes === "number" ? metadata.sizeBytes : null,
    lastModified: metadata?.lastModified ?? latestEntry?.date ?? null,
    changelog: changelog?.entries ?? metadata?.changelog ?? [],
  };
}
