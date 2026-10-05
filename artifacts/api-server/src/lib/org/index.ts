import { and, eq } from "drizzle-orm";
import { db, organizationMembersTable, organizationsTable, type PlanType } from "@workspace/db";
import { effectivePlan } from "./org-source.mjs";

export interface ActiveMembership {
  memberId: string;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  memberStatus: "active";
  orgStatus: "active" | "suspended";
  orgPlan: "business" | "enterprise";
  seatLimit: number;
}

// The user's active membership (at most one, enforced by a partial unique
// index), whatever the organization's own status.
export async function getActiveMembership(userId: string): Promise<ActiveMembership | null> {
  const [row] = await db
    .select({
      memberId: organizationMembersTable.id,
      orgId: organizationsTable.id,
      orgName: organizationsTable.name,
      role: organizationMembersTable.role,
      orgStatus: organizationsTable.status,
      orgPlan: organizationsTable.plan,
      seatLimit: organizationsTable.seatLimit,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.orgId))
    .where(and(eq(organizationMembersTable.userId, userId), eq(organizationMembersTable.status, "active")))
    .limit(1);
  return row ? { ...row, memberStatus: "active" } : null;
}

// Plan the user actually gets: the organization's plan when they are an
// active member of an active organization, otherwise their own. Fails open
// to the user's own plan if the lookup errors (e.g. tables not migrated yet).
export async function resolveEffectivePlan(userId: string, userPlan: PlanType | null | undefined): Promise<PlanType> {
  try {
    const membership = await getActiveMembership(userId);
    return effectivePlan(userPlan ?? "free", membership) as PlanType;
  } catch {
    return userPlan ?? "free";
  }
}

// Mutates a request/session user so `planType` reflects organization
// membership. Returns the same object for chaining.
export async function withOrgPlan<T extends { id: string; planType?: PlanType | null }>(user: T): Promise<T> {
  user.planType = await resolveEffectivePlan(user.id, user.planType);
  return user;
}
