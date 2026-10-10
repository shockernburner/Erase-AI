// Which EraseAI product a visitor can install on the device they're using, so
// the main call to action is one they can act on right now: the Android app on
// an Android phone, the Chrome extension on a computer.

import { chromeStoreLink } from "@/lib/extensionStore";
import { ANDROID_PLAY_URL } from "@/lib/products";

export type InstallTarget = "android" | "chrome" | "other-mobile";

/** iPhones and iPads have no EraseAI app and no Chrome extensions. */
export function detectInstallTarget(userAgent: string = typeof navigator === "undefined" ? "" : navigator.userAgent): InstallTarget {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "other-mobile";
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/Macintosh/i.test(userAgent) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1) {
    return "other-mobile";
  }
  return "chrome";
}

/**
 * Play listing tagged with where on the site the click came from. Play only
 * passes UTM tags through in the `referrer` parameter, which the Play Console's
 * acquisition report reads.
 */
export function playStoreLink(placement: string, source = "site"): string {
  const url = new URL(ANDROID_PLAY_URL);
  url.searchParams.set(
    "referrer",
    `utm_source=${source}&utm_medium=${placement}&utm_campaign=android`,
  );
  return url.toString();
}

export interface InstallCta {
  label: string;
  href: string;
}

/** Primary and secondary install buttons for a placement on the site. */
export function installCtas(target: InstallTarget, placement: string): { primary: InstallCta; secondary: InstallCta } {
  const chrome = { label: "Add to Chrome — free", href: chromeStoreLink(placement) };
  const android = { label: "Get the Android app", href: playStoreLink(placement) };
  if (target === "android") {
    return { primary: android, secondary: { label: "Chrome extension for your computer", href: chrome.href } };
  }
  return { primary: chrome, secondary: { label: "Android app for your phone", href: android.href } };
}
