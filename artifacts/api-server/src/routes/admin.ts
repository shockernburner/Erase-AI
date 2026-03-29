import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, feedbackTable, pageVisitsTable } from "@workspace/db";
import { eq, desc, count, sql, gte } from "drizzle-orm";
import crypto from "crypto";

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
      db.select({ total: count() }).from(usersTable).where(eq(usersTable.planType, "pro")),
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

export default router;
