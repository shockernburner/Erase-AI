import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Download,
  Chrome,
  Globe,
  Flame,
  Compass,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  PartyPopper,
  AlertTriangle,
  ExternalLink,
  FolderOpen,
  Pin,
} from "lucide-react";
import type { AppView } from "@/components/AppShell";

const BASE = import.meta.env.BASE_URL;

type Browser = "chrome" | "edge" | "firefox" | "safari";

interface ExtensionMeta {
  version: string;
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 border border-border/40 font-mono text-sm text-primary hover:border-primary/50 transition-all"
      data-testid={`copy-address-${address.replace(/[^a-z]/gi, "")}`}
    >
      {address}
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}

// Stylized browser-window illustration. `highlight` controls which region
// gets the attention ring so each step can point at the right UI element.
function BrowserIllustration({
  address,
  highlight,
}: {
  address: string;
  highlight: "toggle" | "loadButton" | "pin";
}) {
  return (
    <svg viewBox="0 0 440 190" className="w-full max-w-md rounded-xl border border-border/40 bg-black/30" aria-hidden="true">
      {/* window chrome */}
      <rect x="0" y="0" width="440" height="34" fill="rgba(255,255,255,0.05)" />
      <circle cx="16" cy="17" r="5" fill="#f87171" opacity="0.7" />
      <circle cx="34" cy="17" r="5" fill="#fbbf24" opacity="0.7" />
      <circle cx="52" cy="17" r="5" fill="#34d399" opacity="0.7" />
      {/* address bar */}
      <rect x="70" y="8" width="290" height="18" rx="9" fill="rgba(255,255,255,0.08)" />
      <text x="82" y="21" fontFamily="monospace" fontSize="11" fill="#22d3ee">{address}</text>
      {/* puzzle / pin area */}
      <rect x="370" y="8" width="18" height="18" rx="4" fill={highlight === "pin" ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.08)"} />
      <text x="374" y="21" fontSize="11" fill={highlight === "pin" ? "#22d3ee" : "#9ca3af"}>🧩</text>
      {highlight === "pin" && (
        <rect x="365" y="3" width="28" height="28" rx="7" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 3" />
      )}
      {/* page area */}
      <rect x="14" y="48" width="200" height="14" rx="4" fill="rgba(255,255,255,0.10)" />
      {/* developer mode toggle (top right of page) */}
      <text x="300" y="59" fontSize="10" fill="#9ca3af">Developer mode</text>
      <rect x="382" y="48" width="34" height="16" rx="8" fill={highlight === "toggle" ? "#22d3ee" : "rgba(255,255,255,0.15)"} />
      <circle cx={highlight === "toggle" ? 408 : 390} cy="56" r="6" fill="#fff" />
      {highlight === "toggle" && (
        <rect x="294" y="42" width="130" height="28" rx="8" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 3" />
      )}
      {/* load unpacked button */}
      <rect x="14" y="80" width="110" height="24" rx="6" fill={highlight === "loadButton" ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.08)"} stroke={highlight === "loadButton" ? "#22d3ee" : "none"} strokeWidth="2" strokeDasharray={highlight === "loadButton" ? "4 3" : undefined} />
      <text x="26" y="96" fontSize="10" fill={highlight === "loadButton" ? "#22d3ee" : "#9ca3af"}>Load unpacked</text>
      {/* extension cards */}
      <rect x="14" y="120" width="130" height="52" rx="8" fill="rgba(255,255,255,0.05)" />
      <rect x="154" y="120" width="130" height="52" rx="8" fill="rgba(255,255,255,0.05)" />
      <rect x="24" y="132" width="70" height="8" rx="3" fill="rgba(255,255,255,0.12)" />
      <rect x="24" y="148" width="100" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="164" y="132" width="70" height="8" rx="3" fill="rgba(255,255,255,0.12)" />
      <rect x="164" y="148" width="100" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
}

interface StepDef {
  key: string;
  illustration?: React.ReactNode;
  extra?: React.ReactNode;
}

function BrowserPicker({
  onPick,
}: {
  onPick: (b: Browser) => void;
}) {
  const { t } = useTranslation();
  const browsers: { id: Browser; name: string; icon: React.ReactNode; note?: string }[] = [
    { id: "chrome", name: "Chrome", icon: <Chrome className="w-8 h-8" /> },
    { id: "edge", name: "Microsoft Edge", icon: <Globe className="w-8 h-8" /> },
    { id: "firefox", name: "Firefox", icon: <Flame className="w-8 h-8" />, note: t("firewallSetup.picker.firefoxNote") },
    { id: "safari", name: "Safari", icon: <Compass className="w-8 h-8" />, note: t("firewallSetup.picker.safariNote") },
  ];
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1.5">{t("firewallSetup.picker.title")}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t("firewallSetup.picker.subtitle")}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {browsers.map((b) => (
          <button
            key={b.id}
            onClick={() => onPick(b.id)}
            className="flex flex-col items-center gap-3 bg-card/60 border border-border/40 rounded-2xl p-5 hover:border-primary/50 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)] transition-all"
            data-testid={`browser-pick-${b.id}`}
          >
            <span className="text-primary">{b.icon}</span>
            <span className="text-sm font-bold text-foreground">{b.name}</span>
            {b.note && (
              <span className="text-[10px] text-yellow-400/90 text-center leading-tight">{b.note}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SafariPanel({ onPickOther, onBack }: { onPickOther: (b: Browser) => void; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-card/60 border border-border/40 rounded-2xl p-6 md:p-8">
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-yellow-500/15 text-yellow-400 p-2.5 rounded-xl border border-yellow-500/30 shrink-0">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("firewallSetup.safari.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("firewallSetup.safari.desc")}</p>
        </div>
      </div>
      <div className="flex items-start gap-2 text-xs text-yellow-300/80 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-5">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{t("firewallSetup.safari.note")}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onPickOther("chrome")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-primary text-black font-bold text-sm hover:opacity-90 transition-opacity"
          data-testid="safari-use-chrome"
        >
          <Chrome className="w-4 h-4" />
          {t("firewallSetup.safari.useChrome")}
        </button>
        <button
          onClick={() => onPickOther("edge")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm font-semibold text-foreground hover:border-primary/40 transition-all"
          data-testid="safari-use-edge"
        >
          <Globe className="w-4 h-4" />
          {t("firewallSetup.safari.useEdge")}
        </button>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("firewallSetup.back")}
        </button>
      </div>
    </div>
  );
}

export default function FirewallSetup({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<ExtensionMeta | null>(null);
  const [browser, setBrowser] = useState<Browser | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`${BASE}api/extension/metadata`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta({ version: d.version }))
      .catch(() => {});
  }, []);

  const pickBrowser = (b: Browser) => {
    setBrowser(b);
    setStep(0);
    setDone(false);
  };

  const reset = () => {
    setBrowser(null);
    setStep(0);
    setDone(false);
  };

  const downloadButton = (
    <a
      href={`${BASE}api/extension/download`}
      download
      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-primary text-black font-bold text-sm hover:opacity-90 shadow-[0_0_24px_rgba(6,182,212,0.3)] transition-all"
      data-testid="setup-download-zip"
    >
      <Download className="w-4 h-4" />
      {t("firewallSetup.steps.downloadCta")}
      {meta?.version && <span className="opacity-80 text-xs">v{meta.version}</span>}
    </a>
  );

  const extensionsAddress =
    browser === "edge" ? "edge://extensions" : "chrome://extensions";

  const chromiumSteps: StepDef[] = [
    {
      key: "download",
      extra: downloadButton,
    },
    {
      key: "unzip",
      extra: (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-black/30 border border-border/40 rounded-lg px-4 py-3">
          <FolderOpen className="w-4 h-4 text-primary shrink-0" />
          {t("firewallSetup.steps.unzipHint")}
        </div>
      ),
    },
    {
      key: browser === "edge" ? "openEdge" : "openChrome",
      illustration: <BrowserIllustration address={extensionsAddress} highlight="toggle" />,
      extra: <CopyableAddress address={extensionsAddress} />,
    },
    {
      key: "loadUnpacked",
      illustration: <BrowserIllustration address={extensionsAddress} highlight="loadButton" />,
    },
    {
      key: "pinTest",
      illustration: <BrowserIllustration address="chat.openai.com" highlight="pin" />,
      extra: (
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm font-semibold text-foreground hover:border-primary/40 transition-all"
          data-testid="setup-open-chatgpt"
        >
          <ExternalLink className="w-4 h-4" />
          {t("firewallSetup.steps.openChatgpt")}
        </a>
      ),
    },
  ];

  const firefoxSteps: StepDef[] = [
    { key: "download", extra: downloadButton },
    {
      key: "openFirefox",
      extra: <CopyableAddress address="about:debugging#/runtime/this-firefox" />,
    },
    {
      key: "loadTemporary",
      extra: (
        <div className="flex items-start gap-2 text-xs text-yellow-300/80 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t("firewallSetup.firefox.temporaryNote")}</span>
        </div>
      ),
    },
    {
      key: "pinTest",
      extra: (
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm font-semibold text-foreground hover:border-primary/40 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          {t("firewallSetup.steps.openChatgpt")}
        </a>
      ),
    },
  ];

  const steps = browser === "firefox" ? firefoxSteps : chromiumSteps;
  const stepPrefix = browser === "firefox" ? "firewallSetup.firefox" : "firewallSetup.steps";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-16">
      <motion.header initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
        <button
          onClick={() => (browser ? reset() : onNavigate("getStarted"))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          data-testid="setup-back"
        >
          <ArrowLeft className="w-4 h-4" />
          {browser ? t("firewallSetup.changeBrowser") : t("firewallSetup.backToStart")}
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-red-500/15 text-red-400 p-2.5 rounded-xl border border-red-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {t("firewallSetup.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("firewallSetup.subtitle")}</p>
          </div>
        </div>
      </motion.header>

      {!browser && <BrowserPicker onPick={pickBrowser} />}

      {browser === "safari" && <SafariPanel onPickOther={pickBrowser} onBack={reset} />}

      {browser && browser !== "safari" && !done && (
        <div>
          {/* progress */}
          <div className="flex items-center gap-1.5 mb-6" data-testid="setup-progress">
            {steps.map((s, i) => (
              <div
                key={s.key}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  i < step ? "bg-emerald-400" : i === step ? "bg-primary" : "bg-muted/30"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${browser}-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="bg-card/60 border border-border/40 rounded-2xl p-6 md:p-8"
            >
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                {t("firewallSetup.stepCounter", { current: step + 1, total: steps.length })}
              </p>
              <h2 className="text-xl font-bold text-foreground mb-2">
                {t(`${stepPrefix}.${steps[step].key}.title`)}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {t(`${stepPrefix}.${steps[step].key}.desc`)}
              </p>

              {steps[step].illustration && <div className="mb-5">{steps[step].illustration}</div>}
              {steps[step].extra && <div className="mb-5">{steps[step].extra}</div>}

              <div className="flex items-center gap-3 pt-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="setup-prev"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t("firewallSetup.back")}
                  </button>
                )}
                <button
                  onClick={() => (step === steps.length - 1 ? setDone(true) : setStep((s) => s + 1))}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/15 border border-primary/40 text-primary font-bold text-sm hover:bg-primary/25 transition-all ml-auto"
                  data-testid="setup-next"
                >
                  {step === steps.length - 1
                    ? t("firewallSetup.finish")
                    : t("firewallSetup.doneNext")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {browser && done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-2 border-emerald-500/30 rounded-2xl p-8 text-center"
          data-testid="setup-done"
        >
          <PartyPopper className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("firewallSetup.done.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            {t("firewallSetup.done.desc")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigate("getStarted")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-primary text-black font-bold text-sm hover:opacity-90 transition-opacity"
              data-testid="setup-done-home"
            >
              {t("firewallSetup.done.backHome")}
            </button>
            <button
              onClick={() => onNavigate("firewallHub")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm font-semibold text-foreground hover:border-primary/40 transition-all"
            >
              <Pin className="w-4 h-4" />
              {t("firewallSetup.done.openHub")}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
