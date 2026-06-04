import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  getSessionId,
  getSession,
  updateSession,
} from "../lib/auth";
import { getUncachableStripeClient } from "../lib/stripe";
import { toPlanType } from "../middlewares/planMiddleware";
import { logger } from "../lib/logger";

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
  pro: { monthly: 19, annual: annualPrice(19), currency: "USD" },
  business: { monthly: 99, annual: annualPrice(99), currency: "USD" },
};

// Backend plan ids that map to a paid, self-serve Stripe checkout. `free`
// needs no checkout and `enterprise` is sales-assisted (Book Demo), so neither
// appears here.
const VALID_CHECKOUT_PLANS = ["personal", "pro", "business"] as const;

function isValidBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "annual";
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
        name: "Free",
        price: 0,
        monthlyPrice: 0,
        annualPrice: 0,
        currency: "USD",
        interval: "month",
        features: [
          "25 scans/month",
          "Browser firewall",
          "Basic PII detection",
          "Manual redaction",
          "No API access",
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

  const { plan, billingPeriod, returnUrl } = req.body as {
    plan?: unknown;
    billingPeriod?: unknown;
    returnUrl?: unknown;
  };

  if (typeof plan !== "string" || !(VALID_CHECKOUT_PLANS as readonly string[]).includes(plan)) {
    res.status(400).json({ error: "Invalid or non-checkoutable plan" });
    return;
  }
  const period: BillingPeriod = isValidBillingPeriod(billingPeriod) ? billingPeriod : "monthly";

  if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) {
    res.status(400).json({ error: "Missing or invalid returnUrl" });
    return;
  }

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

    const sep = returnUrl.includes("?") ? "&" : "?";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}${sep}checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}${sep}checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan, billing_period: period },
      subscription_data: {
        metadata: { user_id: user.id, plan, billing_period: period },
      },
    });

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

    if (session.metadata?.user_id !== req.user!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const rawPlan = session.metadata?.plan || "pro";
    const targetPlan = toPlanType(
      (VALID_CHECKOUT_PLANS as readonly string[]).includes(rawPlan) ? rawPlan : "pro",
    );
    const rawPeriod = session.metadata?.billing_period;
    const targetPeriod: BillingPeriod = isValidBillingPeriod(rawPeriod) ? rawPeriod : "monthly";

    const paid =
      session.status === "complete" &&
      (session.payment_status === "paid" || session.payment_status === "no_payment_required");

    if (paid) {
      const sub = session.subscription;
      let subscriptionId: string | null = null;
      let periodEnd: Date | null = null;
      if (typeof sub === "string") {
        subscriptionId = sub;
      } else if (sub) {
        const subObj = sub as { id: string; current_period_end?: number };
        subscriptionId = subObj.id;
        if (typeof subObj.current_period_end === "number") {
          periodEnd = new Date(subObj.current_period_end * 1000);
        }
      }

      const now = new Date();
      const endDate = periodEnd ?? extendEndDate(now, targetPeriod);
      const customerId =
        typeof session.customer === "string" ? session.customer : user.stripeCustomerId;

      await db.update(usersTable).set({
        planType: targetPlan,
        subscriptionId,
        stripeCustomerId: customerId,
        subscriptionStatus: "active",
        planStartDate: now,
        planEndDate: endDate,
      }).where(eq(usersTable.id, req.user!.id));

      const sid = getSessionId(req);
      if (sid) {
        const sessionRecord = await getSession(sid);
        if (sessionRecord) {
          (sessionRecord.user as { planType: string }).planType = targetPlan;
          await updateSession(sid, sessionRecord);
        }
      }

      res.json({ status: "succeeded", planType: targetPlan, billingPeriod: targetPeriod });
      return;
    }

    if (session.status === "expired") {
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

  // Best-effort cancel in Stripe. We still downgrade locally even if the Stripe
  // call fails (e.g. the subscription was already removed, or Stripe is down)
  // so the user is never stuck paying with no way to cancel from our UI.
  if (user.subscriptionId) {
    try {
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(user.subscriptionId);
    } catch (err) {
      logger.warn({ err, subscriptionId: user.subscriptionId }, "Stripe subscription cancel failed (non-fatal)");
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
