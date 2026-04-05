import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Code2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Loader2,
  AlertTriangle,
  Eye,
  Eraser,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Clock,
  Lock,
  Zap,
  FileCode,
  Crown,
  Lightbulb,
  Plug,
  Terminal,
  BookOpen,
  Info,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface SafetyIssue {
  category: "secret_exposure" | "pii" | "proprietary_logic" | "toxicity";
  severity: "low" | "medium" | "high" | "critical";
  detail: string;
  match: string;
  start: number;
  end: number;
}

interface SafetySuggestion {
  category: string;
  action: string;
  detail: string;
}

interface AnalyzeResult {
  riskScore: number;
  level: "safe" | "caution" | "danger";
  issues: SafetyIssue[];
  suggestions: SafetySuggestion[];
  summary: string;
}

interface SanitizeChange {
  category: string;
  original: string;
  replacement: string;
}

interface SanitizeResult {
  sanitized: string;
  changes: SanitizeChange[];
  changeCount: number;
}

interface HistoryScan {
  id: number;
  scanType: string;
  inputText: string;
  riskScore: number;
  issues: SafetyIssue[];
  sanitizedText: string | null;
  createdAt: string;
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const { t } = useTranslation();
  const color =
    level === "safe" ? "text-emerald-400" : level === "caution" ? "text-yellow-400" : "text-red-400";
  const bgColor =
    level === "safe" ? "bg-emerald-400/20" : level === "caution" ? "bg-yellow-400/20" : "bg-red-400/20";
  const borderColor =
    level === "safe" ? "border-emerald-400/30" : level === "caution" ? "border-yellow-400/30" : "border-red-400/30";

  const Icon = level === "safe" ? ShieldCheck : level === "caution" ? ShieldAlert : ShieldX;

  return (
    <div className={`flex items-center gap-4 p-5 rounded-xl border ${borderColor} ${bgColor}`}>
      <Icon className={`w-12 h-12 ${color}`} />
      <div>
        <div className={`text-4xl font-bold ${color}`}>{score}/100</div>
        <div className="text-sm text-muted-foreground">{t(`devMode.risk.${level}`)}</div>
      </div>
      <div className="ml-auto flex-shrink-0">
        <div className="w-36 h-3 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${level === "safe" ? "bg-emerald-400" : level === "caution" ? "bg-yellow-400" : "bg-red-400"}`}
          />
        </div>
      </div>
    </div>
  );
}

