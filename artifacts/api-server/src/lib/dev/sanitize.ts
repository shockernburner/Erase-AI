import { detectSecrets, maskSecret } from "./secrets";
import type { SafetyIssue } from "./safety";

export interface SanitizeResult {
  sanitized: string;
  changes: SanitizeChange[];
}

export interface SanitizeChange {
  category: string;
  original: string;
  replacement: string;
  start: number;
  end: number;
}

const FUNCTION_NAME_PATTERN = /(?:function|const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?:=\s*(?:async\s*)?\(|[(={])/g;
const CLASS_NAME_PATTERN = /class\s+([a-zA-Z_$][\w$]*)/g;

const PII_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL_REDACTED]" },
  { pattern: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: "[PHONE_REDACTED]" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN_REDACTED]" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[CARD_REDACTED]" },
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: "[IP_REDACTED]" },
];

export function sanitizeText(text: string, issues?: SafetyIssue[]): SanitizeResult {
  const changes: SanitizeChange[] = [];
  let result = text;
  let offset = 0;

  const secrets = detectSecrets(text);
  const secretsByPosition = secrets.sort((a, b) => a.start - b.start);

  for (const secret of secretsByPosition) {
    const masked = maskSecret(secret.match);
    const adjustedStart = secret.start + offset;
    const adjustedEnd = secret.end + offset;
    result = result.substring(0, adjustedStart) + masked + result.substring(adjustedEnd);
    changes.push({
      category: "secret_exposure",
      original: secret.match,
      replacement: masked,
      start: secret.start,
      end: secret.end,
    });
    offset += masked.length - secret.match.length;
  }

  for (const { pattern, replacement } of PII_REPLACEMENTS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    const piiMatches: { match: string; start: number; end: number }[] = [];
    while ((m = re.exec(text)) !== null) {
      const alreadyCovered = secrets.some(s =>
        m!.index >= s.start && m!.index + m![0].length <= s.end
      );
      if (!alreadyCovered) {
        piiMatches.push({ match: m[0], start: m.index, end: m.index + m[0].length });
      }
    }

    for (const pii of piiMatches) {
      result = result.replace(pii.match, replacement);
      changes.push({
        category: "pii",
        original: pii.match,
        replacement,
        start: pii.start,
        end: pii.end,
      });
    }
  }

  let funcCounter = 1;
  result = result.replace(FUNCTION_NAME_PATTERN, (full, name) => {
    const abstractName = `func_${funcCounter++}`;
    changes.push({
      category: "proprietary_logic",
      original: name,
      replacement: abstractName,
      start: 0,
      end: 0,
    });
    return full.replace(name, abstractName);
  });

  let classCounter = 1;
  result = result.replace(CLASS_NAME_PATTERN, (full, name) => {
    const abstractName = `Class_${classCounter++}`;
    changes.push({
      category: "proprietary_logic",
      original: name,
      replacement: abstractName,
      start: 0,
      end: 0,
    });
    return full.replace(name, abstractName);
  });

  return { sanitized: result, changes };
}
