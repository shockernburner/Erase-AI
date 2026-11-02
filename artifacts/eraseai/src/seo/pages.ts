import { GUIDES, type Guide } from "@/content/guides";
import { STATIC_PAGES, type PageMeta } from "./site";

export function guideMeta(g: Guide): PageMeta {
  return {
    path: `/learn/${g.slug}`,
    title: `${g.metaTitle} | EraseAI`,
    description: g.description,
    updated: g.updated,
    ogType: "article",
    priority: 0.8,
  };
}

/** Every indexable page, for the sitemap and the prerender step. */
export function allPages(): PageMeta[] {
  return [...STATIC_PAGES, ...GUIDES.map(guideMeta)];
}
