import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Database,
  Shield,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Code,
  Loader2,
  Crown,
  PieChart,
  Activity,
  Zap,
  XCircle,
} from "lucide-react";

const API_BASE = `${import.meta.env.BASE_URL}api`;

interface AnalyticsData {
  overview: {
    totalDatasets: number;
    totalVersions: number;
    totalRows: number;
    datasetsAnalyzed: number;
    activeDatasets: number;
    erasedDatasets: number;
  };
  processingActivity: {
    operationsByType: { type: string; count: number; totalAffected: number }[];
    dailyActivity: { date: string; operations: number }[];
    dailyByType: { date: string; type: string; count: number }[];
  };
  qualityInsights: {
    issuesByType: { type: string; count: number }[];
    issuesBySeverity: { severity: string; count: number }[];
    totalIssues: number;
  };
  erasureMetrics: {
    totalOperations: number;
    totalAffectedRows: number;
    removedRows: number;
    redactedRows: number;
    forgetScore: number;
  };
  apiUsage: {
    byEndpoint: { endpoint: string; requests: number }[];
    dailyTrend: { date: string; requests: number }[];
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
  };
}

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: typeof Database;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-muted/30 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

function BarChart({ data, labelKey, valueKey, color = "bg-primary/60", hoverColor = "bg-primary", maxBars = 30, emptyText = "" }: {
  data: Record<string, any>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  hoverColor?: string;
  maxBars?: number;
  emptyText?: string;
}) {
  const sliced = data.slice(-maxBars);
  const maxVal = Math.max(...sliced.map((d) => d[valueKey] as number), 1);

  if (sliced.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">{emptyText}</div>;
  }

  return (
    <div className="flex items-end gap-1 h-32">
      {sliced.map((item, i) => {
        const height = Math.max(4, ((item[valueKey] as number) / maxVal) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {item[labelKey]}: {(item[valueKey] as number).toLocaleString()}
            </div>
            <div
              className={`w-full ${color} hover:${hoverColor} rounded-t transition-colors`}
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBar({ items, color = "bg-primary", emptyText = "" }: {
  items: { label: string; value: number; color?: string }[];
  color?: string;
  emptyText?: string;
}) {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-4">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = (item.value / maxVal) * 100;
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground/80 truncate max-w-[60%]">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value.toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${item.color || color}`}
                initial={{ width: "0%" }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments, emptyText = "" }: { segments: { label: string; value: number; color: string }[]; emptyText?: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">{emptyText}</div>;
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 100 100" className="shrink-0">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const dashOff = offset;
          offset += dashLen;
          return (
            <circle
              key={i}
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-dashOff}
              className="transition-all duration-500"
            />
          );
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="14" fontWeight="bold">
          {total.toLocaleString()}
        </text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-sm text-foreground/80 flex-1">{seg.label}</span>
            <span className="text-sm font-medium text-foreground">{seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ISSUE_TYPE_COLORS: Record<string, string> = {
  pii: "#06B6D4",
  bias: "#F59E0B",
  toxic: "#EF4444",
  duplicate: "#8B5CF6",
  quality: "#10B981",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#10B981",
};

export default function AnalyticsDashboard({ onBack, onUpgrade }: { onBack: () => void; onUpgrade: () => void }) {
  const { t } = useTranslation();

  const ISSUE_TYPE_LABELS: Record<string, string> = {
    pii: t("analytics.issuePii"),
    bias: t("analytics.issueBias"),
    toxic: t("analytics.issueToxic"),
    duplicate: t("analytics.issueDuplicates"),
    quality: t("analytics.issueQuality"),
  };
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const plan = user?.planType || "free";
  const hasAccess = plan === "business" || plan === "enterprise";

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics`, { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || t("analytics.loadFailed"));
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 flex items-center justify-center">
            <Crown className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t("analytics.upgradeTitle")}</h2>
          <p className="text-muted-foreground">{t("analytics.upgradeDesc")}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/30 transition-colors text-sm"
            >
              {t("analytics.back")}
            </button>
            <button
              onClick={onUpgrade}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
            >
              {t("analytics.upgradeCta")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{t("analytics.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">{error || t("analytics.loadFailed")}</p>
          <button onClick={onBack} className="text-primary hover:underline text-sm">
            {t("analytics.back")}
          </button>
        </div>
      </div>
    );
  }

  const issueSegments = data.qualityInsights.issuesByType.map((i) => ({
    label: ISSUE_TYPE_LABELS[i.type] || i.type,
    value: i.count,
    color: ISSUE_TYPE_COLORS[i.type] || "#6B7280",
  }));

  const severitySegments = data.qualityInsights.issuesBySeverity.map((s) => ({
    label: s.severity.charAt(0).toUpperCase() + s.severity.slice(1),
    value: s.count,
    color: SEVERITY_COLORS[s.severity] || "#6B7280",
  }));

  const opItems = data.processingActivity.operationsByType.map((o) => ({
    label: o.type.charAt(0).toUpperCase() + o.type.slice(1).replace("-", " "),
    value: o.count,
    color: o.type === "delete" ? "bg-red-500" : o.type === "redact" ? "bg-yellow-500" : o.type === "auto-fix" ? "bg-green-500" : "bg-primary",
  }));

  const endpointItems = data.apiUsage.byEndpoint.map((e) => ({
    label: e.endpoint,
    value: e.requests,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                {t("analytics.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t("analytics.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Database}
            label={t("analytics.totalDatasets")}
            value={data.overview.totalDatasets}
            sub={`${data.overview.totalVersions} ${t("analytics.versions")}`}
          />
          <StatCard
            icon={Activity}
            label={t("analytics.totalRows")}
            value={data.overview.totalRows}
            color="text-green-400"
          />
          <StatCard
            icon={Shield}
            label={t("analytics.datasetsAnalyzed")}
            value={data.overview.datasetsAnalyzed}
            color="text-cyan-400"
          />
          <StatCard
            icon={AlertTriangle}
            label={t("analytics.issuesDetected")}
            value={data.qualityInsights.totalIssues}
            color="text-yellow-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-primary" />
              {t("analytics.datasetStatus")}
            </h3>
            <DonutChart
              segments={[
                { label: t("analytics.active"), value: data.overview.activeDatasets, color: "#10B981" },
                { label: t("analytics.erased"), value: data.overview.erasedDatasets, color: "#EF4444" },
              ]}
              emptyText={t("analytics.noData")}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-cyan-400" />
              {t("analytics.forgetScore")}
            </h3>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="#06B6D4" strokeWidth="8"
                    strokeDasharray={`${(data.erasureMetrics.forgetScore / 100) * 251.3} 251.3`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{data.erasureMetrics.forgetScore}%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">{t("analytics.forgetScoreDesc")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-cyan-400" />
              {t("analytics.issueBreakdown")}
            </h3>
            <DonutChart segments={issueSegments} emptyText={t("analytics.noData")} />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t("analytics.processingActivity")}
            </h3>
            <BarChart data={data.processingActivity.dailyActivity} labelKey="date" valueKey="operations" emptyText={t("analytics.noData")} />
            <p className="text-xs text-muted-foreground mt-2">{t("analytics.last30Days")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-green-400" />
              {t("analytics.apiSuccessError")}
            </h3>
            <DonutChart
              segments={[
                { label: t("analytics.successRate"), value: data.apiUsage.totalRequests - data.apiUsage.totalErrors, color: "#10B981" },
                { label: t("analytics.errors"), value: data.apiUsage.totalErrors, color: "#EF4444" },
              ]}
              emptyText={t("analytics.noData")}
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Trash2 className="w-4 h-4 text-red-400" />
              {t("analytics.erasureMetrics")}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("analytics.totalOperations")}</span>
                <span className="text-lg font-bold text-foreground">{data.erasureMetrics.totalOperations.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("analytics.rowsAffected")}</span>
                <span className="text-lg font-bold text-foreground">{data.erasureMetrics.totalAffectedRows.toLocaleString()}</span>
              </div>
              <div className="border-t border-border/30 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-foreground/80">{t("analytics.removed")}</span>
                  </div>
                  <span className="text-sm font-medium">{data.erasureMetrics.removedRows.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm text-foreground/80">{t("analytics.redacted")}</span>
                  </div>
                  <span className="text-sm font-medium">{data.erasureMetrics.redactedRows.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-amber-400" />
              {t("analytics.severityBreakdown")}
            </h3>
            <DonutChart segments={severitySegments} emptyText={t("analytics.noData")} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Code className="w-4 h-4 text-green-400" />
              {t("analytics.operationsByType")}
            </h3>
            <HorizontalBar items={opItems} emptyText={t("analytics.noData")} />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              {t("analytics.apiUsage")}
            </h3>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <div className="text-2xl font-bold text-foreground">{data.apiUsage.totalRequests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{t("analytics.totalRequests")}</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{data.apiUsage.errorRate}%</div>
                <p className="text-xs text-muted-foreground">{t("analytics.errorRate")}</p>
              </div>
            </div>
            <BarChart data={data.apiUsage.dailyTrend} labelKey="date" valueKey="requests" color="bg-cyan-500/60" emptyText={t("analytics.noData")} />
            <p className="text-xs text-muted-foreground mt-2">{t("analytics.last30Days")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl p-6"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              {t("analytics.topEndpoints")}
            </h3>
            <HorizontalBar items={endpointItems} color="bg-violet-500" emptyText={t("analytics.noData")} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
