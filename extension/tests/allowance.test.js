import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadBackgroundModule } from "./loadModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(__dirname, "..", "src", "allowance.js"), "utf8");

function loadAllowance() {
  const sandbox = { URL, Set, Number, Object, Math };
  vm.createContext(sandbox);
  vm.runInContext("var self = globalThis;", sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.EraseAIAllowance;
}

describe("allowance policy", () => {
  const A = loadAllowance();

  it("gives 25 free checks, then pauses", () => {
    let state = A.normalizeState(undefined);
    for (let i = 1; i <= 25; i++) {
      const r = A.decide(state, { hasKey: false });
      expect(r.decision).toBe("allowed");
      expect(r.remaining).toBe(25 - i);
      state = r.state;
    }
    expect(A.decide(state, { hasKey: false }).decision).toBe("paused");
  });

  it("paid plans are unlimited and do not count, but only with a key", () => {
    const paid = { used: 25, plan: "personal", planCheckedAt: 0 };
    const r = A.decide(paid, { hasKey: true });
    expect(r.decision).toBe("paid");
    expect(r.state.used).toBe(25);
    expect(A.decide(paid, { hasKey: false }).decision).toBe("paused");
    expect(A.decide({ ...paid, plan: "free" }, { hasKey: true }).decision).toBe("paused");
  });

  it("repairs bad stored state and links to Personal checkout", () => {
    expect(A.normalizeState({ used: -4, plan: 3 })).toEqual({ used: 0, plan: null, planCheckedAt: 0 });
    const url = new URL(A.subscribeUrl("1.5.0"));
    expect(url.searchParams.get("plan")).toBe("personal");
    expect(url.searchParams.get("utm_medium")).toBe("free_limit");
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
  it("counts one check per send without a key and pauses after 25", async () => {
    const { chrome, store } = makeChrome({ enabled: true });
    const fetch = vi.fn();
    const mod = loadBackgroundModule({ chrome, fetch });
    for (let i = 0; i < 25; i++) expect((await mod.beginCheck()).allowed).toBe(true);
    const paused = await mod.beginCheck();
    expect(paused.paused).toBe(true);
    expect(paused.subscribeUrl).toContain("plan=personal");
    expect(store.allowance.used).toBe(25);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("re-reads the plan when out of free checks, so a new subscriber is let straight back in", async () => {
    const { chrome } = makeChrome({ enabled: true, apiKey: "eak_x", allowance: { used: 25, plan: "free", planCheckedAt: 0 } });
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, plan: "personal" }) }));
    const mod = loadBackgroundModule({ chrome, fetch });
    const r = await mod.beginCheck();
    expect(r.allowed).toBe(true);
    expect(r.decision).toBe("paid");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the firewall is switched off", async () => {
    const { chrome } = makeChrome({ enabled: false });
    const mod = loadBackgroundModule({ chrome, fetch: vi.fn() });
    expect(await mod.beginCheck()).toEqual({ bypass: true });
  });
});
