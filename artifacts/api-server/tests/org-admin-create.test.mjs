// A platform admin can create a Team or Enterprise organization and become its owner at once, so the
// organization dashboard (members, invites, billing, audit log) is there to look at straight away,
// without waiting for an invite link to be accepted. Nothing is charged for such an organization: it is
// created by an admin, not bought, and the dashboard says so.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { decideAdminOwner } from "../src/lib/org/admin-create-source.mjs";

const admin = { id: "admin1", email: "Owner@Vantward.com" };

describe("decideAdminOwner", () => {
  test("claiming makes the admin the active owner, with their own lowercase email", () => {
    const out = decideAdminOwner({ claimOwner: true, ownerEmail: undefined, admin, activeElsewhere: false });
    assert.deepEqual(out, { ok: true, mode: "claim", userId: "admin1", email: "owner@vantward.com", status: "active" });
  });

  test("an admin who already belongs to another organization cannot claim a second one", () => {
    const out = decideAdminOwner({ claimOwner: true, admin, activeElsewhere: true });
    assert.equal(out.ok, false);
    assert.equal(out.status, 409);
    assert.match(out.error, /already in an organization/i);
  });

  test("an admin account without an email cannot claim", () => {
    const out = decideAdminOwner({ claimOwner: true, admin: { id: "a", email: null }, activeElsewhere: false });
    assert.equal(out.ok, false);
    assert.equal(out.status, 400);
  });

  test("without claiming, the owner is whoever the invite is for", () => {
    const out = decideAdminOwner({ claimOwner: false, ownerEmail: " Buyer@Acme.com ", admin, activeElsewhere: true });
    assert.deepEqual(out, { ok: true, mode: "invite", email: "buyer@acme.com", status: "invited" });
  });

  test("without claiming, a valid owner email is required", () => {
    for (const ownerEmail of [undefined, "", "nope", 5]) {
      const out = decideAdminOwner({ claimOwner: false, ownerEmail, admin, activeElsewhere: false });
      assert.equal(out.ok, false);
      assert.equal(out.status, 400);
    }
  });

  test("only a real true claims; truthy strings do not", () => {
    for (const claimOwner of ["true", 1, "yes"]) {
      const out = decideAdminOwner({ claimOwner, ownerEmail: "b@acme.com", admin, activeElsewhere: false });
      assert.equal(out.mode, "invite");
    }
  });
});
