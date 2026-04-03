import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

async function ensureApiKeysTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR(64) NOT NULL UNIQUE,
        key_prefix VARCHAR(8) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)`);
    logger.info("Startup migration: api_keys table ensured");
  } catch (err) {
    logger.warn({ err }, "Startup migration: api_keys table warning (non-fatal)");
  }
}

export async function runStartupMigrations() {
  await ensureApiKeysTable();
  try {
    const demoDatasets = await db.execute(sql`
      SELECT id FROM datasets WHERE user_id = 'system-demo-user'
    `);

    if (demoDatasets.rows.length > 0) {
      const ids = demoDatasets.rows.map((r: Record<string, unknown>) => r.id as string);
      for (const id of ids) {
        await db.execute(sql`DELETE FROM analysis_results WHERE dataset_id = ${id}`);
        await db.execute(sql`DELETE FROM dataset_operations WHERE dataset_id = ${id}`);

        const versions = await db.execute(sql`SELECT id FROM dataset_versions WHERE dataset_id = ${id}`);
        for (const v of versions.rows) {
          await db.execute(sql`DELETE FROM dataset_rows WHERE version_id = ${(v as Record<string, unknown>).id}`);
        }
        await db.execute(sql`DELETE FROM dataset_versions WHERE dataset_id = ${id}`);
        await db.execute(sql`DELETE FROM datasets WHERE id = ${id}`);
      }
    }

    await db.execute(sql`DELETE FROM feedback WHERE user_id = 'system-demo-user'`);
    await db.execute(sql`DELETE FROM users WHERE id = 'system-demo-user'`);

    logger.info("Startup migration: cleaned up legacy demo user data");
  } catch (err) {
    logger.warn({ err }, "Startup migration warning (non-fatal)");
  }
}
