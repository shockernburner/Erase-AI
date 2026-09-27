// Single source for links to the EraseAI Firewall browser extension listings.
//
// VITE_CHROME_STORE_URL overrides the listing URL; without it we fall back to
// the pinned extension ID (see extension/PUBLISHING.md § 0), which is what the
// store uses because manifest.json carries a fixed `key`. Every link gets UTM
// tags so the Chrome Web Store dashboard can attribute installs to a page.

const PINNED_EXTENSION_ID = "bhcdkolfchcihbiakkbkfpfpempgdgji";

export const CHROME_STORE_URL: string =
  (import.meta.env.VITE_CHROME_STORE_URL as string | undefined) ||
  `https://chromewebstore.google.com/detail/${PINNED_EXTENSION_ID}`;

/**
 * Listing URL tagged with where on the site the click came from, e.g.
 * chromeStoreLink("landing-hero").
 */
export function chromeStoreLink(placement: string, source = "site"): string {
  const url = new URL(CHROME_STORE_URL);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", placement);
  url.searchParams.set("utm_campaign", "extension");
  return url.toString();
}
