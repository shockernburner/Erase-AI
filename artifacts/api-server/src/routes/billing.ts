import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  getSessionId,
  getSession,
  updateSession,
} from "../lib/auth";
import { getUncachableStripeClient } from "../lib/stripe";
import { logger } from "../lib/logger";
import {
  ANNUAL_DISCOUNT,
  PLAN_PRICING,
  buildCheckoutSessionParams,
  evaluateCheckoutStatus,
  validateCheckoutRequest,
  type BillingPeriod,
} from "../lib/billing/billing-source.mjs";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

// Resolve the Stripe price id for a (plan, billing period) pair by querying the
// synced `stripe.*` schema that stripe-replit-sync keeps up to date. Products
// are tagged with metadata.plan (personal|pro|business) and each price with
// metadata.billing_period (monthly|annual) by the seed-products script.
async function findPriceId(
  plan: string,
  period: BillingPeriod,
): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT pr.id AS price_id
    FROM stripe.prices pr
    JOIN stripe.products p ON pr.product = p.id
    WHERE p.active = true
      AND pr.active = true
      AND p.metadata->>'plan' = ${plan}
      AND pr.metadata->>'billing_period' = ${period}
    LIMIT 1
  `);
  const row = result.rows[0] as { price_id?: string } | undefined;
  return row?.price_id ?? null;
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
        name: "Free Trial",
        price: 0,
        monthlyPrice: 0,
        annualPrice: 0,
        currency: "USD",
        interval: "month",
        features: [
          "7 days full access",
          "25 free scans",
          "Browser firewall",
          "Basic PII detection",
          "Manual redaction",
          "No credit card required",
        ],
        limits: { maxRows: 100, mlFeedback: false, fullAnalysis: false, apiAccess: false, customRules: false },
      },
      {
        id: "personal",
        name: "Personal",
        price: PLAN_PRICING.personal.monthly,
        monthlyPrice: PLAN_PRICING.personal.monthly,
        annualPrice: PLAN_PRICING.personal.annual,
        currency: "USD",
        interval: "month",
        features: [
          "Browser firewall",
          "ChatGPT, Claude, Gemini protection",
          "PII, bank data, and API key detection",
          "Auto-redaction",
          "Local history",
          "Basic risk score",
        ],
        limits: { maxRows: 100, mlFeedback: false, fullAnalysis: false, apiAccess: false, customRules: false },
      },
      {
        id: "pro",
        name: "Developer",
        price: PLAN_PRICING.pro.monthly,
        monthlyPrice: PLAN_PRICING.pro.monthly,
        annualPrice: PLAN_PRICING.pro.annual,
        currency: "USD",
        interval: "month",
        features: [
          "Everything in Personal",
          "API access",
          "10,000 scans/month",
          "Input/output scanning",
          "API key and token detection",
          "Webhooks",
          "Basic logs",
          "SDK examples",
        ],
        limits: { maxRows: 1000, mlFeedback: true, fullAnalysis: true, apiAccess: true, customRules: false },
      },
      {
        id: "business",
        name: "Team",
        price: PLAN_PRICING.business.monthly,
        monthlyPrice: PLAN_PRICING.business.monthly,
        annualPrice: PLAN_PRICING.business.annual,
        currency: "USD",
        interval: "month",
        features: [
          "10 seats",
          "Browser firewall for team members",
          "Shared policies",
          "Admin dashboard",
          "Audit logs",
          "Export logs",
          "100,000 scans/month",
          "Priority support",
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

// Create a Stripe Checkout Session (subscription mode) and return its hosted
// URL. The frontend redirects the browser to it; Stripe sends the user back to
// `returnUrl?checkout=success&session_id=...` where CheckoutSuccess polls
// /checkout-status to activate the plan.
router.post("/checkout", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { plan: rawPlan, billingPeriod, returnUrl } = req.body as {
    plan?: unknown;
    billingPeriod?: unknown;
    returnUrl?: unknown;
  };

  const validated = validateCheckoutRequest({ plan: rawPlan, billingPeriod, returnUrl });
  if (!validated.ok) {
    res.status(validated.status).json({ error: validated.error });
    return;
  }
  const { plan, period } = validated;
  const safeReturnUrl = returnUrl as string;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    const priceId = await findPriceId(plan, period);
    if (!priceId) {
      logger.error({ plan, period }, "No Stripe price found for plan/period");
      res.status(503).json({
        error: "This plan is not available for checkout right now.",
        code: "PRICE_NOT_FOUND",
      });
      return;
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await db.update(usersTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(usersTable.id, user.id));
    }

    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams({
        priceId,
        customerId,
        returnUrl: safeReturnUrl,
        userId: user.id,
        plan,
        period,
      }),
    );

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    logger.error({ err }, "Stripe checkout session creation failed");
    res.status(503).json({
      error: "Payment system is temporarily unavailable. Please try again.",
      code: "STRIPE_UNAVAILABLE",
    });
  }
});

// Poll endpoint hit by CheckoutSuccess after the Stripe redirect. Retrieves the
// Checkout Session, verifies it belongs to the caller, and on a completed/paid
// session promotes the user to the purchased plan.
router.get("/checkout-status", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const sessionId = req.query.session_id as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: "Missing session_id parameter" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const now = new Date();
    const decision = evaluateCheckoutStatus(session, req.user!.id, now);

    if (decision.kind === "denied") {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (decision.kind === "succeeded") {
      const customerId = decision.customerId ?? user.stripeCustomerId;

      await db.update(usersTable).set({
        planType: decision.plan,
        subscriptionId: decision.subscriptionId,
        stripeCustomerId: customerId,
        subscriptionStatus: "active",
        planStartDate: now,
        planEndDate: decision.endDate,
      }).where(eq(usersTable.id, req.user!.id));

      const sid = getSessionId(req);
      if (sid) {
        const sessionRecord = await getSession(sid);
        if (sessionRecord) {
          (sessionRecord.user as { planType: string }).planType = decision.plan;
          await updateSession(sid, sessionRecord);
        }
      }

      res.json({ status: "succeeded", planType: decision.plan, billingPeriod: decision.period });
      return;
    }

    if (decision.kind === "expired") {
      res.json({ status: "expired" });
      return;
    }

    res.json({ status: "pending" });
  } catch (err) {
    logger.error({ err }, "Checkout status check failed");
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

  // Cancel in Stripe FIRST and only downgrade locally once Stripe confirms it.
  // Downgrading on a failed Stripe call would leave the user still billed in
  // Stripe while the app shows them as cancelled — a billing-integrity gap. If
  // the subscription is already gone in Stripe (`resource_missing`), that's the
  // desired end state, so we treat it as success and proceed.
  if (user.subscriptionId) {
    try {
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(user.subscriptionId);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "resource_missing") {
        logger.error({ err, subscriptionId: user.subscriptionId }, "Stripe subscription cancel failed");
        res.status(502).json({
          error: "We couldn't cancel your subscription with our payment provider. Please try again in a moment.",
          code: "STRIPE_CANCEL_FAILED",
        });
        return;
      }
      logger.warn(
        { subscriptionId: user.subscriptionId },
        "Subscription already absent in Stripe; downgrading locally",
      );
    }
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

export default router;
