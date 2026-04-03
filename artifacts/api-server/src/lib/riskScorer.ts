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

export function calculateRiskScore(flags: AnalysisFlag[]): RiskResult {
  let score = 100;
  const breakdown = { toxicity: 0, hateSpeech: 0, pii: 0, bias: 0 };

  const seenTexts = new Set<string>();

  for (const flag of flags) {
    const key = `${flag.type}:${flag.matchedText.toLowerCase()}`;
    if (seenTexts.has(key)) continue;
    seenTexts.add(key);

    const deduction = DEDUCTIONS[flag.type];
    score -= deduction;

    switch (flag.type) {
      case "toxicity":
        breakdown.toxicity += deduction;
        break;
      case "hate_speech":
        breakdown.hateSpeech += deduction;
        break;
      case "pii":
        breakdown.pii += deduction;
        break;
      case "bias":
        breakdown.bias += deduction;
        break;
    }
  }

  score = Math.max(0, Math.min(100, score));

  let level: "low" | "medium" | "high";
  if (score >= 70) level = "low";
  else if (score >= 40) level = "medium";
  else level = "high";

  return { score, level, breakdown };
}
