# EraseAI: product brief and Q&A (source of truth for outreach and for Vee)

Written 2026-11-26 from `CLAUDE.md`, `artifacts/eraseai/src/lib/pricingPlans.ts` and the code on `main`.
Anyone (or any agent) writing to customers answers **only** from this file. If a question is not covered,
the answer is "Good question, let me check and come back to you", never a guess.

## One paragraph

EraseAI Firewall checks what a person is about to send to ChatGPT, Claude or Gemini (and Replit, on Chrome)
and holds the message if it finds personal data, card numbers, passwords or API keys. The person then
chooses: **Cancel**, **Sanitize & Send** (paid), or **Send anyway**. It runs in Chrome and in an Android app.
For a team, the owner sees what was caught, by person, without seeing what anyone wrote.
Made by Vantward Solutions Pte. Ltd., Singapore.

## Who it is for (B2B)

Small and mid-sized firms whose staff already use AI chat tools at work and who handle personal or client data:
accounting, corporate secretarial, HR and recruitment, clinics, small law firms, agencies. No security team needed.

## What is live today

| Area | What it does |
|---|---|
| Chrome extension | Checks every message to ChatGPT, Claude, Gemini, Replit at the moment of Send. Free checks run on the device, no account. |
| Paid on Chrome | One-click Sanitize & Send; attachment and screenshot scanning (PDF, Word, Excel, slides, images; text in images is read inside the browser) with "Download clean copy". |
| Android app | Gate over the Send button in the AI apps the user chooses; Sanitize; EraseAI Safe (cleaned files kept on the phone). Free trial: 7 days or 25 messages. |
| Teams/Family | 3 to 10 people. Owner dashboard: people, invite links (single or bulk), what was caught by person, billing. |
| Developer API | `POST /api/dev/analyze`, `POST /api/dev/sanitize`; for Pro and above. |

Confirm on the live site before promising: the **audit log** (one row per firewall decision per member, with CSV
download) is in the code on `main`; check it shows on the deployed organization page first.

## Not available (say "on the roadmap", never "available")

Company-wide rules and custom detection, managed rollout through Google Admin / Intune (labelled "soon" on pricing),
managed Android rollout, SSO/SCIM, SIEM export, Edge/Safari/Firefox, iOS. A free way to try attachment scanning.

## Prices (do not change, do not discount without the owner)

| Plan | Price |
|---|---|
| Free | $0, Chrome only, no account |
| Personal | $5 a month or $54 a year |
| Pro | $19 a month (API) |
| Teams/Family | $9 per person a month, or $8 a month billed yearly; 3 to 10 people |
| Enterprise | Contact us |

**Pilot offer for outreach:** free for 30 days for one team of up to 10 people. Set up by the owner
(admin "create organization" or a 100%-off code), never promised as permanent.

## Honest limits (say these plainly when relevant)

- Detection uses **pattern rules and checks** (for example the Luhn check for card numbers). It is **not AI detection**.
  It can miss things and can flag harmless text.
- It protects the **outgoing** message. It does not stop prompt injection, does not check what the AI answers,
  and does not cover email, Slack or other apps.
- Chrome only on computers. iPhone is not supported.
- Do not claim "nothing is stored": a change that keeps only a short labelled excerpt is in the code but
  not yet applied to the live database.
- Never say "first", "only", "unbreakable", "100%", "AI-powered", "VPN".

## Company facts (public)

Vantward Solutions Pte. Ltd., Reg. No. 202606980C, 68 Circular Road #02-01, Singapore 049422.
Founder: 17 years in security (Air Force: physical, national, cyber), then aerospace engineering, then started
Vantward and wrote EraseAI by hand. Site https://eraseai.ai. Chrome Web Store publisher is a verified trader.

## Q&A

**What does it actually stop?** Email addresses, card numbers, US-format phone and social security numbers,
passwords, API keys and other secrets, at the moment someone presses Send.
**Not yet (tested 2026-11-26 against the real scanner):** Singapore NRIC/FIN numbers, Singapore phone numbers
(+65 9123 4567), bank account numbers and salaries. Never use these as examples until a rule for them ships.

**Does it read everything my staff type?** On the free plan the check runs inside the browser; the text does not
leave the computer. With an account, text is sent to our API over HTTPS for the check. The team owner sees counts
and types of what was caught, never the message.

**Can my staff just turn it off?** Today, yes: it is an extension they install. Forced installation by IT is on
the roadmap.

**What happens when it finds something?** The message is held. The person can cancel, send a cleaned version
(paid), or send anyway. Nothing is sent without the person choosing.

**Does it work with Copilot, DeepSeek or other tools?** Today the checks cover ChatGPT, Claude, Gemini and Replit
in Chrome, and the AI apps a person picks on Android. Ask us before relying on any other tool.

**Will it slow people down?** Checks happen at Send and normally take a moment. We have not published a
measured number; do not quote one.

**Is it PDPA compliant?** We do not make a compliance claim. It helps reduce one common way personal data leaves
a firm. Your own PDPA obligations stay with you.

**How do we start?** A free 30-day pilot for one team of up to 10 people. About 15 minutes to set up with the founder.

**Who do I talk to?** The founder, at founder@eraseai.ai.

## Rules for Vee (the Vantward mascot) if it answers on the site

Vee answers only from this file, in short plain sentences, and says it is Vantward's assistant, not a person.
It never invents features, prices, numbers or customers, never asks for or repeats personal data, and hands
anything it cannot answer, pricing exceptions, or "I want a pilot" to founder@eraseai.ai.
