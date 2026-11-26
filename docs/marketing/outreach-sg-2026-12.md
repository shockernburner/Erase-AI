# Singapore outreach plan, December 2026

Answers only from `product-brief-and-qa.md`. Replaces the US Lemlist approach for now.

## What the earlier campaign taught us (Aug–Sep 2026, from the owner's Drive export)

- 265 emails to US AI/ML SaaS CTOs (20–250 staff) through Lemlist: 5 bounced, **0 replies**. LinkedIn: 90 requests, 1 accepted.
- Sent from three new lookalike domains warmed for about two weeks, now cancelled. That setup usually lands in junk.
- Lessons: no trust in a far market, the wrong buyer (many prospects build AI themselves), and weak deliverability.
  The copy itself (personal first line, checklist offer) was reasonable and is reused below.

## Singapore detection (shipped 2026-11-26, PR #28)

NRIC/FIN and +65 phone checks are live on the server and in the website download (1.6.3). The Chrome Web Store
copy gets them once 1.6.3 passes review, so set up every pilot on 1.6.3 (store if approved, otherwise the
website download) and check the version in the popup. Android does not have them yet: pilots are Chrome-first.

## Who

1. **Direct buyers in Singapore, 10–50 staff**: accounting and audit, corporate secretarial, HR and recruitment,
   clinics, small law firms. Person: the founder, managing partner or practice manager (no IT department).
2. **Partners**: IT support companies (MSPs) that look after those firms. One partner can bring many clients
   and already has their trust. Offer: free accounts for their staff, a referral arrangement agreed case by case
   with the owner.

Find one named person per firm from the firm's own website or LinkedIn. Never info@ or generic inboxes.

## How (cadence)

- Send from **founder@eraseai.ai**, by hand, **at most 20 new emails a day**, Tuesday to Thursday, 9:00–11:00 SGT.
- An agent may research and **save drafts in Gmail**. The owner reads each draft and presses Send. No automated sending.
- Same person on LinkedIn: connect with the note below the day after the email.
- Two follow-ups at most (day 4, day 10), then stop. Anyone who says no is never contacted again.

## Before the first send (deliverability)

1. **Add SPF to eraseai.ai** (currently missing): TXT record, host `@`, value `v=spf1 include:_spf.google.com ~all`.
   DKIM (`google._domainkey`) and DMARC are already present.
2. Send one email to a free placement tester (for example mail-tester.com) and to a personal Gmail and Outlook
   address; check it lands in Inbox and that SPF, DKIM and DMARC all show "pass".
3. Plain text, no tracking pixel, no attachments, at most one link (eraseai.ai with UTM), signature with the
   company name and address, and the line "If this isn't relevant, reply 'no' and I won't write again."
4. Stay well under the Spam Control Act bulk thresholds (as we understand them: more than 100 similar messages in
   24 hours or 1,000 in 30 days). Confirm with a lawyer before scaling.

## Email 1 — direct buyer

```
Subject: Client data in ChatGPT at <Firm>

Hi <first name>,

<One specific line about the firm: a service they offer, a recent post, the kind of client files they handle.>

Most firms we speak to have staff using ChatGPT or Gemini to draft letters and summarise documents. The risk is rarely deliberate: a client's NRIC number, a contact list or a system password pasted in to "just tidy this up".

EraseAI checks each message at the moment someone presses Send in ChatGPT, Claude or Gemini, and holds it if it finds NRIC/FIN numbers, phone numbers, email addresses, card numbers or passwords. The person then cancels, sends a cleaned version, or sends anyway. You see what was caught across the team, never what anyone wrote.

Would a free 30-day pilot for up to 10 of your people be useful? I set it up with you in about 15 minutes.

<Name>
Founder, EraseAI | Vantward Solutions Pte. Ltd.
68 Circular Road #02-01, Singapore 049422
https://eraseai.ai/?utm_source=outreach&utm_medium=email&utm_campaign=sg_dec26

If this isn't relevant, reply "no" and I won't write again.
```

## Email 1 — IT support partner

```
Subject: Your clients and ChatGPT

Hi <first name>,

Your clients are probably asking what to do about staff pasting client data into ChatGPT. Most answers today are a policy document.

EraseAI is a small Singapore-made control for it: a Chrome extension and Android app that checks what people send to ChatGPT, Claude and Gemini and holds messages with personal data, card numbers or passwords. It is rules-based, honest about what it misses, and priced at $9 per person a month for teams.

Could I give your team free accounts to try it, and if it holds up, talk about offering it to your clients?

<Name> ... (same signature)
```

## Follow-ups (reply on the same thread)

- Day 4: "In case it's easier than a call, here's a 60-second look: <video link>. Happy to set up the pilot for one team."
- Day 10: "Last note from me. If this isn't a priority now, I'll leave it. If someone else looks after this, a pointer would help."

## LinkedIn note (300 characters max)

```
Hi <first name>, I'm building EraseAI in Singapore. It stops client data and passwords being pasted into ChatGPT at work. Saw <specific>. Would value your view on how <Firm> handles this. No pitch in DMs unless you ask.
```

## Tracking and stop rule

One sheet: firm, person, source of the specific line, date sent, follow-up 1, follow-up 2, status
(sent / replied / call / pilot / no). Review every Friday.
**After 80 first emails:** fewer than 2 replies means change the segment or the first line, not the volume.
**Goal for December:** 2 pilots started. One named pilot is worth more to an investor than any install count.
