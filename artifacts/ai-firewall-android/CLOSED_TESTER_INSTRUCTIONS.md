# EraseAI Firewall — Closed testing instructions

**For testers only.** Use **synthetic/fake data** — never real customer data, real API keys, or real passwords.

**App:** EraseAI Firewall · **Package:** `com.eraseai.firewall`  
**Support:** director@vantward.com

---

## 1. Install (must be from Play)

1. Open the **closed testing opt-in link** we sent you (Google Play).
2. Tap **Install** / **Update** — do **not** sideload an APK from email.
3. Open **EraseAI Firewall** once installed.

---

## 2. Account

1. **Sign up** or **sign in** with your EraseAI account.
2. Confirm you see the dashboard (7-day trial is normal for new accounts).

---

## 3. Enable protection (required)

1. In the app: **Protected apps** → enable **ChatGPT**, **Gemini**, and/or **Claude** (install at least one AI app first).
2. **Settings → Accessibility → EraseAI Firewall** → turn **ON**.
3. Confirm Android shows the Accessibility permission prompt — you must accept for the send gate to work.

**Optional (stronger typing protection):**  
Settings → **On-screen keyboard** → enable **EraseAI Keyboard**, then select it when typing in an AI app.

---

## 4. What to test (15–20 minutes)

### A. Send gate (main test)

Open **ChatGPT** or **Gemini**, type something **fake but sensitive**, for example:

- `My AWS key is AKIAIOSFODNN7EXAMPLE`
- `Customer email: test@example.com, SSN 123-45-6789`

Tap **Send**.

**Expected:** A colored bar covers the bottom/send area. Tap it → **Cancel**, **Sanitize & Send**, or **Send Anyway** (depending on risk). The message should **not** reach the AI until you choose.

Also try:

- **Safe text** (e.g. `hello world`) → should send normally, no curtain.
- **Cancel** on the gate → text returns to composer, nothing sent.

### B. Manual scan

In EraseAI app → **Manual scan** → paste fake sensitive text → run scan → see results.

### C. Subscription (optional)

If we asked you to test billing: **Trial & Subscription** → subscribe (test account) → confirm plan updates. Manage via **Google Play subscriptions**, not the website.

---

## 5. Report back (copy this template)

Send to **director@vantward.com**:

```
Device: [e.g. Samsung Galaxy S23, Android 14]
AI apps tested: [ChatGPT / Gemini / Claude]
EraseAI version: [from Play → App info, e.g. 1.0.0]
Accessibility ON: [yes/no]
EraseAI Keyboard used: [yes/no / not tried]

Send gate:
- Risky prompt blocked before AI saw it: [yes/no]
- Curtain covered Send button: [yes/no]
- Cancel worked: [yes/no]
- Any send leak (AI replied before you allowed): [yes/no — describe]

Issues / confusing UX:
[free text]

Crash? [yes/no — steps to reproduce]
```

---

## 6. Do not test with

- Real company secrets, API keys, or customer PII  
- Screenshots containing real data in public posts  
- Expecting full file attachment scanning inside ChatGPT (chips may show “unscanned” — that is expected)

---

## 7. Troubleshooting

| Problem | Try |
|---------|-----|
| Nothing happens on Send | Accessibility OFF? Re-enable. Hard-close and reopen the AI app. |
| Old behavior after update | Uninstall → reinstall from Play closed link. |
| “Network” error on scan | Check internet; sign out/in. |
| Subscribe doesn’t upgrade plan | Email us — Play billing may need a backend check. |

Thank you — your feedback directly shapes the 1.0 public launch.
