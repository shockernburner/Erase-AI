import type { AnalysisFlag } from "./personalAnalyzer";

const TOXIC_REPLACEMENTS: Record<string, string> = {
  stupid: "uninformed",
  idiot: "person",
  moron: "person",
  dumb: "uninformed",
  loser: "person",
  pathetic: "unfortunate",
  worthless: "undervalued",
  trash: "poor quality",
  garbage: "low quality",
  disgusting: "unpleasant",
  gross: "unpleasant",
  hideous: "unattractive",
  liar: "someone being dishonest",
  fake: "inauthentic",
  fraud: "deception",
  die: "[removed]",
};

const BIAS_REPLACEMENTS: Record<string, string> = {
  mankind: "humankind",
  manpower: "workforce",
  "man-made": "synthetic",
  manmade: "synthetic",
  chairman: "chairperson",
  policeman: "police officer",
  fireman: "firefighter",
  stewardess: "flight attendant",
  mailman: "mail carrier",
  crippled: "person with a disability",
  handicapped: "person with a disability",
  retarded: "[removed]",
  lame: "inadequate",
  senile: "experiencing cognitive decline",
  "old people": "older adults",
  "the elderly": "older adults",
  "third-world": "developing",
  "third world": "developing",
  undeveloped: "developing",
  primitive: "traditional",
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rewriteContent(text: string, flags: AnalysisFlag[]): string {
  let rewritten = text;

  const sortedFlags = [...flags].sort(
    (a, b) => b.position.start - a.position.start
  );

  const processed = new Set<string>();

  for (const flag of sortedFlags) {
    const key = `${flag.position.start}:${flag.position.end}`;
    if (processed.has(key)) continue;
    processed.add(key);

    const matched = flag.matchedText;
    const matchedLower = matched.toLowerCase();

    if (flag.type === "pii") {
      const re = new RegExp(escapeRegex(matched), "g");
      rewritten = rewritten.replace(re, "[REDACTED]");
      continue;
    }

    if (flag.type === "hate_speech") {
      const re = new RegExp(escapeRegex(matched), "gi");
      rewritten = rewritten.replace(re, "[removed]");
      continue;
    }

    if (flag.type === "toxicity") {
      const replacement = TOXIC_REPLACEMENTS[matchedLower];
      if (replacement) {
        const re = new RegExp(`\\b${escapeRegex(matched)}\\b`, "gi");
        rewritten = rewritten.replace(re, replacement);
      } else {
        const re = new RegExp(`\\b${escapeRegex(matched)}\\b`, "gi");
        rewritten = rewritten.replace(re, "[removed]");
      }
      continue;
    }

    if (flag.type === "bias") {
      const replacement = BIAS_REPLACEMENTS[matchedLower];
      if (replacement) {
        const re = new RegExp(`\\b${escapeRegex(matched)}\\b`, "gi");
        rewritten = rewritten.replace(re, replacement);
      }
      continue;
    }

    // Harm-intent categories are not "fixed" by rewrite — strip matched span so
    // leftover text cannot be auto-sent as if cleared. Callers should hide
    // Sanitize & Send when block_send is true.
    if (flag.type === "child_safety" || flag.type === "violence_intent" || flag.type === "weapons_harm") {
      const re = new RegExp(escapeRegex(matched), "gi");
      rewritten = rewritten.replace(re, "[removed]");
    }
  }

  rewritten = rewritten
    .replace(/\s*\[removed\]\s*\[removed\]\s*/g, " [removed] ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return rewritten;
}
