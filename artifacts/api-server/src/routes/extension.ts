import { Router, type IRouter, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat, readFile } from "node:fs/promises";

const router: IRouter = Router();

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const METADATA_PATH = path.resolve(moduleDir, "extension-metadata.json");

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface ExtensionMetadata {
  version: string;
  filename: string;
  sizeBytes: number;
  lastModified: string;
  changelog: ChangelogEntry[];
}

async function readMetadata(): Promise<ExtensionMetadata | null> {
  try {
    const raw = await readFile(METADATA_PATH, "utf8");
    return JSON.parse(raw) as ExtensionMetadata;
  } catch {
    return null;
  }
}

router.get("/extension/version", async (_req: Request, res: Response) => {
  const metadata = await readMetadata();
  if (!metadata) {
    res.status(404).json({
      error: "extension_metadata_unavailable",
      message: "Extension version metadata is not available. Please contact support.",
    });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(metadata);
});

router.get("/extension/download", async (_req: Request, res: Response) => {
  try {
    const metadata = await readMetadata();
    if (!metadata) {
      res.status(404).json({
        error: "extension_zip_unavailable",
        message: "Extension package is not available. Please contact support.",
      });
      return;
    }
    const zipPath = path.resolve(moduleDir, metadata.filename);
    const info = await stat(zipPath);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${metadata.filename}"`);
    res.setHeader("Content-Length", String(info.size));
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(zipPath);
  } catch {
    res.status(404).json({
      error: "extension_zip_unavailable",
      message: "Extension package is not available. Please contact support.",
    });
  }
});

export default router;
