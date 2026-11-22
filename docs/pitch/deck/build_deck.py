import html
E=html.escape
slides=[]
def slide(kind, **kw): slides.append((kind,kw))

slide("title", kicker="Pre-seed  ·  SGInnovate  ·  November 2026",
  title="Stop the leak at the Send button.",
  sub="EraseAI Firewall checks what your people are about to send to ChatGPT, Claude or Gemini, on the device by default, with no proxy in the middle.")

slide("bullets", kicker="The problem", title="Work now happens in AI chats. The leak happens in one keystroke.",
  bullets=["A log file with a live key in it. A customer list “just to summarise”. A contract, to find one clause.",
           "Nobody is careless. They are fast, and the chat box accepts anything.",
           "Once it is sent, it cannot be taken back."])

slide("cols", kicker="Why it is still happening", title="Most controls see the message after it has left.",
  cols=[("Policies and training","Rely on memory at the worst moment: a deadline, a clipboard and a chat box."),
        ("Network tools and gateways","See traffic after the fact, and have to sit in the middle of it."),
        ("Checks at Send","The right place. A handful of browser extensions do it. It is not yet a company-grade control.")])

slide("solution", kicker="The product", title="An outgoing firewall at the Send button.",
  steps=[("1  Check","Every message, on the device by default, before it goes."),
         ("2  Hold","If it finds personal data, card numbers, passwords or API keys, it stops and shows what and where."),
         ("3  You decide","Cancel, Sanitize & Send, or Send Anyway. A person always has the last word.")],
  note="No proxy: nothing sits between your people and the AI.  Rules, not guesswork: patterns plus validators such as the card-number checksum. It can miss things and flag harmless text, which is why a person decides.")

slide("cards", kicker="What is live today", title="Four surfaces, one decision record.",
  cards=[("Chrome extension","ChatGPT, Claude, Gemini and Replit. Free checks run on the device. Paid plans scan attachments in the browser."),
         ("Android app","A send gate inside the AI apps you choose. Not a VPN."),
         ("Teams dashboard","Invite people, see an audit log of decisions (level, action, category), never the text anyone typed."),
         ("Developer API","Scan the text going into and out of your own AI application.")],
  note="Managed rollout through Chrome policy is built. Its first live deployment is a pre-seed milestone.")

slide("traction", kicker="Where we are, honestly", title="Early. Live. Pre-revenue.",
  left=["Live on Chrome and Android since October 2026.","Just launched. No paying customers yet.","One founder."],
  right_title="What the first weeks taught us",
  right=["A browser check on its own is not a company control. Companies need central policy, an audit trail and a way to roll it out.",
         "So the plan adds those first, then the phone, then partners who ship the check with the AI they deliver.",
         "Now: signing design partners, each on a free 30-day pilot."])

slide("founder", kicker="Why me", title="I spent 17 years in security, then caught myself making the mistake.",
  bullets=["Air Force (physical, national and cyber security), then an aerospace engineer, where protecting sensitive information was the core of the job.",
           "Then I started a software company and wrote the code by hand.",
           "I watched people on teams paste company information into public AI tools. One morning, as a father, I realised I had done the same with information about my own child.",
           "Solo today. First hires: a detection engineer, an Android engineer, a platform engineer, a partnerships lead."])

slide("model", kicker="Business model", title="Per seat, per month. Sold directly and through partners.",
  cols=[("Teams","US$9 per person per month (US$8 on annual), 3 to 10 people, self-serve."),
        ("Enterprise","By seat, by invoice, with central policy, single sign-on and audit export."),
        ("Partners","AI implementers and system integrators ship the check inside the AI work they deliver, through the Developer API and managed rollout.")],
  note="The plan assumes US$7 per seat per month realised after annual and volume discounts. No price change is assumed.")

slide("table", kicker="The plan", title="Five years, stated as a plan, not a forecast.",
  head=["","Year 1","Year 2","Year 3","Year 4","Year 5"],
  rows=[["Year-end ARR (S$)","40k","0.29M","1.4M","4.1M","9.5M"],
        ["Seats","353","2,617","12,293","37,296","85,585"],
        ["Team","7","13","20","27","32"],
        ["Raised in the year (S$)","1.0M","3.0M","5.0M","–","–"]],
  note="Pre-seed now, seed around month 15, Series A around month 30. Break-even near month 50 in the base case. Every figure is an assumption we intend to test; the downside case is about 40% of this, and hiring is gated on milestones.")

slide("ask", kicker="The ask", title="S$1.0M pre-seed, to build a company-grade control.",
  left_title="What it buys (14 months)",
  left=["Central policy, single sign-on and SCIM, audit export and a SIEM hook","A zero-retention mode: no message text stored","Managed rollout proven on Google Workspace and Intune","Singapore and Hong Kong identifiers (NRIC/FIN, UEN, local phone and address formats)","A published detection benchmark, and a penetration test"],
  right_title="What we will show you",
  right=["3 design partners signed by month 6","15 paying accounts by month 12","The benchmark, published","A team of seven by month 12: me, three engineers, a partnerships lead, customer success and part-time finance"],
  note="Two tranches: S$600k at close, S$400k when the month-7 milestones are met. Terms open.")

