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
  BarChart3,
  TrendingUp,
  Zap,
  Webhook,
  Send,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CheckCircle2,
  XCircle,
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

interface UsageData {
  used: number;
  limit: number | null;
  unlimited: boolean;
  remaining: number | null;
  percentUsed: number;
  periodStart: string;
  periodEnd: string;
  dailyBreakdown: { date: string; requests: number }[];
  spend?: {
    usedMicros: number;
    limitMicros: number | null;
    unlimited: boolean;
    noAccess: boolean;
    remainingMicros: number | null;
    percentUsed: number;
    tokensUsed: number;
    overrideActive: boolean;
    usedUsd: number;
    limitUsd: number | null;
  };
}

function formatUsd(amount: number): string {
  if (amount >= 100) return `$${amount.toFixed(0)}`;
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  return `$${amount.toFixed(4)}`;
}

function SpendMeter({ spend }: { spend: NonNullable<UsageData["spend"]> }) {
  const { t } = useTranslation();
  const percent = spend.unlimited ? 0 : spend.percentUsed;
  const barColor = percent >= 90 ? "bg-red-500" : percent >= 75 ? "bg-yellow-500" : "bg-primary";

  return (
    <div className="space-y-3 pt-5 mt-5 border-t border-border/40">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            {formatUsd(spend.usedUsd)}
            {!spend.unlimited && spend.limitUsd !== null && (
              <span className="text-base font-normal text-muted-foreground">
                / {formatUsd(spend.limitUsd)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("developer.spendThisMonth")}
            {spend.overrideActive && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium align-middle">
                {t("developer.spendOverrideActive")}
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          {spend.unlimited ? (
            <span className="text-sm font-medium text-green-400">{t("developer.unlimited")}</span>
          ) : (
            <span className={`text-sm font-medium ${percent >= 90 ? "text-red-400" : percent >= 75 ? "text-yellow-400" : "text-primary"}`}>
              {spend.remainingMicros !== null ? formatUsd(spend.remainingMicros / 1_000_000) : ""} {t("developer.remaining")}
            </span>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {spend.tokensUsed.toLocaleString()} {t("developer.tokensUsed")}
          </p>
        </div>
      </div>

      {!spend.unlimited && (
        <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(percent, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("developer.spendCapDescription")}
      </p>
    </div>
  );
}

function UsageMeter({ usage, onUpgrade }: { usage: UsageData | null; onUpgrade?: () => void }) {
  const { t } = useTranslation();

  if (!usage) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">{t("developer.loadingUsage")}</div>
    );
  }

  const percent = usage.unlimited ? 0 : usage.percentUsed;
  const barColor = percent >= 90 ? "bg-red-500" : percent >= 75 ? "bg-yellow-500" : "bg-primary";
  const maxBarValue = Math.max(...(usage.dailyBreakdown.map((d) => d.requests)), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Zap className="w-5 h-5 text-primary" />
            {usage.used.toLocaleString()}
            {!usage.unlimited && (
              <span className="text-base font-normal text-muted-foreground">
                / {usage.limit?.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("developer.requestsThisMonth")}
          </p>
        </div>
        <div className="text-right">
          {usage.unlimited ? (
            <span className="text-sm font-medium text-green-400">{t("developer.unlimited")}</span>
          ) : (
            <span className={`text-sm font-medium ${percent >= 90 ? "text-red-400" : percent >= 75 ? "text-yellow-400" : "text-primary"}`}>
              {usage.remaining?.toLocaleString()} {t("developer.remaining")}
            </span>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("developer.resetsOn")} {new Date(usage.periodEnd).toLocaleDateString()}
          </p>
        </div>
      </div>

      {!usage.unlimited && (
        <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(percent, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}

      {!usage.unlimited && percent >= 80 && onUpgrade && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-300 flex-1">{t("developer.approachingLimit")}</span>
          <button
            onClick={onUpgrade}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {t("developer.upgradePlan")}
          </button>
        </div>
      )}

      {usage.dailyBreakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            {t("developer.dailyUsage")}
          </h4>
          <div className="flex items-end gap-1 h-24">
            {usage.dailyBreakdown.map((day) => {
              const height = Math.max(4, (day.requests / maxBarValue) * 100);
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {day.date}: {day.requests}
                  </div>
                  <div
                    className="w-full bg-primary/60 hover:bg-primary rounded-t transition-colors"
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {usage.spend && <SpendMeter spend={usage.spend} />}
    </div>
  );
}

interface WebhookInfo {
  id: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  responseStatus: number | null;
  attempt: number;
  success: boolean;
  deliveredAt: string;
}

function WebhookSection({ previewMode }: { previewMode?: boolean }) {
  const { t } = useTranslation();
  const [webhook, setWebhook] = useState<WebhookInfo | null>(previewMode ? {
    id: "demo-wh",
    url: "https://api.example.com/webhook",
    isActive: true,
    createdAt: new Date().toISOString(),
  } : null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(previewMode ? [
    { id: "del-1", event: "dataset.analyzed", responseStatus: 200, attempt: 1, success: true, deliveredAt: new Date().toISOString() },
    { id: "del-2", event: "alert.triggered", responseStatus: 200, attempt: 1, success: true, deliveredAt: new Date(Date.now() - 3600000).toISOString() },
  ] : []);
  const [loading, setLoading] = useState(!previewMode);
  const [webhookUrl, setWebhookUrl] = useState(previewMode ? "https://api.example.com/webhook" : "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhook = useCallback(async () => {
    if (previewMode) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/developer/webhooks`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWebhook(data.webhook);
        if (data.webhook) {
          setWebhookUrl(data.webhook.url);
          fetchDeliveries(data.webhook.id);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchDeliveries = async (webhookId: string) => {
    if (previewMode) return;
    try {
      const res = await fetch(`${API_BASE}/developer/webhooks/${webhookId}/deliveries`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries);
      }
    } catch {}
  };

  useEffect(() => { if (!previewMode) fetchWebhook(); }, [previewMode, fetchWebhook]);

  const saveWebhook = async () => {
    if (previewMode || !webhookUrl.trim()) return;
    setSaving(true);
    setError(null);
    setTestResult(null);
    try {
      if (webhook) {
        const res = await fetch(`${API_BASE}/developer/webhooks/${webhook.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: webhookUrl.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setWebhook(data.webhook);
      } else {
        const res = await fetch(`${API_BASE}/developer/webhooks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: webhookUrl.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setWebhook(data.webhook);
      }
    } catch {
      setError(t("developer.webhookSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (previewMode || !webhook) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/developer/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });
      if (res.ok) {
        const data = await res.json();
        setWebhook(data.webhook);
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const deleteWebhook = async () => {
    if (previewMode || !webhook) return;
    try {
      const res = await fetch(`${API_BASE}/developer/webhooks/${webhook.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setWebhook(null);
        setWebhookUrl("");
        setDeliveries([]);
        setTestResult(null);
      }
    } catch {}
  };

  const sendTest = async () => {
    if (previewMode || !webhook) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/developer/webhooks/${webhook.id}/test`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ success: false, message: data.error || t("developer.webhookTestFailed") });
      } else {
        setTestResult({ success: data.success, message: data.message });
      }
      fetchDeliveries(webhook.id);
    } catch {
      setTestResult({ success: false, message: t("developer.webhookTestFailed") });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">{t("developer.loading")}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">{t("developer.webhookUrl")}</label>
        <div className="flex gap-2">
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={(e) => e.key === "Enter" && saveWebhook()}
          />
          <button
            onClick={saveWebhook}
            disabled={saving || !webhookUrl.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? t("developer.saving") : webhook ? t("developer.update") : t("developer.save")}
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("developer.webhookDesc")}</p>
      </div>

      {webhook && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={toggleActive}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border/30 hover:bg-muted/20 transition-colors"
            >
              {webhook.isActive ? (
                <><ToggleRight className="w-5 h-5 text-green-400" /><span className="text-green-400">{t("developer.webhookActive")}</span></>
              ) : (
                <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground">{t("developer.webhookPaused")}</span></>
              )}
            </button>
            <button
              onClick={sendTest}
              disabled={testing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border/30 hover:bg-muted/20 transition-colors text-foreground"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("developer.sendTest")}
            </button>
            <button
              onClick={deleteWebhook}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-destructive/30 hover:bg-destructive/10 transition-colors text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              {t("developer.delete")}
            </button>
          </div>

          <AnimatePresence>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                  testResult.success
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                {testResult.message}
              </motion.div>
            )}
          </AnimatePresence>

          {deliveries.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t("developer.deliveryHistory")}</h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {deliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2 bg-muted/10 rounded-lg border border-border/20 text-xs">
                    {d.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="font-mono text-foreground/80">{d.event}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      d.responseStatus && d.responseStatus < 300 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {d.responseStatus || "ERR"}
                    </span>
                    <span className="text-muted-foreground">#{d.attempt}</span>
                    <span className="text-muted-foreground ml-auto">{new Date(d.deliveredAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/20">
        <p className="font-medium text-foreground/80">{t("developer.webhookEvents")}</p>
        <p><code className="text-primary/70">dataset.analyzed</code> — {t("developer.eventAnalyzed")}</p>
        <p><code className="text-primary/70">dataset.erased</code> — {t("developer.eventErased")}</p>
        <p><code className="text-primary/70">dataset.failed</code> — {t("developer.eventFailed")}</p>
      </div>
    </div>
  );
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

export default function DeveloperDashboard({ onBack, onUpgrade, previewMode }: { onBack: () => void; onUpgrade?: () => void; previewMode?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>(previewMode ? [
    { id: "demo-1", prefix: "era_demo", name: "Production API", createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString(), revokedAt: null, active: true },
    { id: "demo-2", prefix: "era_test", name: "Staging", createdAt: new Date().toISOString(), lastUsedAt: null, revokedAt: null, active: true },
  ] : []);
  const [loading, setLoading] = useState(!previewMode);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(previewMode ? {
    used: 2847,
    limit: 10000,
    unlimited: false,
    remaining: 7153,
    percentUsed: 28.47,
    periodStart: new Date().toISOString(),
    periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    dailyBreakdown: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
      requests: Math.floor(300 + Math.random() * 500),
    })),
    spend: {
      usedMicros: 14_237_000,
      limitMicros: 50_000_000,
      unlimited: false,
      noAccess: false,
      remainingMicros: 35_763_000,
      percentUsed: 28,
      tokensUsed: 2_847_400,
      overrideActive: false,
      usedUsd: 14.237,
      limitUsd: 50,
    },
  } : null);

  const plan = previewMode ? "pro" : (user?.planType || "free");
  const hasAccess = previewMode || plan !== "free";

  const fetchKeys = useCallback(async () => {
    if (previewMode) return;
    try {
      const res = await fetch(`${API_BASE}/developer/keys`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch {
    }
  }, [previewMode]);

  const fetchUsage = useCallback(async () => {
    if (previewMode) return;
    try {
      const res = await fetch(`${API_BASE}/developer/usage`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch {
    }
  }, [previewMode]);

  useEffect(() => {
    if (previewMode) return;
    if (hasAccess) {
      fetchKeys().finally(() => setLoading(false));
      fetchUsage();
    } else {
      setLoading(false);
    }
  }, [previewMode, hasAccess, fetchKeys, fetchUsage]);

  const createKey = async () => {
    if (previewMode || !newKeyName.trim()) return;
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
    if (previewMode) return;
    try {
      const res = await fetch(`${API_BASE}/developer/keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch {
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
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              {t("developer.apiUsage")}
            </h3>
            <UsageMeter usage={usage} onUpgrade={onUpgrade} />
          </div>

          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-md">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Webhook className="w-5 h-5 text-primary" />
              {t("developer.webhooks")}
            </h3>
            <WebhookSection previewMode={previewMode} />
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
