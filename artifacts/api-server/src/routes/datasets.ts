import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import {
  db,
  datasetsTable,
  datasetVersionsTable,
  datasetRowsTable,
  datasetOperationsTable,
  analysisResultsTable,
} from "@workspace/db";
import { sql, eq, and, ilike, desc, asc } from "drizzle-orm";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function parseFileContent(buffer: Buffer, format: string): string[] {
  const text = buffer.toString("utf-8").trim();
  if (!text) return [];

  if (format === "json") {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
    return parsed.map((item: unknown) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        if (typeof obj.text === "string") return obj.text;
        return JSON.stringify(item);
      }
      return String(item);
    }).filter((s: string) => s.trim().length > 0);
  }

  return text.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);
}

function detectFormat(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "json") return "json";
  if (ext === "csv") return "csv";
  return "txt";
}

const DEMO_ROWS = [
  "Firdous is CEO of X company",
  "Firdous lives in Dhaka",
  "Company X is in Bangladesh",
  "Contact firdous@xcompany.com for details",
  "He is the best leader in the industry",
  "The idiot competitor failed again",
  "Firdous lives in Dhaka",
  "Call +880-171-555-0199 for support",
];

async function createVersionWithRows(
  datasetId: number,
  versionNumber: number,
  parentVersionId: number | null,
  rows: { rowIndex: number; content: string; isRemoved?: boolean; isRedacted?: boolean; removedReason?: string | null }[]
) {
  const [version] = await db.insert(datasetVersionsTable).values({
    datasetId,
    versionNumber,
    parentVersionId,
  }).returning();

  if (rows.length > 0) {
    const rowValues = rows.map(r => ({
      versionId: version.id,
      rowIndex: r.rowIndex,
      content: r.content,
      isRemoved: r.isRemoved ?? false,
      isRedacted: r.isRedacted ?? false,
      removedReason: r.removedReason ?? null,
    }));

    const BATCH_SIZE = 500;
    for (let i = 0; i < rowValues.length; i += BATCH_SIZE) {
      await db.insert(datasetRowsTable).values(rowValues.slice(i, i + BATCH_SIZE));
    }
  }

  return version;
}

async function getLatestVersion(datasetId: number) {
  const [v] = await db.select().from(datasetVersionsTable)
    .where(eq(datasetVersionsTable.datasetId, datasetId))
    .orderBy(desc(datasetVersionsTable.versionNumber))
    .limit(1);
  return v || null;
}