slide("bullets", kicker="Why SGInnovate", title="From a product to a body of evidence.",
  bullets=["Publish how well detection really works (precision and recall on public data), so buyers and regulators can check our claims.",
           "Treat the decision record as the governance layer: what was caught, by whom, without keeping what anyone typed.",
           "Go beyond rules only where the evidence supports it. That is research, not a product claim.",
           "Pilot with corporate partners through the SGInnovate network, starting in Singapore and Hong Kong."])

slide("cols", kicker="Three to five years", title="Options we earn the right to pursue.",
  cols=[("Built into the phone","Work with phone makers so the send-point check ships in device software."),
        ("A private AI workspace","Bring your own model keys, the firewall built in, remember or forget each chat, delete any history."),
        ("Governance at scale","The same decision records as evidence for sector regulators and national programmes.")],
  note="Each is gated on milestones. None is in the base-case revenue.")

slide("risks", kicker="What could go wrong", title="The honest list.",
  rows=[("Detection is rules and can miss things.","A published benchmark, a human decision at Send, and research."),
        ("Traction is early.","Design partners first. We will not quote numbers we cannot prove."),
        ("One founder.","The first four hires are named in the plan; hiring is gated."),
        ("Browser checks are a crowded space.","Company controls, the phone and partners, not another extension."),
        ("AI sites change their pages.","Tests against real hosts and fast updates. A store once rejected a build for code readability; we fixed it and added a test.")])

slide("contact", kicker="Let us talk", title="Firdous Mahmood, founder.",
  lines=["director@vantward.com   ·   +65 8243 0739","https://eraseai.ai","Vantward Solutions Pte. Ltd.  ·  Reg. No. 202606980C","68 Circular Road #02-01, Singapore 049422"])

