// Re-exports the runtime from ./secrets-source.mjs (importable by `node --test`)
// with TypeScript types attached. See ./secrets-source.d.mts for the type
// surface.
export { detectSecrets, maskSecret } from "./secrets-source.mjs";
export type { SecretMatch } from "./secrets-source.mjs";