router.get("/demo", async (_req: Request, res: Response) => {
  const existing = await db.select().from(datasetsTable)
    .where(eq(datasetsTable.name, "Demo Dataset"))
    .limit(1);

  if (existing.length > 0) {
    const dsId = existing[0].id;
    const allVersions = await db.select().from(datasetVersionsTable)
      .where(eq(datasetVersionsTable.datasetId, dsId));
    if (allVersions.length > 0) {
      const versionIds = allVersions.map(v => v.id);
      for (const vid of versionIds) {
        await db.delete(datasetRowsTable).where(eq(datasetRowsTable.versionId, vid));
      }
      await db.delete(datasetVersionsTable).where(eq(datasetVersionsTable.datasetId, dsId));
    }
    await db.delete(datasetOperationsTable).where(eq(datasetOperationsTable.datasetId, dsId));

    await createVersionWithRows(dsId, 1, null, DEMO_ROWS.map((content, i) => ({ rowIndex: i, content })));
    res.json({ created: false, dataset_id: dsId });
    return;
  }

  const [dataset] = await db.insert(datasetsTable).values({
    name: "Demo Dataset",
    originalFormat: "json",
  }).returning();

  await createVersionWithRows(dataset.id, 1, null, DEMO_ROWS.map((content, i) => ({ rowIndex: i, content })));
  res.json({ created: true, dataset_id: dataset.id });
});

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const format = detectFormat(file.originalname);
  let rows: string[];
  try {
    rows = parseFileContent(file.buffer, format);
  } catch (err) {
    res.status(400).json({ error: `Failed to parse file: ${err instanceof Error ? err.message : "unknown error"}` });
    return;
  }

  if (rows.length === 0) {
    res.status(400).json({ error: "File contains no data rows" });
    return;
  }

  const [dataset] = await db.insert(datasetsTable).values({
    name: file.originalname,
    originalFormat: format,
  }).returning();

  await createVersionWithRows(dataset.id, 1, null, rows.map((content, i) => ({ rowIndex: i, content })));

  res.json({
    dataset_id: dataset.id,
    name: file.originalname,
    format,
    row_count: rows.length,
  });
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const versionParam = req.query.version ? parseInt(req.query.version as string, 10) : null;

  const allVersions = await db.select().from(datasetVersionsTable)
    .where(eq(datasetVersionsTable.datasetId, id))
    .orderBy(asc(datasetVersionsTable.versionNumber));

  if (allVersions.length === 0) {
    res.status(404).json({ error: "No versions found" });
    return;
  }

  const targetVersion = versionParam
    ? allVersions.find(v => v.versionNumber === versionParam)
    : allVersions[allVersions.length - 1];

  if (!targetVersion) {
    res.status(404).json({ error: `Version ${versionParam} not found` });
    return;
  }

  const search = (req.query.search as string) || "";
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 1000));

  const baseCondition = eq(datasetRowsTable.versionId, targetVersion.id);
  const finalCondition = search
    ? and(baseCondition, ilike(datasetRowsTable.content, `%${search}%`))!
    : baseCondition;

  const rows = await db.select().from(datasetRowsTable)
    .where(finalCondition)
    .orderBy(datasetRowsTable.rowIndex)
    .limit(limit);

  const operations = await db.select().from(datasetOperationsTable)
    .where(eq(datasetOperationsTable.datasetId, id))
    .orderBy(asc(datasetOperationsTable.createdAt));

  const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable).where(eq(datasetRowsTable.versionId, targetVersion.id));
  const [removedResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable).where(and(eq(datasetRowsTable.versionId, targetVersion.id), eq(datasetRowsTable.isRemoved, true)));
  const [redactedResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable).where(and(eq(datasetRowsTable.versionId, targetVersion.id), eq(datasetRowsTable.isRedacted, true), eq(datasetRowsTable.isRemoved, false)));

  const totalRows = totalResult.count;
  const removedCount = removedResult.count;
  const redactedCount = redactedResult.count;
  const activeCount = totalRows - removedCount;

  res.json({
    dataset: {
      id: dataset.id,
      name: dataset.name,
      format: dataset.originalFormat,
      created_at: dataset.createdAt.toISOString(),
    },
    versions: allVersions.map(v => ({
      id: v.id,
      version_number: v.versionNumber,
      parent_version_id: v.parentVersionId,
      created_at: v.createdAt.toISOString(),
    })),
    current_version: targetVersion.versionNumber,
    latest_version: allVersions[allVersions.length - 1].versionNumber,
    rows: rows.map(r => ({
      id: r.id,
      row_index: r.rowIndex,
      content: r.content,
      is_removed: r.isRemoved,
      is_redacted: r.isRedacted,
      removed_reason: r.removedReason,
    })),
    total: totalRows,
    removed_count: removedCount,
    redacted_count: redactedCount,
    active_count: activeCount,
    operations: operations.map(op => ({
      id: op.id,
      type: op.type,
      value: op.value,
      affected_rows_count: op.affectedRowsCount,
      version_id: op.versionId,
      created_at: op.createdAt.toISOString(),
    })),
  });
});

