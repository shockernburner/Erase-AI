import { db, datasetsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

export async function runStartupMigrations() {
  const result = await db.execute(sql`
    DELETE FROM analysis_results WHERE dataset_id IN (SELECT id FROM datasets WHERE user_id IS NULL);
    DELETE FROM dataset_rows WHERE version_id IN (SELECT dv.id FROM dataset_versions dv JOIN datasets d ON dv.dataset_id = d.id WHERE d.user_id IS NULL);
    DELETE FROM dataset_operations WHERE dataset_id IN (SELECT id FROM datasets WHERE user_id IS NULL);
    DELETE FROM dataset_versions WHERE dataset_id IN (SELECT id FROM datasets WHERE user_id IS NULL);
    DELETE FROM datasets WHERE user_id IS NULL;
  `);
  logger.info("Startup migration: cleaned up orphaned datasets with null userId");
}
