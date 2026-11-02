# Android closed test: recruiting testers

Google Play requires **12+ testers opted in for 14 consecutive days** before
a new **personal** developer account can apply for production. Organisation
accounts are exempt: check Play Console → Settings → Developer account →
Account details first.

Tester guide (link it everywhere):
`artifacts/ai-firewall-android/CLOSED_TESTER_INSTRUCTIONS.md`. Paste it into a
Google Doc set to "Anyone with the link can view", or host it on eraseai.ai,
and use that link below as `<guide link>`.

---

## Setup (once)

1. Create a Google Group, e.g. `eraseai-android-testers@googlegroups.com`.
   Settings: **anyone can ask to join** with auto-approval, or **anyone on the
   web can join**. Hide the member list.
2. Play Console → Testing → **Closed testing** → your track → **Testers** →
   add the group's email. Copy the **opt-in link** (web).
3. Fill `<Google Group link>` and `<Play opt-in link>` in the tester guide.
4. Recruit **about 20** so you stay above 12 when some drop out.
5. Keep a simple list: name, date joined, feedback received. Day 14 counts
   from when you reach 12, not from the first tester.

## Where to recruit (best first)

1. **People you know**, messaged one by one (template below). Most reliable.
2. **r/TestersCommunity** and **r/AndroidClosedTesting**: developers test
   each other's apps. You're expected to test theirs too; budget 10 minutes a
   day. Read each sub's pinned rules the same day you post.
3. **LinkedIn**: the post below. Your network won't all be on Android, so
   treat it as a bonus.
4. **Discord**: Android dev servers often have a "test my app" channel. Use
   the Reddit text.

Don't pay for tester farms. Testers who install and never open the app look
like low engagement in the production application, and a rejection restarts
the 14 days.

---

## Reddit: r/TestersCommunity / r/AndroidClosedTesting

Check the sub's required title format before posting (many want
`[Testing exchange]` or similar).

```
Title: [Closed test] EraseAI Firewall: stops you sending API keys and personal data to ChatGPT/Claude/Gemini. Will test yours back

Hi all, I need testers for 14 days for Google Play's closed-test requirement, and I'll happily test your app in return. Drop your opt-in link in the comments or DM me.

What it does: when you're about to send something in the ChatGPT, Claude or Gemini Android apps, it checks for API keys, passwords and personal data, and lets you redact, send anyway or cancel before it's sent.

What I'm asking:
1. Join: <Google Group link>
2. Opt in: <Play opt-in link>
3. Set up (10 min) and keep it installed for 14 days. A fake-key test now and then is plenty.

Full guide with fake test data: <guide link>

About permissions: it uses Accessibility to see the AI app's text box and Send button. It only reads text in the AI apps you pick, skips password fields, and ignores every other app. It is not a VPN and does not touch network traffic.

Comment "joined" when you're in and I'll confirm, and post your link so I can test yours. Thanks!
```

## LinkedIn

```
I need 12+ Android testers for two weeks 🙏

EraseAI for Android is in closed testing on Google Play. Google requires new apps to have at least 12 testers for 14 days before they can go public, and I'd really value your help.

What it does: when you're about to send something in the ChatGPT, Claude or Gemini apps, it checks for API keys, passwords and personal data and lets you redact before it's sent.

What I'm asking:
1. Join the tester group: <Google Group link>
2. Opt in on Google Play: <Play opt-in link>
3. Install, keep it for 14 days, try it a few times with fake data, and tell me what breaks

Setup takes 10 minutes. Here's the guide, with fake data to test with: <guide link>

Why it asks for Accessibility: to see the AI app's text box and Send button. It only reads text in the AI apps you choose, skips password fields, and ignores every other app.

Comment "in" once you've joined so I can thank you, or DM me if you get stuck. Reshares to Android-using friends are hugely appreciated.

#AndroidDev #BetaTesting #AISecurity
```

## Direct message (friends, colleagues)

```
Hi <name>, a small favour if you have an Android phone: I'm launching EraseAI's Android app and Google needs 12 people to test it for 14 days before it can go public.

It's two taps to join (<Google Group link>, then <Play opt-in link>), 10 minutes to set up, and then just keep it installed for two weeks. Guide here: <guide link>

Totally fine if not. Thank you either way!
```

## Day 14 thank-you

```
That's 14 days, thank you! The test is complete. You're welcome to keep EraseAI Firewall, or uninstall it now. If you have two minutes, I'd love to hear what you thought: <feedback email or form>
```

## For the production application

Play Console asks how you recruited testers, how they engaged and what you
changed. Keep notes as you go: number of testers, feedback themes, bugs
fixed and versions released during the test.
