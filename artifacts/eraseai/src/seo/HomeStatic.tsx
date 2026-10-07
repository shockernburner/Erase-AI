// The home page's text as one readable page, for the static HTML at "/".
// The live home page shows the same story one frame at a time; crawlers that
// don't run JavaScript (and visitors before the app loads) get it all at once.
// Wording comes from the English locale so the two can't drift apart.

import en from "@/i18n/locales/en.json";
import { LANDING_PLANS, STATS, CONTACT } from "@/components/landing/landingData";
import { GUIDES } from "@/content/guides";
import { CHROME_STORE_URL, PLAY_STORE_URL } from "./site";

const s = en.story;
const plans = s.plans as unknown as Record<string, Record<string, string>>;

export function HomeStatic() {
  return (
    <div className="min-h-screen bg-[#03060c] text-white">
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">EraseAI</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-6xl">
          {s.start.title} {s.start.titleAccent}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-white/75">
          EraseAI is an AI firewall and AI data loss prevention (AI DLP) tool. It checks what you are about to send to ChatGPT, Claude, Gemini and
          other AI, and stops names, card numbers, API keys, passwords and private files before they leave your device, in prompts and in
          attachments. {s.brand.c0} {s.brand.c1}
        </p>
        <p className="mt-6 flex flex-wrap gap-3">
          <a href={CHROME_STORE_URL} className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950">{s.start.chrome}</a>
          <a href={PLAY_STORE_URL} className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">{s.start.android}</a>
        </p>

        <h2 className="mt-14 font-display text-2xl font-bold">{s.headlines.titleLeaks} {s.headlines.titleMisuse}</h2>
        <ul className="mt-4 list-disc space-y-1 pl-6 text-white/75">
          {Object.values(s.headlines.leaks).concat(Object.values(s.headlines.misuse)).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-white/50">{s.headlines.note}</p>

        <h2 className="mt-14 font-display text-2xl font-bold">How data leaks through AI</h2>
        <p className="mt-4 text-white/75">
          {s.leak.sub} Full names, passport and card numbers, API keys, home addresses, medical notes, client lists and salaries pasted into AI
          chats end up in logs, training data, search results and breaches.
        </p>

        <h2 className="mt-14 font-display text-2xl font-bold">{s.now.title} {s.now.titleAccent}</h2>
        <ul className="mt-4 list-disc space-y-1 pl-6 text-white/75">
          {STATS.map((st) => (
            <li key={st.key}>
              {st.prefix}
              {st.value}
              {st.suffix} {(s.now as Record<string, string>)[st.key]}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-white/50">{s.now.source}</p>

        <h2 className="mt-14 font-display text-2xl font-bold">{s.brand.c2}</h2>
        <p className="mt-4 text-white/75">
          When a message contains something sensitive, EraseAI shows what it found and where. Choose Sanitize &amp; Send to replace it with labels
          like [NAME], [CARD] or [API KEY], send anyway, or cancel. Messages with nothing sensitive go straight through.
        </p>

        <h2 className="mt-14 font-display text-2xl font-bold">{s.plans.title}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {LANDING_PLANS.map((p) => (
            <section key={p.id} className="rounded-2xl border border-white/10 p-5">
              <h3 className="text-lg font-bold">{plans[p.id].name}</h3>
              <p className="text-sm text-white/60">{plans[p.id].tagline}</p>
              <p className="mt-2 font-semibold">
                {p.monthly == null ? s.plans.custom : `$${p.monthly}${p.perPerson ? s.plans.perPersonMonth : s.plans.perMonth}`}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">
                {["f1", "f2", "f3", "f4", "f5"].map((f) => (
                  <li key={f}>{plans[p.id][f]}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-4 text-white/75">The Chrome extension is free: every message to ChatGPT, Claude and Gemini is checked on your device, with no limit and no account.</p>

        <h2 className="mt-14 font-display text-2xl font-bold">Learn about AI data security</h2>
        <ul className="mt-4 list-disc space-y-1 pl-6">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <a href={`/learn/${g.slug}`} className="text-cyan-300">{g.title}</a>
            </li>
          ))}
          <li><a href="/ai-firewall" className="text-cyan-300">AI firewall</a></li>
          <li><a href="/learn" className="text-cyan-300">All guides</a></li>
        </ul>

        <h2 className="mt-14 font-display text-2xl font-bold">{s.start.sales}</h2>
        <p className="mt-4 text-white/75">
          Email <a href={`mailto:${CONTACT.email}`} className="text-cyan-300">{CONTACT.email}</a>, WhatsApp {CONTACT.whatsappLabel}, or use the{" "}
          <a href="/contact" className="text-cyan-300">contact form</a>. {s.start.company}.
        </p>
        <p className="mt-6 flex gap-4 text-sm text-white/50">
          <a href="/privacy">{s.start.privacy}</a>
          <a href="/terms">{s.start.terms}</a>
          <a href="/license">{s.start.license}</a>
        </p>
      </main>
    </div>
  );
}
