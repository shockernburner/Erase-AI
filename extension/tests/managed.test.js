import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadBackgroundModule } from "./loadModule.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "src", "managed.js"), "utf8");
const TOKEN = "eae_abcdefghijklmnopqrstuvwxyz012345";

function loadManaged() {
  const sandbox = { Number, Object, String };
  vm.createContext(sandbox);
  vm.runInContext("var self = globalThis;", sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.EraseAIManaged;
}

describe("managed policy", () => {
  const M = loadManaged();
  const empty = M.normalizeState(null);

  it("reads only a real enrollment token, and a clean email", () => {
    expect(M.readPolicy({ enrollmentToken: ` ${TOKEN} `, userEmail: " Bob@Acme.com " })).toEqual({ token: TOKEN, email: "bob@acme.com" });
    expect(M.readPolicy({ enrollmentToken: TOKEN, userEmail: "not an email" })).toEqual({ token: TOKEN, email: null });
    expect(M.readPolicy({ enrollmentToken: "eak_wrongkindoftoken12345" })).toBe(null);
    expect(M.readPolicy({})).toBe(null);
    expect(M.readPolicy(null)).toBe(null);
  });

  it("enrolls with the policy email, else asks for one", () => {
    const withEmail = M.readPolicy({ enrollmentToken: TOKEN, userEmail: "bob@acme.com" });
    expect(M.decide(withEmail, empty, { apiKey: "" })).toEqual({ action: "enroll", email: "bob@acme.com", tag: TOKEN.slice(0, 12) });
    const noEmail = M.readPolicy({ enrollmentToken: TOKEN });
    expect(M.decide(noEmail, empty, { apiKey: "" })).toEqual({ action: "need_email" });
    expect(M.decide(noEmail, empty, { apiKey: "", pendingEmail: "Carol@Acme.com" }).email).toBe("carol@acme.com");
  });

  it("does nothing once enrolled with the same token; re-enrolls when IT replaces it", () => {
    const policy = M.readPolicy({ enrollmentToken: TOKEN, userEmail: "bob@acme.com" });
    const enrolled = M.normalizeState({ tokenTag: TOKEN.slice(0, 12), email: "bob@acme.com", enrolledAt: 5 });
    expect(M.decide(policy, enrolled, { apiKey: "eak_x" })).toEqual({ action: "none" });
    expect(M.decide(policy, enrolled, { apiKey: "" }).action).toBe("enroll");
    const rotated = M.readPolicy({ enrollmentToken: "eae_ZZZZZZZZZZZZZZZZZZZZZZZZ" });
    expect(M.decide(rotated, enrolled, { apiKey: "eak_x" })).toMatchObject({ action: "enroll", email: "bob@acme.com" });
    expect(M.isLocked(enrolled)).toBe(true);
    expect(M.isLocked(empty)).toBe(false);
  });

  it("releases the browser when the policy is removed", () => {
    const enrolled = M.normalizeState({ tokenTag: "eae_x", enrolledAt: 5 });
    expect(M.decide(null, enrolled, {})).toEqual({ action: "release" });
    expect(M.decide(null, empty, {})).toEqual({ action: "none" });
  });
});

describe("manifest declares the managed policy schema", () => {
  it("points at a schema with the enrollment token", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
    expect(manifest.storage.managed_schema).toBe("managed_schema.json");
    const schema = JSON.parse(fs.readFileSync(path.join(ROOT, manifest.storage.managed_schema), "utf8"));
    expect(schema.properties.enrollmentToken.type).toBe("string");
    expect(schema.properties.userEmail.type).toBe("string");
    // Managed storage needs no new permission, so updating doesn't disable the extension.
    expect(manifest.permissions).toEqual(["storage", "activeTab"]);
  });
});

function stubs({ policy, local = {}, response }) {
  const storage = { ...local };
  const chrome = {
    storage: {
      managed: { get: vi.fn(async () => policy) },
      local: {
        get: vi.fn(async (keys) => {
          const out = {};
          for (const k of Array.isArray(keys) ? keys : [keys]) if (k in storage) out[k] = storage[k];
          return out;
        }),
        set: vi.fn(async (obj) => Object.assign(storage, obj)),
        remove: vi.fn(async (k) => { delete storage[k]; }),
      },
      onChanged: { addListener: vi.fn() },
    },
    runtime: {
      onMessage: { addListener: vi.fn() },
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
      onConnect: { addListener: vi.fn() },
      getManifest: () => ({ version: "1.6.0" }),
      setUninstallURL: vi.fn(),
    },
    tabs: { create: vi.fn() },
  };
  const fetch = vi.fn(async () => ({
    ok: response.status < 300,
    status: response.status,
    json: async () => response.body,
  }));
  return { chrome, fetch, storage };
}

describe("background enrollment", () => {
  it("enrolls from policy and stores the organization's key", async () => {
    const { chrome, fetch, storage } = stubs({
      policy: { enrollmentToken: TOKEN, userEmail: "bob@acme.com" },
      response: { status: 200, body: { ok: true, apiKey: "eak_managed", email: "bob@acme.com", organization: { name: "Acme" } } },
    });
    const mod = loadBackgroundModule({ chrome, fetch });
    await mod.syncManaged();
    await mod.syncManaged();
    const calls = fetch.mock.calls.filter(([url]) => String(url).endsWith("/api/org/enroll"));
    expect(calls.length).toBe(1);
    expect(JSON.parse(calls[0][1].body)).toEqual({ token: TOKEN, email: "bob@acme.com", client: "chrome" });
    expect(storage.apiKey).toBe("eak_managed");
    expect(storage.managed).toMatchObject({ orgName: "Acme", email: "bob@acme.com", tokenTag: TOKEN.slice(0, 12), needEmail: false, error: null });
  });

  it("asks for the email when the policy has none, then uses the typed one", async () => {
    const { chrome, fetch, storage } = stubs({
      policy: { enrollmentToken: TOKEN },
      response: { status: 200, body: { ok: true, apiKey: "eak_m2", email: "carol@acme.com", organization: { name: "Acme" } } },
    });
    const mod = loadBackgroundModule({ chrome, fetch });
    const first = await mod.syncManaged();
    expect(first.needEmail).toBe(true);
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/api/org/enroll"))).toBe(false);
    await mod.syncManaged("carol@acme.com");
    expect(storage.apiKey).toBe("eak_m2");
  });

  it("keeps the server's reason and lets the person retype a non-work email", async () => {
    const { chrome, fetch, storage } = stubs({
      policy: { enrollmentToken: TOKEN },
      response: { status: 403, body: { error: "Use your work email (@acme.com)." } },
    });
    const mod = loadBackgroundModule({ chrome, fetch });
    await mod.syncManaged("me@gmail.com");
    expect(storage.apiKey).toBeUndefined();
    expect(storage.managed).toMatchObject({ needEmail: true, error: "Use your work email (@acme.com)." });
  });
});
