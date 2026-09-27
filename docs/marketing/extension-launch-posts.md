# EraseAI Firewall — launch post drafts

Drafts for launching the Chrome extension. Every claim here matches the code
as of extension 1.4.4 — keep it that way; technical audiences check.

**Before posting:** 1.4.4 must be live on the Chrome Web Store (on-device
protection, welcome page, review prompt). Posting while the store still
serves 1.4.3 sends people to a version that needs an account before it does
anything.

---

## What we can say (fact sheet)

- Catches API keys and tokens (AWS, OpenAI, GitHub, Slack, Stripe, JWTs,
  private keys, database URLs), passwords, emails, phone numbers, card
  numbers and SSNs **before you press Send** in ChatGPT, Claude, Gemini and
  Replit.
- Scans attachments too: PDF, Word, spreadsheets, slide decks, images (OCR
  in the browser) and ZIP/TAR archives.
- You choose: **Sanitize & Send** (placeholders), **Send Anyway**, or
  **Cancel**.
- **Works without an account**: checks run on your device with the same
  rules as the EraseAI server. Nothing is sent until you add an API key.
- With an account: server-side scanning, scan history (first 500 chars,
  secrets masked), team dashboard, API.
- Detection is rules-based (patterns plus validators such as the Luhn
  checksum for cards) — say so if asked; do not call it "AI-powered
  detection" or quote accuracy numbers we have not measured.

## Links (one per channel, so installs are attributable)

Base: `https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp`

| Channel | Append |
|---|---|
| Show HN | `?utm_source=hackernews&utm_medium=post&utm_campaign=launch` |
| Reddit | `?utm_source=reddit&utm_medium=post&utm_campaign=launch` |
| Product Hunt | `?utm_source=producthunt&utm_medium=launch&utm_campaign=launch` |
| Indie Hackers | `?utm_source=indiehackers&utm_medium=post&utm_campaign=launch` |
| LinkedIn | `?utm_source=linkedin&utm_medium=post&utm_campaign=launch` |
| X | `?utm_source=x&utm_medium=post&utm_campaign=launch` |
| Newsletters / YouTube | `?utm_source=<name>&utm_medium=creator&utm_campaign=launch` |

---

## 1. Show HN

**Title** (≤ 80 chars):

```
Show HN: EraseAI Firewall – stop secrets and PII before they reach ChatGPT
```

**Body:**

```
Hi HN — we built a Chrome extension that checks what you're about to send to ChatGPT, Claude, Gemini or Replit, and stops it if it contains an API key, password, card number, email or similar.

It hooks the send button (and Enter), scans the prompt plus any attached files — PDFs, Word/Excel/PowerPoint, images via in-browser OCR, and zip archives — and if it finds something, shows what and where. You can Sanitize & Send (replaces values with placeholders), Send Anyway, or Cancel.

Things you'll probably ask:

- Where does my text go? Without an account, nowhere: the checks run in the extension, with the same rules our server uses (the extension's scanner is generated from the server's rule code). If you add an API key, text is sent to our API for scanning and your history keeps the first 500 characters with secrets masked. Images are always OCR'd locally.
- How does detection work? Pattern rules plus validators (e.g. Luhn for card numbers, context checks so "ISBN 978…" isn't a card). No LLM in the loop. It will miss secrets it has no pattern for, and it will sometimes flag harmless text — both are fixable and we'd like examples.
- Why an extension and not a proxy? Consumer AI apps pin TLS and personal laptops don't have a corporate proxy. The extension sees the text before it's encrypted.

Free to install; the on-device checks don't need an account. Would love feedback, especially false positives and things it should have caught.

https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp?utm_source=hackernews&utm_medium=post&utm_campaign=launch
```

**Prepared answers for the thread** (reply fast in the first 2 hours):

- *"Why should I trust an extension with access to my AI chats?"* — Its
  content script runs only on ChatGPT, Claude, Gemini and Replit; the only
  other host it can reach is eraseai.ai (the API, used once you add a key).
  Permissions are `storage` and `activeTab`, and it needs no account to
  work. Offer to answer permission questions line by line.
- *"Regex will have false positives."* — Yes; say which validators exist,
  and ask for examples. Point to "Send Anyway" as the escape hatch.
- *"Is it open source?"* — Answer honestly (it is not today). If there is
  appetite, consider publishing the rule set.
- *"What's the business?"* — Free on-device protection; paid plans add
  server scanning, history, team dashboard and API.

## 2. Reddit

Most security subreddits remove vendor posts. Read each sub's rules the
same day, post as a person (not the company account), disclose you built
it in the first line, and lead with the problem, not the product.

**r/cybersecurity / r/sysadmin** — discussion first, link only if asked or
where self-promotion days allow:

```
Title: How are you handling people pasting secrets into ChatGPT? (built something, looking for feedback)

Disclosure: I built the tool mentioned below.

We kept seeing API keys, customer emails and whole config files pasted into AI chats. Blocking AI outright didn't work — people used it on personal devices instead.

What we ended up building is a browser extension that checks the prompt and attachments at the moment you press Send and offers to redact, send anyway, or cancel. It runs its checks locally unless you connect an account.

Curious what others are doing here: DLP on the proxy, enterprise browser, policy + training, or just accepting the risk? And what would a tool like this need to do before you'd deploy it to a team?
```

**r/SideProject / r/chrome_extensions** (self-promotion allowed):

```
Title: I built a Chrome extension that stops you pasting API keys and personal data into ChatGPT

It checks your prompt and any attached files (PDF, Word, images via OCR, zips) when you hit Send in ChatGPT, Claude, Gemini or Replit. If there's a key, password, card number or email in there, it shows you and offers to redact it.

Works without signing up — the checks run on your device.

Would love blunt feedback: what did it flag that it shouldn't have, and what did it miss?

<Chrome Web Store link with utm_source=reddit>
```

