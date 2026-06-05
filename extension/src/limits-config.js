// Shared attachment-scanning limits (#195).
//
// file-extractor.js (content-script world), content.js, and the sandbox
// extractor all need the same caps for per-file size, extracted-text
// truncation, combined attachment size, attachment count, the OCR request
// budget, and the archive-expansion guards (zip-bomb protection). Keeping
// three private copies in lockstep is exactly the kind of drift that ships
// quietly — bumping the per-file cap in file-extractor.js without raising
// the combined cap in content.js would silently re-skip large files. This
// file is the single source of truth.
//
// Distribution: loaded as a CLASSIC script (no ES modules) BEFORE
// file-extractor.js and content.js in manifest.json's content_scripts, and
// before sandbox-extractor.js in sandbox.html. It exposes a frozen
// `EraseAILimits` global on `globalThis` (which is `window` in every one of
// those contexts), guarded against double-load so re-injection on extension
// reload is idempotent.
//
// NOTE: the unit tests eval file-extractor.js / sandbox-extractor.js in
// isolation WITHOUT loading this file, so both of those modules read these
// values through a `globalThis.EraseAILimits || { …fallback defaults }`
// guard. The fallback defaults in those modules MUST mirror the numbers
// below; this comment is the reminder to keep them in sync.
(function defineEraseAILimits() {
  if (globalThis.EraseAILimits) return;
  const KB = 1024;
  const MB = 1024 * 1024;
  globalThis.EraseAILimits = Object.freeze({
    // Per-file ceiling: files larger than this are surfaced as a skip row
    // rather than read into memory.
    MAX_FILE_BYTES: 25 * MB,
    // Per-file extracted-text cap: extraction stops contributing text past
    // this many characters (the row is flagged "partially scanned").
    MAX_EXTRACTED_BYTES: 200 * KB,
    // Combined size of all attachments considered in a single send.
    MAX_TOTAL_ATTACHMENT_BYTES: 100 * MB,
    // Hard ceiling on how many attachments are scanned per send.
    MAX_ATTACHED_FILES: 32,
    // OCR (image) is far slower than a structured-document parse, so the
    // sandbox request for an image gets a longer budget than the default.
    SANDBOX_REQUEST_TIMEOUT_MS: 15000,
    OCR_REQUEST_TIMEOUT_MS: 30000,
    // Archive expansion can fan out into many inner extractions (including
    // OCR of contained images), so its RPC gets the most generous budget.
    ARCHIVE_REQUEST_TIMEOUT_MS: 60000,
    // Archive-expansion guards (zip-bomb / fork-bomb protection). These
    // bound the work a single attached archive can force the firewall to do.
    ARCHIVE_MAX_ENTRIES: 200,
    ARCHIVE_MAX_TOTAL_BYTES: 50 * MB,
    ARCHIVE_MAX_ENTRY_BYTES: 10 * MB,
    ARCHIVE_MAX_DEPTH: 2,
  });
})();
