import cors from "cors";

export const PINNED_EXTENSION_ID = "bhcdkolfchcihbiakkbkfpfpempgdgji";

export function buildAllowedOrigins({ extensionId = PINNED_EXTENSION_ID, devOrigins = [] } = {}) {
  const origins = new Set([
    "https://eraseai.ai",
    "https://www.eraseai.ai",
  ]);
  if (extensionId) {
    origins.add(`chrome-extension://${extensionId}`);
    origins.add(`moz-extension://${extensionId}`);
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
