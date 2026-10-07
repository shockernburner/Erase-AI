// Content for the public landing page. Kept apart from the scenes so the
// copy can change without touching the animation code.
//
// Headlines are paraphrased from public reporting (outlet + month shown on
// each clip). Plan prices come from PRICING_TIERS so they cannot drift from
// what checkout charges.

import { PRICING_TIERS, annualPriceFor, type PricingTierId } from "@/lib/pricingPlans";

export type ClipIcon =
  | "code"
  | "card"
  | "database"
  | "search"
  | "globe"
  | "dna"
  | "flame"
  | "video"
  | "scale"
  | "archive"
  | "alert"
  | "mail";

export interface NewsClip {
  outlet: string;
  date: string;
  headline: string;
  icon: ClipIcon;
  /** Accent for the clip's "footage" glow. */
  tone: "red" | "amber" | "violet" | "cyan";
}

export const LEAK_CLIPS: NewsClip[] = [
  { outlet: "Bloomberg", date: "May 2023", headline: "Samsung bans ChatGPT after engineers paste in secret source code", icon: "code", tone: "red" },
  { outlet: "OpenAI", date: "Mar 2023", headline: "ChatGPT bug shows users other people's chats and payment details", icon: "card", tone: "amber" },
  { outlet: "Wired", date: "Jan 2025", headline: "Exposed DeepSeek database leaks chat histories and secret keys", icon: "database", tone: "violet" },
  { outlet: "Fast Company", date: "Jul 2025", headline: "Private ChatGPT conversations turn up in Google search", icon: "search", tone: "cyan" },
  { outlet: "Forbes", date: "Aug 2025", headline: "Hundreds of thousands of Grok chats exposed to search engines", icon: "globe", tone: "red" },
  { outlet: "TechCrunch", date: "Dec 2023", headline: "23andMe: hackers reached the personal data of 6.9 million people", icon: "dna", tone: "amber" },
];

export const MISUSE_CLIPS: NewsClip[] = [
  { outlet: "AP", date: "Jan 2025", headline: "Police: Las Vegas Cybertruck bomber used ChatGPT to plan the attack", icon: "flame", tone: "red" },
  { outlet: "CNN", date: "Feb 2024", headline: "Deepfake 'CFO' on a video call tricks a firm into paying $25 million", icon: "video", tone: "violet" },
  { outlet: "Reuters", date: "Dec 2024", headline: "Italy fines OpenAI €15 million over how it used personal data", icon: "scale", tone: "amber" },
  { outlet: "Ars Technica", date: "Jun 2025", headline: "Court orders OpenAI to keep ChatGPT logs, even deleted ones", icon: "archive", tone: "cyan" },
  { outlet: "IBM", date: "Jul 2025", headline: "One in five organizations breached through unapproved 'shadow' AI", icon: "alert", tone: "red" },
  { outlet: "IBM", date: "Jul 2025", headline: "AI-written phishing and deepfakes behind one in six breaches", icon: "mail", tone: "violet" },
];

export const TICKER = [
  "Prompts are logged",
  "Chats are shared and indexed",
  "Uploads are kept for training",
  "Deleted chats can be ordered preserved",
  "Leaked keys are found in minutes",
  "Your name, card and passport travel with every paste",
];

/** What people paste into AI without thinking. */
export const PII_CHIPS = ["Full name", "Passport no.", "Card number", "API key", "Home address", "Medical notes", "Client list", "Salary"];

export const AI_GATES = ["ChatGPT", "Claude", "Gemini", "Copilot", "Meta AI", "DeepSeek"];

export const PUBLIC_SINKS = ["Logs", "Training data", "Search results", "Breaches"];

// IBM Cost of a Data Breach Report, July 2025.
export const STATS = [
  { value: 20, prefix: "", suffix: "%", label: "of organizations breached through shadow AI", ring: 0.2 },
  { value: 670, prefix: "+$", suffix: "K", label: "extra cost of a breach when shadow AI is involved", ring: 0.67 },
  { value: 97, prefix: "", suffix: "%", label: "of AI-related breaches hit firms without AI access controls", ring: 0.97 },
];

export interface LandingPlan {
  id: Exclude<PricingTierId, "free">;
  name: string;
  tagline: string;
  price: string;
  unit: string;
  yearly: string | null;
  features: string[];
  /** Small "3D" object shown on the card. */
  object: "devices" | "code" | "team" | "building";
}

function tier(id: PricingTierId) {
  const t = PRICING_TIERS.find((p) => p.id === id);
  if (!t) throw new Error(`Unknown pricing tier ${id}`);
  return t;
}

function priceOf(id: PricingTierId) {
  const t = tier(id);
  if (t.monthlyPrice < 0) return { price: "Custom", unit: "", yearly: "Priced for your organization" };
  const unit = t.perPerson ? "/person/mo" : "/mo";
  const yearly =
    t.annualMonthlyPrice != null
      ? `$${t.annualMonthlyPrice}/person/mo billed yearly`
      : `or $${annualPriceFor(t.monthlyPrice)}/year (save 10%)`;
  return { price: `$${t.monthlyPrice}`, unit, yearly };
}

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: "personal",
    name: "Personal",
    tagline: "Browser extension + Android app",
    ...priceOf("personal"),
    features: [
      "Every message to ChatGPT, Claude and Gemini checked before Send",
      "One-click Sanitize & Send",
      "Files and screenshots scanned too",
      "Android: protection stays on in AI apps",
      "Unlimited checks, history and alerts",
    ],
    object: "devices",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For developers: everything in Personal + API",
    ...priceOf("pro"),
    features: [
      "Everything in Personal",
      "API: 5 keys, 10,000 requests a month",
      "Scan inputs and outputs in your own apps",
      "Webhooks and request logs",
      "Dataset sanitizer up to 1,000 rows",
    ],
    object: "code",
  },
  {
    id: "business",
    name: "Teams",
    tagline: `${tier("business").seats}, paid by your company`,
    ...priceOf("business"),
    features: [
      "Every member covered on Chrome and Android",
      "Members sign in with work email, pay nothing",
      "Admin dashboard: what was caught, by person",
      "Invite links; seats stay with the company",
      "One invoice · API: 100,000 requests a month",
    ],
    object: "team",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Banks, law firms, healthcare, government",
    ...priceOf("enterprise"),
    features: [
      "Any number of people",
      "Private deployment, on-premises or your cloud",
      "Data residency and custom retention",
      "Dataset governance and machine unlearning",
      "DPA, SLA and a dedicated account manager",
    ],
    object: "building",
  },
];

export const CONTACT = {
  whatsappLabel: "+65 8243 0739",
  whatsappUrl: "https://wa.me/6582430739",
  email: "director@vantward.com",
};
