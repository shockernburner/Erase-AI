import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, KeyRound, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { SeoPage } from "./SeoLayout";
import { useSeoMeta } from "./useSeoMeta";
import { playStoreLink } from "@/lib/installTarget";

const BASE = import.meta.env.BASE_URL;

// AWS's own documentation example key: it matches the AWS key rule but has never worked anywhere.
const DEMO_PROMPT = "Can you check why this fails? My AWS key is AKIAIOSFODNN7EXAMPLE";

const AI_SITES = [
  { name: "ChatGPT", href: "https://chatgpt.com/" },
  { name: "Claude", href: "https://claude.ai/new" },
  { name: "Gemini", href: "https://gemini.google.com/app" },
];

/**
 * Opened by the extension right after install (extension/src/growth.js). From
 * 1.5.0 the extension checks every message on the device with no account, so
 * the first job of this page is to let people see it stop something; Personal
 * and connecting an account come after.
 */
export default function ExtensionWelcomePage() {
  useSeoMeta({
    title: "Welcome to EraseAI Firewall — you're protected",
    description: "EraseAI Firewall checks every message to ChatGPT, Claude and Gemini on your device. Try it with a safe example key.",
    url: "https://eraseai.ai/ai-firewall/welcome",
  });
  useNoIndex();

  const [copied, setCopied] = useState(false);
  const copyDemo = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the prompt is on screen to copy by hand.
    }
  };

  const pricingUrl = `${BASE}pricing?utm_source=extension&utm_medium=welcome`;
  // Sign-in lands on the dashboard's Extension Setup page, where one click creates a
  // key for the extension (the `view` deep link survives the auth screen).
  const accountUrl = `${BASE}?view=firewallDocs&utm_source=extension&utm_medium=welcome`;

  return (
    <SeoPage>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
        <CheckCircle2 className="w-4 h-4" />
        Extension installed
      </div>
      <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-4">
        You're protected. See it work in 30 seconds.
      </h1>
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        EraseAI Firewall now checks every message you send to ChatGPT, Claude and Gemini, on this device, with no
        account and no limit. Try it with a safe example key.
      </p>

      <section className="mb-12 p-6 rounded-2xl border border-primary/30 bg-primary/5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Try it now
        </h2>
        <ol className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <li>
            <span className="font-semibold text-foreground">1. Copy this message.</span> The key is AWS's public
            example key; it has never worked anywhere.
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <code className="flex-1 min-w-0 break-all rounded-xl border border-border/40 bg-background/70 px-4 py-3 font-mono text-xs text-foreground">
                {DEMO_PROMPT}
              </code>
              <button
                type="button"
                onClick={copyDemo}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </li>
          <li>
            <span className="font-semibold text-foreground">2. Open an AI chat, paste it and press Send.</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {AI_SITES.map((site) => (
                <a
                  key={site.name}
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-card/60 text-sm font-semibold text-foreground hover:bg-card transition-colors"
                >
                  Open {site.name}
                </a>
              ))}
            </div>
          </li>
          <li>
            <span className="font-semibold text-foreground">3. EraseAI stops it</span> and shows what it found. Press
            Cancel and nothing is sent. Already have a tab open from before installing? Reload it first.
          </li>
        </ol>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 mb-12">
        <div className="p-5 rounded-2xl border border-border/30 bg-card/40">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            Want it fixed for you?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            EraseAI Personal ($5 a month) adds one-click Sanitize &amp; Send, attachment and screenshot scanning,
            history and the Android app.
          </p>
          <a
            href={pricingUrl}
            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            See Personal
          </a>
        </div>
        <div className="p-5 rounded-2xl border border-border/30 bg-card/40">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Smartphone className="w-5 h-5 text-primary" />
            Use AI on your phone too?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            The EraseAI app checks what you're about to send in AI apps on Android.
          </p>
          <a
            href={playStoreLink("welcome", "extension")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 text-sm font-semibold text-foreground hover:bg-card transition-colors"
          >
            Get it on Google Play
          </a>
        </div>
      </div>

      <div className="mb-12 p-5 rounded-2xl border border-border/30 bg-card/30">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-2">
          <KeyRound className="w-5 h-5 text-primary" />
          Already have Personal, or your company uses EraseAI?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sign in, then on Extension Setup click "Generate a key for the extension" (it's copied for you). Open
          EraseAI Firewall from Chrome's puzzle icon, paste the key and press Save. If your company's IT set up
          EraseAI, you don't need a key: the extension asks for your work email once.
        </p>
        <a href={accountUrl} className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
          Sign in to EraseAI
        </a>
      </div>

      <div className="p-5 rounded-2xl border border-border/30 bg-card/30 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-base font-bold text-foreground mb-2">What happens to your text</h2>
        The extension only runs on the AI sites it protects. Until you add an API key, every check runs on this device
        and nothing is sent. With a key, message text is checked by the EraseAI API over HTTPS and your scan history keeps
        the first 500 characters of each scan with keys, tokens and passwords masked. Images are always read with OCR
        inside your browser and never uploaded. Details in the{" "}
        <a href={`${BASE}privacy`} className="text-primary hover:underline">privacy policy</a>.
      </div>
    </SeoPage>
  );
}

/** Setup and survey pages are for existing users, not search results. */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
