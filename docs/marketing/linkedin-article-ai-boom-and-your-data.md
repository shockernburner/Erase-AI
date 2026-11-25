# LinkedIn article: the AI boom and your customer data (draft 2026-11-24)

Post as a LinkedIn **Article** from your own account (Firdous Mahmood), then share it with the short post at the end. Embed the YouTube video where marked. Every link carries `utm_source=linkedin&utm_medium=article&utm_campaign=ai_boom`.
Best time: Tuesday to Thursday, 8 to 10 AM Singapore time. Reply to every comment in the first two hours.

## Read before you publish (all of these matter)

1. **Re-check Nvidia on the morning you post.** The CEO news is from 23 November and could change. Source: Nvidia's newsroom (links at the end). If anything has changed, edit the first two paragraphs.
2. **Deploy first.** The pilot offer mentions the admin dashboard and the audit log. Publish only after the API is deployed and you have seen the audit log work on your own team.
3. **Legal wording.** The article says whether a paste is a breach "depends on the facts" and sends readers to their lawyer. Keep it. You are not giving legal advice, and nothing here says every paste is a breach.
4. **Conflict of interest, stated in the text.** The article says you build a firewall. Keep that sentence.
5. **Not used, on purpose:** the "IMF says circular financing passed $1 trillion" claim (I could not find it on the IMF's own pages), the Italian OpenAI fine (a Rome court may have overturned it), and any prediction of a crash or any stock view.
6. Do not change "on the device by default" into "no data leaves", and do not write "no retention" anywhere, until the storage fix is deployed and the old rows are cleaned.

## Title options

1. `Nobody knows if the AI boom holds. Your customer data is already inside it.` (my pick)
2. `Whatever happens to AI valuations, what you pasted yesterday stays pasted`
3. `The AI firewall is not a panel topic any more`

## Article

```
Nobody knows if the AI boom holds. Your customer data is already inside it.

On 17 November, Nvidia reported $115.8 billion in revenue for the quarter that ended 25 October, up 103% on a year earlier. Six days later, on 23 November, its board announced that Jensen Huang had been reinstated as CEO, after a stretch in which the CFO, Colette Kress, served as interim CEO. Both statements are in Nvidia's own releases.

I am not drawing a conclusion about Nvidia. I am pointing at the speed. The company at the centre of this industry can post those numbers and change who runs it inside one week.

The money behind the chatbots looks much the same. In May, AP reported that Anthropic had raised $65 billion at a $965 billion valuation, and that OpenAI had said in March it was heading toward $852 billion after a $122 billion round. AP also wrote that Anthropic, OpenAI and SpaceX are all still losing more money than they make.

The Bank of England's Financial Policy Committee wrote in September that equity valuations for AI companies fell sharply in July, and that "the risk of a sharper correction persists". It also said that the growing debt in AI financing, together with "circular arrangements", "could amplify losses if expectations disappoint".

Is it a bubble? I don't know, and nobody does. The Bank of England writes about risk, not a verdict. Here is what I do know.

THE DATA KEEPS GOING IN

In April 2023, Samsung engineers leaked internal source code by pasting it into ChatGPT. A month later Samsung banned generative AI on company devices.

In May 2025, a US court ordered OpenAI to keep ChatGPT output logs, including chats that users had deleted, for the New York Times copyright case. The duty to keep new logs ended on 26 September 2025. The logs already kept stay kept.

Harmonic Security analysed about 22 million enterprise AI prompts in 2025 and found 579,113 sensitive items. ChatGPT accounted for 71.2% of them. That is one vendor's study, so treat it as one data point. It points the same way as everything above.

Put those together. Once a customer's name, card number or contract is inside someone else's system, you do not decide how long it stays, who can be ordered to produce it, or what happens to the business that holds it. That is true whether valuations hold or fall. A control at your end does not depend on who wins.

THE REQUIREMENT IS NOT ABSTRACT

If you operate in Singapore, the PDPC can fine an organisation up to S$1 million or, for organisations with more than S$10 million in annual turnover in Singapore, 10% of that turnover, whichever is higher. Section 48O of the PDPA lets a person who suffers loss or damage directly because of a breach seek an injunction, a declaration or damages. In Reed v Bellingham (2022), the Court of Appeal held that emotional distress can count as loss or damage.

Whether a particular paste is a breach depends on the facts, and that is a question for your lawyer. But "we had no control at the point of sending" is a hard sentence to say to a regulator, or to a client's lawyer.

WHAT I BUILT

I should say plainly that I build one of these. EraseAI Firewall checks what a person is about to send to ChatGPT, Claude or Gemini, and holds the message if it finds personal data, card numbers, passwords or API keys. The person chooses: cancel, send anyway or, on paid plans, sanitize it first. On paid plans it also reads attached files.

It runs on the device by default. There is no proxy in the middle, and it is not a VPN. It uses rules, so it can miss things and it sometimes flags harmless text. That is why a person always decides. It does not replace policy or training. It makes them work at the one moment they usually fail: the moment of pressing Send.

For teams there is an admin dashboard and an audit log. The log records the decision (level, action, category), never the text anyone typed. It works in Chrome today, and there is an Android app.

[EMBED THE VIDEO HERE: "3 ways to stop staff pasting customer data into AI", 1 min 42 s]

WHY EARLY

An audit log starts the day you switch it on. Nobody can create last quarter's afterwards. If a client or a regulator asks what you had in place, the honest answer is a date. Make that date earlier.

A few years ago the AI firewall was a panel topic. It is now a requirement with a product you can install today. Whoever in your industry has the control in place before they are asked will be the one with a straight answer.

THE OFFER

A free 30-day pilot for a team of up to 10 people. We set it up with you.

If you are a CTO, CISO or chief AI officer and want to see it yourself, I will run a personal demo and handle your pilot personally. Treat it as a test of our service, and tell me where it falls short.

director@vantward.com
https://eraseai.ai/ai-firewall?utm_source=linkedin&utm_medium=article&utm_campaign=ai_boom

Firdous Mahmood
Founder, Vantward Solutions Pte. Ltd., Singapore
+65 8243 0739

SOURCES

Nvidia, results for the third quarter of fiscal 2027 (17 November 2026): https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-third-quarter-fiscal-2027
Nvidia, board reinstates Jensen Huang (23 November 2026): https://nvidianews.nvidia.com/news/nvidia-board-reinstates-jensen-huang-as-president-ceo-and-board-director
AP, Anthropic raises $65 billion at a $965 billion valuation (28 May 2026): https://www.ksat.com/business/2026/05/28/anthropic-vaults-to-a-965-billion-valuation-with-new-funding-as-claude-demand-surges/
Bank of England, Financial Policy Committee Record, September 2026: https://www.bankofengland.co.uk/financial-policy-committee-record/2026/september-2026
Samsung, April 2023 leak and May 2023 ban (Bloomberg): https://bloomberg.com/news/articles/2023-05-02/samsung-bans-chatgpt-and-other-generative-ai-use-by-staff-after-leak
New York Times v OpenAI log preservation order and its end (Engadget): https://engadget.com/ai/openai-no-longer-has-to-preserve-all-of-its-chatgpt-data-with-some-exceptions-192422093.html
Harmonic Security, 2025 analysis of 22 million enterprise AI prompts (a vendor study): https://harmonic.security/resources/what-22-million-enterprise-ai-prompts-reveal-about-shadow-ai-in-2025
PDPC, Advisory Guidelines on Enforcement of Data Protection Provisions (private right of action, s 48O): https://www.pdpc.gov.sg/-/media/Files/PDPC/PDF-Files/Advisory-Guidelines/Advisory-Guidelines-on-Enforcement-of-DP-Provisions_1oct2022.pdf
Allen & Gledhill, increased PDPA financial penalties from 1 October 2022: https://www.allenandgledhill.com/perspectives/articles/22616/sgkh-increased-maximum-financial-penalties-under-personal-data-protection-act-2012-from-1-october-2022
```

## Where each claim comes from (checked 2026-11-24)

| Claim | Source and how it was checked |
|---|---|
| $115.8B quarter, up 103%; quarter ended 25 Oct; announced 17 Nov | Nvidia's own results release (read directly) |
| Huang reinstated as CEO on 23 Nov; Kress was interim CEO | Nvidia's own board release and the results release (read directly) |
| Anthropic $65B at $965B; OpenAI heading toward $852B after a $122B round (March) | AP story dated 28 May 2026 (read directly). The $965B and $852B are AP's reports, not figures from the companies' own news pages |
| "All three are also still losing more money than they make" | AP, same story. "All three" are Anthropic, OpenAI and SpaceX, which is how the article words it |
| AI valuations fell sharply in July; risk of a sharper correction persists; "circular arrangements ... could amplify losses if expectations disappoint" | Bank of England FPC Record, September 2026, published 30 Sept (read directly, verbatim quotes) |
| Samsung: source code leaked in April 2023, ban in May 2023 | Bloomberg, The Register and several others; the memo did not say exactly what the code was |
| NYT order: May 2025, includes deleted chats; duty for new logs ended 26 Sept 2025; kept logs stay | Engadget and Bloomberg Law (search summaries, two outlets agree) |
| 22 million prompts, 579,113 sensitive items, ChatGPT 71.2% | Harmonic Security's page and SecurityBrief (search summaries). Confirm on their page before publishing |
| PDPA fine S$1M or 10% of Singapore turnover (over S$10M), whichever is higher | Allen & Gledhill, PDPC guidelines and others (search summaries) |
| s 48O private right of action; emotional distress can count (Reed v Bellingham, 2022) | PDPC enforcement guidelines (s 48O). The case name is from my own knowledge, so ask your lawyer to confirm the citation |

## Short post to share the article (about 520 characters)

```
Nvidia reported a $115.8B quarter on 17 Nov. Six days later its board reinstated its CEO. The Bank of England says the risk of a sharper correction in AI valuations persists.

I don't know whether it's a bubble. I do know the customer data your people paste into AI chats stays outside your control, whatever happens next.

I wrote down the facts and what to do about it. Free 30-day pilot for a team of up to 10, or a personal demo for CTOs and CISOs.

<article link>
```
