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
  ArrowRight,
  GitBranch,
  Shield,
  ChevronDown,
  History,
  BarChart3,
  Eye,
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

type Phase = "idle" | "loading" | "loaded" | "confirm-erase" | "erasing" | "erased";
type EraseMode = "delete" | "redact";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDataset = useCallback(async (id: number, version?: number) => {
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
  }, []);

  const fetchVersionRows = useCallback(async (id: number, version: number) => {
    const res = await fetch(`${BASE}api/datasets/${id}?limit=1000&version=${version}`);
    const data = await res.json();
    return data.rows as DatasetRow[];
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
    } catch {
      setError("Failed to load demo dataset");
      setPhase("idle");
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
    loadDemo();
  };

  const activeRows = rows.filter((r) => !r.is_removed);
  const allActiveRows = rows.filter((r) => !r.is_removed);

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

      {phase === "loading" && (
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading dataset...</p>
        </Card>
      )}

      {(phase === "loaded" || phase === "confirm-erase" || phase === "erasing" || phase === "erased") && dataset && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
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
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload New
                </Button>
                <input ref={fileInputRef} type="file" accept=".json,.csv,.txt" onChange={handleFileChange} className="hidden" />
                <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
              </div>
            </div>
          </Card>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`transition-all duration-200 ${isDragging ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl" : ""}`}
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
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
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
                          className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
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
                          transition={{ duration: 0.3 }}
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
                              : row.is_redacted
                                ? "text-foreground"
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
                  <Card className="p-6 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-destructive mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      {eraseMode === "delete" ? "Deleting" : "Redacting"} matching data...
                    </p>
                  </Card>
                )}

                {phase === "erased" && eraseResult && prevVersionRows.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-primary" />
                        Before / After Diff
                        <span className="text-xs text-muted-foreground ml-auto">
                          v{eraseResult.version_number - 1} → v{eraseResult.version_number}
                        </span>
                      </h3>
                      <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {prevVersionRows.map((beforeRow) => {
                          const afterRow = rows.find(r => r.row_index === beforeRow.row_index);
                          const wasDeleted = afterRow?.is_removed && !beforeRow.is_removed;
                          const wasRedacted = afterRow?.is_redacted && !beforeRow.is_redacted;
                          const unchanged = !wasDeleted && !wasRedacted;

                          return (
                            <div key={beforeRow.id} className="text-xs font-mono">
                              {wasDeleted && (
                                <div className="bg-destructive/10 text-destructive px-2 py-1.5 rounded border-l-2 border-destructive">
                                  <span className="mr-2">-</span>
                                  <span className="line-through">{beforeRow.content}</span>
                                </div>
                              )}
                              {wasRedacted && (
                                <>
                                  <div className="bg-destructive/5 text-muted-foreground px-2 py-1 rounded-t border-l-2 border-yellow-500/50">
                                    <span className="mr-2">-</span>
                                    {beforeRow.content}
                                  </div>
                                  <div className="bg-yellow-500/10 text-foreground px-2 py-1 rounded-b border-l-2 border-yellow-500">
                                    <span className="mr-2 text-yellow-500">+</span>
                                    {afterRow ? highlightRedacted(afterRow.content) : ""}
                                  </div>
                                </>
                              )}
                              {unchanged && (
                                <div className="text-muted-foreground/50 px-2 py-1 border-l-2 border-border/30">
                                  <span className="mr-2">&nbsp;</span>
                                  {beforeRow.content}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                {eraseResult && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="p-5 space-y-4 border-primary/30">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Impact Summary
                      </h3>
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-4xl font-display font-extrabold text-primary">
                            {eraseResult.impact.impact_percent}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">data affected</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-destructive/10 rounded-lg p-2">
                            <div className="text-lg font-bold text-destructive">{eraseResult.impact.removed}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">deleted</div>
                          </div>
                          <div className="bg-yellow-500/10 rounded-lg p-2">
                            <div className="text-lg font-bold text-yellow-500">{eraseResult.impact.redacted}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">redacted</div>
                          </div>
                          <div className="bg-success/10 rounded-lg p-2">
                            <div className="text-lg font-bold text-success">{eraseResult.impact.remaining}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">remaining</div>
                          </div>
                        </div>
                        <div className="text-xs text-center text-muted-foreground">
                          Version {eraseResult.version_number} created
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {operations.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        Operation Log
                      </h3>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {operations.map((op) => (
                          <div key={op.id} className="text-xs bg-muted/30 px-3 py-2 rounded-lg flex items-start gap-2">
                            {op.type === "delete" ? (
                              <Trash2 className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                            ) : (
                              <Shield className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <span className={op.type === "delete" ? "text-destructive" : "text-yellow-500"}>
                                {op.type === "delete" ? "Deleted" : "Redacted"}
                              </span>
                              {" '"}
                              <span className="font-semibold text-foreground">{op.value}</span>
                              {"' → "}
                              <span className="text-foreground font-medium">{op.affected_rows_count} row{op.affected_rows_count !== 1 ? "s" : ""}</span>
                              {" affected"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {phase === "erased" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Download className="w-4 h-4 text-primary" />
                        Download Dataset
                      </h3>
                      <div className="space-y-2">
                        <Button variant="outline" onClick={() => downloadDataset("clean")} className="w-full gap-2 justify-start text-xs">
                          <Eye className="w-3.5 h-3.5" />
                          Clean — unmodified rows only
                        </Button>
                        <Button variant="outline" onClick={() => downloadDataset("redacted")} className="w-full gap-2 justify-start text-xs">
                          <Shield className="w-3.5 h-3.5" />
                          Active — all non-deleted rows
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
