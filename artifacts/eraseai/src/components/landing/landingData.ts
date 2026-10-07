// Content for the public landing page. Kept apart from the scenes so the
// copy can change without touching the animation code. Words live in the
// locale files under `story.*`; this file holds the structure and numbers.
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
  /** Headline key under story.headlines. */
  key: string;
  outlet: string;
  /** YYYY-MM, shown as a localized month. */
  month: string;
  icon: ClipIcon;
  /** Accent for the clip's "footage" glow. */
  tone: "red" | "amber" | "violet" | "cyan";
}

export const LEAK_CLIPS: NewsClip[] = [
  { key: "leaks.c1", outlet: "Bloomberg", month: "2023-05", icon: "code", tone: "red" },
  { key: "leaks.c2", outlet: "OpenAI", month: "2023-03", icon: "card", tone: "amber" },
  { key: "leaks.c3", outlet: "Wired", month: "2025-01", icon: "database", tone: "violet" },
  { key: "leaks.c4", outlet: "Fast Company", month: "2025-07", icon: "search", tone: "cyan" },
  { key: "leaks.c5", outlet: "Forbes", month: "2025-08", icon: "globe", tone: "red" },
  { key: "leaks.c6", outlet: "TechCrunch", month: "2023-12", icon: "dna", tone: "amber" },
];

export const MISUSE_CLIPS: NewsClip[] = [
  { key: "misuse.c1", outlet: "AP", month: "2025-01", icon: "flame", tone: "red" },
  { key: "misuse.c2", outlet: "CNN", month: "2024-02", icon: "video", tone: "violet" },
  { key: "misuse.c3", outlet: "Reuters", month: "2024-12", icon: "scale", tone: "amber" },
  { key: "misuse.c4", outlet: "Ars Technica", month: "2025-06", icon: "archive", tone: "cyan" },
  { key: "misuse.c5", outlet: "IBM", month: "2025-07", icon: "alert", tone: "red" },
  { key: "misuse.c6", outlet: "IBM", month: "2025-07", icon: "mail", tone: "violet" },
];

export const TICKER_KEYS = ["t1", "t2", "t3", "t4", "t5", "t6"];

/** What people paste into AI without thinking (keys under story.leak.chips). */
export const PII_CHIPS = ["name", "passport", "card", "apiKey", "address", "medical", "clients", "salary"];

/** Product names, not translated. */
export const AI_GATES = ["ChatGPT", "Claude", "Gemini", "Copilot", "Meta AI", "DeepSeek"];

export const PUBLIC_SINKS = ["logs", "training", "search", "breaches"];

// IBM Cost of a Data Breach Report, July 2025.
export const STATS = [
  { key: "s1", value: 20, prefix: "", suffix: "%", ring: 0.2 },
  { key: "s2", value: 670, prefix: "+$", suffix: "K", ring: 0.67 },
  { key: "s3", value: 97, prefix: "", suffix: "%", ring: 0.97 },
];

export interface LandingPlan {
  id: Exclude<PricingTierId, "free">;
  /** Monthly price in dollars; null = priced per organization. */
  monthly: number | null;
  perPerson: boolean;
  /** Dollar figure for the yearly line. */
  yearly: number | null;
  /** The yearly figure is a per-person monthly price rather than a yearly total. */
  yearlyIsMonthly: boolean;
  /** Small "3D" object shown on the card. */
  object: "devices" | "code" | "team" | "building";
}

function plan(id: LandingPlan["id"], object: LandingPlan["object"]): LandingPlan {
  const t = PRICING_TIERS.find((p) => p.id === id);
  if (!t) throw new Error(`Unknown pricing tier ${id}`);
  if (t.monthlyPrice < 0) return { id, monthly: null, perPerson: false, yearly: null, yearlyIsMonthly: false, object };
  return {
    id,
    monthly: t.monthlyPrice,
    perPerson: !!t.perPerson,
    yearly: t.annualMonthlyPrice ?? annualPriceFor(t.monthlyPrice),
    yearlyIsMonthly: t.annualMonthlyPrice != null,
    object,
  };
}

export const LANDING_PLANS: LandingPlan[] = [
  plan("personal", "devices"),
  plan("pro", "code"),
  plan("business", "team"),
  plan("enterprise", "building"),
];

export const PLAN_FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5"];

export const CONTACT = {
  whatsappLabel: "+65 8243 0739",
  whatsappUrl: "https://wa.me/6582430739",
  email: "director@vantward.com",
};
