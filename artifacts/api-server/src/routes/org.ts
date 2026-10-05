import { Router, type IRouter, type Request, type Response } from "express";
import { db, organizationMembersTable, organizationsTable, usersTable } from "@workspace/db";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { getActiveMembership, type ActiveMembership } from "../lib/org";
import {
  canManage,
  generateInviteToken,
  hashInviteToken,
  normalizeEmail,
  summarizeActivity,
  validateAcceptance,
  validateInvite,
  validateOrgInput,
  validateRemoval,
  validateRoleChange,
  ORG_PLANS,
  MIN_SEATS,
  MAX_SEATS,
  MAX_ORG_NAME_LENGTH,
  type ActivityRow,
} from "../lib/org/org-source.mjs";

// Organizations (Team / Enterprise).
//
// There is no email sending, so invites are links: inviting someone creates
// an `invited` member row holding the sha256 of a random token and returns
// the raw token once, as /org/join?token=…, for the inviter to send however
// they like. The person accepting must be signed in with the invited email.

const router: IRouter = Router();

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function invitePath(token: string): string {
  return `/org/join?token=${encodeURIComponent(token)}`;
}

function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string })?.code ||
    (err as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

function requireSignedIn(req: Request, res: Response): req is Request & { user: Express.User } {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

function requirePlatformAdmin(req: Request, res: Response): boolean {
  if (!requireSignedIn(req, res)) return false;
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

function memberName(m: { firstName: string | null; lastName: string | null }): string | null {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

async function listMembers(orgId: string, includeInvites: boolean) {
  const rows = await db
    .select({
      id: organizationMembersTable.id,
      userId: organizationMembersTable.userId,
      email: organizationMembersTable.email,
      role: organizationMembersTable.role,
      status: organizationMembersTable.status,
      invitedAt: organizationMembersTable.invitedAt,
      joinedAt: organizationMembersTable.joinedAt,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(organizationMembersTable)
    .leftJoin(usersTable, eq(usersTable.id, organizationMembersTable.userId))
    .where(
      and(
        eq(organizationMembersTable.orgId, orgId),
        includeInvites
          ? ne(organizationMembersTable.status, "removed")
          : eq(organizationMembersTable.status, "active"),
      ),
    )
    .orderBy(asc(organizationMembersTable.invitedAt));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    email: r.email,
    name: memberName(r),
    role: r.role,
    status: r.status,
    invitedAt: r.invitedAt.toISOString(),
    joinedAt: r.joinedAt?.toISOString() ?? null,
  }));
}

async function lockOrg(tx: Tx, orgId: string) {
  const result = await tx.execute(sql`
    SELECT id, name, plan, seat_limit, status FROM organizations WHERE id = ${orgId} FOR UPDATE
  `);
  const row = result.rows[0] as
    | { id: string; name: string; plan: string; seat_limit: number; status: string }
    | undefined;
  return row ? { id: row.id, name: row.name, plan: row.plan, seatLimit: Number(row.seat_limit), status: row.status } : null;
}

async function countSeatsUsed(tx: Tx, orgId: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(organizationMembersTable)
    .where(and(eq(organizationMembersTable.orgId, orgId), ne(organizationMembersTable.status, "removed")));
  return row?.n ?? 0;
}

async function countActiveOwners(tx: Tx, orgId: string): Promise<number> {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.orgId, orgId),
        eq(organizationMembersTable.status, "active"),
        eq(organizationMembersTable.role, "owner"),
      ),
    );
  return row?.n ?? 0;
}

type InviteOutcome =
  | { ok: true; memberId: string; email: string; role: string; token: string }
  | { ok: false; status: number; error: string };

