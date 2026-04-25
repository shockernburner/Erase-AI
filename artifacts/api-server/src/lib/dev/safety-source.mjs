// Source-of-truth safety analyzer for user prompts. Lives in a plain .mjs
// file so the api-server test suite can exercise it directly via `node
// --test` without needing a TypeScript loader. The TypeScript wrapper at
// ./safety.ts re-exports from here with compile-time types.
//
// Detection philosophy (task #113): the firewall must catch CASUALLY-typed
// sensitive content the user is realistically going to type while testing —
// not just textbook-realistic secrets. False positives are acceptable; false
// negatives undermine the whole point of the firewall.
//
// Scoring rule: any single detected issue caps the risk score at 65 so the
// "safe" threshold (>= 70) is never reached when something was found. This
// guarantees the in-page overlay shows a warning panel rather than the
// brief "All clear" auto-send confirmation.

import { detectSecrets } from "./secrets-source.mjs";

const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, severity: "high", detail: "Email address found in prompt" },
  { pattern: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, severity: "high", detail: "Phone number found in prompt" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, severity: "high", detail: "SSN-like pattern found" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, severity: "high", detail: "Credit card number found" },
];

// Casual / contextual PII patterns added in v1.3.3 to catch the everyday
// shapes users actually type ("my password is hello", "account number 12345",
// "DOB: 03/14/1990", "123 Main St") instead of textbook regex shapes only.
const CASUAL_PII_PATTERNS = [
  // "password is hello" / "password: hello123" / "PIN = 1234" / "passcode hunter2"
  {
    pattern: /\b(?:password|passwd|pwd|passcode|pin)\s*(?:is|=|:)\s*\S+/gi,
    severity: "high",
    detail: "Password or PIN appears to be disclosed in plain text",
  },
  // "account number 12345" / "acct: 9876" / "bank account # 11112222"
  {
    pattern: /\b(?:bank\s+account|account|acct|acc)\s*(?:number|num|no|#)?\s*(?:is|=|:)?\s*\d{4,}/gi,
    severity: "high",
    detail: "Bank/account number appears to be disclosed",
  },
  // "social security 123-45-6789" / "ssn 123 45 6789" / "national id 12345"
  // Catches partial / loosely-formatted SSNs the strict ###-##-#### pattern misses.
  {
    pattern: /\b(?:social\s*security(?:\s*number|\s*#)?|ssn|national\s+id|tax\s+id|tin)\s*(?:is|=|:|#)?\s*[\d\s\-]{4,}/gi,
    severity: "high",
    detail: "Government identification number (SSN / tax ID / national ID) disclosed",
  },
  // SSN with spaces instead of dashes — the legacy pattern only catches dashes.
  {
    pattern: /\b\d{3}\s\d{2}\s\d{4}\b/g,
    severity: "high",
    detail: "SSN-like pattern (space-separated) found",
  },
  // Date of birth in any common shape — only flagged when the DOB context
  // word is nearby, otherwise ordinary dates would all trip it.
  {
    pattern: /\b(?:dob|d\.?o\.?b\.?|date\s+of\s+birth|birth\s*date|birthday|born(?:\s+on)?)\s*(?:is|=|:|on)?\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/gi,
    severity: "medium",
    detail: "Date of birth appears in the prompt",
  },
  // Residential address: street number + street name + street-type word.
  {
    pattern: /\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,3}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|Way|Hwy|Highway|Pkwy|Parkway|Terrace|Trail|Sq|Square)\b\.?/g,
    severity: "medium",
    detail: "Residential / street address pattern found",
  },
  // Credit card without separators (13–19 digit run). The legacy 4-4-4-4
  // pattern with `[\s-]?` does technically match contiguous 16 digits, but
  // long card-shaped runs (15-digit Amex, 19-digit) and standalone runs
  // were missed.
  {
    pattern: /\b\d{13,19}\b/g,
    severity: "high",
    detail: "Long digit run that looks like a credit card number",
  },
  // "my (full / legal) name is Jane Q Smith" / "I am John Smith".
  // The prefix permits either casing of the first letter (My/my, I/i), but
  // the names themselves must be Title Case (`[A-Z][a-z]+`) so the pattern
  // doesn't fire on contextual prose like "my name is Jane and the …".
  {
    pattern: /\b(?:[Mm]y\s+(?:full\s+|legal\s+)?name\s+is|[Ii]\s+am)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]?\.?)?\s+[A-Z][a-z]+\b/g,
    severity: "medium",
    detail: "Full personal name disclosed in the prompt",
  },
];

