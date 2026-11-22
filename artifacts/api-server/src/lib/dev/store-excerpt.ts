// Re-exports the runtime from ./store-excerpt-source.mjs (importable by `node --test`) and binds the
// deployment setting: SCAN_TEXT_RETENTION=none stores no message text anywhere in scan history.
import { excerptForStorage as excerpt, flagsForStorage, suggestionsForStorage, NOT_STORED, STORED_EXCERPT_MAX } from "./store-excerpt-source.mjs";

export { flagsForStorage, suggestionsForStorage, NOT_STORED, STORED_EXCERPT_MAX };

export function excerptForStorage(text: unknown): string {
  return excerpt(text, { zeroRetention: process.env.SCAN_TEXT_RETENTION === "none" });
}