router.post("/:id/erase", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const { mode, value } = req.body as { mode?: string; value?: string };
  if (!mode || !value || !value.trim()) {
    res.status(400).json({ error: "Provide mode ('delete' | 'redact') and value (keyword)" });
    return;
  }
  if (mode !== "delete" && mode !== "redact") {
    res.status(400).json({ error: "Mode must be 'delete' or 'redact'" });
    return;
  }

  const latestVersion = await getLatestVersion(id);
  if (!latestVersion) { res.status(404).json({ error: "No versions found" }); return; }

  const currentRows = await db.select().from(datasetRowsTable)
    .where(eq(datasetRowsTable.versionId, latestVersion.id))
    .orderBy(datasetRowsTable.rowIndex);

  const keyword = value.trim();
  const keywordLower = keyword.toLowerCase();
  let affectedCount = 0;

  const newRows = currentRows.map(row => {
    if (row.isRemoved) {
      return { rowIndex: row.rowIndex, content: row.content, isRemoved: true, isRedacted: row.isRedacted, removedReason: row.removedReason };
    }

    const contentLower = row.content.toLowerCase();
    if (!contentLower.includes(keywordLower)) {
      return { rowIndex: row.rowIndex, content: row.content, isRemoved: false, isRedacted: row.isRedacted, removedReason: row.removedReason };
    }

    affectedCount++;

    if (mode === "delete") {
      return { rowIndex: row.rowIndex, content: row.content, isRemoved: true, isRedacted: false, removedReason: `Deleted: keyword "${keyword}"` };
    } else {
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const redactedContent = row.content.replace(regex, "[REDACTED]");
      return { rowIndex: row.rowIndex, content: redactedContent, isRemoved: false, isRedacted: true, removedReason: `Redacted: keyword "${keyword}"` };
    }
  });

  if (affectedCount === 0) {
    res.json({
      message: "No matching rows found",
      affected_count: 0,
      version_number: latestVersion.versionNumber,
    });
    return;
  }

  const newVersionNumber = latestVersion.versionNumber + 1;
  const newVersion = await createVersionWithRows(id, newVersionNumber, latestVersion.id, newRows);

  await db.insert(datasetOperationsTable).values({
    datasetId: id,
    versionId: newVersion.id,
    type: mode,
    value: keyword,
    affectedRowsCount: affectedCount,
  });

  const remaining = newRows.filter(r => !r.isRemoved).length;
  const removed = newRows.filter(r => r.isRemoved).length;
  const redacted = newRows.filter(r => r.isRedacted && !r.isRemoved).length;

  res.json({
    version_number: newVersionNumber,
    mode,
    keyword,
    affected_count: affectedCount,
    impact: {
      removed,
      redacted,
      remaining,
      total: newRows.length,
      impact_percent: Math.round((affectedCount / newRows.length) * 100),
    },
  });
});

router.get("/:id/download", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const downloadMode = (req.query.mode as string) || "clean";
  if (!["clean", "redacted", "full"].includes(downloadMode)) {
    res.status(400).json({ error: "Invalid mode. Must be 'clean', 'redacted', or 'full'" });
    return;
  }
  const versionParam = req.query.version ? parseInt(req.query.version as string, 10) : null;

  let targetVersion;
  if (versionParam) {
    const [v] = await db.select().from(datasetVersionsTable)
      .where(and(eq(datasetVersionsTable.datasetId, id), eq(datasetVersionsTable.versionNumber, versionParam)));
    targetVersion = v;
  } else {
    targetVersion = await getLatestVersion(id);
  }

  if (!targetVersion) { res.status(404).json({ error: "Version not found" }); return; }

  const allRows = await db.select().from(datasetRowsTable)
    .where(eq(datasetRowsTable.versionId, targetVersion.id))
    .orderBy(datasetRowsTable.rowIndex);

  let outputRows;
  if (downloadMode === "clean") {
    outputRows = allRows.filter(r => !r.isRemoved && !r.isRedacted);
  } else if (downloadMode === "redacted") {
    outputRows = allRows.filter(r => !r.isRemoved);
  } else {
    outputRows = allRows;
  }

  let content: string;
  let contentType: string;
  let ext: string;

  if (dataset.originalFormat === "json") {
    const jsonRows = downloadMode === "full"
      ? outputRows.map(r => ({ text: r.content, is_removed: r.isRemoved, is_redacted: r.isRedacted, removed_reason: r.removedReason }))
      : outputRows.map(r => ({ text: r.content }));
    content = JSON.stringify(jsonRows, null, 2);
    contentType = "application/json";
    ext = "json";
  } else if (dataset.originalFormat === "csv") {
    content = outputRows.map(r => r.content).join("\n");
    contentType = "text/csv";
    ext = "csv";
  } else {
    content = outputRows.map(r => r.content).join("\n");
    contentType = "text/plain";
    ext = "txt";
  }

  const baseName = dataset.name.replace(/\.[^.]+$/, "");
  const suffix = downloadMode === "full" ? "full" : downloadMode === "redacted" ? "redacted" : "cleaned";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${baseName}_v${targetVersion.versionNumber}_${suffix}.${ext}"`);
  res.send(content);
});

