export const ORG_PLANS: ReadonlySet<string>;
export const ORG_ROLES: ReadonlySet<string>;
export const MIN_SEATS: number;
export const MAX_SEATS: number;
export const MAX_ORG_NAME_LENGTH: number;

export type OrgRole = "owner" | "admin" | "member";
export type OrgPlan = "business" | "enterprise";

export function normalizeEmail(input: unknown): string | null;
export function generateInviteToken(): { token: string; hash: string };
export function hashInviteToken(token: string): string;

export interface MembershipForPlan {
  memberStatus: string;
  orgStatus: string;
  orgPlan: string;
}

export function effectivePlan<P extends string>(
  userPlan: P | null | undefined,
  membership: MembershipForPlan | null | undefined,
): P | OrgPlan | "free";

export function canManage(role: string | null | undefined): boolean;

export type RuleResult = { ok: true } | { ok: false; status: number; error: string };

export function validateOrgInput(input: {
  name: unknown;
  plan?: unknown;
  seatLimit?: unknown;
}):
  | { ok: true; value: { name: string; plan: OrgPlan; seatLimit: number } }
  | { ok: false; error: string };

export function validateInvite(input: {
  actorRole: string | null | undefined;
  role?: unknown;
  seatsUsed: number;
  seatLimit: number;
}): { ok: true; role: OrgRole } | { ok: false; status: number; error: string };

export interface MemberTarget {
  userId: string | null;
  role: string;
  status: string;
}

export function validateRemoval(input: {
  actorRole: string | null | undefined;
  actorUserId: string;
  target: MemberTarget | null | undefined;
  activeOwnerCount: number;
}): RuleResult;

export function validateRoleChange(input: {
  actorRole: string | null | undefined;
  actorUserId: string;
  target: MemberTarget | null | undefined;
  role: unknown;
  activeOwnerCount: number;
}): RuleResult;

export function validateAcceptance(input: {
  invite: { orgId: string; email: string; status: string } | null | undefined;
  org: { status: string } | null | undefined;
  userEmail: string | null | undefined;
  otherActiveOrgId: string | null | undefined;
}): RuleResult;

export interface ActivityRow {
  userId: string;
  level: string;
  action: string;
  count: number | string;
  lastAt: Date | string | null;
}

export interface ActivitySummary {
  userId: string;
  checks: number;
  warnings: number;
  protected: number;
  sentAnyway: number;
  lastActivityAt: string | null;
}

export function summarizeActivity(rows: ActivityRow[]): Map<string, ActivitySummary>;
