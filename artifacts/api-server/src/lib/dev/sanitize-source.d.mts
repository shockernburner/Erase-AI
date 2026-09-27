import type { SafetyIssue } from "./safety-source.mjs";

export interface SanitizeChange {
  category: string;
  original: string;
  replacement: string;
  start: number;
  end: number;
}

export interface SanitizeResult {
  sanitized: string;
  changes: SanitizeChange[];
}

export function sanitizeText(text: string, issues?: SafetyIssue[]): SanitizeResult;
