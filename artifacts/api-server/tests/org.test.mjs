// Coverage for the organization (Team / Enterprise) rules. routes/org.ts and
// lib/org/index.ts run these same pure helpers against the database.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  effectivePlan,
  generateInviteToken,
  hashInviteToken,
  normalizeEmail,
  summarizeActivity,
  validateAcceptance,
  validateInvite,
  validateOrgInput,
  validateRemoval,
  validateRoleChange,
} from "../src/lib/org/org-source.mjs";

describe("effectivePlan", () => {
  const active = { memberStatus: "active", orgStatus: "active", orgPlan: "business" };

  test("an active member of an active org gets the org plan, never personal", () => {
    assert.equal(effectivePlan("personal", active), "business");
    assert.equal(effectivePlan("free", active), "business");
    assert.equal(effectivePlan("pro", { ...active, orgPlan: "enterprise" }), "enterprise");
  });

  test("no membership keeps the user's own plan", () => {
    assert.equal(effectivePlan("pro", null), "pro");
    assert.equal(effectivePlan(undefined, null), "free");
  });

  test("a suspended org or a non-active membership does not grant the org plan", () => {
    assert.equal(effectivePlan("personal", { ...active, orgStatus: "suspended" }), "personal");
    assert.equal(effectivePlan("free", { ...active, memberStatus: "invited" }), "free");
    assert.equal(effectivePlan("free", { ...active, memberStatus: "removed" }), "free");
  });

  test("an unknown org plan is ignored", () => {
    assert.equal(effectivePlan("free", { ...active, orgPlan: "pro" }), "free");
  });
});

describe("normalizeEmail", () => {
  test("trims and lowercases valid emails", () => {
    assert.equal(normalizeEmail("  Alice@Example.COM "), "alice@example.com");
  });
  test("rejects junk", () => {
    assert.equal(normalizeEmail("not-an-email"), null);
    assert.equal(normalizeEmail(""), null);
    assert.equal(normalizeEmail(42), null);
    assert.equal(normalizeEmail(`${"a".repeat(320)}@x.io`), null);
  });
});

describe("invite tokens", () => {
  test("only the hash is derived from the token and it is stable", () => {
    const { token, hash } = generateInviteToken();
    assert.ok(token.length >= 40);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hashInviteToken(token), hash);
    assert.notEqual(generateInviteToken().token, token);
  });
});

describe("validateOrgInput", () => {
  test("defaults to business with 10 seats", () => {
    const r = validateOrgInput({ name: "  Acme  " });
    assert.deepEqual(r, { ok: true, value: { name: "Acme", plan: "business", seatLimit: 10 } });
  });
  test("rejects personal plans, bad seats and empty names", () => {
    assert.equal(validateOrgInput({ name: "Acme", plan: "pro" }).ok, false);
    assert.equal(validateOrgInput({ name: "Acme", seatLimit: 0 }).ok, false);
    assert.equal(validateOrgInput({ name: "Acme", seatLimit: 2.5 }).ok, false);
    assert.equal(validateOrgInput({ name: "   " }).ok, false);
  });
});

describe("validateInvite", () => {
  test("owners and admins can invite members within the seat limit", () => {
    assert.deepEqual(validateInvite({ actorRole: "owner", seatsUsed: 2, seatLimit: 3 }), { ok: true, role: "member" });
    assert.deepEqual(validateInvite({ actorRole: "admin", role: "admin", seatsUsed: 0, seatLimit: 3 }), { ok: true, role: "admin" });
  });
  test("members cannot invite", () => {
    assert.equal(validateInvite({ actorRole: "member", seatsUsed: 0, seatLimit: 3 }).status, 403);
  });
  test("only owners invite owners", () => {
    assert.equal(validateInvite({ actorRole: "admin", role: "owner", seatsUsed: 0, seatLimit: 3 }).status, 403);
    assert.equal(validateInvite({ actorRole: "owner", role: "owner", seatsUsed: 0, seatLimit: 3 }).ok, true);
  });
  test("pending invites count against seats", () => {
    const r = validateInvite({ actorRole: "owner", seatsUsed: 3, seatLimit: 3 });
    assert.equal(r.ok, false);
    assert.equal(r.status, 409);
  });
  test("unknown roles are rejected", () => {
    assert.equal(validateInvite({ actorRole: "owner", role: "superuser", seatsUsed: 0, seatLimit: 3 }).status, 400);
  });
});

