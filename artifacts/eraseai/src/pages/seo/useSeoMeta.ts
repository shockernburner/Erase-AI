import { useEffect } from "react";

interface SeoMeta {
  title: string;
  description: string;
  url: string;
  keywords?: string;
}

export function useSeoMeta({ title, description, url, keywords }: SeoMeta) {
  useEffect(() => {
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (el) {
        el.content = content;
      } else {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        el.content = content;
        document.head.appendChild(el);
      }
    };

    setMeta("name", "description", description);
    if (keywords) {
      setMeta("name", "keywords", keywords);
    }
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) {
      canonical.href = url;
    }

    return () => {
      const defaults = {
        title: "EraseAI — AI Firewall to Prevent Data Leaks in ChatGPT, Gemini & Claude",
        description: "EraseAI scans prompts, files, and AI responses to stop PII, API keys, bank data, client records, and confidential information from leaking into AI tools.",
        url: "https://eraseai.ai",
        keywords: "AI firewall, ChatGPT data leak prevention, Claude privacy, Gemini privacy, LLM security, prompt scanning, PII detection, API key detection, AI DLP, AI privacy tool",
      };
      document.title = defaults.title;
      setMeta("name", "description", defaults.description);
      setMeta("name", "keywords", defaults.keywords);
      setMeta("property", "og:title", defaults.title);
      setMeta("property", "og:description", defaults.description);
      setMeta("property", "og:url", defaults.url);
      if (canonical) canonical.href = defaults.url;
    };
  }, [title, description, keywords, url]);
}
