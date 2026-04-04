import { db, webhooksTable, webhookDeliveriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { URL } from "url";
import dns from "dns/promises";
import crypto from "crypto";

export type WebhookEvent = "dataset.analyzed" | "dataset.erased" | "dataset.failed";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
]);

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1" || ip === "::") return true;
  if (ip.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

export function isWebhookUrlSafe(urlStr: string): { safe: boolean; error?: string } {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { safe: false, error: "URL must use HTTP or HTTPS protocol" };
    }
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(hostname)) {
      return { safe: false, error: "Webhook URL cannot target localhost or internal services" };
    }
    if (isPrivateIp(hostname)) {
      return { safe: false, error: "Webhook URL cannot target private IP ranges" };
    }
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
      return { safe: false, error: "Webhook URL cannot target internal domains" };
    }
    return { safe: true };
  } catch {
    return { safe: false, error: "Invalid URL format" };
  }
}

export async function resolveAndValidateUrl(urlStr: string): Promise<{ safe: boolean; error?: string }> {
  const basicCheck = isWebhookUrlSafe(urlStr);
  if (!basicCheck.safe) return basicCheck;

  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const allAddresses = [...addresses, ...addresses6];

    if (allAddresses.length === 0) {
      return { safe: false, error: "Could not resolve webhook URL hostname" };
    }

    for (const addr of allAddresses) {
      if (isPrivateIp(addr)) {
        return { safe: false, error: "Webhook URL resolves to a private/internal IP address" };
      }
    }
    return { safe: true };
  } catch {
    return { safe: false, error: "Failed to validate webhook URL" };
  }
}

interface WebhookPayload {
  event: WebhookEvent;
  datasetId: number;
  datasetName: string;
  status: string;
  summary?: Record<string, unknown>;
  timestamp: string;
}

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

function computeSignature(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverWebhook(
  webhookId: string,
  webhookUrl: string,
  webhookSecret: string,
  event: WebhookEvent,
  payload: WebhookPayload,
  attempt: number,
): Promise<boolean> {
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const urlCheck = await resolveAndValidateUrl(webhookUrl);
    if (!urlCheck.safe) {
      responseBody = `SSRF blocked: ${urlCheck.error}`;
      await db.insert(webhookDeliveriesTable).values({
        webhookId, event, payload, responseStatus: null, responseBody, attempt, success: 0,
      }).catch(() => {});
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const bodyStr = JSON.stringify(payload);
    const signature = computeSignature(webhookSecret, bodyStr);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Signature": signature,
      },
      body: bodyStr,
      signal: controller.signal,
      redirect: "error",
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    responseBody = await res.text().catch(() => null);
    if (responseBody && responseBody.length > 2000) {
      responseBody = responseBody.slice(0, 2000);
    }
    success = res.status >= 200 && res.status < 300;
  } catch (err) {
    responseBody = err instanceof Error ? err.message : "Unknown error";
  }

  await db.insert(webhookDeliveriesTable).values({
    webhookId,
    event,
    payload,
    responseStatus,
    responseBody,
    attempt,
    success: success ? 1 : 0,
  }).catch((dbErr) => {
    console.error("Failed to log webhook delivery:", dbErr);
  });

  return success;
}

export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEvent,
  data: {
    datasetId: number;
    datasetName: string;
    status: string;
    summary?: Record<string, unknown>;
  },
): Promise<void> {
  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.userId, userId), eq(webhooksTable.isActive, 1)));

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    datasetId: data.datasetId,
    datasetName: data.datasetName,
    status: data.status,
    summary: data.summary,
    timestamp: new Date().toISOString(),
  };

  for (const webhook of webhooks) {
    (async () => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const success = await deliverWebhook(
          webhook.id,
          webhook.url,
          webhook.secret,
          event,
          payload,
          attempt,
        );
        if (success) break;
        if (attempt < MAX_RETRIES) {
          const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    })().catch((err) => {
      console.error("Webhook dispatch error:", err);
    });
  }
}

export async function sendTestWebhook(
  webhookId: string,
  webhookUrl: string,
  webhookSecret: string,
): Promise<{ success: boolean; status: number | null; body: string | null }> {
  const testPayload: WebhookPayload = {
    event: "dataset.analyzed",
    datasetId: 0,
    datasetName: "test-dataset.csv",
    status: "completed",
    summary: {
      issuesFound: 3,
      categories: ["pii", "bias", "duplicate"],
      message: "This is a test webhook delivery from EraseAI.",
    },
    timestamp: new Date().toISOString(),
  };

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const urlCheck = await resolveAndValidateUrl(webhookUrl);
    if (!urlCheck.safe) {
      responseBody = `SSRF blocked: ${urlCheck.error}`;
      await db.insert(webhookDeliveriesTable).values({
        webhookId, event: "dataset.analyzed", payload: testPayload, responseStatus: null, responseBody, attempt: 1, success: 0,
      }).catch(() => {});
      return { success: false, status: null, body: responseBody };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const bodyStr = JSON.stringify(testPayload);
    const signature = computeSignature(webhookSecret, bodyStr);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": "dataset.analyzed",
        "X-Webhook-Signature": signature,
      },
      body: bodyStr,
      signal: controller.signal,
      redirect: "error",
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    responseBody = await res.text().catch(() => null);
    if (responseBody && responseBody.length > 2000) {
      responseBody = responseBody.slice(0, 2000);
    }
    success = res.status >= 200 && res.status < 300;
  } catch (err) {
    responseBody = err instanceof Error ? err.message : "Unknown error";
  }

  await db.insert(webhookDeliveriesTable).values({
    webhookId,
    event: "dataset.analyzed",
    payload: testPayload,
    responseStatus,
    responseBody,
    attempt: 1,
    success: success ? 1 : 0,
  }).catch((dbErr) => {
    console.error("Failed to log test webhook delivery:", dbErr);
  });

  return { success, status: responseStatus, body: responseBody };
}
