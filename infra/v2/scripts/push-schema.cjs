// Runs inside the app image as a one-off ECS task (aws-v2.yml push_schema).
// Creates the core tables with drizzle-kit push, once, on the replica's
// empty database. The app's own startup then adds its newer tables.
//
// drizzle-kit push is only safe on a database without those newer tables:
// it would otherwise ask to rename or drop them (and, with no terminal,
// silently do nothing). So:
//   - core schema present (table "users" exists): nothing to do;
//   - core schema missing: the database holds at most the empty tables an
//     earlier app start created, so the public schema is reset and pushed.
const { Client } = require("pg");
const { execFileSync } = require("child_process");

async function hasUsers() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const r = await c.query("select to_regclass('public.users') as t");
    return r.rows[0].t !== null;
  } finally {
    await c.end();
  }
}

async function resetPublicSchema() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const r = await c.query(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
    );
    console.log(`core schema missing; resetting public schema (${r.rows[0].n} startup tables)`);
    await c.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  } finally {
    await c.end();
  }
}

(async () => {
  if (await hasUsers()) {
    console.log("core schema present; no push needed");
    return;
  }
  await resetPublicSchema();
  execFileSync(
    "./node_modules/.bin/drizzle-kit",
    ["push", "--force", "--config", "./drizzle.config.ts"],
    { cwd: process.env.DB_DIR || "/app/lib/db", stdio: "inherit" },
  );
  if (!(await hasUsers())) throw new Error("drizzle-kit push did not create the users table");
  console.log("core schema created");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
