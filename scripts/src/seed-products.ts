import { getUncachableStripeClient } from "./stripeClient";

/**
 * Seed EraseAI's Stripe catalog (products + prices).
 *
 * Idempotent: products are matched by `metadata.plan` and prices by
 * `metadata.billing_period` + amount + interval, so re-running only creates
 * what's missing. The backend (`/api/billing/checkout`) resolves the price id
 * from the synced `stripe.*` schema using these same metadata tags.
 *
 * Prices mirror the live plans exactly (annual = round(monthly * 12 * 0.9)):
 *   Personal  $5/mo   $54/yr
 *   Developer $19/mo  $205/yr
 *   Team      $99/mo  $1069/yr
 *
 * Run with: pnpm --filter @workspace/scripts run seed-stripe
 */
interface PlanSeed {
  plan: string;
  name: string;
  description: string;
  monthly: number; // cents
  annual: number; // cents
}

const PLANS: PlanSeed[] = [
  {
    plan: "personal",
    name: "EraseAI Personal",
    description: "Browser firewall and auto-redaction for individuals.",
    monthly: 500,
    annual: 5400,
  },
  {
    plan: "pro",
    name: "EraseAI Developer",
    description: "API access, input/output scanning, and webhooks for builders.",
    monthly: 1900,
    annual: 20500,
  },
  {
    plan: "business",
    name: "EraseAI Team",
    description: "Shared policies, admin dashboard, and audit logs for teams.",
    monthly: 9900,
    annual: 106900,
  },
];

async function seed() {
  const stripe = await getUncachableStripeClient();
  console.log("Seeding EraseAI products and prices in Stripe...");

  for (const spec of PLANS) {
    // Find-or-create the product (matched on metadata.plan).
    const search = await stripe.products.search({
      query: `metadata['plan']:'${spec.plan}' AND active:'true'`,
    });
    let product = search.data[0];
    if (product) {
      console.log(`Product exists for plan="${spec.plan}": ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: spec.name,
        description: spec.description,
        metadata: { plan: spec.plan },
      });
      console.log(`Created product ${spec.name} (${product.id})`);
    }

    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });

    const periods: Array<{
      billing_period: "monthly" | "annual";
      amount: number;
      interval: "month" | "year";
    }> = [
      { billing_period: "monthly", amount: spec.monthly, interval: "month" },
      { billing_period: "annual", amount: spec.annual, interval: "year" },
    ];

    for (const p of periods) {
      const match = existingPrices.data.find(
        (pr) =>
          pr.metadata?.billing_period === p.billing_period &&
          pr.unit_amount === p.amount &&
          pr.recurring?.interval === p.interval,
      );
      if (match) {
        console.log(`  Price exists: ${spec.plan}/${p.billing_period} (${match.id})`);
        continue;
      }
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: "usd",
        recurring: { interval: p.interval },
        metadata: { plan: spec.plan, billing_period: p.billing_period },
      });
      console.log(
        `  Created price ${spec.plan}/${p.billing_period} = ${(p.amount / 100).toFixed(2)} USD (${price.id})`,
      );
    }
  }

  console.log("Done. Webhooks/backfill will sync this into the stripe.* schema.");
}

seed().catch((err) => {
  console.error("Error seeding products:", err);
  process.exit(1);
});
