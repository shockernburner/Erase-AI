import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir, access, readFile, stat, writeFile } from "node:fs/promises";
import AdmZip from "adm-zip";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

// Production builds of the extension only allow the EraseAI-controlled hosts
// below. *.replit.app is intentionally absent so a public release cannot be
// pointed at a third-party Replit deployment that mimics our API contract.
const PRODUCTION_ALLOWED_HOSTS = ["eraseai.ai", "*.eraseai.ai"];

// Hosts that must remain in the production manifest's host_permissions so the
// service worker can fetch the EraseAI API. Everything else (*.replit.app in
// particular) is stripped from the manifest before packing.
const PRODUCTION_API_HOST_PERMISSIONS = new Set([
  "https://eraseai.ai/*",
  "https://*.eraseai.ai/*",
]);
// Non-API host_permissions (the AI chat sites the content script runs on) are
// passed through unchanged.
const NON_API_HOST_PERMISSION_PATTERN = /^https:\/\/[^*]/;

function buildProductionConfigSource() {
  return [
    "/* AUTO-GENERATED at build time — do not edit. See artifacts/api-server/build.mjs. */",
    "self.ERASEAI_BUILD = {",
    '  env: "production",',
    `  allowedApiHosts: ${JSON.stringify(PRODUCTION_ALLOWED_HOSTS)},`,
    "};",
    "",
    "self.eraseaiIsHostAllowed = function (hostname) {",
    '  if (typeof hostname !== "string" || !hostname) return false;',
    "  const patterns = self.ERASEAI_BUILD.allowedApiHosts;",
    "  return patterns.some((p) => {",
    '    if (p.startsWith("*.")) {',
    "      const suffix = p.slice(1);",
    "      return hostname.endsWith(suffix) && hostname.length > suffix.length;",
    "    }",
    "    return hostname === p;",
    "  });",
    "};",
    "",
    "self.eraseaiIsApiUrlAllowed = function (url) {",
    '  if (typeof url !== "string" || !url.startsWith("https://")) return false;',
    "  let hostname;",
    "  try { hostname = new URL(url).hostname; } catch { return false; }",
    "  return self.eraseaiIsHostAllowed(hostname);",
    "};",
    "",
  ].join("\n");
}

function lockDownManifestForProduction(manifest) {
  const out = { ...manifest };
  const original = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
  const kept = [];
  const dropped = [];
  for (const entry of original) {
    if (typeof entry !== "string") continue;
    if (PRODUCTION_API_HOST_PERMISSIONS.has(entry)) {
      kept.push(entry);
    } else if (NON_API_HOST_PERMISSION_PATTERN.test(entry)) {
      // Concrete (non-wildcard) hostnames — the AI chat sites the content
      // script runs against. Keep these untouched.
      kept.push(entry);
    } else {
      dropped.push(entry);
    }
  }
  out.host_permissions = kept;
  return { manifest: out, dropped };
}

function applyProductionLockdownToZip(zip, prefix) {
  // Replace src/build-config.js with the production allowlist.
  const configEntryName = `${prefix}src/build-config.js`;
  zip.deleteFile(configEntryName);
  zip.addFile(configEntryName, Buffer.from(buildProductionConfigSource(), "utf8"));

  // Rewrite manifest.json so host_permissions matches the locked-down list.
  const manifestEntryName = `${prefix}manifest.json`;
  const manifestEntry = zip.getEntry(manifestEntryName);
  if (!manifestEntry) {
    throw new Error(`[build] expected ${manifestEntryName} inside the packed zip — aborting build.`);
  }
  const manifestJson = JSON.parse(manifestEntry.getData().toString("utf8"));
  const { manifest: locked, dropped } = lockDownManifestForProduction(manifestJson);
  zip.deleteFile(manifestEntryName);
  zip.addFile(manifestEntryName, Buffer.from(`${JSON.stringify(locked, null, 2)}\n`, "utf8"));
  return dropped;
}

