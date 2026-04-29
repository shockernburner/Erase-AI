import type { RequestHandler } from "express";
import {
  buildAllowedOrigins,
  createCorsMiddleware,
  PINNED_EXTENSION_ID,
} from "../lib/security/cors-source.mjs";

export function corsMiddleware(): RequestHandler {
  const devOrigins = (process.env.ALLOWED_DEV_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = buildAllowedOrigins({
    extensionId: PINNED_EXTENSION_ID,
    devOrigins,
  });
  return createCorsMiddleware({ allowedOrigins });
}

export { PINNED_EXTENSION_ID };
