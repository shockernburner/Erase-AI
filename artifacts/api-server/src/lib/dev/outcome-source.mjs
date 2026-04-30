// Validation + normalization helpers for /api/dev/outcome (task #114).
//
// Extracted into an .mjs module so the api-server `node --test` harness can
// import and unit-test them directly without booting Express or the DB.
// `dev.ts` imports the same helpers so the route and the tests stay in
// lockstep.

export const VALID_OUTCOME_LEVELS = new Set(["safe", "caution", "danger"]);
export const VALID_OUTCOME_ACTIONS = new Set([
  "sanitize",
  "cancel",
  "send-anyway",
  "auto-send",
]);
export const MAX_OUTCOME_CATEGORIES = 32;
export const MAX_CATEGORY_LENGTH = 64;

export function normaliseCategories(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const c of input) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim().slice(0, MAX_CATEGORY_LENGTH);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_OUTCOME_CATEGORIES) break;
  }
  return out;
}

export function normaliseRiskScore(input) {
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  return Math.max(0, Math.min(100, Math.round(input)));
}

// Maximum bookkeeping ceilings for the optional pieces telemetry that the
// 1.3.5 extension started attaching to outcome events (task #142). Caps are
// intentionally generous — a hostile client cannot grow firewall_outcomes
// rows beyond the small fixed-size jsonb shape.
export const MAX_PIECES_FILE_LEVELS = 16;
const MAX_PIECE_COUNT = 256; // any field above this is clamped (not rejected)

function clampNonNegInt(input, max) {
  if (typeof input !== "number" || !Number.isFinite(input)) return 0;
  const i = Math.floor(input);
  if (i < 0) return 0;
  if (i > max) return max;
  return i;
}

// Validate the optional `pieces` summary the extension may attach to an
// outcome event. Returns null when the field is absent or unusable; the
// route then writes NULL into the pieces column. Returns a sanitised
// object when valid. We never return an error — a bad pieces payload
// must not poison the otherwise-valid outcome write.
export function normalisePieces(input) {
  if (!input || typeof input !== "object") return null;
  const promptPieces = clampNonNegInt(input.promptPieces, MAX_PIECE_COUNT);
  const filePieces = clampNonNegInt(input.filePieces, MAX_PIECE_COUNT);
  const skippedFiles = clampNonNegInt(input.skippedFiles, MAX_PIECE_COUNT);
  const levelsIn = input.levels && typeof input.levels === "object" ? input.levels : {};
  const levels = {};
  let kept = 0;
  for (const k of Object.keys(levelsIn)) {
    if (kept >= MAX_PIECES_FILE_LEVELS) break;
    if (typeof k !== "string") continue;
    const trimmed = k.trim().slice(0, 16);
    if (!trimmed) continue;
    levels[trimmed] = clampNonNegInt(levelsIn[k], MAX_PIECE_COUNT);
    kept += 1;
  }
  if (promptPieces === 0 && filePieces === 0 && skippedFiles === 0 && kept === 0) {
    return null;
  }
  return { promptPieces, filePieces, skippedFiles, levels };
}

// Returns { ok: true, value: { level, action, riskScore, categories, pieces } } on
// success, or { ok: false, error: string } on validation failure. Mirrors
// the shape of the route's 400 responses so tests can assert on the same
// error messages users see. The pieces field is optional (null when the
// extension didn't supply it or the payload was unusable).
export function validateOutcomePayload(payload) {
  const body = payload && typeof payload === "object" ? payload : {};
  const { level, action, riskScore, categories, pieces } = body;

  if (typeof level !== "string" || !VALID_OUTCOME_LEVELS.has(level)) {
    return {
      ok: false,
      error: `level must be one of: ${[...VALID_OUTCOME_LEVELS].join(", ")}`,
    };
  }
  if (typeof action !== "string" || !VALID_OUTCOME_ACTIONS.has(action)) {
    return {
      ok: false,
      error: `action must be one of: ${[...VALID_OUTCOME_ACTIONS].join(", ")}`,
    };
  }

  return {
    ok: true,
    value: {
      level,
      action,
      riskScore: normaliseRiskScore(riskScore),
      categories: normaliseCategories(categories),
      pieces: normalisePieces(pieces),
    },
  };
}

// Aggregation logic for /admin/stats firewall outcome breakdown (task #114).
// Pure function over already-fetched rows so the route's SQL stays tiny and
// the counting rules can be unit-tested without standing up a database.
//
// `rows` is an array of { level, action } records (other fields ignored).
// Only caution+danger levels count as a "warning shown" per product spec —
// safe-level auto-sends are tracked but excluded from this metric since
// they aren't user-visible warnings.
export function aggregateFirewallOutcomes(rows) {
  let shown = 0;
  let saved = 0;
  let dismissed = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    const level = r && typeof r.level === "string" ? r.level : null;
    const action = r && typeof r.action === "string" ? r.action : null;
    if (level !== "caution" && level !== "danger") continue;
    shown += 1;
    if (action === "sanitize" || action === "cancel") saved += 1;
    else if (action === "send-anyway") dismissed += 1;
  }
  return { shown, saved, dismissed };
}
