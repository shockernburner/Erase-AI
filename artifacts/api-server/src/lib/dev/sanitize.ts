// Re-exports the runtime from ./sanitize-source.mjs (importable by `node --test`
// and shared with the browser extension's on-device scanner) with TypeScript
// types attached. See ./sanitize-source.d.mts for the type surface.
export { sanitizeText } from "./sanitize-source.mjs";
export type { SanitizeResult, SanitizeChange } from "./sanitize-source.mjs";
