import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  getSessionId,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

const PRO_PRICE_MONTHLY = 49;
const PRO_PRICE_CURRENCY = "USD";

interface CheckoutSession {
  id: string;
  userId: string;
  plan: string;
  status: "pending" | "completed" | "expired";
  createdAt: number;
}

const checkoutSessions = new Map<string, CheckoutSession>();

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
        currency: PRO_PRICE_CURRENCY,
        interval: "month",
        features: [
          "Basic dataset analysis",
          "Up to 100 rows per dataset",
          "PII & bias detection",
          "Data erasure & redaction",
          "Version history",
        ],
        limits: {
          maxRows: 100,
          mlFeedback: false,
          fullAnalysis: false,
          apiAccess: false,
          customRules: false,
        },
      },
      {
        id: "pro",
        name: "Pro",
        price: PRO_PRICE_MONTHLY,
        currency: PRO_PRICE_CURRENCY,
        interval: "month",
        features: [
          "Full dataset analysis",
          "Unlimited rows per dataset",
          "ML Pipeline Feedback",
          "Advanced PII detection",
          "Priority support",
          "Export recommendations",
        ],
        limits: {
          maxRows: -1,
          mlFeedback: true,
          fullAnalysis: true,
          apiAccess: false,
          customRules: false,
        },
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: -1,
        currency: PRO_PRICE_CURRENCY,
        interval: "month",
        features: [
          "Everything in Pro",
          "Custom analysis rules",
          "API access & webhooks",
          "SSO integration",
          "Dedicated support",
          "Custom data retention",
        ],
        limits: {
          maxRows: -1,
          mlFeedback: true,
          fullAnalysis: true,
          apiAccess: true,
          customRules: true,
        },
      },
    ],
  });
});

router.post("/checkout", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { plan } = req.body as { plan?: string };
  if (plan !== "pro") {
    res.status(400).json({ error: "Only 'pro' plan is available for self-serve checkout" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.planType === "pro" && user.subscriptionStatus === "active") {
    res.status(400).json({ error: "You already have an active Pro subscription" });
    return;
  }

  const sessionId = crypto.randomBytes(16).toString("hex");
  const checkout: CheckoutSession = {
    id: sessionId,
    userId: req.user!.id,
    plan: "pro",
    status: "pending",
    createdAt: Date.now(),
  };
  checkoutSessions.set(sessionId, checkout);

  res.json({
    checkoutSessionId: sessionId,
    provider: "airwallex",
    amount: PRO_PRICE_MONTHLY,
    currency: PRO_PRICE_CURRENCY,
    plan: "pro",
    status: "pending",
  });
});

router.post("/checkout/:sessionId/confirm", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const checkout = checkoutSessions.get(req.params.sessionId as string);
  if (!checkout) {
    res.status(404).json({ error: "Checkout session not found" });
    return;
  }

  if (checkout.userId !== req.user!.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (checkout.status !== "pending") {
    res.status(400).json({ error: "Checkout session already processed" });
    return;
  }

  checkout.status = "completed";
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  await db.update(usersTable).set({
    planType: "pro",
    subscriptionId: `sub_${checkout.id}`,
    subscriptionStatus: "active",
    planStartDate: now,
    planEndDate: endDate,
  }).where(eq(usersTable.id, req.user!.id));

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      session.user.planType = "pro";
      await updateSession(sid, session);
    }
  }

  res.json({
    success: true,
    plan: "pro",
    subscriptionId: `sub_${checkout.id}`,
    subscriptionStatus: "active",
    planStartDate: now.toISOString(),
    planEndDate: endDate.toISOString(),
  });
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

router.post("/webhook", async (req: Request, res: Response) => {
  const event = req.body as { type?: string; data?: Record<string, unknown> };

  if (!event.type || !event.data) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const userId = event.data.userId as string | undefined;
  if (!userId) {
    res.status(400).json({ error: "Missing userId in webhook data" });
    return;
  }

  switch (event.type) {
    case "subscription.activated": {
      await db.update(usersTable).set({
        planType: "pro",
        subscriptionStatus: "active",
        subscriptionId: (event.data.subscriptionId as string) || null,
        planStartDate: new Date(),
        planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).where(eq(usersTable.id, userId));
      break;
    }
    case "subscription.cancelled": {
      await db.update(usersTable).set({
        planType: "free",
        subscriptionStatus: "cancelled",
        planEndDate: new Date(),
      }).where(eq(usersTable.id, userId));
      break;
    }
    case "subscription.expired": {
      await db.update(usersTable).set({
        planType: "free",
        subscriptionStatus: "expired",
        planEndDate: new Date(),
      }).where(eq(usersTable.id, userId));
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

export default router;
