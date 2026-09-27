import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadBackgroundModule } from "./loadModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const growthSrc = fs.readFileSync(path.resolve(__dirname, "..", "src", "growth.js"), "utf8");

function loadGrowth() {
  const sandbox = { URL, Set, Number, Object };
  vm.createContext(sandbox);
  vm.runInContext("var self = globalThis;", sandbox);
  vm.runInContext(growthSrc, sandbox);
  return sandbox.EraseAIGrowth;
}

const DAY = 24 * 60 * 60 * 1000;

describe("growth policy", () => {
  const G = loadGrowth();

  it("counts only sends the user chose not to make as they were", () => {
    expect(G.isProtectiveOutcome({ action: "sanitize", level: "high" })).toBe(true);
    expect(G.isProtectiveOutcome({ action: "cancel", level: "medium" })).toBe(true);
    expect(G.isProtectiveOutcome({ action: "send-anyway", level: "high" })).toBe(false);
    expect(G.isProtectiveOutcome({ action: "auto-send", level: "low" })).toBe(false);
    expect(G.isProtectiveOutcome({ action: "cancel", level: "low" })).toBe(false);
    expect(G.isProtectiveOutcome(null)).toBe(false);
  });

  it("asks only after enough protected sends and enough days", () => {
    const installedAt = 1_000_000;
    let state = G.emptyState(installedAt);
    for (let i = 0; i < G.REVIEW_MIN_PROTECTED; i++) {
      state = G.recordOutcome(state, { action: "sanitize", level: "high" });
    }
    expect(G.shouldPromptReview(state, installedAt + DAY)).toBe(false);
    expect(G.shouldPromptReview(state, installedAt + 3 * DAY)).toBe(true);
    expect(G.shouldPromptReview({ ...state, protectedCount: 2 }, installedAt + 30 * DAY)).toBe(false);
  });

  it("never asks again once answered or shown", () => {
    const state = { installedAt: 0, protectedCount: 10, review: "pending" };
    for (const review of ["shown", "rated", "dismissed"]) {
      expect(G.shouldPromptReview({ ...state, review }, 30 * DAY)).toBe(false);
    }
  });

  it("repairs corrupt stored state instead of throwing", () => {
    const now = 5;
    expect(G.normalizeState("garbage", now)).toEqual({ installedAt: 5, protectedCount: 0, review: "pending" });
    expect(G.normalizeState({ protectedCount: -3, review: "weird" }, now).protectedCount).toBe(0);
  });

  it("tags every outbound link and keeps the uninstall URL free of user data", () => {
    const uninstall = new URL(G.urls.uninstall("1.4.4"));
    expect([...uninstall.searchParams.keys()].sort()).toEqual(["utm_medium", "utm_source", "v"]);
    expect(G.urls.review()).toContain(`/detail/${G.EXTENSION_ID}/reviews`);
    expect(new URL(G.urls.welcome("1.4.4")).searchParams.get("utm_medium")).toBe("install");
  });
});

function makeChrome() {
  const store = {};
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
          remove: vi.fn(async () => {}),
        },
      },
      runtime: {
        onMessage: { addListener: vi.fn() },
        onConnect: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() },
        setUninstallURL: vi.fn(async () => {}),
        getManifest: () => ({ version: "1.4.4" }),
      },
      tabs: { create: vi.fn(async () => ({})) },
    },
  };
}

describe("background growth hooks", () => {
  it("opens the welcome page and registers the uninstall survey on first install", async () => {
    const { chrome } = makeChrome();
    const mod = loadBackgroundModule({ chrome, fetch: vi.fn() });
    await mod.handleInstalled({ reason: "install" });
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.create.mock.calls[0][0].url).toContain("/ai-firewall/welcome");
    expect(chrome.runtime.setUninstallURL.mock.calls[0][0]).toContain("/ai-firewall/uninstalled");
  });

  it("does not open a tab on update", async () => {
    const { chrome } = makeChrome();
    const mod = loadBackgroundModule({ chrome, fetch: vi.fn() });
    await mod.handleInstalled({ reason: "update" });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.runtime.setUninstallURL).toHaveBeenCalled();
  });

  it("offers the review exactly once", async () => {
    const { chrome, store } = makeChrome();
    const mod = loadBackgroundModule({ chrome, fetch: vi.fn() });
    store.growth = { installedAt: Date.now() - 4 * DAY, protectedCount: 0, review: "pending" };
    const protectedSend = { action: "sanitize", level: "high" };
    const answers = [];
    for (let i = 0; i < 5; i++) answers.push(await mod.trackOutcomeForReview(protectedSend));
    expect(answers).toEqual([false, false, true, false, false]);
    expect(store.growth.review).toBe("shown");
  });

  it("ignores sends the user pushed through anyway", async () => {
    const { chrome, store } = makeChrome();
    const mod = loadBackgroundModule({ chrome, fetch: vi.fn() });
    store.growth = { installedAt: Date.now() - 10 * DAY, protectedCount: 0, review: "pending" };
    for (let i = 0; i < 5; i++) await mod.trackOutcomeForReview({ action: "send-anyway", level: "high" });
    expect(store.growth.protectedCount).toBe(0);
  });
});