Avoid r/ChatGPT (removes self-promotion) and r/privacy (hostile to
anything that can send text to a server; only post there if asked).

## 3. Product Hunt

- **Name:** EraseAI Firewall
- **Tagline** (≤ 60 chars): `Stop secrets and PII before you hit Send in ChatGPT`
- **Topics:** Chrome Extensions, Privacy, Artificial Intelligence, Security
- **Description** (≤ 260 chars):

```
A browser firewall for AI chats. EraseAI checks your prompt and attachments in ChatGPT, Claude and Gemini for API keys, passwords, card numbers and personal data, and lets you redact before sending. Works on-device without an account.
```

- **Gallery:** use the five store screenshots (see
  `extension/STORE_LISTING.md`) plus the 60-second demo video.
- **Maker's first comment:**

```
Hey Product Hunt 👋

We built EraseAI Firewall after watching smart people paste production keys and customer data into AI chats — not carelessly, just fast.

What it does: when you press Send in ChatGPT, Claude, Gemini or Replit, it checks the message and any attached files. If it finds a key, password, card number or personal data, it shows you exactly what, and you choose: Sanitize & Send, Send Anyway, or Cancel.

What we're proud of:
• It works the moment it's installed — checks run on your device, no account needed
• It reads attachments: PDFs, Office files, screenshots (OCR in the browser) and zips
• It stays out of the way when there's nothing to flag

We're a small team and read every comment — tell us what it flagged that it shouldn't have, and what it missed.
```

- **Launch day:** go live 12:01 AM PT, reply to every comment, post the
  LinkedIn and X announcements at 8 AM in your main timezone, and message
  people who asked to be notified (no vote-asking — Product Hunt penalises
  it).

## 4. Indie Hackers

```
Title: Our AI security tool did nothing until you signed up — so we moved the checks into the browser

We make EraseAI, which stops people pasting secrets and personal data into ChatGPT and friends. Our Chrome extension used to need an account and API key before it checked anything. Most installers never got that far.

So we generated an on-device copy of our server's detection rules — same code, built into the extension, with a test that fails if the two ever differ. Now it protects from the first prompt, and the account becomes an upgrade (server scanning, history, team dashboard) instead of a gate.

Other things we added for the launch:
• A welcome page on install and a one-question uninstall survey
• A one-time "rate us" prompt that only appears after the extension has actually stopped a leak a few times
• UTM links on every channel so we know which posts drive installs

Happy to share numbers after launch week. If you use AI tools at work, I'd love to know whether this is useful or annoying.

<link with utm_source=indiehackers>
```

## 5. LinkedIn (founder account)

```
Your team is pasting things into ChatGPT that shouldn't leave the company.

Not on purpose. A log file with a key in it. A customer email thread. A spreadsheet "just to summarise".

We built EraseAI Firewall to catch that at the moment it happens. It's a free Chrome extension that checks prompts and attachments in ChatGPT, Claude and Gemini before they're sent, and offers to redact API keys, passwords, card numbers and personal data.

It works on-device without an account, so anyone can try it in a minute. For teams, there's a dashboard and central controls.

If you run security or IT and are dealing with "shadow AI", I'd like to hear how you're handling it today.

<link with utm_source=linkedin>

#AISecurity #DataLossPrevention #ShadowAI
```

## 6. X / Twitter thread

```
1/ We just launched EraseAI Firewall: a free Chrome extension that stops API keys, passwords and personal data before you hit Send in ChatGPT, Claude and Gemini. 🧵

2/ It checks your prompt AND attachments — PDFs, Office files, screenshots (OCR in your browser), zip files.

3/ Found something? You choose: Sanitize & Send (placeholders), Send Anyway, or Cancel. Clean prompts go straight through.

4/ No account needed. The checks run on your device with the same rules as our server.

5/ Try it and tell us what it gets wrong: <link with utm_source=x>
```

## 7. Creator / newsletter outreach

Targets: security and privacy YouTubers, developer-productivity channels,
and newsletters for IT/security leads (e.g. those covering shadow AI and
DLP). Personalise the first line every time.

```
Subject: A tool for your "AI at work" coverage — free Pro access to test

Hi <name>,

I liked your <specific video/issue> on <topic>. We built EraseAI Firewall, a Chrome extension that stops secrets and personal data from being sent to ChatGPT, Claude and Gemini — it checks prompts and attachments at the moment you hit Send.

A few things your audience might find interesting:
• It works without an account; checks run locally
• It reads attachments, including OCR on screenshots, in the browser
• Pattern-based and transparent about what it catches

Happy to set you up with a Pro account for testing, answer technical questions, or join a call. No obligation to cover it — honest criticism is welcome too.

<your name>
<link with utm_source=<creator>&utm_medium=creator>
```

---

## Suggested order

| Day | Channel |
|---|---|
| 0 | Confirm 1.4.4 is live; screenshots and video uploaded to the listing |
| 1 | Show HN (Tue–Thu, ~8–9 AM ET), stay in the thread all day |
| 2 | LinkedIn founder post + X thread |
| 3–4 | Reddit (one sub per day, following each sub's rules) |
| 7 | Product Hunt |
| 8 | Indie Hackers build story |
| 7–14 | Creator/newsletter outreach, 5–10 personalised emails |

Track per channel in the Chrome Web Store dashboard (installs by
`utm_source`), and on the server: API keys created, first protected send,
uninstall-survey reasons (`extension_uninstall_feedback`).
