# Demo script: Tuesday (Product Hunt day and meetings)

About 7 minutes. Order: the problem, Chrome, Android, the team dashboard, questions. Everything below is something the product does today.
Say "checks" and "rules", never "AI detection". Never say "first" or "only". Attachment scanning and Sanitize & Send are paid (Personal and up).

## Before you start (10 minutes, the day before and again one hour before)

1. Chrome: load the 1.6.2 build unpacked (`chrome://extensions`, Developer mode, Load unpacked, the `extension` folder). Card says 1.6.2. Remove any other EraseAI copy.
2. Use a separate Chrome profile for the demo, signed in to ChatGPT, Claude and Gemini, signed in to eraseai.ai as the team owner. Close other tabs. Turn notifications off.
3. Files on the desktop: `customer-export-CONFIDENTIAL.csv` (made-up names, emails, card numbers: nothing real) and its `-clean.csv` copy (download it once beforehand with "Download clean copy").
4. Prompt text ready to paste: `Summarise this for Jordan Lee (jordan.lee@example.com), card 4111 1111 1111 1111, phone +65 8123 4567.` (example.com and a standard test card number: neither is real).
5. Android phone: app installed, accessibility on, ChatGPT or Claude chosen in Protected Apps, screen mirroring tested.
6. Team: a demo team created on `/admin/orgs` with "Make me the owner now", 3 seats, you and one second address invited. Send two or three checks from Chrome beforehand so the audit log has real rows. Do not invent rows.
7. Browser tab open on `https://eraseai.ai/pricing`. Wi-Fi checked. Phone charged.

## 1. The problem (30 seconds)

"People paste customer data, passwords and keys into ChatGPT, Claude and Gemini without thinking. I spent 17 years in security, and one morning I caught myself doing it with information about my own child. So I built a check that runs before the message leaves."
(Owner-approved wording. Add nothing about the child.)

## 2. Chrome, free tier (90 seconds)

1. Open ChatGPT. Paste the prompt. Press Send.
2. The message is held. Point at what it found (email, card number, phone) and the three choices: Cancel, Sanitize & Send, Send Anyway.
3. Say: "On the free plan every message is checked on this computer, with no limit. Nothing is sent to us."
4. Click Cancel. Edit the text to something harmless. Send. "All clear", and it goes.
Say once: "It is rules-based, so it can miss things and flag harmless text. You always decide."

## 3. Chrome, attachments (90 seconds, Personal and up)

1. Attach `customer-export-CONFIDENTIAL.csv`. Press Send. It lists what is in the file.
2. Click "Download clean copy". Remove the original. Attach the clean copy. Send. It goes through.
3. Say: "Attachment scanning and the clean copy are on the paid plans."

## 4. Android (2 minutes, the part to spend time on)

1. Phone mirrored. Open the AI app you chose. Type the same prompt. Press Send.
2. The "EraseAI blocked send, tap to review" strip appears. Tap it: the gate card shows what was found and Cancel, Sanitize & Send, Send Anyway.
3. Tap Sanitize & Send: show the cleaned text, then send.
4. Say: "It watches only the apps you choose. It is not a VPN. Free trial is 7 days or 25 messages."
Fallback if the accessibility service stops: re-enable it in Settings, Accessibility, EraseAI. Keep the trailer video on the laptop as a backup.

## 5. The team dashboard (2 minutes)

1. Show `/pricing`: Teams is $9 per person per month ($8 annual), 3 to 10 people, so three people is $27 a month. Enterprise is "contact us".
2. Open Organization: people and seats ("2 of 3 used"), then Add people: one invite, or paste many addresses and get one link each.
3. Scroll to the Audit log: one row per check, who, when, level, what happened, categories. Click Download CSV. Say: "It records the decision only. EraseAI never stores what anyone typed or attached."
4. Open More, then "Install for the whole company": "For bigger companies, IT force-installs the extension through Google Admin or Intune and people join by email domain. A seat is one person, not one PC. Over 10 people we set it up on an invoice."
Say honestly if asked: the IT rollout is built and tested in code, and I will set it up with you for your first rollout.

## 6. Close (20 seconds)

"Try the free Chrome check now, link below. For a team or company, I will set up a free 30-day pilot for up to 10 people." (Owner's approved offer: use it for Singapore B2B conversations.)

## Questions you will get, honest answers

- **Do you read our messages?** No. Free checks run on the device. The audit log keeps level, action, score and categories, never the text.
- **Does it catch everything?** No. It is pattern and checksum rules, so it can miss things and flag harmless text. That is why you stay in control.
- **Other browsers?** Chrome only today; others are planned. No dates.
- **iPhone?** Not today: iOS does not let an app check text typed in other apps.
- **Enroll by IP address?** No. People move networks; we use work-email domains and invite links.
- **Is the Chrome update live?** Say exactly what the store shows. Do not promise a review date.
- **Reviews or users?** Just launched. Do not quote numbers.

## If something breaks live

- Chrome panel does not appear: reload the AI tab, then show the Android part first.
- Audit log empty: run one check on screen, refresh, show it. Never type or invent rows.
- Wi-Fi down: play the Play trailer video (`artifacts/ai-firewall-android/store-assets/trailer/`), then the `/start` page video.
