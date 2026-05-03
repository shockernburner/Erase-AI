import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Shield,
  Download,
  Chrome,
  AlertTriangle,
  ExternalLink,
  Book,
  Code2,
  KeyRound,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import type { AppView } from "@/components/AppShell";

const BASE = import.meta.env.BASE_URL;
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "/api";

interface ExtensionMeta {
  version: string;
  zipUrl?: string;
}

interface ApiKey {
  id: number;
  prefix: string;
  createdAt: string;
}

function KeyManagementCard() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/dev/keys`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => setError(t("firewallHub.km.loadFailed", { defaultValue: "Sign in to manage your API keys." })))
      .finally(() => setLoading(false));
  }, [t]);

  const create = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/dev/keys`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Firewall Extension" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "create failed");
      }
      const d = await res.json();
      setCreatedKey(d.key);
      setKeys((prev) => (prev ? [...prev, { id: d.id, prefix: d.prefix, createdAt: new Date().toISOString() }] : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    }
  };

  const copy = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card/60 border border-border/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="w-5 h-5 text-yellow-400" />
        <h3 className="font-bold text-foreground">
          {t("firewallHub.km.title", { defaultValue: "Key Management" })}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t("firewallHub.km.desc", { defaultValue: "Issue and rotate the API key your extension uses to call the firewall." })}
      </p>

      {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2 mb-3">
          {error}
        </div>
      )}

      {keys && keys.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex items-center gap-2 text-xs font-mono bg-background/40 border border-border/30 rounded-lg px-3 py-2"
              data-testid="firewall-key-row"
            >
              <span className="text-muted-foreground">{k.prefix}…</span>
              <span className="ml-auto text-muted-foreground/60">{new Date(k.createdAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}

      {createdKey && (
        <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
          <div className="font-semibold text-emerald-400 mb-1">
            {t("firewallHub.km.copyOnce", { defaultValue: "Copy this now — we won't show it again." })}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono break-all text-foreground">{createdKey}</code>
            <button
              onClick={copy}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? t("firewallHub.km.copied", { defaultValue: "Copied" }) : t("firewallHub.km.copy", { defaultValue: "Copy" })}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={create}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-sm font-semibold transition-colors"
        data-testid="firewall-key-create"
      >
        <KeyRound className="w-4 h-4" />
        {t("firewallHub.km.createBtn", { defaultValue: "Create new API key" })}
      </button>
    </div>
  );
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

      {/* Three primary surfaces: Browser / IDE / Key Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" data-testid="firewall-primary-cards">
        <div className="bg-card/60 border border-border/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Chrome className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-foreground">
              {t("firewallHub.bp.title", { defaultValue: "Browser Protection" })}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t("firewallHub.bp.desc", { defaultValue: "Chrome / Edge / Firefox extension that intercepts prompts and attachments on ChatGPT, Claude and Gemini." })}
          </p>
          <a
            href={`${BASE}api/extension/download`}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity"
            data-testid="firewall-bp-download"
          >
            <Download className="w-4 h-4" />
            {t("firewallHub.bp.cta", { defaultValue: "Download (.zip)" })}
            {meta?.version && <span className="opacity-80 text-xs">v{meta.version}</span>}
          </a>
        </div>

        <div className="bg-card/60 border border-border/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-foreground">
              {t("firewallHub.ide.title", { defaultValue: "IDE Protection" })}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t("firewallHub.ide.desc", { defaultValue: "Wrap any IDE assistant (Cursor, VS Code Copilot Chat, Replit) with the same firewall via our developer SDK." })}
          </p>
          <button
            onClick={() => onNavigate("devMode")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 text-sm font-semibold transition-colors"
            data-testid="firewall-ide-open"
          >
            <ExternalLink className="w-4 h-4" />
            {t("firewallHub.ide.cta", { defaultValue: "Open Dev Mode" })}
          </button>
        </div>

        <KeyManagementCard />
      </div>

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

      <button
        onClick={() => onNavigate("firewallDocs")}
        className="w-full text-left bg-card/40 border border-border/30 rounded-2xl p-5 hover:border-primary/40 transition-all"
      >
        <div className="flex items-center gap-2 mb-1">
          <Book className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">
            {t("firewallHub.docsCardTitle", { defaultValue: "Full reference & API" })}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-primary ml-auto" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("firewallHub.docsCardDesc", { defaultValue: "Endpoints, browser compatibility, configuration and changelog." })}
        </p>
      </button>
    </div>
  );
}
