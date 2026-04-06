import { useEffect } from "react";

interface SeoMeta {
  title: string;
  description: string;
  url: string;
}

export function useSeoMeta({ title, description, url }: SeoMeta) {
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
        description: "Stop leaking API keys and sensitive data to AI tools. EraseAI acts as a real-time AI firewall that scans, warns, and protects your prompts before sending.",
        url: "https://eraseai.ai",
      };
      document.title = defaults.title;
      setMeta("name", "description", defaults.description);
      setMeta("property", "og:title", defaults.title);
      setMeta("property", "og:description", defaults.description);
      setMeta("property", "og:url", defaults.url);
      if (canonical) canonical.href = defaults.url;
    };
  }, [title, description, url]);
}