// Shared by org owners/admins and platform admins. `actorRole` is the
// inviter's organization role ("owner" for platform admins).
async function createInvite(opts: {
  orgId: string;
  actorRole: string;
  actorUserId: string;
  email: unknown;
  role: unknown;
}): Promise<InviteOutcome> {
  const email = normalizeEmail(opts.email);
  if (!email) return { ok: false, status: 400, error: "A valid email is required" };
  const { token, hash } = generateInviteToken();
  try {
    return await db.transaction(async (tx) => {
      const org = await lockOrg(tx, opts.orgId);
      if (!org) return { ok: false, status: 404, error: "Organization not found" } as const;
      const seatsUsed = await countSeatsUsed(tx, org.id);
      const check = validateInvite({ actorRole: opts.actorRole, role: opts.role, seatsUsed, seatLimit: org.seatLimit });
      if (!check.ok) return check;
      const [row] = await tx
        .insert(organizationMembersTable)
        .values({
          orgId: org.id,
          email,
          role: check.role,
          status: "invited",
          inviteTokenHash: hash,
          invitedBy: opts.actorUserId,
        })
        .returning({ id: organizationMembersTable.id });
      return { ok: true, memberId: row.id, email, role: check.role, token } as const;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, status: 409, error: `${email} is already invited or a member` };
    }
    throw err;
  }
}

// Loads the caller's membership, answering 404 when they have none.
async function requireMembership(req: Request, res: Response): Promise<ActiveMembership | null> {
  if (!requireSignedIn(req, res)) return null;
  const membership = await getActiveMembership(req.user.id);
  if (!membership) {
    res.status(404).json({ error: "You are not in an organization" });
    return null;
  }
  return membership;
}

// ---------------------------------------------------------------------------
// Members: my organization
// ---------------------------------------------------------------------------

router.get("/org", async (req: Request, res: Response) => {
  try {
    if (!requireSignedIn(req, res)) return;
    const membership = await getActiveMembership(req.user.id);
    if (!membership) {
      res.json({ organization: null });
      return;
    }
    const manager = canManage(membership.role);
    const members = await listMembers(membership.orgId, manager);
    const seatsUsed = manager ? members.length : undefined;
    res.json({
      organization: {
        id: membership.orgId,
        name: membership.orgName,
        plan: membership.orgPlan,
        status: membership.orgStatus,
        seatLimit: membership.seatLimit,
        seatsUsed,
      },
      me: { memberId: membership.memberId, role: membership.role, canManage: manager },
      // Members see who is in the organization; owners and admins also see
      // pending invites.
      members,
    });
  } catch (err) {
    console.error("Get org error:", err);
    res.status(500).json({ error: "Failed to load organization" });
  }
});

router.post("/org/invites", async (req: Request, res: Response) => {
  try {
    const membership = await requireMembership(req, res);
    if (!membership) return;
    if (membership.orgStatus !== "active") {
      res.status(403).json({ error: "This organization is suspended" });
      return;
    }
    const { email, role } = (req.body ?? {}) as { email?: unknown; role?: unknown };
    const outcome = await createInvite({
      orgId: membership.orgId,
      actorRole: membership.role,
      actorUserId: req.user!.id,
      email,
      role,
    });
    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.status(201).json({
      member: { id: outcome.memberId, email: outcome.email, role: outcome.role, status: "invited" },
      invitePath: invitePath(outcome.token),
    });
  } catch (err) {
    console.error("Create org invite error:", err);
    res.status(500).json({ error: "Failed to create invite" });
  }
});

// Issues a fresh link for a pending invite (the old one stops working), for
// when the first link was lost.
router.post("/org/members/:memberId/invite-link", async (req: Request, res: Response) => {
  try {
    const membership = await requireMembership(req, res);
    if (!membership) return;
    if (!canManage(membership.role)) {
      res.status(403).json({ error: "Only organization owners and admins can manage invites" });
      return;
    }
    const memberId = String(req.params.memberId);
    const [target] = await db
      .select()
      .from(organizationMembersTable)
      .where(and(eq(organizationMembersTable.id, memberId), eq(organizationMembersTable.orgId, membership.orgId)));
    if (!target || target.status !== "invited") {
      res.status(404).json({ error: "Pending invite not found" });
      return;
    }
    if (target.role === "owner" && membership.role !== "owner") {
      res.status(403).json({ error: "Only owners can manage an owner invite" });
      return;
    }
    const { token, hash } = generateInviteToken();
    await db
      .update(organizationMembersTable)
      .set({ inviteTokenHash: hash, invitedAt: new Date(), invitedBy: req.user!.id })
      .where(eq(organizationMembersTable.id, target.id));
    res.json({ invitePath: invitePath(token) });
  } catch (err) {
    console.error("Refresh org invite error:", err);
    res.status(500).json({ error: "Failed to create a new invite link" });
  }
});

