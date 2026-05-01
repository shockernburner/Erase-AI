// Tests for the CORS allow-list introduced in task #130.
//
// Before this task the API used `cors({ origin: true, credentials: true })`,
// which echoed any caller's Origin back as Access-Control-Allow-Origin and
// sent Access-Control-Allow-Credentials: true alongside it — meaning a
// malicious site could ride a logged-in user's session cookie against our
// API. The pure helpers in `cors-source.mjs` are the source of truth for
// which origins survive the allow-list, so we pin them here with unit
// tests, then exercise the assembled middleware against a real Express
// app to confirm the 403-on-disallowed-preflight contract holds.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import express from "express";
import {
  PINNED_EXTENSION_ID,
  buildAllowedOrigins,
  isOriginAllowed,
  createCorsMiddleware,
} from "../src/lib/security/cors-source.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

// Drift-detector: the `key` field in extension/manifest.json must always
// derive to the same chrome-extension://<id> that PINNED_EXTENSION_ID is
// hard-coded to in cors-source.mjs. If they fall out of sync, the
// production extension's CORS preflights will silently start failing
// against its own backend — and the only signal would be user reports.
// This test makes the drift loud at CI time.
describe("manifest.json key ↔ PINNED_EXTENSION_ID drift guard", () => {
  test("extension/manifest.json `key` derives to PINNED_EXTENSION_ID", async () => {
    const manifest = JSON.parse(
      await readFile(path.resolve(repoRoot, "extension/manifest.json"), "utf8"),
    );
    assert.ok(manifest.key, "manifest.json must carry a `key` field — it pins the extension ID across CWS, Edge, and unpacked dev installs");
    const der = Buffer.from(manifest.key, "base64");
    const hash = crypto.createHash("sha256").update(der).digest("hex");
    const id = hash
      .substring(0, 32)
      .split("")
      .map((c) => String.fromCharCode("a".charCodeAt(0) + parseInt(c, 16)))
      .join("");
    assert.equal(
      id,
      PINNED_EXTENSION_ID,
      `manifest.json's public key derives to chrome-extension://${id}, but cors-source.mjs is pinned to chrome-extension://${PINNED_EXTENSION_ID}. They must match — or the deployed extension will fail CORS against its own API. Update PINNED_EXTENSION_ID in cors-source.mjs (and the references in extension/PUBLISHING.md § 0) to ${id}.`,
    );
  });
});

describe("buildAllowedOrigins", () => {
  test("includes the marketing site by default", () => {
    const set = buildAllowedOrigins();
    assert.ok(set.has("https://eraseai.ai"));
    assert.ok(set.has("https://www.eraseai.ai"));
  });

  test("includes the pinned chrome- and moz-extension origins", () => {
    const set = buildAllowedOrigins();
    assert.ok(set.has(`chrome-extension://${PINNED_EXTENSION_ID}`));
    assert.ok(set.has(`moz-extension://${PINNED_EXTENSION_ID}`));
  });

  test("supports caller-supplied dev origins (ALLOWED_DEV_ORIGIN)", () => {
    const set = buildAllowedOrigins({
      devOrigins: ["http://localhost:5173", "  ", "http://localhost:3000"],
    });
    assert.ok(set.has("http://localhost:5173"));
    assert.ok(set.has("http://localhost:3000"));
    assert.equal(set.has(""), false);
    assert.equal(set.has("  "), false);
  });

  test("does not silently include unknown origins", () => {
    const set = buildAllowedOrigins();
    assert.equal(set.has("https://evil.example.com"), false);
    assert.equal(set.has("http://eraseai.ai"), false, "http:// must not match https://");
    assert.equal(set.has("chrome-extension://other-extension-id"), false);
  });

  // Task #157 — once the extension is published to the Chrome Web Store
  // (and Edge / Firefox), the Store assigns its own permanent ID. The
  // pinned dev unpacked ID must keep working alongside the published
  // ID(s) so engineers can keep dev-loading against the live api-server.
  test("accepts a list of additional published extension IDs alongside the pinned dev ID", () => {
    const cwsId = "abcdefghijklmnopabcdefghijklmnop"; // CWS-style 32 lowercase a-p
    const edgeId = "ponmlkjihgponmlkjihgponmlkjihgpo";
    const set = buildAllowedOrigins({
      extensionIds: [cwsId, "  ", edgeId, ""],
    });
    // Pinned dev ID still allowed.
    assert.ok(set.has(`chrome-extension://${PINNED_EXTENSION_ID}`));
    assert.ok(set.has(`moz-extension://${PINNED_EXTENSION_ID}`));
    // Published IDs added too.
    assert.ok(set.has(`chrome-extension://${cwsId}`));
    assert.ok(set.has(`moz-extension://${cwsId}`));
    assert.ok(set.has(`chrome-extension://${edgeId}`));
    assert.ok(set.has(`moz-extension://${edgeId}`));
    // Empty / whitespace entries silently dropped — no chrome-extension:// origin.
    assert.equal(set.has("chrome-extension://"), false);
    assert.equal(set.has("chrome-extension://  "), false);
  });

  test("a non-array extensionIds value is silently ignored (defensive)", () => {
    // Belt-and-braces: misconfigured env var read shouldn't crash the server.
    const set = buildAllowedOrigins({ extensionIds: "not-an-array" });
    assert.ok(set.has(`chrome-extension://${PINNED_EXTENSION_ID}`));
    assert.equal(set.has("chrome-extension://not-an-array"), false);
  });
});

