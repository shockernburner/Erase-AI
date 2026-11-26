// One-off clean-up for scan history written before the storage fix (2026-11-22).
// Old rows hold up to 500 raw characters of the message and the full matched values in flags and
// suggestions. This rewrites them with the same helpers the routes now use.
//
//   node scripts/redact-stored-scans.mjs            # dry run: counts only, changes nothing
//   node scripts/redact-stored-scans.mjs --apply    # rewrite the rows
//
// Needs DATABASE_URL in the environment. Safe to run twice (labels redact to the same labels).
// Take a database backup before --apply. It rewrites text in place and deletes no rows.
import pg from "pg";
import { excerptForStorage, flagsForStorage, suggestionsForStorage } from "../src/lib/dev/store-excerpt-source.mjs";

const apply = process.argv.includes("--apply");
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const json = (s, fn) => {
  try {
    return JSON.stringify(fn(JSON.parse(s)));
  } catch {
    return s;
  }
};

async function pass(table, idCol, load, rewrite) {
  const { rows } = await pool.query(load);
  let changed = 0;
  for (const row of rows) {
    const next = rewrite(row);
    if (Object.keys(next).some((k) => next[k] !== row[k])) {
      changed += 1;
      if (apply) {
        const cols = Object.keys(next);
        await pool.query(
          `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE ${idCol} = $1`,
          [row[idCol], ...cols.map((c) => next[c])],
        );
      }
    }
  }
  console.log(`${table}: ${rows.length} rows read, ${changed} ${apply ? "rewritten" : "would be rewritten"}`);
}

await pass("personal_scans", "id", "SELECT id, content, flags, suggestions FROM personal_scans", (r) => ({
  content: excerptForStorage(r.content),
  flags: json(r.flags, flagsForStorage),
  suggestions: json(r.suggestions, suggestionsForStorage),
}));
await pass("dev_scans", "id", "SELECT id, input_text, sanitized_text FROM dev_scans", (r) => ({
  input_text: excerptForStorage(r.input_text),
  sanitized_text: r.sanitized_text == null ? null : excerptForStorage(r.sanitized_text),
}));
await pool.end();
if (!apply) console.log("Dry run only. Re-run with --apply to rewrite.");
