export const AUDIT_DEFAULT_DAYS: number;
export const AUDIT_MAX_DAYS: number;
export const AUDIT_DEFAULT_LIMIT: number;
export const AUDIT_MAX_LIMIT: number;

export interface AuditQuery {
  days: number;
  limit: number;
  level: "safe" | "caution" | "danger" | null;
  action: "auto-send" | "sanitize" | "cancel" | "send-anyway" | null;
  userId: string | null;
}

export interface AuditEvent {
  id: number;
  at: string | null;
  userId: string;
  email: string;
  name: string | null;
  level: string;
  action: string;
  actionLabel: string;
  riskScore: number | null;
  categories: string[];
}

export function actionLabel(action: unknown): string;
export function parseAuditQuery(query: unknown): AuditQuery;
export function shapeAuditEvents(
  rows: unknown,
  membersByUserId: Map<string, { email: string; name: string | null }>,
): AuditEvent[];
export function auditCsv(events: unknown): string;
