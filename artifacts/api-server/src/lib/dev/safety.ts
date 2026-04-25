// Thin TypeScript wrapper around ./safety-source.mjs. The runtime analyzer
// + pattern arrays live in the .mjs sibling so the api-server test suite can
// import them directly via `node --test`. This file just re-exports them
// with TS types attached.
import { analyzePromptSafety as analyzePromptSafetyImpl } from "./safety-source.mjs";

export type IssueCategory = "secret_exposure" | "pii" | "proprietary_logic" | "toxicity";

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

export const analyzePromptSafety: (text: string) => SafetyResult = analyzePromptSafetyImpl;
