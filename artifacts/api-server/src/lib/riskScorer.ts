import type { AnalysisFlag, AnalysisFlagType } from "./personalAnalyzer";

export interface RiskResult {
  score: number;
  level: "low" | "medium" | "high";
  breakdown: {
    toxicity: number;
    hateSpeech: number;
    pii: number;
    bias: number;
    childSafety: number;
    violenceIntent: number;
    weaponsHarm: number;
  };
  /** True when Send Anyway must be hidden (child safety / attack planning). */
  blockSend: boolean;
}

const DEDUCTIONS: Record<AnalysisFlagType, number> = {
  toxicity: 20,
  hate_speech: 30,
  pii: 25,
  bias: 15,
  child_safety: 55,
  violence_intent: 55,
  weapons_harm: 35,
};

const BREAKDOWN_KEY: Record<AnalysisFlagType, keyof RiskResult["breakdown"]> = {
  toxicity: "toxicity",
  hate_speech: "hateSpeech",
  pii: "pii",
  bias: "bias",
  child_safety: "childSafety",
  violence_intent: "violenceIntent",
  weapons_harm: "weaponsHarm",
};

function shouldBlockSend(flags: AnalysisFlag[]): boolean {
  return flags.some(
    (f) =>
      f.type === "child_safety" ||
      f.type === "violence_intent" ||
      (f.type === "weapons_harm" && f.severity === "high"),
  );
}

export function calculateRiskScore(flags: AnalysisFlag[]): RiskResult {
  let score = 100;
  const breakdown = {
    toxicity: 0,
    hateSpeech: 0,
    pii: 0,
    bias: 0,
    childSafety: 0,
    violenceIntent: 0,
    weaponsHarm: 0,
  };

  const seenCategories = new Set<AnalysisFlagType>();

  for (const flag of flags) {
    if (seenCategories.has(flag.type)) continue;
    seenCategories.add(flag.type);

    const deduction = DEDUCTIONS[flag.type];
    score -= deduction;
    breakdown[BREAKDOWN_KEY[flag.type]] = deduction;
  }

  score = Math.max(0, Math.min(100, score));

  const blockSend = shouldBlockSend(flags);

  let level: "low" | "medium" | "high";
  if (blockSend) {
    level = "high";
    score = Math.min(score, 30);
  } else if (score >= 70) {
    level = "low";
  } else if (score >= 40) {
    level = "medium";
  } else {
    level = "high";
  }

  return { score, level, breakdown, blockSend };
}
