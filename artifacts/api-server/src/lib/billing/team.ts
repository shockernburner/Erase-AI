import { and, eq, sql } from "drizzle-orm";
import { db, organizationMembersTable, organizationsTable, usersTable } from "@workspace/db";
import { logger } from "../logger";
import { decideTeamReconcile, type TeamOrgFields, type TeamSubscriptionRow } from "./team-source.mjs";

// Applies Team (self-serve organization) subscriptions to `organizations`.
// Both /billing/checkout-status (right after payment) and the Stripe webhook
// reconcile call ensureTeamOrg, so the organization exists whichever arrives
// first; the unique stripe_subscription_id makes it idempotent.

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code || (err as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

function orgSet(fields: TeamOrgFields) {
  const set: Partial<typeof organizationsTable.$inferInsert> = { subscriptionStatus: fields.subscriptionStatus };
  if (fields.status) set.status = fields.status;
  if (fields.seatLimit) set.seatLimit = fields.seatLimit;
  if (fields.currentPeriodEndMs != null) set.currentPeriodEnd = new Date(fields.currentPeriodEndMs);
  return set;
}

export interface TeamOrgInput {
  subscriptionId: string;
  customerId: string | null;
  ownerUserId: string;
  name: string;
  seats: number;
  period: "monthly" | "annual";
  subscriptionStatus: string;
  periodEndMs: number | null;
}

// Returns the organization id for this subscription, creating the
// organization (buyer as active owner) the first time.
export async function ensureTeamOrg(input: TeamOrgInput): Promise<string> {
  const [existing] = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.stripeSubscriptionId, input.subscriptionId));
  if (existing) return existing.id;

  const [owner] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, input.ownerUserId));
  if (!owner?.email) throw new Error(`Team owner ${input.ownerUserId} not found`);

  try {
    return await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizationsTable)
        .values({
          name: input.name,
          plan: "business",
          seatLimit: input.seats,
          status: "active",
          createdBy: input.ownerUserId,
          stripeCustomerId: input.customerId,
          stripeSubscriptionId: input.subscriptionId,
          subscriptionStatus: input.subscriptionStatus,
          billingPeriod: input.period,
          currentPeriodEnd: input.periodEndMs != null ? new Date(input.periodEndMs) : null,
        })
        .returning({ id: organizationsTable.id });
      // The buyer becomes the active owner, unless they are already active
      // in another organization (checkout refuses that, so only a race gets
      // here); then they're listed as a pending owner to sort out by hand.
      const [{ activeElsewhere }] = (
        await tx.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM organization_members WHERE user_id = ${input.ownerUserId} AND status = 'active'
          ) AS "activeElsewhere"
        `)
      ).rows as { activeElsewhere: boolean }[];
      await tx.insert(organizationMembersTable).values({
        orgId: org.id,
        userId: activeElsewhere ? null : input.ownerUserId,
        email: owner.email!.toLowerCase(),
        role: "owner",
        status: activeElsewhere ? "invited" : "active",
        invitedBy: input.ownerUserId,
        joinedAt: activeElsewhere ? null : new Date(),
      });
      if (activeElsewhere) {
        logger.warn({ orgId: org.id, userId: input.ownerUserId }, "Team buyer already active in another organization");
      }
      return org.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const [again] = await db
        .select({ id: organizationsTable.id })
        .from(organizationsTable)
        .where(eq(organizationsTable.stripeSubscriptionId, input.subscriptionId));
      if (again) return again.id;
    }
    throw err;
  }
}

// Runs after every Stripe webhook, next to the per-user reconcile: brings
// recently synced Team subscriptions' seats and status onto their
// organizations, and creates the organization if checkout-status never ran
// (e.g. the buyer closed the tab after paying).
export async function reconcileTeamSubscriptions(): Promise<void> {
  const result = await db.execute(sql`
    SELECT id,
           status,
           NULLIF(raw_data->'items'->'data'->0->>'quantity', '')::int AS quantity,
           metadata->>'owner_user_id' AS owner_user_id,
           metadata->>'org_name' AS org_name,
           metadata->>'billing_period' AS billing_period,
           COALESCE(
             (raw_data->>'current_period_end')::bigint,
             (raw_data->'items'->'data'->0->>'current_period_end')::bigint
           ) * 1000 AS current_period_end_ms,
           customer
    FROM stripe.subscriptions
    WHERE metadata->>'kind' = 'team'
      AND _last_synced_at > now() - interval '15 minutes'
  `);
  for (const raw of result.rows as Record<string, unknown>[]) {
    const row: TeamSubscriptionRow = {
      id: String(raw.id),
      status: String(raw.status),
      quantity: raw.quantity == null ? null : Number(raw.quantity),
      owner_user_id: (raw.owner_user_id as string) ?? null,
      org_name: (raw.org_name as string) ?? null,
      billing_period: (raw.billing_period as string) ?? null,
      current_period_end_ms: raw.current_period_end_ms == null ? null : Number(raw.current_period_end_ms),
    };
    try {
      const [org] = await db
        .select({ id: organizationsTable.id })
        .from(organizationsTable)
        .where(eq(organizationsTable.stripeSubscriptionId, row.id));
      const decision = decideTeamReconcile(row, org ?? null);
      if (decision.action === "update") {
        await db.update(organizationsTable).set(orgSet(decision.fields)).where(eq(organizationsTable.id, org!.id));
      } else if (decision.action === "create") {
        await ensureTeamOrg({
          subscriptionId: row.id,
          customerId: typeof raw.customer === "string" ? raw.customer : null,
          ownerUserId: decision.ownerUserId,
          name: decision.name,
          seats: decision.fields.seatLimit,
          period: decision.period,
          subscriptionStatus: row.status,
          periodEndMs: row.current_period_end_ms,
        });
      }
    } catch (err) {
      logger.error({ err, subscriptionId: row.id }, "Team subscription reconcile failed");
    }
  }
}

export async function applyTeamOrgFields(orgId: string, fields: TeamOrgFields): Promise<void> {
  await db.update(organizationsTable).set(orgSet(fields)).where(eq(organizationsTable.id, orgId));
}

export async function countSeatsInUse(orgId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(organizationMembersTable)
    .where(and(eq(organizationMembersTable.orgId, orgId), sql`${organizationMembersTable.status} <> 'removed'`));
  return row?.n ?? 0;
}