router.patch("/org/members/:memberId", async (req: Request, res: Response) => {
  try {
    const membership = await requireMembership(req, res);
    if (!membership) return;
    const memberId = String(req.params.memberId);
    const role = (req.body ?? {}).role as unknown;
    const outcome = await db.transaction(async (tx) => {
      await lockOrg(tx, membership.orgId);
      const [target] = await tx
        .select()
        .from(organizationMembersTable)
        .where(and(eq(organizationMembersTable.id, memberId), eq(organizationMembersTable.orgId, membership.orgId)));
      const activeOwnerCount = await countActiveOwners(tx, membership.orgId);
      const check = validateRoleChange({
        actorRole: membership.role,
        actorUserId: req.user!.id,
        target,
        role,
        activeOwnerCount,
      });
      if (!check.ok) return check;
      await tx
        .update(organizationMembersTable)
        .set({ role: role as "owner" | "admin" | "member" })
        .where(eq(organizationMembersTable.id, memberId));
      return { ok: true } as const;
    });
    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Change org role error:", err);
    res.status(500).json({ error: "Failed to change role" });
  }
});

// Removes a member or cancels an invite. Members may remove themselves
// (leave), except the last owner.
router.delete("/org/members/:memberId", async (req: Request, res: Response) => {
  try {
    const membership = await requireMembership(req, res);
    if (!membership) return;
    const memberId = String(req.params.memberId);
    const outcome = await db.transaction(async (tx) => {
      await lockOrg(tx, membership.orgId);
      const [target] = await tx
        .select()
        .from(organizationMembersTable)
        .where(and(eq(organizationMembersTable.id, memberId), eq(organizationMembersTable.orgId, membership.orgId)));
      const activeOwnerCount = await countActiveOwners(tx, membership.orgId);
      const check = validateRemoval({
        actorRole: membership.role,
        actorUserId: req.user!.id,
        target,
        activeOwnerCount,
      });
      if (!check.ok) return check;
      await tx
        .update(organizationMembersTable)
        .set({ status: "removed", removedAt: new Date(), inviteTokenHash: null })
        .where(eq(organizationMembersTable.id, memberId));
      return { ok: true } as const;
    });
    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Remove org member error:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// Firewall activity per person since they joined: how many checks ran, how
// many warnings they saw, and what they did about them. Never prompt text.
router.get("/org/activity", async (req: Request, res: Response) => {
  try {
    const membership = await requireMembership(req, res);
    if (!membership) return;
    if (!canManage(membership.role)) {
      res.status(403).json({ error: "Only organization owners and admins can see activity" });
      return;
    }
    const rawDays = Number(req.query.days);
    const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 365 ? rawDays : 30;
    const result = await db.execute(sql`
      SELECT fo.user_id AS "userId", fo.level, fo.action,
             count(*)::int AS count, max(fo.created_at) AS "lastAt"
      FROM firewall_outcomes fo
      JOIN organization_members m
        ON m.user_id = fo.user_id AND m.org_id = ${membership.orgId} AND m.status = 'active'
      WHERE fo.created_at >= GREATEST(m.joined_at, NOW() - make_interval(days => ${days}))
      GROUP BY fo.user_id, fo.level, fo.action
    `);
    const summaries = summarizeActivity(result.rows as unknown as ActivityRow[]);
    const members = await listMembers(membership.orgId, false);
    res.json({
      days,
      members: members.map((m) => {
        const s = m.userId ? summaries.get(m.userId) : undefined;
        return {
          memberId: m.id,
          email: m.email,
          name: m.name,
          role: m.role,
          checks: s?.checks ?? 0,
          warnings: s?.warnings ?? 0,
          protected: s?.protected ?? 0,
          sentAnyway: s?.sentAnyway ?? 0,
          lastActivityAt: s?.lastActivityAt ?? null,
        };
      }),
    });
  } catch (err) {
    console.error("Org activity error:", err);
    res.status(500).json({ error: "Failed to load activity" });
  }
});

// ---------------------------------------------------------------------------
// Invites: preview (public) and accept
// ---------------------------------------------------------------------------

async function findInvite(token: unknown) {
  if (typeof token !== "string" || token.length < 16 || token.length > 200) return null;
  const [row] = await db
    .select({
      id: organizationMembersTable.id,
      orgId: organizationMembersTable.orgId,
      email: organizationMembersTable.email,
      role: organizationMembersTable.role,
      status: organizationMembersTable.status,
      orgName: organizationsTable.name,
      orgPlan: organizationsTable.plan,
      orgStatus: organizationsTable.status,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.orgId))
    .where(eq(organizationMembersTable.inviteTokenHash, hashInviteToken(token)));
  return row ?? null;
}

// Public so the join page can say who the invite is from before sign-in.
// Only someone holding the token can call it usefully.
router.get("/org/invite-preview", async (req: Request, res: Response) => {
  try {
    const invite = await findInvite(req.query.token);
    if (!invite || invite.status !== "invited") {
      res.status(404).json({ error: "This invite link is not valid. Ask your admin for a new one." });
      return;
    }
    res.json({
      organization: { name: invite.orgName, plan: invite.orgPlan, active: invite.orgStatus === "active" },
      email: invite.email,
      role: invite.role,
    });
  } catch (err) {
    console.error("Org invite preview error:", err);
    res.status(500).json({ error: "Failed to load invite" });
  }
});

router.post("/org/join", async (req: Request, res: Response) => {
  try {
    if (!requireSignedIn(req, res)) return;
    const token = (req.body ?? {}).token as unknown;
    const invite = await findInvite(token);
    const [user] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id));
    const current = await getActiveMembership(req.user.id);
    const check = validateAcceptance({
      invite,
      org: invite ? { status: invite.orgStatus } : null,
      userEmail: user?.email ?? null,
      otherActiveOrgId: current?.orgId ?? null,
    });
    if (!check.ok) {
      res.status(check.status).json({ error: check.error });
      return;
    }
    // Already active in this same organization (e.g. an owner who was also
    // sent a member invite): consume the invite without a second row.
    if (current && current.orgId === invite!.orgId) {
      await db
        .update(organizationMembersTable)
        .set({ status: "removed", removedAt: new Date(), inviteTokenHash: null })
        .where(eq(organizationMembersTable.id, invite!.id));
      res.json({ ok: true, organization: { id: invite!.orgId, name: invite!.orgName, plan: invite!.orgPlan } });
      return;
    }
    const [updated] = await db
      .update(organizationMembersTable)
      .set({ status: "active", userId: req.user.id, joinedAt: new Date(), inviteTokenHash: null })
      .where(and(eq(organizationMembersTable.id, invite!.id), eq(organizationMembersTable.status, "invited")))
      .returning({ id: organizationMembersTable.id });
    if (!updated) {
      res.status(409).json({ error: "This invite has already been used." });
      return;
    }
    res.json({ ok: true, organization: { id: invite!.orgId, name: invite!.orgName, plan: invite!.orgPlan } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "You already belong to another organization. Leave it before joining this one." });
      return;
    }
    console.error("Org join error:", err);
    res.status(500).json({ error: "Failed to join organization" });
  }
});

