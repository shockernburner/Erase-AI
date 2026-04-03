import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Send,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  Zap,
  UserCheck,
} from "lucide-react";

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

function HistoryItem({ scan }: { scan: HistoryScan }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const color =
    scan.level === "low" ? "text-emerald-400" : scan.level === "medium" ? "text-yellow-400" : "text-red-400";

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors text-left"
      >
        <div className={`text-lg font-bold ${color} w-12`}>{scan.riskScore}</div>
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

  const analyzeMutation = useMutation({
    mutationFn: async (inputText: string) => {
      const res = await fetch(`${API_BASE}/personal/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: inputText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.upgrade) {
          onUpgrade();
          return null;
        }
        throw new Error(data.error || "Analysis failed");
      }
      return res.json() as Promise<ScanResult>;
    },
    onSuccess: (data) => {
      if (data) {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ["personal-history"] });
      }
    },
  });

  const historyQuery = useQuery({
    queryKey: ["personal-history"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/personal/history?limit=20`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<{
        scans: HistoryScan[];
        total: number;
        todayUsed: number;
        dailyLimit: number | null;
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-card/50 border border-border/30 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Shield className={`w-5 h-5 ${lastScore ? (lastScore.level === "low" ? "text-emerald-400" : lastScore.level === "medium" ? "text-yellow-400" : "text-red-400") : "text-muted-foreground"}`} />
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
              <span className="text-xs font-semibold text-muted-foreground uppercase">{t("personal.dashboard.scansToday")}</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {historyQuery.data?.todayUsed ?? 0}
              {historyQuery.data?.dailyLimit != null && (
                <span className="text-lg text-muted-foreground font-normal">/{historyQuery.data.dailyLimit}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {historyQuery.data?.dailyLimit != null ? t("personal.dashboard.freeLimit") : t("personal.dashboard.unlimited")}
            </div>
          </div>
        </motion.div>

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
                  {analyzeMutation.error?.message || t("personal.analysisFailed")}
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 border border-border/30 rounded-2xl p-6 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("personal.history")}</h2>
            {historyQuery.data && (
              <span className="text-xs text-muted-foreground ml-auto">
                {t("personal.totalScans", { count: historyQuery.data.total })}
              </span>
            )}
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
        </motion.div>
      </div>
    </div>
  );
}
