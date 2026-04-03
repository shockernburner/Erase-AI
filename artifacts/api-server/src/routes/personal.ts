import { Router } from "express";
import { db, personalScansTable } from "@workspace/db";
import { eq, desc, sql, and, gte, inArray } from "drizzle-orm";
import { analyzeText } from "../lib/personalAnalyzer";
import { calculateRiskScore } from "../lib/riskScorer";
import { rewriteContent } from "../lib/contentRewriter";
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

export default router;
