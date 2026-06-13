import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../src/lib/mobileEntitlement.ts", import.meta.url), "utf8");
const transformed = transformSync(source, {
  format: "esm",
  loader: "ts",
  sourcemap: false,
  target: "es2022",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transformed.code).toString("base64")}`;
const { buildMobileHealthPayload, MOBILE_SERVICE_VERSION } = await import(moduleUrl);

describe("mobile health helper", () => {
  test("returns public static mobile service capabilities", () => {
    assert.deepEqual(buildMobileHealthPayload(), {
      ok: true,
      service: "eraseai-mobile",
      version: MOBILE_SERVICE_VERSION,
      features: {
        entitlement: true,
        analyze: true,
        rewrite: true,
        billing: true,
        protected_apps: true,
      },
    });
  });
});