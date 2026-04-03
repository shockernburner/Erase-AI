import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  datasetsTable,
  datasetVersionsTable,
  datasetRowsTable,
  datasetOperationsTable,
  analysisResultsTable,
  apiKeysTable,
  apiUsageTable,
} from "@workspace/db";
import { sql, eq, and, gte, desc } from "drizzle-orm";
import { requireBusiness, refreshPlanFromDB } from "../middlewares/planMiddleware";

const router: IRouter = Router();
router.use(refreshPlanFromDB);

router.get("/analytics", requireBusiness(), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      datasetStats,
      rowStats,
      operationsByType,
      dailyActivity,
      issuesByType,
      issuesBySeverity,
      erasureMetrics,
      apiByEndpoint,
      apiDailyTrend,
      apiErrorRate,
    ] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(datasetsTable)
        .where(eq(datasetsTable.userId, userId)),

      db
        .select({
          totalRows: sql<number>`count(*)::int`,
          removedRows: sql<number>`count(*) filter (where ${datasetRowsTable.isRemoved})::int`,
          redactedRows: sql<number>`count(*) filter (where ${datasetRowsTable.isRedacted})::int`,
        })
        .from(datasetRowsTable)
        .innerJoin(datasetVersionsTable, eq(datasetRowsTable.versionId, datasetVersionsTable.id))
        .innerJoin(datasetsTable, eq(datasetVersionsTable.datasetId, datasetsTable.id))
        .where(eq(datasetsTable.userId, userId)),

      db
        .select({
          type: datasetOperationsTable.type,
          count: sql<number>`count(*)::int`,
          totalAffected: sql<number>`coalesce(sum(${datasetOperationsTable.affectedRowsCount}), 0)::int`,
        })
        .from(datasetOperationsTable)
        .innerJoin(datasetsTable, eq(datasetOperationsTable.datasetId, datasetsTable.id))
        .where(eq(datasetsTable.userId, userId))
        .groupBy(datasetOperationsTable.type),

      db
        .select({
          date: sql<string>`to_char(${datasetOperationsTable.createdAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(datasetOperationsTable)
        .innerJoin(datasetsTable, eq(datasetOperationsTable.datasetId, datasetsTable.id))
        .where(
          and(
            eq(datasetsTable.userId, userId),
            gte(datasetOperationsTable.createdAt, thirtyDaysAgo),
          ),
        )
        .groupBy(sql`to_char(${datasetOperationsTable.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${datasetOperationsTable.createdAt}, 'YYYY-MM-DD')`),

      db
        .select({
          issueType: analysisResultsTable.issueType,
          count: sql<number>`count(*)::int`,
        })
        .from(analysisResultsTable)
        .innerJoin(datasetsTable, eq(analysisResultsTable.datasetId, datasetsTable.id))
        .where(eq(datasetsTable.userId, userId))
        .groupBy(analysisResultsTable.issueType),

      db
        .select({
          severity: analysisResultsTable.severity,
          count: sql<number>`count(*)::int`,
        })
        .from(analysisResultsTable)
        .innerJoin(datasetsTable, eq(analysisResultsTable.datasetId, datasetsTable.id))
        .where(eq(datasetsTable.userId, userId))
        .groupBy(analysisResultsTable.severity),

      db
        .select({
          totalOperations: sql<number>`count(*)::int`,
          totalAffected: sql<number>`coalesce(sum(${datasetOperationsTable.affectedRowsCount}), 0)::int`,
        })
        .from(datasetOperationsTable)
        .innerJoin(datasetsTable, eq(datasetOperationsTable.datasetId, datasetsTable.id))
        .where(
          and(
            eq(datasetsTable.userId, userId),
            sql`${datasetOperationsTable.type} in ('delete', 'redact', 'auto-fix', 'drop-column')`,
          ),
        ),

      db
        .select({
          endpoint: apiUsageTable.endpoint,
          count: sql<number>`count(*)::int`,
        })
        .from(apiUsageTable)
        .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
        .where(
          and(
            eq(apiKeysTable.userId, userId),
            gte(apiUsageTable.createdAt, thirtyDaysAgo),
          ),
        )
        .groupBy(apiUsageTable.endpoint)
        .orderBy(sql`count(*) desc`)
        .limit(10),

      db
        .select({
          date: sql<string>`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(apiUsageTable)
        .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
        .where(
          and(
            eq(apiKeysTable.userId, userId),
            gte(apiUsageTable.createdAt, thirtyDaysAgo),
          ),
        )
        .groupBy(sql`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`),

      db
        .select({
          total: sql<number>`count(*)::int`,
          errors: sql<number>`count(*) filter (where ${apiUsageTable.responseStatus} >= 400)::int`,
        })
        .from(apiUsageTable)
        .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
        .where(
          and(
            eq(apiKeysTable.userId, userId),
            gte(apiUsageTable.createdAt, thirtyDaysAgo),
          ),
        ),
    ]);

    const ds = datasetStats[0];
    const rs = rowStats[0];
    const em = erasureMetrics[0];
    const ae = apiErrorRate[0];

    const versionCounts = await db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(datasetVersionsTable)
      .innerJoin(datasetsTable, eq(datasetVersionsTable.datasetId, datasetsTable.id))
      .where(eq(datasetsTable.userId, userId));

    const totalAnalyzed = await db
      .select({
        count: sql<number>`count(distinct ${analysisResultsTable.datasetId})::int`,
      })
      .from(analysisResultsTable)
      .innerJoin(datasetsTable, eq(analysisResultsTable.datasetId, datasetsTable.id))
      .where(eq(datasetsTable.userId, userId));

    res.json({
      overview: {
        totalDatasets: ds?.total ?? 0,
        totalVersions: versionCounts[0]?.total ?? 0,
        totalRows: rs?.totalRows ?? 0,
        datasetsAnalyzed: totalAnalyzed[0]?.count ?? 0,
      },
      processingActivity: {
        operationsByType: operationsByType.map((o) => ({
          type: o.type,
          count: o.count,
          totalAffected: o.totalAffected,
        })),
        dailyActivity: dailyActivity.map((d) => ({
          date: d.date,
          operations: d.count,
        })),
      },
      qualityInsights: {
        issuesByType: issuesByType.map((i) => ({
          type: i.issueType,
          count: i.count,
        })),
        issuesBySeverity: issuesBySeverity.map((s) => ({
          severity: s.severity,
          count: s.count,
        })),
        totalIssues: issuesByType.reduce((sum, i) => sum + i.count, 0),
      },
      erasureMetrics: {
        totalOperations: em?.totalOperations ?? 0,
        totalAffectedRows: em?.totalAffected ?? 0,
        removedRows: rs?.removedRows ?? 0,
        redactedRows: rs?.redactedRows ?? 0,
      },
      apiUsage: {
        byEndpoint: apiByEndpoint.map((e) => ({
          endpoint: e.endpoint,
          requests: e.count,
        })),
        dailyTrend: apiDailyTrend.map((d) => ({
          date: d.date,
          requests: d.count,
        })),
        totalRequests: ae?.total ?? 0,
        totalErrors: ae?.errors ?? 0,
        errorRate: ae?.total ? Math.round((ae.errors / ae.total) * 10000) / 100 : 0,
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
