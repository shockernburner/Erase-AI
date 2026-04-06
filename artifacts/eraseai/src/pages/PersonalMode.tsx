import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  Zap,
  UserCheck,
  RefreshCw,
  Copy,
  Check,
  Filter,
  TrendingUp,
  Lock,
  Bell,
  BellOff,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Crown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface AnalysisFlag {
  type: "toxicity" | "hate_speech" | "pii" | "bias";
  severity: "low" | "medium" | "high";
  detail: string;
  matchedText: string;
  position: { start: number; end: number };
}

interface AnalysisSuggestion {
  type: string;
  message: string;
  original: string;
  suggested: string;
}

interface ScanResult {
  id: number;
  riskScore: number;
  level: "low" | "medium" | "high";
  breakdown: { toxicity: number; hateSpeech: number; pii: number; bias: number };
  flags: AnalysisFlag[];
  suggestions: AnalysisSuggestion[];
  createdAt: string;
}

interface HistoryScan {
  id: number;
  content: string;
  riskScore: number;
  level: string;
  flags: AnalysisFlag[];
  suggestions: AnalysisSuggestion[];
  createdAt: string;
}

interface TrendPoint {
  date: string;
  avgScore: number;
  count: number;
}

type ScanMode = "post" | "profile";

function RiskGauge({ score, level }: { score: number; level: string }) {
  const { t } = useTranslation();
  const color =
    level === "low" ? "text-emerald-400" : level === "medium" ? "text-yellow-400" : "text-red-400";
  const bgColor =
    level === "low" ? "bg-emerald-400/20" : level === "medium" ? "bg-yellow-400/20" : "bg-red-400/20";
  const borderColor =
    level === "low" ? "border-emerald-400/30" : level === "medium" ? "border-yellow-400/30" : "border-red-400/30";

  const Icon = level === "low" ? ShieldCheck : level === "medium" ? ShieldAlert : ShieldX;

  return (
    <div className={`flex items-center gap-4 p-5 rounded-xl border ${borderColor} ${bgColor}`}>
      <Icon className={`w-12 h-12 ${color}`} />
      <div>
        <div className={`text-4xl font-bold ${color}`}>{score}/100</div>
        <div className="text-sm text-muted-foreground">{t(`personal.risk.${level}`)}</div>
      </div>
      <div className="ml-auto flex-shrink-0">
        <div className="w-36 h-3 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${level === "low" ? "bg-emerald-400" : level === "medium" ? "bg-yellow-400" : "bg-red-400"}`}
          />
        </div>
      </div>
    </div>
  );
}

function FlagBadge({ flag }: { flag: AnalysisFlag }) {
  const { t } = useTranslation();
  const typeColors: Record<string, string> = {
    toxicity: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    hate_speech: "bg-red-500/20 text-red-400 border-red-500/30",
    pii: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    bias: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${typeColors[flag.type] || "bg-muted/20 text-muted-foreground border-border"}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase">{t(`personal.flagType.${flag.type}`)}</span>
          <span className="text-xs opacity-70">({t(`personal.severity.${flag.severity}`)})</span>
        </div>
        <p className="text-sm opacity-90">{flag.detail}</p>
        <p className="text-xs mt-1 opacity-60 font-mono truncate">"{flag.matchedText}"</p>
      </div>
    </div>
  );
}

function BreakdownChart({ breakdown }: { breakdown: ScanResult["breakdown"] }) {
  const { t } = useTranslation();
  const items = [
    { key: "toxicity", label: t("personal.category.toxicity"), value: breakdown.toxicity, color: "bg-orange-400" },
    { key: "hateSpeech", label: t("personal.category.hateSpeech"), value: breakdown.hateSpeech, color: "bg-red-400" },
    { key: "pii", label: t("personal.category.pii"), value: breakdown.pii, color: "bg-blue-400" },
    { key: "bias", label: t("personal.category.bias"), value: breakdown.bias, color: "bg-violet-400" },
  ];

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{t("personal.deductionBreakdown")}</h4>
      {items
        .filter((i) => i.value > 0)
        .map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 truncate">{item.label}</span>
            <div className="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / 100) * 100}%` }} />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-8 text-right">-{item.value}</span>
          </div>
        ))}
    </div>
  );
}

