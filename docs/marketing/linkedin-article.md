# LinkedIn launch article — EraseAI Firewall

Long-form LinkedIn **Article** (Write article, not a regular post) from the
founder account, plus the short post that shares it. Claims match the fact
sheet in `extension-launch-posts.md`; keep them in sync.

- **Cover image:** `~/Desktop/EraseAI store assets/linkedin-cover.png`
  (1920×1080, built by `video/build_store_assets.py`).
- **Inline media:** after "What it looks like", add store screenshots 1 and 2.
  After "How it works", paste the YouTube link to the demo video (LinkedIn
  embeds it).
- **Link:** every link uses `utm_source=linkedin&utm_medium=article`.
- **When:** Tuesday–Thursday, 8–10 AM in your main audience's timezone.
  Reply to every comment in the first two hours.

---

## Title

```
Your team is already pasting secrets into AI chats. Here's the seatbelt we built.
```

## Article body

```
Picture a good engineer pasting a config file into ChatGPT to ask why a deployment is failing. The answer is useful. The file also contains a live cloud access key.

Nobody was careless. They were fast. That's how almost every AI data leak happens: not through an attacker, but through a helpful person with a deadline, a clipboard and a chat box that accepts anything.

Today we're launching EraseAI Firewall, a free Chrome extension that catches secrets and personal data at the one moment it still matters: before you press Send.

THE PROBLEM NOBODY OWNS

AI assistants are now part of how work gets done. People paste in logs to debug them, customer emails to draft replies, spreadsheets "just to summarise", and contracts to find a clause. Each of those can carry something that should never leave the company: an API key, a password, a customer's phone number, a card number.

Once it's sent, you can't take it back. You can delete the chat, but you can't be sure where the text went.

Most organisations have tried one of three things:

1. Ban AI tools. People use them anyway, on personal laptops and phones, where you have no visibility at all. Banning AI doesn't remove the risk; it hides it.

2. Rely on network DLP. Traditional data-loss tools sit on the corporate network or proxy. They struggle with encrypted AI traffic, and they don't help on the home laptop or the contractor's machine.

3. Write a policy and run training. Necessary, but a policy doesn't stop a paste at 6 PM on a Friday.

The gap is the moment between typing and sending. That's where we put the check.

WHAT WE BUILT

EraseAI Firewall sits inside the AI chat itself. When you press Send (or hit Enter) in ChatGPT, Claude, Gemini or Replit, it checks your message and any files you attached.

If it finds nothing, your message goes straight through. No pop-up, no extra click.

If it finds something, it shows you exactly what and where, and you choose:

• Sanitize & Send: the sensitive values are replaced with placeholders, and the AI only ever sees the masked version. In most cases you still get a perfectly good answer.
• Send Anyway: you're the one who knows the context. Sometimes it's a test key or a public example.
• Cancel: you go back and fix it yourself.

The user stays in control. We think that's important: a security tool that people work around protects no one.

WHAT IT CATCHES

• Access keys and tokens for the cloud, developer and payment services teams use every day, plus private keys and database connection strings
• Passwords, including the "my password is…" kind
• Personal data: email addresses, phone numbers, card numbers and national ID numbers

And because the riskiest pastes are often files, not text, it reads attachments too: PDFs, Word documents, spreadsheets, slide decks, archives, and screenshots or photos of documents. Text in images is read with OCR inside your browser; the image itself is never uploaded.

In our demo, a "customer export" spreadsheet attached to ChatGPT was stopped with 39 findings before a single row was sent.

PRIVACY, BY DESIGN

A tool that reads your AI prompts has to earn trust, so here is exactly how it handles your data:

• It runs only on the AI sites listed above, nowhere else.
• Without an account, every check happens on your device. Nothing is sent anywhere. You're protected from the first prompt after installing.
• With an account, message text is checked by the EraseAI API over HTTPS, and your scan history keeps a short excerpt of each scan with secrets masked, so you and your team can review it.
• We never sell your data or use it to train models.

HONEST ABOUT HOW IT WORKS

Detection is rule-based: patterns for known secret formats, plus validators such as the checksum that real card numbers pass, so that a book's ISBN isn't mistaken for a Visa. There's no AI model guessing in the loop, which makes it fast, predictable and explainable.

It also means it can miss a secret it has no rule for, and sometimes it will flag something harmless. That's why Send Anyway exists, and why we want your examples: every false positive and every miss makes it better for everyone.

FOR SECURITY AND IT TEAMS

If you're responsible for "shadow AI", the goal isn't to stop people using AI. It's to let them use it without leaking what matters. EraseAI gives teams:

• Protection at the point of use, on any device where the extension is installed
• A dashboard with scan history and what was caught
• Team plans and an API to bring the same checks into your own tools

Policy tells people what not to do. A seatbelt catches them when they do it anyway. You need both.

TRY IT

EraseAI Firewall is free on the Chrome Web Store and works without an account:
https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp?utm_source=linkedin&utm_medium=article&utm_campaign=launch

Install it, paste a fake key into ChatGPT, and watch it stop.

Then tell me what it got wrong. And if you run security or IT, I'd really like to hear how you're handling AI data leaks today. Comment below or message me directly.

#AISecurity #DataLossPrevention #ShadowAI #Cybersecurity #ChatGPT #GenerativeAI #Privacy #ChromeExtension
```

---

## Share post (publish with the article)

LinkedIn shows the article as a card; this text sits above it. Keep the first
two lines strong, because that's all people see before "…see more".

```
Smart people paste secrets into ChatGPT every day. Not carelessly. Just fast.

A config file with a cloud key. A customer export "just to summarise". Once it's sent, you can't take it back.

So we built EraseAI Firewall: a free Chrome extension that checks your prompt and attachments in ChatGPT, Claude and Gemini before you press Send, and lets you redact with one click.

→ Works on your device, no account needed
→ Reads PDFs, Office files and screenshots too
→ You decide: Sanitize & Send, Send Anyway or Cancel

I wrote up why bans and network DLP don't solve this, and how we approached it 👇

#AISecurity #ShadowAI #DataLossPrevention
```

## First comment (post right after publishing)

```
Direct install link if you want to try it now: https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp?utm_source=linkedin&utm_medium=comment&utm_campaign=launch

If it flags something it shouldn't, or misses something it should have caught, reply here. I read everything.
```

## After posting

- Reshare from the Vantward Solutions / EraseAI company page with one line
  of your own words (not a copy of the post).
- Message 10–20 people in security, IT and engineering leadership
  individually. Ask for their opinion, not a like.
- A week later, post a short follow-up: what people asked, what you changed
  and any install numbers you're comfortable sharing.