describe("validateRemoval", () => {
  const member = { userId: "u2", role: "member", status: "active" };
  const owner = { userId: "u1", role: "owner", status: "active" };

  test("admins remove members; members cannot remove others", () => {
    assert.equal(validateRemoval({ actorRole: "admin", actorUserId: "u9", target: member, activeOwnerCount: 1 }).ok, true);
    assert.equal(validateRemoval({ actorRole: "member", actorUserId: "u9", target: member, activeOwnerCount: 1 }).status, 403);
  });
  test("anyone can leave", () => {
    assert.equal(validateRemoval({ actorRole: "member", actorUserId: "u2", target: member, activeOwnerCount: 1 }).ok, true);
  });
  test("the last owner stays", () => {
    assert.equal(validateRemoval({ actorRole: "owner", actorUserId: "u1", target: owner, activeOwnerCount: 1 }).status, 409);
    assert.equal(validateRemoval({ actorRole: "owner", actorUserId: "u3", target: owner, activeOwnerCount: 2 }).ok, true);
  });
  test("admins cannot remove owners", () => {
    assert.equal(validateRemoval({ actorRole: "admin", actorUserId: "u9", target: owner, activeOwnerCount: 2 }).status, 403);
  });
  test("a pending owner invite can be cancelled even with one active owner", () => {
    const pending = { userId: null, role: "owner", status: "invited" };
    assert.equal(validateRemoval({ actorRole: "owner", actorUserId: "u1", target: pending, activeOwnerCount: 1 }).ok, true);
  });
  test("removed or missing targets are 404", () => {
    assert.equal(validateRemoval({ actorRole: "owner", actorUserId: "u1", target: undefined, activeOwnerCount: 1 }).status, 404);
    assert.equal(validateRemoval({ actorRole: "owner", actorUserId: "u1", target: { ...member, status: "removed" }, activeOwnerCount: 1 }).status, 404);
  });
});

describe("validateRoleChange", () => {
  const owner = { userId: "u1", role: "owner", status: "active" };
  test("only owners change roles", () => {
    assert.equal(validateRoleChange({ actorRole: "admin", actorUserId: "u9", target: { userId: "u2", role: "member", status: "active" }, role: "admin", activeOwnerCount: 1 }).status, 403);
  });
  test("the last owner cannot step down", () => {
    assert.equal(validateRoleChange({ actorRole: "owner", actorUserId: "u1", target: owner, role: "admin", activeOwnerCount: 1 }).status, 409);
    assert.equal(validateRoleChange({ actorRole: "owner", actorUserId: "u1", target: owner, role: "admin", activeOwnerCount: 2 }).ok, true);
  });
});

describe("validateAcceptance", () => {
  const invite = { orgId: "o1", email: "bob@acme.io", status: "invited" };
  const org = { status: "active" };

  test("the invited email can accept", () => {
    assert.equal(validateAcceptance({ invite, org, userEmail: "Bob@Acme.io", otherActiveOrgId: null }).ok, true);
  });
  test("a different email cannot", () => {
    const r = validateAcceptance({ invite, org, userEmail: "eve@acme.io", otherActiveOrgId: null });
    assert.equal(r.status, 403);
    assert.match(r.error, /bob@acme\.io/);
  });
  test("used, missing or cancelled invites fail", () => {
    assert.equal(validateAcceptance({ invite: { ...invite, status: "active" }, org, userEmail: "bob@acme.io" }).status, 409);
    assert.equal(validateAcceptance({ invite: null, org, userEmail: "bob@acme.io" }).status, 404);
    assert.equal(validateAcceptance({ invite: { ...invite, status: "removed" }, org, userEmail: "bob@acme.io" }).status, 404);
  });
  test("suspended orgs cannot be joined", () => {
    assert.equal(validateAcceptance({ invite, org: { status: "suspended" }, userEmail: "bob@acme.io" }).status, 403);
  });
  test("one active organization per user", () => {
    assert.equal(validateAcceptance({ invite, org, userEmail: "bob@acme.io", otherActiveOrgId: "o2" }).status, 409);
    assert.equal(validateAcceptance({ invite, org, userEmail: "bob@acme.io", otherActiveOrgId: "o1" }).ok, true);
  });
});

describe("summarizeActivity", () => {
  test("folds grouped outcome rows per person", () => {
    const rows = [
      { userId: "u1", level: "safe", action: "auto-send", count: 10, lastAt: "2026-10-01T10:00:00Z" },
      { userId: "u1", level: "danger", action: "sanitize", count: "3", lastAt: "2026-10-03T10:00:00Z" },
      { userId: "u1", level: "caution", action: "send-anyway", count: 2, lastAt: new Date("2026-10-02T10:00:00Z") },
      { userId: "u1", level: "caution", action: "cancel", count: 1, lastAt: null },
      { userId: "u2", level: "danger", action: "send-anyway", count: 1, lastAt: "2026-09-30T00:00:00Z" },
      null,
    ];
    const out = summarizeActivity(rows);
    assert.deepEqual(out.get("u1"), {
      userId: "u1",
      checks: 16,
      warnings: 6,
      protected: 4,
      sentAnyway: 2,
      lastActivityAt: "2026-10-03T10:00:00.000Z",
    });
    assert.equal(out.get("u2").sentAnyway, 1);
    assert.equal(summarizeActivity(undefined).size, 0);
  });
});
