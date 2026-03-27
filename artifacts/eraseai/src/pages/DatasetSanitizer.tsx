import { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
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
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface DatasetRow {
  id: number;
  row_index: number;
  content: string;
  is_removed: boolean;
}

interface DatasetInfo {
  id: number;
  name: string;
  format: string;
  row_count: number;
  created_at: string;
}

interface EraseResult {
  erased_count: number;
  erased_contents: string[];
  remaining_count: number;
  removed_total: number;
  total: number;
  removal_percentage: number;
}

interface VerifyResult {
  query: string;
  found: boolean;
  match_count: number;
}

type Phase = "idle" | "loading" | "loaded" | "confirm-erase" | "erasing" | "erased";

export function DatasetSanitizer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [removedCount, setRemovedCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fadingIds, setFadingIds] = useState<Set<number>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [eraseResult, setEraseResult] = useState<EraseResult | null>(null);
  const [verifyQuery, setVerifyQuery] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDataset = useCallback(async (id: number) => {
    const res = await fetch(`${BASE}api/datasets/${id}?limit=1000`);
    const data = await res.json();
    setDataset(data.dataset);
    setRows(data.rows);
    setRemovedCount(data.removed_count);
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

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectByKeyword = () => {
    if (!keyword.trim()) return;
    const kw = keyword.toLowerCase();
    const matching = rows.filter(
      (r) => !r.is_removed && r.content.toLowerCase().includes(kw)
    );
    setSelectedIds(new Set(matching.map((r) => r.id)));
  };

  const confirmErase = () => {
    if (selectedIds.size === 0) return;
    setPhase("confirm-erase");
  };

  const cancelErase = () => {
    setPhase("loaded");
  };

  const executeErase = async () => {
    if (!dataset || selectedIds.size === 0) return;
    setFadingIds(new Set(selectedIds));
    setPhase("erasing");
    setError("");

    await new Promise<void>((resolve) => setTimeout(resolve, 600));

    try {
      const res = await fetch(`${BASE}api/datasets/${dataset.id}/erase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row_ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erase failed");
      setEraseResult(data);
      setSelectedIds(new Set());
      setFadingIds(new Set());
      await fetchDataset(dataset.id);
      setPhase("erased");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erase failed");
      setFadingIds(new Set());
      setPhase("loaded");
    }
  };

  const downloadClean = () => {
    if (!dataset) return;
    window.open(`${BASE}api/datasets/${dataset.id}/download`, "_blank");
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
    setRemovedCount(0);
    setSelectedIds(new Set());
    setFadingIds(new Set());
    setKeyword("");
    setEraseResult(null);
    setVerifyQuery("");
    setVerifyResult(null);
    setError("");
    loadDemo();
  };

  const allActiveRows = rows.filter((r) => !r.is_removed);
  const removedRows = rows.filter((r) => r.is_removed);
  const allOriginalRows = [...rows].sort((a, b) => a.row_index - b.row_index);

  const activeRows = keyword.trim()
    ? allActiveRows.filter((r) => r.content.toLowerCase().includes(keyword.toLowerCase()))
    : allActiveRows;

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
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge>{dataset.format.toUpperCase()}</Badge>
                    <Badge variant={removedCount > 0 ? "warning" : "success"}>
                      {allActiveRows.length} active / {dataset.row_count} total
                    </Badge>
                    {removedCount > 0 && (
                      <Badge variant="destructive">{removedCount} erased</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {phase === "erased" && (
                  <Button variant="secondary" size="sm" onClick={downloadClean} className="gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Download Clean
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload New
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button variant="ghost" size="sm" onClick={reset}>
                  Reset
                </Button>
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
                      <Input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Filter by keyword..."
                        className="w-48 py-1.5 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && selectByKeyword()}
                      />
                      <Button size="sm" variant="secondary" onClick={selectByKeyword} disabled={!keyword.trim()}>
                        <Search className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
                    {activeRows.length === 0 && removedRows.length === 0 && (
                      <div className="p-6 text-center text-muted-foreground text-sm">No rows</div>
                    )}
                    <AnimatePresence>
                      {activeRows.map((row) => (
                        <motion.label
                          key={row.id}
                          layout
                          initial={{ opacity: 1 }}
                          animate={{
                            opacity: fadingIds.has(row.id) ? 0 : 1,
                            height: fadingIds.has(row.id) ? 0 : "auto",
                            scale: fadingIds.has(row.id) ? 0.95 : 1,
                          }}
                          transition={{ duration: 0.4 }}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                            selectedIds.has(row.id) ? "bg-destructive/5" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            disabled={phase === "erasing" || phase === "confirm-erase"}
                            className="rounded border-border text-primary focus:ring-primary/50 w-4 h-4 accent-primary"
                          />
                          <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                            {row.row_index}
                          </span>
                          <span className={`text-sm flex-1 ${selectedIds.has(row.id) ? "text-destructive" : "text-foreground"}`}>
                            {row.content}
                          </span>
                        </motion.label>
                      ))}
                    </AnimatePresence>
                    {removedRows.map((row) => (
                      <motion.div
                        key={`removed-${row.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                        <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                          {row.row_index}
                        </span>
                        <span className="text-sm line-through text-muted-foreground flex-1">
                          {row.content}
                        </span>
                        <Badge variant="destructive">erased</Badge>
                      </motion.div>
                    ))}
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
                          <h4 className="font-display font-bold">Confirm Erasure</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You are about to permanently erase <strong className="text-destructive">{selectedIds.size} row{selectedIds.size !== 1 ? "s" : ""}</strong> from this dataset. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                          <Button variant="destructive" onClick={executeErase} className="gap-2">
                            <Trash2 className="w-4 h-4" />
                            Confirm Erase
                          </Button>
                          <Button variant="secondary" onClick={cancelErase}>
                            Cancel
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedIds.size > 0 && phase === "loaded" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Button
                      variant="destructive"
                      onClick={confirmErase}
                      className="w-full gap-2"
                      size="lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Erase {selectedIds.size} Selected Row{selectedIds.size !== 1 ? "s" : ""}
                    </Button>
                  </motion.div>
                )}

                {phase === "erasing" && (
                  <Card className="p-6 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-destructive mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Erasing selected data...</p>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                <AnimatePresence>
                  {eraseResult && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <Card className="p-5 space-y-4 border-destructive/30">
                        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-destructive" />
                          Erasure Results
                        </h3>
                        <div className="space-y-3">
                          <div className="text-center">
                            <div className="text-4xl font-display font-extrabold text-destructive">
                              {eraseResult.removal_percentage}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">data removed</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-muted/30 rounded-lg p-2">
                              <div className="text-lg font-bold text-foreground">{eraseResult.erased_count}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">just erased</div>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-2">
                              <div className="text-lg font-bold text-foreground">{eraseResult.remaining_count}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">remaining</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {phase === "erased" && removedRows.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-primary" />
                        Before / After Diff
                      </h3>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {allOriginalRows.map((row) => (
                          <div
                            key={row.id}
                            className={`text-xs px-2 py-1 rounded font-mono ${
                              row.is_removed
                                ? "bg-destructive/10 text-destructive line-through border-l-2 border-destructive"
                                : "bg-success/5 text-success/80 border-l-2 border-success/30"
                            }`}
                          >
                            <span className="text-muted-foreground mr-2">{row.is_removed ? "-" : " "}</span>
                            {row.content}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {phase === "erased" && eraseResult && eraseResult.erased_contents.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-destructive" />
                          Removed Entries Log
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const logText = eraseResult.erased_contents.join("\n");
                            const blob = new Blob([logText], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "removed_entries.txt";
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="gap-1 text-xs"
                        >
                          <Download className="w-3 h-3" />
                          Export
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                        {eraseResult.erased_contents.map((content, i) => (
                          <div key={i} className="text-xs text-destructive/80 bg-destructive/5 px-2 py-1.5 rounded font-mono flex items-start gap-2">
                            <span className="text-destructive/50 shrink-0">{i + 1}.</span>
                            <span className="line-through">{content}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {phase === "erased" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" />
                        Verify Erasure
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Search the cleaned dataset to confirm erased data is gone.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={verifyQuery}
                          onChange={(e) => setVerifyQuery(e.target.value)}
                          placeholder='Try "Firdous"...'
                          className="text-sm py-2"
                          onKeyDown={(e) => e.key === "Enter" && verifyErasure()}
                        />
                        <Button size="sm" onClick={verifyErasure} disabled={!verifyQuery.trim()}>
                          Verify
                        </Button>
                      </div>

                      <AnimatePresence>
                        {verifyResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                              verifyResult.found
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                : "bg-success/10 text-success border border-success/20"
                            }`}
                          >
                            {verifyResult.found ? (
                              <>
                                <XCircle className="w-4 h-4 shrink-0" />
                                Found {verifyResult.match_count} match{verifyResult.match_count !== 1 ? "es" : ""} for "{verifyResult.query}"
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                No matches for "{verifyResult.query}" — data erased!
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                )}

                {phase === "erased" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Button variant="outline" onClick={downloadClean} className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      Download Cleaned Dataset
                    </Button>
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
