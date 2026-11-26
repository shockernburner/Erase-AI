# Demo script: 3 minutes (meetings)

Full version with setup, questions and fallbacks: `demo-script-tuesday.md`. Same rules: say "checks" and "rules", never "AI detection", never "first" or "only". Attachment scanning and clean copies are paid.

**Before the meeting (5 minutes):** Chrome with 1.6.2 loaded unpacked and signed in to ChatGPT; phone mirrored with the app on; team dashboard open on a demo team that already has a few real checks in its audit log; this prompt ready to paste:
`Summarise this for Jordan Lee (jordan.lee@example.com), card 4111 1111 1111 1111, phone +65 8123 4567.` (example.com and a test card number: nothing real).

## 0:00 The problem (20 seconds)
"People paste customer data into ChatGPT, Claude and Gemini without thinking. I worked 17 years in security and caught myself doing it too. So I built a check that runs before the message leaves."

## 0:20 Chrome (60 seconds)
1. In ChatGPT, paste the prompt and press Send.
2. The message is held. Point at what it found and the three choices: Cancel, Sanitize & Send, Send Anyway.
3. "On the free plan every message is checked on this computer, with no limit. It is rules-based, so it can miss things; you decide."
4. Click Sanitize & Send (or Cancel, edit, send). It goes.

## 1:20 Android (60 seconds)
1. On the phone, in your chosen AI app, type the same prompt and press Send.
2. Tap the "blocked send, tap to review" strip. Show the gate card and tap Sanitize & Send.
3. "It watches only the apps you choose. It is not a VPN. Free trial is 7 days or 25 messages."

## 2:20 Teams (30 seconds)
1. Organization page: "Teams is $9 per person a month, 3 to 10 people. Invite by link, or paste many addresses."
2. Scroll to the Audit log: "One row per check: who, when, what happened. We store the decision, never the text." Click Download CSV.

## 2:50 Close (10 seconds)
"Try the Chrome check free today. For a team I will set up a free 30-day pilot for up to 10 people."

## If something breaks
Skip to Android (or the Play trailer video). If the audit log is empty, run one check on screen and refresh. Never type or invent rows.

## Three answers to have ready
- **Do you read our messages?** No. Free checks run on the device; the log keeps the decision only.
- **Over 10 people?** Seats are per person; more than 10 is set up by invoice. Rollout through Google Admin or Intune is built and I will set it up with you.
- **Other browsers or iPhone?** Chrome only today, others planned with no date. iOS does not let an app check text typed elsewhere.
