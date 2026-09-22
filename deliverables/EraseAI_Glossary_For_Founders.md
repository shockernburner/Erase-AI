# EraseAI Glossary — plain English for tomorrow

You're a builder, not a banker. This translates the jargon in the cheat sheet, speaker notes, and investor emails.

---

## Money & fundraising

| Term | Plain English |
|------|----------------|
| **Seed round** | First real investment round. Money to prove the product and get first paying customers — not to be huge yet. |
| **Series A** | The *next* round after seed, usually when you have real revenue and need to scale. |
| **$2.5M raise / the ask** | How much money you're asking investors for. |
| **Pre-money valuation** | What the company is worth *before* their money goes in. Example: $12M pre + $2.5M in = company valued at $15M after. |
| **Post-money** | Pre-money + money raised. $12M pre + $2.5M = **$15M post**. |
| **Dilution** | How much of the company you give up. Raise $2.5M at $12M pre ≈ you sell ~17% of the company. |
| **Lead investor** | The main VC who writes the biggest check ($1M–1.5M) and often sets the terms. Others follow. |
| **Angels** | Individual rich people who invest smaller amounts, often early. |
| **SAFE** | "I'll give you money now; we figure out your share later at Series A." Simple paperwork, common at seed. |
| **Priced round** | Money in *now* at an agreed valuation — clean cap table, more formal. |
| **Cap (on a SAFE)** | Maximum valuation used when the SAFE converts to shares. Protects early investors. |
| **Cap table** | Spreadsheet of who owns what % of the company (you, investors, option pool). |
| **Option pool** | Shares reserved for future employees. Investors often ask you to refresh this (~10–15%). |
| **Runway** | Months you can operate before cash runs out. $2.5M ≈ ~22 months at planned burn. |
| **Burn** | How much you spend per month (salaries, servers, etc.). |
| **ARR** | **Annual Recurring Revenue** — subscription money × 12. 10 Team customers at $99/mo ≈ $12K ARR. |
| **MRR** | Monthly recurring revenue. ARR = MRR × 12. |
| **ACV** | **Annual Contract Value** — how much one customer pays per year (especially Enterprise). |
| **Pre-revenue** | No paying customers yet (you have pilots — be honest about this). |
| **ROI** | Return on investment — "was it worth it?" Often illustrated, not guaranteed. |
| **Unit economics** | Does one customer make sense? e.g. $99/mo Team vs cost of one data breach. |
| **Illustrative / projection** | "This is a model, not our bank statement." Say this aloud on the ROI slide. |

---

## Go-to-market & business

| Term | Plain English |
|------|----------------|
| **GTM** | **Go-to-market** — how you find customers and sell (not just build). |
| **PLG** | **Product-led growth** — users try free / install themselves; company sales comes later. |
| **SKU** | A product tier you sell. Your SKUs: Free, $5 Personal, $99 Team, Enterprise, $19 API. |
| **Beachhead** | First narrow market you win (mid-size SaaS, agencies) before going everywhere. |
| **Land and expand** | Get in the door cheap (free / Personal), then upsell Team and Enterprise. |
| **Wedge** | The small sharp product that gets you in — your browser + Android firewall. |
| **Pilot** | A company trying EraseAI for free or cheap before paying — you have these. |
| **Design partner** | Early Enterprise customer who helps shape the product in exchange for influence / discount. |
| **Logo** | A paying customer you can name (or "Team logo" = recognizable company on customer list). |
| **Motion** | Your sales path: trial → Personal → Team → Enterprise. |
| **Bottom-up** | Individual dev installs first; later IT/security buys Team policy. |
| **Top-down** | IT/security buys for whole company from day one (harder at seed). |

---

## Security & compliance (your product world)

