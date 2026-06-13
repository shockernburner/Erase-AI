import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/lib/publicRoutes.ts", import.meta.url), "utf8");
const transformed = transformSync(source, {
  format: "esm",
  loader: "ts",
  sourcemap: false,
  target: "es2022",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`;
const { isPublicRoute } = await import(moduleUrl);

describe("mobile public route contract", () => {
  test("mobile health is public without auth", () => {
    assert.equal(isPublicRoute("/api/mobile/health"), true);
  });

  test("mobile auth login and signup are public", () => {
    assert.equal(isPublicRoute("/api/mobile-auth/login"), true);
    assert.equal(isPublicRoute("/api/mobile-auth/signup"), true);
  });

  test("mobile entitlement requires auth", () => {
    assert.equal(isPublicRoute("/api/mobile/entitlement"), false);
  });

  test("personal routes require auth", () => {
    assert.equal(isPublicRoute("/api/personal/analyze"), false);
    assert.equal(isPublicRoute("/api/personal/rewrite"), false);
    assert.equal(isPublicRoute("/api/personal/history"), false);
  });
});