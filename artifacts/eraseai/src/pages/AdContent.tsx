import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Search,
  Linkedin,
  Sparkles,
  Target,
  Users,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Code2,
  User,
  TrendingUp,
  Video,
  Image,
  Mail,
  FileText,
  Hash,
  type LucideProps,
} from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CopyAllButton({ items }: { items: string[] }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(items.join("\n\n---\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "All Copied" : "Copy All"}
    </button>
  );
}

function AdCard({ title, subtitle, content, badge, badgeColor = "bg-primary/10 text-primary" }: {
  title: string;
  subtitle?: string;
  content: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="bg-card/60 border border-border/30 rounded-xl p-5 backdrop-blur-md space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{title}</span>
            {badge && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <CopyButton text={content} />
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono bg-background/50 rounded-lg p-3 border border-border/20">
        {content}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, color, children, defaultOpen = false }: {
  title: string;
  icon: React.ComponentType<LucideProps>;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-all ${open ? "border-b border-border/20" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function KeywordBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/30 text-xs text-muted-foreground border border-border/20 font-mono">
      {text}
    </span>
  );
}

const GOOGLE_ADS = {
  campaigns: [
    {
      name: "AI Firewall — Real-Time Protection",
      icon: Shield,
      color: "bg-red-500/10 text-red-400",
      targeting: "CISOs, IT Security Managers, DevOps Engineers searching for AI security solutions",
      bidStrategy: "Target CPA — optimize for free trial signups",
      estimatedMetrics: "Est. CTR: 4-6% | CPC: $2.80-$4.50 | Conv. rate: 8-12% | Monthly impressions: 15K-25K",
      adGroups: [
        {
          name: "ChatGPT Data Leak Prevention",
          headlines: [
            "Stop ChatGPT Data Leaks",
            "AI Firewall for Enterprises",
            "Block Prompt Injections 99%",
            "Protect Data from AI Leaks",
            "Real-Time AI Data Shield",
            "Secure Your AI Prompts Now",
            "AI Firewall — Free Trial",
            "Samsung Banned ChatGPT. You?",
            "EraseAI Prompt Protection",
            "PII Leak Prevention for AI",
            "Don't Ban AI. Govern It.",
            "AI Data Loss Prevention",
            "Scan Prompts Before Sending",
            "Enterprise AI Firewall",
            "Block Sensitive Data Leaks",
          ],
          descriptions: [
            "EraseAI scans prompts before they reach ChatGPT or Claude. 99% injection detection.",
            "Stop employees leaking passwords and API keys to AI. Real-time firewall. Try free.",
            "Samsung banned ChatGPT after code leaks. EraseAI prevents this. Start free today.",
            "Browser extension + REST API. Protect every AI interaction. Free trial at eraseai.ai.",
          ],
          descriptionsB: [
            "Your team pasted 847 passwords into ChatGPT last month. EraseAI stops it. Try free.",
            "AI Firewall blocks PII and credentials from reaching AI models. Deploy in 30 seconds.",
          ],
          keywords: [
            "ai firewall", "chatgpt data leak prevention", "ai data loss prevention", "prompt injection protection",
            "chatgpt security", "ai security tool", "prevent data leaks ai", "enterprise ai firewall",
            "ai prompt scanner", "block sensitive data chatgpt", "ai governance tool", "chatgpt enterprise security",
          ],
          negativeKeywords: ["free chatgpt", "chatgpt download", "chatgpt alternatives", "ai art generator", "ai image generator"],
        },
        {
          name: "Prompt Security & Injection",
          headlines: [
            "AI Prompt Security Scanner",
            "99% Injection Detection",
            "Prompt Injection Prevention",
            "Secure AI Interactions",
            "AI Prompt Risk Scanner",
            "Block Malicious AI Prompts",
          ],
          descriptions: [
            "Block prompt injection attacks with 99% accuracy. Real-time AI input scanning. Try free.",
            "Prompt scanning for PII, toxicity, and injections. Extension + API. Free at eraseai.ai.",
          ],
          descriptionsB: [
            "Prompt injection attacks up 340% YoY. EraseAI stops 99% of them. Try free today.",
            "Scan prompts in real-time. Block injections. Rewrite risky content. Full audit trail.",
          ],
          keywords: [
            "prompt injection prevention", "prompt injection detection", "ai prompt security",
            "llm security", "prompt attack prevention", "ai input validation",
          ],
          negativeKeywords: ["prompt engineering tutorial", "how to write prompts", "chatgpt prompts"],
        },
        {
          name: "Enterprise AI Security",
          headlines: [
            "Enterprise AI Governance",
            "AI Security at Scale",
            "Business AI Data Shield",
            "Team AI Protection $149/mo",
            "Webhook + API Governance",
            "SSO AI Security Platform",
          ],
          descriptions: [
            "Business: $149/mo. 20 API keys, webhooks, advanced analytics. Protect your org.",
            "Enterprise AI firewall with SSO, custom rules, and SLA. Contact eraseai.ai.",
          ],
          descriptionsB: [
            "$5 Personal to $149 Business — scale AI protection across your org. Try free.",
            "73% of enterprises lack AI governance. EraseAI deploys in minutes. From $149/mo.",
          ],
          keywords: [
            "enterprise ai security", "corporate ai governance", "business ai protection",
            "enterprise ai firewall", "ai security platform enterprise", "sso ai security",
          ],
          negativeKeywords: ["enterprise ai software free", "enterprise resource planning", "erp software"],
        },
      ],
    },
    {
      name: "Dataset Privacy & Compliance",
      icon: Target,
      color: "bg-blue-500/10 text-blue-400",
      targeting: "Data Engineers, ML Engineers, Compliance Officers searching for GDPR/AI compliance tools",
      bidStrategy: "Maximize conversions — target Pro plan trials ($49/mo)",
      estimatedMetrics: "Est. CTR: 3-5% | CPC: $3.50-$5.00 | Conv. rate: 6-10% | Monthly impressions: 10K-18K",
      adGroups: [
        {
          name: "GDPR AI Compliance",
          headlines: [
            "GDPR AI Data Compliance",
            "Right to Be Forgotten — AI",
            "AI Training Data Cleanup",
            "Remove PII from AI Datasets",
            "Dataset Sanitization Tool",
            "Clean AI Training Data Fast",
            "GDPR Machine Unlearning",
            "AI Data Governance Platform",
            "Audit AI Training Datasets",
            "PII Detection in Datasets",
          ],
          descriptions: [
            "Detect PII, bias, and toxic content in AI datasets. One-click cleanup. GDPR audit trail.",
            "Machine unlearning made simple. Upload CSV/JSON, detect issues, verify erasure. Free.",
            "GDPR right to be forgotten for AI models. EraseAI: verified, auditable erasure.",
          ],
          descriptionsB: [
            "Forget Score proves data was erased. Audit-ready reports for GDPR/CCPA/PDPA. $49/mo.",
            "AI compliance in 3 steps: upload, detect, erase with audit trail. Free to start.",
          ],
          keywords: [
            "gdpr ai compliance", "ai data governance", "machine unlearning tool", "pii detection dataset",
            "ai training data cleanup", "dataset sanitization", "remove pii from dataset", "gdpr machine learning",
            "ai audit trail", "data erasure verification", "right to be forgotten ai",
          ],
          negativeKeywords: ["gdpr consultant", "gdpr lawyer", "gdpr certification course"],
        },
        {
          name: "Bias & Toxicity Detection",
          headlines: [
            "AI Bias Detection Tool",
            "Detect Toxic Training Data",
            "Clean Biased AI Datasets",
            "Fair AI Training Pipeline",
            "Toxicity Scanner for Data",
            "Remove Bias from AI Models",
          ],
          descriptions: [
            "Scan datasets for proxy bias, class imbalance, and more. ML pipeline tips included.",
            "Detect hate speech and toxic content in training data. Forget Score verification.",
          ],
          descriptionsB: [
            "AI fairness starts with clean data. Scan 10+ bias types. Try EraseAI free today.",
            "Auditable bias detection. EraseAI scans, flags, and fixes with ML recommendations.",
          ],
          keywords: [
            "ai bias detection", "toxic data detection", "fair ai training", "dataset bias scanner",
            "remove bias ai model", "ai fairness tool", "detect toxic content dataset",
          ],
          negativeKeywords: ["ai ethics course", "ai bias research paper", "bias training class"],
        },
        {
          name: "Machine Unlearning & Verification",
          headlines: [
            "Machine Unlearning Tool",
            "Verify Data Was Erased",
            "Forget Score Verification",
            "AI Data Erasure Platform",
            "Auditable Data Removal",
            "Verified AI Unlearning",
          ],
          descriptions: [
            "Upload datasets, erase data, verify with Forget Score. Full audit trail. Try free.",
            "Machine unlearning for compliance. Before/after comparison and ML feedback. $49/mo.",
          ],
          descriptionsB: [
            "Prove your AI forgot the data. Forget Score gives auditable verification. GDPR/PDPA.",
            "Version-controlled erasure with before/after comparison. Safe retraining. Free tier.",
          ],
          keywords: [
            "machine unlearning", "data erasure verification", "forget score", "ai data removal tool",
            "auditable data erasure", "verified data deletion ai", "machine unlearning compliance",
          ],
          negativeKeywords: ["machine learning course", "unlearning habits", "forget password"],
        },
        {
          name: "PDPA Singapore Compliance",
          headlines: [
            "PDPA AI Data Compliance",
            "Singapore AI Governance",
            "APAC AI Data Protection",
            "PDPA Machine Unlearning",
            "Asia AI Compliance Tool",
            "SG Data Protection for AI",
          ],
          descriptions: [
            "PDPA-compliant AI governance for Singapore and APAC. Detect PII, verify erasure.",
            "PDPA, GDPR, CCPA in one platform. Sanitization from $49/mo. Business $149/mo.",
          ],
          descriptionsB: [
            "Singapore PDPA requires AI data protection. EraseAI: automated PII detection.",
            "APAC AI security: $6.5B market, 32% growth. Stay compliant. Free to start.",
          ],
          keywords: [
            "pdpa compliance tool", "singapore ai governance", "apac data protection ai",
            "pdpa ai compliance", "singapore data privacy", "asia ai governance platform",
          ],
          negativeKeywords: ["pdpa training", "pdpa course singapore", "data protection officer course"],
        },
      ],
    },
    {
      name: "Developer Tools — API & CI/CD",
      icon: Code2,
      color: "bg-amber-500/10 text-amber-400",
      targeting: "Software Developers, DevOps Engineers, CTOs searching for AI security SDKs",
      bidStrategy: "Target CPA — optimize for API key creation",
      estimatedMetrics: "Est. CTR: 5-7% | CPC: $2.00-$3.50 | Conv. rate: 10-15% | Monthly impressions: 12K-20K",
      adGroups: [
        {
          name: "AI Governance API",
          headlines: [
            "AI Governance REST API",
            "One SDK Call. Full Safety.",
            "AI Security for Developers",
            "Pre-Commit Data Scanning",
            "Webhook AI Event Alerts",
            "AI Compliance SDK — Free",
            "DevOps AI Data Governance",
            "CI/CD AI Security Hook",
          ],
          descriptions: [
            "One API call: scan content, block injections, clean datasets. SDK + webhooks. Free.",
            "AI governance in your CI/CD pipeline. REST API with Bearer auth. Pro from $49/mo.",
            "Build responsible AI apps with EraseAI SDK. Scanning + sanitization via API. Free.",
          ],
          descriptionsB: [
            "3 lines of code = full AI governance. Analyze, sanitize, verify. Pro from $49/mo.",
            "Pre-commit hooks catch PII before it hits your repo. Webhooks on every scan. Free.",
          ],
          keywords: [
            "ai governance api", "ai security sdk", "ai data scanning api", "content moderation api",
            "pii detection api", "ai compliance api", "machine learning governance tool",
            "ai ci cd integration", "pre-commit ai security", "ai webhook events",
          ],
          negativeKeywords: ["free api key generator", "rest api tutorial", "how to build api"],
        },
        {
          name: "Content Moderation API",
          headlines: [
            "Content Moderation API",
            "PII Detection API — Free",
            "Toxicity Detection API",
            "AI Content Safety API",
            "Scan Content via REST API",
            "Real-Time Content Scanner",
          ],
          descriptions: [
            "Content moderation API: PII, toxicity, bias, defamation detection. Free tier.",
            "Scan content for 10+ risk dimensions via API. Real-time. TypeScript SDK included.",
          ],
          descriptionsB: [
            "AI content scanning API. Detect PII, hate speech, bias in milliseconds. Try free.",
            "Content safety at API speed. PII + toxicity scoring. Pro: $49/mo, 5 API keys.",
          ],
          keywords: [
            "content moderation api", "pii detection api", "toxicity detection api",
            "content safety api", "ai content scanning api", "text moderation api",
          ],
          negativeKeywords: ["content moderation job", "content moderator salary", "content writing api"],
        },
        {
          name: "Dataset Sanitization SDK",
          headlines: [
            "Dataset Cleaning SDK",
            "Sanitize Data via API",
            "CSV JSON Data Cleaner API",
            "ML Data Pipeline Tool",
            "Pro Plan: $49/mo 5 Keys",
            "Business: $149/mo 20 Keys",
          ],
          descriptions: [
            "Upload CSV/JSON/JSONL via API. Automated PII removal and bias detection. Try free.",
            "Clean datasets via API. Pro: $49/mo (5 keys). Business: $149/mo (20 keys). Free.",
          ],
          descriptionsB: [
            "Automate dataset governance in your ML pipeline. Forget Score verification. Free.",
            "Free to Pro ($49) to Business ($149). Scale AI data governance with EraseAI SDK.",
          ],
          keywords: [
            "dataset cleaning api", "data sanitization sdk", "ml data pipeline tool",
            "csv data cleaning api", "json dataset cleaner", "automated data cleaning tool",
          ],
          negativeKeywords: ["dataset download", "free dataset", "kaggle dataset"],
        },
      ],
    },
    {
      name: "Personal Mode — Consumer Protection",
      icon: User,
      color: "bg-emerald-500/10 text-emerald-400",
      targeting: "Privacy-conscious consumers, ChatGPT/Gemini/Claude users, social media professionals",
      bidStrategy: "Maximize clicks — low CPC bid for volume, target $5/mo conversions",
      estimatedMetrics: "Est. CTR: 6-9% | CPC: $0.80-$1.50 | Conv. rate: 5-8% | Monthly impressions: 30K-50K",
      adGroups: [
        {
          name: "Personal AI Protection",
          headlines: [
            "Protect Your AI Privacy $5",
            "AI Firewall for $5/Month",
            "Scan Before You Send to AI",
            "Your Data. Your Control.",
            "Stop Leaking Data to ChatGPT",
            "AI Privacy Protection Tool",
            "Safe AI Usage — $5/Month",
            "Personal AI Data Shield",
            "Unlimited AI Scanning — $5",
            "AI Content Risk Scanner",
          ],
          descriptions: [
            "EraseAI Personal: unlimited scanning, AI rewriting, risk monitoring. $5/mo. Free.",
            "Scan prompts for PII and toxicity before reaching ChatGPT. Extension included.",
            "Protect your AI interactions. Scan, rewrite, monitor for $5/mo at eraseai.ai.",
            "7-day free trial. No credit card. Real-time scanning and smart rewriting.",
          ],
          descriptionsB: [
            "Don't send a prompt without safety-check. EraseAI Personal for just $5/month.",
            "AI Firewall + scanning + rewriting + risk alerts. $5/month. Free 7-day trial.",
          ],
          keywords: [
            "ai privacy protection", "chatgpt privacy tool", "personal ai security", "protect data chatgpt",
            "ai prompt scanner personal", "safe ai usage", "ai data protection app", "chatgpt data privacy",
            "ai content scanner", "personal data ai protection",
          ],
          negativeKeywords: ["chatgpt plus", "chatgpt free", "ai girlfriend", "ai voice generator", "ai writing tool"],
        },
        {
          name: "AI Content Rewriting",
          headlines: [
            "AI Rewrites Risky Prompts",
            "Safe AI Content Rewriter",
            "Rewrite Prompts Safely",
            "AI Safety Rewriter — $5",
            "Smart Prompt Rewriting",
            "Fix Risky AI Inputs Fast",
          ],
          descriptions: [
            "EraseAI rewrites risky prompts into safe versions. Same intent, no exposure. $5/mo.",
            "AI content rewriting: removes PII, fixes toxicity, keeps meaning. $5/mo Personal.",
          ],
          descriptionsB: [
            "Don't censor prompts — rewrite them. EraseAI makes inputs safe automatically. Free.",
            "Your prompt, but safe. Strips PII and sensitive data, keeps intent. Free 7-day trial.",
          ],
          keywords: [
            "ai content rewriter", "safe prompt rewriter", "ai rewrite tool",
            "prompt safety tool", "rewrite risky ai prompts", "ai input sanitizer",
          ],
          negativeKeywords: ["ai writing assistant", "ai essay writer", "paraphrasing tool", "grammar checker"],
        },
        {
          name: "Browser Extension Protection",
          headlines: [
            "AI Firewall Extension",
            "Chrome AI Safety Plugin",
            "Browser AI Data Shield",
            "ChatGPT Safety Extension",
            "Protect AI in Browser",
            "AI Extension — Free Trial",
          ],
          descriptions: [
            "Browser extension scans AI prompts in real-time. ChatGPT, Gemini, Claude. Free.",
            "One extension, total AI protection. Block sensitive data, rewrite prompts. $5/mo.",
          ],
          descriptionsB: [
            "Install EraseAI extension. Every prompt auto-scanned, PII blocked. 30 seconds.",
            "ChatGPT, Gemini, Claude — protected in one click. Free trial at eraseai.ai.",
          ],
          keywords: [
            "ai firewall browser extension", "chatgpt chrome extension security", "ai privacy browser plugin",
            "ai prompt protection extension", "browser ai data protection", "chatgpt safety extension",
          ],
          negativeKeywords: ["chatgpt extension free", "ai chrome extension", "browser extension tutorial"],
        },
      ],
    },
  ],
  performanceMax: {
    headlines: [
      "EraseAI — AI Data Governance",
      "Stop Data Leaks to AI Tools",
      "AI Firewall + Dataset Cleaner",
      "Protect AI Interactions — Free",
      "99% Prompt Injection Detection",
    ],
    longHeadlines: [
      "EraseAI: The AI Data Governance Platform That Scans, Blocks, and Cleans — Before Damage Is Done",
      "Stop Leaking Passwords and API Keys to ChatGPT — EraseAI Firewall Catches It in Real-Time",
      "From $5/Month Personal to $149/Month Business: AI Governance That Scales With Your Organization",
    ],
    descriptions: [
      "AI firewall + dataset sanitization. Personal $5, Pro $49, Business $149. Try free.",
      "Detect PII, bias, toxic content. Clean datasets with audit trail. GDPR compliant.",
    ],
    callToAction: "Start Free Trial",
    finalUrl: "https://eraseai.ai",
    sitelinks: [
      { text: "AI Firewall Extension", url: "https://eraseai.ai/ai-firewall" },
      { text: "Dataset Sanitizer", url: "https://eraseai.ai" },
      { text: "Pricing — From $5/mo", url: "https://eraseai.ai" },
      { text: "Developer API Docs", url: "https://eraseai.ai" },
    ],
  },
};

const LINKEDIN_ADS = {
  estimatedMetrics: "Est. CTR: 0.8-1.5% | CPM: $35-$55 | Cost per lead: $25-$45 | Engagement rate: 2-4%",
  sponsoredContent: [
    {
      type: "Single Image",
      title: "Enterprise Awareness — CISO Audience",
      targeting: "Job titles: CISO, VP of Security, Head of Data, DPO, Chief Privacy Officer | Industries: Financial Services, Healthcare, Technology, Government | Seniority: Director+",
      imageDirection: "Dark gradient background. EraseAI shield logo center. Text overlay: 'Your employees pasted 847 passwords into ChatGPT last month.' Subtext: 'How many were yours?'",
      primaryText: `Your employees are pasting passwords, API keys, and customer data into ChatGPT every day.

Once it's sent, you can't take it back. But you can stop it before it happens.

EraseAI sits between your team and every AI model — scanning prompts, blocking sensitive data, and rewriting risky content in real-time.

What Samsung learned the hard way, you can prevent today:
→ 99% prompt injection detection
→ Real-time PII and credential scanning
→ Full audit trail for compliance teams
→ Browser extension + REST API

From $5/mo Personal to $149/mo Business to custom enterprise plans.

Try it free at eraseai.ai`,
      headline: "Stop Data Leaks to AI — Before They Happen",
      cta: "Learn More",
      abVariant: `73% of enterprises now use generative AI internally. Only 12% have a data governance layer between employees and the models.

EraseAI is that layer.

Real-time prompt scanning. Injection blocking. Content rewriting. Dataset sanitization. All in one platform.

One SDK call:
const report = await client.analyze(content);

Used by developers, compliance teams, and security professionals who believe AI governance shouldn't be an afterthought.

Free to start. Business $149/mo. Enterprise plans available.

eraseai.ai`,
    },
    {
      type: "Carousel (5 slides)",
      title: "Product Walkthrough — Developer Audience",
      targeting: "Job titles: Software Engineer, ML Engineer, Data Engineer, DevOps | Skills: Python, TypeScript, Machine Learning, API Development | Company size: 51-1000",
      imageDirection: "Slide 1: 'One API call. Full AI governance.' | Slide 2: 'Scan — detect PII, bias, toxicity' | Slide 3: 'Clean — erase or redact with audit trail' | Slide 4: 'Integrate — webhooks, pre-commit hooks, CI/CD' | Slide 5: 'Start free at eraseai.ai'",
      primaryText: `If you're building with AI, you need a governance layer.

EraseAI gives you:
✅ Content scanning (PII, toxicity, bias, defamation)
✅ Prompt injection blocking (99% detection)
✅ Dataset sanitization with version control
✅ Webhooks + pre-commit hooks for CI/CD
✅ Full audit trail for compliance

CSV, JSON, JSONL, TXT — up to 250K rows per dataset.

Free tier available. Pro starts at $49/month with 5 API keys.

eraseai.ai`,
      headline: "AI Data Governance SDK — Free to Start",
      cta: "Sign Up",
      abVariant: `const client = new EraseClient(API_KEY);
const report = await client.analyze(content);
const clean = await client.sanitize(dataset);

Three lines of code. Full AI data governance in your pipeline.

What you get:
→ PII, bias, and toxicity detection
→ Prompt injection blocking (99% accuracy)
→ Dataset sanitization up to 250K rows
→ Webhooks for real-time event notifications
→ Forget Score verification for compliance

Pro plan: $49/mo | 5 API keys | 50K row datasets

eraseai.ai — Free tier available`,
    },
    {
      type: "Single Image",
      title: "Personal Mode — Individual Audience",
      targeting: "Interests: Artificial Intelligence, Data Privacy, Cybersecurity | Job functions: All | Age: 25-55 | Exclude: Students",
      imageDirection: "Split screen mockup. Left: 'Before — risky prompt with PII highlighted.' Right: 'After — AI-rewritten safe version.' Bottom: '$5/month. Your data. Your control.'",
      primaryText: `For $5/month, EraseAI scans everything you type before it reaches any AI.

✅ Unlimited content scanning
✅ AI-powered prompt rewriting (risky → safe, same meaning)
✅ 30-day safety score tracking
✅ Risk spike alerts
✅ Browser extension for ChatGPT, Gemini, Claude

You wouldn't send an email without spell-check. Why send a prompt without safety-check?

7-day free trial. No credit card required.

eraseai.ai`,
      headline: "AI Prompt Protection — $5/Month",
      cta: "Start Free Trial",
      abVariant: `What does $5/month get you?

→ Every prompt scanned for PII, API keys, and sensitive data
→ Automatic rewriting that keeps your meaning, removes the risk
→ 30-day trend monitoring so you know your risk profile
→ Alerts when your risk score spikes

EraseAI Personal Mode. Because AI should work for you, not against your privacy.

Free 7-day trial at eraseai.ai`,
    },
  ],
  messageAds: [
    {
      title: "InMail to CISOs/VPs of Security",
      targeting: "CISO, VP Security, Head of InfoSec | Financial Services, Healthcare, Tech | 500+ employees | APAC + US + EU",
      subject: "Your AI data governance gap",
      body: `Hi {{FirstName}},

75% of enterprises now use generative AI internally, but almost none have a protection layer between employees and the models they use.

EraseAI is the missing governance layer:
• Real-time prompt scanning for PII, credentials, and injection attacks
• 99% prompt injection detection rate
• Dataset sanitization with GDPR-compliant audit trails
• Browser extension + REST API deployment options

Samsung learned this lesson the hard way when engineers leaked source code through ChatGPT. We help companies prevent this — without banning AI.

Would it make sense to show you a 10-minute demo?

Best,
Firdous Mahmood
Director, Vantward Solutions Pte. Ltd.
eraseai.ai`,
    },
    {
      title: "InMail to Data Engineers / ML Engineers",
      targeting: "Data Engineer, ML Engineer, Head of Data | Tech, Finance | Skills: Python, MLOps | 51+ employees",
      subject: "AI governance in your CI/CD pipeline — one SDK call",
      body: `Hi {{FirstName}},

If you're shipping AI-powered features, you probably already worry about PII leaking into training data, prompt injection attacks, and regulatory compliance.

EraseAI handles all three with one integration:

const clean = await client.sanitize(dataset);

What you get:
→ PII, bias, and toxicity detection in datasets
→ Prompt injection blocking (99% accuracy)
→ Pre-commit hooks + webhooks for CI/CD
→ Forget Score verification for compliance audits

Pro plan: $49/mo | 5 API keys | up to 50K rows per dataset. Free tier available.

Want to try it? You can spin up a free account at eraseai.ai in 30 seconds.

Best,
Firdous Mahmood
eraseai.ai`,
    },
  ],
  documentAds: [
    {
      title: "Lead Magnet: '2026 AI Data Leak Report'",
      targeting: "CISOs, CTOs, Compliance Officers, Data Protection Officers | All industries | 200+ employees",
      outline: `Document Title: "The 2026 AI Data Leak Report: How Enterprises Are Losing Data to Generative AI"

Page 1 — Cover: Bold stat "78% of enterprises have experienced an AI-related data incident"
Page 2 — The Samsung Case Study: Source code leaked via ChatGPT prompts
Page 3 — Top 5 Data Types Leaked to AI (passwords, API keys, PII, source code, financial data)
Page 4 — Industry Breakdown: Financial Services (highest risk), Healthcare, Government
Page 5 — The Cost: Average $4.45M per data breach (IBM 2024 stat) + regulatory fines
Page 6 — The Solution: Real-time AI governance layers (introduce EraseAI concept)
Page 7 — EraseAI Platform Overview: Firewall + Scanner + Sanitizer + API
Page 8 — How It Works: 3-step visual (Scan → Clean → Verify)
Page 9 — CTA: "Start your free trial — eraseai.ai" + enterprise inquiry contact`,
      cta: "Download Report",
    },
    {
      title: "Lead Magnet: 'AI Governance Checklist for CTOs'",
      targeting: "CTOs, VPs of Engineering, Heads of Platform | Tech, FinTech, SaaS | 100+ employees",
      outline: `Document Title: "The CTO's AI Governance Checklist: 12 Steps to Secure Your AI Pipeline"

Checklist Items:
1. Audit all AI tools used by employees
2. Classify data sensitivity for AI interactions
3. Deploy real-time prompt scanning
4. Block PII and credentials from reaching AI models
5. Implement content rewriting for flagged prompts
6. Sanitize training datasets before model fine-tuning
7. Establish version-controlled data erasure workflows
8. Set up audit trails for compliance documentation
9. Integrate governance into CI/CD pipelines
10. Monitor risk trends and set alert thresholds
11. Train employees on AI data hygiene
12. Choose a governance platform (EraseAI overview)

Final page: "EraseAI covers steps 3-10 in one platform. Free to start — eraseai.ai"`,
      cta: "Download Checklist",
    },
  ],
};

const VIRAL_ADS = {
  videoScripts: [
    {
      title: "POV: Your CEO asks if AI tools are leaking company data",
      platform: "TikTok / Reels / Shorts",
      duration: "15-30s",
      hook: "Your CEO just asked: 'Are our employees leaking data to ChatGPT?'",
      script: `[HOOK — 0-3s]
Text on screen: "Your CEO just asked if AI tools are leaking company data"
You, looking nervous at your desk.

[BODY — 3-20s]
Cut to screen recording:
- Employee pasting: "Our AWS key is AKIA..."
- ChatGPT processing the prompt
- Text: "This happened 847 times last month"
- Cut to EraseAI Firewall blocking the prompt in real-time
- Text: "99% of injection attacks caught"
- Show rewritten safe version: "Using cloud credentials for..."

[CTA — 20-30s]
Text: "EraseAI — AI Firewall"
"Free to start. eraseai.ai"
Your face, looking relieved.`,
      hashtags: "#AIFirewall #CyberSecurity #DataLeak #ChatGPT #TechTok #InfoSec #CISO #DataPrivacy",
    },
    {
      title: "What $5/month actually gets you in 2026",
      platform: "TikTok / Reels / Shorts",
      duration: "15s",
      hook: "What $5/month gets you in 2026:",
      script: `[HOOK — 0-2s]
Text: "What $5/month gets you in 2026:"

[BODY — 2-12s]
Fast cuts, each item 1.5s:
- "Every AI prompt scanned for sensitive data" ✅
- "Automatic rewriting: risky → safe" ✅
- "30-day risk trend monitoring" ✅
- "Alerts when your safety score drops" ✅
- "Browser extension for ChatGPT, Gemini, Claude" ✅
- "Your data NEVER reaches the AI unprotected" ✅

[CTA — 12-15s]
"EraseAI Personal — $5/month"
"Link in bio → eraseai.ai"`,
      hashtags: "#EraseAI #AIPrivacy #PersonalMode #DataPrivacy #TechTok #WorthIt #ChatGPT #Gemini",
    },
    {
      title: "Samsung banned ChatGPT. Here's the real story.",
      platform: "TikTok / Reels / Shorts",
      duration: "30s",
      hook: "Samsung banned ChatGPT. But banning AI isn't the answer.",
      script: `[HOOK — 0-3s]
News headline visual: "Samsung Bans ChatGPT After Source Code Leak"
Text: "Here's what actually happened..."

[BODY — 3-25s]
- "Samsung engineers pasted proprietary source code into ChatGPT"
- "The code became part of the training data"
- "Samsung banned ChatGPT company-wide"
- "But banning AI = falling behind competitors"
- "The real solution? A governance layer."
- Show EraseAI scanning a prompt, catching code
- "Scan → Block → Rewrite → Log"
- "Every prompt. Every model. Real-time."

[CTA — 25-30s]
"Don't ban AI. Govern it."
"eraseai.ai — free to start"`,
      hashtags: "#Samsung #ChatGPT #DataLeak #AIGovernance #CyberSecurity #EraseAI #TechNews",
    },
    {
      title: "Things that should scare your CISO (AI edition)",
      platform: "TikTok / Reels / Shorts",
      duration: "20s",
      hook: "Things that should terrify your CISO in 2026:",
      script: `[HOOK — 0-2s]
Eerie music. Text: "Things that should terrify your CISO:"

[BODY — 2-16s]
Red text, horror-style reveals:
- "73% of employees use AI tools at work" 😱
- "Only 12% of companies have AI data policies" 😱
- "Average data breach costs $4.45 million" 😱
- "Prompt injection attacks are up 340% YoY" 😱
- "Your team pasted 847 passwords into ChatGPT last month" 😱

[CTA — 16-20s]
Switch to calm, blue tone:
"There's a fix. It takes 30 seconds to set up."
"EraseAI — AI Data Governance"
"eraseai.ai"`,
      hashtags: "#CISO #CyberSecurity #AIThreats #DataBreach #AIGovernance #InfoSec #EraseAI #TechTok",
    },
    {
      title: "I built an AI governance startup. Here's the demo.",
      platform: "TikTok / Reels / Shorts",
      duration: "45-60s",
      hook: "I built an AI firewall. Let me show you what it does.",
      script: `[HOOK — 0-3s]
Founder face to camera: "I built an AI firewall. 30-second demo."

[BODY — 3-50s]
Screen recording walkthrough:
- Open ChatGPT in browser
- Type: "Here's our AWS API key: AKIA..."
- EraseAI extension pops up: ⚠️ BLOCKED — API key detected
- Show rewritten version: "Discussing cloud infrastructure setup..."
- Switch to Dataset Sanitizer
- Upload CSV with names, SSNs, emails
- Show analysis: "47 PII issues found"
- Click "Erase" — all PII removed
- Show Forget Score: 100% verified
- "That's it. Every prompt. Every dataset."

[CTA — 50-60s]
"Free to start. $5/month for unlimited scanning."
"eraseai.ai — link in bio"
Founder: "Go try it."`,
      hashtags: "#EraseAI #StartupDemo #AIFirewall #BuildInPublic #IndieHacker #TechFounder #CyberSecurity",
    },
  ],
  carousels: [
    {
      title: "The AI Data Leak No One Talks About",
      platform: "LinkedIn / Instagram",
      slides: [
        "Slide 1: 'The AI Data Leak No One Talks About' (bold text, dark bg, EraseAI logo)",
        "Slide 2: 'Every day, your team pastes passwords, API keys, and customer data into ChatGPT.' (stat: 73% of enterprises use AI internally)",
        "Slide 3: 'Once it's sent, you can't take it back. The data becomes part of the model.' (visual: data flowing into a black box)",
        "Slide 4: 'Samsung learned this the hard way. Their engineers leaked source code through prompts.' (news headline visual)",
        "Slide 5: 'The solution isn't banning AI. It's governing it.' (transition: red → green)",
        "Slide 6: 'EraseAI: Scan → Block → Rewrite → Log. Every prompt. Every model. Real-time.' (product screenshot)",
        "Slide 7: 'From $5/month for individuals. Enterprise plans available. Free to start → eraseai.ai' (CTA)",
      ],
      caption: `73% of enterprises use AI internally. Only 12% have a data governance layer.

EraseAI is that layer.

Swipe to learn how → eraseai.ai

#AIGovernance #DataPrivacy #CyberSecurity #AIFirewall #ChatGPT #EraseAI`,
    },
    {
      title: "5 Types of Data Your Team Leaks to AI (And How to Stop It)",
      platform: "LinkedIn / Instagram",
      slides: [
        "Slide 1: '5 Types of Data Your Team Leaks to AI Every Day' (alarm icon, bold)",
        "Slide 2: '1. API Keys & Passwords — \"Here's my AWS key: AKIA...\"' (code snippet visual)",
        "Slide 3: '2. Customer PII — Names, emails, SSNs pasted for \"analysis\"' (data table visual)",
        "Slide 4: '3. Source Code — Engineers asking AI to debug proprietary code' (code editor visual)",
        "Slide 5: '4. Financial Data — Revenue numbers, pricing strategies, contracts' (spreadsheet visual)",
        "Slide 6: '5. Internal Communications — Meeting notes, strategy docs, HR records' (chat bubble visual)",
        "Slide 7: 'The Fix: EraseAI scans every prompt BEFORE it reaches AI. Blocks, rewrites, or logs — your choice.' (product demo)",
        "Slide 8: 'Free to start. eraseai.ai' (CTA with logo)",
      ],
      caption: `Your team leaked at least one of these to AI this week.

The question isn't IF it's happening. It's whether you have a governance layer to catch it.

EraseAI → eraseai.ai

#DataLeak #AIPrivacy #CyberSecurity #CISO #InfoSec #EraseAI`,
    },
    {
      title: "AI Governance Starter Kit for CTOs",
      platform: "LinkedIn",
      slides: [
        "Slide 1: 'The CTO's AI Governance Starter Kit' (professional, minimal)",
        "Slide 2: 'Step 1: Audit all AI tools used by employees' (clipboard icon)",
        "Slide 3: 'Step 2: Deploy real-time prompt scanning' (shield icon)",
        "Slide 4: 'Step 3: Sanitize training datasets before fine-tuning' (data cleaning visual)",
        "Slide 5: 'Step 4: Integrate governance into CI/CD pipelines' (code pipeline visual)",
        "Slide 6: 'Step 5: Monitor risk trends and set alert thresholds' (chart visual)",
        "Slide 7: 'EraseAI covers Steps 2-5 in one platform. One SDK call.' (product overview)",
        "Slide 8: 'Free tier available. Pro from $49/mo. eraseai.ai' (CTA)",
      ],
      caption: `AI governance isn't optional anymore. It's a board-level conversation.

Here's how to start — and how EraseAI can help you cover the technical requirements in one integration.

eraseai.ai

#CTO #AIGovernance #TechLeadership #DevOps #Compliance #EraseAI`,
    },
  ],
  memes: [
    {
      title: "The 'This Is Fine' AI Edition",
      concept: "Classic 'This is Fine' dog meme. Panel 1: Dog sitting in room on fire, labeled 'Your company using ChatGPT with no AI governance.' Panel 2: Same dog, fire extinguisher labeled 'EraseAI' appears. Panel 3: Dog looking relieved, room is clean. Caption: 'Don't be the this-is-fine company. eraseai.ai'",
      platforms: "Twitter/X, LinkedIn, Reddit",
      timing: "Post after any major AI data breach news",
    },
    {
      title: "Drake Hotline Bling — AI Security Edition",
      concept: "Drake meme format. Top (rejecting): 'Banning ChatGPT company-wide.' Bottom (approving): 'Deploying EraseAI to govern every AI interaction.' Caption: 'Samsung chose the top one. You don't have to. eraseai.ai'",
      platforms: "Twitter/X, LinkedIn, Instagram",
      timing: "Evergreen — post during AI regulation news cycles",
    },
    {
      title: "Distracted Boyfriend — Data Edition",
      concept: "Distracted boyfriend meme. Boyfriend: 'Your employee.' Girlfriend (being ignored): 'Company data policy.' Other girl: 'Pasting everything into ChatGPT.' Watermark: 'eraseai.ai — the governance layer.' Caption: 'We've all seen it happen. Now there's a fix.'",
      platforms: "Twitter/X, LinkedIn, Reddit",
      timing: "Monday morning posts for maximum engagement",
    },
  ],
  hashtagStrategy: {
    primary: ["#EraseAI", "#AIGovernance", "#AIFirewall", "#DataPrivacy", "#CyberSecurity"],
    secondary: ["#ChatGPT", "#AICompliance", "#PromptSecurity", "#DataLeak", "#MachineLearning"],
    trending: ["#AI", "#TechTok", "#InfoSec", "#CISO", "#DevOps", "#BuildInPublic"],
    campaign: ["#DontBanAIGovernIt", "#MakeAIForget", "#AIDataGovernance"],
  },
};

type TabId = "google" | "linkedin" | "viral";

export default function AdContent({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("google");

  const tabs: { id: TabId; label: string; icon: React.ComponentType<LucideProps>; color: string; bgColor: string; borderColor: string }[] = [
    { id: "google", label: "Google Ads", icon: Search, color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
    { id: "linkedin", label: "LinkedIn Ads", icon: Linkedin, color: "text-sky-400", bgColor: "bg-sky-500/10", borderColor: "border-sky-500/30" },
    { id: "viral", label: "Viral & Social", icon: Sparkles, color: "text-pink-400", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/30" },
  ];

  const activeTabConfig = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen w-full pb-20 relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Ad Strategy & Content</h1>
              <p className="text-sm text-muted-foreground">Ready-to-use ad copy for Google, LinkedIn, and viral campaigns</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                  activeTab === tab.id ? `${tab.bgColor} ${tab.color} ${tab.borderColor}` : "border-border/30 text-muted-foreground hover:bg-muted/10"
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          <div className={`flex items-center gap-3 p-4 rounded-xl ${activeTabConfig.bgColor} border ${activeTabConfig.borderColor}`}>
            {(() => { const Icon = activeTabConfig.icon; return <Icon className={`w-8 h-8 ${activeTabConfig.color}`} />; })()}
            <div>
              <h2 className={`text-lg font-bold ${activeTabConfig.color}`}>{activeTabConfig.label}</h2>
              <p className="text-xs text-muted-foreground">
                {activeTab === "google" && "Search campaigns, responsive ads, Performance Max assets, and keyword strategy"}
                {activeTab === "linkedin" && "Sponsored Content, InMail templates, Document Ads, and audience targeting"}
                {activeTab === "viral" && "Short-form video scripts, carousel outlines, meme concepts, and hashtag strategy"}
              </p>
            </div>
          </div>

          {activeTab === "google" && <GoogleAdsTab />}
          {activeTab === "linkedin" && <LinkedInAdsTab />}
          {activeTab === "viral" && <ViralAdsTab />}
        </motion.div>
      </div>
    </div>
  );
}

function GoogleAdsTab() {
  return (
    <div className="space-y-6">
      {GOOGLE_ADS.campaigns.map((campaign, ci) => (
        <CollapsibleSection key={ci} title={campaign.name} icon={campaign.icon} color={campaign.color} defaultOpen={ci === 0}>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground"><strong className="text-foreground">Targeting:</strong> {campaign.targeting}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground"><strong className="text-foreground">Bid Strategy:</strong> {campaign.bidStrategy}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground"><strong className="text-foreground">Est. Metrics:</strong> {campaign.estimatedMetrics}</span>
            </div>
          </div>

          {campaign.adGroups.map((group, gi) => (
            <div key={gi} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">{group.name}</h4>
                <CopyAllButton items={[
                  "HEADLINES:\n" + group.headlines.join("\n"),
                  "DESCRIPTIONS:\n" + group.descriptions.join("\n"),
                  "KEYWORDS:\n" + group.keywords.join(", "),
                ]} />
              </div>

              <div>
                <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Headlines (30 char max)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.headlines.map((h, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-background/50 rounded-lg px-3 py-1.5 border border-border/10">
                      <span className="text-xs font-mono text-foreground/90 truncate">{h}</span>
                      <span className={`text-[10px] shrink-0 ${h.length <= 30 ? "text-emerald-400" : "text-destructive"}`}>{h.length}c</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Descriptions — Variant A (90 char max)</p>
                <div className="space-y-2">
                  {group.descriptions.map((d, i) => (
                    <div key={i} className="bg-background/50 rounded-lg p-3 border border-border/10">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-foreground/90 leading-relaxed">{d}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] ${d.length <= 90 ? "text-emerald-400" : "text-yellow-400"}`}>{d.length}c</span>
                          <CopyButton text={d} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {group.descriptionsB && group.descriptionsB.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider">Descriptions — Variant B (A/B Test)</p>
                  <div className="space-y-2">
                    {group.descriptionsB.map((d, i) => (
                      <div key={i} className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-foreground/90 leading-relaxed">{d}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] ${d.length <= 90 ? "text-emerald-400" : "text-yellow-400"}`}>{d.length}c</span>
                            <CopyButton text={d} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">Target Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.keywords.map((k, i) => <KeywordBadge key={i} text={k} />)}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-destructive mb-2 uppercase tracking-wider">Negative Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.negativeKeywords.map((k, i) => <KeywordBadge key={i} text={`-${k}`} />)}
                </div>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      ))}

      <CollapsibleSection title="Performance Max Assets" icon={Zap} color="bg-purple-500/10 text-purple-400">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Short Headlines</p>
            <div className="space-y-1.5">
              {GOOGLE_ADS.performanceMax.headlines.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-1.5 border border-border/10">
                  <span className="text-xs font-mono text-foreground/90">{h}</span>
                  <CopyButton text={h} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Long Headlines</p>
            <div className="space-y-2">
              {GOOGLE_ADS.performanceMax.longHeadlines.map((h, i) => (
                <AdCard key={i} title={`Long Headline ${i + 1}`} content={h} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Descriptions</p>
            {GOOGLE_ADS.performanceMax.descriptions.map((d, i) => (
              <AdCard key={i} title={`Description ${i + 1}`} content={d} />
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Sitelink Extensions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOOGLE_ADS.performanceMax.sitelinks.map((s, i) => (
                <div key={i} className="bg-background/50 rounded-lg px-3 py-2 border border-border/10">
                  <p className="text-xs font-medium text-foreground">{s.text}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{s.url}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function LinkedInAdsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs p-3 rounded-lg bg-sky-500/5 border border-sky-500/10">
        <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="text-muted-foreground"><strong className="text-foreground">Overall Est. Metrics:</strong> {LINKEDIN_ADS.estimatedMetrics}</span>
      </div>
      <CollapsibleSection title="Sponsored Content Posts" icon={Image} color="bg-blue-500/10 text-blue-400" defaultOpen>
        {LINKEDIN_ADS.sponsoredContent.map((post, i) => (
          <div key={i} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-foreground">{post.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{post.type}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground"><strong className="text-foreground">Targeting:</strong> {post.targeting}</span>
            </div>

            {post.imageDirection && (
              <div className="flex items-start gap-2 text-xs">
                <Image className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground"><strong className="text-foreground">Image Direction:</strong> {post.imageDirection}</span>
              </div>
            )}

            <AdCard title="Primary Text (Variant A)" subtitle={`Headline: "${post.headline}" | CTA: ${post.cta}`} content={post.primaryText} badge="A" badgeColor="bg-emerald-500/10 text-emerald-400" />
            <AdCard title="Primary Text (Variant B)" subtitle={`Headline: "${post.headline}" | CTA: ${post.cta}`} content={post.abVariant} badge="B" badgeColor="bg-amber-500/10 text-amber-400" />
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Message Ads (InMail)" icon={Mail} color="bg-purple-500/10 text-purple-400">
        {LINKEDIN_ADS.messageAds.map((msg, i) => (
          <div key={i} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">{msg.title}</h4>
              <CopyButton text={`Subject: ${msg.subject}\n\n${msg.body}`} />
            </div>
            <div className="flex items-start gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground"><strong className="text-foreground">Targeting:</strong> {msg.targeting}</span>
            </div>
            <div className="bg-background/50 rounded-lg p-3 border border-border/10">
              <p className="text-xs font-bold text-primary mb-2">Subject: {msg.subject}</p>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Document Ads (Lead Magnets)" icon={FileText} color="bg-emerald-500/10 text-emerald-400">
        {LINKEDIN_ADS.documentAds.map((doc, i) => (
          <div key={i} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">{doc.title}</h4>
              <CopyButton text={doc.outline} />
            </div>
            <div className="flex items-start gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-muted-foreground"><strong className="text-foreground">Targeting:</strong> {doc.targeting}</span>
            </div>
            <div className="bg-background/50 rounded-lg p-3 border border-border/10">
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{doc.outline}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Megaphone className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground"><strong className="text-foreground">CTA Button:</strong> {doc.cta}</span>
            </div>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
}

function ViralAdsTab() {
  return (
    <div className="space-y-6">
      <CollapsibleSection title="Short-Form Video Scripts" icon={Video} color="bg-pink-500/10 text-pink-400" defaultOpen>
        {VIRAL_ADS.videoScripts.map((video, i) => (
          <div key={i} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">{video.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400">{video.platform}</span>
                  <span className="text-[10px] text-muted-foreground">{video.duration}</span>
                </div>
              </div>
              <CopyButton text={`TITLE: ${video.title}\nHOOK: ${video.hook}\n\nSCRIPT:\n${video.script}\n\nHASHTAGS: ${video.hashtags}`} />
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs font-bold text-yellow-400 mb-1">HOOK (first 3 seconds)</p>
              <p className="text-sm text-foreground font-medium">{video.hook}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 border border-border/10">
              <p className="text-xs font-bold text-primary mb-2">FULL SCRIPT</p>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{video.script}</p>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{video.hashtags}</p>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Carousel Post Outlines" icon={Image} color="bg-indigo-500/10 text-indigo-400">
        {VIRAL_ADS.carousels.map((carousel, i) => (
          <div key={i} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">{carousel.title}</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">{carousel.platform}</span>
              </div>
              <CopyButton text={carousel.slides.join("\n\n") + "\n\nCAPTION:\n" + carousel.caption} />
            </div>
            <div className="space-y-1.5">
              {carousel.slides.map((slide, si) => (
                <div key={si} className="flex items-start gap-2 bg-background/50 rounded-lg px-3 py-2 border border-border/10">
                  <span className="text-[10px] font-bold text-primary mt-0.5 shrink-0">{si + 1}</span>
                  <span className="text-xs text-foreground/90">{slide.replace(/^Slide \d+: /, "")}</span>
                </div>
              ))}
            </div>
            <div className="bg-background/50 rounded-lg p-3 border border-border/10">
              <p className="text-xs font-bold text-primary mb-2">CAPTION</p>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{carousel.caption}</p>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Meme / Trend-Jacking Concepts" icon={Sparkles} color="bg-amber-500/10 text-amber-400">
        {VIRAL_ADS.memes.map((meme, i) => (
          <div key={i} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-bold text-foreground">{meme.title}</h4>
              <CopyButton text={meme.concept} />
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{meme.concept}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">Platforms:</strong> {meme.platforms}</span>
              <span><strong className="text-foreground">Timing:</strong> {meme.timing}</span>
            </div>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Hashtag Strategy" icon={Hash} color="bg-cyan-500/10 text-cyan-400">
        <div className="space-y-4">
          {Object.entries(VIRAL_ADS.hashtagStrategy).map(([category, tags]) => (
            <div key={category}>
              <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wider">{category} Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-1 rounded-lg bg-cyan-500/10 text-xs text-cyan-400 border border-cyan-500/20 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <CopyButton text={Object.values(VIRAL_ADS.hashtagStrategy).flat().join(" ")} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