function RewritePanel({
  text,
  flags,
  onUpgrade,
}: {
  text: string;
  flags: AnalysisFlag[];
  onUpgrade: () => void;
}) {
  const { t } = useTranslation();
  const [rewritten, setRewritten] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rewriteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/personal/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, flags }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.upgrade) {
          onUpgrade();
          throw new Error("UPGRADE_REQUIRED");
        }
        throw new Error(data.error || "Rewrite failed");
      }
      return res.json() as Promise<{ rewritten: string }>;
    },
    onSuccess: (data) => {
      setRewritten(data.rewritten);
    },
  });

  const handleCopy = () => {
    if (rewritten) {
      navigator.clipboard.writeText(rewritten);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-card/50 border border-primary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          {t("personal.rewrite.title")}
        </h3>
        {!rewritten && (
          <button
            onClick={() => rewriteMutation.mutate()}
            disabled={rewriteMutation.isPending}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {rewriteMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {rewriteMutation.isPending ? t("personal.rewrite.rewriting") : t("personal.rewrite.rewriteBtn")}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("personal.rewrite.description")}</p>

      {rewriteMutation.isError && rewriteMutation.error?.message === "UPGRADE_REQUIRED" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <Lock className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-muted-foreground">{t("personal.rewrite.proRequired")}</span>
          <button
            onClick={onUpgrade}
            className="ml-auto px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {t("personal.upgradeCta")}
          </button>
        </div>
      )}

      {rewriteMutation.isError && rewriteMutation.error?.message !== "UPGRADE_REQUIRED" && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {t("personal.rewrite.failed")}
        </div>
      )}

      {rewritten && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-red-400 uppercase">{t("personal.rewrite.original")}</span>
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {text}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-400 uppercase">{t("personal.rewrite.safer")}</span>
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {rewritten}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("personal.rewrite.copied") : t("personal.rewrite.copy")}
            </button>
            <button
              onClick={() => {
                setRewritten(null);
                rewriteMutation.reset();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/20 text-muted-foreground text-xs font-medium hover:bg-muted/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t("personal.rewrite.tryAgain")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskTrendChart({ trend }: { trend: TrendPoint[] }) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return trend.map((p) => ({
      ...p,
      label: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }));
  }, [trend]);

  if (chartData.length < 2) return null;

  return (
    <div className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t("personal.history.trendTitle")}</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value}/100`, t("personal.history.avgScore")]}
            labelFormatter={(label: string) => label}
          />
          <ReferenceLine y={70} stroke="rgba(52,211,153,0.3)" strokeDasharray="5 5" />
          <ReferenceLine y={40} stroke="rgba(250,204,21,0.3)" strokeDasharray="5 5" />
          <Line
            type="monotone"
            dataKey="avgScore"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-emerald-400 inline-block" /> {t("personal.risk.low")} (70+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-yellow-400 inline-block" /> {t("personal.risk.medium")} (40-69)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-red-400 inline-block" /> {t("personal.risk.high")} (&lt;40)
        </span>
      </div>
    </div>
  );
}

function HistoryItem({ scan }: { scan: HistoryScan }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const color =
    scan.level === "low" ? "text-emerald-400" : scan.level === "medium" ? "text-yellow-400" : "text-red-400";
  const levelBg =
    scan.level === "low" ? "bg-emerald-400/10" : scan.level === "medium" ? "bg-yellow-400/10" : "bg-red-400/10";

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors text-left"
      >
        <div className={`text-lg font-bold ${color} w-12`}>{scan.riskScore}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBg} ${color}`}>
          {t(`personal.risk.${scan.level}`)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{scan.content}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(scan.createdAt).toLocaleString()} · {scan.flags.length} {t("personal.issues")}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && scan.flags.length > 0 && (
        <div className="px-3 pb-3 space-y-2">
          {scan.flags.map((flag, i) => (
            <FlagBadge key={i} flag={flag} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PersonalAlert {
  id: number;
  alertType: string;
  message: string;
  severity: string;
  relatedScanId: number | null;
  isRead: boolean;
  createdAt: string;
}

interface CategoryTimePoint {
  date: string;
  toxicity: number;
  hate_speech: number;
  pii: number;
  bias: number;
}

interface TrendsData {
  dailyTrend: { date: string; avgScore: number; count: number }[];
  rollingAvgSeries: { date: string; rollingAvg: number }[];
  categoryBreakdown: Record<string, number>;
  categoryTimeSeries: CategoryTimePoint[];
  comparison: {
    current: { avgScore: number | null; scanCount: number };
    previous: { avgScore: number | null; scanCount: number };
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  toxicity: "#f87171",
  hate_speech: "#fb923c",
  pii: "#a78bfa",
  bias: "#fbbf24",
};

const CATEGORY_I18N_KEYS: Record<string, string> = {
  toxicity: "personal.flagType.toxicity",
  hate_speech: "personal.flagType.hate_speech",
  pii: "personal.flagType.pii",
  bias: "personal.flagType.bias",
};

function AlertsPanel({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ["personal-alerts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/personal/alerts?limit=20`, { credentials: "include" });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json() as Promise<{ alerts: PersonalAlert[]; unreadCount: number }>;
    },
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/personal/alerts/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["personal-alerts"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/personal/alerts/read-all`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["personal-alerts"] }),
  });

  if (alertsQuery.data === null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md mb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">{t("personal.alerts.title")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("personal.alerts.proRequired")}</span>
          <button
            onClick={onUpgrade}
            className="ml-auto px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {t("personal.upgradeCta")}
          </button>
        </div>
      </motion.div>
    );
  }

  if (!alertsQuery.data || alertsQuery.data.alerts.length === 0) return null;

  const data = alertsQuery.data;

  const alertIcon = (type: string) => {
    switch (type) {
      case "risk_spike": return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case "new_category": return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case "trending_up": return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const severityColor = (severity: string) =>
    severity === "high" ? "border-red-400/30 bg-red-400/5" :
    severity === "medium" ? "border-yellow-400/30 bg-yellow-400/5" :
    "border-border/30 bg-card/50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{t("personal.alerts.title")}</span>
        {data.unreadCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] text-center">
            {data.unreadCount}
          </span>
        )}
        {data.unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="ml-auto text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <BellOff className="w-3 h-3" />
            {t("personal.alerts.markAllRead")}
          </button>
        )}
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {data.alerts.slice(0, 10).map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              alert.isRead ? "border-border/20 bg-card/30 opacity-60" : severityColor(alert.severity)
            }`}
          >
            <div className="mt-0.5">{alertIcon(alert.alertType)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {t(`personal.alerts.type.${alert.alertType}`)}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  alert.severity === "high" ? "bg-red-400/20 text-red-400" :
                  alert.severity === "medium" ? "bg-yellow-400/20 text-yellow-400" :
                  "bg-muted/30 text-muted-foreground"
                }`}>
                  {t(`personal.alerts.severity.${alert.severity}`)}
                </span>
              </div>
              <p className="text-sm text-foreground mt-1">{alert.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
            {!alert.isRead && (
              <button
                onClick={() => markRead.mutate(alert.id)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                title={t("personal.alerts.markRead")}
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TrendsPanel({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useTranslation();

  const trendsQuery = useQuery({
    queryKey: ["personal-trends"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/personal/trends`, { credentials: "include" });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json() as Promise<TrendsData>;
    },
    staleTime: 60_000,
  });

  if (trendsQuery.data === null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md mb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">{t("personal.trends.title")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("personal.trends.proRequired")}</span>
          <button
            onClick={onUpgrade}
            className="ml-auto px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {t("personal.upgradeCta")}
          </button>
        </div>
      </motion.div>
    );
  }

  if (!trendsQuery.data) return null;

  const data = trendsQuery.data;
  const hasData = data.dailyTrend.length > 0;
  const scoreDelta = data.comparison.current.avgScore !== null && data.comparison.previous.avgScore !== null
    ? data.comparison.current.avgScore - data.comparison.previous.avgScore
    : null;

  const categoryData = Object.entries(data.categoryBreakdown)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      name: CATEGORY_I18N_KEYS[key] ? t(CATEGORY_I18N_KEYS[key]) : key,
      count,
      fill: CATEGORY_COLORS[key] || "#94a3b8",
    }));

  if (!hasData && categoryData.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{t("personal.trends.title")}</span>
      </div>

      {data.comparison.current.avgScore !== null && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-background/30 rounded-lg p-3 border border-border/20">
            <div className="text-xs text-muted-foreground mb-1">{t("personal.trends.avg30")}</div>
            <div className="text-2xl font-bold text-foreground">{data.comparison.current.avgScore}</div>
            <div className="text-xs text-muted-foreground">{data.comparison.current.scanCount} {t("personal.trends.scans")}</div>
          </div>
          {data.comparison.previous.avgScore !== null && (
            <div className="bg-background/30 rounded-lg p-3 border border-border/20">
              <div className="text-xs text-muted-foreground mb-1">{t("personal.trends.prev30")}</div>
              <div className="text-2xl font-bold text-foreground">{data.comparison.previous.avgScore}</div>
              <div className="text-xs text-muted-foreground">{data.comparison.previous.scanCount} {t("personal.trends.scans")}</div>
            </div>
          )}
          {scoreDelta !== null && (
            <div className="bg-background/30 rounded-lg p-3 border border-border/20">
              <div className="text-xs text-muted-foreground mb-1">{t("personal.trends.change")}</div>
              <div className={`text-2xl font-bold flex items-center gap-1 ${scoreDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {scoreDelta >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {scoreDelta > 0 ? "+" : ""}{scoreDelta}
              </div>
              <div className="text-xs text-muted-foreground">
                {scoreDelta >= 0 ? t("personal.trends.improving") : t("personal.trends.worsening")}
              </div>
            </div>
          )}
        </div>
      )}

      {categoryData.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-muted-foreground font-semibold mb-2">{t("personal.trends.categoryBreakdown")}</div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(30,30,40,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.categoryTimeSeries && data.categoryTimeSeries.length >= 2 && (
        <div className="mb-4">
          <div className="text-xs text-muted-foreground font-semibold mb-2">{t("personal.trends.categoryTrend")}</div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.categoryTimeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(30,30,40,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="toxicity" stroke="#f87171" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="hate_speech" stroke="#fb923c" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="pii" stroke="#a78bfa" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="bias" stroke="#fbbf24" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {CATEGORY_I18N_KEYS[key] ? t(CATEGORY_I18N_KEYS[key]) : key}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.rollingAvgSeries && data.rollingAvgSeries.length >= 2 && (
        <div>
          <div className="text-xs text-muted-foreground font-semibold mb-2">{t("personal.trends.rollingAvg")}</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.rollingAvgSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(30,30,40,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={70} stroke="rgba(52,211,153,0.3)" strokeDasharray="3 3" />
                <ReferenceLine y={40} stroke="rgba(251,191,36,0.3)" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="rollingAvg"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          resolve(parsed.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n"));
        } else if (typeof parsed === "object") {
          resolve(Object.values(parsed).map((v) => String(v)).join("\n"));
        } else {
          resolve(String(parsed));
        }
      } catch {
        resolve(raw);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

interface FirewallResult {
  riskScore: number;
  issues: { type: string; severity: string; detail: string; matchedText: string }[];
}

interface SanitizeResult {
  sanitized: string;
  changes: { type: string; original: string; replacement: string }[];
}

function PromptProtectionPanel() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [firewallResult, setFirewallResult] = useState<FirewallResult | null>(null);
  const [sanitizedResult, setSanitizedResult] = useState<SanitizeResult | null>(null);
  const [copied, setCopied] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${API_BASE}/dev/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      return res.json() as Promise<FirewallResult>;
    },
    onSuccess: (data) => {
      setFirewallResult(data);
      setSanitizedResult(null);
    },
  });

  const sanitizeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${API_BASE}/dev/sanitize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Sanitization failed");
      return res.json() as Promise<SanitizeResult>;
    },
    onSuccess: (data) => {
      setSanitizedResult(data);
    },
  });

  const handleCopy = () => {
    if (sanitizedResult?.sanitized) {
      navigator.clipboard.writeText(sanitizedResult.sanitized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/50 border border-primary/20 rounded-2xl p-6 backdrop-blur-md mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t("personal.promptProtectionTitle")}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("personal.promptProtectionDesc")}</p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("personal.promptProtectionPlaceholder")}
        className="w-full h-28 bg-background/50 border border-border/30 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all mb-3"
        maxLength={5000}
      />

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">{prompt.length}/5000</span>
        <button
          onClick={() => { if (prompt.trim()) analyzeMutation.mutate(prompt.trim()); }}
          disabled={!prompt.trim() || analyzeMutation.isPending}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          {analyzeMutation.isPending ? t("personal.promptProtectionAnalyzing") : t("personal.promptProtectionAnalyze")}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {firewallResult && (
          <motion.div
            key="firewall-result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {firewallResult.issues.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">{t("personal.promptProtectionSafe")}</p>
                  <p className="text-xs text-muted-foreground">{t("personal.promptProtectionSafeDesc")}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10">
                  <ShieldAlert className="w-6 h-6 text-yellow-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-400">{t("personal.promptProtectionRisky")}</p>
                    <p className="text-xs text-muted-foreground">{firewallResult.issues.length} issue{firewallResult.issues.length !== 1 ? "s" : ""}</p>
                  </div>
                  {!sanitizedResult && (
                    <button
                      onClick={() => sanitizeMutation.mutate(prompt.trim())}
                      disabled={sanitizeMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                      {sanitizeMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {sanitizeMutation.isPending ? t("personal.promptProtectionSanitizing") : t("personal.promptProtectionSanitize")}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {firewallResult.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold uppercase text-yellow-400">{issue.type}</span>
                          <span className="text-xs opacity-70 text-muted-foreground">({issue.severity})</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.detail}</p>
                        {issue.matchedText && (
                          <p className="text-xs mt-1 opacity-60 font-mono text-muted-foreground truncate">"{issue.matchedText}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sanitizedResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-red-400 uppercase">{t("personal.promptProtectionOriginal")}</span>
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {prompt}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-emerald-400 uppercase">{t("personal.promptProtectionSanitized")}</span>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {sanitizedResult.sanitized}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t("personal.rewrite.copied") : t("personal.rewrite.copy")}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const HISTORY_PAGE_SIZE = 10;

export default function PersonalMode({
  onBack,
  onUpgrade,
}: {
  onBack: () => void;
  onUpgrade: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [limitError, setLimitError] = useState<{ used: number; limit: number } | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [analysisText, setAnalysisText] = useState<string>("");

  const analyzeMutation = useMutation({
    mutationFn: async (inputText: string) => {
      setLimitError(null);
      const res = await fetch(`${API_BASE}/personal/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: inputText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.limit && data.used) {
          setLimitError({ used: data.used, limit: data.limit });
          throw new Error("LIFETIME_LIMIT");
        }
        if (data.upgrade) {
          onUpgrade();
          return null;
        }
        throw new Error(data.error || "Analysis failed");
      }
      const result = await res.json() as ScanResult;
      return { result, sourceText: inputText };
    },
    onSuccess: (data) => {
      if (data) {
        setResult(data.result);
        setAnalysisText(data.sourceText);
        queryClient.invalidateQueries({ queryKey: ["personal-history"] });
        queryClient.invalidateQueries({ queryKey: ["personal-alerts"] });
        queryClient.invalidateQueries({ queryKey: ["personal-trends"] });
      }
    },
  });

  const historyQuery = useQuery({
    queryKey: ["personal-history", historyPage, levelFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(HISTORY_PAGE_SIZE),
        offset: String(historyPage * HISTORY_PAGE_SIZE),
      });
      if (levelFilter) params.set("level", levelFilter);
      const res = await fetch(`${API_BASE}/personal/history?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<{
        scans: HistoryScan[];
        total: number;
        totalUsed: number;
        lifetimeLimit: number | null;
        trend: TrendPoint[];
      }>;
    },
  });

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setResult(null);
    analyzeMutation.mutate(text.trim());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await extractTextFromFile(file);
      const truncated = content.substring(0, 5000);
      setText(truncated);
      setScanMode("profile");
      setResult(null);
      analyzeMutation.mutate(truncated);
    } catch {
      setText("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const lastScore = historyQuery.data?.scans?.[0];
  const recentAlerts = historyQuery.data?.scans?.filter((s) => s.level !== "low").slice(0, 3) ?? [];
  const avgScore = historyQuery.data?.scans?.length
    ? Math.round(historyQuery.data.scans.reduce((s, scan) => s + scan.riskScore, 0) / historyQuery.data.scans.length)
    : null;
  const avgLevel = avgScore !== null ? (avgScore >= 70 ? "low" : avgScore >= 40 ? "medium" : "high") : null;

  const totalPages = historyQuery.data ? Math.max(1, Math.ceil(historyQuery.data.total / HISTORY_PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen w-full pb-20 relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("personal.back")}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">{t("personal.title")}</h1>
          </div>
        </motion.header>

        {historyQuery.data?.lifetimeLimit != null && historyQuery.data.totalUsed >= historyQuery.data.lifetimeLimit && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 to-cyan-500/10 backdrop-blur-md"
          >
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-1">{t("personal.paywall.title")}</h3>
                <p className="text-sm text-muted-foreground mb-3">{t("personal.paywall.description")}</p>
                <button
                  onClick={onUpgrade}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-cyan-400 text-black rounded-lg text-sm font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                >
                  <Crown className="w-4 h-4" />
                  {t("personal.paywall.cta")}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {lastScore && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <RiskGauge score={lastScore.riskScore} level={lastScore.level} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${avgLevel === "low" ? "text-emerald-400" : avgLevel === "medium" ? "text-yellow-400" : avgLevel === "high" ? "text-red-400" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t("personal.dashboard.lastScore")}</span>
            </div>
            <div className={`text-3xl font-bold ${lastScore ? (lastScore.level === "low" ? "text-emerald-400" : lastScore.level === "medium" ? "text-yellow-400" : "text-red-400") : "text-muted-foreground/40"}`}>
              {lastScore ? `${lastScore.riskScore}/100` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {lastScore ? t(`personal.risk.${lastScore.level}`) : t("personal.dashboard.noScansYet")}
            </div>
          </div>

          <div className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-5 h-5 ${recentAlerts.length > 0 ? "text-yellow-400" : "text-muted-foreground"}`} />
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t("personal.dashboard.recentAlerts")}</span>
            </div>
            <div className={`text-3xl font-bold ${recentAlerts.length > 0 ? "text-yellow-400" : "text-muted-foreground/40"}`}>
              {recentAlerts.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("personal.dashboard.alertsDesc")}
            </div>
          </div>

          <div className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t("personal.dashboard.scansUsed")}</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {historyQuery.data?.totalUsed ?? 0}
              {historyQuery.data?.lifetimeLimit != null && (
                <span className="text-lg text-muted-foreground font-normal">/{historyQuery.data.lifetimeLimit}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {historyQuery.data?.lifetimeLimit != null ? t("personal.dashboard.freeLifetimeLimit") : t("personal.dashboard.unlimited")}
            </div>
          </div>
        </motion.div>

        <AlertsPanel onUpgrade={onUpgrade} />

        <PromptProtectionPanel />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        >
          <button
            onClick={() => { setScanMode("post"); setResult(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${scanMode === "post" ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-card/50 text-muted-foreground hover:border-primary/50 hover:text-primary"}`}
          >
            <MessageSquare className="w-5 h-5" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t("personal.action.analyzePost")}</div>
              <div className="text-xs opacity-70">{t("personal.action.analyzePostDesc")}</div>
            </div>
          </button>

          <button
            onClick={() => { setScanMode("profile"); setResult(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${scanMode === "profile" ? "border-primary bg-primary/10 text-primary" : "border-border/30 bg-card/50 text-muted-foreground hover:border-primary/50 hover:text-primary"}`}
          >
            <UserCheck className="w-5 h-5" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t("personal.action.profileScan")}</div>
              <div className="text-xs opacity-70">{t("personal.action.profileScanDesc")}</div>
            </div>
          </button>

          <button
            onClick={() => {
              setScanMode("profile");
              setResult(null);
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-3 p-4 rounded-xl border border-border/30 bg-card/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
          >
            <Upload className="w-5 h-5" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t("personal.action.uploadFile")}</div>
              <div className="text-xs opacity-70">{t("personal.action.uploadFileDesc")}</div>
            </div>
          </button>
        </motion.div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.json,.jsonl"
          onChange={handleFileUpload}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {scanMode && (
            <motion.div
              key={scanMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card/50 border border-border/30 rounded-2xl p-6 backdrop-blur-md mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                {scanMode === "post" ? (
                  <MessageSquare className="w-5 h-5 text-primary" />
                ) : (
                  <UserCheck className="w-5 h-5 text-primary" />
                )}
                <h2 className="text-lg font-semibold text-foreground">
                  {scanMode === "post" ? t("personal.beforeYouPost") : t("personal.profileRiskScan")}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {scanMode === "post" ? t("personal.description") : t("personal.profileDescription")}
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={scanMode === "post" ? t("personal.placeholder") : t("personal.profilePlaceholder")}
                className="w-full h-32 bg-background/50 border border-border/30 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                maxLength={5000}
              />

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{text.length}/5000</span>
                  {scanMode === "profile" && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {t("personal.action.uploadFile")}
                    </button>
                  )}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={!text.trim() || analyzeMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {analyzeMutation.isPending ? t("personal.analyzing") : t("personal.analyze")}
                </button>
              </div>

              {analyzeMutation.isError && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  {limitError ? (
                    <div className="flex items-center justify-between">
                      <span>{t("personal.lifetimeLimitReached", { used: limitError.used, limit: limitError.limit })}</span>
                      <button
                        onClick={() => onUpgrade()}
                        className="ml-3 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        {t("personal.subscribePersonalCta")}
                      </button>
                    </div>
                  ) : (
                    analyzeMutation.error?.message || t("personal.analysisFailed")
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 mb-8"
            >
              <RiskGauge score={result.riskScore} level={result.level} />
              <BreakdownChart breakdown={result.breakdown} />

              {result.flags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {t("personal.flagsFound", { count: result.flags.length })}
                  </h3>
                  {result.flags.map((flag, i) => (
                    <FlagBadge key={i} flag={flag} />
                  ))}
                </div>
              )}

              {result.flags.length > 0 && (
                <RewritePanel text={analysisText} flags={result.flags} onUpgrade={onUpgrade} />
              )}

              {result.suggestions.length > 0 && (
                <div className="bg-card/50 border border-border/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">{t("personal.suggestions")}</h3>
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">→</span>
                      <span className="text-muted-foreground">{s.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.flags.length === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400">{t("personal.allClear")}</p>
                    <p className="text-xs text-muted-foreground">{t("personal.allClearDesc")}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <TrendsPanel onUpgrade={onUpgrade} />

        {historyQuery.data?.trend && historyQuery.data.trend.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <RiskTrendChart trend={historyQuery.data.trend} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 border border-border/30 rounded-2xl p-6 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("personal.historyTitle")}</h2>
            {historyQuery.data && (
              <span className="text-xs text-muted-foreground ml-auto">
                {t("personal.totalScans", { count: historyQuery.data.total })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {["", "low", "medium", "high"].map((level) => (
              <button
                key={level}
                onClick={() => { setLevelFilter(level); setHistoryPage(0); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  levelFilter === level
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                }`}
              >
                {level === "" ? t("personal.history.filterAll") : t(`personal.risk.${level}`)}
              </button>
            ))}
          </div>

          {historyQuery.isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {historyQuery.data && historyQuery.data.scans.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t("personal.noHistory")}</p>
          )}

          {historyQuery.data && historyQuery.data.scans.length > 0 && (
            <div className="space-y-2">
              {historyQuery.data.scans.map((scan) => (
                <HistoryItem key={scan.id} scan={scan} />
              ))}
            </div>
          )}

          {historyQuery.data && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border/20">
              <button
                onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                disabled={historyPage === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/20 text-muted-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t("personal.history.prev")}
              </button>
              <span className="text-xs text-muted-foreground">
                {t("personal.history.pageOf", { page: historyPage + 1, total: totalPages })}
              </span>
              <button
                onClick={() => setHistoryPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={historyPage >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/20 text-muted-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {t("personal.history.next")}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
