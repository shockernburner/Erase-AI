import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Shield, Download, Chrome, AlertTriangle, FileCode, ExternalLink, Book } from "lucide-react";
import type { AppView } from "@/components/AppShell";

const BASE = import.meta.env.BASE_URL;

interface ExtensionMeta {
  version: string;
  zipUrl?: string;
}

export default function FirewallHub({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<ExtensionMeta | null>(null);

  useEffect(() => {
    fetch(`${BASE}api/extension/metadata`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeta({ version: d.version, zipUrl: d.zipUrl }))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-16">
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-red-500/15 text-red-400 p-2.5 rounded-xl border border-red-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("firewallHub.title", { defaultValue: "Firewall" })}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t("firewallHub.subtitle", { defaultValue: "Install the EraseAI browser extension to scan prompts and attachments before they leave your browser." })}
        </p>
      </motion.header>

      {/* Manual install panel — visible by default */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border-2 border-red-500/30 rounded-2xl p-6 md:p-8 mb-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <Download className="w-6 h-6 text-red-400 mt-0.5" />
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {t("firewallHub.manualTitle", { defaultValue: "Manual install (.zip)" })}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("firewallHub.manualSubtitle", { defaultValue: "While we wait for store approval, side-load the extension in 60 seconds." })}
            </p>
          </div>
        </div>

        <a
          href={`${BASE}api/extension/download`}
          download
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm hover:from-red-600 hover:to-orange-600 shadow-[0_0_24px_rgba(239,68,68,0.35)] transition-all"
          data-testid="firewall-hub-download"
        >
          <Download className="w-4 h-4" />
          {t("firewallHub.downloadCta", { defaultValue: "Download extension (.zip)" })}
          {meta?.version && <span className="opacity-80 text-xs">v{meta.version}</span>}
        </a>

        <ol className="mt-6 space-y-3">
          {[
            t("firewallHub.step1", { defaultValue: "Unzip the downloaded file." }),
            t("firewallHub.step2", { defaultValue: "Open chrome://extensions and enable Developer mode (top right)." }),
            t("firewallHub.step3", { defaultValue: "Click 'Load unpacked' and pick the unzipped folder." }),
            t("firewallHub.step4", { defaultValue: "Pin the EraseAI Firewall icon and reload ChatGPT/Claude/Gemini." }),
          ].map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm bg-card/60 border border-border/30 rounded-lg p-3"
            >
              <span className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-muted-foreground leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-start gap-2 text-xs text-yellow-300/80 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t("firewallHub.manualNote", { defaultValue: "Manual installs run with full permissions on supported AI sites. Only install from this page." })}
          </span>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => onNavigate("firewallDocs")}
          className="text-left bg-card/50 border border-border/40 rounded-2xl p-5 hover:border-primary/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Book className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">
              {t("firewallHub.docsCardTitle", { defaultValue: "Full reference & API" })}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("firewallHub.docsCardDesc", { defaultValue: "Endpoints, browser compatibility, configuration and changelog." })}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary">
            {t("home.openSection")} <ExternalLink className="w-3 h-3" />
          </div>
        </button>

        <a
          href="https://chrome.google.com/webstore"
          target="_blank"
          rel="noopener noreferrer"
          className="text-left bg-card/50 border border-border/40 rounded-2xl p-5 hover:border-primary/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Chrome className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-foreground">
              {t("firewallHub.storeCardTitle", { defaultValue: "Chrome Web Store (pending)" })}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("firewallHub.storeCardDesc", { defaultValue: "We're in the review queue. Until then, use the manual install above." })}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400">
            {t("firewallHub.openStore", { defaultValue: "Open store" })} <ExternalLink className="w-3 h-3" />
          </div>
        </a>
      </div>

      <div className="bg-card/40 border border-border/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileCode className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground text-sm">
            {t("firewallHub.whatItDoesTitle", { defaultValue: "What the firewall blocks" })}
          </h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1.5 ml-1">
          <li>• {t("firewallHub.bullet1", { defaultValue: "API keys, credentials and tokens copy-pasted into the prompt." })}</li>
          <li>• {t("firewallHub.bullet2", { defaultValue: "Risky CSV / PDF / DOCX attachments before they upload." })}</li>
          <li>• {t("firewallHub.bullet3", { defaultValue: "PII, internal hostnames and structured secrets." })}</li>
        </ul>
      </div>
    </div>
  );
}
