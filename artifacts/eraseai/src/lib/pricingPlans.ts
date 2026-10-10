// Plans shown on the public homepage and the in-app pricing page. One source so
// the two pages (and the prices the server charges) cannot drift apart again.
//
// Who pays decides the plan: Personal and Pro are paid by one person for
// themselves. When an organization or family pays (Teams/Family or Enterprise), its members are
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
  /** 0 = free, -1 = contact us for pricing. Per person when `perPerson`. */
  monthlyPrice: number;
  /** Priced per person (Teams/Family). */
  perPerson?: boolean;
  /** Monthly price per person when billed yearly, if not the standard 10% off. */
  annualMonthlyPrice?: number;
  /** e.g. "3 to 10 people". */
  seats?: string;
  /** Sold through sales, not self-serve checkout. */
  contactSales?: boolean;
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
      { text: "Android: protection stays on, with Sanitize and EraseAI Safe files" },
      { text: "Unlimited checks, scan history and alerts" },
      { text: "AI rewriting of risky text" },
    ],
    forOrg: [
      { text: "Not for organizations: if your employer or family pays for you, choose Teams/Family or Enterprise" },
    ],
    cta: "Protect my AI chats",
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
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
      { text: "One developer seat; the organization's people need Teams/Family or Enterprise" },
    ],
    cta: "Get API key",
    highlight: false,
  },
  {
    id: "business",
    name: "Teams/Family",
    monthlyPrice: 9,
    perPerson: true,
    annualMonthlyPrice: 8,
    seats: "3 to 10 people",
    description: "Small companies, teams and families",
    paidBy: "Paid by your company, or by one person for the family",
    forYou: [
      { text: "Chrome extension and Android app with full protection: install, sign in with the email you were invited with, pay nothing yourself" },
      { text: "Everything in Personal (one-click Sanitize, attachment and screenshot scanning, history)" },
    ],
    forOrg: [
      { text: "Company rules everyone follows, e.g. keys always blocked, no 'Send anyway'", soon: true },
      { text: "Admin dashboard: what was caught, by person" },
      { text: "Audit log export as evidence for ISO 27001, SOC 2 and GDPR", soon: true },
      { text: "Add and remove people with invite links; seats stay with the company or family" },
      { text: "Family protection: cover your partner, parents and children on their own phones and browsers" },
      { text: "One invoice for everyone; change seats any time" },
      { text: "Managed rollout: IT installs EraseAI on every Chrome browser (Google Admin, Intune) and people join with their work email", soon: true },
      { text: "Managed rollout on Android phones (managed Google Play)", soon: true },
      { text: "API: 20 keys, 100,000 requests a month, shared" },
      { text: "Priority support" },
    ],
    cta: "Buy Teams/Family",
    highlight: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: -1,
    contactSales: true,
    description: "Banks, law firms, healthcare, government and large companies",
    paidBy: "Paid by your organization",
    forYou: [
      { text: "Chrome extension and Android app with full protection: sign in with your work email, pay nothing yourself" },
      { text: "Everything in Teams/Family; your IT team can install it for you" },
    ],
    forOrg: [
      { text: "Any number of people, priced for your organization" },
      { text: "Managed rollout on every Chrome browser (Google Admin, Intune)", soon: true },
      { text: "Managed rollout on Android phones (managed Google Play)", soon: true },
      { text: "Single sign-on (SAML, Google, Microsoft) and automatic user provisioning (SCIM)", soon: true },
      { text: "Company-wide policies and custom detection rules", soon: true },
      { text: "Send events to your security tools (SIEM: Splunk, Microsoft Sentinel)", soon: true },
      { text: "Compliance reporting and audit", soon: true },
      { text: "Private deployment, on-premises or in your own cloud" },
      { text: "Data residency and custom retention" },
      { text: "Dataset governance and machine unlearning" },
      { text: "Data processing agreement, security review support, dedicated account manager and SLA" },
    ],
    cta: "Contact us for pricing",
    highlight: false,
  },
];

export const PRICING_COMPARISON: string[][] = [
  ["Price", "$0", "$5 a month", "$19 a month", "$9 a person a month", "Contact us"],
  ["People", "1", "1", "1", "3 to 10", "Any number"],
  ["Who pays", "No one", "You", "You", "Your company or family", "Your organization"],
  ["How people get it", "Install the extension", "Subscribe", "Subscribe", "Invite link; sign in with the invited email", "Invite link or IT rollout; work email"],
  ["Chrome checks", "Unlimited", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
  ["One-click Sanitize & attachments", "No", "Yes", "Yes", "Yes, every member", "Yes, every member"],
  ["Android app", "7-day trial", "Yes", "Yes", "Yes, every member", "Yes, every member"],
  ["API requests a month", "No", "No", "10,000", "100,000", "Custom"],
  ["Admin dashboard", "No", "No", "No", "Yes", "Yes"],
  ["Company rules and audit export", "No", "No", "No", "Coming soon", "Coming soon"],
  ["Managed rollout (Chrome)", "No", "No", "No", "Coming soon", "Coming soon"],
  ["SSO and SIEM", "No", "No", "No", "No", "Coming soon"],
];

/**
 * Why an organization pays for Teams/Family rather than letting people buy Personal.
 * Protection per person is the same; the organization pays for control and proof.
 */
export const TEAM_REASONS: { title: string; text: string; soon?: boolean }[] = [
  { title: "Control", text: "Company rules everyone follows. On Personal, each person can switch protection off or always press Send anyway.", soon: true },
  { title: "Visibility", text: "An admin dashboard of what was caught across the team, by person and AI app. Personal histories are private to each person." },
  { title: "Evidence", text: "An audit log to show auditors and customers for ISO 27001, SOC 2 and GDPR.", soon: true },
  { title: "People leaving", text: "Remove someone and their seat and history stay with the company, instead of leaving with their personal account.", soon: true },
  { title: "One invoice", text: "One bill for the team instead of a card charge and an expense claim per person." },
];

