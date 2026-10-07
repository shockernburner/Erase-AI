import { BookOpen } from "lucide-react";
import { GUIDES, GUIDE_TOPICS } from "@/content/guides";
import { SITE_URL } from "@/seo/site";
import { SeoPage, AddToChromeButton } from "./SeoLayout";
import { JsonLd } from "./RichText";
import { usePageMeta } from "./useSeoMeta";

const BASE = import.meta.env.BASE_URL;

const MORE = [
  { href: "ai-firewall", title: "AI Firewall", text: "How a check at the Send button stops secrets and personal data reaching AI." },
  { href: "chatgpt-data-leak", title: "Prevent ChatGPT data leaks", text: "Settings, habits and tools that keep sensitive data out of ChatGPT." },
  { href: "ai-prompt-security", title: "AI prompt security", text: "What should never go into a prompt, and how to check automatically." },
  { href: "api-key-protection-ai", title: "API key protection", text: "Keep keys and tokens out of AI chats, and what to do if one slips." },
];

export default function LearnIndex() {
  usePageMeta("/learn");

  const structured = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AI data security guides",
    url: `${SITE_URL}/learn`,
    hasPart: GUIDES.map((g) => ({ "@type": "Article", headline: g.title, url: `${SITE_URL}/learn/${g.slug}` })),
  };

  return (
    <SeoPage>
      <JsonLd data={structured} />
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
        <BookOpen className="w-4 h-4" />
        Learn
      </div>
      <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-6">
        Use AI without leaking your data
      </h1>
      <p className="text-lg text-muted-foreground leading-relaxed mb-10">
        Plain-English guides to AI and data security: how data leaks through ChatGPT, Claude, Gemini and other large language models, and the
        controls that stop it, from AI data loss prevention (AI DLP) and PII redaction to policy and compliance.
      </p>

      {GUIDE_TOPICS.map((topic) => {
        const guides = GUIDES.filter((g) => g.topic === topic);
        if (!guides.length) return null;
        return (
          <section key={topic} className="mb-12">
            <h2 className="text-2xl font-display font-bold text-foreground mb-4">{topic}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {guides.map((g) => (
                <a key={g.slug} href={`${BASE}learn/${g.slug}`} className="rounded-xl border border-border/30 bg-card/40 p-5 transition hover:border-primary/30">
                  <h3 className="font-semibold text-foreground">{g.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{g.description}</p>
                </a>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mb-12">
        <h2 className="text-2xl font-display font-bold text-foreground mb-4">More on AI firewalls</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MORE.map((m) => (
            <a key={m.href} href={`${BASE}${m.href}`} className="rounded-xl border border-border/30 bg-card/40 p-5 transition hover:border-primary/30">
              <h3 className="font-semibold text-foreground">{m.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{m.text}</p>
            </a>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Put the guides into practice</h2>
        <p className="text-muted-foreground mb-6">EraseAI checks every message to ChatGPT, Claude and Gemini before it is sent. Free in Chrome.</p>
        <AddToChromeButton placement="learn-index" />
      </div>
    </SeoPage>
  );
}
