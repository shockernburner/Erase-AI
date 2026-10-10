import { Shield, ArrowRight, MessageCircle, Mail, Chromium } from "lucide-react";
import { chromeStoreLink } from "@/lib/extensionStore";
import { playStoreLink } from "@/lib/installTarget";
import { BrandLogo } from "@/components/BrandLogo";

const BASE = import.meta.env.BASE_URL;

export function SeoNav() {
  return (
    <header className="border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <a href={BASE} className="flex items-center gap-3 group">
          <BrandLogo className="h-10 w-10" />
          <span className="text-xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            EraseAI
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href={`${BASE}ai-firewall`} className="hover:text-primary transition-colors">AI Firewall</a>
          <a href={`${BASE}learn`} className="hover:text-primary transition-colors">Learn</a>
          <a
            href={chromeStoreLink("seo-nav")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Chrome Extension
          </a>
          <a
            href={playStoreLink("seo-nav")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Android App
          </a>
          <a href={`${BASE}learn/ai-data-loss-prevention`} className="hover:text-primary transition-colors">AI DLP</a>
          <a href={`${BASE}blog`} className="hover:text-primary transition-colors">Blog</a>
        </nav>
        <a
          href={BASE}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all"
        >
          Try EraseAI
        </a>
      </div>
    </header>
  );
}

export function SeoFooter() {
  return (
    <footer className="border-t border-border/30 mt-20 py-12 bg-background/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BrandLogo className="h-6 w-6 rounded-md" />
              <span className="text-lg font-display font-bold text-foreground">EraseAI</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI firewall to prevent data leaks and protect prompts in AI tools like ChatGPT, Gemini, and Claude.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href={`${BASE}learn`} className="hover:text-primary transition-colors">AI Data Security Guides</a></li>
              <li><a href={`${BASE}learn/ai-data-loss-prevention`} className="hover:text-primary transition-colors">AI Data Loss Prevention</a></li>
              <li><a href={`${BASE}learn/llm-data-security`} className="hover:text-primary transition-colors">LLM Data Security</a></li>
              <li><a href={`${BASE}learn/shadow-ai`} className="hover:text-primary transition-colors">Shadow AI</a></li>
              <li><a href={`${BASE}learn/ai-security-glossary`} className="hover:text-primary transition-colors">AI Security Glossary</a></li>
              <li><a href={`${BASE}ai-firewall`} className="hover:text-primary transition-colors">AI Firewall</a></li>
              <li><a href={`${BASE}chatgpt-data-leak`} className="hover:text-primary transition-colors">Prevent ChatGPT Data Leaks</a></li>
              <li><a href={`${BASE}ai-prompt-security`} className="hover:text-primary transition-colors">AI Prompt Security</a></li>
              <li><a href={`${BASE}api-key-protection-ai`} className="hover:text-primary transition-colors">API Key Protection</a></li>
              <li><a href={playStoreLink("seo-footer")} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Android App</a></li>
              <li><a href={`${BASE}developer-api`} className="hover:text-primary transition-colors">Developer API</a></li>
              <li><a href={`${BASE}blog`} className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href={`${BASE}terms`} className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href={`${BASE}license`} className="hover:text-primary transition-colors">License Agreement</a></li>
              <li><a href={`${BASE}privacy`} className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href={`${BASE}contact`} className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Contact</h4>
            <div className="space-y-3">
              <a
                href="https://wa.me/6582430739"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-400 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-green-500" />
                +65 8243 0739
              </a>
              <a
                href="mailto:director@vantward.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4 text-primary" />
                director@vantward.com
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border/20 pt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} EraseAI &mdash; A product of{" "}
            <a href="https://vantward.com/" className="underline-offset-2 hover:underline hover:text-foreground">Vantward Solutions Pte. Ltd.</a> | 68 Circular Road #02-01, Singapore 049422 | Reg. No. 202606980C
          </p>
        </div>
      </div>
    </footer>
  );
}

export function CtaButton({ text = "Try EraseAI" }: { text?: string }) {
  return (
    <a
      href={BASE}
      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 transition-all"
    >
      {text}
      <ArrowRight className="w-4 h-4" />
    </a>
  );
}

/** "Add to Chrome" call to action; [placement] tags the click for install attribution. */
export function AddToChromeButton({ placement, text = "Add to Chrome — it's free" }: { placement: string; text?: string }) {
  return (
    <a
      href={chromeStoreLink(placement)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 transition-all"
    >
      <Chromium className="w-5 h-5" />
      {text}
    </a>
  );
}

/** Quiet text link to the Android app, shown beside the Chrome button; [placement] tags the click. */
export function GetAndroidLink({ placement }: { placement: string }) {
  return (
    <a
      href={playStoreLink(placement)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      Or get the Android app
    </a>
  );
}

export function RelatedLinks({ exclude }: { exclude?: string }) {
  const links = [
    { href: "learn", label: "AI Data Security Guides" },
    { href: "learn/ai-data-loss-prevention", label: "AI Data Loss Prevention" },
    { href: "ai-firewall", label: "AI Firewall" },
    { href: "chatgpt-data-leak", label: "Prevent ChatGPT Data Leaks" },
    { href: "ai-prompt-security", label: "AI Prompt Security" },
    { href: "api-key-protection-ai", label: "API Key Protection" },
    { href: "developer-api", label: "Developer API" },
    { href: "blog", label: "Blog" },
  ].filter((l) => l.href !== exclude);

  return (
    <div className="mt-16 pt-10 border-t border-border/20">
      <h3 className="text-lg font-bold text-foreground mb-4">Related Resources</h3>
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={`${BASE}${link.href}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border/30 bg-card/40 text-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function SeoPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoNav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {children}
      </main>
      <SeoFooter />
    </div>
  );
}