function IssueBadge({ issue }: { issue: SafetyIssue }) {
  const { t } = useTranslation();
  const categoryColors: Record<string, string> = {
    secret_exposure: "bg-red-500/20 text-red-400 border-red-500/30",
    pii: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    proprietary_logic: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    toxicity: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  const severityLabel: Record<string, string> = {
    critical: t("devMode.severity.critical"),
    high: t("devMode.severity.high"),
    medium: t("devMode.severity.medium"),
    low: t("devMode.severity.low"),
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${categoryColors[issue.category] || "bg-muted/20 text-muted-foreground border-border"}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase">{t(`devMode.category.${issue.category}`)}</span>
          <span className="text-xs opacity-70">({severityLabel[issue.severity] || issue.severity})</span>
        </div>
        <p className="text-sm opacity-90">{issue.detail}</p>
        <p className="text-xs mt-1 opacity-60 font-mono truncate">
          "{issue.match.length > 40 ? issue.match.substring(0, 20) + "..." + issue.match.substring(issue.match.length - 10) : issue.match}"
        </p>
      </div>
    </div>
  );
}

function DiffView({ original, sanitized }: { original: string; sanitized: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sanitized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          {t("devMode.diffView")}
        </h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t("devMode.copied") : t("devMode.copySanitized")}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-red-400 uppercase">{t("devMode.original")}</span>
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono text-xs">
            {original}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase">{t("devMode.sanitized")}</span>
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono text-xs">
            {sanitized}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ scan }: { scan: HistoryScan }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isAnalyze = scan.scanType === "analyze";
  const color = isAnalyze
    ? scan.riskScore >= 70 ? "text-emerald-400" : scan.riskScore >= 40 ? "text-yellow-400" : "text-red-400"
    : "text-primary";
  const levelBg = isAnalyze
    ? scan.riskScore >= 70 ? "bg-emerald-400/10" : scan.riskScore >= 40 ? "bg-yellow-400/10" : "bg-red-400/10"
    : "bg-primary/10";

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors text-left"
      >
        {isAnalyze ? (
          <div className={`text-lg font-bold ${color} w-12`}>{scan.riskScore}</div>
        ) : (
          <div className="w-12 flex justify-center">
            <Eraser className="w-5 h-5 text-primary" />
          </div>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBg} ${color}`}>
          {isAnalyze ? t("devMode.analyze") : t("devMode.sanitize")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate font-mono">{scan.inputText}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(scan.createdAt).toLocaleString()}
            {isAnalyze && scan.issues.length > 0 && ` · ${scan.issues.length} ${t("devMode.issues")}`}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && isAnalyze && scan.issues.length > 0 && (
        <div className="px-3 pb-3 space-y-2">
          {scan.issues.map((issue, i) => (
            <IssueBadge key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DevMode({
  onBack,
  onUpgrade,
}: {
  onBack: () => void;
  onUpgrade: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [sanitizeResult, setSanitizeResult] = useState<SanitizeResult | null>(null);
  const [activeTab, setActiveTab] = useState<"input" | "history" | "integration">("input");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 20;

  const historyQuery = useQuery({
    queryKey: ["dev-history", historyPage],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dev/history?limit=${HISTORY_PAGE_SIZE}&offset=${historyPage * HISTORY_PAGE_SIZE}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<{
        scans: HistoryScan[];
        total: number;
        todayUsed: number;
        dailyLimit: number | null;
      }>;
    },
    staleTime: 30_000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${API_BASE}/dev/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.upgrade) {
          onUpgrade();
          throw new Error("UPGRADE_REQUIRED");
        }
        throw new Error(data.error || "Analysis failed");
      }
      return res.json() as Promise<AnalyzeResult>;
    },
    onSuccess: (data) => {
      setAnalyzeResult(data);
      setSanitizeResult(null);
      queryClient.invalidateQueries({ queryKey: ["dev-history"] });
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.upgrade) {
          onUpgrade();
          throw new Error("UPGRADE_REQUIRED");
        }
        throw new Error(data.error || "Sanitization failed");
      }
      return res.json() as Promise<SanitizeResult>;
    },
    onSuccess: (data) => {
      setSanitizeResult(data);
      setAnalyzeResult(null);
      queryClient.invalidateQueries({ queryKey: ["dev-history"] });
    },
  });

  const isLoading = analyzeMutation.isPending || sanitizeMutation.isPending;
  const todayUsed = historyQuery.data?.todayUsed ?? 0;
  const dailyLimit = historyQuery.data?.dailyLimit;

  return (
    <div className="min-h-screen w-full bg-background relative">
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("devMode.back")}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-500/20 text-amber-400 p-2.5 rounded-xl">
              <Code2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                {t("devMode.title")}
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono">BETA</span>
              </h1>
              <p className="text-sm text-muted-foreground">{t("devMode.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        {dailyLimit !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30 backdrop-blur-md"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-muted-foreground">
              {t("devMode.usageCounter", { used: todayUsed, limit: dailyLimit })}
            </span>
            {todayUsed >= (dailyLimit || 10) && (
              <button
                onClick={onUpgrade}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                {t("devMode.upgradeCta")}
              </button>
            )}
          </motion.div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("input")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "input"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-card/50 text-muted-foreground border border-border/30 hover:bg-muted/20"
            }`}
          >
            <FileCode className="w-4 h-4" />
            {t("devMode.scanTab")}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-card/50 text-muted-foreground border border-border/30 hover:bg-muted/20"
            }`}
          >
            <Clock className="w-4 h-4" />
            {t("devMode.historyTab")}
          </button>
          <button
            onClick={() => setActiveTab("integration")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "integration"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-card/50 text-muted-foreground border border-border/30 hover:bg-muted/20"
            }`}
          >
            <Plug className="w-4 h-4" />
            {t("devMode.integrationTab")}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-card/50 border border-border/30 rounded-xl p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-foreground">{t("devMode.inputTitle")}</h2>
                </div>
                <p className="text-xs text-muted-foreground">{t("devMode.inputDesc")}</p>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t("devMode.inputPlaceholder")}
                  rows={8}
                  className="w-full rounded-lg bg-background/50 border border-border/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 resize-y font-mono transition-all"
                  maxLength={10000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {inputText.length.toLocaleString()} / 10,000
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => analyzeMutation.mutate(inputText)}
                      disabled={!inputText.trim() || isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {analyzeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      {t("devMode.analyzeBtn")}
                    </button>
                    <button
                      onClick={() => sanitizeMutation.mutate(inputText)}
                      disabled={!inputText.trim() || isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {sanitizeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eraser className="w-4 h-4" />
                      )}
                      {t("devMode.sanitizeBtn")}
                    </button>
                  </div>
                </div>
              </div>

              {(analyzeMutation.isError || sanitizeMutation.isError) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive"
                >
                  {(analyzeMutation.error?.message === "UPGRADE_REQUIRED" || sanitizeMutation.error?.message === "UPGRADE_REQUIRED")
                    ? (
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 flex-shrink-0" />
                        <span>{t("devMode.limitReached")}</span>
                        <button
                          onClick={onUpgrade}
                          className="ml-auto px-3 py-1 rounded-md bg-amber-500 text-black text-xs font-medium hover:bg-amber-400 transition-colors"
                        >
                          {t("devMode.upgradeCta")}
                        </button>
                      </div>
                    )
                    : (analyzeMutation.error?.message || sanitizeMutation.error?.message || t("devMode.error"))
                  }
                </motion.div>
              )}

              {analyzeResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <RiskGauge score={analyzeResult.riskScore} level={analyzeResult.level} />

                  <div className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md">
                    <p className="text-sm text-muted-foreground">{analyzeResult.summary}</p>
                  </div>

                  {analyzeResult.issues.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        {t("devMode.issuesFound", { count: analyzeResult.issues.length })}
                      </h3>
                      <div className="space-y-2">
                        {analyzeResult.issues.map((issue, i) => (
                          <IssueBadge key={i} issue={issue} />
                        ))}
                      </div>
                    </div>
                  )}

                  {analyzeResult.suggestions && analyzeResult.suggestions.length > 0 && (
                    <div className="bg-card/50 border border-amber-500/20 rounded-xl p-4 backdrop-blur-md space-y-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        {t("devMode.suggestionsTitle")}
                      </h3>
                      <div className="space-y-3">
                        {analyzeResult.suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <span className="text-amber-400 mt-0.5 text-sm font-bold">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{s.action}</p>
                              <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
                              <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground uppercase font-mono">
                                {s.category.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {sanitizeResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Eraser className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        {t("devMode.sanitizeComplete", { count: sanitizeResult.changeCount })}
                      </span>
                    </div>
                    {sanitizeResult.changes.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {sanitizeResult.changes.slice(0, 10).map((change, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-red-400 line-through font-mono truncate max-w-[200px]">
                              {change.original.length > 30 ? change.original.substring(0, 15) + "..." : change.original}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-emerald-400 font-mono truncate max-w-[200px]">{change.replacement}</span>
                            <span className="text-muted-foreground/50 text-[10px] uppercase">{change.category.replace(/_/g, " ")}</span>
                          </div>
                        ))}
                        {sanitizeResult.changes.length > 10 && (
                          <p className="text-xs text-muted-foreground">
                            +{sanitizeResult.changes.length - 10} {t("devMode.moreChanges")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <DiffView original={inputText} sanitized={sanitizeResult.sanitized} />
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-card/50 border border-border/30 rounded-xl p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-foreground">{t("devMode.historyTitle")}</h2>
                  {historyQuery.data && (
                    <span className="text-xs text-muted-foreground">
                      ({historyQuery.data.total} {t("devMode.totalScans")})
                    </span>
                  )}
                </div>

                {historyQuery.isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}

                {historyQuery.isError && (
                  <div className="text-center py-12 text-destructive">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{t("devMode.error")}</p>
                  </div>
                )}

                {historyQuery.data && historyQuery.data.scans.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Code2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{t("devMode.noHistory")}</p>
                  </div>
                )}

                {historyQuery.data && historyQuery.data.scans.length > 0 && (
                  <div className="space-y-2">
                    {historyQuery.data.scans.map((scan) => (
                      <HistoryItem key={scan.id} scan={scan} />
                    ))}
                  </div>
                )}

                {historyQuery.data && historyQuery.data.total > HISTORY_PAGE_SIZE && (
                  <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border/20">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                      disabled={historyPage === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/20 text-muted-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      {t("devMode.prevPage")}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {t("devMode.pageOf", { page: historyPage + 1, total: Math.ceil(historyQuery.data.total / HISTORY_PAGE_SIZE) })}
                    </span>
                    <button
                      onClick={() => setHistoryPage((p) => p + 1)}
                      disabled={historyPage >= Math.ceil((historyQuery.data?.total ?? 0) / HISTORY_PAGE_SIZE) - 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/20 text-muted-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {t("devMode.nextPage")}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "integration" && (
            <motion.div
              key="integration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-card/50 border border-border/30 rounded-xl p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-foreground">{t("devMode.quickStartTitle")}</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-5">{t("devMode.quickStartDesc")}</p>

                <div className="space-y-5">
                  {[
                    {
                      id: "analyze",
                      label: t("devMode.analyzeExample"),
                      code: `curl -X POST ${window.location.origin}${API_BASE}/dev/analyze \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session=YOUR_SESSION_COOKIE" \\
  -d '{"text": "My API key is sk-abc123..."}'`,
                    },
                    {
                      id: "sanitize",
                      label: t("devMode.sanitizeExample"),
                      code: `curl -X POST ${window.location.origin}${API_BASE}/dev/sanitize \\
  -H "Content-Type: application/json" \\
  -H "Cookie: session=YOUR_SESSION_COOKIE" \\
  -d '{"text": "Contact john@example.com or call 555-1234"}'`,
                    },
                  ].map((snippet) => (
                    <div key={snippet.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{snippet.label}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(snippet.code);
                            setCopiedSnippet(snippet.id);
                            setTimeout(() => setCopiedSnippet(null), 2000);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          {copiedSnippet === snippet.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedSnippet === snippet.id ? t("devMode.copied") : t("devMode.copyCode")}
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-background/80 border border-border/40 text-xs text-foreground font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                        {snippet.code}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card/50 border border-border/30 rounded-xl p-5 backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-foreground">{t("devMode.requestFormat")}</h3>
                  </div>
                  <pre className="p-3 rounded-lg bg-background/80 border border-border/40 text-xs text-foreground font-mono overflow-x-auto whitespace-pre leading-relaxed">
{`POST ${API_BASE}/dev/analyze
POST ${API_BASE}/dev/sanitize

{
  "text": "string (required, max 10,000 chars)"
}`}
                  </pre>
                </div>

                <div className="bg-card/50 border border-border/30 rounded-xl p-5 backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-foreground">{t("devMode.responseFormat")}</h3>
                  </div>
                  <pre className="p-3 rounded-lg bg-background/80 border border-border/40 text-xs text-foreground font-mono overflow-x-auto whitespace-pre leading-relaxed">
{`// analyze response
{
  "riskScore": 85,
  "level": "safe"|"caution"|"danger",
  "issues": [...],
  "suggestions": [...],
  "summary": "...",
  "meta": {
    "version": "1.0.0",
    "timestamp": "ISO-8601",
    "requestId": "uuid"
  }
}`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{t("devMode.authNote")}</p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{t("devMode.rateLimitNote")}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
