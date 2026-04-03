import React, { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Card, Badge } from "@/components/ui-elements";
import {
  Upload,
  Database,
  Trash2,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  AlertTriangle,
  GitBranch,
  Shield,
  ChevronDown,
  History,
  BarChart3,
  Eye,
  Zap,
  ScanSearch,
  ChevronRight,
  Sparkles,
  Bug,
  Copy,
  MessageSquareWarning,
  ShieldAlert,
  BrainCircuit,
  Wrench,
  GraduationCap,
  FlaskConical,
  Code2,
  FileDown,
  Crown,
  X,
  Link,
  Columns3,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface DatasetRow {
  id: number;
  row_index: number;
  content: string;
  is_removed: boolean;
  is_redacted: boolean;
  removed_reason: string | null;
}

interface DatasetInfo {
  id: number;
  name: string;
  format: string;
  created_at: string;
}

interface VersionInfo {
  id: number;
  version_number: number;
  parent_version_id: number | null;
  created_at: string;
}

interface OperationInfo {
  id: number;
  type: string;
  value: string;
  affected_rows_count: number;
  version_id: number;
  created_at: string;
}

interface EraseResult {
  version_number: number;
  mode: string;
  keyword: string;
  affected_count: number;
  impact: {
    removed: number;
    redacted: number;
    remaining: number;
    total: number;
    impact_percent: number;
  };
}

interface VerifyResult {
  query: string;
  matches_before: number;
  matches_after: number;
  status: string;
  version_before: number;
  version_after: number;
}

interface AnalysisIssueSummary {
  type: string;
  count: number;
  severity: string;
  affected_rows: number;
}

interface AnalysisIssueItem {
  id: number;
  issue_type: string;
  severity: string;
  row_index: number;
  content: string;
  detail: string;
  suggested_action: string;
  suggested_value: string | null;
}

interface AnalysisData {
  total_issues: number;
  summary: AnalysisIssueSummary[];
  issues: AnalysisIssueItem[];
}

interface MLRecommendation {
  category: "preprocessing" | "training" | "evaluation";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  triggered_by: string;
  code_snippet?: string;
}

interface MLFeedbackData {
  issues_detected: { type: string; count: number; severity: string }[];
  ml_recommendations: MLRecommendation[];
}

interface ColumnProfileData {
  name: string;
  dataType: string;
  totalCount: number;
  missingCount: number;
  missingPercent: number;
  cardinality: number;
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    skewness: number;
  };
  categoricalStats?: {
    topValues: { value: string; count: number; percent: number }[];
    dominantClass?: { value: string; percent: number };
  };
  sample: string[];
}

interface ProfileBiasIssue {
  column: string;
  issueType: string;
  severity: "low" | "medium" | "high";
  explanation: string;
  details: Record<string, unknown>;
}

interface ProfileRecommendation {
  category: "preprocessing" | "training" | "evaluation";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  triggeredBy: string;
  codeSnippet?: string;
}

interface DatasetProfileData {
  dataset_id: number;
  version: number;
  columnar: boolean;
  delimiter?: string;
  malformedRows?: number;
  profile: {
    totalRows: number;
    totalColumns: number;
    completeness: number;
    columns: ColumnProfileData[];
  } | null;
  biasIssues: ProfileBiasIssue[];
  recommendations: ProfileRecommendation[];
  message?: string;
}

type Phase = "idle" | "loading" | "loaded" | "confirm-erase" | "erasing" | "erased";
type EraseMode = "delete" | "redact";

