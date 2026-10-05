import { Router, type IRouter, type Request, type Response } from "express";
import { db, organizationsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../lib/stripe";
import { logger } from "../lib/logger";
import { getActiveMembership } from "../lib/org";
import { applyTeamOrgFields, countSeatsInUse } from "../lib/billing/team";
import { createTeamVoucher, ensureCatalog } from "../lib/billing/stripe-setup";
import {
  TEAM_MAX_SEATS,
  TEAM_MIN_SEATS,
  TEAM_SEAT_CENTS,
  buildTeamCheckoutParams,
  readSubscriptionSeats,
  teamTotalCents,
  validateSeatChange,
  validateTeamCheckout,
  type BillingPeriod,
} from "../lib/billing/team-source.mjs";

// Self-serve Team: buy (creates the organization on payment, see
// /billing/checkout-status), change seats, and open Stripe's billing portal
// for invoices, card and cancellation.

const router: IRouter = Router();

function requireSignedIn(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

// The per-seat Team price for this period, matched on amount so an older flat
// Team price left active in Stripe is never picked.
async function findTeamPriceId(period: BillingPeriod): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT pr.id AS price_id
    FROM stripe.prices pr
    JOIN stripe.products p ON pr.product = p.id
    WHERE p.active = true
      AND pr.active = true
      AND p.metadata->>'plan' = 'business'
      AND pr.metadata->>'billing_period' = ${period}
      AND pr.unit_amount = ${TEAM_SEAT_CENTS[period]}
    LIMIT 1
  `);
  const row = result.rows[0] as { price_id?: string } | undefined;
  return row?.price_id ?? null;
}

router.post("/billing/team/checkout", async (req: Request, res: Response) => {
  if (!requireSignedIn(req, res)) return;
  const body = (req.body ?? {}) as { orgName?: unknown; seats?: unknown; billingPeriod?: unknown; returnUrl?: unknown };
  const validated = validateTeamCheckout({
    orgName: body.orgName,
    seats: typeof body.seats === "string" ? Number(body.seats) : body.seats,
    billingPeriod: body.billingPeriod,
    returnUrl: body.returnUrl,
  });
  if (!validated.ok) {
    res.status(validated.status).json({ error: validated.error });
    return;
  }
  const { name, seats, period } = validated.value;

  const membership = await getActiveMembership(req.user!.id).catch(() => null);
  if (membership) {
    res.status(409).json({
      error: `You're already in ${membership.orgName}. Leave it before starting a new team, or ask its owner to add seats.`,
    });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    const priceId = await findTeamPriceId(period);
    if (!priceId) {
      logger.error({ period }, "No per-seat Team price in Stripe");
      res.status(503).json({ error: "Team checkout is not available right now. Contact us and we'll set you up.", code: "PRICE_NOT_FOUND" });
      return;
    }
    const stripe = await getUncachableStripeClient();
    // A customer of its own for the team, so invoices carry the company name
    // and stay apart from any personal plan the buyer has.
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name,
      metadata: { kind: "team", owner_user_id: user.id },
    });
    const customerId = customer.id;
    const session = await stripe.checkout.sessions.create(
      buildTeamCheckoutParams({
        priceId,
        customerId,
        returnUrl: body.returnUrl as string,
        userId: user.id,
        orgName: name,
        seats,
        period,
      }),
    );
    res.json({ url: session.url, sessionId: session.id, totalCents: teamTotalCents(seats, period) });
  } catch (err) {
    logger.error({ err }, "Team checkout session creation failed");
    res.status(503).json({ error: "Payment system is temporarily unavailable. Please try again.", code: "STRIPE_UNAVAILABLE" });
  }
});

async function loadBillableOrg(req: Request, res: Response, ownerOnly: boolean) {
  if (!requireSignedIn(req, res)) return null;
  const membership = await getActiveMembership(req.user!.id);
  if (!membership) {
    res.status(404).json({ error: "You are not in an organization" });
    return null;
  }
  const allowed = ownerOnly ? membership.role === "owner" : membership.role === "owner" || membership.role === "admin";
  if (!allowed) {
    res.status(403).json({ error: ownerOnly ? "Only organization owners can manage billing" : "Only owners and admins can see billing" });
    return null;
  }
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, membership.orgId));
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return null;
  }
  return { org, role: membership.role };
}

