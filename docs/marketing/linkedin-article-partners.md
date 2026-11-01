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

The pilot works. The client's team starts using ChatGPT, Claude or Gemini every day. And somewhere between the kickoff and the handover, someone pastes a customer list, a contract or a production key into a chat box. Nobody was careless. They were fast.

I spent 17 years in security: Air Force first, then as an aerospace engineer where protecting sensitive information was the core of the job. Then I started a software company and wrote the code myself. I watched people on teams paste company information into public AI tools. One morning, as a father, I realised I had done the same with information about my own child. That is why I built EraseAI Firewall.

WHAT IT IS

EraseAI Firewall checks what you are about to send to ChatGPT, Claude or Gemini, and holds the message if it finds personal data, card numbers, passwords or API keys. You choose: Cancel, Sanitize & Send, or Send Anyway.

It is rules-based: patterns plus checks such as the card-number checksum. That makes it fast and predictable, and it also means it can miss things and flag harmless text. People stay in control. It is not a replacement for policy or training. It is the control that applies them at the moment of sending.

It runs in Chrome on the computer, and on Android inside the AI apps you choose. It is not a VPN.

WHY I AM WRITING TO YOU

If you implement AI for clients, you already own the hard conversation: "yes, this will save you time, and here is how we keep your data safe." In my experience that answer is usually a policy document, not something built into what you deliver.

I would like to change that with a small number of partners, and I think everyone in the chain wins:

- For you, the implementer: a concrete answer to the client's data question that you can show, not describe. It sits in your delivery instead of in a slide, and it gives you a reason to stay in the account after go-live.
- For your client: staff get the AI tools they want, and the company gets a check at the moment of sending, with a record of decisions (level, action, category, never the text of what anyone typed). Admins can invite people, or have IT roll it out through Google Admin or Intune.
- For EraseAI: real deployments, and honest feedback from people who put it in front of real teams.

TWO WAYS TO USE IT

1. Staff using public AI tools. The Chrome extension checks every message on the device, for free, with no account. Paid plans add one-click Sanitize & Send and scanning of attachments. Teams plans add invite links and an admin dashboard with an audit log.
2. AI you build for the client. Our Developer API scans text going into and out of your own application, so the check is part of what you ship. Documentation is public.

WHAT I AM ASKING

Try it. I will set you up with a free account and send a short technical brief. If it holds up, I would like to run a free 30-day pilot with one of your client teams, up to 10 people. If it fits after that, we agree a partner arrangement together; I would rather design it with you than hand you a template. (Decide: add real terms here if you have them.)

I also want your honest review. If it flagged something it should not have, or missed something it should have caught, tell me. That is the most useful thing a partner can do.

If you help companies adopt AI and want the data question answered inside the delivery, message me, or start here:
https://eraseai.ai/ai-firewall?utm_source=linkedin&utm_medium=article&utm_campaign=partners
Developer API: https://eraseai.ai/developer-api?utm_source=linkedin&utm_medium=article&utm_campaign=partners

Firdous Mahmood
Vantward Solutions Pte. Ltd., Singapore
```

## Short post that shares the article (about 600 characters)

```
If you help companies adopt AI, there is one question every client eventually asks: "how do we stop our people pasting sensitive data into it?"

I wrote down how I think implementers can answer it with something they can show, not just a policy, and what I would like to try with a few partners: a free account, a technical review, and a free 30-day pilot with one client team.

It is rules-based, so it is not perfect, and I say so. Honest reviews welcome.

<article link>

#AIAdoption #AISecurity #DataProtection
```

## Connection note for direct outreach (300 characters or fewer)

```
Hi <first name>, I build EraseAI, a check that stops customer data and keys being pasted into ChatGPT, Claude and Gemini. I saw <specific project>. Would you review it, and if it fits, run a free pilot with one client? No pitch in DMs unless you ask.
```

## Who to send it to

Small and mid-size AI consultancies and freelancers in Singapore and Hong Kong first (same timezone as you, same ads audience), then security consultancies. Add them to `EraseAI_Prospects_Customers.csv` with status columns as in `prospect-outreach.md`. Follow up at most twice, as in that file.
