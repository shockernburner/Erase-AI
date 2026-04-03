import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

export async function runStartupMigrations() {
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
