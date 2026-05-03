// Storage-side redactor for /api/dev/{analyze,sanitize}. Trims the input
// to a fixed prefix length and masks anything that looks like a secret
// before it lands in dev_scans.input_text.
//
// Lives in its own module (rather than inline in routes/dev.ts) so the
// regression tests under tests/ can exercise it directly via
// `node --test` without standing up Express or a Postgres connection.
import { maskSecret } from "./secrets-source.mjs";
import { maskCasualSecretsInText } from "./safety-source.mjs";

export function redactInputForStorage(text) {
  let redacted = text.substring(0, 500);
  redacted = redacted.replace(
    /\b(sk-|ghp_|xoxb-|pk_live_|sk_live_|AKIA)[A-Za-z0-9_\-]{8,}/g,
    (m) => maskSecret(m),
  );
  redacted = redacted.replace(
    /(postgres(ql)?|mysql|mongodb(\+srv)?|redis):\/\/[^\s'"]+/gi,
    "[DB_URL_REDACTED]",
  );
  redacted = redacted.replace(
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END/g,
    "[PRIVATE_KEY_REDACTED]",
  );
  redacted = redacted.replace(
    /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_\-]{10,}/g,
    "[JWT_REDACTED]",
  );
  // Task #173 — mask the disclosed VALUE in casual credential phrases
  // ("my api key is hunter2" → "my api key is ***") so the natural-
  // language disclosures detected by CASUAL_SECRET_PATTERNS don't
  // round-trip through dev_scans.input_text in plain text. Run after
  // the prefix-based maskers above so an explicit "api key = sk-…"
  // value still gets the prefix-aware partial mask first.
  redacted = maskCasualSecretsInText(redacted);
  if (text.length > 500) redacted += "...";
  return redacted;
}
