// Prompt sanitizer for /api/dev/sanitize. Plain JS (no TypeScript) so that
// node:test can load it directly and the browser extension can reuse the same
// rules on-device (extension/scripts/build-local-scanner.mjs). Types live in
// ./sanitize-source.d.mts; ./sanitize.ts re-exports with those types.
import { detectSecrets, maskSecret } from "./secrets-source.mjs";

const FUNCTION_NAME_PATTERN = /(?:function|const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?:=\s*(?:async\s*)?\(|[(={])/g;
const CLASS_NAME_PATTERN = /class\s+([a-zA-Z_$][\w$]*)/g;

const PII_REPLACEMENTS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL_REDACTED]" },
  // Singapore NRIC/FIN shape (no checksum here: redacting a look-alike is harmless) and phone numbers.
  { pattern: /(?<![A-Za-z0-9])[STFGMstfgm]\d{7}[A-Za-z](?![A-Za-z0-9])/g, replacement: "[NRIC_REDACTED]" },
  { pattern: /(?<![\w+])\(?\+65\)?[\s-]?[3689]\d{3}[\s-]?\d{4}(?!\d)/g, replacement: "[PHONE_REDACTED]" },
  { pattern: /(?<=\b(?:phone|mobile|hp|tel|call|whatsapp|contact)\b[^\d\n]{0,20})(?<![\d+])[3689]\d{3}[\s-]?\d{4}(?!\d)/gi, replacement: "[PHONE_REDACTED]" },
  { pattern: /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: "[PHONE_REDACTED]" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN_REDACTED]" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[CARD_REDACTED]" },
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: "[IP_REDACTED]" },
];

export function sanitizeText(text, issues) {
  void issues;
  const changes = [];
  let result = text;
  let offset = 0;
  // Edits already applied, in original-text positions, so each PII match is
  // replaced where it was found (not at the first identical string).
  const edits = [];

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
    edits.push({ start: secret.start, end: secret.end, delta: masked.length - secret.match.length });
  }

  for (const { pattern, replacement } of PII_REPLACEMENTS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    const piiMatches = [];
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (!edits.some((e) => start < e.end && end > e.start)) {
        piiMatches.push({ match: m[0], start, end });
      }
    }

    for (const pii of piiMatches) {
      const pos = pii.start + edits.reduce((sum, e) => (e.end <= pii.start ? sum + e.delta : sum), 0);
      result = result.slice(0, pos) + replacement + result.slice(pos + pii.match.length);
      edits.push({ start: pii.start, end: pii.end, delta: replacement.length - pii.match.length });
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
