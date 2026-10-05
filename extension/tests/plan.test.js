import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadBackgroundModule } from "./loadModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(__dirname, "..", "src", "plan.js"), "utf8");

function loadPlan() {
  const sandbox = { URL, Set, Number, Object };
  vm.createContext(sandbox);
  vm.runInContext("var self = globalThis;", sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.EraseAIPlan;
}

describe("plan policy", () => {
  const P = loadPlan();

  it("paid features need a paid plan and the key it was read with", () => {
    expect(P.hasPaidFeatures({ plan: "personal" }, { hasKey: true })).toBe(true);
    expect(P.hasPaidFeatures({ plan: "enterprise" }, { hasKey: true })).toBe(true);
    expect(P.hasPaidFeatures({ plan: "personal" }, { hasKey: false })).toBe(false);
    expect(P.hasPaidFeatures({ plan: "free" }, { hasKey: true })).toBe(false);
    expect(P.hasPaidFeatures({ plan: null }, { hasKey: true })).toBe(false);
  });

  it("repairs bad stored state and links to Personal", () => {
    expect(P.normalizeState({ plan: 3, planCheckedAt: "x" })).toEqual({ plan: null, planCheckedAt: 0 });
    const url = new URL(P.subscribeUrl("1.5.0"));
    expect(url.searchParams.get("plan")).toBe("personal");
    expect(url.searchParams.get("utm_source")).toBe("extension");
  });
});

function makeChrome(store = {}) {
  return {
    store,
    chrome: {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            const out = {};
            for (const k of Array.isArray(keys) ? keys : Object.keys(store)) if (k in store) out[k] = store[k];
            return out;
          }),
          set: vi.fn(async (obj) => Object.assign(store, JSON.parse(JSON.stringify(obj)))),
        },
        onChanged: { addListener: vi.fn() },
      },
      runtime: {
        onMessage: { addListener: vi.fn() },
        onConnect: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() },
        getManifest: () => ({ version: "1.5.0" }),
      },
      tabs: { create: vi.fn() },
    },
  };
}

describe("background BEGIN_CHECK", () => {
  it("always checks free users, with no limit and no network call", async () => {
    const { chrome } = makeChrome({ enabled: true });
    const fetch = vi.fn();
    const mod = loadBackgroundModule({ chrome, fetch });
    for (let i = 0; i < 100; i++) {
      const r = await mod.beginCheck();
      expect(r.allowed).toBe(true);
      expect(r.paid).toBe(false);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the plan on the first send with a key, so a subscriber gets paid features at once", async () => {
    const { chrome } = makeChrome({ enabled: true, apiKey: "eak_x" });
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, plan: "personal" }) }));
    const mod = loadBackgroundModule({ chrome, fetch });
    const r = await mod.beginCheck();
    expect(r.paid).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the firewall is switched off", async () => {
    const { chrome } = makeChrome({ enabled: false });
    const mod = loadBackgroundModule({ chrome, fetch: vi.fn() });
    expect(await mod.beginCheck()).toEqual({ bypass: true });
  });
});
