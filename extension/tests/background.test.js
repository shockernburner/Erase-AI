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
      onConnect: { addListener: vi.fn() },
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

    it("checks on-device without calling the API when no apiKey is configured", async () => {
      init({
        storage: { enabled: true },
        fetchImpl: async () => jsonResponse({ riskScore: 0.1 }),
      });

      const result = await mod.analyzePrompt("my key is AKIAIOSFODNN7EXAMPLE");

      expect(fetchStub).not.toHaveBeenCalled();
      expect(result.error).toBeUndefined();
      expect(result.local).toBe(true);
      expect(result.localReason).toBe("no_key");
      expect(result.level).not.toBe("safe");
      expect(result.issues.some((i) => i.category === "secret_exposure")).toBe(true);
      expect(result.summary).toContain("Checked on this device");
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

    it("falls back on-device and keeps err.error and err.code from a non-2xx JSON response", async () => {
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

      expect(result.local).toBe(true);
      expect(result.localReason).toBe("unavailable");
      expect(result.serverError).toBe("Daily limit reached");
      expect(result.code).toBe("QUOTA_EXCEEDED");
      expect(typeof result.riskScore).toBe("number");
    });

    it("tells the user their trial ended when the server says so", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => ({
          ok: false,
          status: 429,
          headers: { get: () => "application/json" },
          json: async () => ({ error: "Your free trial includes 25 scans.", code: "RATE_LIMIT_EXCEEDED" }),
        }),
      });

      const result = await mod.analyzePrompt("bob@example.com");

      expect(result.localReason).toBe("trial_ended");
      expect(result.summary).toContain("trial has ended");
      expect(result.level).not.toBe("safe");
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

      expect(result.local).toBe(true);
      expect(result.serverError).toBe("API error: 500");
      expect(result.code).toBeUndefined();
    });

    it("falls back on-device when fetch throws", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => {
          throw new Error("getaddrinfo ENOTFOUND eraseai.ai");
        },
      });

      const result = await mod.analyzePrompt("anything");

      expect(result.local).toBe(true);
      expect(result.localReason).toBe("unavailable");
      expect(result.serverError).toBe("Network error: getaddrinfo ENOTFOUND eraseai.ai");
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

      // Two writes: the existing lastScan AND the v1.3.4 lastAttempt
      // (rendered in the popup's "Last attempt" status line).
      const setCalls = chromeStub.storage.local.set.mock.calls.map((c) => c[0]);
      expect(setCalls).toContainEqual({
        lastScan: {
          riskScore: 0.73,
          level: "high",
          issueCount: 3,
          scannedAt: expect.any(Number),
        },
      });
      expect(setCalls).toContainEqual({
        lastAttempt: {
          status: "success",
          at: expect.any(Number),
          attemptId: null,
        },
      });
      expect(sendResponse).toHaveBeenCalledWith(serverPayload);
    });

    it("ANALYZE message handler records a failed attempt when the key is rejected, even though the prompt was checked on-device", async () => {
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

      const setCalls = chromeStub.storage.local.set.mock.calls.map((c) => c[0]);
      // The on-device result is a real scan, so it is recorded as the last scan…
      expect(setCalls.some((c) => "lastScan" in c)).toBe(true);
      // …but the attempt is still a failure so the popup keeps the bad key visible.
      const attempts = setCalls.filter((c) => "lastAttempt" in c);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].lastAttempt.status).toBe("error");
      expect(attempts[0].lastAttempt.reason).toBe("Invalid API key (checked on this device)");
      expect(typeof attempts[0].lastAttempt.at).toBe("number");
      const response = sendResponse.mock.calls[0][0];
      expect(response.local).toBe(true);
      expect(response.localReason).toBe("invalid_key");
      expect(response.serverError).toBe("Invalid API key");
      expect(response.code).toBe("INVALID_KEY");
    });

    it("ANALYZE message handler writes lastAttempt success with bypass reason when firewall is disabled", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: false },
        fetchImpl: async () => jsonResponse({ riskScore: 0.5 }),
      });

      const handler = chromeStub.runtime.onMessage.addListener.mock.calls[0][0];
      const sendResponse = vi.fn();
      handler({ type: "ANALYZE", text: "hello" }, {}, sendResponse);

      await new Promise((resolve) => setTimeout(resolve, 0));

      const setCalls = chromeStub.storage.local.set.mock.calls.map((c) => c[0]);
      const attempts = setCalls.filter((c) => "lastAttempt" in c);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].lastAttempt.status).toBe("success");
      expect(attempts[0].lastAttempt.reason).toMatch(/bypass/i);
      expect(sendResponse).toHaveBeenCalledWith({ bypass: true });
    });
  });

  describe("ANALYZE long-lived port (task #124 — MV3 worker-suspension root-cause fix)", () => {
    function makeFakeIncomingPort(name = "analyze") {
      const listeners = { message: [], disconnect: [] };
      const posted = [];
      let disconnected = false;
      return {
        name,
        __posted: posted,
        __isDisconnected: () => disconnected,
        postMessage: vi.fn((msg) => posted.push(msg)),
        disconnect: vi.fn(() => {
          if (disconnected) return;
          disconnected = true;
          for (const fn of listeners.disconnect.slice()) fn();
        }),
        onMessage: { addListener: vi.fn((fn) => listeners.message.push(fn)) },
        onDisconnect: { addListener: vi.fn((fn) => listeners.disconnect.push(fn)) },
        __deliverIncoming(msg) {
          for (const fn of listeners.message.slice()) fn(msg);
        },
      };
    }

    it("registers an onConnect handler for the long-lived 'analyze' port", () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse({ riskScore: 0.5, level: "safe" }),
      });
      // Background must register exactly one onConnect listener — that's
      // the keep-alive entry point that prevents the MV3 worker from
      // being suspended mid-fetch.
      expect(chromeStub.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);
      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      expect(typeof handler).toBe("function");
    });

    it("ignores ports with a name other than 'analyze' (no message listener attached)", () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse({}),
      });
      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort("not-analyze");
      handler(port);
      // Must NOT have wired up an onMessage listener on a foreign port.
      expect(port.onMessage.addListener).not.toHaveBeenCalled();
    });

    it("runs analyze, posts the result over the port, and disconnects so the worker keep-alive is released", async () => {
      const serverPayload = {
        riskScore: 95,
        level: "safe",
        issues: [],
        summary: "All clear",
      };
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse(serverPayload),
      });

      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort();
      handler(port);
      // Drive an ANALYZE message in over the port.
      port.__deliverIncoming({ type: "ANALYZE", text: "hello", attemptId: "att_42" });

      // Wait for the analyze + storage promise chain to settle.
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      // The result must have come back OVER THE PORT in the agreed
      // wrapper shape.
      expect(port.__posted).toHaveLength(1);
      expect(port.__posted[0]).toEqual({
        type: "ANALYZE_RESULT",
        result: serverPayload,
      });

      // Port must be disconnected after the result is posted — otherwise
      // the worker keep-alive would stay armed forever and exhaust the
      // 5-minute lifetime cap.
      expect(port.__isDisconnected()).toBe(true);

      // lastScan + lastAttempt writes must STILL happen, identical to
      // the legacy sendMessage path. This proves we factored the storage
      // side-effects out into a shared helper rather than dropping them
      // when switching transports.
      const setCalls = chromeStub.storage.local.set.mock.calls.map((c) => c[0]);
      expect(setCalls).toContainEqual({
        lastScan: {
          riskScore: 95,
          level: "safe",
          issueCount: 0,
          scannedAt: expect.any(Number),
        },
      });
      const lastAttemptWrites = setCalls.filter((c) => "lastAttempt" in c);
      expect(lastAttemptWrites).toHaveLength(1);
      expect(lastAttemptWrites[0].lastAttempt.status).toBe("success");
      expect(lastAttemptWrites[0].lastAttempt.attemptId).toBe("att_42");
    });

    it("posts the on-device result and disconnects when the API rejects the key", async () => {
      init({
        storage: { apiKey: "eak_bad", enabled: true },
        fetchImpl: async () => ({
          ok: false,
          status: 401,
          headers: { get: () => "application/json" },
          json: async () => ({ error: "Invalid API key", code: "INVALID_KEY" }),
        }),
      });

      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort();
      handler(port);
      port.__deliverIncoming({ type: "ANALYZE", text: "hello", attemptId: "att_x" });

      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(port.__posted).toHaveLength(1);
      expect(port.__posted[0].type).toBe("ANALYZE_RESULT");
      expect(port.__posted[0].result.local).toBe(true);
      expect(port.__posted[0].result.serverError).toBe("Invalid API key");
      expect(port.__posted[0].result.code).toBe("INVALID_KEY");
      expect(port.__isDisconnected()).toBe(true);

      // lastAttempt error must STILL be persisted so the popup status
      // line stays accurate when the failure rode the port path.
      const setCalls = chromeStub.storage.local.set.mock.calls.map((c) => c[0]);
      const lastAttemptWrites = setCalls.filter((c) => "lastAttempt" in c);
      expect(lastAttemptWrites).toHaveLength(1);
      expect(lastAttemptWrites[0].lastAttempt.status).toBe("error");
      expect(lastAttemptWrites[0].lastAttempt.reason).toBe("Invalid API key (checked on this device)");
    });

    it("ignores non-ANALYZE messages arriving on the analyze port (no fetch, no posting)", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse({ riskScore: 0.5, level: "safe" }),
      });
      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort();
      handler(port);

      port.__deliverIncoming({ type: "SOMETHING_ELSE", text: "x" });
      port.__deliverIncoming(null);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchStub).not.toHaveBeenCalled();
      expect(port.__posted).toHaveLength(0);
      expect(port.__isDisconnected()).toBe(false);
    });
  });

  describe("SANITIZE long-lived port (task #125 — close the worker-suspension window for sanitize too)", () => {
    function makeFakeIncomingPort(name = "sanitize") {
      const listeners = { message: [], disconnect: [] };
      const posted = [];
      let disconnected = false;
      return {
        name,
        __posted: posted,
        __isDisconnected: () => disconnected,
        postMessage: vi.fn((msg) => posted.push(msg)),
        disconnect: vi.fn(() => {
          if (disconnected) return;
          disconnected = true;
          for (const fn of listeners.disconnect.slice()) fn();
        }),
        onMessage: { addListener: vi.fn((fn) => listeners.message.push(fn)) },
        onDisconnect: { addListener: vi.fn((fn) => listeners.disconnect.push(fn)) },
        __deliverIncoming(msg) {
          for (const fn of listeners.message.slice()) fn(msg);
        },
      };
    }

    it("registers a single onConnect handler that also services 'sanitize' ports", () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse({ sanitized: "x", changes: [] }),
      });
      // The same single onConnect listener that handles 'analyze' must
      // also be the entry point for 'sanitize' — this is the keep-alive
      // path that prevents the MV3 worker from being suspended mid-fetch.
      expect(chromeStub.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);
    });

    it("ignores ports whose name is neither 'analyze' nor 'sanitize' (no message listener attached)", () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse({}),
      });
      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort("not-a-real-name");
      handler(port);
      expect(port.onMessage.addListener).not.toHaveBeenCalled();
    });

    it("runs sanitize, posts the result over the port, and disconnects so the worker keep-alive is released", async () => {
      const serverPayload = {
        sanitized: "Hello [REDACTED]",
        changes: [{ category: "pii", original: "alice@example.com", replacement: "[REDACTED]" }],
      };
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse(serverPayload),
      });

      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort();
      handler(port);
      port.__deliverIncoming({ type: "SANITIZE", text: "Hello alice@example.com" });

      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      // The result must come back OVER THE PORT in the agreed wrapper shape.
      expect(port.__posted).toHaveLength(1);
      expect(port.__posted[0]).toEqual({
        type: "SANITIZE_RESULT",
        result: serverPayload,
      });

      // Port must be disconnected so the worker keep-alive is released —
      // otherwise the worker would stay armed forever and exhaust the
      // 5-minute lifetime cap.
      expect(port.__isDisconnected()).toBe(true);

      // The sanitize fetch must have actually been issued, not skipped.
      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(fetchStub.mock.calls[0][0]).toBe(`${API_URL}/api/dev/sanitize`);
    });

    it("posts an on-device sanitize result and disconnects when the API rejects the key", async () => {
      init({
        storage: { apiKey: "eak_bad", enabled: true },
        fetchImpl: async () => ({
          ok: false,
          status: 401,
          headers: { get: () => "application/json" },
          json: async () => ({ error: "Invalid API key", code: "INVALID_KEY" }),
        }),
      });

      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort();
      handler(port);
      port.__deliverIncoming({ type: "SANITIZE", text: "anything" });

      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(port.__posted).toHaveLength(1);
      expect(port.__posted[0].type).toBe("SANITIZE_RESULT");
      expect(port.__posted[0].result.local).toBe(true);
      expect(typeof port.__posted[0].result.sanitized).toBe("string");
      expect(port.__posted[0].result.serverError).toBe("Invalid API key");
      expect(port.__isDisconnected()).toBe(true);
    });

    it("ignores non-SANITIZE messages arriving on the sanitize port (no fetch, no posting)", async () => {
      init({
        storage: { apiKey: "eak_good", enabled: true },
        fetchImpl: async () => jsonResponse({ sanitized: "x" }),
      });
      const handler = chromeStub.runtime.onConnect.addListener.mock.calls[0][0];
      const port = makeFakeIncomingPort();
      handler(port);

      port.__deliverIncoming({ type: "SOMETHING_ELSE", text: "x" });
      port.__deliverIncoming(null);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchStub).not.toHaveBeenCalled();
      expect(port.__posted).toHaveLength(0);
      expect(port.__isDisconnected()).toBe(false);
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

    it("redacts on-device without calling the API when no apiKey is configured", async () => {
      init({
        storage: {},
        fetchImpl: async () => jsonResponse({ sanitized: "x" }),
      });

      const result = await mod.sanitizePrompt("key AKIAIOSFODNN7EXAMPLE");

      expect(fetchStub).not.toHaveBeenCalled();
      expect(result.local).toBe(true);
      expect(result.sanitized).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(result.changeCount).toBeGreaterThan(0);
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

      expect(result.local).toBe(true);
      expect(result.localReason).toBe("invalid_key");
      expect(result.serverError).toBe("Invalid API key");
      expect(result.code).toBe("INVALID_KEY");
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

      expect(result.local).toBe(true);
      expect(result.serverError).toBe("API error: 503");
      expect(result.code).toBeUndefined();
    });

    it("falls back on-device when fetch throws", async () => {
      init({
        storage: { apiKey: "eak_good" },
        fetchImpl: async () => {
          throw new Error("ECONNREFUSED 127.0.0.1:443");
        },
      });

      const result = await mod.sanitizePrompt("anything");

      expect(result.local).toBe(true);
      expect(result.localReason).toBe("unavailable");
      expect(result.serverError).toBe("Network error: ECONNREFUSED 127.0.0.1:443");
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

  describe("reportOutcome", () => {
    it("POSTs to /api/dev/outcome with the bearer key and a normalised body", async () => {
      init({
        storage: { apiKey: "eak_outcome", enabled: true },
        fetchImpl: async () => jsonResponse({ ok: true }),
      });

      const result = await mod.reportOutcome({
        level: "danger",
        action: "cancel",
        riskScore: 87,
        categories: ["pii", "secrets"],
      });

      expect(result).toEqual({ ok: true });
      expect(fetchStub).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchStub.mock.calls[0];
      expect(url).toBe(`${API_URL}/api/dev/outcome`);
      expect(opts.method).toBe("POST");
      expect(opts.headers["Content-Type"]).toBe("application/json");
      expect(opts.headers.Authorization).toBe("Bearer eak_outcome");
      const body = JSON.parse(opts.body);
      expect(body).toEqual({
        level: "danger",
        action: "cancel",
        riskScore: 87,
        categories: ["pii", "secrets"],
      });
    });

    it("returns no_api_key without making a network call when no key is set", async () => {
      init({
        storage: {},
        fetchImpl: async () => jsonResponse({ ok: true }),
      });
      const result = await mod.reportOutcome({ level: "caution", action: "send-anyway" });
      expect(result).toEqual({ ok: false, error: "no_api_key" });
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it("returns disabled without making a network call when the firewall is disabled", async () => {
      init({
        storage: { apiKey: "eak_x", enabled: false },
        fetchImpl: async () => jsonResponse({ ok: true }),
      });
      const result = await mod.reportOutcome({ level: "caution", action: "sanitize" });
      expect(result).toEqual({ ok: false, error: "disabled" });
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it("rejects payloads that are missing level or action without making a network call", async () => {
      init({
        storage: { apiKey: "eak_x", enabled: true },
        fetchImpl: async () => jsonResponse({ ok: true }),
      });
      const a = await mod.reportOutcome({ action: "cancel" });
      const b = await mod.reportOutcome({ level: "danger" });
      const c = await mod.reportOutcome(null);
      expect(a).toEqual({ ok: false, error: "invalid_payload" });
      expect(b).toEqual({ ok: false, error: "invalid_payload" });
      expect(c).toEqual({ ok: false, error: "invalid_payload" });
      expect(fetchStub).not.toHaveBeenCalled();
    });

    it("drops non-finite riskScore and non-string category entries, capping at 32 categories", async () => {
      init({
        storage: { apiKey: "eak_x", enabled: true },
        fetchImpl: async () => jsonResponse({ ok: true }),
      });

      const tooMany = Array.from({ length: 50 }, (_, i) => `c${i}`);
      await mod.reportOutcome({
        level: "caution",
        action: "send-anyway",
        riskScore: NaN,
        categories: [...tooMany, 42, null, undefined, "ok"],
      });
      const body = JSON.parse(fetchStub.mock.calls[0][1].body);
      expect(body.riskScore).toBe(null);
      expect(body.categories).toHaveLength(32);
      expect(body.categories[0]).toBe("c0");
      expect(body.categories[31]).toBe("c31");
    });

    it("surfaces server errors from non-2xx responses", async () => {
      init({
        storage: { apiKey: "eak_x", enabled: true },
        fetchImpl: async () => ({
          ok: false,
          status: 400,
          headers: { get: () => "application/json" },
          json: async () => ({ error: "Invalid level" }),
        }),
      });
      const result = await mod.reportOutcome({ level: "weird", action: "cancel" });
      expect(result).toEqual({ ok: false, error: "Invalid level" });
    });

    it("surfaces network errors when fetch throws", async () => {
      init({
        storage: { apiKey: "eak_x", enabled: true },
        fetchImpl: async () => {
          throw new Error("ECONNREFUSED 127.0.0.1:443");
        },
      });
      const result = await mod.reportOutcome({ level: "danger", action: "cancel" });
      expect(result).toEqual({ ok: false, error: "Network error: ECONNREFUSED 127.0.0.1:443" });
    });
  });

  describe("recordLastAttempt — attempt-ID correlation (task #122)", () => {
    // The handler is registered via chrome.runtime.onMessage.addListener;
    // we drive ANALYZE through it so we exercise the real recordLastAttempt
    // code path including the attemptId echo.

    function getMessageListener(chromeStub) {
      return chromeStub.runtime.onMessage.addListener.mock.calls[0][0];
    }

    function makeChromeWithExistingTimeout(attemptId) {
      const stub = makeChrome({ apiKey: "eak_good", enabled: true });
      const existing = { status: "timeout", at: Date.now(), attemptId };
      // The real handler issues two get() calls: one for {apiKey, enabled}
      // (analyzePrompt) and one for "lastAttempt" (recordLastAttempt).
      stub.storage.local.get = vi.fn(async (keys) => {
        if (keys === "lastAttempt") return { lastAttempt: existing };
        if (Array.isArray(keys)) {
          const out = {};
          if (keys.includes("apiKey")) out.apiKey = "eak_good";
          if (keys.includes("enabled")) out.enabled = true;
          return out;
        }
        return { apiKey: "eak_good", enabled: true };
      });
      return stub;
    }

    it("does NOT overwrite a fresh timeout record when the late background response has the SAME attemptId", async () => {
      const chromeStub = makeChromeWithExistingTimeout("A");
      const fetchStub = vi.fn(async () =>
        jsonResponse({ riskScore: 0.1, level: "low", issues: [] }),
      );
      loadBackgroundModule({ chrome: chromeStub, fetch: fetchStub });
      const listener = getMessageListener(chromeStub);

      const sendResponse = vi.fn();
      listener({ type: "ANALYZE", text: "hi", attemptId: "A" }, {}, sendResponse);
      for (let i = 0; i < 10; i++) await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const setCalls = chromeStub.storage.local.set.mock.calls.map((c) => c[0]);
      expect(setCalls.some((c) => "lastAttempt" in c)).toBe(false);
    });

    it("overwrites an old timeout record when a NEW attempt (different attemptId) succeeds within the same 30s window", async () => {
      const chromeStub = makeChromeWithExistingTimeout("A");
      const fetchStub = vi.fn(async () =>
        jsonResponse({ riskScore: 0.1, level: "low", issues: [] }),
      );
      loadBackgroundModule({ chrome: chromeStub, fetch: fetchStub });
      const listener = getMessageListener(chromeStub);

      const sendResponse = vi.fn();
      listener({ type: "ANALYZE", text: "hi", attemptId: "B" }, {}, sendResponse);
      for (let i = 0; i < 10; i++) await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const attempts = chromeStub.storage.local.set.mock.calls
        .map((c) => c[0])
        .filter((c) => "lastAttempt" in c);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].lastAttempt.status).toBe("success");
      expect(attempts[0].lastAttempt.attemptId).toBe("B");
    });
  });

  describe("OPEN_POPUP message handler", () => {
    // The handler is registered via chrome.runtime.onMessage.addListener; the
    // makeChrome stub captures it in a vi.fn so we can invoke it directly
    // here. The contract we care about: sendResponse fires AFTER the open
    // attempt actually settles, with {ok:true} on success and {ok:false}
    // on failure — the content-script's clipboard fallback depends on this.

    function getMessageListener(chromeStub) {
      const calls = chromeStub.runtime.onMessage.addListener.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      return calls[0][0];
    }

    it("responds {ok:true} when chrome.action.openPopup() resolves", async () => {
      const chromeStub = makeChrome();
      chromeStub.action = { openPopup: vi.fn(() => Promise.resolve()) };
      chromeStub.runtime.getURL = (p) => `chrome-extension://abcd/${p}`;
      chromeStub.tabs = { create: vi.fn() };
      const fetchStub = vi.fn();
      loadBackgroundModule({ chrome: chromeStub, fetch: fetchStub });
      const listener = getMessageListener(chromeStub);

      const sendResponse = vi.fn();
      const keepAlive = listener({ type: "OPEN_POPUP" }, {}, sendResponse);
      expect(keepAlive).toBe(true);
      // Drain microtasks so the async IIFE inside the handler can complete.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(chromeStub.action.openPopup).toHaveBeenCalledTimes(1);
      expect(chromeStub.tabs.create).not.toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });

    it("falls back to tabs.create when chrome.action.openPopup() rejects, and waits for it to settle before responding", async () => {
      const chromeStub = makeChrome();
      chromeStub.action = { openPopup: vi.fn(() => Promise.reject(new Error("no active window"))) };
      chromeStub.runtime.getURL = (p) => `chrome-extension://abcd/${p}`;
      let createCb;
      chromeStub.tabs = {
        create: vi.fn((opts, cb) => {
          createCb = cb;
        }),
      };
      const fetchStub = vi.fn();
      loadBackgroundModule({ chrome: chromeStub, fetch: fetchStub });
      const listener = getMessageListener(chromeStub);

      const sendResponse = vi.fn();
      listener({ type: "OPEN_POPUP" }, {}, sendResponse);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(chromeStub.tabs.create).toHaveBeenCalledTimes(1);
      // openPopup rejected → handler is now awaiting tabs.create. It must
      // NOT have responded yet — that was the "ghost success" bug.
      expect(sendResponse).not.toHaveBeenCalled();

      // Now resolve tabs.create with a tab → handler should respond ok:true.
      createCb({ id: 42 });
      // Drain enough microtasks for openAsTab's Promise.resolve to chain
      // back through the awaiting IIFE and into sendResponse.
      for (let i = 0; i < 8; i++) await Promise.resolve();
      expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });

    it("responds {ok:false} when both openPopup and tabs.create fail, so the content script can show its clipboard fallback", async () => {
      const chromeStub = makeChrome();
      chromeStub.action = undefined; // no openPopup at all
      chromeStub.runtime.getURL = (p) => `chrome-extension://abcd/${p}`;
      chromeStub.tabs = {
        create: vi.fn((opts, cb) => {
          chromeStub.runtime.lastError = { message: "tab create blocked" };
          cb(null);
          chromeStub.runtime.lastError = undefined;
        }),
      };
      const fetchStub = vi.fn();
      loadBackgroundModule({ chrome: chromeStub, fetch: fetchStub });
      const listener = getMessageListener(chromeStub);

      const sendResponse = vi.fn();
      listener({ type: "OPEN_POPUP" }, {}, sendResponse);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(sendResponse).toHaveBeenCalledTimes(1);
      const arg = sendResponse.mock.calls[0][0];
      expect(arg.ok).toBe(false);
      expect(typeof arg.error).toBe("string");
    });
  });
});
