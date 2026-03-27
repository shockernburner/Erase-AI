import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db, datasetsTable, datasetRowsTable } from "@workspace/db";
import { sql, eq, and, ilike, inArray } from "drizzle-orm";

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
];

router.get("/demo", async (_req: Request, res: Response) => {
  const existing = await db.select().from(datasetsTable)
    .where(eq(datasetsTable.name, "Demo Dataset"))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(datasetRowsTable).where(eq(datasetRowsTable.datasetId, existing[0].id));
    const rowValues = DEMO_ROWS.map((content, i) => ({
      datasetId: existing[0].id,
      rowIndex: i,
      content,
    }));
    await db.insert(datasetRowsTable).values(rowValues);
    await db.update(datasetsTable).set({ rowCount: DEMO_ROWS.length }).where(eq(datasetsTable.id, existing[0].id));
    res.json({ created: false, dataset_id: existing[0].id });
    return;
  }

  const [dataset] = await db.insert(datasetsTable).values({
    name: "Demo Dataset",
    originalFormat: "json",
    rowCount: DEMO_ROWS.length,
  }).returning();

  const rowValues = DEMO_ROWS.map((content, i) => ({
    datasetId: dataset.id,
    rowIndex: i,
    content,
  }));
  await db.insert(datasetRowsTable).values(rowValues);

  res.json({ created: true, dataset_id: dataset.id });
});

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

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
    rowCount: rows.length,
  }).returning();

  const rowValues = rows.map((content, i) => ({
    datasetId: dataset.id,
    rowIndex: i,
    content,
  }));

  const BATCH_SIZE = 500;
  for (let i = 0; i < rowValues.length; i += BATCH_SIZE) {
    await db.insert(datasetRowsTable).values(rowValues.slice(i, i + BATCH_SIZE));
  }

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

  const search = (req.query.search as string) || "";
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
  const offset = (page - 1) * limit;

  let condition = eq(datasetRowsTable.datasetId, id);
  if (search) {
    condition = and(condition, ilike(datasetRowsTable.content, `%${search}%`))!;
  }

  const rows = await db.select().from(datasetRowsTable)
    .where(condition)
    .orderBy(datasetRowsTable.rowIndex)
    .limit(limit)
    .offset(offset);

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable)
    .where(condition);

  const totalRemoved = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable)
    .where(and(eq(datasetRowsTable.datasetId, id), eq(datasetRowsTable.isRemoved, true)));

  res.json({
    dataset: {
      id: dataset.id,
      name: dataset.name,
      format: dataset.originalFormat,
      row_count: dataset.rowCount,
      created_at: dataset.createdAt.toISOString(),
    },
    rows: rows.map(r => ({
      id: r.id,
      row_index: r.rowIndex,
      content: r.content,
      is_removed: r.isRemoved,
    })),
    total: countResult.count,
    removed_count: totalRemoved[0].count,
    page,
    limit,
  });
});

router.post("/:id/erase", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const { row_ids, keyword } = req.body as { row_ids?: number[]; keyword?: string };

  let erasedCount = 0;
  const erasedContents: string[] = [];

  if (row_ids && row_ids.length > 0) {
    const targetRows = await db.select().from(datasetRowsTable)
      .where(and(
        inArray(datasetRowsTable.id, row_ids),
        eq(datasetRowsTable.datasetId, id),
        eq(datasetRowsTable.isRemoved, false)
      ));

    if (targetRows.length > 0) {
      const targetIds = targetRows.map(r => r.id);
      await db.update(datasetRowsTable)
        .set({ isRemoved: true })
        .where(inArray(datasetRowsTable.id, targetIds));
      erasedCount = targetRows.length;
      erasedContents.push(...targetRows.map(r => r.content));
    }
  } else if (keyword && keyword.trim()) {
    const matchingRows = await db.select().from(datasetRowsTable)
      .where(and(
        eq(datasetRowsTable.datasetId, id),
        eq(datasetRowsTable.isRemoved, false),
        ilike(datasetRowsTable.content, `%${keyword}%`)
      ));

    if (matchingRows.length > 0) {
      const matchIds = matchingRows.map(r => r.id);
      await db.update(datasetRowsTable)
        .set({ isRemoved: true })
        .where(inArray(datasetRowsTable.id, matchIds));
      erasedCount = matchingRows.length;
      erasedContents.push(...matchingRows.map(r => r.content));
    }
  } else {
    res.status(400).json({ error: "Provide row_ids or keyword" });
    return;
  }

  const [remaining] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable)
    .where(and(eq(datasetRowsTable.datasetId, id), eq(datasetRowsTable.isRemoved, false)));

  const [totalRemoved] = await db.select({ count: sql<number>`count(*)::int` })
    .from(datasetRowsTable)
    .where(and(eq(datasetRowsTable.datasetId, id), eq(datasetRowsTable.isRemoved, true)));

  res.json({
    erased_count: erasedCount,
    erased_contents: erasedContents,
    remaining_count: remaining.count,
    removed_total: totalRemoved.count,
    total: dataset.rowCount,
    removal_percentage: Math.round((totalRemoved.count / dataset.rowCount) * 100),
  });
});

router.get("/:id/download", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const cleanRows = await db.select().from(datasetRowsTable)
    .where(and(eq(datasetRowsTable.datasetId, id), eq(datasetRowsTable.isRemoved, false)))
    .orderBy(datasetRowsTable.rowIndex);

  let content: string;
  let contentType: string;
  let ext: string;

  if (dataset.originalFormat === "json") {
    content = JSON.stringify(cleanRows.map(r => ({ text: r.content })), null, 2);
    contentType = "application/json";
    ext = "json";
  } else if (dataset.originalFormat === "csv") {
    content = cleanRows.map(r => r.content).join("\n");
    contentType = "text/csv";
    ext = "csv";
  } else {
    content = cleanRows.map(r => r.content).join("\n");
    contentType = "text/plain";
    ext = "txt";
  }

  const baseName = dataset.name.replace(/\.[^.]+$/, "");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${baseName}_cleaned.${ext}"`);
  res.send(content);
});

router.post("/:id/verify", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid dataset ID" }); return; }

  const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, id));
  if (!dataset) { res.status(404).json({ error: "Dataset not found" }); return; }

  const { query } = req.body as { query?: string };
  if (!query || !query.trim()) { res.status(400).json({ error: "Provide a search query" }); return; }

  const cleanRows = await db.select().from(datasetRowsTable)
    .where(and(eq(datasetRowsTable.datasetId, id), eq(datasetRowsTable.isRemoved, false)));

  const kw = query.toLowerCase();
  const matches = cleanRows.filter(r => r.content.toLowerCase().includes(kw));

  res.json({
    query,
    found: matches.length > 0,
    match_count: matches.length,
    matches: matches.map(r => ({ id: r.id, content: r.content, row_index: r.rowIndex })),
  });
});

export default router;
