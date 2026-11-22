// What the server keeps of a message in scan history.
//
// Personal data and secrets are replaced with whole labels BEFORE the text is cut (never partly masked,
// so no first or last characters survive), and a value that straddles the cut is never kept as a
// fragment. In no-retention mode no message text is stored at all.
// Plain JS so `node --test` can load it without Express or Postgres; types in the .d.mts file.
import { detectSecrets } from "./secrets-source.mjs";
import { maskCasualSecretsInText } from "./safety-source.mjs";

export const STORED_EXCERPT_MAX = 200;
export const NOT_STORED = "[message not stored]";
// Enough text for the patterns to see a value that begins before the cut and ends after it.
const LOOKAHEAD = 400;

const LABELLED = [
  [/-----BEGIN\s+(?:[A-Z]+\s+)?PRIVATE\s+KEY-----[\s\S]*?(?:-----END[^-]*-----|$)/g, "[PRIVATE_KEY_REDACTED]"],
  [/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s'"]+/gi, "[DB_URL_REDACTED]"],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[JWT_REDACTED]"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL_REDACTED]"],
  [/\b(?:pass(?:word|code|wd)|pwd|pin)\s*(?:is|are|=|:)\s*["']?\S+/gi, "[CREDENTIAL_REDACTED]"],
];
const PERSONAL = [
  [/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD_REDACTED]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]"],
  [/\b[STFGM]\d{7}[A-Z]\b/g, "[NATIONAL_ID_REDACTED]"],
  [/(?:\+?(?:65|852)[\s-]?)?\b[3689]\d{3}[\s-]?\d{4}\b/g, "[PHONE_REDACTED]"],
  [/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE_REDACTED]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP_REDACTED]"],
];

function replaceSecretSpans(text) {
  const spans = detectSecrets(text).map((s) => [s.start, s.end]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of spans) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  let out = "";
  let at = 0;
  for (const [s, e] of merged) {
    out += text.slice(at, s) + "[SECRET_REDACTED]";
    at = e;
  }
  return out + text.slice(at);
}

export function excerptForStorage(text, options = {}) {
  if (options && options.zeroRetention) return NOT_STORED;
  if (typeof text !== "string" || text.length === 0) return "";
  let s = text.slice(0, LOOKAHEAD);
  for (const [re, label] of LABELLED) s = s.replace(re, label);
  s = replaceSecretSpans(s);
  for (const [re, label] of PERSONAL) s = s.replace(re, label);
  s = maskCasualSecretsInText(s);
  const clipped = s.length > STORED_EXCERPT_MAX || text.length > LOOKAHEAD;
  return s.slice(0, STORED_EXCERPT_MAX) + (clipped ? "..." : "");
}

// Findings are stored by type, severity and position only: never the value that was matched.
export function flagsForStorage(flags) {
  if (!Array.isArray(flags)) return [];
  return flags.map((f) => (f && typeof f === "object" ? { ...f, matchedText: "[REDACTED]" } : f));
}

export function suggestionsForStorage(suggestions) {
  if (!Array.isArray(suggestions)) return [];
  return suggestions.map((x) => (x && typeof x === "object" ? { ...x, original: "[REDACTED]" } : x));
}