CSS="""
@page{size:1920px 1080px;margin:0}
:root{--bg:#070A13;--card:#0B111E;--bd:#192433;--fg:#F8FAFC;--mu:#94A3B8;--p:#0DCCF2;--pb:#3DE0FF}
*{box-sizing:border-box;margin:0}
body{background:#000;font-family:Inter,"DejaVu Sans",sans-serif;color:var(--fg)}
.slide{display:flex;flex-direction:column;width:1920px;height:1080px;background:radial-gradient(1100px 650px at 85% 8%,#0c2a3a 0%,transparent 60%),var(--bg);position:relative;padding:110px 140px 90px;page-break-after:always;overflow:hidden}
.k{color:var(--p);font-size:26px;letter-spacing:.14em;font-weight:600;text-transform:uppercase;margin-bottom:30px}
h1{font-size:74px;line-height:1.08;font-weight:700;letter-spacing:-.02em;max-width:1500px}
.title h1{font-size:104px;max-width:1400px}
.sub{margin-top:44px;font-size:40px;line-height:1.35;color:var(--mu);max-width:1300px}
ul{margin-top:60px;list-style:none;padding:0;max-width:1500px}
li{font-size:38px;line-height:1.38;margin-bottom:30px;padding-left:44px;position:relative;color:#dbe4ee}
li:before{content:"";position:absolute;left:0;top:19px;width:16px;height:16px;border-radius:50%;background:var(--p)}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin-top:70px}
.cols.four{grid-template-columns:repeat(2,1fr)}
.c{background:var(--card);border:1px solid var(--bd);border-radius:26px;padding:44px}
.c h3{font-size:36px;margin-bottom:18px;color:var(--pb)}
.c p{font-size:30px;line-height:1.4;color:#c9d4e0}
.note{position:absolute;left:140px;right:140px;bottom:96px;font-size:27px;line-height:1.4;color:var(--mu);border-top:1px solid var(--bd);padding-top:24px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin-top:64px}
.steps .c h3{font-size:40px}
table{margin-top:60px;border-collapse:collapse;width:100%;font-size:34px}
th{color:var(--p);text-align:right;padding:16px 22px;font-weight:600}
td{padding:22px;text-align:right;border-top:1px solid var(--bd)}
th:first-child,td:first-child{text-align:left;color:var(--mu)}
.two{display:grid;grid-template-columns:1.1fr .9fr;gap:70px;margin-top:50px}
.two h3{font-size:32px;color:var(--pb);margin-bottom:10px}
.two li{font-size:30px;margin-bottom:18px}
.two li:before{top:14px}
.two ul{margin-top:22px}
.risk{display:grid;grid-template-columns:1fr 1.2fr;gap:0 50px;margin-top:50px;font-size:29px;line-height:1.35}
.risk div{padding:17px 0;border-top:1px solid var(--bd)}
.risk .a{color:#fff;font-weight:600}.risk .b{color:var(--mu)}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:150px}
.title{justify-content:center}
.pg{position:absolute;right:140px;bottom:36px;font-size:22px;color:#5b6b80}
.ft{position:absolute;left:140px;bottom:36px;font-size:22px;color:#5b6b80}
.contact .l{font-size:40px;margin-top:26px;color:#dbe4ee}
img.logo{height:60px;margin-bottom:70px;align-self:flex-start}
"""
def render(i,kind,kw):
    h=[]
    body=[]
    if kind=="title":
        h.append(f'<img class="logo" src="lockup.png"><div class="k">{E(kw["kicker"])}</div><h1>{E(kw["title"])}</h1><p class="sub">{E(kw["sub"])}</p>')
    else:
        h.append(f'<div class="k">{E(kw["kicker"])}</div><h1>{E(kw["title"])}</h1>')
    if kind in("bullets","founder"):
        body.append("<ul>"+"".join(f"<li>{E(b)}</li>" for b in kw["bullets"])+"</ul>")
    if kind in("cols","model"):
        body.append('<div class="cols">'+"".join(f'<div class="c"><h3>{E(a)}</h3><p>{E(b)}</p></div>' for a,b in kw["cols"])+"</div>")
    if kind=="solution":
        body.append('<div class="steps">'+"".join(f'<div class="c"><h3>{E(a)}</h3><p>{E(b)}</p></div>' for a,b in kw["steps"])+"</div>")
    if kind=="cards":
        body.append('<div class="cols four">'+"".join(f'<div class="c"><h3>{E(a)}</h3><p>{E(b)}</p></div>' for a,b in kw["cards"])+"</div>")
    if kind=="traction":
        body.append('<div class="two"><div><ul>'+"".join(f"<li>{E(b)}</li>" for b in kw["left"])+f'</ul></div><div><h3>{E(kw["right_title"])}</h3><ul>'+"".join(f"<li>{E(b)}</li>" for b in kw["right"])+"</ul></div></div>")
    if kind=="ask":
        body.append(f'<div class="two"><div><h3>{E(kw["left_title"])}</h3><ul>'+"".join(f"<li>{E(b)}</li>" for b in kw["left"])+f'</ul></div><div><h3>{E(kw["right_title"])}</h3><ul>'+"".join(f"<li>{E(b)}</li>" for b in kw["right"])+"</ul></div></div>")
    if kind=="table":
        body.append("<table><tr>"+"".join(f"<th>{E(x)}</th>" for x in kw["head"])+"</tr>"+"".join("<tr>"+"".join(f"<td>{E(x)}</td>" for x in r)+"</tr>" for r in kw["rows"])+"</table>")
    if kind=="risks":
        body.append('<div class="risk">'+"".join(f'<div class="a">{E(a)}</div><div class="b">{E(b)}</div>' for a,b in kw["rows"])+"</div>")
    if kind=="contact":
        body.append("".join(f'<div class="l">{E(l)}</div>' for l in kw["lines"]))
    if body: h.append('<div class="body">'+"".join(body)+"</div>")
    if kw.get("note"): h.append(f'<div class="note">{E(kw["note"])}</div>')
    h.append(f'<div class="ft">EraseAI  ·  Vantward Solutions Pte. Ltd.</div><div class="pg">{i}</div>')
    cls="title" if kind=="title" else ("contact" if kind=="contact" else "")
    return f'<section class="slide {cls}">'+"".join(h)+"</section>"
doc="<!doctype html><html><head><meta charset='utf-8'><title>EraseAI pre-seed deck</title><style>"+CSS+"</style></head><body>"+"".join(render(i,k,kw) for i,(k,kw) in enumerate(slides,1))+"</body></html>"
open("deck.html","w").write(doc)
# plain-text source for editing
out=["# EraseAI pre-seed deck: slide text (edit here, then rebuild or paste into Slides)\n"]
for i,(k,kw) in enumerate(slides,1):
    out.append(f"## Slide {i}: {kw.get('kicker','')}\n**{kw.get('title','')}**\n")
    for key in ("sub","left_title","right_title"):
        if kw.get(key): out.append(kw[key]+"\n")
    for key in ("bullets","left","right","lines"):
        for b in kw.get(key,[]): out.append("- "+b)
    for key in ("cols","cards","steps"):
        for a,b in kw.get(key,[]): out.append(f"- **{a}**: {b}")
    if kw.get("head"):
        out.append("| "+" | ".join(kw["head"])+" |\n|"+"---|"*len(kw["head"]))
        for r in kw["rows"]: out.append("| "+" | ".join(r)+" |")
    if k=="risks":
        for a,b in kw["rows"]: out.append(f"- **{a}** {b}")
    if kw.get("note"): out.append("\n_"+kw["note"]+"_")
    out.append("")
open("deck-text.md","w").write("\n".join(out))
print(len(slides),"slides")
