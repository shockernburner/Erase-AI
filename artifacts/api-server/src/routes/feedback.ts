import { Router, type IRouter, type Request, type Response } from "express";
import { db, feedbackTable, usersTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";

const router: IRouter = Router();

router.post("/feedback", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { rating, message } = req.body as {
      rating?: number;
      message?: string;
    };

    if (!rating || !message) {
      res.status(400).json({ error: "Rating and message are required" });
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
      return;
    }

    if (message.trim().length === 0) {
      res.status(400).json({ error: "Message cannot be empty" });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: "Message must be 2000 characters or less" });
      return;
    }

    const [feedback] = await db
      .insert(feedbackTable)
      .values({
        userId: req.user!.id,
        rating,
        message: message.trim(),
      })
      .returning();

    res.json({ feedback });
  } catch (err) {
    console.error("Submit feedback error:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/feedback/mine", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const rows = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.userId, req.user!.id))
      .orderBy(desc(feedbackTable.createdAt))
      .limit(50);

    res.json({ feedback: rows });
  } catch (err) {
    console.error("Get my feedback error:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.get("/feedback", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userRole = (req.user as { role?: string })?.role;
    if (userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ total: count() })
      .from(feedbackTable);

    const rows = await db
      .select({
        id: feedbackTable.id,
        userId: feedbackTable.userId,
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

    const [avgResult] = await db
      .select({ avg: sql<string>`ROUND(AVG(${feedbackTable.rating}), 1)` })
      .from(feedbackTable);

    res.json({
      feedback: rows,
      total: totalResult.total,
      page,
      limit,
      totalPages: Math.ceil(totalResult.total / limit),
      averageRating: avgResult.avg ? parseFloat(avgResult.avg) : null,
    });
  } catch (err) {
    console.error("List feedback error:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

export default router;
