# EraseAI Firewall for Android: tester guide

Thank you for helping test EraseAI Firewall. It takes about **10 minutes to
set up**, then a minute or two now and then over **14 days**.

**What the app does:** when you're about to send something in the ChatGPT,
Claude or Gemini apps, it checks for API keys, passwords and personal data,
and lets you redact it, send anyway, or cancel before anything is sent.

> **Use fake data only.** Never test with real passwords, real keys or real
> customer information. Examples you can copy are in step 4.

**Questions or stuck?** Email founder@eraseai.ai

---

## Why 14 days matters

Google only lets a new app go public after **at least 12 testers have stayed
opted in for 14 days in a row**. If you uninstall or leave the test early, the
count can drop below 12 and the 14 days start again. Please keep the app
installed until we say the test is done. You don't need to use it every day,
but opening it now and then helps, because Google also looks at whether
testers actually used the app.

---

## 1. Join the test (2 minutes)

1. Join the tester group with the Google account you use on your phone:
 *https://groups.google.com/g/eraseai-closed-testers*
2. Open the opt-in link on the same account and tap **Become a tester**:
   *https://play.google.com/store/apps/details?id=com.eraseai.firewall*
3. Install **EraseAI Firewall** from the Google Play link on that page. It
   can take a few minutes after opting in before Play shows it.

Install from Google Play only. Please don't install an APK from anywhere
else.

## 2. Open the app

Open EraseAI Firewall and tap **Try free for 14 days, no account**. Checks run
on your phone, nothing to sign up for, and 14 days covers the whole test. (You can create an account any time;
new accounts also start with a free 7-day trial and you won't be charged.)

Using version 1.0.2 or older? It asks you to sign up first. Update from Play
to get the no-account option.

## 3. Turn on protection (5 minutes)

You'll need at least one of ChatGPT, Claude or Gemini installed.

1. In EraseAI: **Protected apps** → switch on the AI apps you have.
2. Android **Settings → Accessibility → EraseAI Firewall** → turn it **on**
   and accept the prompt.

**Why Accessibility?** It's how EraseAI sees the AI app's text box and Send
button, so it can step in before a message is sent. It only reads text in
the AI apps you switched on above and ignores everything else. It skips
password fields, and it doesn't read your screen in other apps.

**Optional extras** (try them if you're curious, see step 5):

| Feature | What it does | Permission it asks for |
|---|---|---|
| EraseAI Keyboard | Checks text as you type in AI apps | Android keyboard setting |
| Strict network gate | While a risky message is waiting for your decision, blocks the AI app's internet so it can't be sent in the background | VPN (local only: nothing is routed to a server or decrypted) and notifications |
| EraseAI Safe | A safe place to attach files from | None |

## 4. The main test (5 minutes)

Open ChatGPT, Claude or Gemini and type one of these, **without sending yet**:

```
My AWS key is AKIAIOSFODNN7EXAMPLE
```
```
Customer email: test@example.com, card 4111 1111 1111 1111
```

(These are official example values, not real ones.)

**What should happen:** a red bar saying **"EraseAI blocked send · tap to
review"** appears over the Send area. Tap it, and choose:

- **Sanitize & Send**: the message is sent with the sensitive part masked
- **Send Anyway**: the message is sent as you typed it
- **Cancel**: nothing is sent

Then check two more things:

- Type something harmless, like `hello, what's the weather like on Mars?`.
  It should send normally with no red bar.
- Try sending a risky message by pressing Enter or tapping Send quickly. It
  should never reach the AI before you choose.

## 5. Over the 14 days

- **Days 2–14:** use your AI apps as normal. Once or twice, paste a fake key
  or email to make sure the red bar still appears.
- **Around day 7 (optional):** try one extra:
  - **EraseAI Keyboard:** Android **Settings → System → Keyboard → On-screen
    keyboard** → turn on **EraseAI Keyboard**, then pick it while typing in
    an AI app.
  - **Strict network gate:** EraseAI **Settings → Strict network gate** →
    on. Accept the notification and VPN prompts. Next time the red bar
    appears, you'll see a key icon in the status bar and a notification
    saying "EraseAI is blocking AI app network". Both disappear once you
    choose.
  - **EraseAI Safe:** share a file (a PDF or photo with fake data) to **Save
    to EraseAI Safe**. Then in ChatGPT, Claude or Gemini, tap attach →
    browse files → **EraseAI Safe**, and attach the safe copy.
- **Day 14:** send us your feedback (step 6). Then you're done. Thank you!

## 6. Send feedback

Email **founder@eraseai.ai** with whatever you can fill in. Short is fine.

```
Phone and Android version: (e.g. Pixel 8, Android 15)
AI apps tested: ChatGPT / Claude / Gemini
Red bar appeared for the fake key: yes / no
Anything sent before you chose: yes / no (what happened?)
Harmless messages sent normally: yes / no
Extras tried: keyboard / strict gate / Safe / none
Anything confusing, slow or broken:
Crashes (what were you doing?):
Would you keep using it? Why or why not?
```

Screenshots or screen recordings help a lot, but only with fake data on
screen.


## Troubleshooting

| Problem | Try |
|---|---|
| Play says the app isn't available | Check you joined the group and opted in with the **same** Google account as your phone. Wait 10 minutes and try again. |
| No red bar on a fake key | Check Accessibility is still on for EraseAI (Android sometimes turns it off after an update). Close and reopen the AI app. |
| Red bar doesn't go away | Tap it and choose Cancel, Sanitize & Send or Send Anyway. |
| AI app has no internet | The Strict network gate is holding a message. Tap the red bar and choose. If it stays stuck, turn the gate off in EraseAI Settings and email us. |
| EraseAI says another VPN is active | The Strict network gate can't run alongside another VPN. Turn one of them off. |

## What we don't do

EraseAI never sees your passwords (password fields are skipped). The
Strict network gate blocks traffic on your phone; it doesn't inspect,
store or forward it. Privacy policy: https://eraseai.ai/privacy
