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
  isConfigured,
  getSdkEnv,
} from "../lib/airwallex";
import { toPlanType } from "../middlewares/planMiddleware";

const router: IRouter = Router();

type BillingPeriod = "monthly" | "annual";

interface PlanPricing {
  monthly: number;
  annual: number;
  currency: string;
}

const ANNUAL_DISCOUNT = 0.9;

function annualPrice(monthly: number): number {
  return Math.round(monthly * 12 * ANNUAL_DISCOUNT);
}

const PLAN_PRICING: Record<string, PlanPricing> = {
  personal: { monthly: 5, annual: annualPrice(5), currency: "USD" },
  pro: { monthly: 20, annual: annualPrice(20), currency: "USD" },
  business: { monthly: 99, annual: annualPrice(99), currency: "USD" },
};

function isValidBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "annual";
}

function priceFor(plan: string, period: BillingPeriod): number | null {
  const tier = PLAN_PRICING[plan];
  if (!tier) return null;
  return period === "annual" ? tier.annual : tier.monthly;
}

function extendEndDate(start: Date, period: BillingPeriod): Date {
  const monthsToAdd = period === "annual" ? 12 : 1;
  const originalDay = start.getDate();
  const target = new Date(start);
  target.setDate(1);
  target.setMonth(target.getMonth() + monthsToAdd);
  const lastDayOfTargetMonth = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  target.setHours(
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
    start.getMilliseconds(),
  );
  return target;
}

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
    annualDiscount: ANNUAL_DISCOUNT,
    tiers: [
      {
        id: "free",
        name: "Free",
        price: 0,
        monthlyPrice: 0,
        annualPrice: 0,
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
        price: PLAN_PRICING.personal.monthly,
        monthlyPrice: PLAN_PRICING.personal.monthly,
        annualPrice: PLAN_PRICING.personal.annual,
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
        price: PLAN_PRICING.pro.monthly,
        monthlyPrice: PLAN_PRICING.pro.monthly,
        annualPrice: PLAN_PRICING.pro.annual,
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
        price: PLAN_PRICING.business.monthly,
        monthlyPrice: PLAN_PRICING.business.monthly,
        annualPrice: PLAN_PRICING.business.annual,
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
        monthlyPrice: -1,
        annualPrice: -1,
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

  // Payments temporarily disabled — frontend shows a maintenance modal and
  // never reaches Airwallex. Server short-circuits as defense-in-depth so
  // direct API hits also return the same maintenance message.
  // The full checkout implementation is preserved in git history and can be
  // restored by reverting this change.
  res.status(503).json({
    error: "Payment integration is undergoing a maintenance, sorry for the inconvenience.",
    code: "PAYMENTS_MAINTENANCE",
  });
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

    const intent = await getPaymentIntent(intentId);

    const userId = intent.metadata?.user_id;
    if (userId !== req.user!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const VALID_CHECKOUT_PLANS = ["personal", "pro", "business"];
    const rawPlan = intent.metadata?.plan || "pro";
    const targetPlan = toPlanType(VALID_CHECKOUT_PLANS.includes(rawPlan) ? rawPlan : "pro");
    const rawPeriod = intent.metadata?.billing_period;
    const targetPeriod: BillingPeriod = isValidBillingPeriod(rawPeriod) ? rawPeriod : "monthly";

    if (intent.status === "SUCCEEDED") {
      const now = new Date();
      const endDate = extendEndDate(now, targetPeriod);

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
          (session.user as { planType: string }).planType = targetPlan;
          await updateSession(sid, session);
        }
      }

      res.json({ status: "succeeded", planType: targetPlan, billingPeriod: targetPeriod });
    } else if (intent.status === "REQUIRES_PAYMENT_METHOD" || intent.status === "REQUIRES_CUSTOMER_ACTION") {
      res.json({ status: "pending" });
    } else {
      res.json({ status: intent.status.toLowerCase() });
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
      (session.user as { planType: string }).planType = "free";
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
        const webhookPlan = toPlanType(VALID_PLANS.includes(rawWebhookPlan) ? rawWebhookPlan : "pro");
        const rawWebhookPeriod = intentData.metadata?.billing_period;
        const webhookPeriod: BillingPeriod = isValidBillingPeriod(rawWebhookPeriod) ? rawWebhookPeriod : "monthly";
        if ((user.planType === webhookPlan) && user.subscriptionStatus === "active" && user.subscriptionId === intentData.id) {
          break;
        }

        if (user.subscriptionId && user.subscriptionId !== intentData.id) {
          break;
        }

        const now = new Date();
        const endDate = extendEndDate(now, webhookPeriod);

        await db.update(usersTable).set({
          planType: webhookPlan,
          subscriptionStatus: "active",
          subscriptionId: intentData.id || null,
          planStartDate: now,
          planEndDate: endDate,
        }).where(eq(usersTable.id, userId));
        break;
      }
      case "payment_intent.cancelled": {
        if (user.subscriptionStatus === "pending" && (!user.subscriptionId || user.subscriptionId === intentData.id)) {
          await db.update(usersTable).set({
            subscriptionStatus: "failed",
          }).where(eq(usersTable.id, userId));
        }
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
