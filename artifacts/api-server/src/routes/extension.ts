import { Router, type IRouter, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import {
  readMetadata,
  resolveExtensionVersionPayload,
} from "./extension-version-source.mjs";

const router: IRouter = Router();

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

router.get("/extension/version", async (_req: Request, res: Response) => {
  const payload = await resolveExtensionVersionPayload();
  if (!payload) {
    res.status(404).json({
      error: "extension_metadata_unavailable",
      message: "Extension version metadata is not available. Please contact support.",
    });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(payload);
});

router.get("/extension/download", async (_req: Request, res: Response) => {
  try {
    const metadata = await readMetadata();
    if (!metadata?.filename) {
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
