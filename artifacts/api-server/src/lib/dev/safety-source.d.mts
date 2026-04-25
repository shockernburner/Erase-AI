export type IssueCategory =
  | "secret_exposure"
  | "pii"
  | "proprietary_logic"
  | "toxicity";

export interface SafetyIssue {
  category: IssueCategory;
  severity: "low" | "medium" | "high" | "critical";
  detail: string;
  match: string;
  start: number;
  end: number;
}

export interface SafetySuggestion {
  category: IssueCategory;
  action: string;
  detail: string;
}

export interface SafetyResult {
  riskScore: number;
  level: "safe" | "caution" | "danger";
  issues: SafetyIssue[];
  suggestions: SafetySuggestion[];
  summary: string;
}

export function analyzePromptSafety(text: string): SafetyResult;
