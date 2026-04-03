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
import { sql, eq, and, desc, asc, ilike } from "drizzle-orm";
import { apiKeyAuth } from "../middlewares/apiKeyMiddleware";
import { getUserPlan, FREE_ROW_LIMIT } from "../middlewares/planMiddleware";
import Papa from "papaparse";
import { parseCSVBuffer, parseCSVFromRows } from "../lib/csvParser";

const router: IRouter = Router();
router.use(apiKeyAuth);

router.use((req: Request, res: Response, next) => {
  const plan = getUserPlan(req);
  if (plan === "free") {
    res.status(403).json({
      error: "API access requires a Pro, Business, or Enterprise plan",
      upgrade: true,
    });
    return;
  }
  next();
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function detectFormat(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "json") return "json";
  if (ext === "csv") return "csv";
  return "txt";
}

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

  if (format === "csv") {
    const csvResult = parseCSVBuffer(buffer);
    if (csvResult.headers.length > 1) {
      return [
        Papa.unparse([csvResult.headers], { delimiter: csvResult.delimiter, header: false }),
        ...csvResult.rawLines,
      ].filter(line => line.trim().length > 0);
    }
  }

  return text.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);
}

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

router.post("/datasets/upload", upload.single("file"), async (req: Request, res: Response) => {
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

  const plan = getUserPlan(req);
  if (plan === "free" && rows.length > FREE_ROW_LIMIT) {
    res.status(403).json({
      error: `Free plan limited to ${FREE_ROW_LIMIT} rows per dataset`,
      upgrade: true,
      rowCount: rows.length,
      limit: FREE_ROW_LIMIT,
    });
    return;
  }

  const [dataset] = await db.insert(datasetsTable).values({
    name: file.originalname,
    originalFormat: format,
    userId: req.user!.id,
  }).returning();

  await createVersionWithRows(dataset.id, 1, null, rows.map((content, i) => ({ rowIndex: i, content })));

  res.status(201).json({
    dataset_id: dataset.id,
    name: file.originalname,
    format,
    row_count: rows.length,
  });
});

router.get("/datasets", async (req: Request, res: Response) => {
  const datasets = await db.select().from(datasetsTable)
    .where(eq(datasetsTable.userId, req.user!.id))
    .orderBy(desc(datasetsTable.createdAt));

  res.json({
    datasets: datasets.map(d => ({
      id: d.id,
      name: d.name,
      format: d.originalFormat,
      created_at: d.createdAt.toISOString(),
    })),
  });
});

router.post("/datasets/:id/analyze", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(
    and(eq(datasetsTable.id, id), eq(datasetsTable.userId, req.user!.id))
  );
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const latestVersion = await getLatestVersion(id);
  if (!latestVersion) { res.status(404).json({ error: "No versions found" }); return; }

  const rows = await db.select().from(datasetRowsTable)
    .where(eq(datasetRowsTable.versionId, latestVersion.id))
    .orderBy(datasetRowsTable.rowIndex);

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  const TOXIC_WORDS = ["idiot", "stupid", "moron", "loser", "dumb", "ugly", "hate", "kill", "die"];

  interface Issue {
    issueType: string;
    severity: string;
    rowIndex: number;
    detail: string;
    suggestedAction: string;
  }

  const issues: Issue[] = [];
  const seen = new Map<string, number>();

  for (const row of rows) {
    if (row.isRemoved) continue;
    const lc = row.content.toLowerCase();

    if (EMAIL_REGEX.test(row.content)) {
      issues.push({ issueType: "pii", severity: "high", rowIndex: row.rowIndex, detail: "Email address detected", suggestedAction: "redact" });
    }
    if (PHONE_REGEX.test(row.content)) {
      issues.push({ issueType: "pii", severity: "high", rowIndex: row.rowIndex, detail: "Phone number detected", suggestedAction: "redact" });
    }
    for (const word of TOXIC_WORDS) {
      if (lc.includes(word)) {
        issues.push({ issueType: "toxic", severity: "medium", rowIndex: row.rowIndex, detail: `Toxic word: "${word}"`, suggestedAction: "delete" });
        break;
      }
    }

    const normalized = row.content.trim().toLowerCase();
    if (seen.has(normalized)) {
      issues.push({ issueType: "duplicate", severity: "low", rowIndex: row.rowIndex, detail: `Duplicate of row ${seen.get(normalized)}`, suggestedAction: "delete" });
    } else {
      seen.set(normalized, row.rowIndex);
    }
  }

  res.json({
    dataset_id: id,
    version: latestVersion.versionNumber,
    total_rows: rows.length,
    active_rows: rows.filter(r => !r.isRemoved).length,
    issues_count: issues.length,
    issues,
  });
});

router.get("/datasets/:id/result", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(
    and(eq(datasetsTable.id, id), eq(datasetsTable.userId, req.user!.id))
  );
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const allVersions = await db.select().from(datasetVersionsTable)
    .where(eq(datasetVersionsTable.datasetId, id))
    .orderBy(asc(datasetVersionsTable.versionNumber));

  if (allVersions.length === 0) { res.status(404).json({ error: "No versions found" }); return; }

  const latestVersion = allVersions[allVersions.length - 1];

  const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable).where(eq(datasetRowsTable.versionId, latestVersion.id));
  const [removedResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable).where(and(eq(datasetRowsTable.versionId, latestVersion.id), eq(datasetRowsTable.isRemoved, true)));
  const [redactedResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable).where(and(eq(datasetRowsTable.versionId, latestVersion.id), eq(datasetRowsTable.isRedacted, true), eq(datasetRowsTable.isRemoved, false)));

  const operations = await db.select().from(datasetOperationsTable)
    .where(eq(datasetOperationsTable.datasetId, id))
    .orderBy(asc(datasetOperationsTable.createdAt));

  res.json({
    dataset: {
      id: dataset.id,
      name: dataset.name,
      format: dataset.originalFormat,
      created_at: dataset.createdAt.toISOString(),
    },
    versions: allVersions.map(v => ({
      version_number: v.versionNumber,
      created_at: v.createdAt.toISOString(),
    })),
    current_version: latestVersion.versionNumber,
    stats: {
      total_rows: totalResult.count,
      removed: removedResult.count,
      redacted: redactedResult.count,
      active: totalResult.count - removedResult.count,
    },
    operations: operations.map(op => ({
      type: op.type,
      value: op.value,
      affected_rows: op.affectedRowsCount,
      created_at: op.createdAt.toISOString(),
    })),
  });
});

router.get("/datasets/:id/download", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(
    and(eq(datasetsTable.id, id), eq(datasetsTable.userId, req.user!.id))
  );
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const downloadMode = (req.query.mode as string) || "clean";
  if (!["clean", "redacted", "full"].includes(downloadMode)) {
    res.status(400).json({ error: "Invalid mode. Must be 'clean', 'redacted', or 'full'" });
    return;
  }

  const latestVersion = await getLatestVersion(id);
  if (!latestVersion) { res.status(404).json({ error: "No versions found" }); return; }

  const allRows = await db.select().from(datasetRowsTable)
    .where(eq(datasetRowsTable.versionId, latestVersion.id))
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
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${baseName}_v${latestVersion.versionNumber}_${downloadMode}.${ext}"`);
  res.send(content);
});

export default router;