router.post("/:id/verify", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const { query } = req.body as { query?: string };
  if (!query || !query.trim()) { res.status(400).json({ error: "Provide a search query" }); return; }

  const allVersions = await db.select().from(datasetVersionsTable)
    .where(eq(datasetVersionsTable.datasetId, id))
    .orderBy(asc(datasetVersionsTable.versionNumber));

  if (allVersions.length === 0) { res.status(404).json({ error: "No versions found" }); return; }

  const latestVersion = allVersions[allVersions.length - 1];
  const previousVersion = allVersions.length >= 2 ? allVersions[allVersions.length - 2] : allVersions[0];

  const kw = query.trim().toLowerCase();

  const prevRows = await db.select().from(datasetRowsTable)
    .where(and(eq(datasetRowsTable.versionId, previousVersion.id), eq(datasetRowsTable.isRemoved, false)));
  const matchesBefore = prevRows.filter(r => r.content.toLowerCase().includes(kw)).length;

  const latestRows = await db.select().from(datasetRowsTable)
    .where(and(eq(datasetRowsTable.versionId, latestVersion.id), eq(datasetRowsTable.isRemoved, false)));
  const matchesAfter = latestRows.filter(r => r.content.toLowerCase().includes(kw)).length;

  res.json({
    query: query.trim(),
    matches_before: matchesBefore,
    matches_after: matchesAfter,
    status: matchesAfter === 0 && matchesBefore > 0 ? "success" : matchesAfter < matchesBefore ? "partial" : "unchanged",
    version_before: previousVersion.versionNumber,
    version_after: latestVersion.versionNumber,
  });
});

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
const GENDER_BIAS_WORDS = ["he is", "she is", "his wife", "her husband", "mankind", "manpower", "chairman", "salesgirl", "stewardess", "fireman", "policeman", "housewife"];
const RACIAL_BIAS_WORDS = ["illegal alien", "colored people", "oriental", "third world"];
const TOXIC_WORDS = ["idiot", "stupid", "moron", "loser", "dumb", "ugly", "hate", "kill", "die", "attack", "destroy"];

interface AnalysisIssue {
  issueType: string;
  severity: string;
  rowIndex: number;
  content: string;
  detail: string;
  suggestedAction: string;
  suggestedValue: string | null;
}

