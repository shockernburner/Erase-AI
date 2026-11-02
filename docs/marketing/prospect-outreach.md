# EraseAI — company outreach (Team / Enterprise)

Emails for the companies in `EraseAI_Prospects_Customers.csv`. Send them in
the launch week, after the launch gate in `extension-launch-posts.md`
passes: a prospect who looks you up should find a live extension, a live
Android app and public launch posts.

## Who first

The big banks (HSBC, DBS, OCBC, AIA…) buy through procurement, security
review and pilots that take 6–12 months. Start them now, but expect the
first paying customer to come from the smaller, faster companies:

| Wave | Companies | Why |
|---|---|---|
| 1 — can decide in weeks | WeLab, ZA Bank, Nium, ADVANCE.AI, Tookitaki | Fintech/regtech, handle customer financial data, small security teams, founders and CISOs reachable on LinkedIn |
| 1 — partners, not buyers | CYFIRMA, CloudSEK | Security firms: offer a referral/reseller arrangement to their clients, and ask for a review of the product |
| 2 — long cycle | DBS, OCBC, UOB, Grab, Sea, GoTo, Standard Chartered, AIA, Prudential, Manulife, Hang Seng, BOCHK, HSBC, CIMB, KBank, VNG, Cathay Pacific | Start the conversation and get the security questionnaire early |

Find one named person per company (CISO, Head of Information Security, or
Head of IT for smaller firms) on LinkedIn. Never send to generic info@
addresses.

## What we can promise (keep emails inside this)

Live today:

- Chrome extension checks every message to ChatGPT, Claude
  and Gemini before it is sent; on-device checks with no account. Attachment and screenshot scanning
  is on paid plans (Personal and above, so Teams/Family and Enterprise);
  never say it is free.
- Android app for AI apps on phones.
- Teams/Family plan: $9 per person a month (3–10 people), admin dashboard of what
  was caught by person, invite links, one invoice.
- Managed rollout on Chrome (from extension 1.6.0): IT force-installs the
  extension through Google Admin or Intune with an enrollment token, and
  people join with their work email. See `docs/MANAGED_ROLLOUT.md`.
- Enterprise: private deployment (on-premises or own cloud), data
  residency, DPA, security review support.

Marked "soon" on the pricing page — do **not** promise as available: SSO
(SAML) and SCIM, company-wide policies / custom rules, SIEM export, audit
log export, managed Android rollout. Say "on the roadmap" and offer to
share the timeline.

Detection is pattern rules plus validators, not an LLM. Don't quote
accuracy numbers.

## Email 1 — fintech / regtech (wave 1)

```
Subject: Customer data in ChatGPT at <Company>

Hi <first name>,

<One specific line: their recent AI announcement, a product launch, a job post for AI roles, or the trigger in our prospect list.>

When teams start using ChatGPT, Claude and Gemini at work, the leak is rarely deliberate: a support ticket pasted in with a customer's details, a log file with an API key, a spreadsheet "just to summarise". Blocking AI tends to push people onto personal devices instead.

EraseAI checks each message, and on paid plans each attachment, in the browser at the moment someone presses Send, and stops keys, card numbers and personal data before they leave. Your IT team can force-install it on every company Chrome browser through Google Admin or Intune; staff don't set anything up. You get a dashboard of what was caught.

Would a 30-day pilot with one team of up to 10 people be useful? It takes about 15 minutes to set up and I'll do it with your IT lead.

<Your name>
Founder, EraseAI (Vantward Solutions Pte. Ltd., Singapore)
https://eraseai.ai/?utm_source=outreach&utm_medium=email&utm_campaign=wave1
```

## Email 2 — large bank / insurer (wave 2)

Shorter. The goal is a 20-minute call and their security questionnaire,
not a sale.

```
Subject: AI prompt data leaks — 20 minutes?

Hi <first name>,

<One specific line: their GenAI rollout, sandbox participation, or regulator guidance they've referenced.>

As GenAI tools spread across <Company>, the gap most security teams tell us about is the moment an employee pastes customer or internal data into a chat. EraseAI closes that gap at the browser: every prompt (and, on paid plans, every attachment) is checked before it is sent to ChatGPT, Claude or Gemini, with on-premises or private-cloud deployment for regulated environments.

Could we have 20 minutes in the next few weeks? I'd like to understand how you're handling this today, and I'm happy to start your vendor security questionnaire in parallel.

<Your name>
Founder, EraseAI
https://eraseai.ai/?utm_source=outreach&utm_medium=email&utm_campaign=wave2
```

## Email 3 — security firm partner (CYFIRMA, CloudSEK)

```
Subject: Partnering on shadow-AI data leaks

Hi <first name>,

Your clients are asking how to stop staff pasting sensitive data into AI tools, and most answers today are policy and training. EraseAI is the control that enforces it: a browser extension and Android app that checks prompts and files before they reach ChatGPT, Claude or Gemini, deployable by IT through Google Admin or Intune.

Two things I'd value: your team's honest technical review of it, and, if it holds up, a referral or reseller arrangement for your clients. Can I set you up with a free account and send you a short technical brief?

<Your name>
Founder, EraseAI
```

## Follow-ups

Send at most two, then stop.

- **Day 4:** reply on the same thread. "Sharing a 60-second demo in case it's easier than a call: <video link>. Happy to run a pilot with one team."
- **Day 10:** "Last note from me. If AI data leaks aren't a priority this quarter, I'll check back in <month>. If someone else owns this, I'd appreciate a pointer."

## LinkedIn connection note (≤ 300 characters)

```
Hi <first name>, I'm building EraseAI, which stops customer data and keys from being pasted into ChatGPT and other AI tools at work. Saw <specific>. Would value your view on how <Company> handles this. No pitch in DMs unless you ask.
```

## Tracking

Add three columns to `EraseAI_Prospects_Customers.csv` as you go: `Contact
name`, `Last contacted`, `Status` (sent / replied / call booked / pilot /
no). Review weekly; a reply rate under 5% after 20 sends means the first
line isn't specific enough.
