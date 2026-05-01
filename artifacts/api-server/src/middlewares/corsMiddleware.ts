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
  // After the first Chrome Web Store publish, set PUBLISHED_EXTENSION_IDS
  // (comma-separated, supports Edge/Firefox IDs too) so the production
  // extension's chrome-extension://<id> origin is also CORS-allowed
  // alongside the pinned dev unpacked ID.
  const publishedExtensionIds = (process.env.PUBLISHED_EXTENSION_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = buildAllowedOrigins({
    extensionId: PINNED_EXTENSION_ID,
    extensionIds: publishedExtensionIds,
    devOrigins,
  });
  return createCorsMiddleware({ allowedOrigins });
}

export { PINNED_EXTENSION_ID };
