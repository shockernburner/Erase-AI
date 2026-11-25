# Reddit posts: the AI boom and your customer data (draft 2026-11-24)

Same facts as the LinkedIn article (`linkedin-article-ai-boom-and-your-data.md`; sources and checks are there). Re-check the Nvidia news on the day you post.

## Rules for all posts

1. **I could not verify each subreddit's current rules.** Open the sidebar and the rules page of each one before posting. Many ban self-promotion or require a flair, a weekly thread, or moderator approval. If a rule says no, ask the moderators by message first, or skip that sub.
2. **Say you build one.** Every post below contains it. Do not remove it.
3. **Stagger.** One post per day at most, and never the same text in two places. A new Reddit account or one with little history is often filtered; comment helpfully in a sub for a few days first.
4. **No vote-asking, no friends upvoting, no DMs to commenters selling.** Answer every comment honestly, including "it can miss things".
5. **Do not write "no retention", "first", "only", "AI detection", or "no data leaves".** Say "on the device by default, no proxy, not a VPN, rules-based".
6. Not suited: r/netsec (technical research only), r/ChatGPT and r/ClaudeAI (product posts are usually removed). r/CISO and r/ITManagers are possible but check rules first.
7. Deploy the API and see the audit log working before you mention it.

## Where to post (in this order)

| # | Subreddit | Why | Post |
|---|---|---|---|
| 1 | r/cybersecurity | The audience that knows the Samsung and NYT cases and will challenge the claims | Post A |
| 2 | r/privacy | Deleted chats and court preservation orders are their topic | Post B |
| 3 | r/startups or r/SaaS (check which allows founder stories) | Founder, honest, seeking pilot teams | Post C |
| 4 | r/msp | Managed providers run many small teams; they can pilot on their own staff | Post D |
| optional | r/sysadmin, r/ITManagers | Only if the rules allow; use Post A reworded | none |

---

## Post A: r/cybersecurity (discussion)

**Title:** `Staff keep pasting customer data into AI chats. What actually works at the moment of sending?`

```
Some facts first, because I think this stopped being theoretical.

- Samsung engineers pasted internal source code into ChatGPT in April 2023, and the company banned generative AI on its devices a month later.
- In May 2025 a US court ordered OpenAI to preserve ChatGPT output logs, including chats users had deleted, for the New York Times case. The duty to keep new logs ended on 26 September 2025. What was already kept stays kept.
- Harmonic Security looked at about 22 million enterprise AI prompts in 2025 and found 579,113 sensitive items, with ChatGPT accounting for 71.2%. That is one vendor's study, so weigh it accordingly.

The pattern: once a customer's name, card number or contract is in someone else's system, you do not decide how long it stays or who can be ordered to produce it. Policy and training help, but they fail at one moment: pressing Send.

Network gateways and CASBs cover a lot, but they sit between the user and the service, they see encrypted traffic only if you inspect it, and personal devices and phones are the usual hole. A check at the Send button is narrower. It does not replace the others.

Disclosure: I build one (EraseAI Firewall, Chrome and Android). It runs on the device by default, no proxy, not a VPN. Detection is rules-based (patterns and validators like the Luhn checksum), so it can miss things and flag harmless text; the person always chooses. I am a solo founder, 17 years in security before this.

I am looking for 3 to 5 teams of up to 10 people to run a free 30-day pilot, and I will set it up personally. If you are a CISO or run security for a team and want to test it and tell me where it is weak, message me. I am not linking anything here.

For people who run this in practice: where do you put the control today, and where does it still leak?
```

Notes: this is the only post with a closing question, on purpose. Keep the Samsung line exact: the memo did not say what the code was, and the post does not say.

---

## Post B: r/privacy

**Title:** `Deleting a ChatGPT chat did not mean it was gone: what the 2025 court order showed`

