// The organization audit log: one row per firewall decision a member made, taken from
// firewall_outcomes. That table holds the level, the action, a risk score and the categories, and
// never any message or file text, so this log can be shown to and exported by an admin without
// exposing what anyone typed. routes/org.ts runs these helpers against the database.

export const AUDIT_DEFAULT_DAYS = 30;
export const AUDIT_MAX_DAYS = 365;
export const AUDIT_DEFAULT_LIMIT = 100;
export const AUDIT_MAX_LIMIT = 500;

const LEVELS = new Set(["safe", "caution", "danger"]);
const ACTIONS = new Set(["auto-send", "sanitize", "cancel", "send-anyway"]);
const ACTION_LABELS = {
  "auto-send": "Sent (all clear)",
  sanitize: "Sanitized",
  cancel: "Cancelled",
  "send-anyway": "Sent anyway",
};

export function actionLabel(action) {
  if (typeof action !== "string") return "";
  return ACTION_LABELS[action] ?? action;
}

function boundedInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export function parseAuditQuery(query) {
  const q = query && typeof query === "object" ? query : {};
  const userId = typeof q.userId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(q.userId) ? q.userId : null;
  return {
    days: boundedInt(q.days, 1, AUDIT_MAX_DAYS, AUDIT_DEFAULT_DAYS),
    // Asking for more than the cap returns the cap; anything that is not a positive whole number gets the default.
    limit: (() => {
      const n = Number(q.limit);
      return Number.isInteger(n) && n >= 1 ? Math.min(n, AUDIT_MAX_LIMIT) : AUDIT_DEFAULT_LIMIT;
    })(),
    level: typeof q.level === "string" && LEVELS.has(q.level) ? q.level : null,
    action: typeof q.action === "string" && ACTIONS.has(q.action) ? q.action : null,
    userId,
  };
}

function readCategories(raw) {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string").slice(0, 32) : [];
  } catch {
    return [];
  }
}

function toIso(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// `membersByUserId` is a Map of userId -> { email, name }. Only the fields below leave the server.
export function shapeAuditEvents(rows, membersByUserId) {
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r !== "object") continue;
    const who = membersByUserId && typeof membersByUserId.get === "function" ? membersByUserId.get(r.userId) : null;
    out.push({
      id: r.id,
      at: toIso(r.createdAt),
      userId: r.userId,
      email: who?.email ?? "(former member)",
      name: who?.name ?? null,
      level: r.level,
      action: r.action,
      actionLabel: actionLabel(r.action),
      riskScore: typeof r.riskScore === "number" ? r.riskScore : null,
      categories: readCategories(r.categories),
    });
  }
  return out;
}

// A cell that starts with = + - @ (or a tab or carriage return) is read as a formula by Excel and
// Sheets. Prefixing a quote makes it text; this matters because names and emails are typed by people.
function csvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADER = ["Time (UTC)", "Person", "Email", "Level", "What happened", "Risk score", "Categories"];

export function auditCsv(events) {
  const lines = [CSV_HEADER.join(",")];
  for (const e of Array.isArray(events) ? events : []) {
    lines.push(
      [
        csvCell(e.at),
        csvCell(e.name ?? ""),
        csvCell(e.email),
        csvCell(e.level),
        csvCell(e.actionLabel ?? actionLabel(e.action)),
        csvCell(e.riskScore),
        csvCell(Array.isArray(e.categories) ? e.categories.join("; ") : ""),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
