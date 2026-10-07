import { ChevronRight } from "lucide-react";
import { useParams } from "wouter";
import { guideBySlug, type Guide } from "@/content/guides";
import { guideMeta } from "@/seo/pages";
import { canonicalUrl, SITE_URL } from "@/seo/site";
import { SeoPage, AddToChromeButton, CtaButton, RelatedLinks } from "./SeoLayout";
import { JsonLd, RichText } from "./RichText";
import { usePageMeta } from "./useSeoMeta";
import NotFound from "@/pages/not-found";

const BASE = import.meta.env.BASE_URL;

export default function GuideRoute() {
  const { slug } = useParams<{ slug: string }>();
  const guide = guideBySlug(slug ?? "");
  if (!guide) return <NotFound />;
  return <GuidePage guide={guide} />;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function GuidePage({ guide }: { guide: Guide }) {
  const meta = guideMeta(guide);
  usePageMeta(meta);
  const url = canonicalUrl(meta.path);
  const related = guide.related.map(guideBySlug).filter((g): g is Guide => !!g);

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        dateModified: guide.updated,
        mainEntityOfPage: url,
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        image: `${SITE_URL}/opengraph.jpg`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE_URL}/learn` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
      ...(guide.faq.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ]
        : []),
    ],
  };

  return (
    <SeoPage>
      <JsonLd data={structured} />
      <article>
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <a href={BASE} className="hover:text-primary">Home</a>
          <ChevronRight className="h-3.5 w-3.5" />
          <a href={`${BASE}learn`} className="hover:text-primary">Learn</a>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground/80">{guide.topic}</span>
        </nav>

        <h1 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-4">{guide.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Updated <time dateTime={guide.updated}>{formatDate(guide.updated)}</time> · EraseAI
        </p>

        {guide.intro.map((p, i) => (
          <p key={i} className="text-lg text-muted-foreground leading-relaxed mb-5">
            <RichText text={p} />
          </p>
        ))}

        {guide.sections.length > 2 && (
          <nav aria-label="On this page" className="my-8 rounded-xl border border-border/30 bg-card/40 p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {guide.sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${anchor(s.heading)}`} className="text-muted-foreground hover:text-primary">{s.heading}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {guide.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 id={anchor(s.heading)} className="scroll-mt-24 text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">{s.heading}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed mb-4">
                <RichText text={p} />
              </p>
            ))}
            {s.bullets && (
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground leading-relaxed mb-4">
                {s.bullets.map((b, i) => (
                  <li key={i}><RichText text={b} /></li>
                ))}
              </ul>
            )}
            {s.steps && (
              <ol className="list-decimal space-y-2 pl-6 text-muted-foreground leading-relaxed mb-4">
                {s.steps.map((b, i) => (
                  <li key={i}><RichText text={b} /></li>
                ))}
              </ol>
            )}
          </section>
        ))}

        <div className="my-12 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Check every message before it reaches AI</h2>
          <p className="text-muted-foreground mb-6">
            EraseAI stops API keys, passwords, card numbers and personal data in ChatGPT, Claude and Gemini. Free in Chrome, no account needed.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AddToChromeButton placement={`learn-${guide.slug}`} />
            <CtaButton text="Try EraseAI" />
          </div>
        </div>

        {guide.faq.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-6">Frequently asked questions</h2>
            <div className="space-y-6">
              {guide.faq.map((f) => (
                <div key={f.q}>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-foreground mb-4">Related guides</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((g) => (
                <a key={g.slug} href={`${BASE}learn/${g.slug}`} className="rounded-xl border border-border/30 bg-card/40 p-4 transition hover:border-primary/30">
                  <span className="block font-semibold text-foreground">{g.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">{g.description}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <RelatedLinks />
      </article>
    </SeoPage>
  );
}

export function anchor(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
