import { and, eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../logger";
import {
  decideReconcileUpdates,
  type ReconcileUpdate,
  type SyncedSubscriptionRow,
} from "./reconcile-source.mjs";

// Reconcile users' plan state from the synced `stripe.subscriptions` table.
//
// `checkout-status` only promotes a user once, at the moment they return from
// Checkout. Renewals (which advance current_period_end), Stripe-side
// cancellations, and failed payments never come back through that path — they
// arrive as webhooks. This runs after every webhook so those lifecycle changes
// flow back into `users.*` automatically instead of relying on polling.
//
// We key off our own `metadata.user_id` (stamped on subscription_data at
// checkout) and bound the scan to subscriptions synced very recently, so the
// work stays proportional to what just changed rather than the whole table.
// The actual mapping decision lives in reconcile-source.mjs (pure + tested);
// here we only run the query and apply the resulting updates.
export async function reconcileRecentSubscriptions(): Promise<void> {
  const result = await db.execute(sql`
    SELECT id,
           status,
           current_period_end,
           cancel_at_period_end,
           metadata->>'user_id' AS user_id,
           metadata->>'plan' AS plan
    FROM stripe.subscriptions
    WHERE metadata->>'user_id' IS NOT NULL
      AND _last_synced_at > now() - interval '15 minutes'
  `);

  const rows = result.rows as unknown as SyncedSubscriptionRow[];
  const updates = decideReconcileUpdates(rows);

  for (const update of updates) {
    try {
      await applyUpdate(update);
    } catch (err) {
      logger.error(
        { err, userId: update.userId, subscriptionId: update.subscriptionId },
        "Subscription reconcile update failed",
      );
    }
  }
}

async function applyUpdate(update: ReconcileUpdate): Promise<void> {
  const { fields } = update;
  const set: Record<string, unknown> = {};
  if (fields.planType !== undefined) set.planType = fields.planType;
  if (fields.subscriptionId !== undefined) set.subscriptionId = fields.subscriptionId;
  if (fields.subscriptionStatus !== undefined) set.subscriptionStatus = fields.subscriptionStatus;
  if (fields.planEndDateMs !== undefined) set.planEndDate = new Date(fields.planEndDateMs);
  if (Object.keys(set).length === 0) return;

  // "user" scope = an authoritative active subscription that may adopt a new
  // subscription id. "subscription" scope only mutates the user when this is
  // still their recorded subscription, so a stale event can't clobber a newer
  // one.
  const where =
    update.scope === "user"
      ? eq(usersTable.id, update.userId)
      : and(
          eq(usersTable.id, update.userId),
          eq(usersTable.subscriptionId, update.subscriptionId),
        );

  await db.update(usersTable).set(set).where(where);
}
