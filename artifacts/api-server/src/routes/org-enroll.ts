import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { apiKeysTable, db, organizationMembersTable, organizationsTable, usersTable } from "@workspace/db";
import { getActiveMembership } from "../lib/org";
import { canManage } from "../lib/org/org-source.mjs";
import { generateApiKey } from "../middlewares/apiKeyMiddleware";
import { ipBurstLimit } from "../middlewares/burstLimitMiddleware";
import { logger } from "../lib/logger";
import {
  ENROLL_CLIENTS,
  MAX_MANAGED_KEYS_PER_USER,
  buildPolicySnippets,
  decideEnrollment,
  generateEnrollmentToken,
  hashEnrollmentToken,
  looksLikeEnrollmentToken,
  parseAllowedDomains,
  splitStoredDomains,
} from "../lib/org/enroll-source.mjs";

// Managed rollout. Owners/admins set the organization's email domains and
// make an enrollment token, which IT puts in Chrome and Android policy.
// Devices then call POST /org/enroll:
//   - signed in (Android app, website): the person joins the organization;
//   - not signed in (managed Chrome): the work email is enrolled and the
//     browser gets a managed key that can only run firewall checks.

const router: IRouter = Router();

const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID || "hckhbadbpkihjpooeljdocgidelcampp";
const ANDROID_PACKAGE = "com.eraseai.firewall";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code || (err as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

async function requireManager(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const membership = await getActiveMembership(req.user.id);
  if (!membership || !canManage(membership.role)) {
    res.status(403).json({ error: "Only organization owners and admins can set up managed rollout" });
    return null;
  }
  return membership;
}

router.get("/org/deployment", async (req: Request, res: Response) => {
  try {
    const membership = await requireManager(req, res);
    if (!membership) return;
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, membership.orgId));
    const [{ n }] = (
      await db.execute(sql`
        SELECT count(DISTINCT k.user_id)::int AS n
        FROM api_keys k
        JOIN organization_members m ON m.user_id = k.user_id AND m.org_id = ${membership.orgId} AND m.status = 'active'
        WHERE k.scope = 'managed' AND k.revoked_at IS NULL
      `)
    ).rows as { n: number }[];
    res.json({
      allowedDomains: splitStoredDomains(org?.allowedDomains),
      hasToken: Boolean(org?.enrollmentTokenHash),
      tokenPrefix: org?.enrollmentTokenPrefix ?? null,
      managedBrowsers: n,
      chromeExtensionId: CHROME_EXTENSION_ID,
      androidPackage: ANDROID_PACKAGE,
    });
  } catch (err) {
    console.error("Org deployment error:", err);
    res.status(500).json({ error: "Failed to load managed rollout settings" });
  }
});

router.put("/org/deployment/domains", async (req: Request, res: Response) => {
  try {
    const membership = await requireManager(req, res);
    if (!membership) return;
    const parsed = parseAllowedDomains((req.body ?? {}).domains);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    await db
      .update(organizationsTable)
      .set({ allowedDomains: parsed.domains.length ? parsed.domains.join(",") : null })
      .where(eq(organizationsTable.id, membership.orgId));
    res.json({ allowedDomains: parsed.domains });
  } catch (err) {
    console.error("Org domains error:", err);
    res.status(500).json({ error: "Failed to save domains" });
  }
});

// Makes a new token (the old one stops working) and returns it once, with
// policy ready to paste into Google Admin / Intune / the EMM.
router.post("/org/deployment/token", async (req: Request, res: Response) => {
  try {
    const membership = await requireManager(req, res);
    if (!membership) return;
    const { token, hash, prefix } = generateEnrollmentToken();
    await db
      .update(organizationsTable)
      .set({ enrollmentTokenHash: hash, enrollmentTokenPrefix: prefix })
      .where(eq(organizationsTable.id, membership.orgId));
    res.json({
      token,
      tokenPrefix: prefix,
      ...buildPolicySnippets({ token, chromeExtensionId: CHROME_EXTENSION_ID, androidPackage: ANDROID_PACKAGE }),
    });
  } catch (err) {
    console.error("Org token error:", err);
    res.status(500).json({ error: "Failed to create enrollment token" });
  }
});

router.delete("/org/deployment/token", async (req: Request, res: Response) => {
  try {
    const membership = await requireManager(req, res);
    if (!membership) return;
    await db
      .update(organizationsTable)
      .set({ enrollmentTokenHash: null, enrollmentTokenPrefix: null })
      .where(eq(organizationsTable.id, membership.orgId));
    res.json({ ok: true });
  } catch (err) {
    console.error("Org token revoke error:", err);
    res.status(500).json({ error: "Failed to turn off enrollment" });
  }
});

// Joins `userId` (or the person with `email`) to the org, inside a
// transaction holding the org row lock so seats can't be oversold.
async function joinOrg(tx: Tx, orgId: string, userId: string, email: string, action: "already" | "activate" | "create") {
  if (action === "already") return;
  if (action === "activate") {
    await tx
      .update(organizationMembersTable)
      .set({ status: "active", userId, joinedAt: new Date(), inviteTokenHash: null })
      .where(
        and(
          eq(organizationMembersTable.orgId, orgId),
          eq(organizationMembersTable.email, email),
          eq(organizationMembersTable.status, "invited"),
        ),
      );
    return;
  }
  await tx.insert(organizationMembersTable).values({
    orgId,
    userId,
    email,
    role: "member",
    status: "active",
    joinedAt: new Date(),
  });
}