function analyzeRows(rows: { rowIndex: number; content: string; isRemoved: boolean }[]): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const seen = new Map<string, number>();

  for (const row of rows) {
    if (row.isRemoved) continue;
    const lc = row.content.toLowerCase();

    if (EMAIL_REGEX.test(row.content)) {
      const match = row.content.match(EMAIL_REGEX)![0];
      issues.push({
        issueType: "pii",
        severity: "high",
        rowIndex: row.rowIndex,
        content: row.content,
        detail: `Email address detected: ${match}`,
        suggestedAction: "redact",
        suggestedValue: match,
      });
    }

    if (PHONE_REGEX.test(row.content)) {
      const match = row.content.match(PHONE_REGEX)![0];
      issues.push({
        issueType: "pii",
        severity: "high",
        rowIndex: row.rowIndex,
        content: row.content,
        detail: `Phone number detected: ${match}`,
        suggestedAction: "redact",
        suggestedValue: match,
      });
    }

    for (const word of GENDER_BIAS_WORDS) {
      if (lc.includes(word)) {
        issues.push({
          issueType: "bias",
          severity: "medium",
          rowIndex: row.rowIndex,
          content: row.content,
          detail: `Gender-biased language: "${word}"`,
          suggestedAction: "redact",
          suggestedValue: word,
        });
        break;
      }
    }

    for (const word of RACIAL_BIAS_WORDS) {
      if (lc.includes(word)) {
        issues.push({
          issueType: "bias",
          severity: "high",
          rowIndex: row.rowIndex,
          content: row.content,
          detail: `Racially biased language: "${word}"`,
          suggestedAction: "delete",
          suggestedValue: null,
        });
        break;
      }
    }

    for (const word of TOXIC_WORDS) {
      if (lc.includes(word)) {
        issues.push({
          issueType: "toxic",
          severity: "high",
          rowIndex: row.rowIndex,
          content: row.content,
          detail: `Toxic/harmful language: "${word}"`,
          suggestedAction: "delete",
          suggestedValue: null,
        });
        break;
      }
    }

    const normalized = row.content.trim().toLowerCase();
    const prevIndex = seen.get(normalized);
    if (prevIndex !== undefined) {
      issues.push({
        issueType: "duplicate",
        severity: "low",
        rowIndex: row.rowIndex,
        content: row.content,
        detail: `Duplicate of row ${prevIndex}`,
        suggestedAction: "delete",
        suggestedValue: null,
      });
    } else {
      seen.set(normalized, row.rowIndex);
    }

    if (row.content.trim().length < 5 && row.content.trim().length > 0) {
      issues.push({
        issueType: "quality",
        severity: "low",
        rowIndex: row.rowIndex,
        content: row.content,
        detail: "Very short entry — may be incomplete or noisy data",
        suggestedAction: "delete",
        suggestedValue: null,
      });
    }

    if (row.content.trim().length === 0) {
      issues.push({
        issueType: "quality",
        severity: "medium",
        rowIndex: row.rowIndex,
        content: row.content,
        detail: "Empty row — no usable data",
        suggestedAction: "delete",
        suggestedValue: null,
      });
    }
  }

  return issues;
}

router.post("/:id/analyze", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const latestVersion = await getLatestVersion(id);
  if (!latestVersion) { res.status(404).json({ error: "No versions found" }); return; }

  const currentRows = await db.select().from(datasetRowsTable)
    .where(eq(datasetRowsTable.versionId, latestVersion.id))
    .orderBy(datasetRowsTable.rowIndex);

  const issues = analyzeRows(currentRows);

  await db.delete(analysisResultsTable)
    .where(and(eq(analysisResultsTable.datasetId, id), eq(analysisResultsTable.versionId, latestVersion.id)));

  if (issues.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < issues.length; i += BATCH) {
      await db.insert(analysisResultsTable).values(
        issues.slice(i, i + BATCH).map(issue => ({
          datasetId: id,
          versionId: latestVersion.id,
          issueType: issue.issueType,
          severity: issue.severity,
          rowIndex: issue.rowIndex,
          content: issue.content,
          detail: issue.detail,
          suggestedAction: issue.suggestedAction,
          suggestedValue: issue.suggestedValue,
        }))
      );
    }
  }

  const summary: Record<string, { count: number; severity: string; rows: number[] }> = {};
  for (const issue of issues) {
    if (!summary[issue.issueType]) {
      summary[issue.issueType] = { count: 0, severity: issue.severity, rows: [] };
    }
    summary[issue.issueType].count++;
    if (!summary[issue.issueType].rows.includes(issue.rowIndex)) {
      summary[issue.issueType].rows.push(issue.rowIndex);
    }
    if (issue.severity === "high" && summary[issue.issueType].severity !== "high") {
      summary[issue.issueType].severity = "high";
    }
  }

  res.json({
    dataset_id: id,
    version: latestVersion.versionNumber,
    total_issues: issues.length,
    summary: Object.entries(summary).map(([type, data]) => ({
      type,
      count: data.count,
      severity: data.severity,
      affected_rows: data.rows.length,
    })),
    issues: await (async () => {
      const stored = await db.select().from(analysisResultsTable)
        .where(and(eq(analysisResultsTable.datasetId, id), eq(analysisResultsTable.versionId, latestVersion.id)));
      return stored.map(i => ({
        id: i.id,
        issue_type: i.issueType,
        severity: i.severity,
        row_index: i.rowIndex,
        content: i.content,
        detail: i.detail,
        suggested_action: i.suggestedAction,
        suggested_value: i.suggestedValue,
      }));
    })(),
  });
});

