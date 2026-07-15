import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  KeyRound,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  PartyPopper,
  Terminal,
  Book,
  AlertTriangle,
} from "lucide-react";
import type { AppView } from "@/components/AppShell";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "/api";

function CopyBlock({ code, testId }: { code: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="relative">
      <pre className="bg-black/50 border border-border/40 rounded-xl p-4 pr-12 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        data-testid={testId}
        aria-label="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ApiSetup({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planBlocked, setPlanBlocked] = useState(false);

  const createKey = async () => {
    setError(null);
    setPlanBlocked(false);
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/dev/keys`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Quick Start" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlanBlocked(res.status === 403 || res.status === 402);
        setError(d.error || t("apiSetup.keyError"));
        return;
      }
      setApiKey(d.key || d.apiKey || null);
    } catch {
      setError(t("apiSetup.keyError"));
    } finally {
      setCreating(false);
    }
  };

  const copyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {}
  };

  const keyPlaceholder = apiKey || "YOUR_API_KEY";
  const curlSnippet = `curl -X POST ${window.location.origin}${API_BASE}/dev/analyze \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${keyPlaceholder}" \\
  -d '{"text": "My email is jane@acme.com and my SSN is 123-45-6789"}'`;

  const totalSteps = 3;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-16">
      <motion.header initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
        <button
          onClick={() => onNavigate("getStarted")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          data-testid="api-setup-back"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("apiSetup.backToStart")}
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-violet-500/15 text-violet-400 p-2.5 rounded-xl border border-violet-500/30">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {t("apiSetup.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("apiSetup.subtitle")}</p>
          </div>
        </div>
      </motion.header>

      <div className="flex items-center gap-1.5 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full flex-1 transition-all ${
              i < step ? "bg-emerald-400" : i === step ? "bg-violet-400" : "bg-muted/30"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}
          className="bg-card/60 border border-border/40 rounded-2xl p-6 md:p-8"
        >
          {step === 0 && (
            <>
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">
                {t("apiSetup.stepCounter", { current: 1, total: totalSteps })}
              </p>
              <h2 className="text-xl font-bold text-foreground mb-2">{t("apiSetup.step1.title")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {t("apiSetup.step1.desc")}
              </p>

              {!apiKey ? (
                <button
                  onClick={createKey}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 font-bold text-sm hover:bg-violet-500/30 transition-all disabled:opacity-60"
                  data-testid="api-setup-create-key"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {creating ? t("apiSetup.step1.creating") : t("apiSetup.step1.createCta")}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-black/50 border border-emerald-500/30 rounded-xl p-4">
                    <code className="text-xs font-mono text-emerald-300 flex-1 break-all">{apiKey}</code>
                    <button onClick={copyKey} className="shrink-0 text-muted-foreground hover:text-foreground" data-testid="api-setup-copy-key">
                      {keyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-yellow-300/80 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{t("apiSetup.step1.saveNote")}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                  {planBlocked && (
                    <button
                      onClick={() => onNavigate("pricing")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/25 transition-all"
                    >
                      {t("apiSetup.step1.upgradeCta")}
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-5">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/40 text-violet-300 font-bold text-sm hover:bg-violet-500/25 transition-all"
                  data-testid="api-setup-next-1"
                >
                  {apiKey ? t("apiSetup.doneNext") : t("apiSetup.haveKey")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">
                {t("apiSetup.stepCounter", { current: 2, total: totalSteps })}
              </p>
              <h2 className="text-xl font-bold text-foreground mb-2">{t("apiSetup.step2.title")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {t("apiSetup.step2.desc")}
              </p>
              <CopyBlock code={curlSnippet} testId="api-setup-copy-curl" />
              <p className="text-xs text-muted-foreground mt-3">{t("apiSetup.step2.expected")}</p>
              <div className="flex items-center gap-3 pt-5">
                <button
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("apiSetup.back")}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/40 text-violet-300 font-bold text-sm hover:bg-violet-500/25 transition-all ml-auto"
                  data-testid="api-setup-next-2"
                >
                  {t("apiSetup.doneNext")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center py-4" data-testid="api-setup-done">
              <PartyPopper className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("apiSetup.done.title")}</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                {t("apiSetup.done.desc")}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => onNavigate("devMode")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-sm hover:opacity-90 transition-opacity"
                  data-testid="api-setup-done-playground"
                >
                  <Terminal className="w-4 h-4" />
                  {t("apiSetup.done.playground")}
                </button>
                <button
                  onClick={() => onNavigate("docs")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm font-semibold text-foreground hover:border-primary/40 transition-all"
                >
                  <Book className="w-4 h-4" />
                  {t("apiSetup.done.docs")}
                </button>
                <button
                  onClick={() => onNavigate("getStarted")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("apiSetup.done.backHome")}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
