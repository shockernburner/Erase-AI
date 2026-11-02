// Google Analytics 4 + Google Ads measurement, behind consent.
//
// - The Google tag loads on every page but starts with every storage signal
//   denied (Consent Mode v2). Choosing "Accept" in the banner grants analytics and ad
//   measurement storage; ad personalisation stays denied because we run no remarketing.
// - Global Privacy Control and Do Not Track count as "Decline", with no banner.
// - Nothing here sends prompt text, emails or any account data: only page views and
//   the named events below.
// - Ad attribution: the landing URL's utm_* tags (or a bare gclid) are remembered for
//   the tab so Chrome Web Store and Google Play links can carry the campaign through
//   (see attribution() and the store link helpers).

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || "G-K82G1MZ7SE";
const CONSENT_KEY = "eraseai.analytics-consent";
const ATTRIBUTION_KEY = "eraseai.attribution";

export type ConsentChoice = "granted" | "denied" | null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function read(storage: "local" | "session", key: string): string | null {
  try {
    return (storage === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(storage: "local" | "session", key: string, value: string) {
  try {
    (storage === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* private mode: the choice just lasts for this page view */
  }
}

/** The browser itself says "don't track me". */
export function privacySignalOn(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

export function getConsent(): ConsentChoice {
  if (privacySignalOn()) return "denied";
  const v = read("local", CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

function consentState(granted: boolean) {
  const s = granted ? "granted" : "denied";
  return { ad_storage: s, analytics_storage: s, ad_user_data: s, ad_personalization: "denied" };
}

export function setConsent(granted: boolean) {
  write("local", CONSENT_KEY, granted ? "granted" : "denied");
  window.gtag?.("consent", "update", consentState(granted));
}

export function track(name: string, params: Record<string, unknown> = {}) {
  window.gtag?.("event", name, params);
}

// ---------------------------------------------------------------- attribution

export interface Attribution {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
}

/** Remember where this visit came from, once, when the landing URL carries campaign tags. */
export function captureAttribution(search: string = typeof location === "undefined" ? "" : location.search) {
  const q = new URLSearchParams(search);
  const source = q.get("utm_source");
  const gclid = q.get("gclid");
  if (!source && !gclid) return;
  const a: Attribution = {
    source: source || "google",
    medium: q.get("utm_medium") || (gclid ? "cpc" : "referral"),
    campaign: q.get("utm_campaign") || "(not set)",
  };
  const term = q.get("utm_term");
  if (term) a.term = term;
  write("session", ATTRIBUTION_KEY, JSON.stringify(a));
}

export function attribution(): Attribution | null {
  const raw = read("session", ATTRIBUTION_KEY);
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as Attribution;
    return a && a.source ? a : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- store clicks

function storeEvent(url: string): "click_chrome_store" | "click_google_play" | null {
  try {
    const host = new URL(url, location.href).hostname;
    if (host === "chromewebstore.google.com" || host === "chrome.google.com") return "click_chrome_store";
    if (host === "play.google.com") return "click_google_play";
  } catch {
    /* not a URL */
  }
  return null;
}

/** Counts a click on a Chrome Web Store or Google Play link (anchors are caught automatically). */
export function trackStoreClick(url: string) {
  const name = storeEvent(url);
  if (!name) return;
  const u = new URL(url, location.href);
  // Play carries its tags inside the `referrer` parameter.
  const tags = new URLSearchParams(u.searchParams.get("referrer") || u.search);
  track(name, {
    placement: tags.get("utm_content") || tags.get("utm_medium") || "",
    campaign: tags.get("utm_campaign") || "",
    link_url: `${u.origin}${u.pathname}`,
  });
}

function onDocumentClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (a) trackStoreClick(a.href);
}

// ---------------------------------------------------------------------- start

export function initAnalytics() {
  if (typeof window === "undefined" || window.gtag) return;
  captureAttribution();
  window.dataLayer = window.dataLayer || [];
  // The Google tag needs the `arguments` object itself, not an array.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", consentState(getConsent() === "granted"));
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  document.addEventListener("click", onDocumentClick, true);
}
