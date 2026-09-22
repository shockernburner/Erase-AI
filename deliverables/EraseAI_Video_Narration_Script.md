# EraseAI — Video Narration Script

**For:** Investor meetings · landing animation (~85s) · English pitch animation (~30s)  
**Company:** Vantward Solutions Pte Ltd · Singapore · eraseai.ai  
**Founder:** Firdous Mahmood · director@vantward.com

---

## How to use this doc

- **Landing video** (`artifacts/landing-video/`) — product demo, ~85 seconds. Use the **90-second voiceover** below; music at 15–20%, voice clear.
- **Investor pitch animation** (`artifacts/pitch-video-en/`) — deck companion, ~30 seconds. Use the **30-second voiceover** below.
- **Live meeting tomorrow:** Play the landing video silently or at low volume and read the **2-minute live script** while it loops. Pause after the firewall scene for emphasis.
- Pace: **145–150 words per minute**. Short sentences. Let the visuals carry the numbers.

---

## A. Landing video — 90-second voiceover (timed to scenes)

Total runtime: **85 seconds** (10+5+5+5+13+10+17+10+10). Leave 0.5–1s breathing room between scenes.

| Time | Scene | On screen | Voiceover |
|------|-------|-----------|-----------|
| 0:00–0:10 | Ambient | EraseAI logo pulse | *(Music only — no VO, or whisper)* “EraseAI.” |
| 0:10–0:15 | Logo reveal | Chat UI, risky paste | “Every day, sensitive data is pasted into public AI tools — before anyone realizes it’s gone.” |
| 0:15–0:20 | Problem | Data leaking outward, “Control Lost” | “Source code, customer records, API keys — sent to models you don’t control. Traditional security never sees the prompt.” |
| 0:20–0:25 | Governance | AI Data Governance Layer | “EraseAI is the governance layer at the moment of Send — inside the browser, on Android, and in your API pipeline.” |
| 0:25–0:38 | Scanning | PII scan, risk score 72 | “It scans text, files, images, and archives on-device. PII, secrets, toxicity, legal exposure — classified in real time with a clear risk score.” |
| 0:38–0:48 | Rewriting | Sanitize before / after | “Users don’t have to choose between productivity and safety. EraseAI rewrites the prompt — same meaning, sensitive data removed.” |
| 0:48–1:05 | Firewall | Shield blocks injection; ChatGPT / Claude / Gemini | “The AI firewall blocks prompt injection and exfiltration before data reaches ChatGPT, Claude, or Gemini. One control point for shadow AI across every surface your team uses.” |
| 1:05–1:15 | Dev tools | API, dashboard, dataset sanitizer | “For builders: APIs, webhooks, and a dataset sanitizer — so clean data goes in, and you can prove what your models were allowed to learn.” |
| 1:15–1:25 | Closing | Tagline frame | “EraseAI. Make AI forget what it should never learn. Stop the leak before Send.” |

**Word count:** ~195 words → fits 85–90s at measured pace.

---

## B. Investor pitch animation — 30-second voiceover

Timed to `artifacts/pitch-video-en/` scene durations (4+3.5+3.5+4.5+3.5+4+3.5+3.5s).

| Time | Scene | Voiceover |
|------|-------|-----------|
| 0:00–0:04 | Hook | “Every day, sensitive enterprise data is pasted into public AI tools.” |
| 0:04–0:07.5 | Why now | “Regulation is tightening, while the cost of a breach keeps rising.” |
| 0:07.5–0:11 | Problem | “Traditional firewalls cannot understand what employees reveal inside an AI prompt.” |
| 0:11–0:15.5 | Solution | “EraseAI discovers, classifies, and removes sensitive data before it leaves the user’s environment.” |
| 0:15.5–0:19 | Market | “We sit at the intersection of AI cybersecurity and data-loss prevention — a market growing past ninety billion dollars by 2030.” |
| 0:19–0:23 | Business model | “Product-led growth: free trial, five-dollar Personal, ninety-nine-dollar Team — then Enterprise.” |
| 0:23–0:26.5 | The ask | “We’re raising two point five million dollars to ship the Team console, harden detection, and convert pilots to paid seats.” |
| 0:26.5–0:30 | Close | “EraseAI — securing the AI-native future. Thank you.” |

