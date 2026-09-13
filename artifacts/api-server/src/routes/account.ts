import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  clearSession,
  getSessionId,
} from "../lib/auth";
import {
  deleteAuthenticatedUser,
  isProtectedAccount,
  processPublicDeletionRequest,
} from "../lib/deleteAccount";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Public account-deletion request (Play Store / GDPR web resource).
 * POST /api/account/deletion-request
 * Body: { email, password?, reason?, confirm: true }
 */
router.post("/account/deletion-request", async (req: Request, res: Response) => {
  try {
    const { email, password, reason, confirm } = req.body as {
      email?: string;
      password?: string;
      reason?: string;
      confirm?: boolean;
    };

    if (!confirm) {
      res.status(400).json({ error: "You must confirm that you want to delete your account and associated data." });
      return;
    }

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const emailLower = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    if (reason && reason.length > 2000) {
      res.status(400).json({ error: "Reason must be under 2000 characters" });
      return;
    }

    const result = await processPublicDeletionRequest({
      email: emailLower,
      password: typeof password === "string" ? password : undefined,
      reason: typeof reason === "string" ? reason : undefined,
    });

    if (result.message.includes("Password is required") || result.message.includes("Incorrect password")) {
      res.status(400).json({ error: result.message, status: result.status });
      return;
    }

    res.json({
      success: true,
      status: result.status,
      deleted: result.deleted,
      message: result.message,
      playSubscriptionReminder: result.playSubscriptionReminder === true,
    });
  } catch (err) {
    logger.error({ err }, "Account deletion request failed");
    res.status(500).json({ error: "Failed to process deletion request. Please try again or email director@vantward.com." });
  }
});

/**
 * Authenticated immediate delete.
 * DELETE /api/account
 */
router.delete("/account", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }

    const userId = (req.user as { id: string }).id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (user && isProtectedAccount(user)) {
      res.status(403).json({ error: "This account cannot be deleted through self-serve. Contact director@vantward.com." });
      return;
    }

    const result = await deleteAuthenticatedUser(userId);
    if (result.status === "not_found") {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const sid = getSessionId(req);
    await clearSession(res, sid);

    res.json({
      success: true,
      status: result.status,
      deleted: true,
      message: result.playSubscriptionReminder
        ? "Account deleted. Cancel any Google Play subscription in Play Store payments settings."
        : "Account deleted.",
      playSubscriptionReminder: result.playSubscriptionReminder === true,
    });
  } catch (err) {
    logger.error({ err }, "Authenticated account deletion failed");
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