// ---------------------------------------------------------------------------
// Platform admins
// ---------------------------------------------------------------------------

router.get("/admin/orgs", async (req: Request, res: Response) => {
  try {
    if (!requirePlatformAdmin(req, res)) return;
    const rows = await db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        plan: organizationsTable.plan,
        seatLimit: organizationsTable.seatLimit,
        status: organizationsTable.status,
        createdAt: organizationsTable.createdAt,
        activeMembers: sql<number>`count(*) FILTER (WHERE ${organizationMembersTable.status} = 'active')::int`,
        pendingInvites: sql<number>`count(*) FILTER (WHERE ${organizationMembersTable.status} = 'invited')::int`,
      })
      .from(organizationsTable)
      .leftJoin(organizationMembersTable, eq(organizationMembersTable.orgId, organizationsTable.id))
      .groupBy(organizationsTable.id)
      .orderBy(desc(organizationsTable.createdAt));
    res.json({
      organizations: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      limits: { minSeats: MIN_SEATS, maxSeats: MAX_SEATS, maxNameLength: MAX_ORG_NAME_LENGTH, plans: [...ORG_PLANS] },
    });
  } catch (err) {
    console.error("Admin list orgs error:", err);
    res.status(500).json({ error: "Failed to list organizations" });
  }
});