const ISSUE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pii: { label: "PII / Personal Data", icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  bias: { label: "Biased Language", icon: <MessageSquareWarning className="w-4 h-4" />, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  toxic: { label: "Toxic Content", icon: <Bug className="w-4 h-4" />, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  duplicate: { label: "Duplicate Rows", icon: <Copy className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  quality: { label: "Low Quality", icon: <AlertTriangle className="w-4 h-4" />, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
};

export function DatasetSanitizer({ onNavigatePricing }: { onNavigatePricing?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [latestVersion, setLatestVersion] = useState(1);
  const [operations, setOperations] = useState<OperationInfo[]>([]);
  const [removedCount, setRemovedCount] = useState(0);
  const [redactedCount, setRedactedCount] = useState(0);
  const [eraseMode, setEraseMode] = useState<EraseMode>("delete");
  const [keyword, setKeyword] = useState("");
  const [eraseResult, setEraseResult] = useState<EraseResult | null>(null);
  const [verifyQuery, setVerifyQuery] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [prevVersionRows, setPrevVersionRows] = useState<DatasetRow[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [mlFeedback, setMlFeedback] = useState<MLFeedbackData | null>(null);
  const [isFetchingML, setIsFetchingML] = useState(false);
  const [mlCategory, setMlCategory] = useState<"all" | "preprocessing" | "training" | "evaluation">("all");
  const [upgradeNeeded, setUpgradeNeeded] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<DatasetProfileData | null>(null);
  const [isProfiling, setIsProfiling] = useState(false);
  const [profileRecCategory, setProfileRecCategory] = useState<"all" | "preprocessing" | "training" | "evaluation">("all");
  const [expandedProfileCode, setExpandedProfileCode] = useState<string | null>(null);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [isDroppingColumn, setIsDroppingColumn] = useState<string | null>(null);
  const [confirmDropColumn, setConfirmDropColumn] = useState<string | null>(null);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDataset = useCallback(async (id: number, version?: number): Promise<{ rows: DatasetRow[]; dataset: DatasetInfo; versions: VersionInfo[]; current_version: number; latest_version: number; operations: OperationInfo[]; removed_count: number; redacted_count: number }> => {
    const vParam = version ? `&version=${version}` : "";
    const res = await fetch(`${BASE}api/datasets/${id}?limit=1000${vParam}`);
    const data = await res.json();
    setDataset(data.dataset);
    setRows(data.rows);
    setVersions(data.versions);
    setCurrentVersion(data.current_version);
    setLatestVersion(data.latest_version);
    setOperations(data.operations || []);
    setRemovedCount(data.removed_count);
    setRedactedCount(data.redacted_count);
    if (data.column_headers && Array.isArray(data.column_headers) && data.column_headers.length > 0) {
      setColumnHeaders(data.column_headers);
    } else {
      setColumnHeaders([]);
    }
    return data;
  }, []);



  const uploadFile = async (file: File) => {
    setPhase("loading");
    setError("");
    setUpgradeNeeded(null);
    setProfileData(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}api/datasets/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade) {
          setUpgradeNeeded("row-limit");
          setError(data.error || "Dataset exceeds the Free plan limit of 100 rows. Upgrade to Pro for unlimited rows.");
          setPhase("idle");
          return;
        }
        throw new Error(data.error || "Upload failed");
      }
      await fetchDataset(data.dataset_id);
      setPhase("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("idle");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const confirmErase = () => {
    if (!keyword.trim()) return;
    setPhase("confirm-erase");
  };

  const cancelErase = () => setPhase("loaded");

  const executeErase = async () => {
    if (!dataset || !keyword.trim()) return;
    setPhase("erasing");
    setError("");

    const beforeRows = [...rows];

    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/erase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: eraseMode, value: keyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erase failed");

      if (data.affected_count === 0) {
        setError("No matching rows found for that keyword.");
        setPhase("loaded");
        return;
      }

      setEraseResult(data);
      setPrevVersionRows(beforeRows);
      await fetchDataset(dataset.id);
      setKeyword("");
      setPhase("erased");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erase failed");
      setPhase("loaded");
    }
  };

  const switchVersion = async (versionNum: number) => {
    if (!dataset) return;
    setShowVersionDropdown(false);
    await fetchDataset(dataset.id, versionNum);
  };

  const downloadDataset = (mode: string) => {
    if (!dataset) return;
    window.open(`${BASE}api/datasets/${dataset.id}/download?mode=${mode}&version=${currentVersion}`, "_blank");
  };

  const verifyErasure = async () => {
    if (!dataset || !verifyQuery.trim()) return;
    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: verifyQuery }),
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setError("Verification failed");
    }
  };

  const reset = () => {
    setDataset(null);
    setRows([]);
    setVersions([]);
    setCurrentVersion(1);
    setLatestVersion(1);
    setOperations([]);
    setRemovedCount(0);
    setRedactedCount(0);
    setEraseMode("delete");
    setKeyword("");
    setEraseResult(null);
    setPrevVersionRows([]);
    setVerifyQuery("");
    setVerifyResult(null);
    setError("");
    setAnalysisData(null);
    setExpandedIssue(null);
    setMlFeedback(null);
    setMlCategory("all");
    setProfileData(null);
    setProfileRecCategory("all");
    setExpandedProfileCode(null);
    setColumnHeaders([]);
    setConfirmDropColumn(null);
    setIsDroppingColumn(null);
    setShowUrlImport(false);
    setImportUrl("");
  };

  const dropColumn = async (colName: string) => {
    if (!dataset || isDroppingColumn) return;
    setIsDroppingColumn(colName);
    setConfirmDropColumn(null);
    setError("");
    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/drop-column`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: colName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to drop column");
      await fetchDataset(dataset.id);
      setAnalysisData(null);
      setMlFeedback(null);
      setProfileData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to drop column");
    } finally {
      setIsDroppingColumn(null);
    }
  };

  const importFromUrl = async () => {
    if (!importUrl.trim() || isImporting) return;
    setIsImporting(true);
    setError("");
    setUpgradeNeeded(null);
    setProfileData(null);
    try {
      const res = await fetch(`${BASE}api/datasets/import-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade) {
          setUpgradeNeeded("row-limit");
          setError(data.error || "Dataset exceeds the Free plan limit.");
          return;
        }
        throw new Error(data.error || "Import failed");
      }
      await fetchDataset(data.dataset_id);
      setPhase("loaded");
      setShowUrlImport(false);
      setImportUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const fetchMLFeedback = async (datasetId: number) => {
    setIsFetchingML(true);
    try {
      const res = await fetch(`${BASE}api/datasets/${datasetId}/ml-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.status === 403) {
        const data = await res.json();
        if (data.upgrade) {
          setUpgradeNeeded("ml-feedback");
        }
        setMlFeedback(null);
        return;
      }
      const data = await res.json();
      if (res.ok && data.ml_recommendations?.length > 0) {
        setMlFeedback(data);
        setMlCategory("all");
      } else {
        setMlFeedback(null);
      }
    } catch {
      setMlFeedback(null);
    } finally {
      setIsFetchingML(false);
    }
  };

  const fetchProfile = async () => {
    if (!dataset || isProfiling) return;
    setIsProfiling(true);
    setError("");
    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profiling failed");
      setProfileData(data);
      setProfileRecCategory("all");
      setExpandedProfileCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profiling failed");
    } finally {
      setIsProfiling(false);
    }
  };

  const analyzeDataset = async () => {
    if (!dataset || isAnalyzing) return;
    setIsAnalyzing(true);
    setError("");
    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysisData(data);
      if (data.summary.length > 0) {
        setExpandedIssue(data.summary[0].type);
      }
      fetchMLFeedback(dataset.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySingleSuggestion = async (suggestionId: number) => {
    if (!dataset || isApplying) return;
    setIsApplying(true);
    setError("");
    const beforeRows = [...rows];
    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/apply-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion_ids: [suggestionId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply suggestion");
      if (data.affected_count === 0) {
        setError("No changes were needed for this suggestion.");
        return;
      }
      setPrevVersionRows(beforeRows);
      setEraseResult({
        version_number: data.version_number,
        mode: "auto-fix",
        keyword: "single suggestion",
        affected_count: data.affected_count,
        impact: data.impact,
      });
      await fetchDataset(dataset.id);
      setPhase("erased");
      const reAnalyzeRes = await fetch(`${BASE}api/datasets/${dataset.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (reAnalyzeRes.ok) {
        const freshData = await reAnalyzeRes.json();
        if (freshData.total_issues > 0) {
          setAnalysisData(freshData);
          setExpandedIssue(prev => {
            if (prev && freshData.issues.some((i: AnalysisIssueItem) => i.issue_type === prev)) return prev;
            return freshData.summary[0]?.type ?? null;
          });
        } else {
          setAnalysisData(null);
          setMlFeedback(null);
        }
      } else {
        setAnalysisData(null);
        setMlFeedback(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply suggestion");
    } finally {
      setIsApplying(false);
    }
  };

  const applySuggestions = async (issueTypes: string[]) => {
    if (!dataset || isApplying) return;
    setIsApplying(true);
    setError("");
    const beforeRows = [...rows];
    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/apply-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_types: issueTypes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply suggestions");
      if (data.affected_count === 0) {
        setError("No changes were needed for the selected issues.");
        return;
      }
      setPrevVersionRows(beforeRows);
      setEraseResult({
        version_number: data.version_number,
        mode: "auto-fix",
        keyword: issueTypes.join(", "),
        affected_count: data.affected_count,
        impact: data.impact,
      });
      await fetchDataset(dataset.id);
      setAnalysisData(null);
      setMlFeedback(null);
      setProfileData(null);
      setPhase("erased");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply suggestions");
    } finally {
      setIsApplying(false);
    }
  };

  const allActiveRows = rows.filter((r) => !r.is_removed);
  const forgetScore = eraseResult
    ? Math.round(((eraseResult.impact.removed + eraseResult.impact.redacted) / eraseResult.impact.total) * 100)
    : null;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError("")} className="ml-auto text-destructive/60 hover:text-destructive">
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {upgradeNeeded && (
        <div className="relative bg-gradient-to-r from-primary/10 to-cyan-400/10 border border-primary/30 rounded-xl p-4 flex items-start gap-4">
          <button
            onClick={() => setUpgradeNeeded(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-sm"
          >
            &times;
          </button>
          <div className="bg-primary/20 p-2 rounded-lg shrink-0">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground mb-1">
              {upgradeNeeded === "ml-feedback" ? "ML Feedback — Pro Feature" : "Row Limit Reached"}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {upgradeNeeded === "ml-feedback"
                ? "ML Pipeline Feedback requires a Pro plan. Upgrade to get intelligent recommendations for your ML workflows."
                : "Free plan is limited to 100 rows per dataset. Upgrade to Pro for unlimited rows."}
            </p>
            <Button
              onClick={() => onNavigatePricing?.()}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              <Crown className="w-3.5 h-3.5" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      )}

      {phase === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-0 overflow-hidden">
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">
                    Upload Your Dataset
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Drag and drop a file here, or click to browse. Supports JSON, CSV, and TXT formats.
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Button className="gap-2">
                    <Upload className="w-4 h-4" />
                    Choose File
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); setShowUrlImport(true); }}
                    className="gap-2"
                  >
                    <Link className="w-4 h-4" />
                    Import from URL
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    JSON
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    CSV
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    TXT
                  </span>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".json,.csv,.txt" onChange={handleFileChange} className="hidden" />
            </div>
          </Card>

          <AnimatePresence>
            {showUrlImport && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <Card className="p-4 border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Link className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Import from URL</span>
                    <button onClick={() => { setShowUrlImport(false); setImportUrl(""); }} className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://example.com/data.csv"
                      className="flex-1 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && importFromUrl()}
                    />
                    <Button size="sm" onClick={importFromUrl} disabled={!importUrl.trim() || isImporting} className="gap-1.5">
                      {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      {isImporting ? "Importing..." : "Import"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Supports HTTP/HTTPS URLs pointing to CSV, JSON, or TXT files.</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {phase === "loading" && (
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading dataset...</p>
        </Card>
      )}

      {(phase === "loaded" || phase === "confirm-erase" || phase === "erasing" || phase === "erased") && dataset && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground">{dataset.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge>{dataset.format.toUpperCase()}</Badge>
                    <div className="relative">
                      <button
                        onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold transition-colors hover:bg-primary/20"
                      >
                        <GitBranch className="w-3 h-3" />
                        Version {currentVersion}
                        {currentVersion === latestVersion && " (Latest)"}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showVersionDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[180px] py-1 max-h-[200px] overflow-y-auto">
                          {versions.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => switchVersion(v.version_number)}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors flex items-center justify-between ${
                                v.version_number === currentVersion ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                              }`}
                            >
                              <span>Version {v.version_number}</span>
                              {v.version_number === latestVersion && (
                                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">Latest</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Badge variant={removedCount > 0 ? "warning" : "success"}>
                      {allActiveRows.length} active / {rows.length} total
                    </Badge>
                    {removedCount > 0 && <Badge variant="destructive">{removedCount} deleted</Badge>}
                    {redactedCount > 0 && <Badge variant="warning">{redactedCount} redacted</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeDataset}
                  disabled={isAnalyzing}
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProfile}
                  disabled={isProfiling}
                  className="gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {isProfiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  {isProfiling ? "Profiling..." : "Profile"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload New
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowUrlImport(!showUrlImport)} className="gap-1.5">
                  <Link className="w-3.5 h-3.5" />
                  Import URL
                </Button>
                <input ref={fileInputRef} type="file" accept=".json,.csv,.txt" onChange={handleFileChange} className="hidden" />
                <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
              </div>
            </div>
          </Card>

          <AnimatePresence>
            {showUrlImport && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-4 border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Link className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-semibold text-foreground text-sm">Import from URL</h3>
                    <button onClick={() => { setShowUrlImport(false); setImportUrl(""); }} className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Paste a direct link to a CSV, JSON, or text file (S3, GCS, or any public HTTP/HTTPS URL).
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://example.com/data.csv"
                      className="flex-1 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && importFromUrl()}
                      disabled={isImporting}
                    />
                    <Button
                      size="sm"
                      onClick={importFromUrl}
                      disabled={!importUrl.trim() || isImporting}
                      className="gap-1.5 bg-primary text-black font-bold hover:bg-primary/90"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {eraseResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="p-5 border-primary/30">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-bold text-foreground">Data Impact</h3>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-display font-extrabold text-destructive">{eraseResult.impact.removed}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Removed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-display font-extrabold text-yellow-500">{eraseResult.impact.redacted}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Redacted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-display font-extrabold text-success">{eraseResult.impact.remaining}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</div>
                    </div>
                    <div className="h-12 w-px bg-border/50" />
                    <div className="text-center">
                      <div className="text-3xl font-display font-extrabold text-primary">
                        {forgetScore !== null ? forgetScore : 0}%
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Forget Score</div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <AnimatePresence>
            {analysisData && analysisData.total_issues > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="p-5 border-primary/30 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <ScanSearch className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-display font-bold text-foreground">Analysis Results</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {analysisData.total_issues} issue{analysisData.total_issues !== 1 ? "s" : ""} found across {analysisData.summary.reduce((a, s) => a + s.affected_rows, 0)} rows
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => applySuggestions(analysisData.summary.map(s => s.type))}
                        disabled={isApplying}
                        className="gap-1.5 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90"
                      >
                        {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {isApplying ? "Applying..." : "Apply All Fixes"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAnalysisData(null)}>Dismiss</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {analysisData.summary.map((s) => {
                      const meta = ISSUE_META[s.type] || { label: s.type, icon: <AlertTriangle className="w-4 h-4" />, color: "text-muted-foreground", bg: "bg-muted/30 border-border/30" };
                      return (
                        <button
                          key={s.type}
                          onClick={() => setExpandedIssue(expandedIssue === s.type ? null : s.type)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${meta.bg} ${expandedIssue === s.type ? "ring-2 ring-primary/50" : "hover:ring-1 hover:ring-primary/30"}`}
                        >
                          <span className={meta.color}>{meta.icon}</span>
                          <span className="text-xs font-semibold text-foreground">{s.count}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight text-center">{meta.label}</span>
                          <span className={`text-[9px] font-mono uppercase tracking-wider ${s.severity === "high" ? "text-red-400" : s.severity === "medium" ? "text-orange-400" : "text-muted-foreground"}`}>
                            {s.severity}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {expandedIssue && (
                      <motion.div
                        key={expandedIssue}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="border border-border/30 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/30">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                              {ISSUE_META[expandedIssue]?.icon}
                              {ISSUE_META[expandedIssue]?.label || expandedIssue}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applySuggestions([expandedIssue])}
                              disabled={isApplying}
                              className="text-xs h-7 gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              Fix {ISSUE_META[expandedIssue]?.label || expandedIssue}
                            </Button>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto divide-y divide-border/20">
                            {analysisData.issues
                              .filter(i => i.issue_type === expandedIssue)
                              .map((issue, idx) => (
                                <div key={idx} className="flex items-start gap-3 px-4 py-2.5 text-xs">
                                  <span className="font-mono text-muted-foreground w-5 text-right shrink-0 mt-0.5">{issue.row_index}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-foreground/80 truncate font-mono">{issue.content}</p>
                                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1">
                                      <ChevronRight className="w-3 h-3 shrink-0" />
                                      {issue.detail}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge variant={issue.suggested_action === "delete" ? "destructive" : "warning"}>
                                      {issue.suggested_action}
                                    </Badge>
                                    <button
                                      onClick={() => applySingleSuggestion(issue.id)}
                                      disabled={isApplying}
                                      className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                                    >
                                      Fix
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {analysisData && analysisData.total_issues === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card className="p-5 border-success/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <h3 className="font-display font-bold text-foreground">Dataset is Clean</h3>
                      <p className="text-xs text-muted-foreground">No PII, bias, toxic content, duplicates, or quality issues detected.</p>
                    </div>
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAnalysisData(null)}>Dismiss</Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {mlFeedback && mlFeedback.ml_recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="p-5 border-violet-500/30 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="w-5 h-5 text-violet-400" />
                      <div>
                        <h3 className="font-display font-bold text-foreground">ML Pipeline Recommendations</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mlFeedback.ml_recommendations.length} recommendation{mlFeedback.ml_recommendations.length !== 1 ? "s" : ""} based on {mlFeedback.issues_detected.length} detected issue type{mlFeedback.issues_detected.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dataset && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => window.open(`${BASE}api/datasets/${dataset.id}/ml-feedback/export?format=md`, "_blank")}
                          >
                            <FileDown className="w-3 h-3" />
                            Markdown
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => window.open(`${BASE}api/datasets/${dataset.id}/ml-feedback/export?format=json`, "_blank")}
                          >
                            <FileDown className="w-3 h-3" />
                            JSON
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setMlFeedback(null)}>Dismiss</Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(["all", "preprocessing", "training", "evaluation"] as const).map(cat => {
                      const count = cat === "all"
                        ? mlFeedback.ml_recommendations.length
                        : mlFeedback.ml_recommendations.filter(r => r.category === cat).length;
                      if (count === 0 && cat !== "all") return null;
                      const icons: Record<string, React.ReactNode> = {
                        all: <BrainCircuit className="w-3.5 h-3.5" />,
                        preprocessing: <Wrench className="w-3.5 h-3.5" />,
                        training: <GraduationCap className="w-3.5 h-3.5" />,
                        evaluation: <FlaskConical className="w-3.5 h-3.5" />,
                      };
                      const labels: Record<string, string> = { all: "All", preprocessing: "Preprocessing", training: "Training", evaluation: "Evaluation" };
                      return (
                        <button
                          key={cat}
                          onClick={() => setMlCategory(cat)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mlCategory === cat ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}
                        >
                          {icons[cat]}
                          {labels[cat]}
                          <span className="text-[10px] opacity-60">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {mlFeedback.ml_recommendations
                      .filter(r => mlCategory === "all" || r.category === mlCategory)
                      .map((rec, idx) => {
                        const catIcons: Record<string, React.ReactNode> = {
                          preprocessing: <Wrench className="w-4 h-4 text-blue-400" />,
                          training: <GraduationCap className="w-4 h-4 text-green-400" />,
                          evaluation: <FlaskConical className="w-4 h-4 text-purple-400" />,
                        };
                        const priorityColors: Record<string, string> = {
                          critical: "text-red-400 bg-red-500/10 border-red-500/20",
                          high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                          medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                          low: "text-green-400 bg-green-500/10 border-green-500/20",
                        };
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                            className="p-3.5 rounded-xl border border-border/30 bg-muted/10 space-y-2"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="mt-0.5 shrink-0">{catIcons[rec.category]}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-foreground">{rec.title}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase ${priorityColors[rec.priority]}`}>
                                    {rec.priority}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.description}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] text-muted-foreground/60">
                                    Triggered by: <span className="text-foreground/60 font-semibold">{rec.triggered_by.toUpperCase()}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            {rec.code_snippet && (
                              <div className="mt-2 rounded-lg bg-black/30 border border-border/20 p-3 overflow-x-auto">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Code2 className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Suggested implementation</span>
                                </div>
                                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{rec.code_snippet}</pre>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isFetchingML && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="p-5 border-violet-500/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    <span className="text-sm text-muted-foreground">Generating ML pipeline recommendations...</span>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isProfiling && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="p-5 border-cyan-500/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span className="text-sm text-muted-foreground">Profiling dataset columns...</span>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {profileData && !profileData.profile && profileData.message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Card className="p-5 border-cyan-500/20">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="font-display font-bold text-foreground">Dataset Profile</h3>
                      <p className="text-xs text-muted-foreground mt-1">{profileData.message}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setProfileData(null)}>Dismiss</Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {profileData && profileData.profile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <Card className="p-5 border-cyan-500/30 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                      <div>
                        <h3 className="font-display font-bold text-foreground">Dataset Profile</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {profileData.profile.totalColumns} columns &middot; {profileData.profile.totalRows} rows &middot; {profileData.profile.completeness}% complete
                          {profileData.delimiter && <span> &middot; Delimiter: <span className="font-mono text-cyan-400">{profileData.delimiter === "\t" ? "TAB" : `"${profileData.delimiter}"`}</span></span>}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setProfileData(null)}>Dismiss</Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Column</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Type</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Missing</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Unique</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Key Stats</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.profile.columns.map((col, idx) => {
                          const typeColors: Record<string, string> = {
                            numeric: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                            categorical: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                            text: "text-green-400 bg-green-500/10 border-green-500/20",
                            datetime: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                            boolean: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                            empty: "text-gray-400 bg-gray-500/10 border-gray-500/20",
                          };
                          const typeStyle = typeColors[col.dataType] || typeColors.text;

                          let statsText = "";
                          if (col.numericStats) {
                            statsText = `min: ${col.numericStats.min}, max: ${col.numericStats.max}, mean: ${col.numericStats.mean}`;
                          } else if (col.categoricalStats?.dominantClass) {
                            statsText = `Top: "${col.categoricalStats.dominantClass.value}" (${col.categoricalStats.dominantClass.percent}%)`;
                          } else if (col.categoricalStats?.topValues?.length) {
                            statsText = `Top: "${col.categoricalStats.topValues[0].value}" (${col.categoricalStats.topValues[0].percent}%)`;
                          }

                          return (
                            <tr key={idx} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-semibold text-foreground">{col.name}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase ${typeStyle}`}>
                                  {col.dataType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={col.missingPercent > 10 ? "text-red-400 font-semibold" : col.missingPercent > 0 ? "text-yellow-400" : "text-muted-foreground"}>
                                  {col.missingPercent}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-foreground/80">{col.cardinality}</td>
                              <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[200px]">{statsText || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {profileData.biasIssues.length > 0 && (
                  <Card className="p-5 border-orange-500/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5 text-orange-400" />
                      <div>
                        <h3 className="font-display font-bold text-foreground">Bias & Fairness Findings</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {profileData.biasIssues.length} potential bias issue{profileData.biasIssues.length !== 1 ? "s" : ""} detected
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {profileData.biasIssues.map((issue, idx) => {
                        const severityColors: Record<string, string> = {
                          high: "text-red-400 bg-red-500/10 border-red-500/20",
                          medium: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                          low: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                        };
                        const issueTypeLabels: Record<string, string> = {
                          proxy_bias: "Proxy Bias",
                          class_imbalance: "Class Imbalance",
                          skewed_distribution: "Skewed Distribution",
                          underrepresented_group: "Underrepresented Group",
                        };
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                            className="p-3 rounded-xl border border-border/30 bg-muted/10"
                          >
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${severityColors[issue.severity]?.split(" ")[0] || "text-orange-400"}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-foreground font-mono">{issue.column}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground font-mono">
                                    {issueTypeLabels[issue.issueType] || issue.issueType}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase ${severityColors[issue.severity]}`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{issue.explanation}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {profileData.biasIssues.length === 0 && (
                  <Card className="p-5 border-success/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <div>
                        <h3 className="font-display font-bold text-foreground">No Bias Issues Detected</h3>
                        <p className="text-xs text-muted-foreground">No proxy bias, class imbalance, or underrepresented groups found in this dataset.</p>
                      </div>
                    </div>
                  </Card>
                )}

                {profileData.recommendations.length > 0 && (
                  <Card className="p-5 border-cyan-500/30 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <BrainCircuit className="w-5 h-5 text-cyan-400" />
                        <div>
                          <h3 className="font-display font-bold text-foreground">Profile Recommendations</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {profileData.recommendations.length} recommendation{profileData.recommendations.length !== 1 ? "s" : ""} based on column analysis
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(["all", "preprocessing", "training", "evaluation"] as const).map(cat => {
                        const count = cat === "all"
                          ? profileData.recommendations.length
                          : profileData.recommendations.filter(r => r.category === cat).length;
                        if (count === 0 && cat !== "all") return null;
                        const icons: Record<string, React.ReactNode> = {
                          all: <BrainCircuit className="w-3.5 h-3.5" />,
                          preprocessing: <Wrench className="w-3.5 h-3.5" />,
                          training: <GraduationCap className="w-3.5 h-3.5" />,
                          evaluation: <FlaskConical className="w-3.5 h-3.5" />,
                        };
                        const labels: Record<string, string> = { all: "All", preprocessing: "Preprocessing", training: "Training", evaluation: "Evaluation" };
                        return (
                          <button
                            key={cat}
                            onClick={() => setProfileRecCategory(cat)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${profileRecCategory === cat ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}
                          >
                            {icons[cat]}
                            {labels[cat]}
                            <span className="text-[10px] opacity-60">({count})</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {profileData.recommendations
                        .filter(r => profileRecCategory === "all" || r.category === profileRecCategory)
                        .map((rec, idx) => {
                          const recKey = `${rec.category}:${rec.title}:${rec.triggeredBy}`;
                          const catIcons: Record<string, React.ReactNode> = {
                            preprocessing: <Wrench className="w-4 h-4 text-blue-400" />,
                            training: <GraduationCap className="w-4 h-4 text-green-400" />,
                            evaluation: <FlaskConical className="w-4 h-4 text-purple-400" />,
                          };
                          const priorityColors: Record<string, string> = {
                            critical: "text-red-400 bg-red-500/10 border-red-500/20",
                            high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                            medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                            low: "text-green-400 bg-green-500/10 border-green-500/20",
                          };
                          return (
                            <motion.div
                              key={recKey}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.05 }}
                              className="p-3.5 rounded-xl border border-border/30 bg-muted/10 space-y-2"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="mt-0.5 shrink-0">{catIcons[rec.category]}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-foreground">{rec.title}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase ${priorityColors[rec.priority]}`}>
                                      {rec.priority}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.description}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-muted-foreground/60">
                                      Triggered by: <span className="text-foreground/60 font-semibold">{rec.triggeredBy}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {rec.codeSnippet && (
                                <div>
                                  <button
                                    onClick={() => setExpandedProfileCode(expandedProfileCode === recKey ? null : recKey)}
                                    className="flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono uppercase tracking-wider transition-colors"
                                  >
                                    <Code2 className="w-3 h-3" />
                                    {expandedProfileCode === recKey ? "Hide code" : "Show code"}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedProfileCode === recKey ? "rotate-180" : ""}`} />
                                  </button>
                                  <AnimatePresence>
                                    {expandedProfileCode === recKey && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="mt-2 rounded-lg bg-black/30 border border-border/20 p-3 overflow-x-auto">
                                          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{rec.codeSnippet}</pre>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                    </div>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`transition-all duration-300 ${isDragging ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl" : ""}`}
          >
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm rounded-2xl flex items-center justify-center pointer-events-none">
                <div className="text-primary font-bold text-lg flex items-center gap-2">
                  <Upload className="w-6 h-6" />
                  Drop file to upload
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                <Card>
                  <div className="p-4 border-b border-border/50 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Data Rows
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg overflow-hidden border border-border/50">
                        <button
                          onClick={() => setEraseMode("delete")}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-300 ${
                            eraseMode === "delete"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-muted/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />
                          Delete
                        </button>
                        <button
                          onClick={() => setEraseMode("redact")}
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-300 ${
                            eraseMode === "redact"
                              ? "bg-yellow-500 text-black"
                              : "bg-muted/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Shield className="w-3 h-3 inline mr-1" />
                          Redact
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-border/30 flex items-center gap-2">
                    {currentVersion !== latestVersion && (
                      <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">Viewing v{currentVersion} (read-only)</span>
                    )}
                    <Input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder={eraseMode === "delete" ? "Keyword to delete rows containing..." : "Keyword to redact with [REDACTED]..."}
                      className="flex-1 py-1.5 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && confirmErase()}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={confirmErase}
                      disabled={!keyword.trim() || phase === "erasing" || phase === "confirm-erase" || currentVersion !== latestVersion}
                      className="gap-1.5"
                    >
                      {eraseMode === "delete" ? <Trash2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      {eraseMode === "delete" ? "Delete" : "Redact"}
                    </Button>
                  </div>

                  {columnHeaders.length > 0 && dataset?.format === "csv" && (
                    <div className="px-4 py-3 border-b border-border/30 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Columns3 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Columns ({columnHeaders.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {columnHeaders.map((col) => (
                          <div
                            key={col}
                            className={`group flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              confirmDropColumn === col
                                ? "bg-destructive/10 border-destructive/30 text-destructive"
                                : isDroppingColumn === col
                                  ? "bg-muted/50 border-border/50 text-muted-foreground opacity-50"
                                  : "bg-primary/5 border-primary/20 text-foreground hover:bg-primary/10 hover:border-primary/30"
                            }`}
                          >
                            {isDroppingColumn === col ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : null}
                            <span>{col}</span>
                            {confirmDropColumn === col ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={() => dropColumn(col)}
                                  className="text-destructive hover:text-destructive/80 font-bold text-[10px] px-1"
                                  disabled={!!isDroppingColumn}
                                >
                                  Yes
                                </button>
                                <span className="text-muted-foreground/40">|</span>
                                <button
                                  onClick={() => setConfirmDropColumn(null)}
                                  className="text-muted-foreground hover:text-foreground font-bold text-[10px] px-1"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              currentVersion === latestVersion && columnHeaders.length > 1 && (
                                <button
                                  onClick={() => setConfirmDropColumn(col)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-0.5"
                                  disabled={!!isDroppingColumn}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
                    {rows.length === 0 && (
                      <div className="p-6 text-center text-muted-foreground text-sm">No rows</div>
                    )}
                    <AnimatePresence>
                      {rows.map((row) => (
                        <motion.div
                          key={row.id}
                          layout
                          initial={{ opacity: 1 }}
                          animate={{ opacity: row.is_removed ? 0.4 : 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4 }}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            row.is_removed
                              ? "bg-destructive/5"
                              : row.is_redacted
                                ? "bg-yellow-500/5"
                                : ""
                          }`}
                        >
                          {row.is_removed ? (
                            <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                          ) : row.is_redacted ? (
                            <Shield className="w-4 h-4 text-yellow-500 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 shrink-0" />
                          )}
                          <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                            {row.row_index}
                          </span>
                          <span className={`text-sm flex-1 ${
                            row.is_removed
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}>
                            {row.is_redacted ? highlightRedacted(row.content) : row.content}
                          </span>
                          {row.is_removed && <Badge variant="destructive">deleted</Badge>}
                          {row.is_redacted && !row.is_removed && <Badge variant="warning">redacted</Badge>}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </Card>

                <AnimatePresence>
                  {phase === "confirm-erase" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="p-5 border-destructive/30 space-y-3">
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertTriangle className="w-5 h-5" />
                          <h4 className="font-display font-bold">
                            Confirm {eraseMode === "delete" ? "Deletion" : "Redaction"}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {eraseMode === "delete" ? (
                            <>You are about to <strong className="text-destructive">delete all rows</strong> containing "<strong>{keyword}</strong>". A new version will be created.</>
                          ) : (
                            <>You are about to <strong className="text-yellow-500">redact all occurrences</strong> of "<strong>{keyword}</strong>" with [REDACTED]. A new version will be created.</>
                          )}
                        </p>
                        <div className="flex gap-3">
                          <Button variant="destructive" onClick={executeErase} className="gap-2">
                            {eraseMode === "delete" ? <Trash2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                            Confirm {eraseMode === "delete" ? "Delete" : "Redact"}
                          </Button>
                          <Button variant="secondary" onClick={cancelErase}>Cancel</Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {phase === "erasing" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="p-6 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-destructive mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">
                        {eraseMode === "delete" ? "Deleting" : "Redacting"} matching data...
                      </p>
                    </Card>
                  </motion.div>
                )}

                {phase === "erased" && eraseResult && prevVersionRows.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Before vs After
                        <span className="text-xs text-muted-foreground ml-auto">
                          v{eraseResult.version_number - 1} → v{eraseResult.version_number}
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">
                            Before (v{eraseResult.version_number - 1})
                          </div>
                          <div className="space-y-1">
                            {prevVersionRows.map((row) => {
                              const afterRow = rows.find(r => r.row_index === row.row_index);
                              const wasDeleted = afterRow?.is_removed && !row.is_removed;
                              const wasRedacted = afterRow?.is_redacted && !row.is_redacted;
                              return (
                                <motion.div
                                  key={row.id}
                                  initial={{ opacity: 1 }}
                                  animate={{ opacity: wasDeleted ? 0.5 : 1 }}
                                  transition={{ duration: 0.5 }}
                                  className={`text-xs font-mono px-2 py-1.5 rounded ${
                                    wasDeleted
                                      ? "bg-destructive/10 text-destructive line-through border-l-2 border-destructive"
                                      : wasRedacted
                                        ? "bg-yellow-500/10 border-l-2 border-yellow-500/50 text-muted-foreground"
                                        : "text-muted-foreground/60 border-l-2 border-border/30"
                                  }`}
                                >
                                  {row.content}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">
                            After (v{eraseResult.version_number})
                          </div>
                          <div className="space-y-1">
                            {rows.map((row) => {
                              const beforeRow = prevVersionRows.find(r => r.row_index === row.row_index);
                              const wasDeleted = row.is_removed && beforeRow && !beforeRow.is_removed;
                              const wasRedacted = row.is_redacted && beforeRow && !beforeRow.is_redacted;
                              return (
                                <motion.div
                                  key={row.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: wasDeleted ? 0.3 : 1 }}
                                  transition={{ duration: 0.5, delay: 0.2 }}
                                  className={`text-xs font-mono px-2 py-1.5 rounded ${
                                    wasDeleted
                                      ? "bg-destructive/5 text-destructive/40 line-through border-l-2 border-destructive/30"
                                      : wasRedacted
                                        ? "bg-yellow-500/10 border-l-2 border-yellow-500 text-foreground"
                                        : "text-foreground/80 border-l-2 border-success/30"
                                  }`}
                                >
                                  {row.is_redacted ? highlightRedacted(row.content) : row.content}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                {operations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                  >
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        Operation Log
                      </h3>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {operations.map((op) => (
                          <motion.div
                            key={op.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-xs bg-muted/30 px-3 py-2 rounded-lg flex items-start gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className={op.type === "delete" ? "text-destructive" : op.type === "auto-fix" ? "text-primary" : op.type === "drop-column" ? "text-cyan-400" : "text-yellow-500"}>
                                {op.type === "delete" ? "Deleted" : op.type === "auto-fix" ? "Auto-fixed" : op.type === "drop-column" ? "Dropped column" : "Redacted"}
                              </span>
                              {" '"}
                              <span className="font-semibold text-foreground">{op.value}</span>
                              {"' → "}
                              <span className="text-foreground font-medium">{op.affected_rows_count} row{op.affected_rows_count !== 1 ? "s" : ""}</span>
                              {" affected"}
                              <div className="text-muted-foreground/60 mt-0.5">
                                Version {versions.find(v => v.id === op.version_id)?.version_number ?? "?"}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {(phase === "erased" || verifyResult) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                  >
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" />
                        Verify Erasure
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Search to confirm the keyword is gone from the cleaned dataset.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={verifyQuery}
                          onChange={(e) => setVerifyQuery(e.target.value)}
                          placeholder='Try "Firdous"...'
                          className="text-sm py-2"
                          onKeyDown={(e) => e.key === "Enter" && verifyErasure()}
                        />
                        <Button size="sm" onClick={verifyErasure} disabled={!verifyQuery.trim()}>Verify</Button>
                      </div>
                      <AnimatePresence>
                        {verifyResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className={`p-3 rounded-lg text-sm space-y-2 ${
                              verifyResult.status === "success"
                                ? "bg-success/10 text-success border border-success/20"
                                : verifyResult.status === "partial"
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  : "bg-muted/30 text-muted-foreground border border-border/30"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {verifyResult.status === "success" ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 shrink-0" />
                              )}
                              <span className="font-semibold">
                                {verifyResult.status === "success"
                                  ? "Erasure Verified!"
                                  : verifyResult.status === "partial"
                                    ? "Partial Erasure"
                                    : "No Change"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-black/20 rounded px-2 py-1">
                                <span className="text-muted-foreground">v{verifyResult.version_before}: </span>
                                <span className="font-bold">{verifyResult.matches_before} match{verifyResult.matches_before !== 1 ? "es" : ""}</span>
                              </div>
                              <div className="bg-black/20 rounded px-2 py-1">
                                <span className="text-muted-foreground">v{verifyResult.version_after}: </span>
                                <span className="font-bold">{verifyResult.matches_after} match{verifyResult.matches_after !== 1 ? "es" : ""}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                )}

                {phase === "erased" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                  >
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Download className="w-4 h-4 text-primary" />
                        Download Dataset
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Use this cleaned dataset to retrain your model.
                      </p>
                      <div className="space-y-2">
                        <Button variant="outline" onClick={() => downloadDataset("clean")} className="w-full gap-2 justify-start text-xs">
                          <Eye className="w-3.5 h-3.5" />
                          Clean — untouched rows only
                        </Button>
                        <Button variant="outline" onClick={() => downloadDataset("redacted")} className="w-full gap-2 justify-start text-xs">
                          <Shield className="w-3.5 h-3.5" />
                          Sanitized — includes redacted text
                        </Button>
                        <Button variant="outline" onClick={() => downloadDataset("full")} className="w-full gap-2 justify-start text-xs">
                          <Database className="w-3.5 h-3.5" />
                          Full — all rows + metadata
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function highlightRedacted(text: string): React.JSX.Element {
  const parts = text.split(/(\[REDACTED\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part === "[REDACTED]" ? (
          <span key={i} className="bg-yellow-500/30 text-yellow-300 px-1 rounded font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
