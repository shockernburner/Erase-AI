export interface AnalysisFlag {
  type: "toxicity" | "hate_speech" | "pii" | "bias";
  severity: "low" | "medium" | "high";
  detail: string;
  matchedText: string;
  position: { start: number; end: number };
}

export interface AnalysisSuggestion {
  type: string;
  message: string;
  original: string;
  suggested: string;
}

export interface AnalysisResult {
  flags: AnalysisFlag[];
  suggestions: AnalysisSuggestion[];
}

const TOXIC_PATTERNS: { pattern: RegExp; severity: "low" | "medium" | "high"; detail: string }[] = [
  { pattern: /\b(stupid|idiot|moron|dumb|loser|pathetic|worthless)\b/gi, severity: "medium", detail: "Insulting or demeaning language" },
  { pattern: /\b(shut\s+up|go\s+away|nobody\s+cares|you\s+suck)\b/gi, severity: "medium", detail: "Dismissive or hostile language" },
  { pattern: /\b(kill\s+yourself|die|threat(en)?|destroy\s+you)\b/gi, severity: "high", detail: "Threatening or violent language" },
  { pattern: /\b(trash|garbage|disgusting|gross|hideous)\b/gi, severity: "low", detail: "Mildly toxic language" },
  { pattern: /\b(scam(mer)?|fraud|fake|liar|cheat(er)?)\b/gi, severity: "medium", detail: "Accusatory language" },
];

const HATE_SPEECH_PATTERNS: { pattern: RegExp; severity: "high"; detail: string }[] = [
  { pattern: /\b(go\s+back\s+to\s+your\s+country|illegals?|invasion)\b/gi, severity: "high", detail: "Xenophobic language" },
  { pattern: /\b(subhuman|inferior\s+race|master\s+race|ethnic\s+cleansing)\b/gi, severity: "high", detail: "Racial supremacy language" },
  { pattern: /\b(all\s+\w+\s+are\s+(criminals?|terrorists?|lazy|stupid|evil))\b/gi, severity: "high", detail: "Group-based stereotyping" },
];

const PII_PATTERNS: { pattern: RegExp; detail: string }[] = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, detail: "Email address detected" },
  { pattern: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, detail: "Phone number detected" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, detail: "SSN-like pattern detected" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, detail: "Credit card number detected" },
  { pattern: /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)\b/gi, detail: "Street address detected" },
  { pattern: /\b(passport|license|dl)\s*#?\s*:?\s*[A-Z0-9]{6,12}\b/gi, detail: "ID document number detected" },
];

const BIAS_PATTERNS: { pattern: RegExp; severity: "low" | "medium" | "high"; detail: string; suggestion: string }[] = [
  { pattern: /\b(mankind|manpower|man-made|manmade)\b/gi, severity: "low", detail: "Gender-biased terminology", suggestion: "Use 'humankind', 'workforce', 'artificial/synthetic'" },
  { pattern: /\b(chairman|policeman|fireman|stewardess|mailman)\b/gi, severity: "low", detail: "Gender-specific job title", suggestion: "Use gender-neutral titles: 'chairperson', 'police officer', 'firefighter', 'flight attendant', 'mail carrier'" },
  { pattern: /\b(crippled|handicapped|retarded|lame)\b/gi, severity: "medium", detail: "Ableist language", suggestion: "Use person-first language: 'person with a disability'" },
  { pattern: /\b(old\s+people|the\s+elderly|senile)\b/gi, severity: "low", detail: "Age-biased language", suggestion: "Use 'older adults' or 'seniors'" },
  { pattern: /\b(third[\s-]world|undeveloped|primitive)\b/gi, severity: "medium", detail: "Culturally biased terminology", suggestion: "Use 'developing nations' or 'low-income countries'" },
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

export function analyzeText(text: string): AnalysisResult {
  const flags: AnalysisFlag[] = [];
  const suggestions: AnalysisSuggestion[] = [];

  for (const { pattern, severity, detail } of TOXIC_PATTERNS) {
    for (const { match, start, end } of findMatches(text, pattern)) {
      flags.push({ type: "toxicity", severity, detail, matchedText: match, position: { start, end } });
      suggestions.push({ type: "toxicity", message: `Consider removing or rephrasing "${match}"`, original: match, suggested: "[removed]" });
    }
  }

  for (const { pattern, severity, detail } of HATE_SPEECH_PATTERNS) {
    for (const { match, start, end } of findMatches(text, pattern)) {
      flags.push({ type: "hate_speech", severity, detail, matchedText: match, position: { start, end } });
      suggestions.push({ type: "hate_speech", message: `Remove hate speech: "${match}"`, original: match, suggested: "[removed]" });
    }
  }

  for (const { pattern, detail } of PII_PATTERNS) {
    for (const { match, start, end } of findMatches(text, pattern)) {
      flags.push({ type: "pii", severity: "high", detail, matchedText: match, position: { start, end } });
      suggestions.push({ type: "pii", message: `Remove personal information: "${match}"`, original: match, suggested: "[REDACTED]" });
    }
  }

  for (const { pattern, severity, detail, suggestion } of BIAS_PATTERNS) {
    for (const { match, start, end } of findMatches(text, pattern)) {
      flags.push({ type: "bias", severity, detail, matchedText: match, position: { start, end } });
      suggestions.push({ type: "bias", message: suggestion, original: match, suggested: suggestion.split("'")[1] || match });
    }
  }

  return { flags, suggestions };
}
