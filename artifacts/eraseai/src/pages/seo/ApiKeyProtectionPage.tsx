import { Shield, Key, AlertTriangle, Lock, CheckCircle2 } from "lucide-react";
import { SeoPage, CtaButton, RelatedLinks } from "./SeoLayout";
import { usePageMeta } from "./useSeoMeta";

export default function ApiKeyProtectionPage() {
  usePageMeta("/api-key-protection-ai");

  return (
    <SeoPage>
      <article className="prose-invert max-w-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-sm font-semibold mb-6">
          <Key className="w-4 h-4" />
          API Key Protection
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-6">
          Never Paste API Keys into AI Tools
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          One of the most common and dangerous mistakes developers make: pasting API keys, tokens, and credentials directly into ChatGPT, Gemini, or other AI tools.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-8">
          It happens more often than you think. A developer is debugging an API error, copies the full request including headers and authentication tokens, and pastes it into ChatGPT for help. In that instant, the API key is exposed to a third-party system.
        </p>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          The Consequences
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: AlertTriangle, text: "Unauthorized access to your systems" },
            { icon: AlertTriangle, text: "Financial loss from misused API credits" },
            { icon: AlertTriangle, text: "Security breaches and data exposure" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-3 p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
              <Icon className="w-8 h-8 text-destructive" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          How to Protect API Keys
        </h2>
        <div className="space-y-4 mb-12">
          {[
            { icon: Lock, text: "Never expose raw keys — use environment variables and secret managers" },
            { icon: Shield, text: "Use environment variables — keep secrets out of your codebase" },
            { icon: Key, text: "Rotate compromised keys immediately — act fast when a leak is detected" },
            { icon: CheckCircle2, text: "Use detection tools — automate protection with EraseAI" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-4 p-4 rounded-xl border border-border/30 bg-card/40">
              <Icon className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          EraseAI Protection
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          EraseAI detects API key patterns instantly and warns you before sending. It recognizes common key formats from AWS, Google Cloud, OpenAI, Stripe, and dozens of other services.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          It acts as a safety net to prevent costly mistakes. Even if you accidentally include a key in your prompt, EraseAI catches it before it's too late.
        </p>

        <div className="text-center py-10 rounded-2xl border border-primary/20 bg-primary/5 mb-8">
          <h3 className="text-xl font-bold text-foreground mb-3">Stay Safe</h3>
          <p className="text-muted-foreground mb-6">Protect your keys before it's too late.</p>
          <CtaButton />
        </div>

        <RelatedLinks exclude="api-key-protection-ai" />
      </article>
    </SeoPage>
  );
}