async function packExtensionZip(distDir) {
  const extensionDir = path.resolve(artifactDir, "../../extension");
  try {
    await access(extensionDir);
  } catch {
    throw new Error(`[build] extension folder not found at ${extensionDir}. The download endpoint depends on this zip — aborting build.`);
  }

  const manifestPath = path.resolve(extensionDir, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (err) {
    throw new Error(`[build] failed to read extension manifest at ${manifestPath}: ${err.message}`);
  }
  const version = manifest.version;
  if (!version || typeof version !== "string") {
    throw new Error(`[build] extension manifest is missing a valid "version" field — aborting build.`);
  }

  // Sanity check: the dev build-config must exist on disk. Without it the
  // production override has nothing to replace and the loaded extension would
  // crash on `importScripts("./build-config.js")`.
  const buildConfigPath = path.resolve(extensionDir, "src/build-config.js");
  try {
    await access(buildConfigPath);
  } catch {
    throw new Error(`[build] extension/src/build-config.js is missing — production hardening cannot run. Aborting build.`);
  }

  let changelog = { entries: [] };
  const changelogPath = path.resolve(extensionDir, "CHANGELOG.json");
  try {
    changelog = JSON.parse(await readFile(changelogPath, "utf8"));
  } catch {
    console.warn(`[build] no CHANGELOG.json found at ${changelogPath} — version metadata will have an empty changelog.`);
  }

  await mkdir(distDir, { recursive: true });

  // Skip developer-facing files that should not ship inside the extension
  // package (the store reviewer flags unexpected non-extension files, and
  // they bloat the manual-install zip too).
  const isExcluded = (name) => /(^|\/)(PUBLISHING\.md|\.DS_Store|Thumbs\.db)$/i.test(name);
  const includeFilter = (filename) => !isExcluded(filename);

  // 1) Manual-install zip — wraps everything in an /extension/ folder so users
  //    can unzip and "Load unpacked" → select the /extension folder.
  const manualZip = new AdmZip();
  manualZip.addLocalFolder(extensionDir, "extension", includeFilter);
  const manualEntryCount = manualZip.getEntries().length;
  if (manualEntryCount === 0) {
    throw new Error(`[build] extension folder ${extensionDir} produced an empty zip — aborting build.`);
  }
  const manualDropped = applyProductionLockdownToZip(manualZip, "extension/");
  const manualFilename = `eraseai-firewall-${version}.zip`;
  const manualOutPath = path.resolve(distDir, manualFilename);
  manualZip.writeZip(manualOutPath);
  const manualInfo = await stat(manualOutPath);
  console.log(`[build] packed manual-install extension to ${manualOutPath} (${manualEntryCount} entries, ${manualInfo.size} bytes)`);
  if (manualDropped.length > 0) {
    console.log(`[build] manual-install: stripped non-EraseAI host_permissions ${JSON.stringify(manualDropped)}`);
  }

  // 2) Store-upload zip — flat layout with manifest.json at the zip root.
  //    This is the package shape required by the Chrome Web Store, the Edge
  //    Add-ons store, and Firefox AMO. Upload this file to the store dashboards.
  const storeZip = new AdmZip();
  storeZip.addLocalFolder(extensionDir, "", includeFilter);
  const storeEntryCount = storeZip.getEntries().length;
  if (storeEntryCount === 0) {
    throw new Error(`[build] extension folder ${extensionDir} produced an empty store zip — aborting build.`);
  }
  const storeDropped = applyProductionLockdownToZip(storeZip, "");
  const storeFilename = `eraseai-firewall-store-${version}.zip`;
  const storeOutPath = path.resolve(distDir, storeFilename);
  storeZip.writeZip(storeOutPath);
  console.log(`[build] packed store-upload extension to ${storeOutPath} (${storeEntryCount} entries)`);
  if (storeDropped.length > 0) {
    console.log(`[build] store-upload: stripped non-EraseAI host_permissions ${JSON.stringify(storeDropped)}`);
  }

  // Metadata sidecar consumed by /api/extension/version and
  // /api/extension/download. The download route serves the manual-install
  // zip, so its filename + stats are what we record here.
  const metadata = {
    version,
    filename: manualFilename,
    sizeBytes: manualInfo.size,
    lastModified: manualInfo.mtime.toISOString(),
    changelog: Array.isArray(changelog.entries) ? changelog.entries : [],
  };
  const metadataPath = path.resolve(distDir, "extension-metadata.json");
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`[build] wrote extension metadata to ${metadataPath}`);

  // Also copy the raw CHANGELOG.json next to the dist bundle. The
  // /api/extension/version route prefers the live CHANGELOG over the
  // metadata sidecar so that bumping extension/manifest.json + CHANGELOG.json
  // automatically updates the public status page even if a build hasn't run
  // yet. This copy is the fallback for deployed environments where the
  // workspace `extension/` source folder may not be present at runtime.
  const changelogCopyPath = path.resolve(distDir, "extension-changelog.json");
  await writeFile(changelogCopyPath, JSON.stringify(changelog, null, 2));
  console.log(`[build] copied CHANGELOG to ${changelogCopyPath}`);
}

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

async function buildAndPack() {
  await buildAll();
  const distDir = path.resolve(artifactDir, "dist");
  await packExtensionZip(distDir);
}

buildAndPack().catch((err) => {
  console.error(err);
  process.exit(1);
});