| Term | Plain English |
|------|----------------|
| **DLP** | **Data Loss Prevention** — tools that stop secrets leaving the company. Old DLP = email/files; yours = **prompts**. |
| **CASB** | **Cloud Access Security Broker** — sits between company and cloud apps (Salesforce, etc.). Different layer than you. |
| **Shadow AI** | Employees using ChatGPT/Claude without IT knowing or approving. |
| **Prompt layer** | The chat box + Send button — where text actually leaves for the AI. Your whole thesis. |
| **PII** | **Personally Identifiable Information** — names, emails, phone numbers, IDs, etc. |
| **On-device** | Scanning happens on the user's phone/browser before data goes to the network. Privacy + speed story. |
| **OCR** | Reading text out of images (screenshots, pasted photos). |
| **SSO** | **Single Sign-On** — "log in with company Google/Okta." Enterprise buyers expect this. |
| **SIEM** | Security dashboard where IT collects logs and alerts. Enterprise wants audit logs fed here. |
| **SOC 2** | A security audit standard US enterprises often ask for before big contracts. |
| **GDPR** | EU privacy law. Relevant for data deletion / "machine unlearning" story. |
| **VPC / on-prem** | Customer's private cloud or their own servers — Enterprise option. |
| **Audit trail** | Record of who sent what, what was blocked, who clicked "send anyway." |
| **Verdict** | Safe / Caution / Danger — your risk label before Send. |
| **Egress** | Data leaving the device/network. Your Android VPN path blocks egress when risk is high. |
| **Injection / exfiltration** | Bad prompts trying to steal data or trick the model — your firewall blocks these. |

---

## Tech & product (stuff you already know, translated for investors)

| Term | Plain English |
|------|----------------|
| **LLM** | Large language model — ChatGPT, Claude, Gemini. |
| **GenAI** | Generative AI — the ChatGPT era. |
| **API** | Programmers plug EraseAI into their own apps ($19/mo tier). |
| **Webhook** | "Call my server when something risky happens." |
| **Extension / MV3** | Chrome browser add-on (Manifest V3 = current Chrome extension platform). |
| **IME** | Custom keyboard on Android — your EraseAI keyboard path. |
| **Accessibility service** | Android API you use to overlay the "curtain" before Send in other apps. |
| **AAB / APK** | Android app package. AAB = what Play Store wants; APK = direct install for testing. |
| **Internal testing** | Play Store track where only invited testers get the app — where you are now. |
| **Stripe** | Payment processor for web subscriptions. |
| **Play** | Google Play Store billing for Android. |

---

## People & roles investors mention

| Term | Plain English |
|------|----------------|
| **VC** | Venture capital firm — professional investors who bet on startups. |
| **IC** | **Investment committee** — partners who vote yes/no on a deal inside a VC firm. |
| **CISO** | Chief Information Security Officer — often your buyer for Team/Enterprise. |
| **DPO** | Data Protection Officer — cares about GDPR/privacy. |
| **Founder-led sales** | You are the salesperson today (normal at seed). Round hires help. |

---

## Market stats (from your deck)

| Term | Plain English |
|------|----------------|
| **CAGR** | How fast a market grows per year. 24% CAGR = market grows ~24% each year. |
| **GVR** | Grand View Research — where the $25B → $94B AI cyber stat comes from. |
| **IBM breach cost** | Industry report saying average data breach costs ~$4.88M — used for ROI *illustration* only. |
| **Cyberhaven** | Another security company; cited for "lots of ChatGPT paste is confidential" (qualitative, not your data). |

---

## Acronyms you can mostly ignore tomorrow

| Term | When it comes up |
|------|------------------|
| **MFN** | SAFE legal clause — lawyer handles it. |
| **Figma** | Design tool — irrelevant unless they ask about mockups vs shipped product. |
| **APAC** | Asia-Pacific — Singapore positions you here + globally. |

---

## Three sentences that cover 80% of investor money talk

1. **"We're raising $2.5M seed to get to paying Team customers and early ARR."**
2. **"We're pre-revenue with pilots; the product is live."**
3. **"We're thinking $12M pre-money — happy to discuss structure."**

You don't need to sound like a finance guy. You need to sound clear, honest, and obsessed with the problem. That's you.
