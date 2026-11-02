import { Shield, AlertTriangle, Eye, Lock, Zap, CheckCircle2 } from "lucide-react";
import { SeoPage, CtaButton, RelatedLinks, AddToChromeButton, GetAndroidLink } from "./SeoLayout";
import { usePageMeta } from "./useSeoMeta";

export default function AiFirewallPage() {
  usePageMeta("/ai-firewall");

  return (
    <SeoPage>
      <article className="prose-invert max-w-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
          <Shield className="w-4 h-4" />
          AI Firewall
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-6">
          AI Firewall — The Missing Layer in AI Usage
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          Every time you use ChatGPT, Gemini, or Claude, you are sending data outside your control. That data may include sensitive information that, once sent, can never be retrieved or controlled.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-12">
          <AddToChromeButton placement="ai-firewall-hero" />
          <GetAndroidLink placement="ai-firewall-hero" />
          <span className="text-sm text-muted-foreground">Works in ChatGPT, Claude, Gemini and Replit.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {[
            { icon: AlertTriangle, text: "API keys and secrets" },
            { icon: AlertTriangle, text: "Internal code and logic" },
            { icon: AlertTriangle, text: "Personal information" },
            { icon: AlertTriangle, text: "Proprietary business logic" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
              <Icon className="w-5 h-5 text-destructive shrink-0" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          What is an AI Firewall?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          An AI firewall sits between you and AI tools, analyzing your input before it is sent. It acts as an intelligent security layer that understands the context of what you're sharing and prevents sensitive data from leaving your environment.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-8">
          EraseAI acts as a real-time AI firewall that:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {[
            { icon: Eye, text: "Detects sensitive data in real-time" },
            { icon: Zap, text: "Warns users instantly before sending" },
            { icon: Lock, text: "Blocks risky prompts automatically" },
            { icon: CheckCircle2, text: "Suggests safer alternatives" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          Why You Need It
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          AI tools are powerful — but they were never designed to protect your data. Large language models ingest everything you give them, and there is no guarantee of data deletion, privacy, or security once information is submitted.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          EraseAI ensures you can use AI safely without compromising security. Whether you're a developer debugging code, a business analyst sharing reports, or a student working on research — EraseAI checks your data before it ever reaches the AI tool.
        </p>

        <div className="text-center py-10 rounded-2xl border border-primary/20 bg-primary/5 mb-8">
          <h3 className="text-xl font-bold text-foreground mb-3">Test your prompt before sending</h3>
          <p className="text-muted-foreground mb-6">See what EraseAI detects in your input.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <AddToChromeButton placement="ai-firewall-bottom" />
            <GetAndroidLink placement="ai-firewall-bottom" />
            <CtaButton text="Try EraseAI Free" />
          </div>
        </div>

        <RelatedLinks exclude="ai-firewall" />
      </article>
    </SeoPage>
  );
}
