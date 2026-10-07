import { AlertTriangle, Shield, Eye, Lock, CheckCircle2 } from "lucide-react";
import { SeoPage, CtaButton, RelatedLinks } from "./SeoLayout";
import { usePageMeta } from "./useSeoMeta";

export default function ChatgptDataLeakPage() {
  usePageMeta("/chatgpt-data-leak");

  return (
    <SeoPage>
      <article className="prose-invert max-w-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-6">
          <AlertTriangle className="w-4 h-4" />
          Data Leak Prevention
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-6">
          You Might Be Leaking Data to ChatGPT Without Realizing
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          Developers and users often paste sensitive information into ChatGPT without thinking twice. What seems like a simple question can expose critical data to systems you don't control.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-8">
          Common data that gets leaked:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[
            "API keys and authentication tokens",
            "Database credentials and connection strings",
            "Private datasets and customer information",
            "Internal business logic and proprietary code",
          ].map((text) => (
            <div key={text} className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          The Real Risks
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Once your data is sent to an AI service, it enters a system you have no control over. This creates serious risks:
        </p>
        <ul className="space-y-3 mb-10">
          {[
            "Data exposure — your information may be stored, logged, or used to train future models",
            "Security vulnerabilities — leaked credentials can be exploited by malicious actors",
            "Loss of intellectual property — proprietary algorithms and business logic become compromised",
            "Compliance violations — sharing personal data may violate GDPR, CCPA, or other regulations",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3 text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-1" />
              <span className="text-sm">{text}</span>
            </li>
          ))}
        </ul>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          How to Prevent Data Leaks
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Follow these best practices to protect yourself when using AI tools:
        </p>
        <div className="space-y-4 mb-10">
          {[
            { num: "1", text: "Never paste raw secrets, API keys, or tokens into any AI tool" },
            { num: "2", text: "Avoid sharing production code with real credentials embedded" },
            { num: "3", text: "Mask sensitive data before copying — replace real values with placeholders" },
            { num: "4", text: "Use a protection layer like EraseAI to scan your prompts automatically" },
          ].map(({ num, text }) => (
            <div key={num} className="flex items-start gap-4 p-4 rounded-xl border border-border/30 bg-card/40">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {num}
              </div>
              <span className="text-sm text-foreground font-medium pt-1">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          The Solution
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-8">
          EraseAI automatically scans your input before it reaches ChatGPT, Gemini, Claude, or any other AI tool. It works in real-time to keep your data safe.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Eye, text: "Detects sensitive patterns" },
            { icon: Shield, text: "Flags risky content" },
            { icon: Lock, text: "Prevents accidental leaks" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-3 p-6 rounded-xl border border-primary/20 bg-primary/5 text-center">
              <Icon className="w-8 h-8 text-primary" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <div className="text-center py-10 rounded-2xl border border-primary/20 bg-primary/5 mb-8">
          <h3 className="text-xl font-bold text-foreground mb-3">Start Protecting Your Data</h3>
          <p className="text-muted-foreground mb-6">Use EraseAI before every AI interaction.</p>
          <CtaButton />
        </div>

        <RelatedLinks exclude="chatgpt-data-leak" />
      </article>
    </SeoPage>
  );
}
