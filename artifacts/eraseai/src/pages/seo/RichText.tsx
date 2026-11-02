import { Fragment } from "react";

const BASE = import.meta.env.BASE_URL;

/** Renders guide text with [label](/path) links and **bold**. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          const [, label, href] = link;
          const internal = href.startsWith("/");
          return (
            <a
              key={i}
              href={internal ? `${BASE}${href.slice(1)}` : href}
              {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              className="text-primary underline-offset-4 hover:underline"
            >
              {label}
            </a>
          );
        }
        const bold = /^\*\*([^*]+)\*\*$/.exec(part);
        if (bold) return <strong key={i} className="font-semibold text-foreground">{bold[1]}</strong>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Structured data for search engines, rendered in the page body. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
