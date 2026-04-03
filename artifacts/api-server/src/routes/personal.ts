import { Router } from "express";
import { db, personalScansTable, personalAlertsTable } from "@workspace/db";
import { eq, desc, sql, and, gte, inArray, lt } from "drizzle-orm";
import { analyzeText } from "../lib/personalAnalyzer";
import { calculateRiskScore } from "../lib/riskScorer";
import { rewriteContent } from "../lib/contentRewriter";
import { generateAlerts } from "../lib/alertEngine";
import { refreshPlanFromDB, requirePro } from "../middlewares/planMiddleware";

const router = Router();

const FREE_DAILY_LIMIT = 10;
const MAX_STORED_CONTENT_LENGTH = 200;

function redactMatchedText(text: string): string {
  return text.length > 20 ? text.substring(0, 8) + "***" + text.substring(text.length - 4) : "***";
}

router.post("/personal/analyze", refreshPlanFromDB, async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const content = req.body.text || req.body.content;
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "Text is required and must be a string" });
      return;
    }

    if (content.length > 5000) {
      res.status(400).json({ error: "Text must be 5000 characters or fewer" });
      return;
    }

    const plan = req.user.planType || "free";
    if (plan === "free") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(personalScansTable)
        .where(
          and(
            eq(personalScansTable.userId, req.user.id),
            gte(personalScansTable.createdAt, todayStart)
          )
        );

      if (countResult && countResult.count >= FREE_DAILY_LIMIT) {
        res.status(429).json({
          error: `Free plan allows ${FREE_DAILY_LIMIT} scans per day. Upgrade for unlimited scans.`,
          upgrade: true,
          limit: FREE_DAILY_LIMIT,
          used: countResult.count,
        });
        return;
      }
    }

    const analysis = analyzeText(content);
    const risk = calculateRiskScore(analysis.flags);

    const storedContent = content.substring(0, MAX_STORED_CONTENT_LENGTH) +
      (content.length > MAX_STORED_CONTENT_LENGTH ? "..." : "");

    const storedFlags = analysis.flags.map((f) => ({
      ...f,
      matchedText: redactMatchedText(f.matchedText),
    }));
    const storedSuggestions = analysis.suggestions.map((s) => ({
      ...s,
      original: redactMatchedText(s.original),
    }));

    const [scan] = await db
      .insert(personalScansTable)
      .values({
        userId: req.user.id,
        content: storedContent,
        riskScore: risk.score,
        flags: JSON.stringify(storedFlags),
        suggestions: JSON.stringify(storedSuggestions),
        level: risk.level,
      })
      .returning();

    if (plan !== "free") {
      generateAlerts({
        id: scan.id,
        userId: req.user.id,
        riskScore: risk.score,
        flags: JSON.stringify(storedFlags),
      }).catch((err) => {
        console.warn("Alert generation failed:", err);
      });
    }

    res.json({
      id: scan.id,
      riskScore: risk.score,
      level: risk.level,
      breakdown: risk.breakdown,
      flags: analysis.flags,
      suggestions: analysis.suggestions,
      createdAt: scan.createdAt,
    });
  } catch (err) {
    console.error("Personal analyze error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.get("/personal/history", refreshPlanFromDB, async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 100));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const levelFilter = req.query.level as string | undefined;
    const validLevels = ["low", "medium", "high"];

    const conditions = [eq(personalScansTable.userId, req.user.id)];

    if (levelFilter && validLevels.includes(levelFilter)) {
      conditions.push(eq(personalScansTable.level, levelFilter));
    } else if (levelFilter && levelFilter.includes(",")) {
      const levels = levelFilter.split(",").filter((l) => validLevels.includes(l));
      if (levels.length > 0) {
        conditions.push(inArray(personalScansTable.level, levels));
      }
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const scans = await db
      .select()
      .from(personalScansTable)
      .where(whereClause)
      .orderBy(desc(personalScansTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(personalScansTable)
      .where(whereClause);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(personalScansTable)
      .where(
        and(
          eq(personalScansTable.userId, req.user.id),
          gte(personalScansTable.createdAt, todayStart)
        )
      );

    const trendScans = await db
      .select({
        date: sql<string>`to_char(${personalScansTable.createdAt}, 'YYYY-MM-DD')`,
        avgScore: sql<number>`round(avg(${personalScansTable.riskScore}))::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(personalScansTable)
      .where(
        and(
          eq(personalScansTable.userId, req.user.id),
          gte(personalScansTable.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      )
      .groupBy(sql`to_char(${personalScansTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${personalScansTable.createdAt}, 'YYYY-MM-DD')`);

    const plan = req.user.planType || "free";

    res.json({
      scans: scans.map((s) => ({
        id: s.id,
        content: s.content.substring(0, 200) + (s.content.length > 200 ? "..." : ""),
        riskScore: s.riskScore,
        level: s.level,
        flags: JSON.parse(s.flags),
        suggestions: JSON.parse(s.suggestions),
        createdAt: s.createdAt,
      })),
      total: countResult?.count ?? 0,
      todayUsed: todayCount?.count ?? 0,
      dailyLimit: plan === "free" ? FREE_DAILY_LIMIT : null,
      trend: trendScans,
    });
  } catch (err) {
    console.error("Personal history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.post("/personal/rewrite", refreshPlanFromDB, requirePro(), async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { text, flags } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required" });
      return;
    }
    if (!flags || !Array.isArray(flags) || flags.length === 0) {
      res.status(400).json({ error: "Flags array is required and must not be empty" });
      return;
    }

    const rewritten = rewriteContent(text, flags);

    res.json({ rewritten });
  } catch (err) {
    console.error("Personal rewrite error:", err);
    res.status(500).json({ error: "Rewrite failed" });
  }
});

router.get("/personal/alerts", refreshPlanFromDB, requirePro(), async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 50));

    const alerts = await db
      .select()
      .from(personalAlertsTable)
      .where(eq(personalAlertsTable.userId, req.user.id))
      .orderBy(desc(personalAlertsTable.createdAt))
      .limit(limit);

    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(personalAlertsTable)
      .where(
        and(
          eq(personalAlertsTable.userId, req.user.id),
          eq(personalAlertsTable.isRead, false)
        )
      );

    res.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        alertType: a.alertType,
        message: a.message,
        severity: a.severity,
        relatedScanId: a.relatedScanId,
        isRead: a.isRead,
        createdAt: a.createdAt,
      })),
      unreadCount: unreadCount?.count ?? 0,
    });
  } catch (err) {
    console.error("Personal alerts error:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.post("/personal/alerts/:id/read", refreshPlanFromDB, requirePro(), async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const alertId = parseInt(req.params.id);
    if (isNaN(alertId)) {
      res.status(400).json({ error: "Invalid alert ID" });
      return;
    }

    const [alert] = await db
      .select()
      .from(personalAlertsTable)
      .where(
        and(
          eq(personalAlertsTable.id, alertId),
          eq(personalAlertsTable.userId, req.user.id)
        )
      );

    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    await db
      .update(personalAlertsTable)
      .set({ isRead: true })
      .where(eq(personalAlertsTable.id, alertId));

    res.json({ success: true });
  } catch (err) {
    console.error("Personal alert mark-read error:", err);
    res.status(500).json({ error: "Failed to mark alert as read" });
  }
});

router.post("/personal/alerts/read-all", refreshPlanFromDB, requirePro(), async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    await db
      .update(personalAlertsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(personalAlertsTable.userId, req.user.id),
          eq(personalAlertsTable.isRead, false)
        )
      );

    res.json({ success: true });
  } catch (err) {
    console.error("Personal alerts mark-all-read error:", err);
    res.status(500).json({ error: "Failed to mark alerts as read" });
  }
});

router.get("/personal/trends", refreshPlanFromDB, requirePro(), async (req, res) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const now = Date.now();
    const past30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const past60Days = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const dailyTrend = await db
      .select({
        date: sql<string>`to_char(${personalScansTable.createdAt}, 'YYYY-MM-DD')`,
        avgScore: sql<number>`round(avg(${personalScansTable.riskScore}))::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(personalScansTable)
      .where(
        and(
          eq(personalScansTable.userId, req.user.id),
          gte(personalScansTable.createdAt, past30Days)
        )
      )
      .groupBy(sql`to_char(${personalScansTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${personalScansTable.createdAt}, 'YYYY-MM-DD')`);

    const categoryTrend = await db
      .select({
        flags: personalScansTable.flags,
        createdAt: personalScansTable.createdAt,
      })
      .from(personalScansTable)
      .where(
        and(
          eq(personalScansTable.userId, req.user.id),
          gte(personalScansTable.createdAt, past30Days)
        )
      )
      .orderBy(desc(personalScansTable.createdAt))
      .limit(100);

    const categoryBreakdown: Record<string, number> = {
      toxicity: 0,
      hate_speech: 0,
      pii: 0,
      bias: 0,
    };

    const categoryByDay: Record<string, Record<string, number>> = {};

    for (const scan of categoryTrend) {
      try {
        const flags = JSON.parse(scan.flags);
        const day = new Date(scan.createdAt).toISOString().slice(0, 10);
        const seen = new Set<string>();
        for (const f of flags) {
          if (f.type && !seen.has(f.type)) {
            seen.add(f.type);
            categoryBreakdown[f.type] = (categoryBreakdown[f.type] || 0) + 1;
            if (!categoryByDay[day]) categoryByDay[day] = {};
            categoryByDay[day][f.type] = (categoryByDay[day][f.type] || 0) + 1;
          }
        }
      } catch {}
    }

    const categoryTimeSeries = Object.entries(categoryByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cats]) => ({
        date,
        toxicity: cats.toxicity || 0,
        hate_speech: cats.hate_speech || 0,
        pii: cats.pii || 0,
        bias: cats.bias || 0,
      }));

    const [current30] = await db
      .select({
        avg: sql<number>`round(avg(${personalScansTable.riskScore}))::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(personalScansTable)
      .where(
        and(
          eq(personalScansTable.userId, req.user.id),
          gte(personalScansTable.createdAt, past30Days)
        )
      );

    const [previous30] = await db
      .select({
        avg: sql<number>`round(avg(${personalScansTable.riskScore}))::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(personalScansTable)
      .where(
        and(
          eq(personalScansTable.userId, req.user.id),
          gte(personalScansTable.createdAt, past60Days),
          lt(personalScansTable.createdAt, past30Days)
        )
      );

    res.json({
      dailyTrend,
      categoryBreakdown,
      categoryTimeSeries,
      comparison: {
        current: {
          avgScore: current30?.avg ?? null,
          scanCount: current30?.count ?? 0,
        },
        previous: {
          avgScore: previous30?.avg ?? null,
          scanCount: previous30?.count ?? 0,
        },
      },
    });
  } catch (err) {
    console.error("Personal trends error:", err);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

export default router;
