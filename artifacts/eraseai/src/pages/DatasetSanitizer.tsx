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
  Play,
  Zap,
  ScanSearch,
  ChevronRight,
  Sparkles,
  Bug,
  Copy,
  MessageSquareWarning,
  ShieldAlert,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

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

type Phase = "idle" | "loading" | "loaded" | "confirm-erase" | "erasing" | "erased";
type EraseMode = "delete" | "redact";

const ISSUE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pii: { label: "PII / Personal Data", icon: <ShieldAlert className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  bias: { label: "Biased Language", icon: <MessageSquareWarning className="w-4 h-4" />, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  toxic: { label: "Toxic Content", icon: <Bug className="w-4 h-4" />, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  duplicate: { label: "Duplicate Rows", icon: <Copy className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  quality: { label: "Low Quality", icon: <AlertTriangle className="w-4 h-4" />, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
};

export function DatasetSanitizer() {
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
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoStep, setDemoStep] = useState("");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
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
    return data;
  }, []);

  useEffect(() => {
    if (phase === "idle") {
      loadDemo();
    }
  }, []);

  const loadDemo = async () => {
    setPhase("loading");
    setError("");
    try {
      const res = await fetch(`${BASE}api/datasets/demo`);
      const data = await res.json();
      await fetchDataset(data.dataset_id);
      setPhase("loaded");
      return data.dataset_id;
    } catch {
      setError("Failed to load demo dataset");
      setPhase("idle");
      return null;
    }
  };

  const runFullDemo = async () => {
    if (isRunningDemo) return;
    setIsRunningDemo(true);
    setError("");
    setEraseResult(null);
    setVerifyResult(null);
    setPrevVersionRows([]);

    try {
      setDemoStep("Loading demo dataset...");
      setPhase("loading");
      const demoRes = await fetch(`${BASE}api/datasets/demo`);
      if (!demoRes.ok) throw new Error("Failed to load demo dataset");
      const demoData = await demoRes.json();
      const dsId = demoData.dataset_id;
      const snapshot = await fetchDataset(dsId);
      setPhase("loaded");
      await delay(500);

      setDemoStep("Analyzing dataset for issues...");
      const analyzeRes = await fetch(`${BASE}api/datasets/${dsId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!analyzeRes.ok) throw new Error("Analysis failed");
      const analyzeData = await analyzeRes.json();
      setAnalysisData(analyzeData);
      if (analyzeData.summary.length > 0) {
        setExpandedIssue(analyzeData.summary[0].type);
      }
      await delay(800);

      if (analyzeData.total_issues > 0) {
        setDemoStep("Applying suggested fixes...");
        const applyRes = await fetch(`${BASE}api/datasets/${dsId}/apply-suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issue_types: analyzeData.summary.map((s: AnalysisIssueSummary) => s.type) }),
        });
        if (!applyRes.ok) throw new Error("Failed to apply fixes");
        const applyData = await applyRes.json();
        const fixSnapshot = await fetchDataset(dsId);
        setPrevVersionRows(snapshot.rows);
        setEraseResult({
          version_number: applyData.version_number,
          mode: "auto-fix",
          keyword: "all issues",
          affected_count: applyData.affected_count,
          impact: applyData.impact,
        });
        setAnalysisData(null);
        setPhase("erased");
        await delay(800);

        setDemoStep("Erasing 'Firdous' from dataset...");
        setKeyword("Firdous");
        setEraseMode("delete");
        setPrevVersionRows(fixSnapshot.rows);
        setPhase("erasing");
        await delay(300);

        const eraseRes = await fetch(`${BASE}api/datasets/${dsId}/erase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "delete", value: "Firdous" }),
        });
        if (!eraseRes.ok) throw new Error("Erase operation failed");
        const eraseData = await eraseRes.json();
        setEraseResult(eraseData);
        await fetchDataset(dsId);
        setKeyword("");
        setPhase("erased");
        await delay(600);
      }

      setDemoStep("Verifying erasure...");
      const verifyAfterRes = await fetch(`${BASE}api/datasets/${dsId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Firdous" }),
      });
      if (!verifyAfterRes.ok) throw new Error("Verification failed");
      const verifyAfter = await verifyAfterRes.json();
      setVerifyQuery("Firdous");
      setVerifyResult(verifyAfter);
      await delay(400);

      setDemoStep("Demo complete!");
      await delay(500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo failed. Please try again.");
      setPhase("loaded");
    } finally {
      setDemoStep("");
      setIsRunningDemo(false);
    }
  };

  const uploadFile = async (file: File) => {
    setPhase("loading");
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}api/datasets/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
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
    loadDemo();
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
      setAnalysisData(prev => {
        if (!prev) return null;
        const updated = { ...prev, issues: prev.issues.filter(i => i.id !== suggestionId) };
        updated.total_issues = updated.issues.length;
        updated.summary = updated.summary.map(s => ({
          ...s,
          count: updated.issues.filter(i => i.issue_type === s.type).length,
          affected_rows: new Set(updated.issues.filter(i => i.issue_type === s.type).map(i => i.row_index)).size,
        })).filter(s => s.count > 0);
        if (updated.total_issues === 0) return null;
        return updated;
      });
      setPhase("erased");
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
        {isRunningDemo && demoStep && (
          <motion.div
            key="demo-step"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary"
          >
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            <span className="font-semibold text-sm">{demoStep}</span>
            <div className="ml-auto flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {phase === "loading" && !isRunningDemo && (
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading dataset...</p>
        </Card>
      )}

      {(phase === "loaded" || phase === "confirm-erase" || phase === "erasing" || phase === "erased" || (phase === "loading" && isRunningDemo)) && dataset && (
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
                        onClick={() => !isRunningDemo && setShowVersionDropdown(!showVersionDropdown)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold transition-colors ${isRunningDemo ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/20"}`}
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
                  onClick={runFullDemo}
                  disabled={isRunningDemo}
                  className="gap-2 bg-gradient-to-r from-primary to-cyan-400 text-black font-bold hover:from-primary/90 hover:to-cyan-400/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] px-4"
                  size="sm"
                >
                  {isRunningDemo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Full Demo
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeDataset}
                  disabled={isRunningDemo || isAnalyzing}
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5" disabled={isRunningDemo}>
                  <Upload className="w-3.5 h-3.5" />
                  Upload New
                </Button>
                <input ref={fileInputRef} type="file" accept=".json,.csv,.txt" onChange={handleFileChange} className="hidden" />
                <Button variant="ghost" size="sm" onClick={reset} disabled={isRunningDemo}>Reset</Button>
              </div>
            </div>
          </Card>

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
                        disabled={isApplying || isRunningDemo}
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
                              disabled={isApplying || isRunningDemo}
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
                      disabled={isRunningDemo}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={confirmErase}
                      disabled={!keyword.trim() || phase === "erasing" || phase === "confirm-erase" || currentVersion !== latestVersion || isRunningDemo}
                      className="gap-1.5"
                    >
                      {eraseMode === "delete" ? <Trash2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      {eraseMode === "delete" ? "Delete" : "Redact"}
                    </Button>
                  </div>

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
                              <span className={op.type === "delete" ? "text-destructive" : op.type === "auto-fix" ? "text-primary" : "text-yellow-500"}>
                                {op.type === "delete" ? "Deleted" : op.type === "auto-fix" ? "Auto-fixed" : "Redacted"}
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
                          disabled={isRunningDemo}
                        />
                        <Button size="sm" onClick={verifyErasure} disabled={!verifyQuery.trim() || isRunningDemo}>Verify</Button>
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
