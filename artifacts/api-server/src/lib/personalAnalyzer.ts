export type AnalysisFlagType =
  | "toxicity"
  | "hate_speech"
  | "pii"
  | "bias"
  | "child_safety"
  | "violence_intent"
  | "weapons_harm";

export interface AnalysisFlag {
  type: AnalysisFlagType;
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
  { pattern: /\b(kill\s+yourself|kys)\b/gi, severity: "high", detail: "Self-harm encouragement" },
  { pattern: /\b(destroy\s+you|i\s+will\s+kill\s+you)\b/gi, severity: "high", detail: "Direct personal threat" },
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
  { pattern: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{8,}\b/g, detail: "API key detected" },
  { pattern: /\beak_[A-Za-z0-9_-]{8,}\b/g, detail: "API key detected" },
  { pattern: /\bAKIA[0-9A-Z]{12,20}\b/g, detail: "API key detected" },
  { pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/g, detail: "Google API key detected" },
  { pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, detail: "Bearer token detected" },
  { pattern: /\b(?:api[_-]?key|secret|token|bearer)\s*[:=]\s*[A-Za-z0-9_./+=-]{8,}\b/gi, detail: "API key detected" },
  { pattern: /\b(?:my\s+)?(?:google\s+|openai\s+|aws\s+|azure\s+)?(?:api(?:\s+key)?|client\s+secret|access\s+token)\s+(?:is|are|=|:)\s*[A-Za-z0-9_./+=-]{6,}\b/gi, detail: "Shared API credential phrasing" },
  { pattern: /\b(?:api|key|token|secret)\s+(?:for|to)\s+\w[\w\s]{0,40}\s+is\s+[A-Za-z0-9_./+=-]{6,}\b/gi, detail: "Shared API credential phrasing" },
  { pattern: /\b(?:client|customer|patient|employee|user|contact)(?:\s+name)?\s+(?:is\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g, detail: "Person name detected" },
];

const BIAS_PATTERNS: { pattern: RegExp; severity: "low" | "medium" | "high"; detail: string; suggestion: string }[] = [
  { pattern: /\b(mankind|manpower|man-made|manmade)\b/gi, severity: "low", detail: "Gender-biased terminology", suggestion: "Use 'humankind', 'workforce', 'artificial/synthetic'" },
  { pattern: /\b(chairman|policeman|fireman|stewardess|mailman)\b/gi, severity: "low", detail: "Gender-specific job title", suggestion: "Use gender-neutral titles: 'chairperson', 'police officer', 'firefighter', 'flight attendant', 'mail carrier'" },
  { pattern: /\b(crippled|handicapped|retarded|lame)\b/gi, severity: "medium", detail: "Ableist language", suggestion: "Use person-first language: 'person with a disability'" },
  { pattern: /\b(old\s+people|the\s+elderly|senile)\b/gi, severity: "low", detail: "Age-biased language", suggestion: "Use 'older adults' or 'seniors'" },
  { pattern: /\b(third[\s-]world|undeveloped|primitive)\b/gi, severity: "medium", detail: "Culturally biased terminology", suggestion: "Use 'developing nations' or 'low-income countries'" },
];

/** Explicit child-sexual / exploitation language — block by default. */
const CHILD_SAFETY_PATTERNS: { pattern: RegExp; severity: "high"; detail: string }[] = [
  { pattern: /\b(child\s*porn|csam|cp\s+pics?|underage\s+(sex|nude|porn)|pedo(phile)?|lolita)\b/gi, severity: "high", detail: "Child sexual exploitation language" },
  { pattern: /\b(sexual(?:ly)?\s+(?:attracted\s+to|interested\s+in)\s+(?:a\s+)?(?:child|kid|minor|teen(?:ager)?s?|girl|boy)\b)/gi, severity: "high", detail: "Sexual interest in a minor" },
  { pattern: /\b((?:nude|naked|sexual)\s+(?:photos?|pics?|videos?|images?)\s+of\s+(?:a\s+)?(?:child|kid|minor|underage))\b/gi, severity: "high", detail: "Request for sexual images of a minor" },
  { pattern: /\b(how\s+to\s+(?:groom|lure|seduce)\s+(?:a\s+)?(?:child|kid|minor|teen))\b/gi, severity: "high", detail: "Child grooming / exploitation guidance" },
];

/** Direct mass-harm / attack planning — block by default. */
const VIOLENCE_INTENT_PATTERNS: { pattern: RegExp; severity: "high"; detail: string }[] = [
  { pattern: /\b(mass\s+shooting|school\s+shooting|shoot\s+up\s+(?:a\s+)?(?:school|campus|mall|church))\b/gi, severity: "high", detail: "Mass shooting / attack planning language" },
  { pattern: /\b(how\s+to\s+(?:build|make|assemble)\s+(?:a\s+)?(?:bomb|explosive|pipe\s+bomb|ied))\b/gi, severity: "high", detail: "Explosive device construction guidance" },
  { pattern: /\b(kill\s+(?:as\s+many|everyone|students?|children|kids)\b)/gi, severity: "high", detail: "Mass-casualty harm language" },
  { pattern: /\b(plan(?:ning)?\s+(?:an?\s+)?(?:attack|massacre|rampage))\b/gi, severity: "high", detail: "Attack planning language" },
];

/** Weapons mentions — medium alone; escalated when combined with soft targets. */
const WEAPONS_PATTERNS: { pattern: RegExp; detail: string }[] = [
  { pattern: /\b(firearm|handgun|shotgun|rifle|assault\s+rifle|ar-?15|glock|ammo|ammunition|silencer|suppressor)\b/gi, detail: "Firearm / ammunition reference" },
  { pattern: /\b(buy\s+(?:a\s+)?gun|get\s+(?:a\s+)?gun|illegal\s+(?:gun|firearm)|ghost\s+gun)\b/gi, detail: "Firearm acquisition language" },
];

const SOFT_TARGET_PATTERNS: RegExp[] = [
  /\b(school|campus|classroom|students?|kindergarten|elementary|high\s+school|university|college)\b/gi,
  /\b(when\s+(?:are|is)\s+(?:the\s+)?(?:most|many|lots?\s+of)\s+(?:students?|kids|children)\b)/gi,
  /\b((?:busiest|crowded|peak)\s+(?:time|hour|period).{0,40}(?:school|campus|students?|kids))\b/gi,
  /\b(how\s+many\s+(?:students?|kids|children).{0,40}(?:school|campus|present|there))\b/gi,
];

function findMatches(text: string, pattern: RegExp): { match: string; start: number; end: number }[] {
  const results: { match: string; start: number; end: number }[] = [];
  const re = new RegExp(pattern.source, pattern.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ match: m[0], start: m.index, end: m.index + m[0].length });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return results;
}

