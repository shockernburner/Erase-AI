import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

// Organizations (Team / Enterprise). The organization pays, so everyone who
// is an active member of an active organization gets the organization's plan
// instead of their own `users.plan_type`. The effective plan is computed when
// the user is loaded (see artifacts/api-server/src/lib/org) rather than
// written into `users.plan_type`, which Stripe reconcile owns.
// Mirrored by idempotent SQL in artifacts/api-server/src/migrations.ts.
export const ORG_PLANS = ["business", "enterprise"] as const;
export type OrgPlan = (typeof ORG_PLANS)[number];
export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];
export const ORG_MEMBER_STATUSES = ["invited", "active", "removed"] as const;
export type OrgMemberStatus = (typeof ORG_MEMBER_STATUSES)[number];

export const organizationsTable = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 120 }).notNull(),
  plan: varchar("plan", { length: 20 }).$type<OrgPlan>().notNull().default("business"),
  seatLimit: integer("seat_limit").notNull().default(10),
  status: varchar("status", { length: 20 }).$type<"active" | "suspended">().notNull().default("active"),
  createdBy: varchar("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  check("organizations_plan_valid", sql`${table.plan} IN ('business', 'enterprise')`),
  check("organizations_status_valid", sql`${table.status} IN ('active', 'suspended')`),
  check("organizations_seat_limit_positive", sql`${table.seatLimit} >= 1`),
]);

export type Organization = typeof organizationsTable.$inferSelect;

export const organizationMembersTable = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  // NULL until the invite is accepted.
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  // Always stored lowercased; the accepting user's email must match.
  email: varchar("email", { length: 320 }).notNull(),
  role: varchar("role", { length: 20 }).$type<OrgRole>().notNull().default("member"),
  status: varchar("status", { length: 20 }).$type<OrgMemberStatus>().notNull().default("invited"),
  // sha256 hex of the invite token; the raw token only ever lives in the link.
  inviteTokenHash: varchar("invite_token_hash", { length: 64 }),
  invitedBy: varchar("invited_by").references(() => usersTable.id, { onDelete: "set null" }),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
}, (table) => [
  check("organization_members_role_valid", sql`${table.role} IN ('owner', 'admin', 'member')`),
  check("organization_members_status_valid", sql`${table.status} IN ('invited', 'active', 'removed')`),
  index("idx_org_members_org").on(table.orgId),
  uniqueIndex("idx_org_members_invite_token").on(table.inviteTokenHash),
  // A user is active in at most one organization.
  uniqueIndex("idx_org_members_one_active_org").on(table.userId).where(sql`${table.status} = 'active'`),
  // One live (invited or active) row per email per organization.
  uniqueIndex("idx_org_members_live_email").on(table.orgId, table.email).where(sql`${table.status} <> 'removed'`),
]);

export type OrganizationMember = typeof organizationMembersTable.$inferSelect;
