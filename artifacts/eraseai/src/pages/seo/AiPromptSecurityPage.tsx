import { Shield, Lock, Eye, Zap, AlertTriangle } from "lucide-react";
import { SeoPage, CtaButton, RelatedLinks } from "./SeoLayout";
import { useSeoMeta } from "./useSeoMeta";

export default function AiPromptSecurityPage() {
  useSeoMeta({
    title: "AI Prompt Security — Protect What You Send to AI | EraseAI",
    description: "Prompt security ensures your input is safe before it is sent to AI tools. EraseAI provides real-time prompt scanning, risk scoring, and actionable suggestions.",
    url: "https://eraseai.ai/ai-prompt-security",
  });

  return (
    <SeoPage>
      <article className="prose-invert max-w-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
          <Lock className="w-4 h-4" />
          Prompt Security
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight mb-6">
          AI Prompt Security is Now Critical
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
          Every prompt you send to an AI tool becomes part of a system you do not control. Without prompt security, you risk exposing confidential data, leaking sensitive information, and damaging your reputation.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-8">
          The rise of AI has created an entirely new attack surface. Organizations and individuals are sharing more data with AI tools than ever before — often without realizing the implications.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: AlertTriangle, text: "Exposing confidential data", color: "destructive" },
            { icon: AlertTriangle, text: "Leaking sensitive information", color: "destructive" },
            { icon: AlertTriangle, text: "Damaging your reputation", color: "destructive" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-3 p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
              <Icon className="w-8 h-8 text-destructive" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          What is Prompt Security?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Prompt security ensures that your input is safe before it is sent to any AI tool. It's a proactive approach to data protection that works in real-time, analyzing every character you type before it leaves your environment.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-8">
          EraseAI provides comprehensive prompt security:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Eye, text: "Real-time prompt scanning" },
            { icon: Zap, text: "Intelligent risk scoring" },
            { icon: Shield, text: "Actionable suggestions" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-3 p-6 rounded-xl border border-primary/20 bg-primary/5 text-center">
              <Icon className="w-8 h-8 text-primary" />
              <span className="text-sm text-foreground font-medium">{text}</span>
            </div>
          ))}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
          Secure Your Prompts
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Before you send anything to AI:
        </p>
        <div className="flex flex-wrap gap-4 mb-10">
          {["Scan it", "Check it", "Protect it"].map((text) => (
            <div key={text} className="px-6 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary font-bold text-lg">
              {text}.
            </div>
          ))}
        </div>

        <p className="text-muted-foreground leading-relaxed mb-10">
          EraseAI makes this process effortless. It integrates directly into your workflow, scanning prompts in real-time and alerting you before any sensitive data is transmitted. No manual review needed — EraseAI does the work for you.
        </p>

        <div className="text-center py-10 rounded-2xl border border-primary/20 bg-primary/5 mb-8">
          <h3 className="text-xl font-bold text-foreground mb-3">Protect Every Prompt</h3>
          <p className="text-muted-foreground mb-6">Start scanning your AI inputs today.</p>
          <CtaButton text="Use EraseAI" />
        </div>

        <RelatedLinks exclude="ai-prompt-security" />
      </article>
    </SeoPage>
  );
}