function pushFlags(
  text: string,
  patterns: { pattern: RegExp; severity: "low" | "medium" | "high"; detail: string }[],
  type: AnalysisFlagType,
  flags: AnalysisFlag[],
  suggestions: AnalysisSuggestion[],
  suggestionMessage: (match: string, detail: string) => string,
) {
  for (const { pattern, severity, detail } of patterns) {
    for (const { match, start, end } of findMatches(text, pattern)) {
      flags.push({ type, severity, detail, matchedText: match, position: { start, end } });
      suggestions.push({
        type,
        message: suggestionMessage(match, detail),
        original: match,
        suggested: "[removed]",
      });
    }
  }
}

function hasSoftTargetContext(text: string): { hit: boolean; match: string; start: number; end: number } {
  for (const pattern of SOFT_TARGET_PATTERNS) {
    const matches = findMatches(text, pattern);
    if (matches.length > 0) {
      return { hit: true, match: matches[0].match, start: matches[0].start, end: matches[0].end };
    }
  }
  return { hit: false, match: "", start: 0, end: 0 };
}

/**
 * Combo rule: firearm language + school/crowd-timing context → high-risk
 * weapons_harm / violence_intent (block by default via riskScorer).
 */
function applyWeaponsSoftTargetCombo(
  text: string,
  flags: AnalysisFlag[],
  suggestions: AnalysisSuggestion[],
) {
  const weaponHits: { match: string; start: number; end: number; detail: string }[] = [];
  for (const { pattern, detail } of WEAPONS_PATTERNS) {
    for (const hit of findMatches(text, pattern)) {
      weaponHits.push({ ...hit, detail });
    }
  }
  if (weaponHits.length === 0) return;

  const soft = hasSoftTargetContext(text);
  if (soft.hit) {
    const spanStart = Math.min(weaponHits[0].start, soft.start);
    const spanEnd = Math.max(weaponHits[0].end, soft.end);
    const matchedText = text.slice(spanStart, spanEnd).slice(0, 120);
    flags.push({
      type: "violence_intent",
      severity: "high",
      detail: "Firearm language combined with school/crowd timing — possible mass-harm planning",
      matchedText,
      position: { start: spanStart, end: spanEnd },
    });
    suggestions.push({
      type: "violence_intent",
      message: "This prompt mixes weapons with school or crowd timing. Do not send. Seek help if you or someone else is in crisis.",
      original: matchedText,
      suggested: "[removed]",
    });
    return;
  }

  for (const hit of weaponHits) {
    flags.push({
      type: "weapons_harm",
      severity: "medium",
      detail: hit.detail,
      matchedText: hit.match,
      position: { start: hit.start, end: hit.end },
    });
    suggestions.push({
      type: "weapons_harm",
      message: `Review firearm-related content before sending to a public AI: "${hit.match}"`,
      original: hit.match,
      suggested: "[removed]",
    });
  }
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

  pushFlags(
    text,
    CHILD_SAFETY_PATTERNS,
    "child_safety",
    flags,
    suggestions,
    (match) => `Child-safety risk — do not send: "${match}"`,
  );

  pushFlags(
    text,
    VIOLENCE_INTENT_PATTERNS,
    "violence_intent",
    flags,
    suggestions,
    (match) => `Violence / attack-planning risk — do not send: "${match}"`,
  );

  applyWeaponsSoftTargetCombo(text, flags, suggestions);

  return { flags, suggestions };
}

/** Categories that must never be "sanitized and sent" — Cancel only (or policy block). */
export const BLOCK_BY_DEFAULT_TYPES: ReadonlySet<AnalysisFlagType> = new Set([
  "child_safety",
  "violence_intent",
]);

export function hasBlockByDefaultFlags(flags: AnalysisFlag[]): boolean {
  return flags.some(
    (f) =>
      BLOCK_BY_DEFAULT_TYPES.has(f.type) ||
      (f.type === "weapons_harm" && f.severity === "high") ||
      (f.severity === "high" && (f.type === "hate_speech" || f.type === "child_safety" || f.type === "violence_intent")),
  );
}
