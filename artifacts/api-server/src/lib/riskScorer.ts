import type { AnalysisFlag } from "./personalAnalyzer";

export interface RiskResult {
  score: number;
  level: "low" | "medium" | "high";
  breakdown: {
    toxicity: number;
    hateSpeech: number;
    pii: number;
    bias: number;
  };
}

const DEDUCTIONS: Record<AnalysisFlag["type"], number> = {
  toxicity: 20,
  hate_speech: 30,
  pii: 25,
  bias: 15,
};

const BREAKDOWN_KEY: Record<AnalysisFlag["type"], keyof RiskResult["breakdown"]> = {
  toxicity: "toxicity",
  hate_speech: "hateSpeech",
  pii: "pii",
  bias: "bias",
};

export function calculateRiskScore(flags: AnalysisFlag[]): RiskResult {
  let score = 100;
  const breakdown = { toxicity: 0, hateSpeech: 0, pii: 0, bias: 0 };

  const seenCategories = new Set<AnalysisFlag["type"]>();

  for (const flag of flags) {
    if (seenCategories.has(flag.type)) continue;
    seenCategories.add(flag.type);

    const deduction = DEDUCTIONS[flag.type];
    score -= deduction;
    breakdown[BREAKDOWN_KEY[flag.type]] = deduction;
  }

  score = Math.max(0, Math.min(100, score));

  let level: "low" | "medium" | "high";
  if (score >= 70) level = "low";
  else if (score >= 40) level = "medium";
  else level = "high";

  return { score, level, breakdown };
}