---

## C. Two-minute live presentation (read over silent video)

Use when investors watch the landing animation or deck without narration.

> Every day, employees use ChatGPT, Claude, and Gemini to work faster. In the process, they paste source code, customer PII, credentials, and financial data into tools the company does not fully control. Once it’s sent, it can be logged, retained, or used for training — and legacy DLP never saw the prompt layer.
>
> EraseAI closes that gap. It is a prompt-layer AI firewall: browser extension, Android app, and developer API. It inspects prompts and attachments on-device — text, files, OCR, archives — and gives a Safe, Caution, or Danger verdict before anything leaves. Users can sanitize, cancel, or send anyway with audit.
>
> We govern use; we don’t block AI. That’s why mid-size SaaS, agencies, and tech teams are our beachhead — high ChatGPT adoption, security waking up, no appetite for “ban the chatbot.”
>
> We’re pre-revenue with active pilots. The product is live: Chrome extension, Android on Play internal testing, Stripe and Google Play billing wired. The motion is land free, convert to Team at ninety-nine dollars a month, expand to Enterprise with SSO and audit.
>
> We’re raising a two-point-five-million-dollar seed to build the Team and Enterprise console, harden detection, and run GTM to convert pilots into paying logos and early ARR.
>
> EraseAI: stop the leak before Send. Sell the control plane after. I’d love your feedback — and twenty minutes to walk through a live demo.

**Delivery notes**

- Pause after “EraseAI closes that gap.”
- Don’t read every on-screen stat; point once: “Grand View Research — AI cyber, twenty-four percent CAGR.”
- End on the closing frame, then silence for two beats before Q&A.
- If they want a live demo: paste an AWS key or customer record into ChatGPT with the extension on.

---

## D. One-liners (if interrupted or time is short)

| Question | Answer |
|----------|--------|
| What is EraseAI? | “An AI firewall at the prompt layer — inspect before Send, across browser, mobile, and API.” |
| Why not block ChatGPT? | “Banning fails. We let teams use AI productively while controlling what leaves the device.” |
| Who pays? | “Security and eng leaders in SaaS and agencies — Team at $99/mo is the primary SKU.” |
| Traction? | “Shipping product, active pilots, pre-revenue — extension and Android live, billing on Stripe and Play.” |
| The ask? | “$2.5M seed — Team console, detection, GTM to paid logos and early ARR.” |

---

## E. Slide deck sync (13 slides, optional voice track)

If presenting the PDF deck slide-by-slide instead of video:

1. **Title** — “EraseAI: AI firewall for the prompt layer.”
2. **Problem** — “Data leaves at Send; DLP misses the chat box.”
3. **Why now** — “Shadow AI + regulation + breach cost.”
4. **Solution** — “On-device scan, rewrite, block — browser + Android + API.”
5. **How it works** — “Detect → score → act before the model sees it.”
6. **Differentiation** — “Prompt-native, attachment-deep, multi-LLM, land-and-expand.”
7. **Market** — “Large AI-cyber market; sharp beachhead in SaaS/agencies.”
8. **Business model** — “$0 trial → $5 Personal → $99 Team → Enterprise.”
9. **ROI** — “Cost of one breach vs. cost of control” *(illustrative — say so aloud)*.
10. **Traction** — “Live product, pilots, pre-revenue, billing live.”
11. **Enterprise** — “Endpoint first, network backstop, policy on their servers.”
12. **The ask** — “$2.5M seed — console, detection, GTM.”
13. **Close** — “Stop the leak before Send. Sell the control plane after.”

**Enterprise HOW TO:** `deliverables/EraseAI_Enterprise_Deployment_Guide.md`

**Target deck time:** 9–11 minutes + demo + Q&A.
