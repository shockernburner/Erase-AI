import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadBackgroundModule } from "./loadModule.js";

const DEFAULT_API_URL = "https://eraseai.ai";

function makeChrome(storage = {}) {
  return {
    storage: {
      local: {
        get: vi.fn(async (keys) => {
          if (Array.isArray(keys)) {
            const out = {};
            for (const k of keys) {
              if (k in storage) out[k] = storage[k];
            }
            return out;
          }
          return { ...storage };
        }),
        set: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
      },
    },
    runtime: {
      onMessage: { addListener: vi.fn() },
    },
  };
}

function jsonResponse(body, { status = 200, contentType = "application/json" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h) => (h.toLowerCase() === "content-type" ? contentType : null) },
    json: async () => body,
  };
}

describe("background.testConnection", () => {
  let chromeStub;
  let fetchStub;
  let mod;

  function init({ storage = {}, fetchImpl } = {}) {
    chromeStub = makeChrome(storage);
    fetchStub = vi.fn(fetchImpl);
    mod = loadBackgroundModule({ chrome: chromeStub, fetch: fetchStub });
  }

  beforeEach(() => {
    chromeStub = undefined;
    fetchStub = undefined;
    mod = undefined;
  });

  describe("connected state", () => {
    it("returns connected with plan/quota when both probes succeed", async () => {
      init({
        storage: { apiKey: "eak_validkey", enabled: true },
        fetchImpl: async (url, opts = {}) => {
          if (opts && opts.headers && opts.headers.Authorization) {
            return jsonResponse({
              ok: true,
              version: "1.2.0",
              plan: "pro",
              dailyLimit: 1000,
              dailyRemaining: 750,
              dailyUsed: 250,
            });
          }
          return jsonResponse({ ok: true, version: "1.2.0" });
        },
      });

      const result = await mod.testConnection();

      expect(result.connected).toBe(true);
      expect(result.state).toBe("connected");
      expect(result.apiUrl).toBe(DEFAULT_API_URL);
      expect(result.plan).toBe("pro");
      expect(result.dailyLimit).toBe(1000);
      expect(result.dailyRemaining).toBe(750);
      expect(result.dailyUsed).toBe(250);
      expect(result.serverVersion).toBe("1.2.0");
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it("falls back to free plan when server returns an unrecognised plan", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async (url, opts = {}) => {
          if (opts && opts.headers && opts.headers.Authorization) {
            return jsonResponse({ ok: true, version: "1.0.0", plan: "evil-plan" });
          }
          return jsonResponse({ ok: true, version: "1.0.0" });
        },
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("connected");
      expect(result.plan).toBe("free");
    });
  });

  describe("no_key state", () => {
    it("returns no_key when ping succeeds but storage has no apiKey", async () => {
      init({
        storage: {},
        fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }),
      });

      const result = await mod.testConnection();
      expect(result.connected).toBe(false);
      expect(result.state).toBe("no_key");
      expect(result.serverVersion).toBe("1.0.0");
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it("returns no_key when apiKey is empty string", async () => {
      init({
        storage: { apiKey: "" },
        fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }),
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("no_key");
    });
  });

  describe("invalid_key state", () => {
    it("returns invalid_key when authenticated probe is 401", async () => {
      init({
        storage: { apiKey: "eak_bad" },
        fetchImpl: async (url, opts = {}) => {
          if (opts && opts.headers && opts.headers.Authorization) {
            return {
              ok: false,
              status: 401,
              headers: { get: () => "application/json" },
              json: async () => ({ error: "Invalid API key", code: "INVALID_KEY" }),
            };
          }
          return jsonResponse({ ok: true, version: "1.0.0" });
        },
      });

      const result = await mod.testConnection();
      expect(result.connected).toBe(false);
      expect(result.state).toBe("invalid_key");
      expect(result.error).toBe("Invalid API key");
      expect(result.serverVersion).toBe("1.0.0");
    });

    it("uses generic error if 401 body has no error field", async () => {
      init({
        storage: { apiKey: "eak_bad" },
        fetchImpl: async (url, opts = {}) => {
          if (opts && opts.headers && opts.headers.Authorization) {
            return {
              ok: false,
              status: 401,
              headers: { get: () => "application/json" },
              json: async () => ({}),
            };
          }
          return jsonResponse({ ok: true, version: "1.0.0" });
        },
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("invalid_key");
      expect(result.error).toBe("Invalid API key");
    });
  });

  describe("server_unreachable state", () => {
    it("returns server_unreachable when fetch throws (network error)", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => {
          throw new Error("getaddrinfo ENOTFOUND eraseai.ai");
        },
      });

      const result = await mod.testConnection();
      expect(result.connected).toBe(false);
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toContain("Cannot reach");
      expect(result.error).toContain("ENOTFOUND");
    });

    it("returns server_unreachable on non-2xx HTTP status from ping", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => ({
          ok: false,
          status: 502,
          headers: { get: () => "text/html" },
          json: async () => ({}),
        }),
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toContain("HTTP 502");
    });

    it("returns server_unreachable when ping responds with non-JSON content-type", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          headers: { get: () => "text/html; charset=utf-8" },
          json: async () => ({ ok: true, version: "1.0.0" }),
        }),
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/JSON|EraseAI server/);
    });

    it("returns server_unreachable when ping JSON has ok:false", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => jsonResponse({ ok: false, version: "1.0.0" }),
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/unexpected payload/);
    });

    it("returns server_unreachable when ping JSON is missing version field", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => jsonResponse({ ok: true }),
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/unexpected payload/);
    });

    it("returns server_unreachable when ping JSON version is not a string", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => jsonResponse({ ok: true, version: 1.0 }),
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/unexpected payload/);
    });

    it("returns server_unreachable when ping body is not JSON-parsable", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => {
            throw new Error("Unexpected token < in JSON");
          },
        }),
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/unexpected payload/);
    });

    it("returns server_unreachable when authenticated probe returns non-JSON content-type", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async (url, opts = {}) => {
          if (opts && opts.headers && opts.headers.Authorization) {
            return {
              ok: true,
              status: 200,
              headers: { get: () => "text/html" },
              json: async () => ({ ok: true }),
            };
          }
          return jsonResponse({ ok: true, version: "1.0.0" });
        },
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/JSON/);
    });

    it("returns server_unreachable when authenticated probe returns non-401 error", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async (url, opts = {}) => {
          if (opts && opts.headers && opts.headers.Authorization) {
            return {
              ok: false,
              status: 500,
              headers: { get: () => "application/json" },
              json: async () => ({}),
            };
          }
          return jsonResponse({ ok: true, version: "1.0.0" });
        },
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/HTTP 500/);
    });

    it("returns server_unreachable when authenticated probe JSON has ok:false", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async (url, opts = {}) => {
          if (opts && opts.headers && opts.headers.Authorization) {
            return jsonResponse({ ok: false });
          }
          return jsonResponse({ ok: true, version: "1.0.0" });
        },
      });

      const result = await mod.testConnection();
      expect(result.state).toBe("server_unreachable");
      expect(result.error).toMatch(/unexpected payload/);
    });
  });

  describe("getConfig", () => {
    it("ignores stored apiUrl that is not https://", async () => {
      init({
        storage: { apiUrl: "http://evil.example.com" },
        fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }),
      });

      const cfg = await mod.getConfig();
      expect(cfg.apiUrl).toBe(DEFAULT_API_URL);
      expect(cfg.isCustomUrl).toBe(false);
    });

    it("strips trailing slash from custom apiUrl", async () => {
      init({
        storage: { apiUrl: "https://my.eraseai.ai/" },
        fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }),
      });

      const cfg = await mod.getConfig();
      expect(cfg.apiUrl).toBe("https://my.eraseai.ai");
      expect(cfg.isCustomUrl).toBe(true);
    });
  });
});
