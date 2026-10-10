// Build-time entry for scripts/prerender.mjs: renders the public content pages
// to static HTML so search engines and AI crawlers that don't run JavaScript
// see the full text. The browser app replaces this markup when it starts.

import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GUIDES } from "@/content/guides";
import AiFirewallPage from "@/pages/seo/AiFirewallPage";
import ChatgptDataLeakPage from "@/pages/seo/ChatgptDataLeakPage";
import AiPromptSecurityPage from "@/pages/seo/AiPromptSecurityPage";
import ApiKeyProtectionPage from "@/pages/seo/ApiKeyProtectionPage";
import DeveloperApiPage from "@/pages/seo/DeveloperApiPage";
import BlogIndex from "@/pages/seo/BlogIndex";
import BlogPost_ApiKeys from "@/pages/seo/BlogPost_ApiKeys";
import BlogPost_AiFirewall from "@/pages/seo/BlogPost_AiFirewall";
import BlogPost_PreventLeaks from "@/pages/seo/BlogPost_PreventLeaks";
import LearnIndex from "@/pages/seo/LearnIndex";
import { GuidePage } from "@/pages/seo/GuidePage";
import { HomeStatic } from "./HomeStatic";
import { allPages } from "./pages";
import { canonicalUrl, ORGANIZATION_LD, SOFTWARE_LD, WEBSITE_LD } from "./site";

export { allPages, canonicalUrl };

const PAGES: Record<string, ComponentType> = {
  "/": HomeStatic,
  "/learn": LearnIndex,
  "/ai-firewall": AiFirewallPage,
  "/chatgpt-data-leak": ChatgptDataLeakPage,
  "/ai-prompt-security": AiPromptSecurityPage,
  "/api-key-protection-ai": ApiKeyProtectionPage,
  "/developer-api": DeveloperApiPage,
  "/blog": BlogIndex,
  "/blog/api-keys-chatgpt": BlogPost_ApiKeys,
  "/blog/what-is-ai-firewall": BlogPost_AiFirewall,
  "/blog/prevent-data-leaks-ai": BlogPost_PreventLeaks,
};

/** Static markup for a page, or "" when the page only gets its head tags. */
export function renderBody(path: string): string {
  const guide = GUIDES.find((g) => `/learn/${g.slug}` === path);
  if (guide) return renderToStaticMarkup(<GuidePage guide={guide} />);
  const Page = PAGES[path];
  return Page ? renderToStaticMarkup(<Page />) : "";
}

/** Site-wide structured data, placed in every page's head. */
export const SITE_LD = { "@context": "https://schema.org", "@graph": [ORGANIZATION_LD, WEBSITE_LD, SOFTWARE_LD] };
