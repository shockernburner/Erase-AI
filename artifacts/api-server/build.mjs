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
  const manualFilename = `eraseai-firewall-${version}.zip`;
  const manualOutPath = path.resolve(distDir, manualFilename);
  manualZip.writeZip(manualOutPath);
  const manualInfo = await stat(manualOutPath);
  console.log(`[build] packed manual-install extension to ${manualOutPath} (${manualEntryCount} entries, ${manualInfo.size} bytes)`);

  // 2) Store-upload zip — flat layout with manifest.json at the zip root.
  //    This is the package shape required by the Chrome Web Store, the Edge
  //    Add-ons store, and Firefox AMO. Upload this file to the store dashboards.
  const storeZip = new AdmZip();
  storeZip.addLocalFolder(extensionDir, "", includeFilter);
  const storeEntryCount = storeZip.getEntries().length;
  if (storeEntryCount === 0) {
    throw new Error(`[build] extension folder ${extensionDir} produced an empty store zip — aborting build.`);
  }
  const storeFilename = `eraseai-firewall-store-${version}.zip`;
  const storeOutPath = path.resolve(distDir, storeFilename);
  storeZip.writeZip(storeOutPath);
  console.log(`[build] packed store-upload extension to ${storeOutPath} (${storeEntryCount} entries)`);

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
