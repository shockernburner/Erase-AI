export const ACTIVE_STATUSES: Set<string>;
export const TERMINAL_STATUSES: Set<string>;

export interface SyncedSubscriptionRow {
  id: string;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: boolean | null;
  user_id: string | null;
  plan: string | null;
}

export interface ReconcileUpdate {
  userId: string;
  scope: "user" | "subscription";
  subscriptionId: string;
  fields: {
    planType?: string;
    subscriptionId?: string;
    subscriptionStatus?: string;
    planEndDateMs?: number;
  };
}

export function decideReconcileUpdates(
  rows: SyncedSubscriptionRow[],
  nowMs?: number,
): ReconcileUpdate[];
