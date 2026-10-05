// Organization (Team / Enterprise) rules.
//
// Pure decision logic for the organization system, kept in an .mjs module so
// the api-server `node --test` harness can unit-test it without Express or a
// database. `lib/org/index.ts` and `routes/org.ts` import the same helpers.
//
// Who pays decides the plan: anyone who is an active member of an active
// organization gets the organization's plan (business or enterprise),
// whatever their own `users.plan_type` says.

import { createHash, randomBytes } from "node:crypto";

export const ORG_PLANS = new Set(["business", "enterprise"]);
export const ORG_ROLES = new Set(["owner", "admin", "member"]);
export const MIN_SEATS = 1;
export const MAX_SEATS = 1000;
export const MAX_ORG_NAME_LENGTH = 120;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(input) {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function generateInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

// `membership` is the user's active membership row joined with its
// organization ({ memberStatus, orgStatus, orgPlan }) or null.
export function effectivePlan(userPlan, membership) {
  if (
    membership &&
    membership.memberStatus === "active" &&
    membership.orgStatus === "active" &&
    ORG_PLANS.has(membership.orgPlan)
  ) {
    return membership.orgPlan;
  }
  return userPlan || "free";
}

export function canManage(role) {
  return role === "owner" || role === "admin";
}

export function validateOrgInput({ name, plan, seatLimit }) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return { ok: false, error: "Organization name is required" };
  if (trimmed.length > MAX_ORG_NAME_LENGTH) {
    return { ok: false, error: `Organization name must be at most ${MAX_ORG_NAME_LENGTH} characters` };
  }
  const p = plan ?? "business";
  if (!ORG_PLANS.has(p)) return { ok: false, error: "plan must be business or enterprise" };
  const seats = seatLimit ?? 10;
  if (!Number.isInteger(seats) || seats < MIN_SEATS || seats > MAX_SEATS) {
    return { ok: false, error: `seatLimit must be a whole number from ${MIN_SEATS} to ${MAX_SEATS}` };
  }
  return { ok: true, value: { name: trimmed, plan: p, seatLimit: seats } };
}

// Seats are taken by everyone invited or active, so an owner can't hand out
// more links than the organization pays for.
export function validateInvite({ actorRole, role, seatsUsed, seatLimit }) {
  if (!canManage(actorRole)) {
    return { ok: false, status: 403, error: "Only organization owners and admins can invite people" };
  }
  const r = role ?? "member";
  if (!ORG_ROLES.has(r)) return { ok: false, status: 400, error: "role must be owner, admin or member" };
  if (r === "owner" && actorRole !== "owner") {
    return { ok: false, status: 403, error: "Only owners can invite another owner" };
  }
  if (seatsUsed >= seatLimit) {
    return {
      ok: false,
      status: 409,
      error: `All ${seatLimit} seats are in use. Remove someone or contact us to add seats.`,
    };
  }
  return { ok: true, role: r };
}

// `target` is { userId, role, status }. `activeOwnerCount` counts active
// owners in the organization, including the target if it is one.
export function validateRemoval({ actorRole, actorUserId, target, activeOwnerCount }) {
  if (!target || target.status === "removed") {
    return { ok: false, status: 404, error: "Member not found" };
  }
  const isSelf = target.userId != null && target.userId === actorUserId;
  if (!isSelf && !canManage(actorRole)) {
    return { ok: false, status: 403, error: "Only organization owners and admins can remove people" };
  }
  if (!isSelf && target.role === "owner" && actorRole !== "owner") {
    return { ok: false, status: 403, error: "Only owners can remove an owner" };
  }
  if (target.role === "owner" && target.status === "active" && activeOwnerCount <= 1) {
    return {
      ok: false,
      status: 409,
      error: "An organization needs at least one owner. Make someone else an owner first.",
    };
  }
  return { ok: true };
}

export function validateRoleChange({ actorRole, actorUserId, target, role, activeOwnerCount }) {
  if (!target || target.status === "removed") {
    return { ok: false, status: 404, error: "Member not found" };
  }
  if (!ORG_ROLES.has(role)) return { ok: false, status: 400, error: "role must be owner, admin or member" };
  if (actorRole !== "owner") {
    return { ok: false, status: 403, error: "Only owners can change roles" };
  }
  if (
    target.role === "owner" &&
    role !== "owner" &&
    target.status === "active" &&
    activeOwnerCount <= 1
  ) {
    return {
      ok: false,
      status: 409,
      error: target.userId === actorUserId
        ? "You are the only owner. Make someone else an owner first."
        : "An organization needs at least one owner.",
    };
  }
  return { ok: true };
}

// `invite` is the member row found by token hash (or null), `org` its
// organization, `userEmail` the signed-in user's email, and
// `otherActiveOrgId` the id of an organization the user is already active
// in (or null).
export function validateAcceptance({ invite, org, userEmail, otherActiveOrgId }) {
  if (!invite || invite.status === "removed") {
    return { ok: false, status: 404, error: "This invite link is not valid. Ask your admin for a new one." };
  }
  if (invite.status === "active") {
    return { ok: false, status: 409, error: "This invite has already been used." };
  }
  if (!org || org.status !== "active") {
    return { ok: false, status: 403, error: "This organization is not active." };
  }
  const email = normalizeEmail(userEmail);
  if (!email || email !== invite.email) {
    return {
      ok: false,
      status: 403,
      error: `This invite is for ${invite.email}. Sign in with that email to accept it.`,
    };
  }
  if (otherActiveOrgId && otherActiveOrgId !== invite.orgId) {
    return {
      ok: false,
      status: 409,
      error: "You already belong to another organization. Leave it before joining this one.",
    };
  }
  return { ok: true };
}

// Folds `SELECT user_id, level, action, count(*), max(created_at)` rows into
// one summary per user. Warnings are caution/danger outcomes (what the user
// actually saw); "protected" means they sanitized or cancelled.
export function summarizeActivity(rows) {
  const byUser = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r.userId !== "string") continue;
    const n = Number(r.count) || 0;
    let s = byUser.get(r.userId);
    if (!s) {
      s = { userId: r.userId, checks: 0, warnings: 0, protected: 0, sentAnyway: 0, lastActivityAt: null };
      byUser.set(r.userId, s);
    }
    s.checks += n;
    if (r.level === "caution" || r.level === "danger") {
      s.warnings += n;
      if (r.action === "sanitize" || r.action === "cancel") s.protected += n;
      else if (r.action === "send-anyway") s.sentAnyway += n;
    }
    const last = r.lastAt ? new Date(r.lastAt) : null;
    if (last && !Number.isNaN(last.getTime())) {
      if (!s.lastActivityAt || last > new Date(s.lastActivityAt)) s.lastActivityAt = last.toISOString();
    }
  }
  return byUser;
}
