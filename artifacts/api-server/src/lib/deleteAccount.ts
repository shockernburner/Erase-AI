import bcrypt from "bcrypt";
import { eq, inArray, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  personalScansTable,
  personalAlertsTable,
  firewallOutcomesTable,
  datasetsTable,
  datasetVersionsTable,
  datasetRowsTable,
  datasetOperationsTable,
  analysisResultsTable,
  contactInquiriesTable,
  type User,
} from "@workspace/db";
import { isGooglePlaySubscription } from "./mobileEntitlement";
import { getUncachableStripeClient } from "./stripe";
import { logger } from "./logger";

export type DeleteAccountResult = {
  deleted: boolean;
  status: "deleted" | "queued" | "not_found";
  playSubscriptionReminder?: boolean;
};

async function cancelStripeIfNeeded(user: User): Promise<void> {
  if (!user.subscriptionId || isGooglePlaySubscription(user.subscriptionId)) {
    return;
  }
  try {
    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.cancel(user.subscriptionId);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== "resource_missing") {
      logger.warn({ err, userId: user.id }, "Stripe cancel during account deletion failed; continuing with delete");
    }
  }
}

async function purgeUserOwnedData(userId: string): Promise<void> {
  await db.delete(personalScansTable).where(eq(personalScansTable.userId, userId));
  await db.delete(personalAlertsTable).where(eq(personalAlertsTable.userId, userId));
  await db.delete(firewallOutcomesTable).where(eq(firewallOutcomesTable.userId, userId));

  await db.execute(sql`DELETE FROM mobile_protected_apps WHERE user_id = ${userId}`);
  await db.execute(sql`DELETE FROM dev_scans WHERE user_id = ${userId}`);

  const datasets = await db
    .select({ id: datasetsTable.id })
    .from(datasetsTable)
    .where(eq(datasetsTable.userId, userId));

  if (datasets.length > 0) {
    const datasetIds = datasets.map((d) => d.id);
    const versions = await db
      .select({ id: datasetVersionsTable.id })
      .from(datasetVersionsTable)
      .where(inArray(datasetVersionsTable.datasetId, datasetIds));
    const versionIds = versions.map((v) => v.id);

    if (versionIds.length > 0) {
      await db.delete(datasetRowsTable).where(inArray(datasetRowsTable.versionId, versionIds));
    }
    await db.delete(analysisResultsTable).where(inArray(analysisResultsTable.datasetId, datasetIds));
    await db.delete(datasetOperationsTable).where(inArray(datasetOperationsTable.datasetId, datasetIds));
    await db.delete(datasetVersionsTable).where(inArray(datasetVersionsTable.datasetId, datasetIds));
    await db.delete(datasetsTable).where(inArray(datasetsTable.id, datasetIds));
  }

  // api_keys, webhooks, feedback cascade from users FK
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}

export async function deleteUserAccount(user: User): Promise<DeleteAccountResult> {
  const playSubscriptionReminder = isGooglePlaySubscription(user.subscriptionId);
  await cancelStripeIfNeeded(user);
  await purgeUserOwnedData(user.id);
  return {
    deleted: true,
    status: "deleted",
    playSubscriptionReminder,
  };
}

export async function queueDeletionRequest(params: {
  email: string;
  name?: string;
  reason?: string;
  note: string;
}): Promise<void> {
  const messageParts = [
    params.note,
    params.reason?.trim() ? `Reason: ${params.reason.trim()}` : null,
  ].filter(Boolean);

  await db.insert(contactInquiriesTable).values({
    name: (params.name?.trim() || "Account deletion request").slice(0, 200),
    email: params.email.trim().toLowerCase(),
    subject: "[ACCOUNT DELETION] Request",
    message: messageParts.join("\n\n").slice(0, 5000),
  });
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const emailLower = email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower));
  return user;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function deleteAuthenticatedUser(userId: string): Promise<DeleteAccountResult> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    return { deleted: false, status: "not_found" };
  }
  return deleteUserAccount(user);
}

/** Prevent deleting the platform owner/admin via self-serve. */
export function isProtectedAccount(user: User): boolean {
  return user.role === "admin" || user.email === "firdous.mahmood26@gmail.com";
}

export async function processPublicDeletionRequest(input: {
  email: string;
  password?: string;
  reason?: string;
}): Promise<DeleteAccountResult & { message: string }> {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByEmail(email);

  // Always acknowledge to avoid account enumeration; queue when we can't verify.
  if (!user) {
    await queueDeletionRequest({
      email,
      reason: input.reason,
      note: "No matching account found at request time. Logged for review.",
    });
    return {
      deleted: false,
      status: "queued",
      message:
        "If an account exists for this email, we will process the deletion within 30 days. You will not receive further marketing from this account.",
    };
  }

  if (isProtectedAccount(user)) {
    await queueDeletionRequest({
      email,
      reason: input.reason,
      note: "Protected admin account — manual review required.",
    });
    return {
      deleted: false,
      status: "queued",
      message: "This account requires manual review. Our team will contact you within 30 days.",
    };
  }

  if (user.passwordHash) {
    if (!input.password) {
      return {
        deleted: false,
        status: "queued",
        message: "Password is required to delete this account immediately.",
      };
    }
    const ok = await verifyPassword(user, input.password);
    if (!ok) {
      return {
        deleted: false,
        status: "queued",
        message: "Incorrect password. Check your password and try again.",
      };
    }

    const result = await deleteUserAccount(user);
    await queueDeletionRequest({
      email,
      reason: input.reason,
      note: `Account ${user.id} deleted immediately via /deleteprofile.`,
    });

    return {
      ...result,
      message: result.playSubscriptionReminder
        ? "Your EraseAI account and associated data have been deleted. If you subscribed on Google Play, cancel the subscription in Google Play → Payments & subscriptions so you are not billed again."
        : "Your EraseAI account and associated data have been deleted.",
    };
  }

  // OAuth / passwordless — queue for verified manual deletion
  await queueDeletionRequest({
    email,
    reason: input.reason,
    note: `OAuth/passwordless account ${user.id} (${user.authProvider}). Verify identity before deleting.`,
  });

  return {
    deleted: false,
    status: "queued",
    message:
      "We received your deletion request. Because this account uses social login, we will verify and complete deletion within 30 days. You can also sign in on eraseai.ai and request deletion from a logged-in session once available.",
  };
}
