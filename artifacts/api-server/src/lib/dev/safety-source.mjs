// Safety analyzer for user prompts. Patterns intentionally err toward
// catching casually-typed sensitive content over false-negatives, but
// are paired with lightweight context validators so prose like
// "internal combustion engine", "ISBN 9781234567897", or
// "the 3 Mile Trail" doesn't trip the warning panel.
import { detectSecrets } from "./secrets-source.mjs";

// --- shared helpers used by the casually-typed pattern validators ---

// Luhn checksum for unseparated 13–19 digit runs. Real card numbers
// pass; random ids, timestamps, and ISBN-13 codes statistically don't.
function luhnValid(digits) {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    const n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    let v = n;
    if (alt) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const CARD_CONTEXT_RE = /\b(?:card|credit|debit|visa|mastercard|master\s*card|amex|american\s+express|discover|cvv|cvc|expir(?:y|es|ation)|cc\b|billing|charge|payment\s+(?:method|info|details))\b/i;

function hasCardContext(text, start, end) {
  const before = text.slice(Math.max(0, start - 40), start);
  const after = text.slice(end, end + 40);
  return CARD_CONTEXT_RE.test(before) || CARD_CONTEXT_RE.test(after);
}

const ADDRESS_BEFORE_RE = /\b(?:live[sd]?|residing|reside[sd]?|address(?:es)?|ship(?:ping|ped|s)?|deliver(?:y|ed|ies|s)?|mail(?:ed|ing|s|\s+(?:to|at))?|located|residence|apartment|apt\.?|suite|ste\.?|unit|po\s*box|moving|moved|sent|drop\s*(?:off|ped)|home\s+(?:address|is\s+at)|located\s+at|find\s+me\s+at)\b/i;
const US_STATE_OR_ZIP_RE = /^[\s,.]{0,3}(?:[A-Z][a-zA-Z]+(?:[\s,]+[A-Z][a-zA-Z]+){0,2}[\s,]+)?(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b|^[\s,.]{0,3}\d{5}(?:-\d{4})?\b/;

function hasAddressContext(text, start, end) {
  const before = text.slice(Math.max(0, start - 60), start);
  const after = text.slice(end, end + 60);
  if (ADDRESS_BEFORE_RE.test(before)) return true;
  if (US_STATE_OR_ZIP_RE.test(after)) return true;
  return false;
}

// --- pattern definitions ---

const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, severity: "high", detail: "Email address found in prompt" },
  // Phone numbers: either separated (dash/dot/space between every block)
  // or a clean 10-digit / 11-digit-with-1 run. Avoids matching pure
  // 12-13 digit timestamps or ISBNs that incidentally contain a
  // valid 3-3-4 split.
  { pattern: /\b(?:\+?\d{1,3}[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, severity: "high", detail: "Phone number found in prompt" },
  { pattern: /\b(?:\+?1[-.\s]?)?\d{10}\b/g, severity: "high", detail: "Phone number found in prompt" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, severity: "high", detail: "SSN-like pattern found" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, severity: "high", detail: "Credit card number found" },
];

// Contextual / casually-typed PII shapes (added v1.3.3).
const CASUAL_PII_PATTERNS = [
  {
    pattern: /\b(?:password|passwd|pwd|passcode|pin)\s*(?:is|=|:)\s*\S+/gi,
    severity: "high",
    detail: "Password or PIN appears to be disclosed in plain text",
  },
  {
    pattern: /\b(?:bank\s+account|account|acct|acc)\s*(?:number|num|no|#)?\s*(?:is|=|:)?\s*\d{4,}/gi,
    severity: "high",
    detail: "Bank/account number appears to be disclosed",
  },
  {
    pattern: /\b(?:social\s*security(?:\s*number|\s*#)?|ssn|national\s+id|tax\s+id|tin)\s*(?:is|=|:|#)?\s*[\d\s\-]{4,}/gi,
    severity: "high",
    detail: "Government identification number (SSN / tax ID / national ID) disclosed",
  },
  {
    pattern: /\b\d{3}\s\d{2}\s\d{4}\b/g,
    severity: "high",
    detail: "SSN-like pattern (space-separated) found",
  },
  {
    pattern: /\b(?:dob|d\.?o\.?b\.?|date\s+of\s+birth|birth\s*date|birthday|born(?:\s+on)?)\s*(?:is|=|:|on)?\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/gi,
    severity: "medium",
    detail: "Date of birth appears in the prompt",
  },
  {
    // Street number + 1-4 Title-Case words + street-type suffix.
    // Tightened (task #115): requires either an address-context word
    // before the candidate (live, ship, mail, address, apartment, …)
    // or a US state code / ZIP after it. Otherwise prose like
    // "the 3 Mile Trail near the visitor center" won't fire.
    pattern: /\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,3}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|Way|Hwy|Highway|Pkwy|Parkway|Terrace|Trail|Sq|Square)\b\.?/g,
    severity: "medium",
    detail: "Residential / street address pattern found",
    validate: (text, m) => hasAddressContext(text, m.start, m.end),
  },
  {
    // 13–19 digit run for cards without separators (covers Amex 15, 19-digit).
    // Tightened (task #115): only flag if Luhn checksum passes (as real
    // card numbers do) or there's a card-related context word nearby.
    // Otherwise unix-ms timestamps and ISBN-13s would all fire.
    pattern: /\b\d{13,19}\b/g,
    severity: "high",
    detail: "Long digit run that looks like a credit card number",
    validate: (text, m) => luhnValid(m.match) || hasCardContext(text, m.start, m.end),
  },
  {
    // Names must be Title Case so prose like "my name is Jane and the …" doesn't trip.
    pattern: /\b(?:[Mm]y\s+(?:full\s+|legal\s+)?name\s+is|[Ii]\s+am)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]?\.?)?\s+[A-Z][a-z]+\b/g,
    severity: "medium",
    detail: "Full personal name disclosed in the prompt",
  },
];

// Casually-typed credential disclosures (added task #172).
// Real users type "my api key is hunter2" / "the prod token is xyz" /
// "credentials: admin / hunter2" rather than the strict `key=value` shape
// the existing generic_api_key / generic_secret regex requires. Without
// these the firewall lets natural-language credential leaks through.
//
// Pattern shape mirrors the established casual rules: a fixed credential
// noun phrase, then an explicit assignment-style connector (is | are | =
// | :), then a value. We require the connector + value so prose like
// "I forgot my api key" / "what's an api key?" / "the api is slow" /
// "the API key parameter accepts a string" stays clean.
//
// Additionally, when the connector is the natural-language "is"/"are"
// (which is high false-positive surface — "api key is required",
// "token is valid", "credentials are strong"), the value must also look
// credential-shaped: contain a digit / underscore / dash / special char,
// or be mixed-case. A pure-letter dictionary word is treated as prose.
// Explicit assignment connectors (= or :) stay permissive because they
// are very rarely used in natural prose for these nouns.
//
// Pushed into the "secret_exposure" category in analyzePromptSafety()
// so the existing suggestion text ("Remove or mask all secrets…") fires
// without any new suggestion plumbing. Multi-word matches take priority
// over single-word ones via overlap dedupe so "api token is X" produces
// exactly one issue.
const CASUAL_SECRET_PATTERNS = [
  {
    // Multi-word credential nouns: "api key", "api token", "access key",
    // "secret key", "client secret", "bearer token", "refresh token",
    // "auth token". Separator between the two words is space, hyphen,
    // or underscore so "api_key is X" and "api-token = X" both fire.
    pattern: /\b(?:api[_\s-]?(?:key|token)|access[_\s-]?key|secret[_\s-]?key|client[_\s-]?secret|bearer[_\s-]?token|refresh[_\s-]?token|auth[_\s-]?token)\s*(?:is|are|=|:)\s*["']?\S{4,}/gi,
    severity: "high",
    detail: "Credential disclosed in plain text (api/access/secret/auth/refresh/bearer)",
  },
  {
    // Single-word nouns "secret" / "token" / "credentials" — same shape,
    // entropy guard handles the wider false-positive surface.
    pattern: /\b(?:credentials?|secret|token)\s*(?:is|are|=|:)\s*["']?\S{4,}/gi,
    severity: "high",
    detail: "Credential disclosed in plain text (secret/token/credentials)",
  },
];

// Parse a casual-secret regex match into its connector + value parts so
// the entropy guard below can decide whether the value looks like a real
// credential or just continuing prose.
function parseCasualSecretMatch(matchStr) {
  // The original regex (above) already anchors the connector after the
  // credential noun. Here we re-extract it: prefer the symbolic
  // connectors (= / :) which are non-word chars and therefore have no
  // \b around them; fall back to whole-word "is" / "are" so we don't
  // accidentally match the "is" inside another word.
  const sym = /([=:])\s*["']?(\S+)/.exec(matchStr);
  if (sym) return { connector: sym[1], value: sym[2].replace(/["']$/, "") };
  const word = /\b(is|are)\b\s*["']?(\S+)/i.exec(matchStr);
  if (word) return { connector: word[1].toLowerCase(), value: word[2].replace(/["']$/, "") };
  return null;
}

// Entropy heuristic for natural-language ("is"/"are") connectors. A
// pure-letter token like "required" / "valid" / "public" / "strong" /
// "optional" is prose, not a credential. We also have to reject:
//   - prose with terminal punctuation ("valid.", "optional,",
//     "public!") — strip surrounding quotes/brackets and trailing
//     sentence punctuation before the entropy check so `.` `,` `!`
//     don't get counted as "credential entropy".
//   - Title Case single words ("Required", "Optional", "Paris") —
//     these are still prose, not credentials.
function looksLikeCredentialValue(value) {
  const v = value
    .replace(/^["'`(\[<{]+/, "")
    .replace(/["'`)\]>}.,;:!?]+$/, "");
  if (v.length < 4) return false;
  // Has a digit, underscore, dash, or other special char → credential-y.
  if (/[\d_\-!@#$%^&*+/=]/.test(v)) return true;
  // Title Case single word ("Required", "Paris") is prose.
  if (/^[A-Z][a-z]+$/.test(v)) return false;
  // All-letters: must be genuinely mixed case (multiple case transitions)
  // to count as a credential.
  return /[a-z]/.test(v) && /[A-Z]/.test(v);
}

function pushCasualSecretIssues(text, issues) {
  const candidates = [];
  for (const cfg of CASUAL_SECRET_PATTERNS) {
    for (const m of findMatches(text, cfg.pattern)) {
      const parsed = parseCasualSecretMatch(m.match);
      if (!parsed) continue;
      // Permissive for explicit assignment connectors; entropy-guarded
      // for the natural-language "is"/"are".
      if (parsed.connector === "is" || parsed.connector === "are") {
        if (!looksLikeCredentialValue(parsed.value)) continue;
      }
      candidates.push({
        start: m.start,
        end: m.end,
        match: m.match,
        severity: cfg.severity,
        detail: cfg.detail,
      });
    }
  }
  // Dedupe overlapping matches (multi-word pattern should win over the
  // narrower single-word one when both fire on the same span). Sort by
  // start asc, then by length desc so the longer match is kept first.
  candidates.sort(
    (a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start),
  );
  let lastEnd = -1;
  for (const c of candidates) {
    if (c.start < lastEnd) continue;
    issues.push({
      category: "secret_exposure",
      severity: c.severity,
      detail: c.detail,
      match: c.match,
      start: c.start,
      end: c.end,
    });
    lastEnd = c.end;
  }
}

const PROPRIETARY_PATTERNS = [
  // "internal" alone matches lots of harmless prose ("internal combustion
  // engine", "internal monologue", "internal organs"). Require a
  // business/technical follower so we keep flagging real leakage like
  // "internal API", "internal docs", "internal wiki" without warning on
  // every middle-school biology question.
  { pattern: /\binternal\s+(?:api|use|only|tool|team|doc(?:s|ument(?:s|ation)?)?|server|service|endpoint|repo(?:sitory)?|wiki|notes?|memo|spec(?:s|ification)?|infrastructure|systems?|policy|policies|process(?:es)?|roadmap|review|metric)s?\b/gi, severity: "medium", detail: "Confidentiality marker found" },
  { pattern: /\b(proprietary|confidential|trade\s*secret)\b/gi, severity: "medium", detail: "Confidentiality marker found" },
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

// Any detected issue caps the score below SAFE_THRESHOLD so the overlay
// renders a warning panel rather than the brief "All clear" auto-send.
const SAFE_THRESHOLD = 70;
const DETECTED_SCORE_CAP = SAFE_THRESHOLD - 5;

function pushPatternIssues(text, patterns, category, issues) {
  for (const cfg of patterns) {
    const { pattern, severity, detail, validate } = cfg;
    for (const m of findMatches(text, pattern)) {
      if (validate && !validate(text, m)) continue;
      issues.push({
        category,
        severity,
        detail,
        match: m.match,
        start: m.start,
        end: m.end,
      });
    }
  }
}

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

  pushPatternIssues(text, PII_PATTERNS, "pii", issues);
  pushPatternIssues(text, CASUAL_PII_PATTERNS, "pii", issues);
  pushCasualSecretIssues(text, issues);
  pushPatternIssues(text, PROPRIETARY_PATTERNS, "proprietary_logic", issues);
  pushPatternIssues(text, TOXICITY_PATTERNS, "toxicity", issues);

  let riskScore = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": riskScore -= 30; break;
      case "high": riskScore -= 20; break;
      case "medium": riskScore -= 10; break;
      case "low": riskScore -= 5; break;
    }
  }
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