const PROPRIETARY_PATTERNS = [
  { pattern: /\b(internal|proprietary|confidential|trade\s*secret)\b/gi, severity: "medium", detail: "Confidentiality marker found" },
  { pattern: /\b(TODO|FIXME|HACK|XXX)\b.*(?:password|secret|key|token)/gi, severity: "high", detail: "Code comment exposing sensitive context" },
  { pattern: /\/(api|internal|admin|private)\/[a-z0-9/_-]+/gi, severity: "low", detail: "Internal API path exposed" },
  { pattern: /\b(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\s+(?:FROM|INTO|SET)\s+\w+/gi, severity: "medium", detail: "Raw SQL query with schema details" },
  { pattern: /(?:function|const|let|var|class)\s+[a-zA-Z_$][\w$]*\s*(?:=|\(|{)/g, severity: "low", detail: "Source code with named functions/variables" },
];

const TOXICITY_PATTERNS = [
  { pattern: /\b(ignore\s+previous\s+instructions|disregard\s+above|forget\s+everything)\b/gi, severity: "high", detail: "Prompt injection attempt detected" },
  { pattern: /\b(jailbreak|bypass\s+filter|ignore\s+safety|override\s+rules)\b/gi, severity: "high", detail: "Safety bypass attempt" },
  { pattern: /\b(system\s*prompt|you\s+are\s+now|act\s+as\s+if|pretend\s+to\s+be)\b/gi, severity: "medium", detail: "Role manipulation attempt" },
];

function findMatches(text, pattern) {
  const results = [];
  const re = new RegExp(pattern.source, pattern.flags);
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push({ match: m[0], start: m.index, end: m.index + m[0].length });
  }
  return results;
}

// If any issue is detected, the score is capped at this value so it always
// falls into "caution" or worse — the in-page overlay will then render a
// full warning panel rather than the brief "All clear" auto-send.
const SAFE_THRESHOLD = 70;
const DETECTED_SCORE_CAP = SAFE_THRESHOLD - 5;

export function analyzePromptSafety(text) {
  const issues = [];

  const secrets = detectSecrets(text);
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

  for (const { pattern, severity, detail } of PII_PATTERNS) {
    for (const m of findMatches(text, pattern)) {
      issues.push({
        category: "pii",
        severity,
        detail,
        match: m.match,
        start: m.start,
        end: m.end,
      });
    }
  }

  for (const { pattern, severity, detail } of CASUAL_PII_PATTERNS) {
    for (const m of findMatches(text, pattern)) {
      issues.push({
        category: "pii",
        severity,
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
  // CRITICAL: any single detected issue must bring the score below the
  // "safe" threshold so the overlay shows a warning panel. Without this
  // cap, a single low-severity hit (-5) would still leave the score at 95
  // = safe, and the user would see the brief auto-send confirmation
  // instead of an actual warning. See task #113.
  if (issues.length > 0) {
    riskScore = Math.min(riskScore, DETECTED_SCORE_CAP);
  }
  riskScore = Math.max(0, riskScore);

  const level = riskScore >= SAFE_THRESHOLD ? "safe" : riskScore >= 40 ? "caution" : "danger";

  const categoryCounts = {};
  for (const issue of issues) {
    categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
  }

  let summary;
  if (issues.length === 0) {
    summary = "No issues detected. This prompt appears safe to send to AI systems.";
  } else {
    const parts = Object.entries(categoryCounts).map(([cat, count]) => `${count} ${cat.replace(/_/g, " ")}`);
    summary = `Found ${issues.length} issue${issues.length > 1 ? "s" : ""}: ${parts.join(", ")}.`;
  }

  const suggestions = [];
  const seenCategories = new Set();
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
          detail: "Replace real emails, phone numbers, SSNs, addresses, dates of birth, and credit card numbers with placeholder values like user@example.com or 555-0100.",
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