describe("isOriginAllowed", () => {
  const set = buildAllowedOrigins();

  test("returns true for null/undefined origin (non-browser caller)", () => {
    assert.equal(isOriginAllowed(undefined, set), true);
    assert.equal(isOriginAllowed(null, set), true);
    assert.equal(isOriginAllowed("", set), true);
  });

  test("returns true for whitelisted browser origins", () => {
    assert.equal(isOriginAllowed("https://eraseai.ai", set), true);
    assert.equal(isOriginAllowed(`chrome-extension://${PINNED_EXTENSION_ID}`, set), true);
  });

  test("returns false for any origin not in the allow-list", () => {
    assert.equal(isOriginAllowed("https://evil.example.com", set), false);
    assert.equal(isOriginAllowed("http://eraseai.ai", set), false);
    assert.equal(isOriginAllowed("chrome-extension://abcdef", set), false);
  });
});

// Spin up a real Express app with the assembled middleware so we can
// confirm browser-relevant behaviour: preflight from disallowed origin
// returns 403, preflight from allowed origin echoes the right headers,
// and a non-browser request (no Origin header) is unaffected.
describe("createCorsMiddleware — Express integration", () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(createCorsMiddleware());
    app.get("/echo", (_req, res) => res.json({ ok: true }));
    app.post("/echo", (_req, res) => res.json({ ok: true }));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port, address } = server.address();
    baseUrl = `http://${address}:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  function send(method, path, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        baseUrl + path,
        { method, headers },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
  }

  test("preflight from https://eraseai.ai returns 200 + Allow-Origin echoed", async () => {
    const res = await send("OPTIONS", "/echo", {
      Origin: "https://eraseai.ai",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    });
    assert.ok(res.status === 200 || res.status === 204, `expected 200/204, got ${res.status}`);
    assert.equal(res.headers["access-control-allow-origin"], "https://eraseai.ai");
    assert.equal(res.headers["access-control-allow-credentials"], "true");
  });

  test("preflight from pinned chrome-extension origin is allowed", async () => {
    const res = await send("OPTIONS", "/echo", {
      Origin: `chrome-extension://${PINNED_EXTENSION_ID}`,
      "Access-Control-Request-Method": "POST",
    });
    assert.ok(res.status === 200 || res.status === 204);
    assert.equal(
      res.headers["access-control-allow-origin"],
      `chrome-extension://${PINNED_EXTENSION_ID}`,
    );
  });

  test("preflight from a disallowed origin returns 403 with NO Allow-Origin header", async () => {
    const res = await send("OPTIONS", "/echo", {
      Origin: "https://evil.example.com",
      "Access-Control-Request-Method": "POST",
    });
    assert.equal(res.status, 403);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });

  test("non-preflight request from disallowed origin: no Allow-Origin header (browser will block)", async () => {
    const res = await send("GET", "/echo", {
      Origin: "https://evil.example.com",
    });
    // Request still hits the handler, but the missing Allow-Origin header
    // is what makes the browser refuse to expose the response to JS.
    assert.equal(res.status, 200);
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });

  test("server-to-server request (no Origin header) passes through unaffected", async () => {
    const res = await send("GET", "/echo");
    assert.equal(res.status, 200);
    // Stripe webhooks, healthz curls, etc. — nothing CORS-related is set,
    // and that's fine because the browser isn't involved.
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });
});
