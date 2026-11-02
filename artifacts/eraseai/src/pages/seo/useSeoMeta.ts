import { useEffect } from "react";
import { canonicalUrl, staticPage, type PageMeta } from "@/seo/site";

interface SeoMeta {
  title: string;
  description: string;
  url: string;
  keywords?: string;
}

/** Sets the page's title, description, canonical and social tags while it is shown. */
export function useSeoMeta({ title, description, url, keywords }: SeoMeta) {
  useEffect(() => {
    const restore = applyMeta({ title, description, url, keywords });
    return restore;
  }, [title, description, keywords, url]);
}

/** useSeoMeta for a page registered in seo/site.ts (or a guide's own meta). */
export function usePageMeta(page: PageMeta | string) {
  const meta = typeof page === "string" ? staticPage(page) : page;
  useSeoMeta({ title: meta.title, description: meta.description, url: canonicalUrl(meta.path), keywords: meta.keywords });
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function applyMeta({ title, description, url, keywords }: SeoMeta) {
  // What the static HTML for this URL had, to put back when the page unmounts.
  const before = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    keywords: document.querySelector('meta[name="keywords"]')?.getAttribute("content") ?? "",
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
  };
  const set = (m: SeoMeta) => {
    document.title = m.title;
    setMeta("name", "description", m.description);
    if (m.keywords) setMeta("name", "keywords", m.keywords);
    setMeta("property", "og:title", m.title);
    setMeta("property", "og:description", m.description);
    setMeta("property", "og:url", m.url);
    setMeta("name", "twitter:title", m.title);
    setMeta("name", "twitter:description", m.description);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = m.url;
  };
  set({ title, description, url, keywords });
  return () => set({ title: before.title, description: before.description, url: before.canonical, keywords: before.keywords });
}
