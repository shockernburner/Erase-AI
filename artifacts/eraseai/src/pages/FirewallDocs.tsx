import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Shield,
  Download,
  Puzzle,
  Zap,
  Terminal,
  Globe,
  Eye,
  AlertTriangle,
  Lock,
  Gauge,
  Crown,
  Settings,
  MonitorSmartphone,
} from "lucide-react";

type SectionId = "overview" | "install" | "endpoints" | "extension" | "ratelimits" | "platforms";

interface FirewallDocsProps {
  onBack: () => void;
  onUpgrade?: () => void;
  onDevMode?: () => void;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const langColors: Record<string, string> = {
    bash: "text-green-400",
    json: "text-yellow-300",
    javascript: "text-amber-300",
    python: "text-blue-300",
  };
  return (
    <div className="relative group">
      <div className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">{lang}</div>
      <CopyBtn text={code} />
      <pre className={`bg-black/50 rounded-xl p-4 pt-8 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-border/20 ${langColors[lang] || "text-foreground/80"}`}>
        {code}
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/20 text-green-400",
    POST: "bg-blue-500/20 text-blue-400",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors[method] || "bg-muted text-foreground"}`}>{method}</span>;
}

function OverviewSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.overviewTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.overviewDesc")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Eye, title: t("firewallDocs.capIntercept"), desc: t("firewallDocs.capInterceptDesc") },
          { icon: Zap, title: t("firewallDocs.capAnalyze"), desc: t("firewallDocs.capAnalyzeDesc") },
          { icon: Lock, title: t("firewallDocs.capSanitize"), desc: t("firewallDocs.capSanitizeDesc") },
        ].map((c) => (
          <div key={c.title} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
            <c.icon className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-primary mb-2">{t("firewallDocs.howItWorks")}</h3>
        <div className="space-y-2">
          {[
            t("firewallDocs.step1"),
            t("firewallDocs.step2"),
            t("firewallDocs.step3"),
            t("firewallDocs.step4"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstallSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.installTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.installDesc")}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.installStepsTitle")}</h3>
        <div className="space-y-3">
          {[
            t("firewallDocs.installStep1"),
            t("firewallDocs.installStep2"),
            t("firewallDocs.installStep3"),
            t("firewallDocs.installStep4"),
            t("firewallDocs.installStep5"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm bg-card/40 border border-border/20 rounded-lg p-3">
              <span className="text-primary font-bold shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">{i + 1}</span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.configTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.configDesc")}</p>
        <CodeBlock code={`{
  "manifest_version": 3,
  "name": "EraseAI Firewall",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab"],
  "content_scripts": [{
    "matches": [
      "https://chat.openai.com/*",
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
      "https://replit.com/*"
    ],
    "js": ["src/content.js"],
    "css": ["src/overlay.css"]
  }],
  "host_permissions": [
    "https://*.replit.app/*"
  ]
}`} lang="json" />
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/80">{t("firewallDocs.installWarning")}</p>
      </div>
    </div>
  );
}

function EndpointsSection() {
  const { t } = useTranslation();
  const origin = window.location.origin;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.endpointsTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.endpointsDesc")}</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-primary mb-1">{t("firewallDocs.baseUrl")}</h3>
        <code className="text-xs font-mono text-foreground/80">{origin}/api/dev/</code>
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="GET" />
          <code className="text-sm font-mono text-foreground">/api/dev/ping</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.pingDesc")}</p>
        <CodeBlock code={`curl -H "Authorization: Bearer eak_your_api_key" \\
  ${origin}/api/dev/ping`} lang="bash" />
        <CodeBlock code={`{
  "ok": true,
  "meta": {
    "version": "1.0",
    "timestamp": "2026-04-05T12:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}`} lang="json" />
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="POST" />
          <code className="text-sm font-mono text-foreground">/api/dev/analyze</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.analyzeDesc")}</p>
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("firewallDocs.requestBody")}</h5>
          <div className="flex items-baseline gap-2 text-xs">
            <code className="text-primary font-mono">text</code>
            <span className="text-muted-foreground/60">string</span>
            <span className="text-red-400 text-[10px]">required</span>
            <span className="text-muted-foreground">{t("firewallDocs.analyzeTextParam")}</span>
          </div>
        </div>
        <CodeBlock code={`curl -X POST ${origin}/api/dev/analyze \\
  -H "Authorization: Bearer eak_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "My API key is sk-abc123 and my email is john@example.com"}'`} lang="bash" />
        <CodeBlock code={`{
  "riskScore": 25,
  "level": "caution",
  "issues": [
    {
      "category": "secret_exposure",
      "severity": "critical",
      "detail": "API key detected (sk-abc123...)",
      "match": "sk-abc123",
      "start": 18,
      "end": 28
    },
    {
      "category": "pii",
      "severity": "high",
      "detail": "Email address detected",
      "match": "john@example.com",
      "start": 47,
      "end": 63
    }
  ],
  "suggestions": [
    { "action": "Remove", "detail": "Remove API key before sending to AI" },
    { "action": "Redact", "detail": "Replace email with placeholder" }
  ],
  "summary": "Found 2 issues: 1 secret, 1 PII exposure",
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="POST" />
          <code className="text-sm font-mono text-foreground">/api/dev/sanitize</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.sanitizeDesc")}</p>
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("firewallDocs.requestBody")}</h5>
          <div className="flex items-baseline gap-2 text-xs">
            <code className="text-primary font-mono">text</code>
            <span className="text-muted-foreground/60">string</span>
            <span className="text-red-400 text-[10px]">required</span>
            <span className="text-muted-foreground">{t("firewallDocs.sanitizeTextParam")}</span>
          </div>
        </div>
        <CodeBlock code={`curl -X POST ${origin}/api/dev/sanitize \\
  -H "Authorization: Bearer eak_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Deploy to server at 192.168.1.100 with password P@ssw0rd123"}'`} lang="bash" />
        <CodeBlock code={`{
  "sanitized": "Deploy to server at [IP_REDACTED] with password [PASSWORD_REDACTED]",
  "changes": [
    {
      "category": "secret_exposure",
      "original": "192.168.1.100",
      "replacement": "[IP_REDACTED]"
    },
    {
      "category": "secret_exposure",
      "original": "P@ssw0rd123",
      "replacement": "[PASSWORD_REDACTED]"
    }
  ],
  "changeCount": 2,
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="GET" />
          <code className="text-sm font-mono text-foreground">/api/dev/history</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.historyDesc")}</p>
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("firewallDocs.queryParams")}</h5>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 text-xs">
              <code className="text-primary font-mono">limit</code>
              <span className="text-muted-foreground/60">integer</span>
              <span className="text-muted-foreground">{t("firewallDocs.historyLimitParam")}</span>
            </div>
            <div className="flex items-baseline gap-2 text-xs">
              <code className="text-primary font-mono">offset</code>
              <span className="text-muted-foreground/60">integer</span>
              <span className="text-muted-foreground">{t("firewallDocs.historyOffsetParam")}</span>
            </div>
          </div>
        </div>
        <CodeBlock code={`curl "${origin}/api/dev/history?limit=10&offset=0" \\
  -H "Authorization: Bearer eak_your_api_key"`} lang="bash" />
        <CodeBlock code={`{
  "scans": [
    {
      "id": 1,
      "scanType": "analyze",
      "inputText": "My API key is sk-abc...",
      "riskScore": 25,
      "issues": [...],
      "sanitizedText": null,
      "createdAt": "2026-04-05T12:00:00.000Z"
    }
  ],
  "total": 42,
  "todayUsed": 3,
  "dailyLimit": 10,
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>
    </div>
  );
}

function ExtensionSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.extensionTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.extensionDesc")}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.architectureTitle")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: MonitorSmartphone, title: t("firewallDocs.archContent"), desc: t("firewallDocs.archContentDesc") },
            { icon: Settings, title: t("firewallDocs.archBackground"), desc: t("firewallDocs.archBackgroundDesc") },
            { icon: Gauge, title: t("firewallDocs.archPopup"), desc: t("firewallDocs.archPopupDesc") },
          ].map((c) => (
            <div key={c.title} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
              <c.icon className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.messageFlowTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.messageFlowDesc")}</p>
        <CodeBlock code={`Content Script                Background (Service Worker)        EraseAI API
     |                                  |                           |
     |--- { type: "ANALYZE", text } --> |                           |
     |                                  |--- POST /api/dev/analyze ->|
     |                                  |<-- { riskScore, issues } --|
     |<-- { riskScore, level, ... } ----|                           |
     |                                  |                           |
     |--- { type: "SANITIZE", text } -->|                           |
     |                                  |--- POST /api/dev/sanitize->|
     |                                  |<-- { sanitized, changes } -|
     |<-- { sanitized, changes } -------|                           |`} lang="bash" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.interceptTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.interceptDesc")}</p>
        <CodeBlock code={`function interceptSubmission(e) {
  // 1. Get text from the AI platform's input field
  const text = platform.getInputText(inputEl).trim();
  if (!text || text.length < 3) return;

  // 2. Block the original submission
  e.preventDefault();
  e.stopImmediatePropagation();

  // 3. Show scanning overlay
  const { panel } = createOverlayBackdrop();

  // 4. Send to background for API analysis
  chrome.runtime.sendMessage(
    { type: "ANALYZE", text },
    (result) => {
      if (result.riskScore > 70) {
        // Safe — auto-send
        bypassNext = true;
        triggerSend();
      } else {
        // Risky — show results with options
        renderResults(panel, result, inputEl);
      }
    }
  );
}`} lang="javascript" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.overlayTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.overlayDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: t("firewallDocs.actionCancel"), desc: t("firewallDocs.actionCancelDesc"), color: "text-muted-foreground" },
            { label: t("firewallDocs.actionSanitize"), desc: t("firewallDocs.actionSanitizeDesc"), color: "text-primary" },
            { label: t("firewallDocs.actionSend"), desc: t("firewallDocs.actionSendDesc"), color: "text-yellow-400" },
          ].map((a) => (
            <div key={a.label} className="bg-card/40 border border-border/20 rounded-lg p-3 space-y-1">
              <h4 className={`text-xs font-bold ${a.color}`}>{a.label}</h4>
              <p className="text-[11px] text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RateLimitsSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.rateLimitsTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.rateLimitsDesc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.freePlan")}</h3>
          <div className="text-2xl font-bold text-primary">10</div>
          <p className="text-xs text-muted-foreground">{t("firewallDocs.freePlanDesc")}</p>
        </div>
        <div className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.paidPlan")}</h3>
          <div className="text-2xl font-bold text-green-400">{t("firewallDocs.unlimited")}</div>
          <p className="text-xs text-muted-foreground">{t("firewallDocs.paidPlanDesc")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.errorCodesTitle")}</h3>
        <div className="space-y-2">
          {[
            { code: "400", label: "INVALID_INPUT", desc: t("firewallDocs.err400") },
            { code: "400", label: "INPUT_TOO_LONG", desc: t("firewallDocs.err400Long") },
            { code: "401", label: "AUTH_REQUIRED", desc: t("firewallDocs.err401") },
            { code: "401", label: "AUTH_INVALID_KEY", desc: t("firewallDocs.err401Key") },
            { code: "429", label: "RATE_LIMIT_EXCEEDED", desc: t("firewallDocs.err429") },
            { code: "500", label: "ANALYSIS_FAILED", desc: t("firewallDocs.err500") },
          ].map((e, i) => (
            <div key={i} className="flex items-start gap-3 text-xs bg-card/40 border border-border/20 rounded-lg p-3">
              <span className={`font-mono font-bold shrink-0 ${e.code.startsWith("4") ? "text-yellow-400" : "text-red-400"}`}>{e.code}</span>
              <code className="text-primary font-mono shrink-0">{e.label}</code>
              <span className="text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.rateLimitResponseTitle")}</h3>
        <CodeBlock code={`{
  "error": "Free plan allows 10 scans per day. Upgrade for unlimited scans.",
  "code": "RATE_LIMIT_EXCEEDED",
  "upgrade": true,
  "limit": 10,
  "used": 10,
  "details": { "upgrade": true, "limit": 10, "used": 10 },
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.inputLimitsTitle")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card/40 border border-border/20 rounded-lg p-3">
            <h4 className="text-xs font-bold text-foreground mb-1">{t("firewallDocs.maxLength")}</h4>
            <p className="text-xs text-muted-foreground">{t("firewallDocs.maxLengthDesc")}</p>
          </div>
          <div className="bg-card/40 border border-border/20 rounded-lg p-3">
            <h4 className="text-xs font-bold text-foreground mb-1">{t("firewallDocs.minLength")}</h4>
            <p className="text-xs text-muted-foreground">{t("firewallDocs.minLengthDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformsSection() {
  const { t } = useTranslation();
  const platforms = [
    {
      name: "ChatGPT",
      hosts: "chat.openai.com, chatgpt.com",
      selectors: '#prompt-textarea, div[contenteditable="true"][id="prompt-textarea"]',
      sendBtn: 'button[data-testid="send-button"]',
    },
    {
      name: "Claude",
      hosts: "claude.ai",
      selectors: 'div[contenteditable="true"].ProseMirror',
      sendBtn: 'button[aria-label="Send Message"]',
    },
    {
      name: "Gemini",
      hosts: "gemini.google.com",
      selectors: '.ql-editor[contenteditable="true"]',
      sendBtn: 'button[aria-label="Send message"]',
    },
    {
      name: "Replit",
      hosts: "replit.com",
      selectors: 'textarea[placeholder*="Ask"]',
      sendBtn: 'button[aria-label="Send"]',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.platformsTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.platformsDesc")}</p>
      </div>

      <div className="space-y-4">
        {platforms.map((p) => (
          <div key={p.name} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
              <span className="text-xs text-muted-foreground font-mono">{p.hosts}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">{t("firewallDocs.inputSelector")}</span>
                <code className="block text-primary/80 font-mono mt-0.5 break-all">{p.selectors}</code>
              </div>
              <div>
                <span className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">{t("firewallDocs.sendButton")}</span>
                <code className="block text-primary/80 font-mono mt-0.5 break-all">{p.sendBtn}</code>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.addPlatformTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.addPlatformDesc")}</p>
        <CodeBlock code={`// Add to PLATFORMS object in content.js
myPlatform: {
  hostPatterns: ["my-ai-tool.com"],
  name: "My AI Tool",
  inputSelectors: [
    'textarea[data-prompt]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  sendButtonSelectors: [
    'button[type="submit"]',
    'button[aria-label="Send"]',
  ],
  getInputText(el) {
    if (el.tagName === "TEXTAREA") return el.value;
    return el.innerText || el.textContent || "";
  },
  setInputText(el, text) {
    if (el.tagName === "TEXTAREA") {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
    }
  },
}`} lang="javascript" />
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/80">{t("firewallDocs.addPlatformWarning")}</p>
        </div>
      </div>
    </div>
  );
}

export default function FirewallDocs({ onBack, onUpgrade, onDevMode }: FirewallDocsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const plan = user?.planType || "free";
  const showUpgrade = plan === "free" && !!onUpgrade;

  const navItems: { id: SectionId; icon: typeof Shield; label: string }[] = [
    { id: "overview", icon: Shield, label: t("firewallDocs.navOverview") },
    { id: "install", icon: Download, label: t("firewallDocs.navInstall") },
    { id: "endpoints", icon: Terminal, label: t("firewallDocs.navEndpoints") },
    { id: "extension", icon: Puzzle, label: t("firewallDocs.navExtension") },
    { id: "ratelimits", icon: Gauge, label: t("firewallDocs.navRateLimits") },
    { id: "platforms", icon: Globe, label: t("firewallDocs.navPlatforms") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-muted/30 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <Shield className="w-7 h-7 text-primary" />
                {t("firewallDocs.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t("firewallDocs.subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <nav className="lg:w-56 shrink-0">
              <div className="sticky top-8 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      activeSection === item.id
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            <main className="flex-1 min-w-0">
              {activeSection === "overview" && <OverviewSection />}
              {activeSection === "install" && <InstallSection />}
              {activeSection === "endpoints" && <EndpointsSection />}
              {activeSection === "extension" && <ExtensionSection />}
              {activeSection === "ratelimits" && <RateLimitsSection />}
              {activeSection === "platforms" && <PlatformsSection />}

              {onDevMode && (
                <div className="mt-8 bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
                  <Terminal className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground mb-1">{t("firewallDocs.devModeTitle")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t("firewallDocs.devModeDesc")}</p>
                    <button
                      onClick={onDevMode}
                      className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
                    >
                      {t("firewallDocs.devModeCta")}
                    </button>
                  </div>
                </div>
              )}

              {showUpgrade && (
                <div className="mt-4 bg-primary/5 border border-primary/30 rounded-xl p-5 flex items-start gap-4">
                  <Crown className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground mb-1">{t("firewallDocs.upgradeTitle")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t("firewallDocs.upgradeDesc")}</p>
                    <button
                      onClick={onUpgrade}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      {t("firewallDocs.upgradeCta")}
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
