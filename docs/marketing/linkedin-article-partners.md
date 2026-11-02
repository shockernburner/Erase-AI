# LinkedIn article: invitation to AI implementation partners

Audience: consultancies, system integrators, freelancers and in-house teams who help clients adopt AI. Goal: they try EraseAI Firewall, and if it fits, we agree a partner arrangement so the AI work they deliver ships with the check built in.
Post as a LinkedIn **Article** from the founder account, then share it with the short post below. Every link carries `utm_source=linkedin&utm_medium=article&utm_campaign=partners`.
Best time: Tuesday to Thursday, 8 to 10 AM in the audience's timezone (Singapore first). Reply to every comment in the first two hours. Do not post on launch day while the Product Hunt thread needs you.

## Before you publish: decide or check these (marked in the text)

1. **Partner terms.** The draft promises a free account, a technical brief and a free pilot with one client team (your approved offer is a free 30-day pilot for up to 10 people). It does **not** state any revenue share or discount, because none exists in the repo. Decide the terms first, or keep the wording "we will agree the arrangement together".
2. **"Built in" means the Developer API.** The API scans text going into and out of a partner's own AI app (`/api/dev/analyze`, 10,000 characters per request, 60 requests a minute per key; Pro plan). The browser extension and the Android app protect staff using public AI tools. The text says this. Do not promise more.
3. **"Nobody offers this."** I cannot verify it, and your rules forbid "first" and "only". The draft says only what you can stand behind: in your experience the check is usually a policy, not part of the delivery. Keep it that way.
4. The IT rollout (Google Admin, Intune) is built and tested in code but has not run on a real Workspace. The text says "can be deployed", not "customers do".

## Title options

```
If you help clients adopt AI, the check before "Send" is part of the job
```
```
Helping clients adopt AI? Ship the seatbelt with it.
```

## Article

```
Every AI project I hear about has the same quiet gap.

The pilot works. Within weeks the client's team is using ChatGPT, Claude or Gemini every day, and somewhere between kickoff and handover, someone pastes a customer list, a contract or a production key into a chat box. Nobody was careless. They were fast.

I spent 17 years in security: Air Force first, then as an aerospace engineer where protecting sensitive information was the core of the job. Then I started a software company and wrote the code myself. I watched people on teams paste company information into public AI tools. One morning, as a father, I realised I had done the same with information about my own child. That is why I built EraseAI Firewall.

WHAT IT IS

EraseAI Firewall checks what you are about to send to ChatGPT, Claude or Gemini. If it finds personal data, card numbers, passwords or API keys, it holds the message and you choose: Cancel, Sanitize & Send, or Send Anyway.

The checks are rules, not guesswork: patterns plus validators such as the card-number checksum. That makes them fast and predictable, but they can miss things and flag harmless text, which is why you stay in control. They don't replace policy or training. They are what makes policy and training bite at the moment of sending.

It runs in Chrome, and on Android inside the AI apps you choose. Not a VPN.

WHY I AM WRITING TO YOU

If you implement AI for clients, you own a hard conversation: "Yes, this will save you time, and here is how we keep your data safe." In my experience, the second half of that answer is usually a policy document. Not something built into what you deliver.

I would like to change that with a few partners, and I think all three sides come out ahead.

- You, the implementer, get an answer you can show rather than describe. It sits inside the delivery instead of on a slide, and it gives you a reason to stay in the account after go-live.
- Your client's staff keep the AI tools they like. The company gets a check at the moment of sending and a record of decisions (level, action, category, never the text anyone typed). Admins invite people one by one, or IT rolls it out through Google Admin or Intune.
- EraseAI gets real deployments, and honest feedback from people who put it in front of real teams.

TWO WAYS TO USE IT

1. Staff on public AI tools. The Chrome extension checks every message on the device, free, no account. Paid plans add one-click Sanitize & Send and attachment scanning; Teams plans add invite links and an admin dashboard with an audit log.
2. AI you build for the client. Our Developer API scans the text going into and out of your own application, so the check ships with the product. The documentation is public.

WHAT I AM ASKING

Try it. I will set you up with a free account and send a short technical brief. If it holds up, let's run a free 30-day pilot with one of your client teams, up to 10 people. After that we agree a partner arrangement together, because I would rather design it with you than hand you a template. (Decide: add real terms here if you have them.)

And tell me where it is wrong. A flag it should not have raised, a leak it should have caught: that is the most useful thing a partner can send me.

If you help companies adopt AI and want the data question answered inside the delivery, message me or start here:
https://eraseai.ai/ai-firewall?utm_source=linkedin&utm_medium=article&utm_campaign=partners
Developer API: https://eraseai.ai/developer-api?utm_source=linkedin&utm_medium=article&utm_campaign=partners

Firdous Mahmood
Vantward Solutions Pte. Ltd., Singapore
```

## Short post that shares the article (about 600 characters)

```
Sooner or later, every client of an AI project asks the same thing: "How do we stop our people pasting sensitive data into it?"

I wrote up how implementers can answer with something they can show, not just a policy. I would also like to try it with a few partners: a free account, a technical review, then a free 30-day pilot with one client team.

The checks are rules, so they are not perfect, and the article says where. Honest reviews welcome.

<article link>

#AIAdoption #AISecurity #DataProtection
```

## Connection note for direct outreach (300 characters or fewer)

```
Hi <first name>, I build EraseAI, a check that stops customer data and keys being pasted into ChatGPT, Claude and Gemini. I saw <specific project>. Would you review it and, if it fits, pilot it with one client? No pitch in DMs unless you ask.
```

## Who to send it to

Small and mid-size AI consultancies and freelancers in Singapore and Hong Kong first (same timezone as you, same ads audience), then security consultancies. Add them to `EraseAI_Prospects_Customers.csv` with status columns as in `prospect-outreach.md`. Follow up at most twice, as in that file.