```
In May 2025 a US court ordered OpenAI to preserve ChatGPT output logs, including chats users had deleted, as part of the New York Times copyright case. The requirement to keep new logs ended on 26 September 2025, but logs already kept stay kept. As I understand it, some customers (for example in the EEA, Switzerland and the UK) were exempt from the order, and some business and zero-retention API customers were too. Check the details for your own plan.

The point is not about one company. It is that once text is in a service, you do not control how long it lasts, who can be ordered to produce it, or what happens to the business holding it. The only control you fully have is what you send.

That is why I think the useful habit is checking before you press Send: names, emails, card numbers, passwords, API keys, a client's contract.

Disclosure: I build a tool for this (EraseAI Firewall, a Chrome extension and an Android app). It checks messages on your device by default before they are sent to ChatGPT, Claude or Gemini and holds them if it finds personal data. It is rules-based, so it can miss things. The free Chrome version checks every message with no limit; attachment scanning and "sanitize and send" are paid.

Happy to answer how it works or where it falls short. I would rather you tell me what is wrong with it.
```

Notes: if the sub does not allow any tool mention, delete the last two paragraphs and post the facts only, or skip.

---

## Post C: r/startups or r/SaaS

**Title:** `The AI boom might not hold. The customer data already pasted into it will not come back. I am building around that.`

```
Numbers I checked this week from primary sources:

- Nvidia reported $115.8B revenue for the quarter ended 25 October, up 103% on a year earlier (17 November). Six days later its board announced that Jensen Huang was reinstated as CEO, after the CFO served as interim CEO.
- AP reported in May that Anthropic raised $65B at a $965B valuation and that OpenAI said in March it was heading toward $852B after a $122B round, and wrote that Anthropic, OpenAI and SpaceX are all still losing more money than they make.
- The Bank of England's Financial Policy Committee wrote in September that "the risk of a sharper correction persists" and that circular arrangements "could amplify losses if expectations disappoint".

I do not know if it is a bubble. I do know what does not depend on the answer: staff paste customer data into AI chats today, and that data stays outside the company whatever happens to valuations.

I am a solo founder in Singapore (17 years in security, then aerospace, then software). I built EraseAI Firewall: a check at the Send button for ChatGPT, Claude and Gemini that holds a message if it finds personal data, card numbers, passwords or keys. On the device by default, no proxy, not a VPN, rules-based so it can miss things. Chrome and Android, live. Pre-revenue, honestly.

What I am asking: if you run a team of up to 10 and you have staff using AI tools, I will set up a free 30-day pilot personally, and you get an audit log of decisions (not message text). Tell me where it fails. Comments or DMs are fine.
```

Notes: r/startups restricts promotion heavily; if the rules forbid it, use r/SaaS or skip. Do not state revenue or user numbers.

---

## Post D: r/msp

**Title:** `Offering MSPs a free 30-day test of an AI "Send button" check on your own staff (up to 10 people)`

```
Your clients are pasting customer data into ChatGPT, Claude and Gemini whether you have a policy or not. Before you put anything in front of a client, you should test it on your own people.

I build EraseAI Firewall: it checks what a person is about to send to an AI chat and holds the message if it finds personal data, card numbers, passwords or API keys. The person chooses to cancel, send anyway, or (paid plans) sanitize first. On the device by default, no proxy, not a VPN. Rules-based, so it can miss things and flag harmless text. Chrome today, plus an Android app.

The team side has an admin dashboard and an audit log of decisions (never message text).

Offer: a free 30-day pilot for your own team of up to 10, set up by me personally. If it earns a place with your clients, we can talk about a partner arrangement. I am not going to invent terms in a Reddit post.

Disclosure: I am the founder (Vantward Solutions, Singapore). Solo, early, pre-revenue. Reply or DM and I will send details.
```

Notes: check the r/msp rules on vendor posts (many MSP subs keep vendors to a stickied thread).

---

## After posting

- Reply to each comment within a few hours, plainly. If someone points out a weakness, thank them and say if it is real.
- Do not edit the post to add links later. If asked for the link, give `https://eraseai.ai/ai-firewall?utm_source=reddit&utm_medium=post&utm_campaign=ai_boom` in a reply (use a different `utm_medium` per sub if you want to compare).
- Record who asks for a pilot. Follow up from director@vantward.com, not Reddit chat.