router.get("/org/billing", async (req: Request, res: Response) => {
  try {
    const loaded = await loadBillableOrg(req, res, false);
    if (!loaded) return;
    const { org, role } = loaded;
    const seatsUsed = await countSeatsInUse(org.id);
    if (!org.stripeSubscriptionId) {
      res.json({ billedBy: "invoice", seats: org.seatLimit, seatsUsed, canManage: false });
      return;
    }
    const period = (org.billingPeriod === "annual" ? "annual" : "monthly") as BillingPeriod;
    res.json({
      billedBy: "stripe",
      seats: org.seatLimit,
      seatsUsed,
      minSeats: TEAM_MIN_SEATS,
      maxSeats: TEAM_MAX_SEATS,
      billingPeriod: period,
      seatPriceCents: TEAM_SEAT_CENTS[period],
      totalCents: teamTotalCents(org.seatLimit, period),
      subscriptionStatus: org.subscriptionStatus,
      currentPeriodEnd: org.currentPeriodEnd?.toISOString() ?? null,
      canManage: role === "owner",
    });
  } catch (err) {
    console.error("Org billing error:", err);
    res.status(500).json({ error: "Failed to load billing" });
  }
});

// Changes the paid seat count; Stripe prorates the difference on the next invoice.
router.patch("/org/billing/seats", async (req: Request, res: Response) => {
  try {
    const loaded = await loadBillableOrg(req, res, true);
    if (!loaded) return;
    const { org } = loaded;
    if (!org.stripeSubscriptionId) {
      res.status(400).json({ error: "This organization is billed by invoice. Contact us to change seats." });
      return;
    }
    const raw = (req.body ?? {}).seats;
    const seats = typeof raw === "string" ? Number(raw) : raw;
    const check = validateSeatChange({ seats, seatsUsed: await countSeatsInUse(org.id) });
    if (!check.ok) {
      res.status(check.status).json({ error: check.error });
      return;
    }
    if (seats === org.seatLimit) {
      res.json({ ok: true, seats });
      return;
    }
    const stripe = await getUncachableStripeClient();
    const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    const { itemId } = readSubscriptionSeats(sub);
    if (!itemId) {
      res.status(409).json({ error: "Couldn't find the subscription item to update. Contact us." });
      return;
    }
    const updated = await stripe.subscriptions.update(org.stripeSubscriptionId, {
      items: [{ id: itemId, quantity: seats as number }],
      proration_behavior: "create_prorations",
    });
    const after = readSubscriptionSeats(updated);
    await applyTeamOrgFields(org.id, {
      subscriptionStatus: updated.status,
      seatLimit: after.seats ?? (seats as number),
      ...(after.periodEndMs != null ? { currentPeriodEndMs: after.periodEndMs } : {}),
    });
    res.json({ ok: true, seats: after.seats ?? seats });
  } catch (err) {
    logger.error({ err }, "Team seat change failed");
    res.status(502).json({ error: "We couldn't change seats with our payment provider. Please try again." });
  }
});

// Stripe-hosted page for invoices, payment method and cancellation.
router.post("/org/billing/portal", async (req: Request, res: Response) => {
  try {
    const loaded = await loadBillableOrg(req, res, true);
    if (!loaded) return;
    const { org } = loaded;
    if (!org.stripeCustomerId) {
      res.status(400).json({ error: "This organization is billed by invoice. Contact us for invoices." });
      return;
    }
    const returnUrl = (req.body ?? {}).returnUrl;
    if (typeof returnUrl !== "string" || !/^https?:\/\//.test(returnUrl)) {
      res.status(400).json({ error: "Missing or invalid returnUrl" });
      return;
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: returnUrl });
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Billing portal session failed");
    res.status(502).json({ error: "Billing portal is unavailable right now. Please try again." });
  }
});

// --- Platform admin: Stripe setup on the live connection ---------------------

function requirePlatformAdmin(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.post("/admin/billing/setup-prices", async (req: Request, res: Response) => {
  if (!requirePlatformAdmin(req, res)) return;
  try {
    res.json({ ok: true, log: await ensureCatalog() });
  } catch (err) {
    logger.error({ err }, "Stripe catalog setup failed");
    res.status(502).json({ error: `Stripe setup failed: ${(err as Error).message}` });
  }
});

router.post("/admin/billing/team-voucher", async (req: Request, res: Response) => {
  if (!requirePlatformAdmin(req, res)) return;
  const body = (req.body ?? {}) as { code?: unknown; maxRedemptions?: unknown };
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{4,40}$/.test(code)) {
    res.status(400).json({ error: "Use 4 to 40 letters and digits, e.g. FOUNDERTEAM" });
    return;
  }
  const max = Number(body.maxRedemptions ?? 3);
  if (!Number.isInteger(max) || max < 1 || max > 100) {
    res.status(400).json({ error: "Uses must be 1 to 100" });
    return;
  }
  try {
    res.json({ ok: true, ...(await createTeamVoucher({ code, maxRedemptions: max })) });
  } catch (err) {
    logger.error({ err }, "Team voucher creation failed");
    res.status(502).json({ error: `Couldn't create the code: ${(err as Error).message}` });
  }
});

export default router;
