import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@workspace/replit-auth-web";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  ArrowLeft,
  Code,
  Shield,
  Clock,
  Crown,
} from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`;

interface ApiKeyInfo {
  id: string;
  prefix: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  active: boolean;
}

function CodeSnippet({ apiKey }: { apiKey: string | null }) {
  const { t } = useTranslation();
  const displayKey = apiKey || "eak_your_api_key_here";
  const snippet = `curl -X POST ${window.location.origin}/api/v1/datasets/upload \\
  -H "Authorization: Bearer ${displayKey}" \\
  -F "file=@dataset.csv"

curl ${window.location.origin}/api/v1/datasets/1/result \\
  -H "Authorization: Bearer ${displayKey}"`;

  const [copied, setCopied] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          {t("developer.quickStart")}
        </h4>
        <button
          onClick={() => {
            navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? t("developer.copied") : t("developer.copySnippet")}
        </button>
      </div>
      <pre className="bg-black/40 rounded-lg p-4 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap border border-border/30">
        {snippet}
      </pre>
    </div>
  );
}

function EndpointDoc() {
  const { t } = useTranslation();
  const endpoints = [
    { method: "POST", path: "/api/v1/datasets/upload", desc: t("developer.endpointUpload") },
    { method: "GET", path: "/api/v1/datasets", desc: t("developer.endpointList") },
    { method: "POST", path: "/api/v1/datasets/:id/analyze", desc: t("developer.endpointAnalyze") },
    { method: "GET", path: "/api/v1/datasets/:id/result", desc: t("developer.endpointResult") },
    { method: "GET", path: "/api/v1/datasets/:id/download", desc: t("developer.endpointDownload") },
  ];

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-primary" />
        {t("developer.apiEndpoints")}
      </h4>
      <div className="space-y-2">
        {endpoints.map((ep) => (
          <div key={ep.path} className="flex items-center gap-3 px-3 py-2 bg-muted/20 rounded-lg border border-border/20">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ep.method === "POST" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>
              {ep.method}
            </span>
            <code className="text-xs font-mono text-foreground/80 flex-1">{ep.path}</code>
            <span className="text-xs text-muted-foreground hidden sm:inline">{ep.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeveloperDashboard({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = user?.planType || "free";
  const hasAccess = plan !== "free";

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/developer/keys`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) fetchKeys();
    else setLoading(false);
  }, [hasAccess, fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/developer/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("developer.createFailed"));
        return;
      }
      setNewKeyValue(data.key);
      setNewKeyName("");
      fetchKeys();
    } catch {
      setError(t("developer.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`${API_BASE}/developer/keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch {
      // ignore
    }
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen w-full pb-20 relative">
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("developer.backToDashboard")}
          </button>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-primary/10 p-4 rounded-2xl mb-6">
              <Crown className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">{t("developer.upgradeTitle")}</h2>
            <p className="text-muted-foreground max-w-md mb-6">{t("developer.upgradeDesc")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pb-20 relative">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("developer.backToDashboard")}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 mb-2">
            <Key className="w-8 h-8 text-primary" />
            {t("developer.title")}
          </h1>
          <p className="text-muted-foreground">{t("developer.subtitle")}</p>
        </motion.div>

        <div className="space-y-6">
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{t("developer.apiKeys")}</h3>
              {!showCreate && !newKeyValue && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("developer.generateKey")}
                </button>
              )}
            </div>

            <AnimatePresence>
              {newKeyValue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-green-400">{t("developer.keyCreated")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{t("developer.keyCreatedWarning")}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-black/40 rounded px-3 py-2 text-xs text-green-400 font-mono overflow-x-auto">
                        {newKeyValue}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(newKeyValue);
                          setKeyCopied(true);
                          setTimeout(() => setKeyCopied(false), 2000);
                        }}
                        className="px-3 py-2 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors flex items-center gap-1"
                      >
                        {keyCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {keyCopied ? t("developer.copied") : t("developer.copy")}
                      </button>
                    </div>
                    <button
                      onClick={() => { setNewKeyValue(null); setShowCreate(false); }}
                      className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("developer.dismiss")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCreate && !newKeyValue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <div className="bg-muted/20 border border-border/30 rounded-lg p-4">
                    <label className="block text-sm font-medium text-foreground mb-2">{t("developer.keyName")}</label>
                    <div className="flex gap-2">
                      <input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder={t("developer.keyNamePlaceholder")}
                        className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        onKeyDown={(e) => e.key === "Enter" && createKey()}
                      />
                      <button
                        onClick={createKey}
                        disabled={creating || !newKeyName.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {creating ? t("developer.creating") : t("developer.create")}
                      </button>
                      <button
                        onClick={() => { setShowCreate(false); setNewKeyName(""); setError(null); }}
                        className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                      >
                        {t("developer.cancel")}
                      </button>
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-destructive">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t("developer.loading")}</div>
            ) : keys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("developer.noKeys")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                      key.active
                        ? "bg-muted/10 border-border/30 hover:border-border/50"
                        : "bg-muted/5 border-border/10 opacity-60"
                    }`}
                  >
                    <Key className={`w-4 h-4 ${key.active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{key.name}</span>
                        <code className="text-xs text-muted-foreground font-mono">{key.prefix}...</code>
                        {!key.active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium">
                            {t("developer.revoked")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t("developer.created")} {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                        {key.lastUsedAt && (
                          <span>{t("developer.lastUsed")} {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    {key.active && (
                      <button
                        onClick={() => revokeKey(key.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                        title={t("developer.revokeKey")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-md">
            <CodeSnippet apiKey={newKeyValue} />
          </div>

          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-md">
            <EndpointDoc />
          </div>
        </div>
      </div>
    </div>
  );
}
