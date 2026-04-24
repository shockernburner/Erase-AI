import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadBackgroundModule } from "./loadModule.js";

const API_URL = "https://eraseai.ai";

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
      expect(result.apiUrl).toBe(API_URL);
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

  describe("analyzePrompt", () => {
    it("posts to /api/dev/analyze with bearer auth and returns the server JSON on 200", async () => {
      const serverPayload = {
        riskScore: 0.42,
        level: "medium",
        issues: [{ type: "email" }, { type: "phone" }],
        sanitized: "redacted text",
      };
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse(serverPayload),
      });

      const result = await mod.analyzePrompt("hello world");

      expect(result).toEqual(serverPayload);
      expect(fetchStub).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchStub.mock.calls[0];
      expect(url).toBe(`${API_URL}/api/dev/analyze`);
      expect(opts.method).toBe("POST");
      expect(opts.headers["Content-Type"]).toBe("application/json");
      expect(opts.headers.Authorization).toBe("Bearer eak_good");
      expect(JSON.parse(opts.body)).toEqual({ text: "hello world" });
    });

    it("short-circuits with an error when no apiKey is configured", async () => {
      init({
        storage: { enabled: true },
        fetchImpl: async () => jsonResponse({ riskScore: 0.1 }),
      });

      const result = await mod.analyzePrompt("anything");

      expect(result).toEqual({
        error: "No API key configured. Open the EraseAI extension popup to set your key.",
      });
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it("returns bypass:true without calling fetch when the firewall is disabled", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: false },
        fetchImpl: async () => jsonResponse({ riskScore: 0.9 }),
      });

      const result = await mod.analyzePrompt("anything");

      expect(result).toEqual({ bypass: true });
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it("surfaces err.error and err.code from a non-2xx JSON response", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => ({
          ok: false,
          status: 429,
          headers: { get: () => "application/json" },
          json: async () => ({ error: "Daily limit reached", code: "QUOTA_EXCEEDED" }),
        }),
      });

      const result = await mod.analyzePrompt("anything");

      expect(result).toEqual({ error: "Daily limit reached", code: "QUOTA_EXCEEDED" });
    });

    it("falls back to a generic error when a non-2xx response has no error field", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => ({
          ok: false,
          status: 500,
          headers: { get: () => "application/json" },
          json: async () => {
            throw new Error("not json");
          },
        }),
      });

      const result = await mod.analyzePrompt("anything");

      expect(result.error).toBe("API error: 500");
      expect(result.code).toBeUndefined();
    });

    it("returns a Network error when fetch throws", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => {
          throw new Error("getaddrinfo ENOTFOUND eraseai.ai");
        },
      });

      const result = await mod.analyzePrompt("anything");

      expect(result).toEqual({
        error: "Network error: getaddrinfo ENOTFOUND eraseai.ai",
      });
    });

    it("ANALYZE message handler writes lastScan to chrome.storage.local when the response includes riskScore", async () => {
      const serverPayload = {
        riskScore: 0.73,
        level: "high",
        issues: [{ type: "ssn" }, { type: "email" }, { type: "phone" }],
      };
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse(serverPayload),
      });

      const handler = chromeStub.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();
      const ret = handler({ type: "ANALYZE", text: "hello" }, {}, sendResponse);
      expect(ret).toBe(true);

      // Wait for the analyzePrompt promise chain to resolve.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(chromeStub.storage.local.set).toHaveBeenCalledTimes(1);
      const setArg = chromeStub.storage.local.set.mock.calls[0][0];
      expect(setArg).toEqual({
        lastScan: {
          riskScore: 0.73,
          level: "high",
          issueCount: 3,
          scannedAt: expect.any(Number),
        },
      });
      expect(sendResponse).toHaveBeenCalledWith(serverPayload);
    });

    it("ANALYZE message handler does not write lastScan when the response has no riskScore", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => ({
          ok: false,
          status: 401,
          headers: { get: () => "application/json" },
          json: async () => ({ error: "Invalid API key", code: "INVALID_KEY" }),
        }),
      });

      const handler = chromeStub.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();
      handler({ type: "ANALYZE", text: "hello" }, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(chromeStub.storage.local.set).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        error: "Invalid API key",
        code: "INVALID_KEY",
      });
    });
  });

  describe("sanitizePrompt", () => {
    it("posts to /api/dev/sanitize with bearer auth and returns the server JSON on 200", async () => {
      const serverPayload = {
        sanitized: "Hello [REDACTED]",
        replacements: 1,
      };
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse(serverPayload),
      });

      const result = await mod.sanitizePrompt("Hello alice@example.com");

      expect(result).toEqual(serverPayload);
      expect(fetchStub).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchStub.mock.calls[0];
      expect(url).toBe(`${API_URL}/api/dev/sanitize`);
      expect(opts.method).toBe("POST");
      expect(opts.headers["Content-Type"]).toBe("application/json");
      expect(opts.headers.Authorization).toBe("Bearer eak_good");
      expect(JSON.parse(opts.body)).toEqual({ text: "Hello alice@example.com" });
    });

    it("short-circuits with an error when no apiKey is configured", async () => {
      init({
        storage: {},
        fetchImpl: async () => jsonResponse({ sanitized: "x" }),
      });

      const result = await mod.sanitizePrompt("anything");

      expect(result).toEqual({ error: "No API key configured." });
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it("still calls the API when the firewall is disabled (no bypass for sanitize)", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: false },
        fetchImpl: async () => jsonResponse({ sanitized: "ok" }),
      });

      const result = await mod.sanitizePrompt("hi");

      expect(result).toEqual({ sanitized: "ok" });
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it("surfaces err.error and err.code from a non-2xx JSON response", async () => {
      init({
        storage: { apiKey: "eak_good" },
        fetchImpl: async () => ({
          ok: false,
          status: 401,
          headers: { get: () => "application/json" },
          json: async () => ({ error: "Invalid API key", code: "INVALID_KEY" }),
        }),
      });

      const result = await mod.sanitizePrompt("anything");

      expect(result).toEqual({ error: "Invalid API key", code: "INVALID_KEY" });
    });

    it("falls back to a generic error when a non-2xx response body cannot be parsed", async () => {
      init({
        storage: { apiKey: "eak_good" },
        fetchImpl: async () => ({
          ok: false,
          status: 503,
          headers: { get: () => "text/html" },
          json: async () => {
            throw new Error("not json");
          },
        }),
      });

      const result = await mod.sanitizePrompt("anything");

      expect(result.error).toBe("API error: 503");
      expect(result.code).toBeUndefined();
    });

    it("returns a Network error when fetch throws", async () => {
      init({
        storage: { apiKey: "eak_good" },
        fetchImpl: async () => {
          throw new Error("ECONNREFUSED 127.0.0.1:443");
        },
      });

      const result = await mod.sanitizePrompt("anything");

      expect(result).toEqual({
        error: "Network error: ECONNREFUSED 127.0.0.1:443",
      });
    });
  });

  describe("getConfig", () => {
    it("always returns the canonical eraseai.ai URL", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }),
      });

      const cfg = await mod.getConfig();
      expect(cfg.apiUrl).toBe(API_URL);
      expect(cfg.apiKey).toBe("eak_x");
      expect(cfg.enabled).toBe(true);
    });

    it("only reads apiKey + enabled from storage — there is no other config key", async () => {
      init({
        storage: { apiKey: "eak_x" },
        fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }),
      });

      await mod.getConfig();
      const getCalls = chromeStub.storage.local.get.mock.calls;
      expect(getCalls.length).toBe(1);
      const requestedKeys = getCalls[0][0];
      expect(requestedKeys).toEqual(["apiKey", "enabled"]);
    });

    it("treats missing/explicit-true `enabled` as enabled, and only false as disabled", async () => {
      init({ storage: {}, fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }) });
      expect((await mod.getConfig()).enabled).toBe(true);

      init({ storage: { enabled: true }, fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }) });
      expect((await mod.getConfig()).enabled).toBe(true);

      init({ storage: { enabled: false }, fetchImpl: async () => jsonResponse({ ok: true, version: "1.0.0" }) });
      expect((await mod.getConfig()).enabled).toBe(false);
    });
  });
});
