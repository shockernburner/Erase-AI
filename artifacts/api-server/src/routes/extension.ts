import { Router, type IRouter, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

const router: IRouter = Router();

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = path.resolve(moduleDir, "eraseai-firewall.zip");
const ZIP_FILENAME = "eraseai-firewall.zip";

router.get("/extension/download", async (_req: Request, res: Response) => {
  try {
    const info = await stat(ZIP_PATH);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${ZIP_FILENAME}"`);
    res.setHeader("Content-Length", String(info.size));
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(ZIP_PATH);
  } catch {
    res.status(404).json({
      error: "extension_zip_unavailable",
      message: "Extension package is not available. Please contact support.",
    });
  }
});

export default router;
