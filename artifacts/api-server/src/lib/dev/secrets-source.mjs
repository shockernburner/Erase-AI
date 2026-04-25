// Source-of-truth detection patterns for credentials/secrets in user prompts.
// Lives in a plain .mjs file (instead of inside secrets.ts) so the api-server
// test suite can import these patterns directly via `node --test` without
// needing a TypeScript loader. The TypeScript wrapper at ./secrets.ts re-
// exports from here and adds compile-time types.
//
// Patterns deliberately bias toward catching CASUALLY-typed credentials
// users will type while testing the firewall (e.g. `sk-fake1234`,
// `Bearer abcd`, `ghp_short`), not just realistic-length secrets. False
// positives here are acceptable — the worst outcome is the user is asked
// to confirm before sending. False NEGATIVES, by contrast, undermine the
// whole point of the firewall.

export const SECRET_PATTERNS = [
  { type: "aws_access_key", pattern: /\b(AKIA[0-9A-Z]{16})\b/g, label: "AWS Access Key" },
  { type: "aws_secret_key", pattern: /\b([A-Za-z0-9/+=]{40})\b/g, label: "AWS Secret Key" },
  { type: "generic_api_key", pattern: /\b(api[_-]?key|apikey)\s*[:=]\s*["']?([A-Za-z0-9_\-]{8,})/gi, label: "API Key assignment" },
  { type: "generic_secret", pattern: /\b(secret|token|password|passwd|pwd)\s*[:=]\s*["']?([A-Za-z0-9_\-!@#$%^&*]{4,})/gi, label: "Secret/Token assignment" },
  // Bearer tokens: real ones are long, but `Bearer abcd1234` is a casual
  // test case the firewall must catch — drop the min length to 4.
  { type: "bearer_token", pattern: /Bearer\s+[A-Za-z0-9_\-\.]{4,}/gi, label: "Bearer Token" },
  { type: "jwt", pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_\-]{10,}/g, label: "JWT Token" },
  { type: "database_url", pattern: /(postgres(ql)?|mysql|mongodb(\+srv)?|redis):\/\/[^\s'"]+/gi, label: "Database Connection URL" },
  { type: "private_key", pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g, label: "Private Key" },
  // GitHub tokens: real ones are 36+ chars, but `ghp_fake` should also
  // trip the firewall. Drop the min length to 4 chars after the prefix.
  { type: "github_token", pattern: /\b(ghp_[A-Za-z0-9]{4,}|github_pat_[A-Za-z0-9_]{4,})/g, label: "GitHub Token" },
  { type: "slack_token", pattern: /\b(xoxb-|xoxp-|xoxo-)[A-Za-z0-9\-]{8,}/g, label: "Slack Token" },
  { type: "stripe_key", pattern: /\b(sk_live_|pk_live_|sk_test_|pk_test_)[A-Za-z0-9]{8,}/g, label: "Stripe Key" },
  // OpenAI keys: real ones are 40+ chars after `sk-`, but `sk-fake1234`
  // is the canonical test case in task #113. Drop the min length to 4.
  { type: "openai_key", pattern: /\bsk-[A-Za-z0-9]{4,}/g, label: "OpenAI API Key" },
  { type: "env_variable", pattern: /process\.env\.[A-Z_]{2,}/g, label: "Environment Variable Reference" },
  { type: "ip_address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, label: "IP Address" },
  { type: "email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: "Email Address" },
  { type: "ssh_key", pattern: /ssh-(rsa|ed25519|dss)\s+[A-Za-z0-9+/=]{40,}/g, label: "SSH Key" },
];

export function detectSecrets(text) {
  const matches = [];
  const seen = new Set();

  for (const { type, pattern, label } of SECRET_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const key = `${type}:${m.index}:${m[0].length}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
          type,
          pattern: label,
          match: m[0],
          start: m.index,
          end: m.index + m[0].length,
        });
      }
    }
  }

  return matches;
}

export function maskSecret(value) {
  if (value.length <= 8) return "***";
  return value.substring(0, 4) + "*".repeat(Math.min(value.length - 8, 20)) + value.substring(value.length - 4);
}
