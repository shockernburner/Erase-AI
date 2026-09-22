import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  Shield,
  Download,
  Puzzle,
  Zap,
  Terminal,
  Globe,
  Eye,
  AlertTriangle,
  Lock,
  Gauge,
  Crown,
  Settings,
  MonitorSmartphone,
  Key,
  Code2,
  Laptop,
  Smartphone,
  HelpCircle,
  Sparkles,
  Clock,
  FileArchive,
} from "lucide-react";

type SectionId = "overview" | "apikey" | "install" | "endpoints" | "extension" | "ratelimits" | "platforms" | "vscode" | "replit" | "xcode" | "troubleshooting";

interface FirewallDocsProps {
  onBack: () => void;
  onUpgrade?: () => void;
  onDevMode?: () => void;
  onOpenPublishing?: () => void;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const langColors: Record<string, string> = {
    bash: "text-green-400",
    json: "text-yellow-300",
    javascript: "text-amber-300",
    python: "text-blue-300",
  };
  return (
    <div className="relative group">
      <div className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">{lang}</div>
      <CopyBtn text={code} />
      <pre className={`bg-black/50 rounded-xl p-4 pt-8 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-border/20 ${langColors[lang] || "text-foreground/80"}`}>
        {code}
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-500/20 text-green-400",
    POST: "bg-blue-500/20 text-blue-400",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors[method] || "bg-muted text-foreground"}`}>{method}</span>;
}

function OverviewSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.overviewTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.overviewDesc")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Eye, title: t("firewallDocs.capIntercept"), desc: t("firewallDocs.capInterceptDesc") },
          { icon: Zap, title: t("firewallDocs.capAnalyze"), desc: t("firewallDocs.capAnalyzeDesc") },
          { icon: Lock, title: t("firewallDocs.capSanitize"), desc: t("firewallDocs.capSanitizeDesc") },
        ].map((c) => (
          <div key={c.title} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
            <c.icon className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-primary mb-2">{t("firewallDocs.howItWorks")}</h3>
        <div className="space-y-2">
          {[
            t("firewallDocs.step1"),
            t("firewallDocs.step2"),
            t("firewallDocs.step3"),
            t("firewallDocs.step4"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface ExtensionMetadata {
  version: string;
  filename: string;
  sizeBytes: number;
  lastModified: string;
  changelog: ChangelogEntry[];
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

interface InstallApiKey {
  id: string;
  prefix: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  active: boolean;
}

function InstallApiKeyMini({ apiBase }: { apiBase: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const plan = user?.planType || "free";
  const apiAccessAllowed = plan !== "free";
  const [keys, setKeys] = useState<InstallApiKey[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!apiAccessAllowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`${apiBase}/developer/keys`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { keys: InstallApiKey[] };
        if (!cancelled) setKeys(data.keys);
      })
      .catch(() => {
        if (!cancelled) setKeys([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiAccessAllowed, apiBase]);

  const createKeyWithName = async (name: string, auto: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("firewallDocs.installKeyNameRequired"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/developer/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("firewallDocs.installKeyCreateFailed"));
        return;
      }
      const newKey = data.key as string;
      setRevealedKey(newKey);
      setNewKeyName("");
      if (auto && typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(newKey);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          /* clipboard blocked — key still visible for manual copy */
        }
      }
      const listRes = await fetch(`${apiBase}/developer/keys`, { credentials: "include" });
      if (listRes.ok) {
        const list = (await listRes.json()) as { keys: InstallApiKey[] };
        setKeys(list.keys);
      }
    } catch {
      setError(t("firewallDocs.installKeyCreateFailed"));
    } finally {
      setCreating(false);
    }
  };

  const createKey = () => createKeyWithName(newKeyName, false);

  const quickCreateKey = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    return createKeyWithName(`EraseAI Firewall extension – ${stamp}`, true);
  };

  const copyRevealed = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-2" data-testid="install-apikey-signedout">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.installKeyTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("firewallDocs.installKeySignedOut")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!apiAccessAllowed) {
    return (
      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-2" data-testid="install-apikey-upgrade">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.installKeyTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("firewallDocs.installKeyUpgrade")}</p>
          </div>
        </div>
      </div>
    );
  }

  const activeKeys = (keys || []).filter((k) => k.active);

  return (
    <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4" data-testid="install-apikey-card">
      <div className="flex items-start gap-3">
        <Key className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.installKeyTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("firewallDocs.installKeyDesc")}</p>
        </div>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground">{t("firewallDocs.installKeyLoading")}</p>
      )}

      {!loading && activeKeys.length > 0 && (
        <div className="space-y-2" data-testid="install-apikey-existing">
          <p className="text-xs text-muted-foreground">{t("firewallDocs.installKeyExisting", { count: activeKeys.length })}</p>
          <ul className="space-y-1.5">
            {activeKeys.slice(0, 3).map((k) => (
              <li key={k.id} className="flex items-center gap-2 text-xs">
                <code className="font-mono text-foreground bg-black/30 px-2 py-0.5 rounded">{k.prefix}…</code>
                <span className="text-muted-foreground truncate">{k.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !revealedKey && (
        <div className="space-y-3">
          {/*
            Primary one-click path: generates a key with an auto-name and
            copies it straight to the clipboard, so a user installing the
            extension only ever needs a single click to obtain a usable key
            (regardless of whether they already have other keys).
          */}
          <button
            type="button"
            onClick={quickCreateKey}
            disabled={creating}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            data-testid="install-apikey-quick-create"
          >
            <Copy className="w-3.5 h-3.5" />
            {creating ? t("firewallDocs.installKeyQuickCreating") : t("firewallDocs.installKeyQuickCreate")}
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            {t("firewallDocs.installKeyQuickHint")}
          </p>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none hover:text-foreground transition-colors" data-testid="install-apikey-advanced-toggle">
              {t("firewallDocs.installKeyAdvancedToggle")}
            </summary>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("firewallDocs.installKeyCreateLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t("firewallDocs.installKeyNamePlaceholder")}
                  className="flex-1 px-3 py-2 bg-black/30 border border-border/30 rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:border-primary outline-none"
                  data-testid="install-apikey-name-input"
                />
                <button
                  type="button"
                  onClick={createKey}
                  disabled={creating || !newKeyName.trim()}
                  className="px-4 py-2 bg-white/5 border border-border/40 text-foreground rounded-lg text-xs font-semibold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="install-apikey-create-btn"
                >
                  {creating ? t("firewallDocs.installKeyCreating") : t("firewallDocs.installKeyCreate")}
                </button>
              </div>
            </div>
          </details>
          {error && <p className="text-xs text-red-400" data-testid="install-apikey-error">{error}</p>}
        </div>
      )}

      {revealedKey && (
        <div className="bg-green-500/5 border border-green-500/30 rounded-lg p-3 space-y-2" data-testid="install-apikey-reveal">
          <p className="text-xs font-semibold text-green-400">{t("firewallDocs.installKeyCreated")}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-foreground bg-black/40 px-3 py-2 rounded break-all">{revealedKey}</code>
            <button
              type="button"
              onClick={copyRevealed}
              className="p-2 bg-white/5 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
              data-testid="install-apikey-copy-btn"
              aria-label={t("firewallDocs.installKeyCopy")}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-yellow-300/80">{t("firewallDocs.installKeyOnceWarning")}</p>
        </div>
      )}
    </div>
  );
}

interface GoLiveProbe {
  ok: boolean;
  version?: string;
  error?: string;
}

const CANONICAL_PING_URL = "https://eraseai.ai/api/dev/ping";

function GoLiveChecklistCard({ onOpenPublishing }: { onOpenPublishing: () => void }) {
  const { t } = useTranslation();
  const chromeStoreSet = !!(import.meta.env.VITE_CHROME_STORE_URL as string | undefined);
  const edgeStoreSet = !!(import.meta.env.VITE_EDGE_STORE_URL as string | undefined);
  const firefoxAddonSet = !!(import.meta.env.VITE_FIREFOX_ADDON_URL as string | undefined);
  const [probe, setProbe] = useState<GoLiveProbe | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(CANONICAL_PING_URL, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setProbe({ ok: data?.ok === true, version: typeof data?.version === "string" ? data.version : undefined });
      })
      .catch((err) => {
        if (!cancelled) setProbe({ ok: false, error: err && err.message ? err.message : "unreachable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // `detail` is intentionally limited to safe, non-secret information:
  //   - the EraseAI server version returned by /ping (public),
  //   - the env-var *name* that needs to be set (no value),
  //   - a generic error string for the probe.
  const setLabel = t("firewallDocs.goliveStatusSet");
  const notSetLabel = t("firewallDocs.goliveStatusNotSet");
  const items: { ok: boolean; label: string; detail: string }[] = [
    {
      ok: !!probe?.ok,
      label: t("firewallDocs.goliveProbe"),
      detail: probe == null
        ? t("firewallDocs.goliveProbeChecking")
        : probe.ok
          ? `${setLabel} — eraseai.ai v${probe.version || "?"}`
          : `${notSetLabel} — ${probe.error || "unreachable"}`,
    },
    {
      ok: chromeStoreSet,
      label: t("firewallDocs.goliveChrome"),
      detail: `${chromeStoreSet ? setLabel : notSetLabel} — VITE_CHROME_STORE_URL`,
    },
    {
      ok: edgeStoreSet,
      label: t("firewallDocs.goliveEdge"),
      detail: `${edgeStoreSet ? setLabel : notSetLabel} — VITE_EDGE_STORE_URL`,
    },
    {
      ok: firefoxAddonSet,
      label: t("firewallDocs.goliveFirefox"),
      detail: `${firefoxAddonSet ? setLabel : notSetLabel} — VITE_FIREFOX_ADDON_URL`,
    },
  ];

  return (
    <div className="bg-card/40 border border-amber-500/20 rounded-xl p-5 space-y-4" data-testid="install-golive-checklist">
      <div className="flex items-start gap-3">
        <Settings className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.goliveTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("firewallDocs.goliveDesc")}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-2 text-xs"
            data-testid={`golive-item-${item.ok ? "ok" : "missing"}`}
          >
            {item.ok ? (
              <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className={item.ok ? "text-foreground" : "text-amber-300/90 font-medium"}>{item.label}</div>
              <div className="text-[11px] text-muted-foreground break-all">{item.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onOpenPublishing}
        className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
        data-testid="install-golive-publishing-link"
      >
        {t("firewallDocs.goliveDocs")}
      </button>
    </div>
  );
}

function InstallSection({ onOpenPublishing }: { onOpenPublishing: () => void }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const apiBase = `${import.meta.env.BASE_URL}api`;
  const chromeStoreUrl = (import.meta.env.VITE_CHROME_STORE_URL as string | undefined) || "";
  const edgeStoreUrl = (import.meta.env.VITE_EDGE_STORE_URL as string | undefined) || "";
  const firefoxAddonUrl = (import.meta.env.VITE_FIREFOX_ADDON_URL as string | undefined) || "";
  const [showManual, setShowManual] = useState(false);
  const [metadata, setMetadata] = useState<ExtensionMetadata | null>(null);
  const [metadataError, setMetadataError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/extension/version", { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ExtensionMetadata;
        if (!cancelled) {
          setMetadata(data);
          setMetadataError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setMetadataError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stores: { name: string; url: string; color: string }[] = [
    { name: "Chrome", url: chromeStoreUrl, color: "bg-primary text-primary-foreground" },
    { name: "Edge", url: edgeStoreUrl, color: "bg-sky-500 text-white" },
    { name: "Firefox", url: firefoxAddonUrl, color: "bg-orange-500 text-white" },
  ];
  const liveStores = stores.filter((s) => s.url);
  const downloadFilename = metadata?.filename ?? "eraseai-firewall.zip";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.installTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.installDesc")}</p>
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Puzzle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.storeInstallTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("firewallDocs.storeInstallDesc")}</p>
          </div>
        </div>

        {liveStores.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-3">
            {liveStores.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity ${s.color}`}
              >
                <Download className="w-4 h-4" />
                {t("firewallDocs.storeAddTo", { browser: s.name })}
              </a>
            ))}
          </div>
        ) : (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80">{t("firewallDocs.storeComingSoon")}</p>
          </div>
        )}

        {metadata && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-1" data-testid="extension-version-meta">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-foreground" data-testid="extension-version">v{metadata.version}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileArchive className="w-3.5 h-3.5" />
              <span data-testid="extension-size">{formatBytes(metadata.sizeBytes)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span data-testid="extension-last-updated">
                {t("firewallDocs.lastUpdated")}: {formatDate(metadata.lastModified, i18n.language)}
              </span>
            </span>
          </div>
        )}
        {metadataError && !metadata && (
          <p className="text-xs text-muted-foreground" data-testid="extension-version-error">
            {t("firewallDocs.versionUnavailable")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.browserCompatTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.browserCompatDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: "Chrome", status: t("firewallDocs.browserFull"), color: "text-green-400", bg: "bg-green-500/5 border-green-500/20" },
            { name: "Edge", status: t("firewallDocs.browserFull"), color: "text-green-400", bg: "bg-green-500/5 border-green-500/20" },
            { name: "Firefox", status: t("firewallDocs.browserPartial"), color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20" },
          ].map((b) => (
            <div key={b.name} className={`${b.bg} border rounded-lg p-3 space-y-1`}>
              <h4 className="text-sm font-bold text-foreground">{b.name}</h4>
              <p className={`text-xs font-medium ${b.color}`}>{b.status}</p>
            </div>
          ))}
        </div>
      </div>

      <InstallApiKeyMini apiBase={apiBase} />

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Terminal className="w-4 h-4" />
          {showManual ? t("firewallDocs.manualInstallHide") : t("firewallDocs.manualInstallShow")}
        </button>
        <p className="text-xs text-muted-foreground/80">{t("firewallDocs.manualInstallHint")}</p>
      </div>

      {showManual && (
        <>
          <a
            href="/api/extension/download"
            download
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl bg-card border border-border/30 text-foreground font-semibold text-sm hover:bg-card/70 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("firewallDocs.downloadExtension")}
          </a>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.installStepsTitle")}</h3>
            <div className="space-y-3">
              {[
                t("firewallDocs.installStep1"),
                t("firewallDocs.installStep2"),
                t("firewallDocs.installStep3"),
                t("firewallDocs.installStep4"),
                t("firewallDocs.installStep5"),
                t("firewallDocs.installStep6"),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-sm bg-card/40 border border-border/20 rounded-lg p-3">
                  <span className="text-primary font-bold shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">{i + 1}</span>
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.configTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.configDesc")}</p>
        <CodeBlock code={`{
  "manifest_version": 3,
  "name": "EraseAI Firewall",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab"],
  "content_scripts": [{
    "matches": [
      "https://chat.openai.com/*",
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
      "https://replit.com/*"
    ],
    "js": ["src/content.js"],
    "css": ["src/overlay.css"]
  }],
  "host_permissions": [
    "https://*.replit.app/*"
  ]
}`} lang="json" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.browserCompatTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.browserCompatDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: "Chrome", status: t("firewallDocs.browserFull"), color: "text-green-400", bg: "bg-green-500/5 border-green-500/20" },
            { name: "Edge", status: t("firewallDocs.browserFull"), color: "text-green-400", bg: "bg-green-500/5 border-green-500/20" },
            { name: "Firefox", status: t("firewallDocs.browserPartial"), color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20" },
          ].map((b) => (
            <div key={b.name} className={`${b.bg} border rounded-lg p-3 space-y-1`}>
              <h4 className="text-sm font-bold text-foreground">{b.name}</h4>
              <p className={`text-xs font-medium ${b.color}`}>{b.status}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.edgeInstallTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.edgeInstallDesc")}</p>
        <div className="space-y-3">
          {[
            t("firewallDocs.edgeStep1"),
            t("firewallDocs.edgeStep2"),
            t("firewallDocs.edgeStep3"),
            t("firewallDocs.edgeStep4"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm bg-card/40 border border-border/20 rounded-lg p-3">
              <span className="text-primary font-bold shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">{i + 1}</span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.firefoxInstallTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.firefoxInstallDesc")}</p>
        <div className="space-y-3">
          {[
            t("firewallDocs.firefoxStep1"),
            t("firewallDocs.firefoxStep2"),
            t("firewallDocs.firefoxStep3"),
            t("firewallDocs.firefoxStep4"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm bg-card/40 border border-border/20 rounded-lg p-3">
              <span className="text-primary font-bold shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">{i + 1}</span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/80">{t("firewallDocs.firefoxWarning")}</p>
        </div>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/80">{t("firewallDocs.installWarning")}</p>
      </div>
        </>
      )}

      {metadata && metadata.changelog.length > 0 && (
        <div className="space-y-3" data-testid="extension-changelog">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.whatsNewTitle")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t("firewallDocs.whatsNewDesc")}</p>
          <div className="space-y-3">
            {metadata.changelog.slice(0, 5).map((entry) => {
              const isCurrent = entry.version === metadata.version;
              return (
                <div
                  key={entry.version}
                  className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2"
                  data-testid={`changelog-entry-${entry.version}`}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-foreground">v{entry.version}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        {t("firewallDocs.currentVersionBadge")}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(entry.date, i18n.language)}</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdmin && <GoLiveChecklistCard onOpenPublishing={onOpenPublishing} />}
    </div>
  );
}

function EndpointsSection() {
  const { t } = useTranslation();
  const origin = window.location.origin;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.endpointsTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.endpointsDesc")}</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h3 className="text-sm font-bold text-primary mb-1">{t("firewallDocs.baseUrl")}</h3>
        <code className="text-xs font-mono text-foreground/80">{origin}/api/dev/</code>
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="GET" />
          <code className="text-sm font-mono text-foreground">/api/dev/ping</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.pingDesc")}</p>
        <CodeBlock code={`curl -H "Authorization: Bearer eak_your_api_key" \\
  ${origin}/api/dev/ping`} lang="bash" />
        <CodeBlock code={`{
  "ok": true,
  "meta": {
    "version": "1.0",
    "timestamp": "2026-04-05T12:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}`} lang="json" />
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="POST" />
          <code className="text-sm font-mono text-foreground">/api/dev/analyze</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.analyzeDesc")}</p>
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("firewallDocs.requestBody")}</h5>
          <div className="flex items-baseline gap-2 text-xs">
            <code className="text-primary font-mono">text</code>
            <span className="text-muted-foreground/60">string</span>
            <span className="text-red-400 text-[10px]">required</span>
            <span className="text-muted-foreground">{t("firewallDocs.analyzeTextParam")}</span>
          </div>
        </div>
        <CodeBlock code={`curl -X POST ${origin}/api/dev/analyze \\
  -H "Authorization: Bearer eak_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "My API key is sk-abc123 and my email is john@example.com"}'`} lang="bash" />
        <CodeBlock code={`{
  "riskScore": 25,
  "level": "caution",
  "issues": [
    {
      "category": "secret_exposure",
      "severity": "critical",
      "detail": "API key detected (sk-abc123...)",
      "match": "sk-abc123",
      "start": 18,
      "end": 28
    },
    {
      "category": "pii",
      "severity": "high",
      "detail": "Email address detected",
      "match": "john@example.com",
      "start": 47,
      "end": 63
    }
  ],
  "suggestions": [
    { "action": "Remove", "detail": "Remove API key before sending to AI" },
    { "action": "Redact", "detail": "Replace email with placeholder" }
  ],
  "summary": "Found 2 issues: 1 secret, 1 PII exposure",
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="POST" />
          <code className="text-sm font-mono text-foreground">/api/dev/sanitize</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.sanitizeDesc")}</p>
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("firewallDocs.requestBody")}</h5>
          <div className="flex items-baseline gap-2 text-xs">
            <code className="text-primary font-mono">text</code>
            <span className="text-muted-foreground/60">string</span>
            <span className="text-red-400 text-[10px]">required</span>
            <span className="text-muted-foreground">{t("firewallDocs.sanitizeTextParam")}</span>
          </div>
        </div>
        <CodeBlock code={`curl -X POST ${origin}/api/dev/sanitize \\
  -H "Authorization: Bearer eak_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Deploy to server at 192.168.1.100 with password P@ssw0rd123"}'`} lang="bash" />
        <CodeBlock code={`{
  "sanitized": "Deploy to server at [IP_REDACTED] with password [PASSWORD_REDACTED]",
  "changes": [
    {
      "category": "secret_exposure",
      "original": "192.168.1.100",
      "replacement": "[IP_REDACTED]"
    },
    {
      "category": "secret_exposure",
      "original": "P@ssw0rd123",
      "replacement": "[PASSWORD_REDACTED]"
    }
  ],
  "changeCount": 2,
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>

      <div className="bg-card/40 border border-border/20 rounded-xl p-5 space-y-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method="GET" />
          <code className="text-sm font-mono text-foreground">/api/dev/history</code>
        </div>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.historyDesc")}</p>
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t("firewallDocs.queryParams")}</h5>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 text-xs">
              <code className="text-primary font-mono">limit</code>
              <span className="text-muted-foreground/60">integer</span>
              <span className="text-muted-foreground">{t("firewallDocs.historyLimitParam")}</span>
            </div>
            <div className="flex items-baseline gap-2 text-xs">
              <code className="text-primary font-mono">offset</code>
              <span className="text-muted-foreground/60">integer</span>
              <span className="text-muted-foreground">{t("firewallDocs.historyOffsetParam")}</span>
            </div>
          </div>
        </div>
        <CodeBlock code={`curl "${origin}/api/dev/history?limit=10&offset=0" \\
  -H "Authorization: Bearer eak_your_api_key"`} lang="bash" />
        <CodeBlock code={`{
  "scans": [
    {
      "id": 1,
      "scanType": "analyze",
      "inputText": "My API key is sk-abc...",
      "riskScore": 25,
      "issues": [...],
      "sanitizedText": null,
      "createdAt": "2026-04-05T12:00:00.000Z"
    }
  ],
  "total": 42,
  "todayUsed": 3,
  "dailyLimit": 25,
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>
    </div>
  );
}

function ExtensionSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.extensionTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.extensionDesc")}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.architectureTitle")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: MonitorSmartphone, title: t("firewallDocs.archContent"), desc: t("firewallDocs.archContentDesc") },
            { icon: Settings, title: t("firewallDocs.archBackground"), desc: t("firewallDocs.archBackgroundDesc") },
            { icon: Gauge, title: t("firewallDocs.archPopup"), desc: t("firewallDocs.archPopupDesc") },
          ].map((c) => (
            <div key={c.title} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
              <c.icon className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.messageFlowTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.messageFlowDesc")}</p>
        <CodeBlock code={`Content Script                Background (Service Worker)        EraseAI API
     |                                  |                           |
     |--- { type: "ANALYZE", text } --> |                           |
     |                                  |--- POST /api/dev/analyze ->|
     |                                  |<-- { riskScore, issues } --|
     |<-- { riskScore, level, ... } ----|                           |
     |                                  |                           |
     |--- { type: "SANITIZE", text } -->|                           |
     |                                  |--- POST /api/dev/sanitize->|
     |                                  |<-- { sanitized, changes } -|
     |<-- { sanitized, changes } -------|                           |`} lang="bash" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.interceptTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.interceptDesc")}</p>
        <CodeBlock code={`function interceptSubmission(e) {
  // 1. Get text from the AI platform's input field
  const text = platform.getInputText(inputEl).trim();
  if (!text || text.length < 3) return;

  // 2. Block the original submission
  e.preventDefault();
  e.stopImmediatePropagation();

  // 3. Show scanning overlay
  const { panel } = createOverlayBackdrop();

  // 4. Send to background for API analysis
  chrome.runtime.sendMessage(
    { type: "ANALYZE", text },
    (result) => {
      if (result.riskScore > 70) {
        // Safety score > 70 = low risk — auto-send
        bypassNext = true;
        triggerSend();
      } else {
        // Safety score <= 70 = medium/high risk — show overlay
        renderResults(panel, result, inputEl);
      }
    }
  );
}`} lang="javascript" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.overlayTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.overlayDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: t("firewallDocs.actionCancel"), desc: t("firewallDocs.actionCancelDesc"), color: "text-muted-foreground" },
            { label: t("firewallDocs.actionSanitize"), desc: t("firewallDocs.actionSanitizeDesc"), color: "text-primary" },
            { label: t("firewallDocs.actionSend"), desc: t("firewallDocs.actionSendDesc"), color: "text-yellow-400" },
          ].map((a) => (
            <div key={a.label} className="bg-card/40 border border-border/20 rounded-lg p-3 space-y-1">
              <h4 className={`text-xs font-bold ${a.color}`}>{a.label}</h4>
              <p className="text-[11px] text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RateLimitsSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.rateLimitsTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.rateLimitsDesc")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.freePlan")}</h3>
          <div className="text-2xl font-bold text-primary">10</div>
          <p className="text-xs text-muted-foreground">{t("firewallDocs.freePlanDesc")}</p>
        </div>
        <div className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.paidPlan")}</h3>
          <div className="text-2xl font-bold text-green-400">{t("firewallDocs.unlimited")}</div>
          <p className="text-xs text-muted-foreground">{t("firewallDocs.paidPlanDesc")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.errorCodesTitle")}</h3>
        <div className="space-y-2">
          {[
            { code: "400", label: "INVALID_INPUT", desc: t("firewallDocs.err400") },
            { code: "400", label: "INPUT_TOO_LONG", desc: t("firewallDocs.err400Long") },
            { code: "401", label: "AUTH_REQUIRED", desc: t("firewallDocs.err401") },
            { code: "401", label: "AUTH_INVALID_KEY", desc: t("firewallDocs.err401Key") },
            { code: "429", label: "RATE_LIMIT_EXCEEDED", desc: t("firewallDocs.err429") },
            { code: "500", label: "ANALYSIS_FAILED", desc: t("firewallDocs.err500") },
          ].map((e, i) => (
            <div key={i} className="flex items-start gap-3 text-xs bg-card/40 border border-border/20 rounded-lg p-3">
              <span className={`font-mono font-bold shrink-0 ${e.code.startsWith("4") ? "text-yellow-400" : "text-red-400"}`}>{e.code}</span>
              <code className="text-primary font-mono shrink-0">{e.label}</code>
              <span className="text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.rateLimitResponseTitle")}</h3>
        <CodeBlock code={`{
  "error": "Your free trial includes 25 scans. Upgrade for unlimited scans.",
  "code": "RATE_LIMIT_EXCEEDED",
  "upgrade": true,
  "limit": 25,
  "used": 25,
  "details": { "upgrade": true, "limit": 25, "used": 25 },
  "meta": { "version": "1.0", "timestamp": "...", "requestId": "..." }
}`} lang="json" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.inputLimitsTitle")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card/40 border border-border/20 rounded-lg p-3">
            <h4 className="text-xs font-bold text-foreground mb-1">{t("firewallDocs.maxLength")}</h4>
            <p className="text-xs text-muted-foreground">{t("firewallDocs.maxLengthDesc")}</p>
          </div>
          <div className="bg-card/40 border border-border/20 rounded-lg p-3">
            <h4 className="text-xs font-bold text-foreground mb-1">{t("firewallDocs.minLength")}</h4>
            <p className="text-xs text-muted-foreground">{t("firewallDocs.minLengthDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformsSection() {
  const { t } = useTranslation();
  const platforms = [
    {
      name: "ChatGPT",
      hosts: "chat.openai.com, chatgpt.com",
      selectors: '#prompt-textarea, div[contenteditable="true"][id="prompt-textarea"]',
      sendBtn: 'button[data-testid="send-button"]',
    },
    {
      name: "Claude",
      hosts: "claude.ai",
      selectors: 'div[contenteditable="true"].ProseMirror',
      sendBtn: 'button[aria-label="Send Message"]',
    },
    {
      name: "Gemini",
      hosts: "gemini.google.com",
      selectors: '.ql-editor[contenteditable="true"]',
      sendBtn: 'button[aria-label="Send message"]',
    },
    {
      name: "Replit",
      hosts: "replit.com",
      selectors: 'textarea[placeholder*="Ask"]',
      sendBtn: 'button[aria-label="Send"]',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.platformsTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.platformsDesc")}</p>
      </div>

      <div className="space-y-4">
        {platforms.map((p) => (
          <div key={p.name} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
              <span className="text-xs text-muted-foreground font-mono">{p.hosts}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">{t("firewallDocs.inputSelector")}</span>
                <code className="block text-primary/80 font-mono mt-0.5 break-all">{p.selectors}</code>
              </div>
              <div>
                <span className="text-muted-foreground/60 uppercase tracking-wider text-[10px]">{t("firewallDocs.sendButton")}</span>
                <code className="block text-primary/80 font-mono mt-0.5 break-all">{p.sendBtn}</code>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.addPlatformTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.addPlatformDesc")}</p>
        <CodeBlock code={`// Add to PLATFORMS object in content.js
myPlatform: {
  hostPatterns: ["my-ai-tool.com"],
  name: "My AI Tool",
  inputSelectors: [
    'textarea[data-prompt]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  sendButtonSelectors: [
    'button[type="submit"]',
    'button[aria-label="Send"]',
  ],
  getInputText(el) {
    if (el.tagName === "TEXTAREA") return el.value;
    return el.innerText || el.textContent || "";
  },
  setInputText(el, text) {
    if (el.tagName === "TEXTAREA") {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
    }
  },
}`} lang="javascript" />
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-300/80">{t("firewallDocs.addPlatformWarning")}</p>
        </div>
      </div>
    </div>
  );
}

function ApiKeySection() {
  const { t } = useTranslation();
  const origin = window.location.origin;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.apiKeyTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.apiKeyDesc")}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.apiKeyStepsTitle")}</h3>
        <div className="space-y-3">
          {[
            t("firewallDocs.apiKeyStep1"),
            t("firewallDocs.apiKeyStep2"),
            t("firewallDocs.apiKeyStep3"),
            t("firewallDocs.apiKeyStep4"),
            t("firewallDocs.apiKeyStep5"),
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm bg-card/40 border border-border/20 rounded-lg p-3">
              <span className="text-primary font-bold shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">{i + 1}</span>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.apiKeyTestTitle")}</h3>
        <CodeBlock code={`curl -H "Authorization: Bearer eak_your_api_key" \\
  ${origin}/api/dev/ping`} lang="bash" />
        <CodeBlock code={`import requests

API_KEY = "eak_your_api_key"
BASE_URL = "${origin}/api/dev"

response = requests.get(
    f"{BASE_URL}/ping",
    headers={"Authorization": f"Bearer {API_KEY}"}
)
print(response.json())  # {"ok": true, "meta": {...}}`} lang="python" />
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300/80">{t("firewallDocs.apiKeyWarning")}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.apiKeyLimitsTitle")}</h3>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-card/40 border border-border/20 rounded-lg p-3 text-center">
            <div className="text-primary font-bold text-lg">5</div>
            <div className="text-muted-foreground">Developer</div>
          </div>
          <div className="bg-card/40 border border-border/20 rounded-lg p-3 text-center">
            <div className="text-violet-400 font-bold text-lg">20</div>
            <div className="text-muted-foreground">Team</div>
          </div>
          <div className="bg-card/40 border border-border/20 rounded-lg p-3 text-center">
            <div className="text-yellow-400 font-bold text-lg">100</div>
            <div className="text-muted-foreground">Enterprise</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VSCodeSection() {
  const { t } = useTranslation();
  const origin = window.location.origin;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.vscodeTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.vscodeDesc")}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.vscodeSettingsTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.vscodeSettingsDesc")}</p>
        <CodeBlock code={`// .vscode/settings.json
{
  "eraseai.apiKey": "eak_your_api_key",
  "eraseai.apiUrl": "${origin}/api/dev",
  "eraseai.autoScan": true,
  "eraseai.blockOnHighRisk": true,
  "eraseai.scanOnSave": true
}`} lang="json" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.vscodePreCommitTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.vscodePreCommitDesc")}</p>
        <CodeBlock code={`#!/bin/bash
# .git/hooks/pre-commit — EraseAI Firewall pre-commit hook

API_KEY="eak_your_api_key"
API_URL="${origin}/api/dev"
EXIT_CODE=0

for file in $(git diff --cached --name-only --diff-filter=ACM); do
  content=$(git show ":$file" | head -c 10000)
  if [ -z "$content" ]; then continue; fi

  result=$(curl -s -X POST "$API_URL/analyze" \\
    -H "Authorization: Bearer $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"text\\": $(echo "$content" | jq -Rs .)}")

  score=$(echo "$result" | jq -r '.riskScore // 100')
  level=$(echo "$result" | jq -r '.level // "safe"')

  if [ "$level" = "danger" ]; then
    echo "❌ BLOCKED: $file (safety score: $score)"
    echo "   $(echo "$result" | jq -r '.summary')"
    EXIT_CODE=1
  elif [ "$level" = "caution" ]; then
    echo "⚠️  WARNING: $file (safety score: $score)"
    echo "   $(echo "$result" | jq -r '.summary')"
  fi
done

exit $EXIT_CODE`} lang="bash" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.vscodePythonTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.vscodePythonDesc")}</p>
        <CodeBlock code={`import requests
import sys
import json

API_KEY = "eak_your_api_key"
BASE_URL = "${origin}/api/dev"

def analyze_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()[:10000]

    response = requests.post(
        f"{BASE_URL}/analyze",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={"text": content}
    )
    result = response.json()
    score = result.get("riskScore", 100)
    level = result.get("level", "safe")
    issues = result.get("issues", [])

    print(f"[{level.upper()}] {filepath} — safety score: {score}")
    for issue in issues:
        print(f"  [{issue['severity']}] {issue['detail']}")

    return level != "danger"

def sanitize_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()[:10000]

    response = requests.post(
        f"{BASE_URL}/sanitize",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={"text": content}
    )
    result = response.json()
    print(f"Applied {result['changeCount']} changes")
    for change in result.get("changes", []):
        print(f"  {change['category']}: {change['original']} → {change['replacement']}")

    return result["sanitized"]

if __name__ == "__main__":
    for filepath in sys.argv[1:]:
        analyze_file(filepath)`} lang="python" />
      </div>
    </div>
  );
}

function ReplitSection() {
  const { t } = useTranslation();
  const origin = window.location.origin;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.replitTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.replitDesc")}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.replitMiddlewareTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.replitMiddlewareDesc")}</p>
        <CodeBlock code={`// eraseai-middleware.js — Wrap AI SDK calls with EraseAI scanning
const API_KEY = process.env.ERASEAI_API_KEY;
const API_URL = "${origin}/api/dev";

async function scanBeforeSend(prompt) {
  const res = await fetch(API_URL + "/analyze", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: prompt })
  });

  const result = await res.json();
  if (result.level === "danger") {
    throw new Error(
      "EraseAI blocked: " + result.summary
    );
  }

  if (result.level === "caution") {
    const sanitized = await fetch(API_URL + "/sanitize", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: prompt })
    });
    const cleaned = await sanitized.json();
    return cleaned.sanitized;
  }

  return prompt; // safe — pass through
}

module.exports = { scanBeforeSend };`} lang="javascript" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.replitUsageTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.replitUsageDesc")}</p>
        <CodeBlock code={`const { scanBeforeSend } = require("./eraseai-middleware");
const { OpenAI } = require("openai");

const openai = new OpenAI();

async function chat(userPrompt) {
  // Scan & sanitize before sending to AI
  const safePrompt = await scanBeforeSend(userPrompt);

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: safePrompt }]
  });

  return response.choices[0].message.content;
}`} lang="javascript" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.replitPythonTitle")}</h3>
        <CodeBlock code={`import requests
import os

ERASEAI_KEY = os.environ["ERASEAI_API_KEY"]
ERASEAI_URL = "${origin}/api/dev"

def firewall_scan(prompt: str) -> str:
    """Scan prompt through EraseAI firewall, sanitize if needed."""
    headers = {
        "Authorization": f"Bearer {ERASEAI_KEY}",
        "Content-Type": "application/json"
    }

    # Step 1: Analyze
    analysis = requests.post(
        f"{ERASEAI_URL}/analyze",
        headers=headers,
        json={"text": prompt}
    ).json()

    if analysis["level"] == "danger":
        raise ValueError(f"Blocked by EraseAI: {analysis['summary']}")

    if analysis["level"] == "caution":
        # Step 2: Auto-sanitize
        sanitized = requests.post(
            f"{ERASEAI_URL}/sanitize",
            headers=headers,
            json={"text": prompt}
        ).json()
        return sanitized["sanitized"]

    return prompt  # safe`} lang="python" />
      </div>
    </div>
  );
}

function XcodeSection() {
  const { t } = useTranslation();
  const origin = window.location.origin;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.xcodeTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.xcodeDesc")}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.xcodeSwiftTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.xcodeSwiftDesc")}</p>
        <CodeBlock code={`import Foundation

struct EraseAIFirewall {
    let apiKey: String
    let baseURL: String

    init(apiKey: String, baseURL: String = "${origin}/api/dev") {
        self.apiKey = apiKey
        self.baseURL = baseURL
    }

    struct AnalyzeResult: Codable {
        let riskScore: Int
        let level: String
        let issues: [Issue]
        let suggestions: [Suggestion]
        let summary: String
    }

    struct Issue: Codable {
        let category: String
        let severity: String
        let detail: String
    }

    struct Suggestion: Codable {
        let action: String
        let detail: String
    }

    struct SanitizeResult: Codable {
        let sanitized: String
        let changeCount: Int
    }

    func analyze(text: String) async throws -> AnalyzeResult {
        var request = URLRequest(
            url: URL(string: "\\(baseURL)/analyze")!
        )
        request.httpMethod = "POST"
        request.setValue("Bearer \\(apiKey)",
            forHTTPHeaderField: "Authorization")
        request.setValue("application/json",
            forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(
            ["text": text]
        )

        let (data, _) = try await URLSession.shared.data(
            for: request
        )
        return try JSONDecoder().decode(
            AnalyzeResult.self, from: data
        )
    }

    func sanitize(text: String) async throws -> SanitizeResult {
        var request = URLRequest(
            url: URL(string: "\\(baseURL)/sanitize")!
        )
        request.httpMethod = "POST"
        request.setValue("Bearer \\(apiKey)",
            forHTTPHeaderField: "Authorization")
        request.setValue("application/json",
            forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(
            ["text": text]
        )

        let (data, _) = try await URLSession.shared.data(
            for: request
        )
        return try JSONDecoder().decode(
            SanitizeResult.self, from: data
        )
    }
}`} lang="javascript" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.xcodeBuildPhaseTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.xcodeBuildPhaseDesc")}</p>
        <CodeBlock code={`#!/bin/bash
# Xcode Build Phase Script — EraseAI Pre-Build Scan
# Add as: Build Phases → New Run Script Phase

API_KEY="$ERASEAI_API_KEY"
API_URL="${origin}/api/dev"

if [ -z "$API_KEY" ]; then
  echo "warning: ERASEAI_API_KEY not set, skipping scan"
  exit 0
fi

BLOCKED=0
for file in $(find "$SRCROOT" -name "*.swift" -newer "$BUILT_PRODUCTS_DIR"); do
  content=$(head -c 10000 "$file")
  if [ -z "$content" ]; then continue; fi

  result=$(curl -s -X POST "$API_URL/analyze" \\
    -H "Authorization: Bearer $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"text\\": $(echo "$content" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}")

  level=$(echo "$result" | python3 -c "import json,sys; print(json.loads(sys.stdin.read()).get('level','safe'))")

  if [ "$level" = "danger" ]; then
    echo "error: EraseAI blocked $file — contains secrets or PII"
    BLOCKED=1
  fi
done

exit $BLOCKED`} lang="bash" />
      </div>
    </div>
  );
}

function TroubleshootingSection() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("firewallDocs.troubleshootTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("firewallDocs.troubleshootDesc")}</p>
      </div>

      <div className="space-y-4">
        {[
          {
            q: t("firewallDocs.troubleQ1"),
            a: t("firewallDocs.troubleA1"),
          },
          {
            q: t("firewallDocs.troubleQ2"),
            a: t("firewallDocs.troubleA2"),
          },
          {
            q: t("firewallDocs.troubleQ3"),
            a: t("firewallDocs.troubleA3"),
          },
          {
            q: t("firewallDocs.troubleQ4"),
            a: t("firewallDocs.troubleA4"),
          },
          {
            q: t("firewallDocs.troubleQ5"),
            a: t("firewallDocs.troubleA5"),
          },
        ].map((item, i) => (
          <div key={i} className="bg-card/40 border border-border/20 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">{item.q}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">{t("firewallDocs.scoreExplainTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("firewallDocs.scoreExplainDesc")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-1">
            <h4 className="text-xs font-bold text-red-400">{t("firewallDocs.scoreDanger")}</h4>
            <p className="text-[11px] text-muted-foreground">{t("firewallDocs.scoreDangerDesc")}</p>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 space-y-1">
            <h4 className="text-xs font-bold text-yellow-400">{t("firewallDocs.scoreCaution")}</h4>
            <p className="text-[11px] text-muted-foreground">{t("firewallDocs.scoreCautionDesc")}</p>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1">
            <h4 className="text-xs font-bold text-green-400">{t("firewallDocs.scoreSafe")}</h4>
            <p className="text-[11px] text-muted-foreground">{t("firewallDocs.scoreSafeDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FirewallDocs({ onBack, onUpgrade, onDevMode, onOpenPublishing }: FirewallDocsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const plan = user?.planType || "free";
  const showUpgrade = plan === "free" && !!onUpgrade;

  const navItems: { id: SectionId; icon: typeof Shield; label: string }[] = [
    { id: "overview", icon: Shield, label: t("firewallDocs.navOverview") },
    { id: "apikey", icon: Key, label: t("firewallDocs.navApiKey") },
    { id: "install", icon: Download, label: t("firewallDocs.navInstall") },
    { id: "endpoints", icon: Terminal, label: t("firewallDocs.navEndpoints") },
    { id: "extension", icon: Puzzle, label: t("firewallDocs.navExtension") },
    { id: "vscode", icon: Code2, label: t("firewallDocs.navVSCode") },
    { id: "replit", icon: Laptop, label: t("firewallDocs.navReplit") },
    { id: "xcode", icon: Smartphone, label: t("firewallDocs.navXcode") },
    { id: "ratelimits", icon: Gauge, label: t("firewallDocs.navRateLimits") },
    { id: "platforms", icon: Globe, label: t("firewallDocs.navPlatforms") },
    { id: "troubleshooting", icon: HelpCircle, label: t("firewallDocs.navTroubleshoot") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-muted/30 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <Shield className="w-7 h-7 text-primary" />
                {t("firewallDocs.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t("firewallDocs.subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <nav className="lg:w-56 shrink-0">
              <div className="sticky top-8 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      activeSection === item.id
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            <main className="flex-1 min-w-0">
              {activeSection === "overview" && <OverviewSection />}
              {activeSection === "apikey" && <ApiKeySection />}
              {activeSection === "install" && <InstallSection onOpenPublishing={onOpenPublishing || (() => {})} />}
              {activeSection === "endpoints" && <EndpointsSection />}
              {activeSection === "extension" && <ExtensionSection />}
              {activeSection === "vscode" && <VSCodeSection />}
              {activeSection === "replit" && <ReplitSection />}
              {activeSection === "xcode" && <XcodeSection />}
              {activeSection === "ratelimits" && <RateLimitsSection />}
              {activeSection === "platforms" && <PlatformsSection />}
              {activeSection === "troubleshooting" && <TroubleshootingSection />}

              {onDevMode && (
                <div className="mt-8 bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
                  <Terminal className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground mb-1">{t("firewallDocs.devModeTitle")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t("firewallDocs.devModeDesc")}</p>
                    <button
                      onClick={onDevMode}
                      className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
                    >
                      {t("firewallDocs.devModeCta")}
                    </button>
                  </div>
                </div>
              )}

              {showUpgrade && (
                <div className="mt-4 bg-primary/5 border border-primary/30 rounded-xl p-5 flex items-start gap-4">
                  <Crown className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground mb-1">{t("firewallDocs.upgradeTitle")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t("firewallDocs.upgradeDesc")}</p>
                    <button
                      onClick={onUpgrade}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      {t("firewallDocs.upgradeCta")}
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
