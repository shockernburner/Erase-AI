import { Braces, KeyRound, ShieldCheck, Timer } from "lucide-react";
import { SeoPage, CtaButton, RelatedLinks } from "./SeoLayout";
import { usePageMeta } from "./useSeoMeta";

const BASE = import.meta.env.BASE_URL;
const API = "https://eraseai.ai/api/dev";

const CURL_ANALYZE = `curl -X POST ${API}/analyze \\
  -H "Authorization: Bearer eak_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "My AWS key is AKIAIOSFODNN7EXAMPLE, email me at jo@example.com"}'`;

const RESPONSE_ANALYZE = `{
  "riskScore": 40,
  "level": "caution",
  "issues": [
    {
      "category": "secret_exposure",
      "severity": "high",
      "detail": "AWS Access Key: detected in input",
      "match": "AKIAIOSFODNN7EXAMPLE",
      "start": 14,
      "end": 34
    },
    {
      "category": "pii",
      "severity": "high",
      "detail": "Email address found in prompt",
      "match": "jo@example.com",
      "start": 48,
      "end": 62
    }
  ],
  "suggestions": [ { "category": "secret_exposure", "action": "...", "detail": "..." } ],
  "summary": "Found 3 issues: 2 secret exposure, 1 pii.",
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`;

const CURL_SANITIZE = `curl -X POST ${API}/sanitize \\
  -H "Authorization: Bearer eak_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Reset the password for jo@example.com, key AKIAIOSFODNN7EXAMPLE"}'`;

const RESPONSE_SANITIZE = `{
  "sanitized": "Reset the password for jo@e******.com, key AKIA************MPLE",
  "changes": [
    { "category": "secret_exposure", "original": "jo@example.com",
      "replacement": "jo@e******.com", "start": 23, "end": 37 },
    { "category": "secret_exposure", "original": "AKIAIOSFODNN7EXAMPLE",
      "replacement": "AKIA************MPLE", "start": 43, "end": 63 }
  ],
  "changeCount": 2,
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`;

const NODE_EXAMPLE = `// Check a prompt before you send it to any model
async function checkPrompt(text) {
  const res = await fetch("${API}/analyze", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.ERASEAI_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error((await res.json()).code);
  return res.json(); // { riskScore, level, issues, ... }
}`;

const PYTHON_EXAMPLE = `import os, requests

def check_prompt(text):
    r = requests.post(
        "${API}/analyze",
        headers={"Authorization": f"Bearer {os.environ['ERASEAI_API_KEY']}"},
        json={"text": text},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()  # riskScore, level, issues, ...`;

const ERRORS: [string, string, string][] = [
  ["400", "INVALID_INPUT", "text is missing or is not a string"],
  ["400", "INPUT_TOO_LONG", "text is longer than 10,000 characters"],
  ["401", "AUTH_REQUIRED / AUTH_INVALID_KEY / AUTH_REVOKED_KEY", "missing, unknown or revoked key"],
  ["429", "RATE_LIMIT_EXCEEDED", "free-trial scans used up, or more than 60 requests a minute on one key"],
];

function Code({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border/40 bg-card/60 p-4 text-xs leading-relaxed text-foreground font-mono mb-6">
      <code>{code}</code>
    </pre>
  );
}

export default function DeveloperApiPage() {
  usePageMeta("/developer-api");

  return (
    <SeoPage>
      <article className="prose-invert max-w-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
          <Braces className="w-4 h-4" />
          Developer API
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-6">
          Check prompts for secrets and personal data in your own app
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          The EraseAI API runs the same detection rules as the Chrome extension and the Android app. Send it text
          before you pass it to a model, and it returns what it found: API keys, passwords, card numbers, emails,
          phone numbers and other personal data. Or ask it to return the text with those values masked.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          Detection is rules-based: patterns plus validators such as the Luhn checksum for card numbers. There is no
          language model in the loop, so results are consistent, fast and explainable. It will miss secrets it has no
          pattern for, and it can flag harmless text.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: KeyRound, title: "One header", text: "Bearer API key. Keys start with eak_." },
            { icon: Braces, title: "Three endpoints", text: "ping, analyze and sanitize. JSON in, JSON out." },
            { icon: Timer, title: "Built-in limits", text: "10,000 characters per request and 60 requests a minute per key." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="p-5 rounded-xl border border-border/30 bg-card/40">
              <Icon className="w-6 h-6 text-primary mb-3" />
              <h2 className="text-base font-bold text-foreground mb-1">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">Get a key</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          API access is included from the Pro plan ($19 a month: 5 keys, 10,000 requests a month) and with
          Teams/Family (20 keys, 100,000 requests a month, shared). Create an account, choose a plan, then generate a
          key in your dashboard. Keep it on your server, in an environment variable, never in browser code. See{" "}
          <a href={`${BASE}pricing`} className="text-primary hover:underline">plans and pricing</a>.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          Revoke a key at any time; it stops working immediately.
        </p>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">Check the connection</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          <code className="font-mono text-foreground">GET /api/dev/ping</code> confirms that the service is up and, with
          your key, which plan the key belongs to. It does not count as a scan.
        </p>
        <Code code={`curl -H "Authorization: Bearer eak_your_api_key" ${API}/ping`} />

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">Analyze text</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          <code className="font-mono text-foreground">POST /api/dev/analyze</code> with <code className="font-mono text-foreground">{"{ \"text\": \"...\" }"}</code>{" "}
          returns a risk score, a level (safe, caution or danger), each issue with its position in the text, and suggested actions. Issues include the matched text, so treat the response as sensitive.
        </p>
        <Code code={CURL_ANALYZE} />
        <Code code={RESPONSE_ANALYZE} />

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">Sanitize text</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          <code className="font-mono text-foreground">POST /api/dev/sanitize</code> takes the same body and returns the
          text with detected values masked, plus the list of changes. Send the sanitized text to your model instead of
          the original. Each change lists the original value, so keep the response on your server.
        </p>
        <Code code={CURL_SANITIZE} />
        <Code code={RESPONSE_SANITIZE} />

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">In your code</h2>
        <Code code={NODE_EXAMPLE} />
        <Code code={PYTHON_EXAMPLE} />

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">Errors</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Errors are JSON with an <code className="font-mono text-foreground">error</code> message and a stable{" "}
          <code className="font-mono text-foreground">code</code>. Branch on the code, not the message.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border/30 mb-10">
          <table className="w-full text-sm text-left">
            <thead className="bg-card/60 text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {ERRORS.map(([status, code, meaning]) => (
                <tr key={code} className="border-t border-border/20">
                  <td className="px-4 py-3 font-mono">{status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{code}</td>
                  <td className="px-4 py-3">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">What we keep</h2>
        <div className="flex items-start gap-4 p-5 rounded-xl border border-border/30 bg-card/40 mb-12">
          <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Requests are sent over HTTPS. Your scan history stores only the first 500 characters of each request, with
            keys, tokens and passwords masked, so you can review what was caught. Details are in the{" "}
            <a href={`${BASE}privacy`} className="text-primary hover:underline">privacy policy</a>.
          </p>
        </div>

        <div className="text-center py-10 rounded-2xl border border-primary/20 bg-primary/5 mb-8">
          <h3 className="text-xl font-bold text-foreground mb-3">Add a check before every model call</h3>
          <p className="text-muted-foreground mb-6">Create an account and get your API key.</p>
          <CtaButton text="Get an API key" />
        </div>

        <RelatedLinks exclude="developer-api" />
      </article>
    </SeoPage>
  );
}