router.post("/:id/apply-suggestions", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const { issue_types, suggestion_ids } = req.body as { issue_types?: string[]; suggestion_ids?: number[] };
  if ((!issue_types || !Array.isArray(issue_types) || issue_types.length === 0) &&
      (!suggestion_ids || !Array.isArray(suggestion_ids) || suggestion_ids.length === 0)) {
    res.status(400).json({ error: "Provide issue_types array or suggestion_ids array" });
    return;
  }

  const latestVersion = await getLatestVersion(id);
  if (!latestVersion) { res.status(404).json({ error: "No versions found" }); return; }

  const storedIssues = await db.select().from(analysisResultsTable)
    .where(and(eq(analysisResultsTable.datasetId, id), eq(analysisResultsTable.versionId, latestVersion.id)));

  const relevantIssues = suggestion_ids && suggestion_ids.length > 0
    ? storedIssues.filter(i => suggestion_ids.includes(i.id))
    : storedIssues.filter(i => issue_types!.includes(i.issueType));
  if (relevantIssues.length === 0) {
    res.json({ message: "No matching issues to apply", affected_count: 0, version_number: latestVersion.versionNumber });
    return;
  }

  const currentRows = await db.select().from(datasetRowsTable)
    .where(eq(datasetRowsTable.versionId, latestVersion.id))
    .orderBy(datasetRowsTable.rowIndex);

  const deleteRows = new Set<number>();
  const redactMap = new Map<number, string[]>();

  for (const issue of relevantIssues) {
    if (issue.suggestedAction === "delete") {
      deleteRows.add(issue.rowIndex);
    } else if (issue.suggestedAction === "redact" && issue.suggestedValue) {
      if (!redactMap.has(issue.rowIndex)) redactMap.set(issue.rowIndex, []);
      redactMap.get(issue.rowIndex)!.push(issue.suggestedValue);
    }
  }

  let affectedCount = 0;
  const newRows = currentRows.map(row => {
    if (row.isRemoved) {
      return { rowIndex: row.rowIndex, content: row.content, isRemoved: true, isRedacted: row.isRedacted, removedReason: row.removedReason };
    }

    if (deleteRows.has(row.rowIndex)) {
      affectedCount++;
      return { rowIndex: row.rowIndex, content: row.content, isRemoved: true, isRedacted: false, removedReason: "Auto-fix: analysis suggestion" };
    }

    const redactValues = redactMap.get(row.rowIndex);
    if (redactValues && redactValues.length > 0) {
      affectedCount++;
      let content = row.content;
      for (const val of redactValues) {
        const regex = new RegExp(val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        content = content.replace(regex, "[REDACTED]");
      }
      return { rowIndex: row.rowIndex, content, isRemoved: false, isRedacted: true, removedReason: "Auto-fix: analysis suggestion" };
    }

    return { rowIndex: row.rowIndex, content: row.content, isRemoved: row.isRemoved, isRedacted: row.isRedacted, removedReason: row.removedReason };
  });

  const newVersionNumber = latestVersion.versionNumber + 1;
  const newVersion = await createVersionWithRows(id, newVersionNumber, latestVersion.id, newRows);

  await db.insert(datasetOperationsTable).values({
    datasetId: id,
    versionId: newVersion.id,
    type: "auto-fix",
    value: suggestion_ids && suggestion_ids.length > 0 ? `suggestion #${suggestion_ids.join(", #")}` : (issue_types ?? []).join(", "),
    affectedRowsCount: affectedCount,
  });

  const removed = newRows.filter(r => r.isRemoved).length;
  const redacted = newRows.filter(r => r.isRedacted && !r.isRemoved).length;
  const remaining = newRows.filter(r => !r.isRemoved).length;

  res.json({
    version_number: newVersionNumber,
    affected_count: affectedCount,
    applied_types: issue_types,
    impact: {
      removed,
      redacted,
      remaining,
      total: newRows.length,
      impact_percent: Math.round((affectedCount / newRows.length) * 100),
    },
  });
});

export default router;
