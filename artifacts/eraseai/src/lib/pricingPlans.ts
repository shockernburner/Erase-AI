// Plans shown on the public homepage and the in-app pricing page. One source so
// the two pages (and the prices the server charges) cannot drift apart again.
//
// Who pays decides the plan: Personal and Developer are paid by one person for
// themselves. When an organization pays (Team or Enterprise), its members are
// organization users and get Enterprise-level protection, never "Personal".
// `soon` marks features not built yet, so the site never sells what does not exist.
// Prices must match the server (api-server billing-source.mjs PLAN_PRICING).

export type PricingTierId = "free" | "personal" | "pro" | "business" | "enterprise";

export interface PricingFeature {
  text: string;
  /** Not built yet: shown with a "Coming soon" badge. */
  soon?: boolean;
}

export interface PricingTier {
  id: PricingTierId;
  name: string;
  /** 0 = free, -1 = contact us for pricing. */
  monthlyPrice: number;
  description: string;
  paidBy: string;
  forYou: PricingFeature[];
  forOrg: PricingFeature[];
  cta: string;
  highlight: boolean;
}

/** 12 months at a 10% discount, rounded; must match billing-source.mjs `annualPrice`. */
export function annualPriceFor(monthly: number): number {
  return Math.round(monthly * 12 * 0.9);
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    description: "Anyone, no account needed",
    paidBy: "No payment",
    forYou: [
      { text: "Chrome: every message to ChatGPT, Claude and Gemini checked on your device, no limit" },
      { text: "See what was found, then cancel or send" },
      { text: "Android app: free trial, 7 days or 25 messages" },
      { text: "Web dashboard: 7-day trial with 25 scans" },
    ],
    forOrg: [],
    cta: "Start free",
    highlight: false,
  },
  {
    id: "personal",
    name: "Personal",
    monthlyPrice: 5,
    description: "Individuals, freelancers, students and consultants",
    paidBy: "Paid by you, for you",
    forYou: [
      { text: "Chrome: one-click Sanitize & Send" },
      { text: "Chrome: attachment and screenshot scanning (PDF, Word, Excel, slides, images)" },
      { text: "Android: protection stays on, with Sanitize, EraseAI Safe files and the Strict network gate" },
      { text: "Unlimited checks, scan history and alerts" },
      { text: "AI rewriting of risky text" },
    ],
    forOrg: [
      { text: "Not for organizations: if your employer pays for you, choose Team or Enterprise" },
    ],
    cta: "Protect my AI chats",
    highlight: true,
  },
  {
    id: "pro",
    name: "Developer",
    monthlyPrice: 19,
    description: "App builders and indie SaaS founders",
    paidBy: "Paid by you, for you",
    forYou: [
      { text: "Everything in Personal" },
      { text: "API access: 5 keys, 10,000 requests a month" },
      { text: "Input and output scanning in your own apps" },
      { text: "Webhooks and request logs" },
      { text: "Dataset sanitizer for files up to 1,000 rows" },
    ],
    forOrg: [
      { text: "Build EraseAI checks into your organization's apps and pipelines" },
      { text: "One developer seat; the organization's people need Team or Enterprise" },
    ],
    cta: "Get API key",
    highlight: false,
  },
  {
    id: "business",
    name: "Team",
    monthlyPrice: 99,
    description: "Small companies, up to 10 people",
    paidBy: "Paid by your organization",
    forYou: [
      { text: "Enterprise-level protection on Chrome and Android, paid for by your organization" },
      { text: "Everything in Personal, with no personal subscription" },
    ],
    forOrg: [
      { text: "One bill for up to 10 people" },
      { text: "Extra people: $8 each a month", soon: true },
      { text: "Invite and remove members", soon: true },
      { text: "Admin dashboard: what was caught across the team" },
      { text: "Team-wide rules, e.g. always block keys", soon: true },
      { text: "Audit log export", soon: true },
      { text: "API: 20 keys, 100,000 requests a month" },
      { text: "Priority support" },
    ],
    cta: "Secure my team",
    highlight: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: -1,
    description: "Banks, law firms, healthcare, government and large companies",
    paidBy: "Paid by your organization",
    forYou: [
      { text: "Enterprise-level protection on Chrome and Android, set up by your IT team" },
      { text: "Everything in Team" },
    ],
    forOrg: [
      { text: "Managed rollout: IT installs and configures EraseAI on every browser and phone", soon: true },
      { text: "Single sign-on (SSO) and user provisioning", soon: true },
      { text: "Company policies and custom detection rules", soon: true },
      { text: "Compliance reporting and audit" },
      { text: "Private deployment, on-premises or in your cloud" },
      { text: "Dataset governance and machine unlearning" },
      { text: "Data processing agreement, dedicated support and SLA" },
    ],
    cta: "Contact us for pricing",
    highlight: false,
  },
];

export const PRICING_COMPARISON: string[][] = [
  ["Who pays", "No one", "You", "You", "Your organization", "Your organization"],
  ["Chrome checks", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
  ["One-click Sanitize & attachments", "No", "Yes", "Yes", "Yes", "Yes"],
  ["Android protection", "Trial", "Yes", "Yes", "Yes", "Yes"],
  ["API requests a month", "No", "No", "10,000", "100,000", "Custom"],
  ["Admin dashboard and team rules", "No", "No", "No", "Yes", "Yes"],
  ["Managed rollout, SSO", "No", "No", "No", "No", "Yes"],
];
