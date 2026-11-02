import type Stripe from "stripe";
import { getStripeSync, getUncachableStripeClient } from "../stripe";
import { logger } from "../logger";
import { PLAN_PRICING } from "./billing-source.mjs";

// Stripe catalog and voucher setup, run by a platform admin from the Admin
// dashboard so it uses the *live* server's Stripe connection. (Replit's Shell
// uses the development connection, so scripts/src/seed-products.ts run there
// only touches the test account.)

interface PlanSpec {
  plan: "personal" | "pro" | "business";
  name: string;
  description: string;
  monthly: number; // cents
  annual: number; // cents
}

const CATALOG: PlanSpec[] = [
  {
    plan: "personal",
    name: "EraseAI Personal",
    description: "Browser firewall and auto-redaction for individuals.",
    monthly: PLAN_PRICING.personal.monthly * 100,
    annual: PLAN_PRICING.personal.annual * 100,
  },
  {
    plan: "pro",
    name: "EraseAI Pro",
    description: "API access, input/output scanning, and webhooks for builders.",
    monthly: PLAN_PRICING.pro.monthly * 100,
    annual: PLAN_PRICING.pro.annual * 100,
  },
  {
    plan: "business",
    name: "EraseAI Teams/Family",
    description: "Per person, paid by the company or family: Chrome and Android for every member, admin dashboard by person.",
    monthly: PLAN_PRICING.business.monthly * 100,
    annual: PLAN_PRICING.business.annual * 100,
  },
];

async function findProduct(stripe: Stripe, plan: string): Promise<Stripe.Product | null> {
  const found = await stripe.products.search({ query: `metadata['plan']:'${plan}' AND active:'true'` });
  return found.data[0] ?? null;
}

/**
 * Makes sure each plan has its monthly and yearly price, and archives active
 * prices that no longer match (e.g. the old flat $99 Team). Idempotent.
 * Returns a readable log of what changed.
 */
export async function ensureCatalog(): Promise<string[]> {
  const stripe = await getUncachableStripeClient();
  const log: string[] = [];
  for (const spec of CATALOG) {
    let product = await findProduct(stripe, spec.plan);
    if (!product) {
      product = await stripe.products.create({ name: spec.name, description: spec.description, metadata: { plan: spec.plan } });
      log.push(`Created product ${spec.name}`);
    }
    const periods = [
      { billing_period: "monthly" as const, amount: spec.monthly, interval: "month" as const },
      { billing_period: "annual" as const, amount: spec.annual, interval: "year" as const },
    ];
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    for (const price of prices.data) {
      const wanted = periods.some(
        (p) => price.metadata?.billing_period === p.billing_period && price.unit_amount === p.amount && price.recurring?.interval === p.interval,
      );
      if (!wanted) {
        await stripe.prices.update(price.id, { active: false });
        log.push(`Archived old ${spec.name} price ${((price.unit_amount ?? 0) / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
      }
    }
    for (const p of periods) {
      const exists = prices.data.some(
        (price) => price.metadata?.billing_period === p.billing_period && price.unit_amount === p.amount && price.recurring?.interval === p.interval,
      );
      if (exists) continue;
      await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: "usd",
        recurring: { interval: p.interval },
        metadata: { plan: spec.plan, billing_period: p.billing_period },
      });
      log.push(`Created ${spec.name} ${p.billing_period} price $${(p.amount / 100).toFixed(2)}`);
    }
  }
  // Pull the changes into the stripe.* tables checkout reads from.
  try {
    const sync = await getStripeSync();
    await sync.syncBackfill({ object: "product" });
    await sync.syncBackfill({ object: "price" });
  } catch (err) {
    logger.warn({ err }, "Catalog sync after setup failed; webhooks will catch up");
    log.push("Note: the local copy will update from Stripe webhooks shortly.");
  }
  if (log.length === 0) log.push("Everything was already set up.");
  return log;
}

/**
 * A 100%-off promotion code that only applies to Team, for trying the full
 * purchase flow without paying. Checkout skips the card when the total is $0.
 */
export async function createTeamVoucher({ code, maxRedemptions }: { code: string; maxRedemptions: number }) {
  const stripe = await getUncachableStripeClient();
  const team = await findProduct(stripe, "business");
  if (!team) throw new Error("No Teams/Family product yet. Run “Set up prices” first.");
  const coupon = await stripe.coupons.create({
    name: "Teams/Family, 100% off (owner testing)",
    percent_off: 100,
    duration: "forever",
    applies_to: { products: [team.id] },
    metadata: { purpose: "owner-testing" },
  });
  const promo = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: coupon.id },
    code,
    max_redemptions: maxRedemptions,
    metadata: { purpose: "owner-testing" },
  });
  return { code: promo.code, maxRedemptions, couponId: coupon.id };
}
