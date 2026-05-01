import cors from "cors";

// The extension ID Chrome assigns to the unpacked dev install (derived from
// the public `key` in extension/manifest.json). Stays in the allow-list so
// engineers loading the extension via "Load unpacked" against /extension
// can keep talking to the api-server during development. See PUBLISHING.md
// § 0 for how this ID is derived.
export const PINNED_EXTENSION_ID = "bhcdkolfchcihbiakkbkfpfpempgdgji";

export function buildAllowedOrigins({
  extensionId = PINNED_EXTENSION_ID,
  extensionIds = null,
  devOrigins = [],
} = {}) {
  const origins = new Set([
    "https://eraseai.ai",
    "https://www.eraseai.ai",
  ]);
  // Accept both the legacy single-ID input (`extensionId`) and the new
  // list input (`extensionIds`) so the Chrome Web Store published ID
  // can be added alongside the pinned dev ID without dropping either.
  const ids = new Set();
  if (extensionId) ids.add(extensionId);
  if (Array.isArray(extensionIds)) {
    for (const id of extensionIds) {
      if (typeof id === "string" && id.trim()) ids.add(id.trim());
    }
  }
  for (const id of ids) {
    origins.add(`chrome-extension://${id}`);
    origins.add(`moz-extension://${id}`);
  }
  for (const o of devOrigins) {
    if (typeof o === "string" && o.trim()) origins.add(o.trim());
  }
  return origins;
}

export function isOriginAllowed(origin, allowedSet) {
  if (!origin) return true;
  return allowedSet.has(origin);
}

export function createCorsMiddleware({ allowedOrigins } = {}) {
  const allowed = allowedOrigins ?? buildAllowedOrigins();
  const corsHandler = cors({
    credentials: true,
    origin: (origin, cb) => {
      if (isOriginAllowed(origin, allowed)) cb(null, true);
      else cb(null, false);
    },
  });
  return (req, res, next) => {
    const origin = req.headers?.origin;
    if (origin && !allowed.has(origin)) {
      if (req.method === "OPTIONS") {
        res.status(403).end();
        return;
      }
      return next();
    }
    return corsHandler(req, res, next);
  };
}
