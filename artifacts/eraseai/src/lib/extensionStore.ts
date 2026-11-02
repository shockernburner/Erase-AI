// Single source for links to the EraseAI Firewall browser extension listings.
//
// VITE_CHROME_STORE_URL overrides the listing URL; without it we use the
// published listing. The store assigned its own ID (the store build strips the
// manifest `key`), so this is NOT the pinned dev ID from PUBLISHING.md § 0.
// Every link gets UTM tags so the Chrome Web Store dashboard can attribute
// installs to a page.

import { attribution } from "@/lib/analytics";

const STORE_EXTENSION_ID = "hckhbadbpkihjpooeljdocgidelcampp";

export const CHROME_STORE_URL: string =
  (import.meta.env.VITE_CHROME_STORE_URL as string | undefined) ||
  `https://chromewebstore.google.com/detail/eraseai-firewall/${STORE_EXTENSION_ID}`;

/**
 * Listing URL tagged with where on the site the click came from, e.g.
 * chromeStoreLink("landing-hero").
 */
export function chromeStoreLink(placement: string, source = "site"): string {
  const url = new URL(CHROME_STORE_URL);
  // A visit that came from an ad keeps its campaign tags, so the store's dashboard
  // credits the install to the ad; the button's own placement moves to utm_content.
  const from = attribution();
  if (from) {
    url.searchParams.set("utm_source", from.source);
    url.searchParams.set("utm_medium", from.medium);
    url.searchParams.set("utm_campaign", from.campaign);
    url.searchParams.set("utm_content", placement);
    if (from.term) url.searchParams.set("utm_term", from.term);
    return url.toString();
  }
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", placement);
  url.searchParams.set("utm_campaign", "extension");
  return url.toString();
}
