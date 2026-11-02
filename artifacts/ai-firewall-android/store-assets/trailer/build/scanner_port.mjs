// Line-for-line JS port of LocalRiskScanner.kt (rules + redact merge), used ONLY to compute what the
// app's on-device scanner returns for the trailer's demo prompt, so the video shows real output.
const R = (src, f = "g") => new RegExp(src, f);
const RULES = [
  ["Shared API credential", R("(?:api(?:\\s+key)?|aws(?:\\s+access)?\\s+key|client\\s+secret|access\\s+token|secret|bearer|password|passwd|pwd)\\s*(?:is|=|:|for)?\\s*['\"]?\\S{6,}", "gi")],
  ["API key detected", R("\\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{8,}\\b")],
  ["Google API key detected", R("\\bAIza[0-9A-Za-z_-]{20,}\\b")],
  ["AWS access key", R("AKIA[0-9A-Z]{16}", "gi")],
  ["AWS session key", R("ASIA[0-9A-Z]{16}", "gi")],
  ["GitHub token", R("\\b(?:gh[posur]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\\b")],
  ["Slack token", R("\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b")],
  ["AI provider API key", R("\\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\\b")],
  ["JWT token", R("\\beyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}")],
  ["Private key", R("-----BEGIN[A-Z ]*PRIVATE KEY-----")],
  ["SSH key", R("\\bssh-(?:rsa|ed25519|dss)\\s+[A-Za-z0-9+/=]{40,}")],
  ["Database connection URL", R("\\b(?:postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis)://\\S{3,}", "gi")],
  ["Payment card number", R("\\b\\d(?:[ -]?\\d){12,18}\\b"), (m) => luhn(m[0])],
  ["Email address", R("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b")],
  ["Phone number", R("\\b(?:\\+?\\d{1,3}[-.\\s]?)?(?:\\(\\d{3}\\)|\\d{3})[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b")],
];
function luhn(c) { const d = c.replace(/\D/g, ""); if (d.length < 13 || d.length > 19) return false; let s = 0, dbl = false; for (let i = d.length - 1; i >= 0; i--) { let x = +d[i]; if (dbl) { x *= 2; if (x > 9) x -= 9; } s += x; dbl = !dbl; } return s % 10 === 0; }
const PII_LABELS = RULES.map((r) => r[0]).filter((l) => l !== "Payment card number" || true);
const PLACEHOLDER = new RegExp("\\[(?:" + PII_LABELS.map((l) => l.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\]", "g");
export function scan(text) {
  const findings = [], spans = [];
  const ph = [...text.matchAll(PLACEHOLDER)].map((m) => [m.index, m.index + m[0].length - 1]);
  for (const [label, re, accept] of RULES) {
    re.lastIndex = 0;
    const ms = [...text.matchAll(re)].filter((m) => !ph.some(([a, b]) => m.index >= a && m.index <= b))
      .filter((m) => (accept ? accept(m) : true));
    if (!ms.length) continue;
    ms.forEach((m) => spans.push([m.index, m.index + m[0].length - 1, label]));
    findings.push({ type: "PII", label, severity: "high", start: ms[0].index, end: ms[0].index + ms[0][0].length });
  }
  return { findings, spans, level: findings.length ? "high" : "low" };
}
export function redact(text) {
  const { spans } = scan(text);
  const merged = [];
  for (const [a, b, label] of [...spans].sort((x, y) => x[0] - y[0])) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b, label]);
  }
  let out = text;
  for (const [a, b, label] of merged.reverse()) out = out.slice(0, a) + `[${label.toUpperCase()}]` + out.slice(b + 1);
  return out;
}
if (process.argv[1].endsWith("scanner_port.mjs")) {
  for (const t of process.argv.slice(2)) {
    const s = scan(t);
    console.log(JSON.stringify({ text: t, labels: s.findings.map((f) => `${f.label} (${f.type})`), level: s.level, redacted: redact(t) }, null, 1));
    console.log("rescan after redact (PII findings):", scan(redact(t)).findings.length);
  }
}
