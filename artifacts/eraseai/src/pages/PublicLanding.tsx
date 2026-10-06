import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Code2,
  FileText,
  Globe,
  KeyRound,
  Landmark,
  Menu,
  MessageCircle,
  Search,
  Shield,
  Smartphone,
  Mail,
  LogIn,
  ScanSearch,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { PlanFeatureSections } from "@/components/PlanFeatureSections";
import { PRICING_COMPARISON, PRICING_TIERS, TEAM_REASONS, annualPriceFor } from "@/lib/pricingPlans";
import { LanguageSelector } from "@/components/LanguageSelector";
import AuthForm from "@/components/AuthForm";
import { useSeoMeta } from "@/pages/seo/useSeoMeta";
import { chromeStoreLink } from "@/lib/extensionStore";
import { detectInstallTarget, installCtas, playStoreLink } from "@/lib/installTarget";
import { ORG_COVERAGE_STEPS, peekPricingFocus, setPricingFocus } from "@/lib/products";
import type { PricingTierId } from "@/lib/pricingPlans";
import { BrandLogo } from "@/components/BrandLogo";

type PreviewMode = "developer" | "enterprise" | "personal" | null;

export default function PublicLanding({ onPreview }: { onPreview: (mode: PreviewMode) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Plan picked before signing up; after sign-up the app opens pricing on it.
  const [chosenPlan, setChosenPlan] = useState<PricingTierId | null>(() => peekPricingFocus());

  // eraseai.ai/pricing (e.g. the extension's upgrade link) lands on pricing.
  useEffect(() => {
    if (/\/pricing\/?$/.test(window.location.pathname)) {
      setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  }, []);

  useSeoMeta({
    title: "EraseAI — AI Firewall for ChatGPT, Claude, Gemini & LLM Apps",
    description:
      "EraseAI scans prompts, files, and AI responses to stop PII, API keys, bank data, client records, and confidential information from leaking into AI tools.",
    url: "https://eraseai.ai",
    keywords:
      "AI firewall, ChatGPT data leak prevention, Claude privacy, Gemini privacy, LLM security, prompt scanning, PII detection, API key detection, AI DLP, AI privacy tool",
  });

  const baseUrl = import.meta.env.BASE_URL;
  // The hero leads with what this device can install: the app on Android, the extension elsewhere.
  const [installTarget] = useState(detectInstallTarget);
  const heroCtas = installCtas(installTarget, "landing-hero");

  const navItems = [
    { label: "Product", href: "#product" },
    { label: "Use Cases", href: "#use-cases" },
    { label: "Pricing", href: "#pricing" },
    { label: "Docs", href: "#developer-api" },
    { label: "Sign In", href: "#auth-section" },
  ];

  const protectedItems = [
    {
      title: "PII",
      description: "Names, emails, phone numbers, addresses, IDs.",
      icon: <UserRound className="w-5 h-5" />,
    },
    {
      title: "API Keys & Secrets",
      description: "Tokens, credentials, private keys, service keys.",
      icon: <KeyRound className="w-5 h-5" />,
    },
    {
      title: "Financial Data",
      description: "Bank details, card numbers, payment references.",
      icon: <Landmark className="w-5 h-5" />,
    },
    {
      title: "Client Data",
      description: "Customer records, contracts, private notes.",
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Internal Documents",
      description: "Confidential plans, reports, strategy, HR, legal, and operational documents.",
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  const howItWorks = [
    {
      title: "Scan",
      description: "EraseAI checks prompts, files, and responses before sensitive data leaves the browser or app.",
      icon: <ScanSearch className="w-5 h-5" />,
    },
    {
      title: "Detect",
      description: "It identifies PII, secrets, bank data, client records, and confidential content.",
      icon: <Search className="w-5 h-5" />,
    },
    {
      title: "Redact or Block",
      description: "Users can send a safe redacted version, get a warning, or block the request.",
      icon: <TriangleAlert className="w-5 h-5" />,
    },
  ];

  const modes = [
    {
      title: "Chrome extension",
      description: "Checks every message and attachment before it reaches ChatGPT, Claude or Gemini. Free on your device, no limit.",
      cta: "Add to Chrome",
      icon: <Shield className="w-6 h-6" />,
      action: () => window.open(chromeStoreLink("landing-modes"), "_blank", "noopener,noreferrer"),
    },
    {
      title: "Android app",
      description: "Checks what you're about to send in AI apps on your phone. 7-day free trial; included in every paid plan.",
      cta: "Get it on Google Play",
      icon: <Smartphone className="w-6 h-6" />,
      action: () => window.open(playStoreLink("landing-modes"), "_blank", "noopener,noreferrer"),
    },
    {
      title: "Firewall for teams and enterprise",
      description: "Your organization pays; every member is covered on Chrome and Android by signing in with their work email.",
      cta: "See Team and Enterprise",
      icon: <Building2 className="w-6 h-6" />,
      action: () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      title: "API for your apps",
      description: "Scan AI inputs and outputs in your own product, scripts and pipelines before or after LLM calls.",
      cta: "Get an API key",
      icon: <Code2 className="w-6 h-6" />,
      action: () => {
        setPricingFocus("pro");
        setChosenPlan("pro");
        scrollToSignUp();
      },
    },
  ];


  const contactSales = () => {
    window.location.href = `${baseUrl}contact`;
  };
  const scrollToSignUp = () => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" });
  const pricingPlans = PRICING_TIERS.map((tier) => ({
    ...tier,
    price: tier.monthlyPrice < 0 ? "Contact us for pricing" : `$${tier.monthlyPrice}`,
    priceUnit: tier.monthlyPrice > 0 ? (tier.perPerson ? "/person/month" : "/month") : "",
    // Enterprise talks to us first; everyone else (Team included) signs up and
    // buys from the in-app pricing page.
    action:
      tier.id === "enterprise"
        ? contactSales
        : () => {
            if (tier.id !== "free") {
              setPricingFocus(tier.id);
              setChosenPlan(tier.id);
            }
            scrollToSignUp();
          },
  }));
  const comparisonRows = PRICING_COMPARISON;

  const faqs = [
    {
      question: "Does EraseAI replace ChatGPT, Claude, or Gemini?",
      answer: "No. EraseAI sits in front of AI tools and LLM apps so you can scan content, redact before sending, or block risky requests.",
    },
    {
      question: "What kinds of data can EraseAI detect?",
      answer: "It focuses on AI data leak prevention for PII, API keys, bank data, client records, and confidential internal documents.",
    },
    {
      question: "Can developers use EraseAI outside the browser?",
      answer: "Yes. The Developer API supports prompt scanning and response scanning before or after your LLM calls.",
    },
    {
      question: "Where do advanced governance features fit?",
      answer: "Data removal, governance workflows, version history, and machine unlearning support are positioned for enterprise teams that need deeper controls.",
    },
  ];

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const handleDeveloperPreview = () => {
    onPreview("developer");
  };

  return (
    <div className="min-h-screen w-full relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="sticky top-0 z-40 border-b border-border/30 bg-background/80 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-10" />
              <div>
                <p className="text-lg font-display font-bold tracking-tight text-foreground">EraseAI</p>
                <p className="text-[11px] uppercase tracking-[0.28em] text-primary/80">AI Firewall</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 lg:flex">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollTo(item.href)}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
                <Globe className="w-3.5 h-3.5 text-primary" />
                Protect ChatGPT, Claude, Gemini, and LLM apps
              </div>
              <LanguageSelector />
            </div>

            <div className="flex items-center gap-3 lg:hidden">
              <LanguageSelector />
              <button
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="rounded-full border border-border/50 bg-card/50 p-2 text-foreground"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-border/30 bg-background/95 px-4 py-4 lg:hidden">
              <div className="mx-auto flex max-w-7xl flex-col gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => scrollTo(item.href)}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-left text-sm font-medium text-foreground"
                  >
                    {item.label}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.header>

        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">
          <section id="product" className="mb-24 scroll-mt-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[32px] border border-border/40 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.18),_transparent_40%),linear-gradient(180deg,rgba(10,14,20,0.95),rgba(10,14,20,0.78))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-10 lg:p-14"
            >
              <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                    <Shield className="w-4 h-4" />
                    AI data leak prevention
                  </div>
                  <h1 className="max-w-3xl text-4xl font-display font-extrabold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                    Stop private data from leaking into AI.
                  </h1>
                  <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                    EraseAI scans prompts, files, and AI responses before they reach ChatGPT, Claude, Gemini, or your own LLM app. It detects PII, bank details, API keys, client data, and confidential text — then redacts, blocks, or warns before damage happens.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={heroCtas.primary.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
                    >
                      {heroCtas.primary.label}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href={heroCtas.secondary.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-border/50 bg-card/40 px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-card/70"
                    >
                      {heroCtas.secondary.label}
                    </a>
                  </div>
                  {installTarget === "other-mobile" && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      There's no iPhone app yet. Open eraseai.ai on your computer to add EraseAI to Chrome.
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {[
                      "PII",
                      "API Keys",
                      "Bank Data",
                      "Client Records",
                      "Internal Documents",
                    ].map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-border/50 bg-background/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-primary/20 bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="rounded-3xl border border-border/40 bg-card/70 p-5">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">AI firewall in front of every request</p>
                        <p className="mt-1 text-sm text-muted-foreground">Stop secrets before they reach AI with prompt scanning, risk detection, and redact before sending controls.</p>
                      </div>
                      <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Active
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/40 bg-background/60 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Before sending</p>
                        <p className="mt-3 text-sm font-medium text-foreground">Scan prompts, files, and responses in the browser or your app.</p>
                      </div>
                      <div className="rounded-2xl border border-border/40 bg-background/60 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Decision</p>
                        <p className="mt-3 text-sm font-medium text-foreground">Redact private content, warn users, or block the request entirely.</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Supported surfaces</p>
                      <p className="mt-2 text-sm text-foreground">ChatGPT, Claude, Gemini, browser-based AI tools, and custom LLM apps through the EraseAI Developer API.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          <section id="use-cases" className="mb-24 scroll-mt-28">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">What EraseAI protects</p>
              <h2 className="mt-3 text-3xl font-display font-bold text-foreground">Protect the data AI tools should never keep.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">EraseAI is the safety layer between private data and AI tools. Use it for AI firewall controls, prompt scanning, and leak prevention across everyday chats and production apps.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {protectedItems.map((item) => (
                <div key={item.title} className="rounded-3xl border border-border/40 bg-card/50 p-5 backdrop-blur-sm">
                  <div className="mb-4 inline-flex rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-24">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">How it works</p>
              <h2 className="mt-3 text-3xl font-display font-bold text-foreground">Three steps to AI data leak prevention.</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {howItWorks.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-border/40 bg-card/50 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                      {step.icon}
                    </div>
                    <span className="text-sm font-semibold text-primary">0{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-24">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Choose your mode</p>
              <h2 className="mt-3 text-3xl font-display font-bold text-foreground">One AI firewall, wherever your people use AI.</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {modes.map((mode) => (
                <div key={mode.title} className="flex h-full flex-col rounded-3xl border border-border/40 bg-card/50 p-6">
                  <div className="mb-4 inline-flex w-fit rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    {mode.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{mode.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{mode.description}</p>
                  <button
                    onClick={mode.action}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
                  >
                    {mode.cta}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section id="pricing" className="mb-24 scroll-mt-28">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Pricing</p>
              <h2 className="mt-3 text-3xl font-display font-bold text-foreground">Simple pricing for AI firewall protection.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">Free to start. Personal and Developer are for people paying for themselves. When your organization pays (Team or Enterprise), every member gets the Chrome extension and the Android app with full protection by signing in with their work email, and pays nothing.</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-5">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex h-full flex-col rounded-3xl border p-6 ${plan.highlight ? "border-primary/40 bg-primary/5 shadow-[0_0_35px_rgba(6,182,212,0.12)]" : "border-border/40 bg-card/50"}`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                    {plan.highlight && <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Popular</span>}
                  </div>
                  <p className={`font-display font-bold text-foreground ${plan.monthlyPrice < 0 ? "text-2xl" : "text-3xl"}`}>
                    {plan.price}
                    {plan.priceUnit && <span className="ml-1 text-sm font-normal text-muted-foreground">{plan.priceUnit}</span>}
                  </p>
                  {plan.monthlyPrice > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.annualMonthlyPrice != null
                        ? `or $${plan.annualMonthlyPrice}/person/month billed yearly`
                        : `or $${annualPriceFor(plan.monthlyPrice)}/year (save 10%)`}
                    </p>
                  )}
                  {plan.seats && <p className="mt-1 text-xs font-semibold text-foreground/80">{plan.seats}</p>}
                  <p className="mt-2 text-sm font-medium text-primary">{plan.description}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{plan.paidBy}</p>
                  <PlanFeatureSections tier={plan} className="mt-5 flex-1" />
                  <button
                    onClick={plan.action}
                    className={`mt-6 rounded-full px-5 py-3 text-sm font-bold transition-all ${plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border/50 bg-card/60 text-foreground hover:bg-card"}`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <h3 className="text-xl font-semibold text-foreground">How Team and Enterprise work</h3>
              <ol className="mt-4 grid gap-3 md:grid-cols-3">
                {ORG_COVERAGE_STEPS.map((step, i) => (
                  <li key={step} className="flex gap-3 rounded-2xl border border-border/40 bg-card/50 p-4 text-sm text-foreground/90">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-10 rounded-3xl border border-primary/30 bg-primary/5 p-6">
              <h3 className="text-xl font-semibold text-foreground">Why Team instead of a Personal plan for each person?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ten Personal plans cost $50 a month and protect each person just as well. Team ($9 a person) is what your organization pays for control and proof:
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-5">
                {TEAM_REASONS.map((reason) => (
                  <div key={reason.title} className="rounded-2xl border border-border/40 bg-card/50 p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {reason.title}
                      {reason.soon && (
                        <span className="ml-1.5 whitespace-nowrap rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                          Coming soon
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{reason.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 overflow-x-auto rounded-3xl border border-border/40 bg-card/50">
              <div className="min-w-[820px]">
              <div className="grid grid-cols-6 border-b border-border/40 bg-background/60 text-sm font-semibold text-foreground">
                <div className="px-4 py-4">Compare</div>
                <div className="px-4 py-4">Free</div>
                <div className="px-4 py-4">Personal</div>
                <div className="px-4 py-4">Developer</div>
                <div className="px-4 py-4">Team</div>
                <div className="px-4 py-4">Enterprise</div>
              </div>
              {comparisonRows.map((row) => (
                <div key={row[0]} className="grid grid-cols-6 border-b border-border/30 last:border-b-0 text-sm">
                  {row.map((cell, index) => (
                    <div key={`${row[0]}-${index}`} className={`px-4 py-4 ${index === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {cell}
                    </div>
                  ))}
                </div>
              ))}
              </div>
            </div>
          </section>

          <section id="developer-api" className="mb-24 scroll-mt-28">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Developer API</p>
                <h2 className="mt-3 text-3xl font-display font-bold text-foreground">Prompt scanning for builders who need control.</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">Use the EraseAI Developer API for AI firewall workflows in your own product. Scan inputs before an LLM call, inspect outputs afterward, and stop secrets before they reach AI.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    Get API Key
                  </button>
                  <button
                    onClick={handleDeveloperPreview}
                    className="rounded-full border border-border/50 bg-card/60 px-5 py-3 text-sm font-semibold text-foreground hover:bg-card"
                  >
                    See Developer Preview
                  </button>
                </div>
                <div className="mt-6 rounded-3xl border border-border/40 bg-card/50 p-5">
                  <p className="text-sm font-semibold text-foreground">Static demo</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">This front-end demo is illustrative. It shows how prompt scanning and redact before sending works without faking a live backend response.</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-border/40 bg-card/50 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Input example</p>
                  <div className="mt-3 rounded-2xl border border-border/40 bg-background/70 p-4 text-sm leading-7 text-foreground">
                    “Send this to ChatGPT: My client John Rahman’s phone is +8801712345678 and the Stripe key is sk_live_xxxxx.”
                  </div>
                </div>
                <div className="rounded-3xl border border-border/40 bg-card/50 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Detected risks</p>
                  <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><TriangleAlert className="w-4 h-4 text-amber-400" />Person name</li>
                    <li className="flex items-center gap-2"><TriangleAlert className="w-4 h-4 text-amber-400" />Phone number</li>
                    <li className="flex items-center gap-2"><TriangleAlert className="w-4 h-4 text-amber-400" />API key</li>
                  </ul>
                </div>
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Safe output</p>
                  <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-background/70 p-4 text-sm leading-7 text-foreground">
                    “Send this to ChatGPT: My client [NAME]’s phone is [PHONE] and the Stripe key is [API_KEY].”
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-24">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">For organizations</p>
                <h2 className="mt-3 text-3xl font-display font-bold text-foreground">Your organization pays; your people are covered on Chrome and Android.</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">Buy Team seats online (3 to 10 people) or talk to us about Enterprise. Owners invite people by email and see what was caught, by person. Members install the extension and the app and sign in with their work email. Company rules, audit export and IT rollout are on the way.</p>
              </div>
              <div className="rounded-3xl border border-border/40 bg-card/50 p-6">
                <h3 className="text-lg font-semibold text-foreground">Data Removal & Governance</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">For enterprise teams that need dataset governance, deletion workflows, version history, audit trails, and advanced machine unlearning support.</p>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-primary" />Admin dashboard by person; company rules and audit export coming soon</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-primary" />Private deployment, data residency and an SLA</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 w-4 h-4 text-primary" />Dataset governance, deletion workflows, and enterprise support</li>
                </ul>
                <button
                  onClick={() => {
                    window.location.href = `${baseUrl}contact`;
                  }}
                  className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Contact us for pricing
                </button>
              </div>
            </div>
          </section>

          <section id="faq" className="mb-20 scroll-mt-28">
            <div className="mb-8 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">FAQ</p>
              <h2 className="mt-3 text-3xl font-display font-bold text-foreground">Short answers for buyers evaluating EraseAI.</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-3xl border border-border/40 bg-card/50 p-6">
                  <h3 className="text-lg font-semibold text-foreground">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="auth-section" className="mb-20 scroll-mt-28">
            <div className="mx-auto max-w-md rounded-[32px] border border-border/40 bg-card/50 p-8 backdrop-blur-sm">
              <div className="mb-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Sign In</p>
                <h2 className="mt-3 text-2xl font-display font-bold text-foreground">Start protecting AI prompts and files.</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">Use the browser firewall, try prompt scanning, or get your API key from the same account.</p>
              </div>
              {chosenPlan ? (
                <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-xs font-semibold text-primary">
                  You picked {({ personal: "Personal", pro: "API for your apps (Developer)", business: "Team", enterprise: "Enterprise", free: "Free" } as const)[chosenPlan]}. Create your account (or log in) and we'll take you to checkout.
                </div>
              ) : (
                <div className="mb-5 flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                  <LogIn className="w-3.5 h-3.5" />
                  Start free trial — 7 days, no credit card
                </div>
              )}
              <AuthForm />
              <p className="mt-5 text-center text-xs text-muted-foreground/60">© 2026 EraseAI — AI firewall and AI data leak prevention for teams using modern LLM tools.</p>
            </div>
          </section>
        </main>

        <footer className="border-t border-border/30 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_repeat(3,0.8fr)] lg:px-8">
            <div>
              <div className="flex items-center gap-3">
                <BrandLogo className="h-10 w-10" />
                <div>
                  <p className="text-lg font-display font-bold text-foreground">EraseAI</p>
                  <p className="text-sm text-muted-foreground">AI firewall for ChatGPT, Claude, Gemini, and LLM apps.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                <a href="https://wa.me/6582430739" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  +65 8243 0739
                </a>
                <a href="mailto:director@vantward.com" className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  director@vantward.com
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Product</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <button onClick={() => scrollTo("#product")} className="block hover:text-foreground">Browser Firewall</button>
                <button onClick={() => scrollTo("#developer-api")} className="block hover:text-foreground">Developer API</button>
                <button onClick={() => scrollTo("#pricing")} className="block hover:text-foreground">Team and Enterprise</button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Resources</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <button onClick={() => scrollTo("#developer-api")} className="block hover:text-foreground">Docs</button>
                <button onClick={() => scrollTo("#pricing")} className="block hover:text-foreground">Pricing</button>
                <button onClick={() => scrollTo("#use-cases")} className="block hover:text-foreground">Use Cases</button>
                <button onClick={() => scrollTo("#faq")} className="block hover:text-foreground">FAQ</button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Company</h3>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <button onClick={() => scrollTo("#product")} className="block hover:text-foreground">About</button>
                <a href={`${baseUrl}contact`} className="block hover:text-foreground">Contact</a>
                <a href={`${baseUrl}privacy`} className="block hover:text-foreground">Privacy Policy</a>
                <a href={`${baseUrl}terms`} className="block hover:text-foreground">Terms</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
