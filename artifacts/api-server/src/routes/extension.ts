import { Router, type IRouter, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import {
  readMetadata,
  resolveExtensionVersionPayload,
} from "./extension-version-source.mjs";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createIpBurstMiddleware } from "../lib/security/burst-limiter.mjs";
import { PostgresBurstLimiter } from "../lib/security/pg-burst-limiter.mjs";
import { parseUninstallFeedback } from "./uninstall-feedback-source.mjs";

const router: IRouter = Router();

// The uninstall survey is public and anonymous, so it gets its own tight
// per-IP budget rather than the general 30/min IP limit.
const uninstallFeedbackLimit = createIpBurstMiddleware({
  limiter: new PostgresBurstLimiter({ db, windowMs: 60 * 60_000, maxHits: 5, scope: "uninstall-fb" }),
  maxHits: 5,
});

router.post("/extension/uninstall-feedback", uninstallFeedbackLimit, async (req: Request, res: Response) => {
  const parsed = parseUninstallFeedback(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const { reason, comment, version } = parsed.value;
    await db.execute(sql`
      INSERT INTO extension_uninstall_feedback (reason, comment, extension_version)
      VALUES (${reason}, ${comment}, ${version})
    `);
    res.json({ ok: true });
  } catch (err) {
    console.error("Uninstall feedback error:", err);
    res.status(500).json({ error: "feedback_failed" });
  }
});

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