// Creates an organization and an owner invite for `ownerEmail`.
router.post("/admin/orgs", async (req: Request, res: Response) => {
  try {
    if (!requirePlatformAdmin(req, res)) return;
    const body = (req.body ?? {}) as { name?: unknown; plan?: unknown; seatLimit?: unknown; ownerEmail?: unknown };
    const input = validateOrgInput({ name: body.name, plan: body.plan, seatLimit: body.seatLimit });
    if (!input.ok) {
      res.status(400).json({ error: input.error });
      return;
    }
    const ownerEmail = normalizeEmail(body.ownerEmail);
    if (!ownerEmail) {
      res.status(400).json({ error: "A valid owner email is required" });
      return;
    }
    const { token, hash } = generateInviteToken();
    const org = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(organizationsTable)
        .values({ ...input.value, createdBy: req.user!.id })
        .returning();
      await tx.insert(organizationMembersTable).values({
        orgId: created.id,
        email: ownerEmail,
        role: "owner",
        status: "invited",
        inviteTokenHash: hash,
        invitedBy: req.user!.id,
      });
      return created;
    });
    res.status(201).json({
      organization: { ...org, createdAt: org.createdAt.toISOString(), updatedAt: org.updatedAt.toISOString() },
      owner: { email: ownerEmail, status: "invited" },
      invitePath: invitePath(token),
    });
  } catch (err) {
    console.error("Admin create org error:", err);
    res.status(500).json({ error: "Failed to create organization" });
  }
});

router.patch("/admin/orgs/:id", async (req: Request, res: Response) => {
  try {
    if (!requirePlatformAdmin(req, res)) return;
    const id = String(req.params.id);
    const [existing] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    const body = (req.body ?? {}) as { name?: unknown; plan?: unknown; seatLimit?: unknown; status?: unknown };
    const input = validateOrgInput({
      name: body.name ?? existing.name,
      plan: body.plan ?? existing.plan,
      seatLimit: body.seatLimit ?? existing.seatLimit,
    });
    if (!input.ok) {
      res.status(400).json({ error: input.error });
      return;
    }
    const status = body.status ?? existing.status;
    if (status !== "active" && status !== "suspended") {
      res.status(400).json({ error: "status must be active or suspended" });
      return;
    }
    const [updated] = await db
      .update(organizationsTable)
      .set({ ...input.value, status })
      .where(eq(organizationsTable.id, id))
      .returning();
    res.json({
      organization: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() },
    });
  } catch (err) {
    console.error("Admin update org error:", err);
    res.status(500).json({ error: "Failed to update organization" });
  }
});

router.get("/admin/orgs/:id/members", async (req: Request, res: Response) => {
  try {
    if (!requirePlatformAdmin(req, res)) return;
    const id = String(req.params.id);
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, id));
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    res.json({ members: await listMembers(id, true) });
  } catch (err) {
    console.error("Admin org members error:", err);
    res.status(500).json({ error: "Failed to list members" });
  }
});

// Lets a platform admin add anyone (e.g. a replacement owner) to any org.
router.post("/admin/orgs/:id/invites", async (req: Request, res: Response) => {
  try {
    if (!requirePlatformAdmin(req, res)) return;
    const { email, role } = (req.body ?? {}) as { email?: unknown; role?: unknown };
    const outcome = await createInvite({
      orgId: String(req.params.id),
      actorRole: "owner",
      actorUserId: req.user!.id,
      email,
      role,
    });
    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.status(201).json({
      member: { id: outcome.memberId, email: outcome.email, role: outcome.role, status: "invited" },
      invitePath: invitePath(outcome.token),
    });
  } catch (err) {
    console.error("Admin org invite error:", err);
    res.status(500).json({ error: "Failed to create invite" });
  }
});

export default router;
