import { useEffect } from "react";
import { CheckCircle2, KeyRound, MousePointerClick, ShieldCheck, UserPlus } from "lucide-react";
import { SeoPage } from "./SeoLayout";
import { useSeoMeta } from "./useSeoMeta";

const BASE = import.meta.env.BASE_URL;

/**
 * Opened by the extension right after install (extension/src/growth.js). The
 * extension protects on-device from the first prompt; this page converts that
 * into a connected account (full scanning, history, dashboard) in a minute.
 */
export default function ExtensionWelcomePage() {
  useSeoMeta({
    title: "Welcome to EraseAI Firewall — you're protected",
    description: "Create your free EraseAI account, add your API key to the extension, and start blocking secrets and personal data before they reach ChatGPT, Claude and Gemini.",
    url: "https://eraseai.ai/ai-firewall/welcome",
  });
  useNoIndex();

  // Sign-in lands on the dashboard's Extension Setup page, where one click creates a
  // key for the extension (the `view` deep link survives the auth screen).
  const accountUrl = `${BASE}?view=firewallDocs&utm_source=extension&utm_medium=welcome`;

  const steps = [
    {
      icon: UserPlus,
      title: "Create your free EraseAI account",
      body: "Sign up or sign in — the free trial includes scans so you can see it working right away.",
      action: { href: accountUrl, label: "Create account / Sign in" },
    },
    {
      icon: KeyRound,
      title: "Create a key for the extension",
      body: "After signing in you land on Extension Setup. In Installation, click \"Generate a key for the extension\" — the key is copied for you.",
    },
    {
      icon: MousePointerClick,
      title: "Paste it into the extension",
      body: "Click the puzzle icon in Chrome's toolbar, pin EraseAI Firewall, open it, paste the key and press Save. The status turns green when it's connected.",
    },
    {
      icon: ShieldCheck,
      title: "Try it",
      body: "In ChatGPT, Claude or Gemini, paste \"my AWS key is AKIAIOSFODNN7EXAMPLE\" (AWS's public example key) and press Send. EraseAI stops it and offers Sanitize & Send.",
    },
  ];

  return (
    <SeoPage>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
        <CheckCircle2 className="w-4 h-4" />
        Extension installed
      </div>
      <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-4">
        You're protected. One minute to unlock the rest.
      </h1>
      <p className="text-lg text-muted-foreground leading-relaxed mb-10">
        EraseAI Firewall is already checking your prompts on this device before they reach ChatGPT, Claude or Gemini.
        Connect a free EraseAI account for full scanning, scan history and your dashboard.
      </p>

      <ol className="space-y-4 mb-12">
        {steps.map(({ icon: Icon, title, body, action }, index) => (
          <li key={title} className="flex gap-4 p-5 rounded-2xl border border-border/30 bg-card/40">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
              {index + 1}
            </div>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Icon className="w-5 h-5 text-primary" />
                {title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
              {action && (
                <a
                  href={action.href}
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  {action.label}
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

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
