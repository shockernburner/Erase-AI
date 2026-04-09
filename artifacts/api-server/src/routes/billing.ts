import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  getSessionId,
  getSession,
  updateSession,
} from "../lib/auth";
import {
  createCheckoutSession,
  getPaymentIntent,
  getPaymentLink,
  isConfigured,
} from "../lib/airwallex";

const router: IRouter = Router();

const PLAN_PRICING: Record<string, { price: number; currency: string }> = {
  personal: { price: 5, currency: "USD" },
  pro: { price: 49, currency: "USD" },
  business: { price: 149, currency: "USD" },
};
const PERSONAL_PRICE_MONTHLY = 5;
const PRO_PRICE_MONTHLY = 49;
const PRO_PRICE_CURRENCY = "USD";
const BUSINESS_PRICE_MONTHLY = 149;

const WEBHOOK_SECRET = process.env.AIRWALLEX_WEBHOOK_SECRET || "";

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

router.get("/plan", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    planType: user.planType || "free",
    subscriptionId: user.subscriptionId,
    subscriptionStatus: user.subscriptionStatus,
    planStartDate: user.planStartDate?.toISOString() || null,
    planEndDate: user.planEndDate?.toISOString() || null,
  });
});

router.get("/pricing", (_req: Request, res: Response) => {
  res.json({
    tiers: [
      {
        id: "free",
        name: "Free",
        price: 0,
        currency: "USD",
        interval: "month",
        features: [
          "Basic dataset analysis",
          "Up to 100 rows per dataset",
          "PII & bias detection",
          "Data erasure & redaction",
          "Version history",
        ],
        limits: { maxRows: 100, mlFeedback: false, fullAnalysis: false, apiAccess: false, customRules: false },
      },
      {
        id: "personal",
        name: "EraseAI Personal",
        price: PERSONAL_PRICE_MONTHLY,
        currency: "USD",
        interval: "month",
        features: [
          "AI Firewall browser extension",
          "Unlimited personal text analyses",
          "AI-powered content rewriting",
          "Risk trend monitoring & alerts",
          "Full scan history",
        ],
        limits: { maxRows: 100, mlFeedback: false, fullAnalysis: false, apiAccess: false, customRules: false },
      },
      {
        id: "pro",
        name: "Pro",
        price: PRO_PRICE_MONTHLY,
        currency: "USD",
        interval: "month",
        features: [
          "Full dataset analysis",
          "Up to 1,000 rows per dataset",
          "ML Pipeline Feedback",
          "Advanced PII detection",
          "API access (5 keys)",
          "Priority support",
          "Export recommendations",
        ],
        limits: { maxRows: 1000, mlFeedback: true, fullAnalysis: true, apiAccess: true, customRules: false },
      },
      {
        id: "business",
        name: "Business",
        price: BUSINESS_PRICE_MONTHLY,
        currency: "USD",
        interval: "month",
        features: [
          "Everything in Pro",
          "Up to 10,000 rows per dataset",
          "API access (20 keys)",
          "Webhook integrations",
          "Advanced analytics dashboard",
          "Dedicated account manager",
        ],
        limits: { maxRows: 10000, mlFeedback: true, fullAnalysis: true, apiAccess: true, customRules: false },
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: -1,
        currency: "USD",
        interval: "month",
        features: [
          "Everything in Business",
          "Unlimited rows & API keys",
          "Custom analysis rules",
          "SSO integration",
          "Dedicated support & SLA",
          "Custom data retention",
        ],
        limits: { maxRows: -1, mlFeedback: true, fullAnalysis: true, apiAccess: true, customRules: true },
      },
    ],
  });
});

router.post("/checkout", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { plan, returnUrl } = req.body as { plan?: string; returnUrl?: string };
  const pricing = plan ? PLAN_PRICING[plan] : undefined;
  if (!plan || !pricing) {
    res.status(400).json({ error: "Only 'personal', 'pro', and 'business' plans are available for self-serve checkout" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.planType === plan && user.subscriptionStatus === "active") {
    res.status(400).json({ error: `You already have an active ${plan} subscription` });
    return;
  }

  if (!isConfigured()) {
    res.status(503).json({ error: "Payment provider is not configured" });
    return;
  }

  const rand = crypto.randomBytes(4).toString("hex");
  const merchantOrderId = `ea_${plan}_${Date.now()}_${rand}`;
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "";
  const origin = `${proto}://${host}`;
  let successUrl = `${origin}/`;
  if (returnUrl) {
    try {
      const parsed = new URL(returnUrl);
      if (parsed.host === host) {
        successUrl = returnUrl;
      }
    } catch {
    }
  }

  try {
    const result = await createCheckoutSession({
      amount: pricing.price,
      currency: pricing.currency,
      userId: req.user!.id,
      merchantOrderId,
      returnUrl: successUrl,
      plan,
    });

    await db.update(usersTable).set({
      subscriptionId: result.intentId,
      subscriptionStatus: "pending",
    }).where(eq(usersTable.id, req.user!.id));

    res.json({
      checkoutUrl: result.checkoutUrl,
      intentId: result.intentId,
      provider: "airwallex",
      amount: pricing.price,
      currency: pricing.currency,
      plan,
    });
  } catch (err) {
    console.error("Airwallex checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session. Please try again." });
  }
});

