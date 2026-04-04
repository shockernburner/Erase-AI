import { detectSecrets, type SecretMatch } from "./secrets";

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

const PII_PATTERNS: { pattern: RegExp; detail: string }[] = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, detail: "Email address found in prompt" },
  { pattern: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, detail: "Phone number found in prompt" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, detail: "SSN-like pattern found" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, detail: "Credit card number found" },
];

const PROPRIETARY_PATTERNS: { pattern: RegExp; severity: "low" | "medium" | "high"; detail: string }[] = [
  { pattern: /\b(internal|proprietary|confidential|trade\s*secret)\b/gi, severity: "medium", detail: "Confidentiality marker found" },
  { pattern: /\b(TODO|FIXME|HACK|XXX)\b.*(?:password|secret|key|token)/gi, severity: "high", detail: "Code comment exposing sensitive context" },
  { pattern: /\/(api|internal|admin|private)\/[a-z0-9/_-]+/gi, severity: "low", detail: "Internal API path exposed" },
  { pattern: /\b(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\s+(?:FROM|INTO|SET)\s+\w+/gi, severity: "medium", detail: "Raw SQL query with schema details" },
  { pattern: /(?:function|const|let|var|class)\s+[a-zA-Z_$][\w$]*\s*(?:=|\(|{)/g, severity: "low", detail: "Source code with named functions/variables" },
];

const TOXICITY_PATTERNS: { pattern: RegExp; severity: "medium" | "high"; detail: string }[] = [
  { pattern: /\b(ignore\s+previous\s+instructions|disregard\s+above|forget\s+everything)\b/gi, severity: "high", detail: "Prompt injection attempt detected" },
  { pattern: /\b(jailbreak|bypass\s+filter|ignore\s+safety|override\s+rules)\b/gi, severity: "high", detail: "Safety bypass attempt" },
  { pattern: /\b(system\s*prompt|you\s+are\s+now|act\s+as\s+if|pretend\s+to\s+be)\b/gi, severity: "medium", detail: "Role manipulation attempt" },
];

function findMatches(text: string, pattern: RegExp): { match: string; start: number; end: number }[] {
  const results: { match: string; start: number; end: number }[] = [];
  const re = new RegExp(pattern.source, pattern.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ match: m[0], start: m.index, end: m.index + m[0].length });
  }
  return results;
}

export function analyzePromptSafety(text: string): SafetyResult {
  const issues: SafetyIssue[] = [];

  const secrets: SecretMatch[] = detectSecrets(text);
  for (const s of secrets) {
    const severity = ["jwt", "private_key", "database_url", "aws_secret_key"].includes(s.type) ? "critical" : "high";
    issues.push({
      category: "secret_exposure",
      severity,
      detail: `${s.pattern}: detected in input`,
      match: s.match,
      start: s.start,
      end: s.end,
    });
  }

  for (const { pattern, detail } of PII_PATTERNS) {
    for (const m of findMatches(text, pattern)) {
      issues.push({
        category: "pii",
        severity: "high",
        detail,
        match: m.match,
        start: m.start,
        end: m.end,
      });
    }
  }

  for (const { pattern, severity, detail } of PROPRIETARY_PATTERNS) {
    for (const m of findMatches(text, pattern)) {
      issues.push({
        category: "proprietary_logic",
        severity,
        detail,
        match: m.match,
        start: m.start,
        end: m.end,
      });
    }
  }

  for (const { pattern, severity, detail } of TOXICITY_PATTERNS) {
    for (const m of findMatches(text, pattern)) {
      issues.push({
        category: "toxicity",
        severity,
        detail,
        match: m.match,
        start: m.start,
        end: m.end,
      });
    }
  }

  let riskScore = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": riskScore -= 30; break;
      case "high": riskScore -= 20; break;
      case "medium": riskScore -= 10; break;
      case "low": riskScore -= 5; break;
    }
  }
  riskScore = Math.max(0, riskScore);

  const level: SafetyResult["level"] = riskScore >= 70 ? "safe" : riskScore >= 40 ? "caution" : "danger";

  const categoryCounts: Record<string, number> = {};
  for (const issue of issues) {
    categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
  }

  let summary: string;
  if (issues.length === 0) {
    summary = "No issues detected. This prompt appears safe to send to AI systems.";
  } else {
    const parts = Object.entries(categoryCounts).map(([cat, count]) => `${count} ${cat.replace(/_/g, " ")}`);
    summary = `Found ${issues.length} issue${issues.length > 1 ? "s" : ""}: ${parts.join(", ")}.`;
  }

  const suggestions: SafetySuggestion[] = [];
  const seenCategories = new Set<string>();
  for (const issue of issues) {
    if (seenCategories.has(issue.category)) continue;
    seenCategories.add(issue.category);

    switch (issue.category) {
      case "secret_exposure":
        suggestions.push({
          category: "secret_exposure",
          action: "Remove or mask all secrets before sending to AI",
          detail: "Use environment variables instead of hardcoded secrets. Run the Sanitize function to automatically mask detected credentials.",
        });
        suggestions.push({
          category: "secret_exposure",
          action: "Use .env files and secret managers",
          detail: "Store API keys, tokens, and database URLs in environment variables or a secret manager (AWS Secrets Manager, HashiCorp Vault). Never paste them into AI prompts.",
        });
        break;
      case "pii":
        suggestions.push({
          category: "pii",
          action: "Redact personal information before sharing with AI",
          detail: "Replace real emails, phone numbers, SSNs, and credit card numbers with placeholder values like user@example.com or 555-0100.",
        });
        suggestions.push({
          category: "pii",
          action: "Use synthetic data for AI-assisted development",
          detail: "Generate fake but realistic test data instead of using real personal information in prompts.",
        });
        break;
      case "proprietary_logic":
        suggestions.push({
          category: "proprietary_logic",
          action: "Abstract proprietary code before sharing",
          detail: "Rename internal functions, classes, and API endpoints to generic names. Remove business-specific logic and keep only the pattern you need help with.",
        });
        suggestions.push({
          category: "proprietary_logic",
          action: "Strip internal comments and SQL schemas",
          detail: "Remove TODO/FIXME comments with sensitive context, and replace real table/column names in SQL queries with generic equivalents.",
        });
        break;
      case "toxicity":
        suggestions.push({
          category: "toxicity",
          action: "Remove prompt injection patterns",
          detail: "Detected language that attempts to override AI safety instructions. Remove phrases like 'ignore previous instructions' or 'act as if' to ensure safe AI interaction.",
        });
        suggestions.push({
          category: "toxicity",
          action: "Use structured prompts instead of role manipulation",
          detail: "Instead of trying to bypass AI safety filters, use clear, structured prompts that describe your actual need. This produces better results and avoids account flags.",
        });
        break;
    }
  }

  return { riskScore, level, issues, suggestions, summary };
}
