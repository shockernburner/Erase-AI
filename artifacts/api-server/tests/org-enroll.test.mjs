// Coverage for managed-rollout enrollment rules (enroll-source.mjs), used by
// routes/org-enroll.ts and the managed-key gate in routes/dev.ts.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildPolicySnippets,
  decideEnrollment,
  emailDomainAllowed,
  generateEnrollmentToken,
  hashEnrollmentToken,
  looksLikeEnrollmentToken,
  managedKeyAllows,
  parseAllowedDomains,
  splitStoredDomains,
} from "../src/lib/org/enroll-source.mjs";

describe("allowed domains", () => {
  test("normalizes and de-duplicates", () => {
    assert.deepEqual(parseAllowedDomains(" Acme.com, @acme.com\nsub.acme.co.uk; "), { ok: true, domains: ["acme.com", "sub.acme.co.uk"] });
    assert.deepEqual(parseAllowedDomains([]), { ok: true, domains: [] });
  });
  test("rejects things that aren't domains", () => {
    assert.equal(parseAllowedDomains("localhost").ok, false);
    assert.equal(parseAllowedDomains("acme..com").ok, false);
    assert.equal(parseAllowedDomains("-acme.com").ok, false);
    assert.equal(parseAllowedDomains("http://acme.com").ok, false);
    assert.equal(parseAllowedDomains(Array.from({ length: 11 }, (_, i) => `d${i}.com`)).ok, false);
    assert.equal(parseAllowedDomains(42).ok, false);
  });
  test("email must be exactly on an allowed domain", () => {
    assert.equal(emailDomainAllowed("Bob@ACME.com", ["acme.com"]), true);
    assert.equal(emailDomainAllowed("bob@evilacme.com", ["acme.com"]), false);
    assert.equal(emailDomainAllowed("bob@mail.acme.com", ["acme.com"]), false);
    assert.equal(emailDomainAllowed("bob@acme.com", []), false);
    assert.deepEqual(splitStoredDomains("a.com,b.com"), ["a.com", "b.com"]);
    assert.deepEqual(splitStoredDomains(null), []);
  });
});

describe("enrollment tokens", () => {
  test("prefixed, hashed, recognizable", () => {
    const t = generateEnrollmentToken();
    assert.ok(t.token.startsWith("eae_"));
    assert.equal(t.prefix, t.token.slice(0, 12));
    assert.equal(hashEnrollmentToken(t.token), t.hash);
    assert.equal(looksLikeEnrollmentToken(t.token), true);
    assert.equal(looksLikeEnrollmentToken("eak_" + "x".repeat(40)), false);
    assert.equal(looksLikeEnrollmentToken("eae_short"), false);
  });
});

describe("decideEnrollment", () => {
  const org = { id: "o1", status: "active", seatLimit: 3, allowedDomains: ["acme.com"] };
  const base = { org, email: "bob@acme.com", activeOrgId: null, pendingInvite: null, seatsUsed: 1 };
  test("new person on an allowed domain with a free seat joins", () => {
    assert.deepEqual(decideEnrollment(base), { ok: true, action: "create", email: "bob@acme.com" });
  });
  test("already a member: nothing to change", () => {
    assert.equal(decideEnrollment({ ...base, activeOrgId: "o1" }).action, "already");
  });
  test("a pending invite is used even when seats are full", () => {
    assert.equal(decideEnrollment({ ...base, pendingInvite: { id: "m" }, seatsUsed: 3 }).action, "activate");
  });
  test("refusals", () => {
    assert.equal(decideEnrollment({ ...base, email: "bob@gmail.com" }).status, 403);
    assert.equal(decideEnrollment({ ...base, seatsUsed: 3 }).status, 409);
    assert.equal(decideEnrollment({ ...base, activeOrgId: "o2" }).status, 409);
    assert.equal(decideEnrollment({ ...base, org: { ...org, status: "suspended" } }).status, 403);
    assert.equal(decideEnrollment({ ...base, org: { ...org, allowedDomains: [] } }).status, 403);
    assert.equal(decideEnrollment({ ...base, email: "" }).status, 400);
  });
});

describe("managed keys", () => {
  test("only firewall checks", () => {
    for (const p of ["/ping", "/analyze", "/sanitize", "/outcome"]) assert.equal(managedKeyAllows(p), true, p);
    for (const p of ["/history", "/demo-key", "/keys"]) assert.equal(managedKeyAllows(p), false, p);
  });
});

describe("policy snippets", () => {
  test("Chrome managed storage and Android managed configuration", () => {
    const s = buildPolicySnippets({ token: "eae_abc", chromeExtensionId: "ext", androidPackage: "com.x" });
    assert.deepEqual(JSON.parse(s.chrome.policyJson), { enrollmentToken: { Value: "eae_abc" } });
    assert.deepEqual(s.android.managedConfiguration, { enrollment_token: "eae_abc" });
  });
});
