import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, feedbackTable, pageVisitsTable, apiUsageTable, apiKeysTable } from "@workspace/db";
import { eq, desc, count, sql, gte, and } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  const userRole = (req.user as { role?: string })?.role;
  if (userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.post("/track-visit", async (req: Request, res: Response) => {
  try {
    const { path } = req.body as { path?: string };
    const visitPath = path || "/";

    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const userAgent = req.headers["user-agent"]?.slice(0, 1000) || null;
    const userId = req.user?.id || null;

    await db.insert(pageVisitsTable).values({
      path: visitPath.slice(0, 500),
      userId,
      userAgent,
      ipHash,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Track visit error:", err);
    res.status(500).json({ error: "Failed to track visit" });
  }
});

router.get("/public/stats", async (_req: Request, res: Response) => {
  try {
    const [scannedResult, threatsResult] = await Promise.all([
      db.execute(sql`SELECT (SELECT count(*) FROM dataset_rows) + (SELECT count(*) FROM personal_scans) + (SELECT count(*) FROM dev_scans) AS total`),
      db.execute(sql`SELECT count(*) AS total FROM analysis_results`),
    ]);
    const scannedRows = scannedResult.rows ?? scannedResult;
    const threatsRows = threatsResult.rows ?? threatsResult;
    const dataPointsScanned = Number(Array.isArray(scannedRows) && scannedRows[0] ? scannedRows[0].total : 0) || 0;
    const threatsDetected = Number(Array.isArray(threatsRows) && threatsRows[0] ? threatsRows[0].total : 0) || 0;
    res.json({ dataPointsScanned, threatsDetected });
  } catch (err) {
    console.error("Public stats error:", err);
    res.json({ dataPointsScanned: 0, threatsDetected: 0 });
  }
});

router.get("/admin/stats", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [[totalVisits], [todayVisits], [weekVisits], [totalUsers], [proSubs], [totalFeedback], [avgRating]] = await Promise.all([
      db.select({ total: count() }).from(pageVisitsTable),
      db.select({ total: count() }).from(pageVisitsTable).where(gte(pageVisitsTable.createdAt, todayStart)),
      db.select({ total: count() }).from(pageVisitsTable).where(gte(pageVisitsTable.createdAt, weekStart)),
      db.select({ total: count() }).from(usersTable),
      db.select({ total: count() }).from(usersTable).where(sql`${usersTable.planType} IN ('personal', 'pro', 'business', 'enterprise') AND ${usersTable.subscriptionStatus} = 'active'`),
      db.select({ total: count() }).from(feedbackTable),
      db.select({ avg: sql<string>`ROUND(AVG(${feedbackTable.rating}), 1)` }).from(feedbackTable),
    ]);

    res.json({
      visits: {
        today: todayVisits.total,
        week: weekVisits.total,
        allTime: totalVisits.total,
      },
      totalUsers: totalUsers.total,
      proSubscriptions: proSubs.total,
      feedback: {
        total: totalFeedback.total,
        averageRating: avgRating.avg ? parseFloat(avgRating.avg) : null,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/users", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ total: count() }).from(usersTable);

    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        authProvider: usersTable.authProvider,
        role: usersTable.role,
        planType: usersTable.planType,
        subscriptionStatus: usersTable.subscriptionStatus,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      users,
      total: totalResult.total,
      page,
      limit,
      totalPages: Math.ceil(totalResult.total / limit),
    });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/admin/users", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { email, password, firstName, lastName, planType } = req.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      planType?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const validPlans = ["free", "personal", "pro", "business", "enterprise"];
    if (planType && !validPlans.includes(planType)) {
      res.status(400).json({ error: `Invalid planType. Must be one of: ${validPlans.join(", ")}` });
      return;
    }
    const plan = planType || "free";
    const subStatus = plan === "free" ? null : "active";

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const [created] = await db
        .insert(usersTable)
        .values({
          email: emailLower,
          firstName: firstName?.trim() || null,
          lastName: lastName?.trim() || null,
          passwordHash,
          authProvider: "email",
          role: "user",
          planType: plan,
          subscriptionStatus: subStatus,
        })
        .returning({
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          authProvider: usersTable.authProvider,
          role: usersTable.role,
          planType: usersTable.planType,
          subscriptionStatus: usersTable.subscriptionStatus,
          createdAt: usersTable.createdAt,
        });

      res.status(201).json({ user: created });
    } catch (insertErr: unknown) {
      const pgCode =
        (insertErr as { code?: string })?.code ||
        (insertErr as { cause?: { code?: string } })?.cause?.code;
      if (pgCode === "23505") {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      throw insertErr;
    }
  } catch (err) {
    console.error("Admin create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/admin/users/:id", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { planType, subscriptionStatus } = req.body as {
      planType?: string;
      subscriptionStatus?: string;
    };

    const validPlans = ["free", "personal", "pro", "business", "enterprise"];
    const validStatuses = ["active", "canceled", "past_due", null];

    const updates: Record<string, unknown> = {};

    if (planType !== undefined) {
      if (!validPlans.includes(planType)) {
        res.status(400).json({ error: `Invalid planType. Must be one of: ${validPlans.join(", ")}` });
        return;
      }
      updates.planType = planType;
    }

    if (subscriptionStatus !== undefined) {
      if (subscriptionStatus !== null && !validStatuses.includes(subscriptionStatus)) {
        res.status(400).json({ error: `Invalid subscriptionStatus. Must be one of: ${validStatuses.filter(Boolean).join(", ")}` });
        return;
      }
      updates.subscriptionStatus = subscriptionStatus;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    if (updates.planType === "free") {
      updates.subscriptionStatus = null;
    } else if ((updates.planType === "personal" || updates.planType === "pro" || updates.planType === "business" || updates.planType === "enterprise") && !updates.subscriptionStatus) {
      updates.subscriptionStatus = "active";
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
        planType: usersTable.planType,
        subscriptionStatus: usersTable.subscriptionStatus,
      });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user: updated });
  } catch (err) {
    console.error("Admin update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/admin/feedback", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [totalResult] = await db.select({ total: count() }).from(feedbackTable);

    const rows = await db
      .select({
        id: feedbackTable.id,
        rating: feedbackTable.rating,
        message: feedbackTable.message,
        createdAt: feedbackTable.createdAt,
        userEmail: usersTable.email,
        userFirstName: usersTable.firstName,
        userLastName: usersTable.lastName,
      })
      .from(feedbackTable)
      .leftJoin(usersTable, eq(feedbackTable.userId, usersTable.id))
      .orderBy(desc(feedbackTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      feedback: rows,
      total: totalResult.total,
      page,
      limit,
      totalPages: Math.ceil(totalResult.total / limit),
    });
  } catch (err) {
    console.error("Admin feedback error:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.get("/admin/visits", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 7));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await db
      .select({
        date: sql<string>`DATE(${pageVisitsTable.createdAt})`.as("date"),
        visits: count(),
      })
      .from(pageVisitsTable)
      .where(gte(pageVisitsTable.createdAt, startDate))
      .groupBy(sql`DATE(${pageVisitsTable.createdAt})`)
      .orderBy(sql`DATE(${pageVisitsTable.createdAt})`);

    res.json({ trends, days });
  } catch (err) {
    console.error("Admin visits error:", err);
    res.status(500).json({ error: "Failed to fetch visit trends" });
  }
});

router.get("/admin/api-usage", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [[totalThisMonth], [totalThisWeek], [totalAllTime]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(apiUsageTable).where(gte(apiUsageTable.createdAt, monthStart)),
      db.select({ count: sql<number>`count(*)::int` }).from(apiUsageTable).where(gte(apiUsageTable.createdAt, weekStart)),
      db.select({ count: sql<number>`count(*)::int` }).from(apiUsageTable),
    ]);

    const topUsers = await db
      .select({
        userId: apiKeysTable.userId,
        email: usersTable.email,
        planType: usersTable.planType,
        requestCount: sql<number>`count(*)::int`,
      })
      .from(apiUsageTable)
      .innerJoin(apiKeysTable, eq(apiUsageTable.apiKeyId, apiKeysTable.id))
      .innerJoin(usersTable, eq(apiKeysTable.userId, usersTable.id))
      .where(gte(apiUsageTable.createdAt, monthStart))
      .groupBy(apiKeysTable.userId, usersTable.email, usersTable.planType)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    const dailyTrend = await db
      .select({
        date: sql<string>`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(apiUsageTable)
      .where(gte(apiUsageTable.createdAt, monthStart))
      .groupBy(sql`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${apiUsageTable.createdAt}, 'YYYY-MM-DD')`);

    res.json({
      thisMonth: totalThisMonth.count,
      thisWeek: totalThisWeek.count,
      allTime: totalAllTime.count,
      topUsers: topUsers.map((u) => ({
        userId: u.userId,
        email: u.email,
        planType: u.planType,
        requests: u.requestCount,
      })),
      dailyTrend: dailyTrend.map((d) => ({
        date: d.date,
        requests: d.count,
      })),
    });
  } catch (err) {
    console.error("Admin API usage error:", err);
    res.status(500).json({ error: "Failed to fetch API usage stats" });
  }
});

export default router;
