// Shared analyze-concurrency configuration (#146).
//
// content.js and popup.js BOTH need the same default / min / max / clamp
// rule for chrome.storage.local.analyzeConcurrency:
//   * content.js uses MIN/MAX as the runtime safety net so a corrupted
//     storage value can never fan out hundreds of analyze ports.
//   * popup.js uses MIN/MAX to validate user input on save and DEFAULT
//     to seed the input when storage is empty.
//
// Keeping two copies in lockstep is the kind of bug that ships quietly:
// bumping MAX to 32 in content.js without updating popup.js would make
// the Save button silently reject every value above 16. Centralizing
// the constants here is the single source of truth.
//
// Distribution: this file is loaded as a CLASSIC script (no ES modules)
// before content.js in manifest.json's content_scripts and before
// popup.js in popup.html. It exposes a `EraseAIConcurrency` global on
// `globalThis` (which is `window` in both contexts), guarded against
// double-load so re-injection on extension reload is idempotent.
(function defineEraseAIConcurrency() {
  if (globalThis.EraseAIConcurrency) return;
  const DEFAULT = 4;
  const MIN = 1;
  const MAX = 16;
  function coerce(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT;
    const i = Math.trunc(n);
    if (i < MIN) return MIN;
    if (i > MAX) return MAX;
    return i;
  }
  globalThis.EraseAIConcurrency = Object.freeze({ DEFAULT, MIN, MAX, coerce });
})();