router.get("/checkout-status", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const intentId = req.query.intent_id as string | undefined;
  if (!intentId) {
    res.status(400).json({ error: "Missing intent_id parameter" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if ((user.planType === "personal" || user.planType === "pro" || user.planType === "business") && user.subscriptionStatus === "active" && user.subscriptionId === intentId) {
      res.json({ status: "succeeded", planType: user.planType });
      return;
    }

    if (user.subscriptionStatus !== "pending" || user.subscriptionId !== intentId) {
      res.status(403).json({ error: "No matching pending checkout for this intent" });
      return;
    }

    let resolvedStatus = "UNKNOWN";
    let metadata: Record<string, string> = {};

    const isPaymentLink = intentId.startsWith("plink_");
    if (isPaymentLink) {
      const link = await getPaymentLink(intentId);
      metadata = link.metadata || {};
      if (metadata.user_id && metadata.user_id !== req.user!.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      const paidIntent = link.payment_intents?.find(
        (pi) => pi.status === "SUCCEEDED",
      );
      resolvedStatus = paidIntent ? "SUCCEEDED" : link.status === "ACTIVE" ? "PENDING" : link.status;
    } else {
      const intent = await getPaymentIntent(intentId);
      const userId = intent.metadata?.user_id;
      if (userId !== req.user!.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      metadata = intent.metadata || {};
      resolvedStatus = intent.status;
    }

    const VALID_CHECKOUT_PLANS = ["personal", "pro", "business"];
    const rawPlan = metadata.plan || "pro";
    const targetPlan = VALID_CHECKOUT_PLANS.includes(rawPlan) ? rawPlan : "pro";

    if (resolvedStatus === "SUCCEEDED") {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      await db.update(usersTable).set({
        planType: targetPlan,
        subscriptionId: intentId,
        subscriptionStatus: "active",
        planStartDate: now,
        planEndDate: endDate,
      }).where(eq(usersTable.id, req.user!.id));

      const sid = getSessionId(req);
      if (sid) {
        const session = await getSession(sid);
        if (session) {
          session.user.planType = targetPlan as "free" | "personal" | "pro" | "business" | "enterprise";
          await updateSession(sid, session);
        }
      }

      res.json({ status: "succeeded", planType: targetPlan });
    } else if (resolvedStatus === "PENDING" || resolvedStatus === "REQUIRES_PAYMENT_METHOD" || resolvedStatus === "REQUIRES_CUSTOMER_ACTION" || resolvedStatus === "ACTIVE") {
      res.json({ status: "pending" });
    } else {
      res.json({ status: resolvedStatus.toLowerCase() });
    }
  } catch (err) {
    console.error("Checkout status check error:", err);
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

router.post("/cancel", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.planType === "free") {
    res.status(400).json({ error: "You are already on the free plan" });
    return;
  }

  await db.update(usersTable).set({
    planType: "free",
    subscriptionStatus: "cancelled",
    planEndDate: new Date(),
  }).where(eq(usersTable.id, req.user!.id));

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      session.user.planType = "free";
      await updateSession(sid, session);
    }
  }

  res.json({
    success: true,
    plan: "free",
    subscriptionStatus: "cancelled",
  });
});

function verifyWebhookSignature(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    return false;
  }

  const signature = req.headers["x-signature"] as string | undefined;
  const timestamp = req.headers["x-timestamp"] as string | undefined;

  if (!signature || !timestamp) {
    return false;
  }

  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (isNaN(age) || age > 300) {
    return false;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const bodyStr = rawBody ? rawBody.toString("utf-8") : JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}${bodyStr}`)
    .digest("hex");

  if (signature.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

router.post("/webhook", async (req: Request, res: Response) => {
  if (!verifyWebhookSignature(req)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.body as {
    name?: string;
    data?: {
      object?: {
        id?: string;
        status?: string;
        metadata?: Record<string, string>;
        merchant_order_id?: string;
      };
    };
  };

  if (!event.name || !event.data?.object) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const intentData = event.data.object;
  const userId = intentData.metadata?.user_id;

  if (!userId) {
    res.status(200).json({ received: true, skipped: "no user_id in metadata" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(200).json({ received: true, skipped: "user not found" });
    return;
  }

  try {
    switch (event.name) {
      case "payment_intent.succeeded": {
        const VALID_PLANS = ["personal", "pro", "business"];
        const rawWebhookPlan = intentData.metadata?.plan || "pro";
        const webhookPlan = VALID_PLANS.includes(rawWebhookPlan) ? rawWebhookPlan : "pro";
        if ((user.planType === webhookPlan) && user.subscriptionStatus === "active") {
          break;
        }

        if (user.subscriptionStatus !== "pending") {
          break;
        }

        const isCorrelated =
          !user.subscriptionId ||
          user.subscriptionId === intentData.id ||
          user.subscriptionId.startsWith("plink_");
        if (!isCorrelated) {
          break;
        }

        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);

        await db.update(usersTable).set({
          planType: webhookPlan,
          subscriptionStatus: "active",
          subscriptionId: user.subscriptionId || intentData.id || null,
          planStartDate: now,
          planEndDate: endDate,
        }).where(eq(usersTable.id, userId));
        break;
      }
      case "payment_intent.payment_failed":
      case "payment_intent.cancelled": {
        if (user.subscriptionStatus !== "pending") break;
        const failCorrelated =
          !user.subscriptionId ||
          user.subscriptionId === intentData.id;
        if (!failCorrelated) break;
        await db.update(usersTable).set({
          subscriptionStatus: "failed",
        }).where(eq(usersTable.id, userId));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
    return;
  }

  res.json({ received: true });
});

export default router;