router.post("/org/enroll", ipBurstLimit(), async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { token?: unknown; email?: unknown; client?: unknown };
  const client = typeof body.client === "string" && ENROLL_CLIENTS.has(body.client) ? body.client : "chrome";
  if (!looksLikeEnrollmentToken(body.token)) {
    res.status(400).json({ error: "The enrollment token in your browser policy isn't valid. Ask your IT team." });
    return;
  }
  try {
    const [found] = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.enrollmentTokenHash, hashEnrollmentToken(body.token)));
    if (!found) {
      res.status(404).json({ error: "This enrollment token was turned off or replaced. Ask your IT team." });
      return;
    }

    // Signed in: the person proved their email, so use it.
    const signedInUserId = req.isAuthenticated() ? req.user.id : null;
    let email: unknown = body.email;
    if (signedInUserId) {
      const [u] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, signedInUserId));
      email = u?.email ?? null;
    }

    const outcome = await db.transaction(async (tx) => {
      const locked = await tx.execute(sql`
        SELECT id, name, status, seat_limit, allowed_domains FROM organizations WHERE id = ${found.id} FOR UPDATE
      `);
      const row = locked.rows[0] as { id: string; name: string; status: string; seat_limit: number; allowed_domains: string | null };
      const org = { id: row.id, status: row.status, seatLimit: Number(row.seat_limit), allowedDomains: splitStoredDomains(row.allowed_domains) };

      // Find (or, for managed Chrome, create) the person's account.
      const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
      let userId = signedInUserId;
      if (!userId && normalized) {
        const [existing] = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalized));
        userId = existing?.id ?? null;
      }
      const [active] = userId
        ? await tx
            .select({ orgId: organizationMembersTable.orgId })
            .from(organizationMembersTable)
            .where(and(eq(organizationMembersTable.userId, userId), eq(organizationMembersTable.status, "active")))
        : [];
      const [pendingInvite] = normalized
        ? await tx
            .select({ id: organizationMembersTable.id })
            .from(organizationMembersTable)
            .where(
              and(
                eq(organizationMembersTable.orgId, org.id),
                eq(organizationMembersTable.email, normalized),
                eq(organizationMembersTable.status, "invited"),
              ),
            )
        : [];
      const [{ n: seatsUsed }] = (
        await tx.execute(sql`
          SELECT count(*)::int AS n FROM organization_members WHERE org_id = ${org.id} AND status <> 'removed'
        `)
      ).rows as { n: number }[];

      const decision = decideEnrollment({
        org,
        email,
        activeOrgId: active?.orgId ?? null,
        pendingInvite: pendingInvite ?? null,
        seatsUsed,
      });
      if (!decision.ok) return decision;

      if (!userId) {
        const [created] = await tx
          .insert(usersTable)
          .values({ email: decision.email, authProvider: "managed", planType: "free", planStartDate: new Date() })
          .returning({ id: usersTable.id });
        userId = created.id;
      }
      await joinOrg(tx, org.id, userId, decision.email, decision.action);

      // Managed Chrome gets a check-only key; signed-in clients use their session.
      let apiKey: string | null = null;
      if (!signedInUserId) {
        const key = generateApiKey();
        await tx.insert(apiKeysTable).values({
          userId,
          keyHash: key.hash,
          keyPrefix: key.prefix,
          name: `Managed ${client === "chrome" ? "Chrome" : client}`,
          scope: "managed",
        });
        apiKey = key.raw;
        // Keep the newest few per person (reinstalls would otherwise pile up).
        const keys = await tx
          .select({ id: apiKeysTable.id })
          .from(apiKeysTable)
          .where(and(eq(apiKeysTable.userId, userId), eq(apiKeysTable.scope, "managed"), isNull(apiKeysTable.revokedAt)))
          .orderBy(asc(apiKeysTable.createdAt));
        const excess = keys.length - MAX_MANAGED_KEYS_PER_USER;
        if (excess > 0) {
          await tx
            .update(apiKeysTable)
            .set({ revokedAt: new Date() })
            .where(inArray(apiKeysTable.id, keys.slice(0, excess).map((k) => k.id)));
        }
      }
      return { ok: true as const, email: decision.email, orgName: row.name, apiKey };
    });

    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    logger.info({ orgId: found.id, client, signedIn: Boolean(signedInUserId) }, "Organization enrollment");
    res.json({
      ok: true,
      email: outcome.email,
      organization: { name: outcome.orgName },
      ...(outcome.apiKey ? { apiKey: outcome.apiKey } : {}),
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "This account was just enrolled from another device. Try again." });
      return;
    }
    console.error("Org enroll error:", err);
    res.status(500).json({ error: "Enrollment failed. Try again in a moment." });
  }
});

export default router;
