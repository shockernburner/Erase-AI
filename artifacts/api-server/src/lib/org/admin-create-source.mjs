// Who owns an organization that a platform admin creates. By default the owner is invited by email.
// With `claimOwner: true` (the literal true) the admin becomes the active owner straight away.

import { normalizeEmail } from "./org-source.mjs";

export function decideAdminOwner({ claimOwner, ownerEmail, admin, activeElsewhere }) {
  if (claimOwner === true) {
    const email = normalizeEmail(admin && admin.email);
    if (!email) return { ok: false, status: 400, error: "Your admin account has no email, so it cannot own an organization" };
    if (activeElsewhere) {
      return {
        ok: false,
        status: 409,
        error: "You're already in an organization. Leave it first, or create this one with another owner's email.",
      };
    }
    return { ok: true, mode: "claim", userId: admin.id, email, status: "active" };
  }
  const email = normalizeEmail(ownerEmail);
  if (!email) return { ok: false, status: 400, error: "A valid owner email is required" };
  return { ok: true, mode: "invite", email, status: "invited" };
}
