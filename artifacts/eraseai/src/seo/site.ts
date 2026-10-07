// One place for what search engines see on every public page: title,
// description, canonical URL and structured data. Pages call useSeoMeta with
// these, and the build (scripts/prerender.mjs) writes the same tags into each
// page's static HTML, so crawlers that don't run JavaScript get them too.

export const SITE_URL = "https://eraseai.ai";
export const SITE_NAME = "EraseAI";
export const OG_IMAGE = `${SITE_URL}/opengraph.jpg`;
export const CHROME_STORE_URL = "https://chromewebstore.google.com/detail/eraseai-firewall/hckhbadbpkihjpooeljdocgidelcampp";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.eraseai.firewall";

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** Kept short; search engines mostly ignore it, but some site search tools read it. */
  keywords?: string;
  /** Last meaningful content change, YYYY-MM-DD. Goes into the sitemap. */
  updated: string;
  ogType?: "website" | "article";
  priority?: number;
  noindex?: boolean;
}

export const canonicalUrl = (path: string) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`);

/** Static pages. Learn guides and blog posts add their own entries below. */
export const STATIC_PAGES: PageMeta[] = [
  {
    path: "/",
    title: "EraseAI — AI Firewall & Data Loss Prevention for ChatGPT, Claude and Gemini",
    description:
      "EraseAI stops names, card numbers, API keys, passwords and private files before they reach ChatGPT, Claude, Gemini and other AI. Free Chrome extension, Android app and API.",
    keywords: "AI firewall, AI data loss prevention, AI DLP, LLM security, ChatGPT data leak, prompt security, PII redaction",
    updated: "2026-10-07",
    priority: 1.0,
  },
  {
    path: "/learn",
    title: "AI Data Security Guides — AI DLP, LLM Security, Shadow AI | EraseAI",
    description:
      "Plain-English guides to using AI without leaking data: AI data loss prevention, LLM data security, shadow AI, PII redaction, prompt injection, AI policy and compliance.",
    updated: "2026-10-07",
    priority: 0.9,
  },
  {
    path: "/ai-firewall",
    title: "AI Firewall — Stop Sensitive Data Before It Reaches AI | EraseAI",
    description:
      "An AI firewall checks what you are about to send to ChatGPT, Claude or Gemini and stops API keys, passwords and personal data first. Free Chrome extension.",
    updated: "2026-10-07",
    priority: 0.9,
  },
  {
    path: "/chatgpt-data-leak",
    title: "How to Prevent ChatGPT Data Leaks | EraseAI",
    description:
      "How sensitive data leaks through ChatGPT prompts and uploads, and how to stop it: settings to change, habits that help, and an AI firewall that checks every message.",
    updated: "2026-10-07",
    priority: 0.8,
  },
  {
    path: "/ai-prompt-security",
    title: "AI Prompt Security — Keep Secrets Out of Your Prompts | EraseAI",
    description:
      "What prompt security means, which data should never go into an AI prompt, and how to check prompts automatically before they are sent.",
    updated: "2026-10-07",
    priority: 0.8,
  },
  {
    path: "/api-key-protection-ai",
    title: "API Key Protection for AI Tools | EraseAI",
    description:
      "API keys pasted into AI chats can be logged, shared and leaked. How to keep keys and tokens out of ChatGPT, Claude and Gemini, and what to do if one slips.",
    updated: "2026-10-07",
    priority: 0.8,
  },
  {
    path: "/blog",
    title: "Blog — AI Security, Data Protection & Prompt Safety | EraseAI",
    description: "Articles on AI security, data protection and using AI tools without exposing sensitive information.",
    updated: "2026-10-07",
    priority: 0.6,
  },
  {
    path: "/blog/api-keys-chatgpt",
    title: "Why You Should Never Paste API Keys into ChatGPT | EraseAI",
    description: "One pasted key can expose your infrastructure. Why API keys in AI chats are dangerous and how to protect them.",
    updated: "2025-01-15",
    ogType: "article",
    priority: 0.6,
  },
  {
    path: "/blog/what-is-ai-firewall",
    title: "What Is an AI Firewall? | EraseAI",
    description: "What an AI firewall is, how it differs from a network firewall and a DLP suite, and why teams using AI need one.",
    updated: "2025-01-10",
    ogType: "article",
    priority: 0.6,
  },
  {
    path: "/blog/prevent-data-leaks-ai",
    title: "How to Prevent Data Leaks in AI Tools | EraseAI",
    description: "Practical steps to prevent accidental data exposure in ChatGPT, Gemini, Claude and other AI tools.",
    updated: "2025-01-05",
    ogType: "article",
    priority: 0.6,
  },
  {
    path: "/status",
    title: "EraseAI Status",
    description: "Live status of the EraseAI API and the latest browser extension version.",
    updated: "2026-10-07",
    priority: 0.3,
  },
  {
    path: "/contact",
    title: "Contact EraseAI",
    description: "Talk to EraseAI about AI data security for yourself, your family or your organization. Email, WhatsApp or the contact form.",
    updated: "2026-10-07",
    priority: 0.4,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | EraseAI",
    description: "How EraseAI collects, uses and protects your data.",
    updated: "2026-10-07",
    priority: 0.3,
  },
  {
    path: "/terms",
    title: "Terms of Service | EraseAI",
    description: "The terms for using EraseAI's website, apps and API.",
    updated: "2026-10-07",
    priority: 0.2,
  },
  {
    path: "/license",
    title: "License Agreement | EraseAI",
    description: "The license for EraseAI software, including the browser extension and Android app.",
    updated: "2026-10-07",
    priority: 0.2,
  },
];

export function staticPage(path: string): PageMeta {
  const page = STATIC_PAGES.find((p) => p.path === path);
  if (!page) throw new Error(`No SEO entry for ${path}`);
  return page;
}

/** Who publishes the site, for structured data. */
export const ORGANIZATION_LD = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/apple-touch-icon.png`,
  parentOrganization: { "@type": "Organization", name: "Vantward Solutions Pte. Ltd." },
  email: "director@vantward.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "68 Circular Road #02-01",
    postalCode: "049422",
    addressLocality: "Singapore",
    addressCountry: "SG",
  },
  sameAs: [CHROME_STORE_URL, PLAY_STORE_URL],
};

export const WEBSITE_LD = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const SOFTWARE_LD = {
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: "EraseAI Firewall",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Chrome, Android, Web",
  description:
    "An AI firewall that checks messages and files before they are sent to ChatGPT, Claude, Gemini and other AI tools, and stops API keys, passwords and personal data.",
  url: `${SITE_URL}/`,
  downloadUrl: CHROME_STORE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "EraseAI Personal", price: "5", priceCurrency: "USD", description: "Per month, or $54 a year" },
  ],
};
