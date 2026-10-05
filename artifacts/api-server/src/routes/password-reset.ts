import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db, passwordResetTokensTable, sessionsTable, usersTable } from "@workspace/db";
import { ipBurstLimit } from "../middlewares/burstLimitMiddleware";
import { sendEmail } from "../lib/email";
import { logger } from "../lib/logger";
import {
  buildResetEmail,
  buildResetUrl,
  canIssueReset,
  checkResetToken,
  generateResetToken,
  hashResetToken,
  validateNewPassword,
} from "../lib/password-reset-source.mjs";

// Forgot password: emails a one-time link (30 minutes) to /reset-password.
// Platform admins can also make a link for a user who can't get the email.

const BCRYPT_ROUNDS = 12;
const router: IRouter = Router();

function webBaseUrl(): string | undefined {
  return process.env.WEB_BASE_URL || process.env.PUBLIC_WEB_BASE_URL || undefined;
}

async function issueResetToken(userId: string): Promise<string> {
  const { token, hash, expiresAt } = generateResetToken();
  await db.insert(passwordResetTokensTable).values({ userId, tokenHash: hash, expiresAt });
  return token;
}

async function issueAndEmail(email: string): Promise<void> {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, authProvider: usersTable.authProvider })
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (!user || !user.email || user.authProvider === "system") return;
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(passwordResetTokensTable)
    .where(and(eq(passwordResetTokensTable.userId, user.id), gte(passwordResetTokensTable.createdAt, new Date(Date.now() - 60 * 60 * 1000))));
  if (!canIssueReset(recent?.n ?? 0)) {
    logger.info({ userId: user.id }, "Password reset skipped: hourly limit reached");
    return;
  }
  const token = await issueResetToken(user.id);
  const message = buildResetEmail({ url: buildResetUrl(token, webBaseUrl()), firstName: user.firstName });
  await sendEmail({ to: user.email, ...message });
}

router.post("/auth/forgot-password", ipBurstLimit(), async (req: Request, res: Response) => {
  const raw = (req.body ?? {}).email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  // Same answer, sent before any lookup, whether or not the account exists,
  // so the form can't be used to discover who has an account.
  res.json({ ok: true });
  issueAndEmail(email).catch((err) => logger.error({ err }, "Forgot password failed"));
});

router.post("/auth/reset-password", ipBurstLimit(), async (req: Request, res: Response) => {
  try {
    const { token, password } = (req.body ?? {}) as { token?: unknown; password?: unknown };
    const pw = validateNewPassword(password);
    if (!pw.ok) {
      res.status(400).json({ error: pw.error });
      return;
    }
    if (typeof token !== "string" || token.length < 16 || token.length > 200) {
      res.status(400).json({ error: "This reset link is not valid or has expired. Ask for a new one." });
      return;
    }
    const tokenHash = hashResetToken(token);
    const [row] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.tokenHash, tokenHash));
    const check = checkResetToken(row);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }
    const passwordHash = await bcrypt.hash(password as string, BCRYPT_ROUNDS);
    const done = await db.transaction(async (tx) => {
      // Claim the token first so two submissions can't both use it.
      const [claimed] = await tx
        .update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokensTable.id, row!.id), isNull(passwordResetTokensTable.usedAt)))
        .returning({ id: passwordResetTokensTable.id });
      if (!claimed) return false;
      await tx.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, row!.userId));
      // Any other outstanding links stop working, and every device signs in again.
      await tx
        .update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokensTable.userId, row!.userId), isNull(passwordResetTokensTable.usedAt)));
      await tx.delete(sessionsTable).where(sql`${sessionsTable.sess}->'user'->>'id' = ${row!.userId}`);
      return true;
    });
    if (!done) {
      res.status(400).json({ error: "This reset link is not valid or has expired. Ask for a new one." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// For support: a platform admin makes a reset link to send by hand.
router.post("/admin/users/:id/reset-link", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, String(req.params.id)));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const token = await issueResetToken(user.id);
    res.json({ email: user.email, url: buildResetUrl(token, webBaseUrl()), expiresInMinutes: 30 });
  } catch (err) {
    console.error("Admin reset link error:", err);
    res.status(500).json({ error: "Failed to create reset link" });
  }
});

export default router;
