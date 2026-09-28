# Chrome Web Store listing — EraseAI Firewall

Source of truth for the store listing text and assets. The **title** and
**summary** come from `manifest.json` (`name`, `description`) and change only
with an upload; everything else below is pasted into the Developer Dashboard
(Store listing tab) and can be edited without a new version.

Listing URL (Chrome Web Store ID `hckhbadbpkihjpooeljdocgidelcampp`):
<https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp>

---

## Title (manifest `name`, ≤ 75 chars)

```
EraseAI Firewall: Block Secrets & PII Before ChatGPT, Claude, Gemini
```

Brand first, then the job it does and where. Do not add more keywords —
Chrome Web Store policy treats keyword lists in titles as spam.

## Summary (manifest `description`, ≤ 132 chars)

```
Stops API keys, passwords, card numbers and personal data before they reach ChatGPT, Claude or Gemini, in prompts and files.
```

## Category and language

- Category: **Privacy & Security**
- Language: English

---

## Detailed description

Paste as plain text (the store does not render Markdown). The first two
sentences are what search and the listing preview show — keep the value
proposition and the search terms there.

```
EraseAI Firewall catches API keys, passwords, card numbers, emails and customer data in your prompt and your attachments before you hit Send in ChatGPT, Claude or Gemini. Redact it with one click, send anyway, or cancel, and keep your company's secrets out of AI chats.

WHY
Pasting a log, a config file or a customer email into an AI chat is the fastest way to leak a credential or personal data. Once it is sent, you cannot take it back. EraseAI Firewall checks every message at the moment you press Send, so a mistake gets caught instead of shipped.

WHAT IT CATCHES
• Access keys and tokens for cloud services, developer tools and payment platforms, plus private keys and database connection strings
• Passwords, including "my password is…" style disclosures
• Personal data such as email addresses, phone numbers, card numbers and national ID numbers

IT SCANS ATTACHMENTS TOO
Documents, spreadsheets, slide decks, PDFs, plain-text and code files, and archives are checked file by file. Screenshots and photos are read with on-device OCR, so the image is never uploaded. For text files you get a one-click clean copy to re-attach.

HOW IT WORKS
1. Type or paste into ChatGPT, Claude, Gemini or Replit as usual.
2. Press Send. EraseAI Firewall checks the message and any attached files first.
3. If something sensitive is found, you see exactly what and where, and choose: Sanitize & Send (replace it with placeholders), Send Anyway, or Cancel.
Clean messages go through without interruption.

WORKS ON
ChatGPT (chatgpt.com, including Work mode), Claude (claude.ai), Gemini (gemini.google.com) and Replit.

YOUR DATA
• The extension only runs on the AI sites listed above.
• Without an account, every check runs on your device and nothing is sent anywhere.
• With an account, message text is checked by the EraseAI API over HTTPS. Your scan history keeps the first 500 characters of each scan, with keys, tokens, passwords and connection strings masked, so you can review it in your dashboard.
• Images are read with OCR inside your browser; the image itself is never uploaded.
• We never sell your data or use it to train models. Privacy policy: https://eraseai.ai/privacy

FOR TEAMS
Security and IT teams use EraseAI Firewall to cut "shadow AI" data leaks without banning AI tools. Team plans, an admin dashboard and an API are available at https://eraseai.ai.

GETTING STARTED
Install it and it starts checking prompts on your device right away, no account needed. For full scanning, history and your dashboard, create a free account at eraseai.ai and paste your API key into the extension popup.

Made by Vantward Solutions Pte. Ltd. — https://eraseai.ai/ai-firewall
```

**Do not list brands or products in the description** (for example cloud
providers, AI vendors, developer tools or token formats). Version 1.4.4 was
rejected on 2026-09-28 for "excessive keywords" (Spam and Placement, reference
Yellow Argon) because this section named AWS, OpenAI, Anthropic, GitHub, Slack,
Stripe and JWTs. Describe categories instead. Naming the AI sites the
extension runs on (ChatGPT, Claude, Gemini, Replit) is fine; that is where it
works, not a keyword list.

Keep the "YOUR DATA" section in sync with the server's behaviour
(`artifacts/api-server/src/lib/dev/store-redact-source.mjs`) and the
on-device fallback (`extension/src/local-scanner.js`, generated from the
server rules).

---

## Screenshots (1280×800 PNG, up to 5)

Order matters — the first one is the thumbnail in search results. Use real
usage in a clean browser profile, the fake data from the Android QA fixtures,
and a one-line caption band at the top of each image.

| # | Caption | What to show |
|---|---|---|
| 1 | Stop secrets before you hit Send | ChatGPT with a pasted AWS key; the red EraseAI gate listing "AWS access key". |
| 2 | Redact in one click | Before/after: the same prompt with `[AWS ACCESS KEY]` / `[EMAIL ADDRESS]` placeholders, sent. |
| 3 | Scans PDFs, Word files and screenshots | Claude with a PDF attached; the per-file result rows. |
| 4 | Works in ChatGPT, Claude and Gemini | Three-up of the gate on each site. |
| 5 | You decide: Sanitize & Send, Send Anyway or Cancel | The decision buttons and the popup (on/off, key status). |

## Promo images

- Small promo tile: 440×280 PNG — shield logo + "Stop secrets reaching AI".
- Marquee: 1400×560 PNG — only used if the store features the extension;
  logo left, screenshot 1 cropped right.

## Demo video (YouTube, ~60 s)

| Time | Scene |
|---|---|
| 0–5 s | "You're about to paste this into ChatGPT…" — a log file with a key. |
| 5–15 s | Paste, press Send, EraseAI gate appears naming the key. |
| 15–25 s | Tap Sanitize & Send → the key becomes `[AWS ACCESS KEY]` → sent; ChatGPT answers normally. |
| 25–40 s | Attach a PDF invoice in Claude → gate lists the card number and email inside the file. |
| 40–50 s | Same flow in Gemini; clean prompt goes straight through. |
| 50–60 s | "EraseAI Firewall — free on the Chrome Web Store." + URL. |

No voice-over needed; use on-screen captions so it works muted.

---

## Links to the listing

Always add a `utm_source` so the Developer Dashboard can attribute installs:

```
https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp?utm_source=<channel>&utm_medium=<type>&utm_campaign=launch
```

Suggested `utm_source` values: `site`, `reddit`, `hackernews`,
`producthunt`, `indiehackers`, `linkedin`, `youtube`, `newsletter`.
